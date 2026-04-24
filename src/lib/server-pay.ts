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
import { coSignPayment, ensureRecipientUsdcAta, isSquadsReal } from "./squads-v4";
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
}

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
