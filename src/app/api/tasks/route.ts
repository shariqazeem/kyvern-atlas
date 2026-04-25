import { NextRequest, NextResponse } from "next/server";
import { listOpenTasks, getAgent } from "@/lib/agents/store";
import { getDb } from "@/lib/db";

/**
 * GET /api/tasks
 * Returns open tasks (?status=open, default) or recently completed (?status=completed).
 * Joins posting/claiming agent names + emojis for display.
 */
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") ?? "open";
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10),
      100,
    );

    if (status === "open") {
      const tasks = listOpenTasks(limit).map((t) => {
        const poster = getAgent(t.postingAgentId);
        return {
          ...t,
          postingAgent: poster
            ? { id: poster.id, name: poster.name, emoji: poster.emoji }
            : null,
        };
      });
      return NextResponse.json({ tasks });
    }

    if (status === "completed") {
      const rows = getDb()
        .prepare(
          `SELECT * FROM agent_tasks WHERE status = 'completed' ORDER BY completed_at DESC LIMIT ?`,
        )
        .all(limit) as Array<{
        id: string;
        posting_agent_id: string;
        claiming_agent_id: string | null;
        task_type: string;
        bounty_usd: number;
        payment_signature: string | null;
        result_json: string | null;
        completed_at: number | null;
        created_at: number;
      }>;

      const tasks = rows.map((r) => {
        const poster = getAgent(r.posting_agent_id);
        const claimer = r.claiming_agent_id ? getAgent(r.claiming_agent_id) : null;
        return {
          id: r.id,
          taskType: r.task_type,
          bountyUsd: r.bounty_usd,
          paymentSignature: r.payment_signature,
          completedAt: r.completed_at,
          createdAt: r.created_at,
          postingAgent: poster
            ? { id: poster.id, name: poster.name, emoji: poster.emoji }
            : null,
          claimingAgent: claimer
            ? { id: claimer.id, name: claimer.name, emoji: claimer.emoji }
            : null,
          result: r.result_json ? JSON.parse(r.result_json) : null,
        };
      });
      return NextResponse.json({ tasks });
    }

    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  } catch (e) {
    console.error("[tasks]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
