/**
 * DELETE /api/keys/providers/[id] — remove a key (auth-scoped).
 * POST   /api/keys/providers/[id]/test — verify a stored key works.
 *
 * Auth: x-owner-wallet must match the row's owner. The DELETE
 * silently no-ops if the key doesn't belong to the caller (so
 * id enumeration leaks nothing).
 *
 * Test makes a 1-token request to the provider:
 *   anthropic   → /v1/messages with max_tokens=1
 *   openai/etc  → /v1/chat/completions with max_tokens=1
 *
 * Result codes:
 *   ok              — provider returned 200
 *   invalid         — 401/403
 *   quota_exceeded  — 429 with quota error indicator
 *   network_error   — fetch failed
 *   unknown         — anything else
 */

import { NextRequest, NextResponse } from "next/server";
import {
  deleteProviderKey,
  getProviderKeyMasked,
} from "@/lib/agents/graph/keys-store";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const owner = req.headers.get("x-owner-wallet")?.trim() || "";
  if (!owner) {
    return NextResponse.json(
      { ok: false, error: "owner_wallet_required" },
      { status: 401 },
    );
  }
  const removed = deleteProviderKey(params.id, owner);
  return NextResponse.json({ ok: true, removed });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const owner = req.headers.get("x-owner-wallet")?.trim() || "";
  if (!owner) {
    return NextResponse.json(
      { ok: false, error: "owner_wallet_required" },
      { status: 401 },
    );
  }
  const row = getProviderKeyMasked(params.id, owner);
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, key: row });
}
