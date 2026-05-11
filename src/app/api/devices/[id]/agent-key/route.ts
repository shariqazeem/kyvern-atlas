import { NextRequest, NextResponse } from "next/server";
import { getVault, issueAgentKey } from "@/lib/vault-store";
import { getDb } from "@/lib/db";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Look up the vault's original Solana delegate keypair — the one
 * /api/vault/create registered as authorized on the Squads spending
 * limit. New agent keys must reuse this keypair, not generate a fresh
 * one, otherwise vault.pay() fails with "Attempted to perform an
 * unauthorized action" because Squads only knows about the original
 * delegate.
 */
function getVaultOriginalDelegate(
  vaultId: string,
): { pubkey: string; secretB58: string } | null {
  const row = getDb()
    .prepare(
      `SELECT solana_pubkey, solana_secret_b58
         FROM vault_agent_keys
        WHERE vault_id = ?
          AND solana_pubkey IS NOT NULL
          AND solana_secret_b58 IS NOT NULL
        ORDER BY created_at ASC
        LIMIT 1`,
    )
    .get(vaultId) as {
    solana_pubkey: string | null;
    solana_secret_b58: string | null;
  } | undefined;
  if (!row?.solana_pubkey || !row?.solana_secret_b58) return null;
  return { pubkey: row.solana_pubkey, secretB58: row.solana_secret_b58 };
}

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

  // CRITICAL: reuse the vault's ORIGINAL Solana delegate (set up at
  // /api/vault/create time) — it's the only keypair authorized on the
  // on-chain Squads spending limit. Generating a fresh keypair here
  // would mint a working bearer token whose tx attempts get rejected
  // with "Attempted to perform an unauthorized action."
  //
  // Only fall back to a fresh keypair if no original exists (legacy
  // pre-Solana-column rows). Those vaults can't pay-on-chain anyway.
  const original = getVaultOriginalDelegate(params.id);
  let pubkey: string;
  let secretB58: string;
  if (original) {
    pubkey = original.pubkey;
    secretB58 = original.secretB58;
  } else {
    const kp = Keypair.generate();
    pubkey = kp.publicKey.toBase58();
    secretB58 = bs58.encode(kp.secretKey);
  }

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
