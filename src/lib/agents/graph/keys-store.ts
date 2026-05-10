/**
 * BYOK provider keys store.
 *
 * Wraps user_provider_keys with AES-GCM encrypt/decrypt at the
 * boundary so callers never see plaintext keys outside loadKeyForUse().
 * The list/get views return masked rows (provider, label, last4,
 * test status) — never the decrypted key.
 *
 * Concurrency: SQLite WAL handles writes. No row-level locking needed.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { decryptKey, encryptKey, maskKeyLast4 } from "./keys-crypto";
import type { LlmProvider } from "./types";

export interface ProviderKeyRow {
  id: string;
  ownerWallet: string;
  provider: LlmProvider;
  label: string;
  keyLast4: string;
  createdAt: number;
  lastUsedAt: number | null;
  lastTestStatus: ProviderKeyTestStatus | null;
  lastTestAt: number | null;
}

export type ProviderKeyTestStatus =
  | "ok"
  | "invalid"
  | "quota_exceeded"
  | "network_error"
  | "unknown";

interface DbRow {
  id: string;
  owner_wallet: string;
  provider: LlmProvider;
  label: string;
  encrypted_key_blob: string;
  key_last4: string;
  created_at: number;
  last_used_at: number | null;
  last_test_status: ProviderKeyTestStatus | null;
  last_test_at: number | null;
}

function rowToView(row: DbRow): ProviderKeyRow {
  return {
    id: row.id,
    ownerWallet: row.owner_wallet,
    provider: row.provider,
    label: row.label,
    keyLast4: row.key_last4,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    lastTestStatus: row.last_test_status,
    lastTestAt: row.last_test_at,
  };
}

/* ─── Mutations ──────────────────────────────────────────────── */

export interface StoreKeyInput {
  ownerWallet: string;
  provider: LlmProvider;
  label: string;
  plaintextKey: string;
}

export function storeProviderKey(input: StoreKeyInput): ProviderKeyRow {
  const { ownerWallet, provider, label, plaintextKey } = input;
  if (!ownerWallet) throw new Error("ownerWallet required");
  if (!plaintextKey || plaintextKey.length < 8) {
    throw new Error("provider key must be at least 8 characters");
  }
  const id = randomUUID();
  const now = Date.now();
  const encrypted = encryptKey(plaintextKey);
  const last4 = maskKeyLast4(plaintextKey);
  const db = getDb();
  db.prepare(
    `INSERT INTO user_provider_keys
       (id, owner_wallet, provider, label, encrypted_key_blob,
        key_last4, created_at, last_used_at, last_test_status, last_test_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)`,
  ).run(id, ownerWallet, provider, label, encrypted, last4, now);
  return {
    id,
    ownerWallet,
    provider,
    label,
    keyLast4: last4,
    createdAt: now,
    lastUsedAt: null,
    lastTestStatus: null,
    lastTestAt: null,
  };
}

export function deleteProviderKey(
  id: string,
  ownerWallet: string,
): boolean {
  const db = getDb();
  const result = db
    .prepare(
      `DELETE FROM user_provider_keys WHERE id = ? AND owner_wallet = ?`,
    )
    .run(id, ownerWallet);
  return result.changes > 0;
}

export function recordKeyTest(
  id: string,
  ownerWallet: string,
  status: ProviderKeyTestStatus,
): void {
  const db = getDb();
  db.prepare(
    `UPDATE user_provider_keys
       SET last_test_status = ?, last_test_at = ?
       WHERE id = ? AND owner_wallet = ?`,
  ).run(status, Date.now(), id, ownerWallet);
}

export function recordKeyUsed(id: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE user_provider_keys SET last_used_at = ? WHERE id = ?`,
  ).run(Date.now(), id);
}

/* ─── Reads (masked) ─────────────────────────────────────────── */

export function listProviderKeysForOwner(
  ownerWallet: string,
): ProviderKeyRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM user_provider_keys
         WHERE owner_wallet = ?
         ORDER BY created_at DESC`,
    )
    .all(ownerWallet) as DbRow[];
  return rows.map(rowToView);
}

export function getProviderKeyMasked(
  id: string,
  ownerWallet: string,
): ProviderKeyRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM user_provider_keys WHERE id = ? AND owner_wallet = ?`,
    )
    .get(id, ownerWallet) as DbRow | undefined;
  return row ? rowToView(row) : null;
}

/* ─── Plaintext load — ONLY at provider-call time ────────────── */

/** Load and decrypt a provider key for use in an LLM step. Caller
 *  MUST NOT log or persist the returned plaintext. Recommended
 *  pattern: load, call provider, let the variable fall out of scope. */
export function loadKeyForUse(
  ownerWallet: string,
  provider: LlmProvider,
): { id: string; plaintext: string } | null {
  const db = getDb();
  // Pick the most-recently-used key for the provider (or newest if
  // never used). Rationale: a user with two Anthropic keys will get
  // their "active" one consistently; rotating to a different one is
  // explicit (delete the old).
  const row = db
    .prepare(
      `SELECT * FROM user_provider_keys
         WHERE owner_wallet = ? AND provider = ?
         ORDER BY COALESCE(last_used_at, created_at) DESC
         LIMIT 1`,
    )
    .get(ownerWallet, provider) as DbRow | undefined;
  if (!row) return null;
  let plaintext: string;
  try {
    plaintext = decryptKey(row.encrypted_key_blob);
  } catch (e) {
    // A decrypt failure means either the row was tampered with or
    // KYVERN_KEY_VAULT_SECRET was rotated. Either way the row is
    // dead — surface it instead of silently falling through.
    throw new Error(
      `failed to decrypt provider key ${row.id} (${row.provider}/${row.label}): ` +
      `${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return { id: row.id, plaintext };
}
