import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { getTierForApiKey, getRetentionDays } from "@/lib/tier";

interface TimeseriesRow {
  timestamp: string;
  revenue: number;
  calls: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const apiKeyId = auth.apiKeyId;

    const db = getDb();
    let range = request.nextUrl.searchParams.get("range") || "30d";

    // Tier enforcement — cap to retention limit
    const tier = getTierForApiKey(apiKeyId);
    const maxDays = getRetentionDays(tier);
    let truncated = false;
    const requestedDays = range === "30d" ? 30 : range === "7d" ? 7 : 1;
    if (requestedDays > maxDays) {
      range = `${maxDays}d`;
      truncated = true;
    }

    const now = new Date();
    let start: Date;
    let granularity: "hour" | "day";
    let groupExpr: string;

    switch (range) {
      case "24h":
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        granularity = "hour";
        groupExpr = "strftime('%Y-%m-%dT%H:00:00', timestamp)";
        break;
      case "7d":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        granularity = "hour";
        // 6-hour buckets for 7d
        groupExpr = "strftime('%Y-%m-%dT', timestamp) || printf('%02d', (CAST(strftime('%H', timestamp) AS INTEGER) / 6) * 6) || ':00:00'";
        break;
      case "30d":
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        granularity = "day";
        groupExpr = "strftime('%Y-%m-%dT00:00:00', timestamp)";
        break;
    }

    const rows = db.prepare(`
      SELECT
        ${groupExpr} as timestamp,
        ROUND(SUM(amount_usd), 2) as revenue,
        COUNT(*) as calls
      FROM events
      WHERE api_key_id = ? AND timestamp >= ?
      GROUP BY ${groupExpr}
      ORDER BY timestamp ASC
    `).all(apiKeyId, start.toISOString()) as TimeseriesRow[];

    return NextResponse.json({ data: rows, granularity, truncated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
