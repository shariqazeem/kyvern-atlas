import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { getTierForApiKey } from "@/lib/tier";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (getTierForApiKey(auth.apiKeyId) !== "pro") {
      return NextResponse.json(
        { error: "pro_required", message: "Cohort analysis requires Pulse Pro." },
        { status: 403 }
      );
    }

    const periods = parseInt(request.nextUrl.searchParams.get("periods") || "8", 10);
    const db = getDb();

    // Get each agent's first-seen week and all weeks they were active
    const agentWeeks = db.prepare(`
      SELECT
        payer_address,
        strftime('%Y-%W', timestamp) as activity_week,
        strftime('%Y-%W', (SELECT MIN(timestamp) FROM events e2 WHERE e2.payer_address = e1.payer_address AND e2.api_key_id = e1.api_key_id)) as first_week
      FROM events e1
      WHERE api_key_id = ?
      GROUP BY payer_address, activity_week
      ORDER BY first_week, activity_week
    `).all(auth.apiKeyId) as Array<{
      payer_address: string;
      activity_week: string;
      first_week: string;
    }>;

    // Build cohorts: group agents by their first_week
    const cohortMap = new Map<string, Set<string>>();
    const agentActivity = new Map<string, Set<string>>();

    for (const row of agentWeeks) {
      // Track which cohort each agent belongs to
      if (!cohortMap.has(row.first_week)) {
        cohortMap.set(row.first_week, new Set());
      }
      cohortMap.get(row.first_week)!.add(row.payer_address);

      // Track all activity weeks per agent
      if (!agentActivity.has(row.payer_address)) {
        agentActivity.set(row.payer_address, new Set());
      }
      agentActivity.get(row.payer_address)!.add(row.activity_week);
    }

    // Get sorted list of all weeks
    const allWeeks = [...new Set(agentWeeks.map((r) => r.activity_week))].sort();

    // Build retention data for each cohort
    const cohorts = [...cohortMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cohortWeek, agents]) => {
        const cohortStartIdx = allWeeks.indexOf(cohortWeek);
        const cohortSize = agents.size;

        // Calculate retention for each subsequent period
        const retention: number[] = [];
        for (let p = 0; p <= Math.min(periods, allWeeks.length - cohortStartIdx - 1); p++) {
          const targetWeek = allWeeks[cohortStartIdx + p];
          if (!targetWeek) break;

          let retained = 0;
          for (const agent of agents) {
            if (agentActivity.get(agent)?.has(targetWeek)) {
              retained++;
            }
          }
          retention.push(Math.round((retained / cohortSize) * 100));
        }

        // Generate human-readable label from YYYY-WW format
        const [year, week] = cohortWeek.split("-");
        const label = `W${parseInt(week)} ${year}`;

        return {
          cohort_label: label,
          cohort_week: cohortWeek,
          cohort_size: cohortSize,
          retention,
        };
      });

    // Summary stats
    const validCohorts = cohorts.filter((c) => c.retention.length > 1);
    const avgWeek1 = validCohorts.length > 0
      ? Math.round(validCohorts.reduce((s, c) => s + (c.retention[1] || 0), 0) / validCohorts.length)
      : 0;

    const cohortsWithWeek4 = validCohorts.filter((c) => c.retention.length > 4);
    const avgWeek4 = cohortsWithWeek4.length > 0
      ? Math.round(cohortsWithWeek4.reduce((s, c) => s + (c.retention[4] || 0), 0) / cohortsWithWeek4.length)
      : 0;

    const bestCohort = validCohorts.length > 0
      ? validCohorts.reduce((best, c) => (c.retention[1] || 0) > (best.retention[1] || 0) ? c : best).cohort_label
      : null;

    const totalAgents = new Set(agentWeeks.map((r) => r.payer_address)).size;

    return NextResponse.json({
      cohorts,
      summary: {
        avg_week1_retention: avgWeek1,
        avg_week4_retention: avgWeek4,
        best_cohort: bestCohort,
        total_agents: totalAgents,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
