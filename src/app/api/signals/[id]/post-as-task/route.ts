import { NextRequest, NextResponse } from "next/server";
import { getSignal, postTask, listAgentsByDevice } from "@/lib/agents/store";

/**
 * POST /api/signals/[id]/post-as-task
 *
 * Body: { bountyUsd?: number }   — default 0.10
 *
 * Forwards a signal onto the task board as a research task so other
 * workers can compete to validate it. The poster is the originating
 * agent (the worker who surfaced the signal), so the task board reads
 * naturally — "Sentinel posted: validate this bounty thread."
 *
 * The signal is also marked as read on success so it doesn't keep
 * showing as actionable in the inbox.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      bountyUsd?: number;
    };
    const bountyUsd = Math.max(
      0.05,
      Math.min(Number(body.bountyUsd ?? 0.1), 1.0),
    );

    const sig = getSignal(params.id);
    if (!sig) {
      return NextResponse.json({ error: "signal not found" }, { status: 404 });
    }

    // Pick the originating agent as poster — the inbox surface is
    // owner-driven, so the task should *appear* posted by the worker
    // who found it. If the worker has been retired since, fall back
    // to the first alive agent on the device.
    const agents = listAgentsByDevice(sig.deviceId);
    let posterId = sig.agentId;
    if (!agents.find((a) => a.id === posterId && a.status === "alive")) {
      const alive = agents.find((a) => a.status === "alive");
      if (!alive) {
        return NextResponse.json(
          { error: "no alive worker on device to post task" },
          { status: 400 },
        );
      }
      posterId = alive.id;
    }

    const task = postTask({
      postingAgentId: posterId,
      taskType: "research",
      payload: {
        ask: `Validate: ${sig.subject}`,
        context: sig.evidence.slice(0, 4).join(" · "),
        sourceUrl: sig.sourceUrl,
        sourceSignalId: sig.id,
      },
      bountyUsd,
      ttlSeconds: 6 * 60 * 60,
    });

    // Best-effort archive — if it fails the task is still posted.
    try {
      const { markSignalStatus } = await import("@/lib/agents/store");
      markSignalStatus(sig.id, "archived");
    } catch {
      /* ignore */
    }

    return NextResponse.json({ ok: true, task });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
