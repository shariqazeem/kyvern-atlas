/**
 * Treasury — the platform-side vault that holds escrowed bounties
 * between post_task and complete_task.
 *
 * Phase 1 routes all escrow through Atlas's vault (vlt_QcCPbp3XTzHtF5).
 * Atlas is already the canonical platform anchor — it has agent keys,
 * a real Squads address, and has been settling on-chain since 2026-04-20.
 * Routing escrow through it keeps the demo loop entirely on-chain
 * without standing up a separate program-derived escrow PDA.
 *
 * The trade-off: Atlas's daily limit constrains escrow throughput.
 * Bumping it before deploy is part of the verification checklist —
 * see CLAUDE.md notes on ATLAS_VAULT_ID.
 *
 * Override via the ATLAS_VAULT_ID environment variable for tests / local
 * development against a different vault.
 */

import { getVault } from "@/lib/vault-store";
import type { VaultRecord } from "@/lib/vault-store";

export const TREASURY_VAULT_ID =
  process.env.ATLAS_VAULT_ID ?? "vlt_QcCPbp3XTzHtF5";

/** Returns the treasury vault record, or throws if it can't be loaded.
 *  The throw is intentional — the economy engine is non-functional
 *  without a treasury, so a tool that calls this should fail loudly
 *  rather than silently fall back to a stub. */
export function getTreasuryVault(): VaultRecord {
  const v = getVault(TREASURY_VAULT_ID);
  if (!v) {
    throw new Error(`treasury vault ${TREASURY_VAULT_ID} not found`);
  }
  return v;
}

/** Returns the treasury's owner wallet — the recipient pubkey for
 *  poster→treasury escrow transfers and the source vault for
 *  treasury→claimer payouts. */
export function treasuryRecipientPubkey(): string {
  return getTreasuryVault().ownerWallet;
}
