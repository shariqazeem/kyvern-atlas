/**
 * GET  /api/keys/providers — list keys for the authenticated owner
 * POST /api/keys/providers — store a new key
 *
 * Auth: x-owner-wallet header (or ?ownerWallet for GET fallback).
 *
 * GET response: { ok: true, keys: ProviderKeyRow[] }  — masked,
 * never returns plaintext or the encrypted blob.
 *
 * POST body: { provider, label, key }
 *   provider: anthropic | openai | deepseek | commonstack
 *   label:    free-form (e.g. "personal" / "work")
 *   key:      plaintext API key — encrypted at rest before write
 *
 * POST response: { ok: true, key: ProviderKeyRow }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listProviderKeysForOwner,
  storeProviderKey,
} from "@/lib/agents/graph/keys-store";
import { LlmProviderSchema } from "@/lib/agents/graph/schemas";
import { z } from "zod";

function getOwner(req: NextRequest): string {
  const fromHeader = req.headers.get("x-owner-wallet")?.trim() || "";
  if (fromHeader) return fromHeader;
  const url = new URL(req.url);
  return url.searchParams.get("ownerWallet")?.trim() || "";
}

export async function GET(req: NextRequest) {
  const owner = getOwner(req);
  if (!owner) {
    return NextResponse.json(
      { ok: false, error: "owner_wallet_required" },
      { status: 401 },
    );
  }
  const keys = listProviderKeysForOwner(owner);
  return NextResponse.json({ ok: true, keys });
}

const PostBodySchema = z.object({
  provider: LlmProviderSchema,
  label: z.string().min(1).max(64),
  key: z.string().min(8).max(512),
});

export async function POST(req: NextRequest) {
  const owner = getOwner(req);
  if (!owner) {
    return NextResponse.json(
      { ok: false, error: "owner_wallet_required" },
      { status: 401 },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "body_must_be_json" },
      { status: 400 },
    );
  }
  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const row = storeProviderKey({
      ownerWallet: owner,
      provider: parsed.data.provider,
      label: parsed.data.label,
      plaintextKey: parsed.data.key,
    });
    return NextResponse.json({ ok: true, key: row }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // KYVERN_KEY_VAULT_SECRET missing surfaces here
    return NextResponse.json(
      { ok: false, error: "store_failed", message: msg },
      { status: 500 },
    );
  }
}
