import { nanoid } from "nanoid";
import crypto from "crypto";
import { NextRequest } from "next/server";
import { getDb } from "./db";

// --- API Key Generation ---

export function generateApiKey(): {
  fullKey: string;
  keyHash: string;
  keyPrefix: string;
  keyId: string;
} {
  const keyId = nanoid();
  const random = nanoid(24);
  const fullKey = `kv_live_${random}`;
  const keyHash = crypto.createHash("sha256").update(fullKey).digest("hex");
  const keyPrefix = fullKey.slice(0, 12);

  return { fullKey, keyHash, keyPrefix, keyId };
}

// --- Account Management ---

export function createAccount(walletAddress: string): {
  accountId: string;
  apiKeyId: string;
  fullApiKey: string;
  keyPrefix: string;
  isNew: boolean;
} {
  const db = getDb();
  const wallet = walletAddress.toLowerCase();

  // Check if already exists
  const existing = db.prepare("SELECT id FROM accounts WHERE wallet_address = ?").get(wallet) as
    | { id: string }
    | undefined;

  if (existing) {
    // Return existing account info (without full key — it was shown once)
    const key = db.prepare(
      "SELECT id, key_prefix FROM api_keys WHERE wallet_address = ? LIMIT 1"
    ).get(wallet) as { id: string; key_prefix: string } | undefined;

    return {
      accountId: existing.id,
      apiKeyId: key?.id || "",
      fullApiKey: "", // never shown again
      keyPrefix: key?.key_prefix || "",
      isNew: false,
    };
  }

  // Create new account + API key in a transaction
  const accountId = nanoid();
  const { fullKey, keyHash, keyPrefix, keyId } = generateApiKey();

  const createTx = db.transaction(() => {
    db.prepare("INSERT INTO accounts (id, wallet_address) VALUES (?, ?)").run(
      accountId,
      wallet
    );

    db.prepare(
      "INSERT INTO api_keys (id, key_hash, key_prefix, name, wallet_address, tier) VALUES (?, ?, ?, ?, ?, 'free')"
    ).run(keyId, keyHash, keyPrefix, "Default", wallet);
  });

  createTx();

  return {
    accountId,
    apiKeyId: keyId,
    fullApiKey: fullKey,
    keyPrefix,
    isNew: true,
  };
}

export function getAccountByWallet(
  walletAddress: string
): { id: string; wallet_address: string; onboarding_completed: number } | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT * FROM accounts WHERE wallet_address = ?")
      .get(walletAddress.toLowerCase()) as {
      id: string;
      wallet_address: string;
      onboarding_completed: number;
    }) || null
  );
}

// --- Session Management (SIWE) ---

export function createSession(walletAddress: string): string {
  const db = getDb();
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  // Clean old sessions for this wallet
  db.prepare("DELETE FROM sessions WHERE wallet_address = ?").run(
    walletAddress.toLowerCase()
  );

  db.prepare(
    "INSERT INTO sessions (token, wallet_address, expires_at) VALUES (?, ?, ?)"
  ).run(token, walletAddress.toLowerCase(), expiresAt);

  return token;
}

export function validateSession(
  token: string
): { wallet_address: string } | null {
  const db = getDb();
  const session = db
    .prepare(
      "SELECT wallet_address FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    )
    .get(token) as { wallet_address: string } | undefined;

  return session || null;
}

export function deleteSession(token: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// --- Request Authentication ---

function resolveWalletToApiKeyId(walletAddress: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM api_keys WHERE wallet_address = ? LIMIT 1")
    .get(walletAddress.toLowerCase()) as { id: string } | undefined;
  return row?.id || null;
}

export function authenticateSession(
  req: NextRequest
): { apiKeyId: string; wallet: string } | { error: string } {
  const cookieHeader = req.cookies.get("pulse-session")?.value;
  if (!cookieHeader) {
    return { error: "Not authenticated. Connect your wallet." };
  }

  const session = validateSession(cookieHeader);
  if (!session) {
    return { error: "Session expired. Please reconnect." };
  }

  const apiKeyId = resolveWalletToApiKeyId(session.wallet_address);
  if (!apiKeyId) {
    return { error: "No API key found for this wallet." };
  }

  return { apiKeyId, wallet: session.wallet_address };
}

/**
 * Unified auth: tries session cookie first, then X-API-Key header.
 * Works for both dashboard (browser) and MCP (API key) requests.
 */
export function authenticateRequest(
  req: NextRequest
): { apiKeyId: string; wallet: string } | { error: string } {
  // 1. Try session cookie (dashboard)
  const sessionResult = authenticateSession(req);
  if (!("error" in sessionResult)) {
    return sessionResult;
  }

  // 2. Try X-API-Key header (MCP / programmatic)
  const apiKeyResult = authenticateIngestRequest(req);
  if (!("error" in apiKeyResult)) {
    // Resolve wallet address from the API key
    const db = getDb();
    const row = db
      .prepare("SELECT wallet_address FROM api_keys WHERE id = ?")
      .get(apiKeyResult.apiKeyId) as { wallet_address: string } | undefined;
    const wallet = row?.wallet_address || "";
    return { apiKeyId: apiKeyResult.apiKeyId, wallet };
  }

  // Both failed — return a helpful error
  return { error: "Not authenticated. Provide a session cookie or X-API-Key header." };
}

export function authenticateIngestRequest(
  req: NextRequest
): { apiKeyId: string } | { error: string } {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return { error: "Missing X-API-Key header" };
  }

  const db = getDb();
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const row = db
    .prepare("SELECT id FROM api_keys WHERE key_hash = ?")
    .get(keyHash) as { id: string } | undefined;

  if (!row) {
    // Fallback: check by prefix or id for backward compat with demo key
    const fallback = db
      .prepare("SELECT id FROM api_keys WHERE key_prefix = ? OR id = ?")
      .get(apiKey.slice(0, 12), apiKey) as { id: string } | undefined;
    if (!fallback) {
      return { error: "Invalid API key" };
    }
    return { apiKeyId: fallback.id };
  }

  // Update last_used_at
  db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(row.id);

  return { apiKeyId: row.id };
}
