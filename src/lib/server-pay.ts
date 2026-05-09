/**
 * Server-side vault payment — executes vault.pay() using internal credentials.
 *
 * Used by abilities that need to make payments on behalf of a user's device
 * without having the raw agent key. Reads the Solana keypair from the DB
 * and calls the same coSignPayment path that the HTTP endpoint uses.
 *
 * This produces REAL Solana devnet transactions with verifiable signatures.
 */

import {
  getVault,
  getSpendSnapshot,
  recordPayment,
  writeDeviceLog,
  type DeviceEventType,
} from "./vault-store";
import { evaluatePayment, normalizeMerchant } from "./policy-engine";
import {
  coSignPayment,
  coSignPaymentExpectingFailure,
  ensureRecipientUsdcAta,
  isSquadsReal,
} from "./squads-v4";
import { getDb } from "./db";

interface ServerPayInput {
  vaultId: string;
  merchant: string;
  recipientPubkey: string;
  amountUsd: number;
  memo?: string;
  /** If provided, writes to device_log after payment */
  logEvent?: {
    eventType: DeviceEventType;
    abilityId?: string;
    counterparty?: string;
    description: string;
  };
  /**
   * When true, blocked attempts whose violation is one Squads's spending
   * limit can refuse on-chain (per-tx cap, daily cap, weekly cap) get
   * submitted to the cluster anyway with skipPreflight, so the chain
   * produces a real failed tx with a verifiable signature.
   *
   * Safety: Only applied to violation codes Squads actually enforces.
   * Kyvern-only violations (merchant_not_allowed, missing_memo,
   * vault_paused, velocity_cap) stay off-chain — sending them on-chain
   * could let funds settle, since Squads doesn't know those rules.
   *
   * Costs ~5000 lamports per failed attempt (fee payer pays even on
   * failure). Caller MUST rate-limit this path.
   */
  forceOnChain?: boolean;
}

/**
 * Codes from policy-engine that Squads's `spendingLimitUse` refuses on
 * its own. Anything outside this set, the chain would happily settle —
 * so we mustn't submit it.
 */
const SQUADS_ENFORCED_CODES = new Set([
  "amount_exceeds_per_tx",
  "amount_exceeds_daily",
  "amount_exceeds_weekly",
]);

interface ServerPayResult {
  success: boolean;
  signature?: string;
  explorerUrl?: string;
  blocked?: boolean;
  reason?: string;
}

/**
 * Execute a real vault payment from a device using its stored agent credentials.
 * Same flow as POST /api/vault/pay but callable from server code.
 */
