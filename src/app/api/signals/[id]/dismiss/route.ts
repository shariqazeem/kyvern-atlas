import { NextRequest, NextResponse } from "next/server";
import { markSignalStatus, getSignal } from "@/lib/agents/store";

/**
 * POST /api/signals/[id]/dismiss
 *
 * Marks a signal as archived. The inbox UI's "Dismiss" inline action
 * uses this — it's a stronger commitment than mark-as-read because
 * archived signals don't reappear in the All filter.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const sig = getSignal(params.id);
    if (!sig) {
      return NextResponse.json({ error: "signal not found" }, { status: 404 });
    }
    const ok = markSignalStatus(params.id, "archived");
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
