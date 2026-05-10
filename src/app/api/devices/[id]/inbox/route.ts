import { NextRequest, NextResponse } from "next/server";
import { listInbox, countSignals, dailyDigest } from "@/lib/agents/store";
import { getDb } from "@/lib/db";
import type { SignalStatus } from "@/lib/agents/types";

/**
 * GET /api/devices/[id]/inbox?status=unread|read|all&limit=50&since=0&includeSnoozed=0
 *
 * Returns signals for a device, joined with the worker's name + emoji
 * for inline rendering on the Inbox page. Also returns the unreadCount,
 * a daily digest summary line for the inbox banner, and the list of
 * workers on this device so the filter dropdown can render names.
 *
 *   ?status          — unread | read | archived | all (default: all)
 *   ?limit           — 1..200 (default 50)
 *   ?since           — only return signals created at >= this ms timestamp
 *   ?includeSnoozed  — set to 1 to include snoozed signals (default off)
 */

interface AgentLookupRow {
  id: string;
  name: string;
  emoji: string;
}

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const url = req.nextUrl;
  const statusParam = url.searchParams.get("status") ?? "all";
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200));
  const since = parseInt(url.searchParams.get("since") ?? "0", 10) || 0;
  const includeSnoozed = url.searchParams.get("includeSnoozed") === "1";
  const status: SignalStatus | undefined =
    statusParam === "unread" || statusParam === "read" || statusParam === "archived"
      ? (statusParam as SignalStatus)
      : undefined;

  try {
    const signals = listInbox(params.id, {
      status,
      limit,
      since,
      excludeSnoozed: !includeSnoozed,
      // Graph-platform agents emit signals with kinds outside the
      // legacy USER_FACING_KINDS set (daily_brief, vault_digest,
      // wallet_watch, custom user-defined). Drop the kind filter so
      // they show up — the renderer falls back to default icon/color
      // for any unknown kind.
      userFacingOnly: false,
    });

    // Join agent names + emojis in one query. We pull both alive AND
    // retired agents because signals from retired agents (the legacy
    // worker trio that ran before v1.1) still live in the inbox; we
    // want to label them properly rather than show "Unknown ✨".
    const allAgents = getDb()
      .prepare(
        `SELECT id, name, emoji, status FROM agents WHERE device_id = ? ORDER BY created_at ASC`,
      )
      .all(params.id) as Array<AgentLookupRow & { status: string }>;

    const agents: Record<string, { name: string; emoji: string }> = {};
    const deviceWorkers: AgentLookupRow[] = [];
    for (const a of allAgents) {
      const isRetired = a.status === "retired";
      agents[a.id] = {
        // Retired agents keep their original name + emoji; the UI can
        // additionally render a "retired" pill if it wants. The name
        // alone is more honest than "Unknown ✨".
        name: a.name,
        emoji: a.emoji,
      };
      if (!isRetired) {
        deviceWorkers.push({ id: a.id, name: a.name, emoji: a.emoji });
      }
    }

    const enriched = signals.map((s) => ({
      ...s,
      // For genuinely orphaned signals (agent row deleted entirely,
      // not just retired), label as "Legacy worker" instead of
      // "Unknown" — every signal in the DB came from SOME agent that
      // existed at the time of write.
      worker: agents[s.agentId] ?? { name: "Legacy worker", emoji: "📜" },
    }));

    const unreadCount = countSignals(params.id, "unread");
    const totalCount = countSignals(params.id);
    const digest = dailyDigest(params.id);

    return NextResponse.json({
      signals: enriched,
      unreadCount,
      totalCount,
      digest,
      workers: deviceWorkers.map((w) => ({
        id: w.id,
        name: w.name,
        emoji: w.emoji,
      })),
    });
  } catch (e) {
    console.error("[inbox GET]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
