import { NextRequest, NextResponse } from "next/server";
import { listInbox } from "@/lib/agents/store";

/**
 * GET /api/atlas/findings?limit=30
 *
 * Returns Atlas's most recent findings from the last 7 days. Used by
 * the /atlas observatory's Findings section above the Attack Wall.
 *
 * Atlas writes signals via the same writeSignal() that user workers
 * do (Path C runner.ts findings layer). We filter to agent_id=agt_atlas
 * so this endpoint stays a clean read of Atlas's output.
 */

export const dynamic = "force-dynamic";

const ATLAS_AGENT_ID = "agt_atlas";
const ATLAS_DEVICE_ID = "vlt_QcCPbp3XTzHtF5";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "30", 10) || 30),
  );

  try {
    const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS;
    const all = listInbox(ATLAS_DEVICE_ID, { limit: 100, since: sevenDaysAgo });
    const findings = all.filter((s) => s.agentId === ATLAS_AGENT_ID).slice(0, limit);
    return NextResponse.json({
      findings,
      thisWeek: findings.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "atlas_findings_offline", message: e instanceof Error ? e.message : String(e), findings: [] },
      { status: 200 },
    );
  }
}
