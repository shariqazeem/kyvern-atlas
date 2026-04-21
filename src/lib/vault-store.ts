/* ════════════════════════════════════════════════════════════════════
   vault-store — thin, typed accessor for the vault/payment/agent_key
   tables. Everything outside this file treats vaults as plain objects.
   ════════════════════════════════════════════════════════════════════ */

import { createHash, randomBytes } from "crypto";
import { nanoid } from "nanoid";
import { getDb } from "./db";

/* ─── Domain types ─── */

export type VelocityWindow = "1h" | "1d" | "1w";

export interface VaultRecord {
  id: string;
  ownerWallet: string;
  name: string;
  emoji: string;
  purpose: string;

  dailyLimitUsd: number;
  weeklyLimitUsd: number;
  perTxMaxUsd: number;

  maxCallsPerWindow: number;
  velocityWindow: VelocityWindow;

  allowedMerchants: string[];
  requireMemo: boolean;

  squadsAddress: string;
  network: "devnet" | "mainnet";

  // Real Squads v4 on-chain state (null for legacy/stub vaults).
  vaultPda: string | null;
  createSignature: string | null;
  spendingLimitPda: string | null;
  spendingLimitCreateKey: string | null;
  setSpendingLimitSignature: string | null;

  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewVaultInput {
  ownerWallet: string;
  name: string;
  emoji: string;
  purpose: string;
  dailyLimitUsd: number;
  weeklyLimitUsd: number;
  perTxMaxUsd: number;
  maxCallsPerWindow: number;
  velocityWindow: VelocityWindow;
  allowedMerchants: string[];
  requireMemo: boolean;
  squadsAddress: string;
  network: "devnet" | "mainnet";
}

export interface PaymentRecord {
  id: string;
  vaultId: string;
  agentKeyId: string | null;
  merchant: string;
  amountUsd: number;
  memo: string | null;
  status: "allowed" | "blocked" | "settled" | "failed";
  reason: string | null;
  txSignature: string | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface AgentKeyRecord {
  id: string;
  vaultId: string;
  keyPrefix: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  /** Solana pubkey delegated on the Squads spending limit (null for stub-mode keys). */
  solanaPubkey: string | null;
}

/* ─── Row → object helpers ─── */

type VaultRow = {
  id: string;
  owner_wallet: string;
  name: string;
  emoji: string;
  purpose: string;
  daily_limit_usd: number;
  weekly_limit_usd: number;
  per_tx_max_usd: number;
  max_calls_per_window: number;
  velocity_window: string;
  allowed_merchants: string;
  require_memo: number;
  squads_address: string;
  network: string;
  paused_at: string | null;
  created_at: string;
  updated_at: string;
  vault_pda: string | null;
  create_signature: string | null;
  spending_limit_pda: string | null;
  spending_limit_create_key: string | null;
  set_spending_limit_signature: string | null;
};

function rowToVault(row: VaultRow): VaultRecord {
  let merchants: string[] = [];
  try {
    const parsed = JSON.parse(row.allowed_merchants);
    if (Array.isArray(parsed)) merchants = parsed.filter((m): m is string => typeof m === "string");
  } catch {
    merchants = [];
  }
  return {
    id: row.id,
    ownerWallet: row.owner_wallet,
    name: row.name,
    emoji: row.emoji,
    purpose: row.purpose,
    dailyLimitUsd: row.daily_limit_usd,
    weeklyLimitUsd: row.weekly_limit_usd,
    perTxMaxUsd: row.per_tx_max_usd,
    maxCallsPerWindow: row.max_calls_per_window,
    velocityWindow: (row.velocity_window as VelocityWindow) ?? "1h",
    allowedMerchants: merchants,
    requireMemo: row.require_memo === 1,
    squadsAddress: row.squads_address,
    network: (row.network as "devnet" | "mainnet") ?? "devnet",
    vaultPda: row.vault_pda ?? null,
    createSignature: row.create_signature ?? null,
    spendingLimitPda: row.spending_limit_pda ?? null,
    spendingLimitCreateKey: row.spending_limit_create_key ?? null,
    setSpendingLimitSignature: row.set_spending_limit_signature ?? null,
    pausedAt: row.paused_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ─── Agent key hashing ─── */

export function hashAgentKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function mintAgentKey(): { raw: string; prefix: string; hash: string } {
  // 32 bytes of entropy, hex-encoded, prefixed so users can visually scan.
  const entropy = randomBytes(32).toString("hex");
  const raw = `kv_live_${entropy}`;
  return {
    raw,
    prefix: raw.slice(0, 14),
    hash: hashAgentKey(raw),
  };
}

/* ─── Vault CRUD ─── */

export function createVault(input: NewVaultInput): VaultRecord {
  const db = getDb();
  const id = `vlt_${nanoid(14)}`;
  db.prepare(
    `
    INSERT INTO vaults (
      id, owner_wallet, name, emoji, purpose,
      daily_limit_usd, weekly_limit_usd, per_tx_max_usd,
      max_calls_per_window, velocity_window,
      allowed_merchants, require_memo,
      squads_address, network
    ) VALUES (
      @id, @owner_wallet, @name, @emoji, @purpose,
      @daily_limit_usd, @weekly_limit_usd, @per_tx_max_usd,
      @max_calls_per_window, @velocity_window,
      @allowed_merchants, @require_memo,
      @squads_address, @network
    )
  `,
  ).run({
    id,
    owner_wallet: input.ownerWallet,
    name: input.name,
    emoji: input.emoji,
    purpose: input.purpose,
    daily_limit_usd: input.dailyLimitUsd,
    weekly_limit_usd: input.weeklyLimitUsd,
    per_tx_max_usd: input.perTxMaxUsd,
    max_calls_per_window: input.maxCallsPerWindow,
    velocity_window: input.velocityWindow,
    allowed_merchants: JSON.stringify(input.allowedMerchants),
    require_memo: input.requireMemo ? 1 : 0,
    squads_address: input.squadsAddress,
    network: input.network,
  });
  const vault = getVault(id);
  if (!vault) throw new Error("failed to persist vault");
  return vault;
}

export function getVault(id: string): VaultRecord | null {
  const row = getDb()
    .prepare(`SELECT * FROM vaults WHERE id = ?`)
    .get(id) as VaultRow | undefined;
  return row ? rowToVault(row) : null;
}

export function getVaultsByOwner(ownerWallet: string): VaultRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM vaults WHERE owner_wallet = ? ORDER BY created_at DESC`,
    )
    .all(ownerWallet) as VaultRow[];
  return rows.map(rowToVault);
}

export function pauseVault(id: string): VaultRecord | null {
  getDb()
    .prepare(
      `UPDATE vaults SET paused_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND paused_at IS NULL`,
    )
    .run(id);
  return getVault(id);
}

export function resumeVault(id: string): VaultRecord | null {
  getDb()
    .prepare(
      `UPDATE vaults SET paused_at = NULL, updated_at = datetime('now') WHERE id = ?`,
    )
    .run(id);
  return getVault(id);
}

/* ─── Agent keys ─── */

/**
 * Issue a new agent key.
 *
 * When `solana` is provided, we store the delegate's Solana pubkey + base58
 * secret alongside the off-chain bearer key, so the server can co-sign
 * `spendingLimitUse` instructions on this agent's behalf. The bearer key
 * (returned as `raw`) is what the agent passes in `Authorization: Bearer …`;
 * the Solana keypair never leaves the server.
 */
export function issueAgentKey(
  vaultId: string,
  label = "primary",
  solana?: { pubkey: string; secretB58: string },
): { record: AgentKeyRecord; raw: string } {
  const { raw, prefix, hash } = mintAgentKey();
  const id = `agk_${nanoid(14)}`;
  getDb()
    .prepare(
      `
      INSERT INTO vault_agent_keys (
        id, vault_id, key_hash, key_prefix, label,
        solana_pubkey, solana_secret_b58
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      id,
      vaultId,
      hash,
      prefix,
      label,
      solana?.pubkey ?? null,
      solana?.secretB58 ?? null,
    );

  const record: AgentKeyRecord = {
    id,
    vaultId,
    keyPrefix: prefix,
    label,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
    solanaPubkey: solana?.pubkey ?? null,
  };
  return { record, raw };
}

export function resolveAgentKey(
  rawKey: string,
): { keyId: string; vaultId: string } | null {
  const hash = hashAgentKey(rawKey);
  const row = getDb()
    .prepare(
      `SELECT id, vault_id FROM vault_agent_keys WHERE key_hash = ? AND revoked_at IS NULL`,
    )
    .get(hash) as { id: string; vault_id: string } | undefined;
  if (!row) return null;
  return { keyId: row.id, vaultId: row.vault_id };
}

/**
 * Look up an agent key's stored Solana secret, for the pay path.
 * Returns null if the key is revoked, missing, or was issued in
 * stub mode before the Solana column was added.
 */
export function getAgentKeySolana(
  keyId: string,
): { pubkey: string; secretB58: string } | null {
  const row = getDb()
    .prepare(
      `SELECT solana_pubkey, solana_secret_b58
         FROM vault_agent_keys
        WHERE id = ? AND revoked_at IS NULL`,
    )
    .get(keyId) as
    | { solana_pubkey: string | null; solana_secret_b58: string | null }
    | undefined;
  if (!row || !row.solana_pubkey || !row.solana_secret_b58) return null;
  return { pubkey: row.solana_pubkey, secretB58: row.solana_secret_b58 };
}

export function touchAgentKey(keyId: string): void {
  getDb()
    .prepare(`UPDATE vault_agent_keys SET last_used_at = datetime('now') WHERE id = ?`)
    .run(keyId);
}

/** Persist the on-chain Squads state we need for the pay path. */
export function setVaultSquadsState(
  vaultId: string,
  state: {
    vaultPda: string | null;
    createSignature: string | null;
    spendingLimitPda: string | null;
    spendingLimitCreateKey: string | null;
    setSpendingLimitSignature: string | null;
  },
): VaultRecord | null {
  getDb()
    .prepare(
      `UPDATE vaults
          SET vault_pda                   = ?,
              create_signature            = ?,
              spending_limit_pda          = ?,
              spending_limit_create_key   = ?,
              set_spending_limit_signature= ?,
              updated_at                  = datetime('now')
        WHERE id = ?`,
    )
    .run(
      state.vaultPda,
      state.createSignature,
      state.spendingLimitPda,
      state.spendingLimitCreateKey,
      state.setSpendingLimitSignature,
      vaultId,
    );
  return getVault(vaultId);
}

/* ─── Payments ─── */

export interface RecordPaymentInput {
  vaultId: string;
  agentKeyId: string | null;
  merchant: string;
  amountUsd: number;
  memo: string | null;
  status: "allowed" | "blocked" | "settled" | "failed";
  reason: string | null;
  txSignature: string | null;
  latencyMs: number | null;
}

export function recordPayment(input: RecordPaymentInput): PaymentRecord {
  const db = getDb();
  const id = `pay_${nanoid(14)}`;
  db.prepare(
    `
    INSERT INTO vault_payments (
      id, vault_id, agent_key_id, merchant, amount_usd, memo,
      status, reason, tx_signature, latency_ms
    ) VALUES (
      @id, @vault_id, @agent_key_id, @merchant, @amount_usd, @memo,
      @status, @reason, @tx_signature, @latency_ms
    )
  `,
  ).run({
    id,
    vault_id: input.vaultId,
    agent_key_id: input.agentKeyId,
    merchant: input.merchant,
    amount_usd: input.amountUsd,
    memo: input.memo,
    status: input.status,
    reason: input.reason,
    tx_signature: input.txSignature,
    latency_ms: input.latencyMs,
  });
  const row = db.prepare(`SELECT * FROM vault_payments WHERE id = ?`).get(id) as {
    id: string;
    vault_id: string;
    agent_key_id: string | null;
    merchant: string;
    amount_usd: number;
    memo: string | null;
    status: string;
    reason: string | null;
    tx_signature: string | null;
    latency_ms: number | null;
    created_at: string;
  };
  return {
    id: row.id,
    vaultId: row.vault_id,
    agentKeyId: row.agent_key_id,
    merchant: row.merchant,
    amountUsd: row.amount_usd,
    memo: row.memo,
    status: row.status as PaymentRecord["status"],
    reason: row.reason,
    txSignature: row.tx_signature,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
  };
}

export function listPayments(
  vaultId: string,
  limit = 50,
): PaymentRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM vault_payments WHERE vault_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(vaultId, limit) as Array<{
    id: string;
    vault_id: string;
    agent_key_id: string | null;
    merchant: string;
    amount_usd: number;
    memo: string | null;
    status: string;
    reason: string | null;
    tx_signature: string | null;
    latency_ms: number | null;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    vaultId: row.vault_id,
    agentKeyId: row.agent_key_id,
    merchant: row.merchant,
    amountUsd: row.amount_usd,
    memo: row.memo,
    status: row.status as PaymentRecord["status"],
    reason: row.reason,
    txSignature: row.tx_signature,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
  }));
}

