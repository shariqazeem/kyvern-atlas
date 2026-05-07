/**
 * Atlas subscriber — Phase 5 (KYVERN_FRONTIER_GRAND_CHAMPION).
 *
 * The narrative gap Phase 5 closed: Atlas's `state.totalEarnedUsd` no
 * longer ticks from a synthetic `addEarning()` call after every publish.
 * It now ticks ONLY when an external wallet pays via /api/atlas/feed
 * x402 — verified on-chain in `feed_purchases`.
 *
 * For Atlas to *actually* earn during the demo window, something has to
 * keep paying. This script is that something — a long-running Node
 * process that mirrors the Cloudflare Worker scaffolded in
 * FRONTIER_PHASE_SCAFFOLDS.md but runs as a pm2 process on the VM
 * alongside `atlas`, `atlas-attacker`, etc. Same observable result —
 * real x402 payments at a regular cadence — without the Cloudflare
 * deploy dependency.
 *
 * Cycle (every ATLAS_SUBSCRIBER_INTERVAL_MS, default 60min):
 *   1. fetch GET /api/atlas/feed (no header)
 *      → 402 Payment Required with payment requirements body
 *   2. send 0.01 USDC from subscriber → Atlas USDC ATA on devnet
 *   3. await confirmation
 *   4. fetch GET /api/atlas/feed with X-PAYMENT-SIG: <sig>
 *      → 200 with the latest Atlas signal + a `feed_purchases` row
 *
 *   Every successful cycle = one real Solana devnet tx Atlas earned
 *   from. Visible in the /atlas economy section + the public
 *   leaderboard.
 *
 * Configuration (env):
 *   KYVERN_BASE_URL              base URL for /api/atlas/feed (default
 *                                 http://127.0.0.1:3001)
 *   ATLAS_SUBSCRIBER_KEYPAIR     absolute path to the subscriber key
 *                                 JSON (default secrets/atlas-subscriber-keypair.json)
 *   ATLAS_SUBSCRIBER_INTERVAL_MS millis between cycles (default 3_600_000 = 1h)
 *   SOLANA_RPC_DEVNET            RPC override (default https://api.devnet.solana.com)
 *
 * Pre-flight: subscriber wallet must be funded with ≥0.05 SOL (rent +
 * fees + recipient ATA creation buffer) AND ≥1 USDC to spend through
 * the demo window. Check + airdrop helpers run on first cycle and log
 * a friendly message if the balance is too low.
 *
 *   pubkey: solana-keygen pubkey secrets/atlas-subscriber-keypair.json
 *   USDC faucet: https://faucet.circle.com (devnet)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.KYVERN_BASE_URL ?? "http://127.0.0.1:3001";
const RPC_URL = process.env.SOLANA_RPC_DEVNET ?? "https://api.devnet.solana.com";
const KEYPAIR_PATH =
  process.env.ATLAS_SUBSCRIBER_KEYPAIR ??
  resolve(process.cwd(), "secrets/atlas-subscriber-keypair.json");
const INTERVAL_MS = Number(
  process.env.ATLAS_SUBSCRIBER_INTERVAL_MS ?? 60 * 60 * 1000,
);
const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
const ATLAS_USDC_ATA = new PublicKey(
  "9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW",
);

function log(msg: string, extra?: Record<string, unknown>) {
  const time = new Date().toISOString();
  if (extra) console.log(`[atlas-sub ${time}] ${msg}`, extra);
  else console.log(`[atlas-sub ${time}] ${msg}`);
}

function loadKeypair(): Keypair {
  const arr = JSON.parse(readFileSync(KEYPAIR_PATH, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

interface PaymentRequirements {
  payment: { amountUsd: number; recipientAta: string };
}

async function fetchPaymentRequirements(): Promise<PaymentRequirements | null> {
  const r = await fetch(`${BASE_URL}/api/atlas/feed`);
  if (r.status !== 402) {
    log(`unexpected status from feed (no header): ${r.status}`);
    return null;
  }
  return (await r.json()) as PaymentRequirements;
}

async function sendUsdcPayment(
  conn: Connection,
  payer: Keypair,
  amountUsd: number,
): Promise<string> {
  const fromAta = getAssociatedTokenAddressSync(
    USDC_MINT_DEVNET,
    payer.publicKey,
  );
  const baseUnits = Math.round(amountUsd * 1_000_000); // USDC has 6 decimals

  // Auto-create the source ATA if it doesn't exist yet (first run).
  const tx = new Transaction();
  const fromAccount = await conn.getAccountInfo(fromAta);
  if (!fromAccount) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        fromAta,
        payer.publicKey,
        USDC_MINT_DEVNET,
      ),
    );
  }

  tx.add(
    createTransferCheckedInstruction(
      fromAta,
      USDC_MINT_DEVNET,
      ATLAS_USDC_ATA,
      payer.publicKey,
      BigInt(baseUnits),
      6,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const sig = await sendAndConfirmTransaction(conn, tx, [payer], {
    commitment: "confirmed",
  });
  return sig;
}

async function claimSignal(sig: string): Promise<unknown | null> {
  const r = await fetch(`${BASE_URL}/api/atlas/feed`, {
    headers: { "X-PAYMENT-SIG": sig },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    log(`feed claim failed (${r.status}): ${body.slice(0, 200)}`);
    return null;
  }
  return await r.json();
}

async function runOnce(payer: Keypair, conn: Connection): Promise<void> {
  const reqs = await fetchPaymentRequirements();
  if (!reqs) return;
  const amount = reqs.payment.amountUsd;

  log(`paying $${amount.toFixed(3)} USDC → ${reqs.payment.recipientAta.slice(0, 6)}…`);

  let sig: string;
  try {
    sig = await sendUsdcPayment(conn, payer, amount);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`send failed: ${msg.slice(0, 200)}`);
    return;
  }

  log(`paid · sig=${sig.slice(0, 12)}… · claiming signal…`);
  const result = await claimSignal(sig);
  if (result) {
    const r = result as {
      signal?: { kind?: string; subject?: string };
      purchase?: { explorerUrl?: string };
    };
    log(
      `claimed · ${r.signal?.kind ?? "?"} · "${(r.signal?.subject ?? "").slice(0, 60)}"`,
      { explorerUrl: r.purchase?.explorerUrl },
    );
  }
}

async function preflight(payer: Keypair, conn: Connection): Promise<boolean> {
  const sol = await conn.getBalance(payer.publicKey, "confirmed");
  log(
    `subscriber pubkey: ${payer.publicKey.toBase58()} · SOL balance: ${(sol / 1e9).toFixed(4)}`,
  );
  if (sol < 0.005 * 1e9) {
    log(
      "WARN: SOL balance below 0.005 — fund subscriber or airdrop. Skipping cycle.",
    );
    return false;
  }
  const fromAta = getAssociatedTokenAddressSync(
    USDC_MINT_DEVNET,
    payer.publicKey,
  );
  const ata = await conn.getAccountInfo(fromAta);
  if (!ata) {
    log("USDC ATA not yet created (will be created on first payment).");
    return true;
  }
  const tokRes = await conn.getTokenAccountBalance(fromAta).catch(() => null);
  const usdc = tokRes?.value?.uiAmount ?? 0;
  log(`subscriber USDC: ${usdc.toFixed(3)}`);
  if (usdc < 0.011) {
    log(
      "WARN: USDC below 0.011 — top up at https://faucet.circle.com (devnet).",
    );
    return false;
  }
  return true;
}

async function main() {
  const payer = loadKeypair();
  const conn = new Connection(RPC_URL, "confirmed");

  log(
    `started · base=${BASE_URL} · interval=${(INTERVAL_MS / 60_000).toFixed(1)}m`,
  );

  // Cycle forever — pm2 supervises the process; an unhandled error
  // crashes us and pm2 restarts.
  while (true) {
    const ok = await preflight(payer, conn);
    if (ok) {
      try {
        await runOnce(payer, conn);
      } catch (e) {
        log(`cycle threw: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main().catch((e) => {
  console.error("[atlas-sub] fatal:", e);
  process.exit(1);
});
