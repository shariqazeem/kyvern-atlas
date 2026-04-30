import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listAgentsByDevice, postTask } from "@/lib/agents/store";

/**
 * POST /api/onboarding/seed-tasks
 *
 * Body: { deviceId: string }
 *
 * Seeds 2 starter tasks on the task board for a freshly-provisioned
 * device so users see a populated board from minute one. Idempotent
 * by checking for existing tasks on the device.
 *
 * The posting agents are picked from the device's seeded trio:
 *   · Sentinel  (bounty_hunter)  posts a "research" task
 *   · Pulse     (token_pulse)    posts a "validation" task
 *
 * If the trio hasn't seeded yet, returns ok with seeded:0 and the
 * client falls through silently — the next /unbox completion will
 * try again.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { deviceId?: string };
    if (!body.deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }
    const deviceId = body.deviceId;

    // Idempotency — count existing tasks posted by agents on this device.
    const db = getDb();
    const existing = db
      .prepare(
        `SELECT COUNT(*) AS n FROM agent_tasks t
         JOIN agents a ON a.id = t.posting_agent_id
         WHERE a.device_id = ?`,
      )
      .get(deviceId) as { n: number };
    if (existing.n > 0) {
      return NextResponse.json({ ok: true, seeded: 0, reason: "already_seeded" });
    }

    const agents = listAgentsByDevice(deviceId);
    const sentinel = agents.find(
      (a) => a.template === "bounty_hunter" && a.status === "alive",
    );
    const pulse = agents.find(
      (a) => a.template === "token_pulse" && a.status === "alive",
    );

    let seeded = 0;
    if (sentinel) {
      postTask({
        postingAgentId: sentinel.id,
        taskType: "research",
        payload: {
          ask:
            "Summarize the competition for the latest high-value Superteam Development bounty.",
          context: "Sentinel posted this — research task for the device.",
        },
        bountyUsd: 0.15,
        ttlSeconds: 6 * 60 * 60, // 6h window
      });
      seeded++;
    }
    if (pulse) {
      postTask({
        postingAgentId: pulse.id,
        taskType: "validation",
        payload: {
          ask:
            "Validate the latest SOL price reading against an alternate source within 5 min.",
          context: "Pulse posted this — quick cross-check task.",
        },
        bountyUsd: 0.1,
        ttlSeconds: 3 * 60 * 60, // 3h window
      });
      seeded++;
    }

    return NextResponse.json({ ok: true, seeded });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
