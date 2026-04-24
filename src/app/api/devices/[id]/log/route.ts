import { NextRequest, NextResponse } from "next/server";
import { readDeviceLog, getDevicePnL, getDeviceAttackCount } from "@/lib/vault-store";

/**
 * GET /api/devices/[id]/log
 * Returns the device's unified event log + PnL summary.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const limit = parseInt(
      req.nextUrl.searchParams.get("limit") ?? "50",
      10,
    );
    const log = readDeviceLog(params.id, Math.min(limit, 200));
    const pnl = getDevicePnL(params.id);
    const attacksBlocked = getDeviceAttackCount(params.id);

    return NextResponse.json({
      log,
      pnl,
      attacksBlocked,
    });
  } catch (e) {
    console.error("[devices/log]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
