import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getVault } from "@/lib/vault-store";

/**
 * GET /api/vault/[id]/events?limit=50&since=<iso-or-ms>
 *
 * Per TRANSFORM_24H §T1 — the live event feed for the user's vault.
 * Returns the most recent payment decisions (allowed/blocked/settled/
 * failed) so the AliveConsole's right column can poll every 3s and
 * fade in new rows as the user's agent makes calls.
 *
 * Query:
 *   limit  — default 50, max 200
 *   since  — ISO date or ms timestamp; only return events created
 *            strictly after this. Used for polling without
 *            re-rendering the same rows.
 *
 * Auth: owner-wallet header `x-owner-wallet` matching vault.ownerWallet.
 * (Same MVP pattern as /pause and /set-kast-destination.)
 *
 * Response:
 *   {
 *     ok: true,
 *     events: Array<{
 *       id, ts, merchant, amountUsd, status, reason?,
 *       txSignature?, explorerUrl?, memo?
 *     }>,
 *     latestTs: string | null,    // newest event's created_at, for "since" cursor
 *   }
 */

interface EventRow {
  id: string;
  vault_id: string;
  merchant: string;
  amount_usd: number;
  memo: string | null;
  status: string;
  reason: string | null;
  tx_signature: string | null;
  created_at: string;
}

const SOLANA_EXPLORER = "https://explorer.solana.com/tx";

function explorerUrlFor(txSignature: string | null, network: string): string | null {
  if (!txSignature) return null;
  return `${SOLANA_EXPLORER}/${txSignature}?cluster=${network}`;
}

function parseSinceParam(s: string | null): string | null {
  if (!s) return null;
  // accept ISO timestamp or ms epoch
  if (/^\d+$/.test(s)) {
    const ms = Number(s);
    if (Number.isFinite(ms) && ms > 0) return new Date(ms).toISOString();
    return null;
  }
  // ISO — let SQLite do the comparison directly. Validate it parses.
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "vault_not_found" },
      { status: 404 },
    );
  }

  const owner = req.headers.get("x-owner-wallet")?.trim();
  if (!owner || owner !== vault.ownerWallet) {
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        message: "x-owner-wallet must match vault.ownerWallet",
      },
      { status: 401 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const limitRaw = Number(sp.get("limit") ?? "50");
  const limit = Math.min(
    200,
    Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 50),
  );
  const since = parseSinceParam(sp.get("since"));

  const db = getDb();
  let rows: EventRow[];
  if (since) {
    rows = db
      .prepare(
        `SELECT id, vault_id, merchant, amount_usd, memo, status, reason, tx_signature, created_at
           FROM vault_payments
          WHERE vault_id = ? AND created_at > ?
          ORDER BY created_at DESC
          LIMIT ?`,
      )
      .all(params.id, since, limit) as EventRow[];
  } else {
    rows = db
      .prepare(
        `SELECT id, vault_id, merchant, amount_usd, memo, status, reason, tx_signature, created_at
           FROM vault_payments
          WHERE vault_id = ?
          ORDER BY created_at DESC
          LIMIT ?`,
      )
      .all(params.id, limit) as EventRow[];
  }

  const events = rows.map((r) => ({
    id: r.id,
    ts: r.created_at,
    merchant: r.merchant,
    amountUsd: r.amount_usd,
    status: r.status,
    reason: r.reason ?? null,
    memo: r.memo ?? null,
    txSignature: r.tx_signature ?? null,
    explorerUrl: explorerUrlFor(r.tx_signature, vault.network),
  }));

  const latestTs = events.length > 0 ? events[0].ts : null;

  return NextResponse.json(
    { ok: true, events, latestTs },
    { headers: { "Cache-Control": "no-store" } },
  );
}
