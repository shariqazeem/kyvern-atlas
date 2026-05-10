/**
 * POST /api/agents/[id]/run — manual graph trigger.
 *
 * Auth: x-owner-wallet must match the agent's vault owner. Used by
 * the composer's "Test Run" button + a manual run button on the
 * agent detail page.
 *
 * Body (optional):
 *   { inputs?: Record<string, unknown> }
 *     becomes trigger.payload, accessible in the graph as
 *     {{trigger.payload.foo}}.
 *
 * Response: { ok, runId, run }  on success
 *           { ok:false, errorCode, error } on dispatch refusal
 *
 * Note: synchronous — awaits the full graph execution before
 * responding. For long graphs (LLM steps can take 30s+) the client
 * should use a generous timeout. A streaming variant is in P3.8.
 */

import { NextRequest, NextResponse } from "next/server";
import { dispatchRun } from "@/lib/agents/graph/dispatcher";
import { getDb } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Auth: agent → vault → owner_wallet
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

  // Parse body
  let inputs: Record<string, unknown> | null = null;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      inputs?: Record<string, unknown>;
    };
    inputs = body.inputs ?? null;
  } catch {
    inputs = null;
  }

  const result = await dispatchRun({
    agentId: params.id,
    triggerKind: "manual",
    triggerPayload: inputs,
  });

  if (!result.ok) {
    const status =
      result.errorCode === "agent_not_found" ? 404
      : result.errorCode === "graph_invalid" || result.errorCode === "graph_missing" ? 400
      : result.errorCode === "concurrency_per_vault" || result.errorCode === "concurrency_global" || result.errorCode === "daily_cap_reached" ? 429
      : 500;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result, { status: 200 });
}
