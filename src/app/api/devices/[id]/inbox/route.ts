import { NextRequest, NextResponse } from "next/server";
import { listInbox, countSignals } from "@/lib/agents/store";
import { getDb } from "@/lib/db";
import type { SignalStatus } from "@/lib/agents/types";

/**
 * GET /api/devices/[id]/inbox?status=unread|read|all&limit=50&since=0
 *
 * Returns signals for a device, joined with the worker's name + emoji
 * for inline rendering on the Inbox page. Also returns the unreadCount
 * so the tab bar's badge dot can update without a second request.
 *
 *   ?status     — unread | read | archived | all (default: all)
 *   ?limit      — 1..200 (default 50)
 *   ?since      — only return signals created at >= this ms timestamp
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
  const status: SignalStatus | undefined =
    statusParam === "unread" || statusParam === "read" || statusParam === "archived"
      ? (statusParam as SignalStatus)
      : undefined;

  try {
    const signals = listInbox(params.id, { status, limit, since });

    // Join agent names + emojis in one query
    const agents: Record<string, { name: string; emoji: string }> = {};
    if (signals.length > 0) {
      const ids = Array.from(new Set(signals.map((s) => s.agentId)));
      const placeholders = ids.map(() => "?").join(",");
      const rows = getDb()
        .prepare(`SELECT id, name, emoji FROM agents WHERE id IN (${placeholders})`)
        .all(...ids) as AgentLookupRow[];
      for (const a of rows) agents[a.id] = { name: a.name, emoji: a.emoji };
    }

    const enriched = signals.map((s) => ({
      ...s,
      worker: agents[s.agentId] ?? { name: "Unknown", emoji: "✨" },
    }));

    const unreadCount = countSignals(params.id, "unread");
    const totalCount = countSignals(params.id);

    return NextResponse.json({
      signals: enriched,
      unreadCount,
      totalCount,
    });
  } catch (e) {
    console.error("[inbox GET]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
