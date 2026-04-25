import { NextRequest, NextResponse } from "next/server";
import { getAgent, listThoughts } from "@/lib/agents/store";

/**
 * GET /api/agents/[id]
 * Returns the agent + recent thoughts.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const agent = getAgent(params.id);
    if (!agent) {
      return NextResponse.json({ error: "agent not found" }, { status: 404 });
    }

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("thoughtsLimit") ?? "20", 10),
      100,
    );
    const thoughts = listThoughts(params.id, limit);

    return NextResponse.json({ agent, thoughts });
  } catch (e) {
    console.error("[agents/id]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
