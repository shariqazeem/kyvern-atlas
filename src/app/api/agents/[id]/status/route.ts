import { NextRequest, NextResponse } from "next/server";
import { getAgent, updateAgentStatus } from "@/lib/agents/store";
import type { AgentStatus } from "@/lib/agents/types";

/**
 * PATCH /api/agents/[id]/status
 * Update agent status. Body: { status: 'alive'|'paused'|'retired' }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await req.json()) as { status?: string };
    const status = body.status as AgentStatus;
    if (!status || !["alive", "paused", "retired"].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const agent = getAgent(params.id);
    if (!agent) {
      return NextResponse.json({ error: "agent not found" }, { status: 404 });
    }

    // Don't allow changing Atlas's status from here
    if (agent.id === "agt_atlas") {
      return NextResponse.json(
        { error: "Atlas runs in its own dedicated process" },
        { status: 403 },
      );
    }

    updateAgentStatus(params.id, status);
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    console.error("[agents/status]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
