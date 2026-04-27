import { NextRequest, NextResponse } from "next/server";
import { markSignalStatus, getSignal } from "@/lib/agents/store";
import type { SignalStatus } from "@/lib/agents/types";

/**
 * POST /api/signals/[id]/mark-read
 * Body: { status?: "unread" | "read" | "archived" } — defaults to "read"
 *
 * Idempotent. Used by the Inbox UI when the owner taps "Mark read" on
 * a signal card or expands one to its full detail view.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let nextStatus: SignalStatus = "read";
  try {
    const body = (await req.json().catch(() => ({}))) as { status?: string };
    if (body.status === "unread" || body.status === "read" || body.status === "archived") {
      nextStatus = body.status;
    }
  } catch {
    /* default to "read" */
  }

  const updated = markSignalStatus(params.id, nextStatus);
  if (!updated) {
    return NextResponse.json({ error: "signal not found" }, { status: 404 });
  }
  const signal = getSignal(params.id);
  return NextResponse.json({ ok: true, signal });
}
