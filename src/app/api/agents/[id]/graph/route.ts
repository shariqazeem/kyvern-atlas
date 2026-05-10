/**
 * GET   /api/agents/[id]/graph — fetch the agent's graph
 * PATCH /api/agents/[id]/graph — replace the agent's graph
 *
 * Auth: x-owner-wallet must match the agent's vault owner.
 *
 * GET response: { ok, graph } — null if the agent has no graph (legacy).
 * PATCH body: { graph: AgentGraph }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAgentGraph, setAgentGraph } from "@/lib/agents/graph/agent-store";
import { AgentGraphSchema } from "@/lib/agents/graph/schemas";
import { getDb } from "@/lib/db";

function authorize(
  req: NextRequest,
  agentId: string,
): { ok: true } | { ok: false; status: number; body: unknown } {
  const row = getDb()
    .prepare(
      `SELECT v.owner_wallet AS owner
         FROM agents a
         JOIN vaults v ON v.id = a.device_id
         WHERE a.id = ?`,
    )
    .get(agentId) as { owner: string } | undefined;
  if (!row) {
    return { ok: false, status: 404, body: { ok: false, error: "agent_not_found" } };
  }
  const requestOwner = req.headers.get("x-owner-wallet")?.trim() || "";
  if (!requestOwner || requestOwner !== row.owner) {
    return { ok: false, status: 401, body: { ok: false, error: "unauthorized" } };
  }
  return { ok: true };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = authorize(req, params.id);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const graph = getAgentGraph(params.id);
  return NextResponse.json({ ok: true, graph });
}

const PatchBody = z.object({ graph: AgentGraphSchema });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = authorize(req, params.id);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "body_must_be_json" },
      { status: 400 },
    );
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", details: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    const updated = setAgentGraph(params.id, parsed.data.graph);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "no_change" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "update_failed",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
