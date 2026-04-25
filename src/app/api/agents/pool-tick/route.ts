import { NextResponse } from "next/server";
import { tickEligibleAgents } from "@/lib/agents/runner";

/**
 * POST /api/agents/pool-tick
 *
 * Tick all eligible alive agents (those past their frequency window).
 * Skips Atlas (which runs in its own dedicated PM2 process).
 *
 * Called by the agent-pool worker every ~10s.
 */
export async function POST() {
  try {
    const result = await tickEligibleAgents();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[agents/pool-tick]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal error" },
      { status: 500 },
    );
  }
}
