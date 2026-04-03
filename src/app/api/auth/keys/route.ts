import { NextRequest, NextResponse } from "next/server";
import { authenticateSession, generateApiKey } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const db = getDb();
  const keys = db.prepare(
    "SELECT id, key_prefix, key_full, name, tier, created_at, last_used_at FROM api_keys WHERE wallet_address = ? ORDER BY created_at DESC"
  ).all(auth.wallet) as Array<{
    id: string;
    key_prefix: string;
    key_full: string | null;
    name: string;
    tier: string;
    created_at: string;
    last_used_at: string | null;
  }>;

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const db = getDb();

  // Check key count (free = 1 max)
  const existing = db.prepare(
    "SELECT COUNT(*) as count FROM api_keys WHERE wallet_address = ?"
  ).get(auth.wallet) as { count: number };

  // Check if Pro
  const sub = db.prepare(
    "SELECT id FROM subscriptions WHERE wallet_address = ? AND status = 'active' AND expires_at > datetime('now')"
  ).get(auth.wallet);

  const isPro = !!sub;
  const maxKeys = isPro ? 10 : 1;

  if (existing.count >= maxKeys) {
    return NextResponse.json(
      { error: `Free tier allows ${maxKeys} API key. Upgrade to Pro for up to 10.` },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = body.name || `Key ${existing.count + 1}`;

  const { fullKey, keyHash, keyPrefix, keyId } = generateApiKey();

  db.prepare(
    "INSERT INTO api_keys (id, key_hash, key_prefix, name, wallet_address, tier) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(keyId, keyHash, keyPrefix, name, auth.wallet, isPro ? "pro" : "free");

  return NextResponse.json({
    success: true,
    key_id: keyId,
    full_key: fullKey, // shown once
    key_prefix: keyPrefix,
  });
}
