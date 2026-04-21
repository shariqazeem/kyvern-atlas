import { NextRequest, NextResponse } from "next/server";
import { readRecentAttacks, readRecentDecisions } from "@/lib/atlas/db";

/**
 * GET /api/atlas/decisions?limit=20&kind=decisions|attacks|both
 *
 * Paginated feed for the observatory's scrolling "live decisions" panel.
 * Default returns the 20 most recent decisions. `kind=attacks` returns
 * the 20 most recent caught attacks; `kind=both` interleaves them by
 * timestamp.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit") ?? 20)),
  );
  const kind = url.searchParams.get("kind") ?? "decisions";

  try {
    if (kind === "attacks") {
      return NextResponse.json({ attacks: readRecentAttacks(limit) });
    }
    if (kind === "both") {
      const decisions = readRecentDecisions(limit).map((d) => ({
        ...d,
        _kind: "decision" as const,
        _when: d.decidedAt,
      }));
      const attacks = readRecentAttacks(limit).map((a) => ({
        ...a,
        _kind: "attack" as const,
        _when: a.attemptedAt,
      }));
      const merged = [...decisions, ...attacks]
        .sort((a, b) => (b._when > a._when ? 1 : -1))
        .slice(0, limit);
      return NextResponse.json({ feed: merged });
    }
    return NextResponse.json({ decisions: readRecentDecisions(limit) });
  } catch (e) {
    return NextResponse.json(
      {
        error: "atlas_offline",
        message: e instanceof Error ? e.message : "atlas db not initialized",
        decisions: [],
      },
      { status: 200 },
    );
  }
}