export async function serverVaultPay(
  input: ServerPayInput,
): Promise<ServerPayResult> {
  const vault = getVault(input.vaultId);
  if (!vault) return { success: false, reason: "vault_not_found" };

  // Get the vault's first active agent key + its Solana keypair
  const db = getDb();
  const agentKeyRow = db
    .prepare(
      `SELECT id, solana_pubkey, solana_secret_b58
       FROM vault_agent_keys
       WHERE vault_id = ? AND revoked_at IS NULL
       ORDER BY created_at ASC LIMIT 1`,
    )
    .get(input.vaultId) as {
    id: string;
    solana_pubkey: string | null;
    solana_secret_b58: string | null;
  } | undefined;

  if (!agentKeyRow) {
    return { success: false, reason: "no_agent_key" };
  }

  // Evaluate policy
  const snapshot = getSpendSnapshot(vault.id, vault.velocityWindow);
  const merchantNorm = normalizeMerchant(input.merchant) ?? input.merchant;
  const decision = evaluatePayment(
    { vault, snapshot },
    { merchant: input.merchant, amountUsd: input.amountUsd, memo: input.memo ?? null },
  );

  if (decision.decision === "blocked") {
    const violationCode = decision.code ?? "";
    const canForceChain =
      input.forceOnChain === true &&
      SQUADS_ENFORCED_CODES.has(violationCode) &&
      isSquadsReal() &&
      !!agentKeyRow.solana_secret_b58 &&
      !!vault.spendingLimitPda;

    if (canForceChain) {
      // Force the violation onto chain — Squads's spending limit will
      // refuse and we get back a real failed tx signature.
      try {
        await ensureRecipientUsdcAta({
          recipientPubkey: input.recipientPubkey,
          network: vault.network,
        });
      } catch {
        // ATA prep failure isn't fatal here — try the cosign anyway.
        // If the cluster also rejects on missing ATA, we still get a
        // chain-side error rather than a silent off-chain block.
      }

      const result = await coSignPaymentExpectingFailure({
        smartAccountAddress: vault.squadsAddress,
        spendingLimitPda: vault.spendingLimitPda!,
        agentSecretB58: agentKeyRow.solana_secret_b58!,
        merchant: merchantNorm,
        recipientPubkey: input.recipientPubkey,
        amountUsd: input.amountUsd,
        memo: input.memo ?? null,
        network: vault.network,
      });

      recordPayment({
        vaultId: vault.id,
        agentKeyId: agentKeyRow.id,
        merchant: merchantNorm,
        amountUsd: input.amountUsd,
        memo: input.memo ?? null,
        status: "blocked",
        reason: decision.reason ?? decision.code ?? "blocked",
        txSignature: result.txSignature,
        latencyMs: 0,
      });

      if (input.logEvent && result.txSignature) {
        writeDeviceLog({
          deviceId: vault.id,
          eventType: input.logEvent.eventType,
          abilityId: input.logEvent.abilityId,
          signature: result.txSignature,
          amountUsd: input.amountUsd,
          counterparty: input.logEvent.counterparty,
          description: input.logEvent.description,
          metadata: { explorerUrl: result.explorerUrl, blocked: true },
        });
      }

      return {
        success: false,
        blocked: true,
        signature: result.txSignature ?? undefined,
        explorerUrl: result.explorerUrl ?? undefined,
        reason: decision.reason ?? decision.code,
      };
    }

    recordPayment({
      vaultId: vault.id,
      agentKeyId: agentKeyRow.id,
      merchant: merchantNorm,
      amountUsd: input.amountUsd,
      memo: input.memo ?? null,
      status: "blocked",
      reason: decision.reason ?? decision.code ?? "blocked",
      txSignature: null,
      latencyMs: 0,
    });
    return { success: false, blocked: true, reason: decision.reason ?? decision.code };
  }

  // In real mode, do the Squads co-sign
  if (isSquadsReal() && agentKeyRow.solana_secret_b58 && vault.spendingLimitPda) {
    try {
      await ensureRecipientUsdcAta({
        recipientPubkey: input.recipientPubkey,
        network: vault.network,
      });
    } catch (e) {
      return { success: false, reason: `ata_prep_failed: ${e instanceof Error ? e.message : String(e)}` };
    }

    try {
      const cosign = await coSignPayment({
        smartAccountAddress: vault.squadsAddress,
        spendingLimitPda: vault.spendingLimitPda,
        agentSecretB58: agentKeyRow.solana_secret_b58,
        merchant: merchantNorm,
        recipientPubkey: input.recipientPubkey,
        amountUsd: input.amountUsd,
        memo: input.memo ?? null,
        network: vault.network,
      });

      // Record settled payment
      recordPayment({
        vaultId: vault.id,
        agentKeyId: agentKeyRow.id,
        merchant: merchantNorm,
        amountUsd: input.amountUsd,
        memo: input.memo ?? null,
        status: "settled",
        reason: null,
        txSignature: cosign.txSignature,
        latencyMs: 0,
      });

      // Write to device log if requested
      if (input.logEvent) {
        writeDeviceLog({
          deviceId: vault.id,
          eventType: input.logEvent.eventType,
          abilityId: input.logEvent.abilityId,
          signature: cosign.txSignature,
          amountUsd: input.amountUsd,
          counterparty: input.logEvent.counterparty,
          description: input.logEvent.description,
          metadata: { explorerUrl: cosign.explorerUrl },
        });
      }

      return {
        success: true,
        signature: cosign.txSignature,
        explorerUrl: cosign.explorerUrl,
      };
    } catch (e) {
      const reason = e instanceof Error ? e.message : "cosign_failed";
      recordPayment({
        vaultId: vault.id,
        agentKeyId: agentKeyRow.id,
        merchant: merchantNorm,
        amountUsd: input.amountUsd,
        memo: input.memo ?? null,
        status: "failed",
        reason,
        txSignature: null,
        latencyMs: 0,
      });
      return { success: false, reason };
    }
  }

  // Stub mode — produce a deterministic "signature" for testing
  const stubSig = `stub_${vault.id}_${Date.now().toString(36)}`;
  recordPayment({
    vaultId: vault.id,
    agentKeyId: agentKeyRow.id,
    merchant: merchantNorm,
    amountUsd: input.amountUsd,
    memo: input.memo ?? null,
    status: "settled",
    reason: null,
    txSignature: stubSig,
    latencyMs: 0,
  });

  if (input.logEvent) {
    writeDeviceLog({
      deviceId: vault.id,
      eventType: input.logEvent.eventType,
      abilityId: input.logEvent.abilityId,
      signature: stubSig,
      amountUsd: input.amountUsd,
      counterparty: input.logEvent.counterparty,
      description: input.logEvent.description,
    });
  }

  return { success: true, signature: stubSig };
}
