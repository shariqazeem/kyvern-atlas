import { NextResponse } from "next/server";
import { readLeaderboard } from "@/lib/atlas/db";

/**
 * ════════════════════════════════════════════════════════════════════
 * GET /api/atlas/leaderboard
 *
 * Aggregated attack statistics for the public leaderboard on /atlas
 * and the "N attacks survived this week" ticker on the landing page.
 * Rolling 7-day window + all-time, broken down by attack type and
 * by source (scheduled vs visitor probe).
 *
 * Polled from the client every ~5s. Pure SQL aggregate on an indexed
 * column — sub-millisecond even at tens of thousands of rows. If
 * atlas.db isn't reachable we return neutral zeros so the UI keeps
 * rendering.
 * ════════════════════════════════════════════════════════════════════
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = readLeaderboard();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "atlas_offline",
        message:
          e instanceof Error ? e.message : "atlas db not yet initialized",
        weekly: { total: 0, byType: {}, bySource: {} },
        allTime: { total: 0, byType: {}, bySource: {} },
        recent: [],
        fundsLostUsd: 0,
        fundsProtectedUsd: 0,
      },
      { status: 200 },
    );
  }
}
