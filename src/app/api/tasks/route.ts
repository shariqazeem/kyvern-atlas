import { NextRequest, NextResponse } from "next/server";
import {
  listOpenTasks,
  getAgent,
  postTask,
  listAgentsByDevice,
} from "@/lib/agents/store";
import { getDb } from "@/lib/db";

/**
 * GET /api/tasks
 *   ?status=open|completed     (default: open)
 *   ?deviceId=vlt_…            (optional — filter to one device's agents)
 *   ?limit=20                  (default 20, max 100)
 *
 * Returns tasks joined with poster + claimer + payload (ask + context)
 * so cards can render real descriptions instead of just task_type.
 *
 * POST /api/tasks
 * Body: {
 *   deviceId:    string,    // device whose worker will post the task
 *   postingAgentId?: string, // override poster — must belong to deviceId
 *   taskType:    "research" | "validation" | string,
 *   ask:         string,    // human-readable question
 *   context?:    string,
 *   bountyUsd:   number,    // 0.05 .. 1.00
 *   ttlSeconds?: number,    // default 6h
 * }
 *
 * Returns the created task with full poster info. Used by the manual
 * "Post a task" button on /app/tasks so the owner can drive the board
 * directly when their workers haven't surfaced anything to validate.
 */

interface TaskRowMin {
  id: string;
  posting_agent_id: string;
  claiming_agent_id: string | null;
  task_type: string;
  bounty_usd: number;
  payment_signature: string | null;
  result_json: string | null;
  payload_json: string | null;
  completed_at: number | null;
  created_at: number;
  expires_at: number;
}

