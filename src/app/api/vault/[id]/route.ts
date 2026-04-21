import { NextRequest, NextResponse } from "next/server";
import {
  getVault,
  getSpendSnapshot,
  listPayments,
} from "@/lib/vault-store";

/* ════════════════════════════════════════════════════════════════════
   GET /api/vault/:id

   Returns the vault state + a live spend snapshot + recent activity.
   This is what the owner dashboard loads on every refresh.

   Query params:
     limit=<n>   number of recent payments to return (default 20, max 200)
   ════════════════════════════════════════════════════════════════════ */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const vault = getVault(id);
  if (!vault) {
    return NextResponse.json(
      { error: "vault_not_found", message: `no vault ${id}` },
      { status: 404 },
    );
  }

  const limitRaw = req.nextUrl.searchParams.get("limit");
  let limit = 20;
  if (limitRaw) {
    const n = Number(limitRaw);
    if (Number.isFinite(n) && n > 0) limit = Math.min(200, Math.floor(n));
  }

  const snapshot = getSpendSnapshot(vault.id, vault.velocityWindow);
  const payments = listPayments(vault.id, limit);

  const dailyRemaining = Math.max(
    0,
    vault.dailyLimitUsd - snapshot.spentToday,
  );
  const weeklyRemaining = Math.max(
    0,
    vault.weeklyLimitUsd - snapshot.spentThisWeek,
  );

  return NextResponse.json(
    {
      vault,
      snapshot,
      budget: {
        dailyLimitUsd: vault.dailyLimitUsd,
        weeklyLimitUsd: vault.weeklyLimitUsd,
        perTxMaxUsd: vault.perTxMaxUsd,
        spentToday: snapshot.spentToday,
        spentThisWeek: snapshot.spentThisWeek,
        dailyRemaining,
        weeklyRemaining,
        dailyUtilization:
          vault.dailyLimitUsd > 0
            ? Math.min(1, snapshot.spentToday / vault.dailyLimitUsd)
            : 0,
        weeklyUtilization:
          vault.weeklyLimitUsd > 0
            ? Math.min(1, snapshot.spentThisWeek / vault.weeklyLimitUsd)
            : 0,
      },
      velocity: {
        callsInWindow: snapshot.callsInWindow,
        maxCallsPerWindow: vault.maxCallsPerWindow,
        velocityWindow: vault.velocityWindow,
        windowStart: snapshot.windowStart,
      },
      payments,
    },
    { status: 200 },
  );
}
