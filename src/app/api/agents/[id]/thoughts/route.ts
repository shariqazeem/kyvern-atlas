import { NextRequest, NextResponse } from "next/server";
import { listThoughts } from "@/lib/agents/store";

const ECONOMIC_TOOLS = new Set([
  "post_task",
  "claim_task",
  "complete_task",
  "stake_on_finding",
  "subscribe_to_agent",
]);

/**
 * GET /api/agents/[id]/thoughts
 *
 * Returns the agent's most recent thoughts.
 *
 *   ?limit=30        — number of rows (max 200)
 *   ?economic=1      — filter to economic-tool calls only (post_task,
 *                      claim_task, complete_task, stake_on_finding,
 *                      subscribe_to_agent) OR rows with a signature.
 *                      Used by the EconomicTimeline component on the
 *                      worker detail page (Phase 6).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10),
      200,
    );
    const economic = req.nextUrl.searchParams.get("economic") === "1";

    // Pull a wider window when filtering — most ticks are not
    // economic actions, so we need to look back further to surface
    // a useful timeline.
    const fetchLimit = economic ? Math.min(limit * 6, 200) : limit;
    const all = listThoughts(params.id, fetchLimit);
    const thoughts = economic
      ? all.filter(
          (t) =>
            (t.toolUsed && ECONOMIC_TOOLS.has(t.toolUsed)) ||
            !!t.signature,
        )
      : all;

    return NextResponse.json({
      thoughts: economic ? thoughts.slice(0, limit) : thoughts,
    });
  } catch (e) {
    console.error("[agents/thoughts]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