function parsePayload(s: string | null): {
  ask: string | null;
  context: string | null;
  sourceUrl: string | null;
} {
  if (!s) return { ask: null, context: null, sourceUrl: null };
  try {
    const v = JSON.parse(s) as Record<string, unknown>;
    const ask = typeof v.ask === "string" ? v.ask : null;
    const ctx = typeof v.context === "string" ? v.context : null;
    const url = typeof v.sourceUrl === "string" ? v.sourceUrl : null;
    return { ask, context: ctx, sourceUrl: url };
  } catch {
    return { ask: null, context: null, sourceUrl: null };
  }
}

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") ?? "open";
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10),
      100,
    );

    if (status === "open") {
      const all = listOpenTasks(Math.min(limit * 4, 200));
      const tasks = all.map((t) => {
        const poster = getAgent(t.postingAgentId);
        return {
          id: t.id,
          taskType: t.taskType,
          bountyUsd: t.bountyUsd,
          createdAt: t.createdAt,
          expiresAt: t.expiresAt,
          ask:
            typeof (t.payload as Record<string, unknown>).ask === "string"
              ? ((t.payload as Record<string, unknown>).ask as string)
              : null,
          context:
            typeof (t.payload as Record<string, unknown>).context === "string"
              ? ((t.payload as Record<string, unknown>).context as string)
              : null,
          postingAgent: poster
            ? {
                id: poster.id,
                deviceId: poster.deviceId,
                name: poster.name,
                emoji: poster.emoji,
              }
            : null,
        };
      });
      const filtered = deviceId
        ? tasks.filter((t) => t.postingAgent?.deviceId === deviceId)
        : tasks;
      return NextResponse.json({ tasks: filtered.slice(0, limit) });
    }

    if (status === "in_progress" || status === "claimed") {
      // Phase 6 — surface tasks that have been claimed but not yet
      // completed. Includes the legacy "claimed" status that was used
      // before the Phase 1 split renamed it to "in_progress".
      const rows = getDb()
        .prepare(
          `SELECT * FROM agent_tasks
            WHERE status IN ('in_progress','claimed')
              AND expires_at > ?
            ORDER BY created_at DESC
            LIMIT ?`,
        )
        .all(Date.now(), Math.min(limit * 4, 200)) as TaskRowMin[];

      const tasks = rows.map((r) => {
        const poster = getAgent(r.posting_agent_id);
        const claimer = r.claiming_agent_id
          ? getAgent(r.claiming_agent_id)
          : null;
        const { ask, context } = parsePayload(r.payload_json);
        return {
          id: r.id,
          taskType: r.task_type,
          bountyUsd: r.bounty_usd,
          escrowSignature:
            (r as TaskRowMin & { escrow_signature?: string | null })
              .escrow_signature ?? null,
          createdAt: r.created_at,
          expiresAt: r.expires_at,
          ask,
          context,
          postingAgent: poster
            ? {
                id: poster.id,
                deviceId: poster.deviceId,
                name: poster.name,
                emoji: poster.emoji,
              }
            : null,
          claimingAgent: claimer
            ? {
                id: claimer.id,
                deviceId: claimer.deviceId,
                name: claimer.name,
                emoji: claimer.emoji,
              }
            : null,
        };
      });
      const filtered = deviceId
        ? tasks.filter(
            (t) =>
              t.postingAgent?.deviceId === deviceId ||
              t.claimingAgent?.deviceId === deviceId,
          )
        : tasks;
      return NextResponse.json({ tasks: filtered.slice(0, limit) });
    }

    if (status === "completed") {
      const rows = getDb()
        .prepare(
          `SELECT * FROM agent_tasks WHERE status = 'completed' ORDER BY completed_at DESC LIMIT ?`,
        )
        .all(Math.min(limit * 4, 200)) as TaskRowMin[];

      const tasks = rows.map((r) => {
        const poster = getAgent(r.posting_agent_id);
        const claimer = r.claiming_agent_id ? getAgent(r.claiming_agent_id) : null;
        const { ask, context } = parsePayload(r.payload_json);
        return {
          id: r.id,
          taskType: r.task_type,
          bountyUsd: r.bounty_usd,
          paymentSignature: r.payment_signature,
          escrowSignature:
            (r as TaskRowMin & { escrow_signature?: string | null })
              .escrow_signature ?? null,
          completedAt: r.completed_at,
          createdAt: r.created_at,
          ask,
          context,
          postingAgent: poster
            ? {
                id: poster.id,
                deviceId: poster.deviceId,
                name: poster.name,
                emoji: poster.emoji,
              }
            : null,
          claimingAgent: claimer
            ? {
                id: claimer.id,
                deviceId: claimer.deviceId,
                name: claimer.name,
                emoji: claimer.emoji,
              }
            : null,
          result: r.result_json ? JSON.parse(r.result_json) : null,
        };
      });
      const filtered = deviceId
        ? tasks.filter(
            (t) =>
              t.postingAgent?.deviceId === deviceId ||
              t.claimingAgent?.deviceId === deviceId,
          )
        : tasks;
      return NextResponse.json({ tasks: filtered.slice(0, limit) });
    }

    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  } catch (e) {
    console.error("[tasks]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      deviceId?: string;
      postingAgentId?: string;
      taskType?: string;
      ask?: string;
      context?: string;
      bountyUsd?: number;
      ttlSeconds?: number;
    };
    if (!body.deviceId) {
      return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    }
    if (!body.ask || body.ask.trim().length < 4) {
      return NextResponse.json(
        { error: "ask must be at least 4 chars" },
        { status: 400 },
      );
    }
    const taskType =
      body.taskType === "validation" ? "validation" : "research";
    const bountyUsd = Math.max(
      0.05,
      Math.min(Number(body.bountyUsd ?? 0.1), 1.0),
    );
    const ttlSeconds = Math.max(
      30 * 60,
      Math.min(Number(body.ttlSeconds ?? 6 * 60 * 60), 24 * 60 * 60),
    );

    const agents = listAgentsByDevice(body.deviceId);
    if (agents.length === 0) {
      return NextResponse.json(
        { error: "device has no workers — hire one first" },
        { status: 400 },
      );
    }

    let posterId = body.postingAgentId;
    if (posterId) {
      const a = agents.find((x) => x.id === posterId);
      if (!a) {
        return NextResponse.json(
          { error: "postingAgentId not on device" },
          { status: 400 },
        );
      }
      if (a.status !== "alive") {
        posterId = undefined;
      }
    }
    if (!posterId) {
      const alive = agents.find((a) => a.status === "alive");
      if (!alive) {
        return NextResponse.json(
          { error: "no alive worker on device" },
          { status: 400 },
        );
      }
      posterId = alive.id;
    }

    const task = postTask({
      postingAgentId: posterId,
      taskType,
      payload: {
        ask: body.ask.trim().slice(0, 600),
        context: body.context ? body.context.trim().slice(0, 1200) : "",
      },
      bountyUsd,
      ttlSeconds,
    });
    return NextResponse.json({ ok: true, task });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