/* ─── Aggregations used by the policy engine ─── */

export interface VaultSpendSnapshot {
  spentToday: number;
  spentThisWeek: number;
  callsInWindow: number;
  windowStart: string;
}

export function getSpendSnapshot(
  vaultId: string,
  velocityWindow: VelocityWindow,
): VaultSpendSnapshot {
  const db = getDb();
  const now = Date.now();
  const dayStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const windowMs =
    velocityWindow === "1h"
      ? 60 * 60 * 1000
      : velocityWindow === "1d"
        ? 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
  const windowStart = new Date(now - windowMs).toISOString();

  const daily = db
    .prepare(
      `SELECT COALESCE(SUM(amount_usd), 0) AS total
       FROM vault_payments
       WHERE vault_id = ? AND status IN ('allowed','settled') AND created_at >= ?`,
    )
    .get(vaultId, dayStart) as { total: number };

  const weekly = db
    .prepare(
      `SELECT COALESCE(SUM(amount_usd), 0) AS total
       FROM vault_payments
       WHERE vault_id = ? AND status IN ('allowed','settled') AND created_at >= ?`,
    )
    .get(vaultId, weekStart) as { total: number };

  const velocity = db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM vault_payments
       WHERE vault_id = ? AND created_at >= ?`,
    )
    .get(vaultId, windowStart) as { n: number };

  return {
    spentToday: daily.total ?? 0,
    spentThisWeek: weekly.total ?? 0,
    callsInWindow: velocity.n ?? 0,
    windowStart,
  };
}
