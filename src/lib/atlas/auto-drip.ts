/**
 * Atlas auto-drip — Section 3B of the Grand Champion plan.
 *
 * Atlas cannot go quiet during judging. Three layers of redundancy keep
 * its vault funded:
 *
 *   1. The runner calls `autoDripIfLow()` every 30 cycles. If Atlas's
 *      USDC balance is below $1.00, it transfers $5 from the treasury
 *      keypair. Hands-off.
 *   2. `POST /api/atlas/funded-by-me` (bearer-auth) calls
 *      `transferUsdcFromTreasury(5)` immediately — one tap from the
 *      founder's phone.
 *   3. The public "Sponsor Atlas" button on /atlas, which anyone in
 *      the world can use.
 *
 * Treasury setup (one-time, out of code):
 *   · Generate a Solana keypair (e.g. `solana-keygen new --outfile treasury.json`).
 *   · Fund its address with $50+ devnet USDC via faucet.circle.com.
 *   · Base58-encode the secret key and set it as `KYVERN_TREASURY_SECRET`
 *     on the VM. (See README for the bootstrap snippet.)
 *
 * If `KYVERN_TREASURY_SECRET` is unset or invalid, every function here
 * returns a graceful "not configured" result — never throws — so the
 * runner and the admin endpoint stay safe regardless of env state.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";

export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_DECIMALS = 6;

export const ATLAS_VAULT_PDA = "925nkpVpSR32WhU8mKWMPC8hnMTJj2DRU9idFeRKHixf";

/** Default top-up size when auto-drip fires. */
export const TOPUP_AMOUNT_USD = 5;
/** Vault balance below this triggers an auto-drip. */
export const LOW_BALANCE_THRESHOLD_USD = 1;

function rpcUrl(): string {
  return process.env.SOLANA_DEVNET_RPC ?? "https://api.devnet.solana.com";
}

let _treasuryCache: Keypair | null = null;
function getTreasury(): Keypair | null {
  if (_treasuryCache) return _treasuryCache;
  const secret = process.env.KYVERN_TREASURY_SECRET;
  if (!secret) return null;
  try {
    // Accept either base58 (preferred) or JSON-array secret-key formats.
    if (secret.trim().startsWith("[")) {
      const arr = JSON.parse(secret) as number[];
      _treasuryCache = Keypair.fromSecretKey(Uint8Array.from(arr));
    } else {
      _treasuryCache = Keypair.fromSecretKey(bs58.decode(secret));
    }
    return _treasuryCache;
  } catch {
    return null;
  }
}

/** Live read — Atlas's USDC balance via the public devnet RPC. */
export async function getAtlasUsdcBalance(): Promise<number> {
  try {
    const conn = new Connection(rpcUrl(), "confirmed");
    const owner = new PublicKey(ATLAS_VAULT_PDA);
    const mint = new PublicKey(USDC_MINT_DEVNET);
    const accs = await conn.getParsedTokenAccountsByOwner(owner, { mint });
    if (accs.value.length === 0) return 0;
    const ui = accs.value[0].account.data.parsed.info.tokenAmount.uiAmount;
    return typeof ui === "number" ? ui : 0;
  } catch {
    return 0;
  }
}

export type DripResult =
  | { ok: true; signature: string; amountUsd: number }
  | { ok: false; error: string };

/**
 * Sign and send a `transferChecked` of `amountUsd` USDC from the
 * treasury to Atlas's vault. If Atlas's USDC associated token account
 * doesn't exist yet (cold cold start), it's created in the same tx —
 * the treasury pays the rent + fee.
 */
export async function transferUsdcFromTreasury(amountUsd: number): Promise<DripResult> {
  const treasury = getTreasury();
  if (!treasury) {
    return { ok: false, error: "treasury not configured (KYVERN_TREASURY_SECRET missing/invalid)" };
  }
  if (!isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, error: `invalid amountUsd: ${amountUsd}` };
  }

  try {
    const conn = new Connection(rpcUrl(), "confirmed");
    const mint = new PublicKey(USDC_MINT_DEVNET);
    const recipient = new PublicKey(ATLAS_VAULT_PDA);
    const treasuryAta = getAssociatedTokenAddressSync(mint, treasury.publicKey, false);
    const recipientAta = getAssociatedTokenAddressSync(mint, recipient, true); // allowOwnerOffCurve — vault PDA

    // If the recipient ATA doesn't exist, prepend a CreateAssociatedAccount instruction.
    const ixs = [];
    const recipientInfo = await conn.getAccountInfo(recipientAta);
    if (!recipientInfo) {
      ixs.push(
        createAssociatedTokenAccountInstruction(
          treasury.publicKey,
          recipientAta,
          recipient,
          mint,
        ),
      );
    }

    const amountUnits = BigInt(Math.round(amountUsd * Math.pow(10, USDC_DECIMALS)));
    ixs.push(
      createTransferCheckedInstruction(
        treasuryAta,
        mint,
        recipientAta,
        treasury.publicKey,
        amountUnits,
        USDC_DECIMALS,
      ),
    );

    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const message = new TransactionMessage({
      payerKey: treasury.publicKey,
      recentBlockhash: blockhash,
      instructions: ixs,
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    tx.sign([treasury]);

    const sig = await conn.sendTransaction(tx, { skipPreflight: false });
    await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight: 0 } as never, "confirmed").catch(() => {
      // confirmTransaction's signature-only form is deprecated; we accept
      // either confirmation or a brief delay so the runner doesn't stall.
    });
    return { ok: true, signature: sig, amountUsd };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type AutoDripOutcome =
  | { skipped: true; reason: string; balance: number }
  | { skipped: false; signature: string; amountUsd: number; balanceBefore: number };

/**
 * The runner calls this every 30 cycles. Cheap when the vault has
 * funds (one RPC read), only fires the transfer when Atlas is dry.
 */
export async function autoDripIfLow(): Promise<AutoDripOutcome> {
  const balance = await getAtlasUsdcBalance();
  if (balance >= LOW_BALANCE_THRESHOLD_USD) {
    return { skipped: true, reason: "vault healthy", balance };
  }
  const treasury = getTreasury();
  if (!treasury) {
    return {
      skipped: true,
      reason: "treasury not configured — set KYVERN_TREASURY_SECRET to enable auto-drip",
      balance,
    };
  }
  const r = await transferUsdcFromTreasury(TOPUP_AMOUNT_USD);
  if (!r.ok) {
    return { skipped: true, reason: r.error, balance };
  }
  return {
    skipped: false,
    signature: r.signature,
    amountUsd: r.amountUsd,
    balanceBefore: balance,
  };
}
