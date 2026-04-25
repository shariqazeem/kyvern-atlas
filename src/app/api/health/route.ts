import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const startTime = Date.now();

/**
 * GET /api/health
 *
 * Public health check for all Kyvern processes.
 * Returns status of each component so during demo you know
 * instantly if anything is off.
 */
export async function GET() {
  try {
    const db = getDb();
    const now = Date.now();

    // Check Atlas heartbeat (last decision within 6 minutes)
    let atlasOk = false;
    let atlasAge = Infinity;
    try {
      const lastDecision = db
        .prepare(`SELECT decided_at FROM atlas_decisions ORDER BY decided_at DESC LIMIT 1`)
        .get() as { decided_at: string } | undefined;
      if (lastDecision) {
        atlasAge = now - new Date(lastDecision.decided_at).getTime();
        atlasOk = atlasAge < 6 * 60 * 1000;
      }
    } catch { /* table might not exist */ }

    // Check attacker heartbeat (last attack within 15 minutes)
    let attackerOk = false;
    let attackerAge = Infinity;
    try {
      const lastAttack = db
        .prepare(`SELECT attempted_at FROM atlas_attacks ORDER BY attempted_at DESC LIMIT 1`)
        .get() as { attempted_at: string } | undefined;
      if (lastAttack) {
        attackerAge = now - new Date(lastAttack.attempted_at).getTime();
        attackerOk = attackerAge < 15 * 60 * 1000;
      }
    } catch { /* table might not exist */ }

    // Atlas state
    let atlasState: { total_cycles: number; total_spent_usd: number; total_earned_usd: number; total_attacks_blocked: number; funds_lost_usd: number } | undefined;
    try {
      atlasState = db.prepare(`SELECT * FROM atlas_state LIMIT 1`).get() as typeof atlasState;
    } catch { /* table might not exist */ }

    // Total devices
    const totalDevices = (db.prepare(`SELECT COUNT(*) AS n FROM vaults`).get() as { n: number }).n;

    const allOk = atlasOk && attackerOk;

    return NextResponse.json({
      status: allOk ? "healthy" : "degraded",
      version: "0.3.0",
      timestamp: new Date().toISOString(),
      uptime_ms: now - startTime,
      processes: {
        web: { status: "ok" },
        atlas: {
          status: atlasOk ? "ok" : "stale",
          lastDecisionAgeSec: Math.round(atlasAge / 1000),
          totalCycles: atlasState?.total_cycles ?? 0,
        },
        attacker: {
          status: attackerOk ? "ok" : "stale",
          lastAttackAgeSec: Math.round(attackerAge / 1000),
          totalBlocked: atlasState?.total_attacks_blocked ?? 0,
        },
      },
      economy: {
        totalDevices,
        atlasSpent: atlasState?.total_spent_usd ?? 0,
        atlasEarned: atlasState?.total_earned_usd ?? 0,
        fundsLost: atlasState?.funds_lost_usd ?? 0,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", error: String(e), uptime_ms: Date.now() - startTime },
      { status: 500 },
    );
  }
}
