/**
 * GET /api/agents/[id]/runs — paged run history.
 *
 * Auth: x-owner-wallet must match the agent's vault owner.
 *
 * Query params:
 *   limit?: 1–100, default 50
 *   before?: epoch ms; returns rows with started_at < before
 *
 * Returns: { runs: AgentRun[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { listRunsForAgent } from "@/lib/agents/graph/runs-store";
import { getDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const row = getDb()
    .prepare(
      `SELECT v.owner_wallet AS owner
         FROM agents a
         JOIN vaults v ON v.id = a.device_id
         WHERE a.id = ?`,
    )
    .get(params.id) as { owner: string } | undefined;
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "agent_not_found" },
      { status: 404 },
    );
  }
  const requestOwner = req.headers.get("x-owner-wallet")?.trim() || "";
  if (!requestOwner || requestOwner !== row.owner) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    100,
  );
  const beforeRaw = url.searchParams.get("before");
  const before =
    beforeRaw && /^\d+$/.test(beforeRaw) ? parseInt(beforeRaw, 10) : undefined;

  const runs = listRunsForAgent(params.id, limit, before);
  return NextResponse.json({ ok: true, runs });
}
