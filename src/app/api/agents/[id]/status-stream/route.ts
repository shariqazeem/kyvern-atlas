import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/agents/store";
import {
  listVisibleBootBeats,
  latestTickStatus,
} from "@/lib/agents/status-updates";

/**
 * GET /api/agents/[id]/status-stream
 *
 * Powers the BootSequence stack on the agent detail page during the
 * first 60 seconds, and the LiveWorkerCard's STATE pill thereafter.
 *
 * Response:
 *   {
 *     boot:   [{ stepIndex, message, createdAt }],   // 0..7 entries, ascending
 *     tick:   { message, createdAt } | null,         // latest non-boot status
 *     phase:  "boot" | "live"
 *   }
 *
 * `phase = "boot"` while total_thoughts === 0 — the page renders the
 * stack. `phase = "live"` once a thought has landed — the boot stack
 * dissolves and only the latest tick status feeds the card pill.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const agent = getAgent(params.id);
  if (!agent) {
    return NextResponse.json({ error: "agent not found" }, { status: 404 });
  }

  const phase = agent.totalThoughts === 0 ? "boot" : "live";

  const boot = phase === "boot"
    ? listVisibleBootBeats(agent.id).map((r) => ({
        stepIndex: r.stepIndex,
        message: r.message,
        createdAt: r.createdAt,
      }))
    : [];

  const tickRow = latestTickStatus(agent.id);
  const tick = tickRow
    ? { message: tickRow.message, createdAt: tickRow.createdAt }
    : null;

  return NextResponse.json({ boot, tick, phase });
}
