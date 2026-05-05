import { NextRequest, NextResponse } from "next/server";
import { getVault, issueAgentKey } from "@/lib/vault-store";
import { getDb } from "@/lib/db";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * GET  /api/devices/[id]/agent-key
 * POST /api/devices/[id]/agent-key
 *
 * The Pay & Enforce tab + Deploy Worker tab need the user's actual
 * KYVERN_AGENT_KEY to render the SDK + cURL snippets so they're
 * pasteable, not placeholder. Two flavours:
 *
 *   GET  → returns just the prefix (e.g. "kv_live_b7b2") for safe
 *          inline display. The raw key is hashed at storage; we
 *          can't recover it.
 *   POST → mints a fresh agent key bound to a new Solana keypair,
 *          returns the raw value ONCE. The UI must show + copy
 *          immediately and warn the user that it's shown once.
 *
 * Both endpoints are tied to the device id. No auth gate beyond
 * vault existence — same model as /api/devices/[id]/live-status,
 * which the entire /app already uses without extra auth. Adequate
 * for the hackathon demo; harden for mainnet.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { error: "device not found" },
      { status: 404 },
    );
  }

  const live = getDb()
    .prepare(
      `SELECT id, key_prefix
         FROM vault_agent_keys
        WHERE vault_id = ? AND revoked_at IS NULL
        ORDER BY created_at ASC LIMIT 1`,
    )
    .get(params.id) as { id: string; key_prefix: string } | undefined;
  return NextResponse.json({
    keyPrefix: live?.key_prefix ?? null,
    keyId: live?.id ?? null,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { error: "device not found" },
      { status: 404 },
    );
  }

  // Mint a fresh Solana keypair to bind to this agent key. Same shape
  // as /api/vault/create's primary-key minting path.
  const kp = Keypair.generate();
  const pubkey = kp.publicKey.toBase58();
  const secretB58 = bs58.encode(kp.secretKey);

  const { record, raw } = issueAgentKey(params.id, "in-app", {
    pubkey,
    secretB58,
  });

  return NextResponse.json({
    keyPrefix: record.keyPrefix,
    keyId: record.id,
    rawKey: raw,
    warning:
      "This is the only time you'll see the full key. Copy it now or mint a new one later.",
  });
}
