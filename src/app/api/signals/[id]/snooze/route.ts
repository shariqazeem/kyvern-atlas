import { NextRequest, NextResponse } from "next/server";
import { snoozeSignal, getSignal } from "@/lib/agents/store";

/**
 * POST /api/signals/[id]/snooze
 *
 * Body: { hours?: number }   — default 4 hours
 *
 * Marks a signal as read AND sets snoozed_until = now + hours*3600s.
 * The inbox API hides snoozed signals until the timestamp passes, which
 * is what the user wanted when they tapped the inline "Snooze 4h"
 * action — the recurring condition shouldn't keep yelling.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await req.json().catch(() => ({}))) as { hours?: number };
    const hours = Math.max(0.1, Math.min(Number(body.hours ?? 4), 168));
    const until = Date.now() + hours * 60 * 60 * 1000;

    const sig = getSignal(params.id);
    if (!sig) {
      return NextResponse.json({ error: "signal not found" }, { status: 404 });
    }
    const ok = snoozeSignal(params.id, until);
    return NextResponse.json({ ok, snoozedUntil: until });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
