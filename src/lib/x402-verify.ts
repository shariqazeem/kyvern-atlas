/**
 * x402 payment verification — for the Revenue Terminal.
 *
 * The /api/atlas/feed endpoint is x402-shaped: an external buyer
 * settles a USDC payment to Atlas's USDC ATA on Solana devnet, then
 * presents the signature in the `X-PAYMENT-SIG` header to claim a
 * signal. This module verifies that the signature actually transferred
 * the right amount of USDC to the right account.
 *
 * No payment, no signal. Each signature is consumable exactly once
 * (the caller is expected to enforce idempotency in the DB).
 */

import { Connection, PublicKey } from "@solana/web3.js";

// USDC mint addresses (mirrors squads-v4.ts — duplicated here so this
// helper has zero coupling to the wider Solana SDK loader).
const USDC_MINT = {
  devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
} as const;

interface VerifyInput {
  signature: string;
  expectedRecipientAta: string; // Atlas's USDC ATA on devnet
  expectedAmountUsdMin: number; // floor — pays at least this
  network: "devnet" | "mainnet";
}

export interface VerifyResult {
  ok: boolean;
  /** Buyer's owner pubkey (the wallet that authorised the payment). */
  buyerPubkey: string | null;
  /** USD amount actually transferred (UI amount, not lamports). */
  amountUsd: number;
  /** Slot when the tx confirmed. */
  slot: number | null;
  /** Block time when the tx confirmed (unix seconds). */
  blockTime: number | null;
  /** Reason the verification failed (or 'ok' on success). */
  reason: string;
}

// Tier-0 URL kept for legacy callers; verifyX402Payment uses the
// tiered Connection below for actual fetches.
import { tieredConnection } from "./solana-rpc";

/**
 * Look up a settled Solana signature and confirm it's a valid USDC
 * payment to `expectedRecipientAta` of at least `expectedAmountUsdMin`.
 *
 * Method: pull the parsed transaction via RPC, find the recipient ATA
 * in postTokenBalances, compare uiAmount to preTokenBalances on the same
 * accountIndex. Delta on that ATA = amount received.
 */
export async function verifyX402Payment(
  input: VerifyInput,
): Promise<VerifyResult> {
  const empty: Omit<VerifyResult, "ok" | "reason"> = {
    buyerPubkey: null,
    amountUsd: 0,
    slot: null,
    blockTime: null,
  };

  const sig = input.signature.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{60,90}$/.test(sig)) {
    return { ...empty, ok: false, reason: "signature_invalid_shape" };
  }

  let conn: Connection;
  try {
    conn = tieredConnection(input.network, "confirmed");
  } catch {
    return { ...empty, ok: false, reason: "rpc_init_failed" };
  }

  let tx;
  try {
    tx = await conn.getParsedTransaction(sig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  } catch {
    return { ...empty, ok: false, reason: "rpc_fetch_failed" };
  }
  if (!tx) {
    return { ...empty, ok: false, reason: "signature_not_found" };
  }
  if (tx.meta?.err) {
    return { ...empty, ok: false, reason: "tx_failed_on_chain" };
  }

  // Find the recipient ATA's pre/post token balances. Parsed txs on
  // confirmed commitment include token balances when SPL Token program
  // was invoked.
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  const wantedAta = input.expectedRecipientAta;
  const wantedMint = USDC_MINT[input.network];

  // Locate the recipient ATA among the account keys to map the
  // pre/post balance entry by accountIndex.
  const accountKeys = (tx.transaction.message.accountKeys ?? []).map((k) => {
    if (typeof k === "string") return k;
    return (k as { pubkey: PublicKey | string }).pubkey?.toString?.() ?? "";
  });
  const recipientAccountIndex = accountKeys.findIndex((k) => k === wantedAta);
  if (recipientAccountIndex < 0) {
    return {
      ...empty,
      ok: false,
      reason: "recipient_ata_not_in_tx",
    };
  }

  const postEntry = post.find(
    (b) => b.accountIndex === recipientAccountIndex && b.mint === wantedMint,
  );
  if (!postEntry) {
    return { ...empty, ok: false, reason: "recipient_ata_not_in_post_balances" };
  }
  const preEntry = pre.find(
    (b) => b.accountIndex === recipientAccountIndex && b.mint === wantedMint,
  );

  const postUi = Number(postEntry.uiTokenAmount?.uiAmount ?? 0);
  const preUi = Number(preEntry?.uiTokenAmount?.uiAmount ?? 0);
  const delta = postUi - preUi;

  if (!isFinite(delta) || delta <= 0) {
    return { ...empty, ok: false, reason: "no_positive_delta" };
  }
  if (delta + 1e-9 < input.expectedAmountUsdMin) {
    return {
      ...empty,
      ok: false,
      reason: `amount_below_floor (paid $${delta.toFixed(4)}, need $${input.expectedAmountUsdMin})`,
    };
  }

  // Buyer pubkey: signer[0] of the tx is the typical pay-from owner.
  // Falls back to accountKeys[0].
  let buyerPubkey: string | null = null;
  try {
    const sigInfo = tx.transaction.signatures?.[0];
    void sigInfo; // unused — we rely on accountKeys[0] which is the fee-payer
    buyerPubkey = accountKeys[0] ?? null;
  } catch {
    /* leave null */
  }

  return {
    ok: true,
    buyerPubkey,
    amountUsd: delta,
    slot: tx.slot ?? null,
    blockTime: tx.blockTime ?? null,
    reason: "ok",
  };
}

/** Helper to fetch Atlas's canonical USDC ATA on devnet — used by the
 *  /api/atlas/feed endpoint to render the 402 payment-required body
 *  without hardcoding the address inline. */
export const ATLAS_USDC_ATA_DEVNET =
  "9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW";
