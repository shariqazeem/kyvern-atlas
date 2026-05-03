#!/usr/bin/env -S npx tsx
/**
 * buyer-bot.ts — the demo "external customer" that pays Atlas's
 * x402 feed every N seconds.
 *
 * Closes the simulated-earnings narrative gap. Real Solana devnet
 * USDC transfers from this bot's wallet to Atlas's USDC ATA. Each
 * settled signature gets POSTed back to /api/atlas/feed with the
 * X-PAYMENT-SIG header to claim a signal. The /app Revenue Terminal
 * card sums these into a live revenue counter.
 *
 * Required env on the VM:
 *   BUYER_BOT_SECRET_B58   — base58-encoded 64-byte ed25519 secret key
 *                            (use scripts/buyer-bot-init.ts to gen)
 *   BUYER_BOT_INTERVAL_MS  — default 30000 (30s between purchases)
 *   BUYER_BOT_FEED_URL     — default http://127.0.0.1:3001/api/atlas/feed
 *   SOLANA_DEVNET_RPC      — default https://api.devnet.solana.com
 *
 * pm2 process: started after the buyer wallet's USDC ATA is funded.
 *   pm2 start 'npx tsx scripts/buyer-bot.ts' --name buyer-bot
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";

const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
const ATLAS_USDC_ATA = new PublicKey(
  "9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW",
);
const MEMO_PROGRAM = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

const PRICE_USD = 0.01;
const USDC_DECIMALS = 6;
const PRICE_LAMPORTS = Math.round(PRICE_USD * 10 ** USDC_DECIMALS);

const SECRET_B58 = process.env.BUYER_BOT_SECRET_B58;
const INTERVAL_MS = parseInt(process.env.BUYER_BOT_INTERVAL_MS ?? "30000", 10);
const FEED_URL =
  process.env.BUYER_BOT_FEED_URL ??
  "http://127.0.0.1:3001/api/atlas/feed";
const RPC_URL =
  process.env.SOLANA_DEVNET_RPC ?? "https://api.devnet.solana.com";

if (!SECRET_B58) {
  console.error(
    "[buyer-bot] BUYER_BOT_SECRET_B58 env not set — refusing to start.",
  );
  process.exit(1);
}

let buyer: Keypair;
try {
  buyer = Keypair.fromSecretKey(bs58.decode(SECRET_B58));
} catch (e) {
  console.error("[buyer-bot] failed to decode BUYER_BOT_SECRET_B58:", e);
  process.exit(1);
}

const buyerAta = getAssociatedTokenAddressSync(USDC_MINT_DEVNET, buyer.publicKey);
const conn = new Connection(RPC_URL, "confirmed");

console.log(
  `[buyer-bot] online · pubkey=${buyer.publicKey.toBase58()} · ata=${buyerAta.toBase58()} · interval=${INTERVAL_MS}ms · feed=${FEED_URL}`,
);

let cycle = 0;
let lastSig: string | null = null;
let lastError: string | null = null;

async function purchase(): Promise<void> {
  cycle++;
  const tag = `KVN feed buy #${cycle} ${Math.random().toString(36).slice(2, 8)}`;
  try {
    // Step 1 — sign + send the USDC transfer.
    const transferIx = createTransferCheckedInstruction(
      buyerAta,
      USDC_MINT_DEVNET,
      ATLAS_USDC_ATA,
      buyer.publicKey,
      BigInt(PRICE_LAMPORTS),
      USDC_DECIMALS,
    );
    const memoIx = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM,
      data: Buffer.from(tag, "utf8"),
    });

    const tx = new Transaction().add(transferIx, memoIx);
    tx.feePayer = buyer.publicKey;
    const latest = await conn.getLatestBlockhash("confirmed");
    tx.recentBlockhash = latest.blockhash;
    tx.sign(buyer);

    const sig = await conn.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await conn.confirmTransaction(
      {
        signature: sig,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed",
    );

    // Step 2 — claim the signal with the settled signature.
    let body: unknown = null;
    try {
      const res = await fetch(FEED_URL, {
        method: "GET",
        headers: { "X-PAYMENT-SIG": sig },
      });
      body = await res.json();
      if (!res.ok) {
        console.warn(
          `[buyer-bot] cycle ${cycle}: feed returned ${res.status} for sig ${sig.slice(0, 12)}…`,
        );
      }
    } catch (e) {
      console.warn(`[buyer-bot] cycle ${cycle}: feed call failed:`, e);
    }

    lastSig = sig;
    lastError = null;
    const subj =
      (body as { signal?: { subject?: string } } | null)?.signal?.subject ??
      "(no signal)";
    console.log(
      `[buyer-bot] cycle ${cycle} ✓ paid $${PRICE_USD.toFixed(3)} · sig=${sig.slice(0, 14)}… · received: ${String(subj).slice(0, 60)}`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastError = msg;
    console.warn(`[buyer-bot] cycle ${cycle} failed: ${msg.slice(0, 200)}`);
  }
}

async function checkBalance(): Promise<number> {
  try {
    const bal = await conn.getTokenAccountBalance(buyerAta);
    return Number(bal.value.uiAmount ?? 0);
  } catch {
    return 0;
  }
}

(async () => {
  // Sanity: confirm the buyer's USDC ATA has funds before looping.
  const bal = await checkBalance();
  console.log(`[buyer-bot] starting USDC balance: $${bal.toFixed(3)}`);
  if (bal < PRICE_USD) {
    console.error(
      `[buyer-bot] insufficient USDC — need ≥ $${PRICE_USD}, have $${bal.toFixed(3)}. Top up the buyer's ATA at https://faucet.circle.com (Solana Devnet · USDC) → ${buyerAta.toBase58()}`,
    );
    // Don't exit — keep the process online so pm2 doesn't restart-loop.
    // Re-check periodically and resume when funds appear.
  }

  // First purchase after a short stagger so the process isn't doing
  // RPC immediately on boot.
  setTimeout(() => void purchase(), 5_000);
  setInterval(() => {
    void (async () => {
      const b = await checkBalance();
      if (b >= PRICE_USD) await purchase();
      else
        console.log(
          `[buyer-bot] cycle ${cycle + 1} skipped — balance $${b.toFixed(3)} < $${PRICE_USD}`,
        );
    })();
  }, INTERVAL_MS);
})();

// Health log every 5 minutes
setInterval(() => {
  console.log(
    `[buyer-bot] health · cycles=${cycle} · last_sig=${lastSig?.slice(0, 14) ?? "none"} · last_error=${lastError ?? "none"}`,
  );
}, 5 * 60_000);
