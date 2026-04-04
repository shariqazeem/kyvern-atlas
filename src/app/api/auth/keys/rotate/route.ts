import { NextRequest, NextResponse } from "next/server";
import { authenticateSession, generateApiKey } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const keyId = body.key_id;

  if (!keyId || typeof keyId !== "string") {
    return NextResponse.json(
      { error: "key_id is required" },
      { status: 400 }
    );
  }

  const db = getDb();

  // Verify ownership: the key must belong to this wallet
  const existing = db
    .prepare(
      "SELECT id FROM api_keys WHERE id = ? AND wallet_address = ?"
    )
    .get(keyId, auth.wallet) as { id: string } | undefined;

  if (!existing) {
    return NextResponse.json(
      { error: "Key not found or does not belong to your wallet" },
      { status: 403 }
    );
  }

  // Generate new credentials
  const { fullKey, keyHash, keyPrefix } = generateApiKey();

  // Update the existing row with new credentials, clear key_full
  db.prepare(
    "UPDATE api_keys SET key_hash = ?, key_prefix = ?, key_full = NULL WHERE id = ?"
  ).run(keyHash, keyPrefix, keyId);

  return NextResponse.json({
    success: true,
    key_id: keyId,
    full_key: fullKey, // shown once
    key_prefix: keyPrefix,
  });
}
