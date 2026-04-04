import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface EndpointRow {
  path: string;
  label: string | null;
  calls: number;
  revenue: number;
  avg_latency: number;
  error_rate: number;
  last_called: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = getDb();
    const pathFilter = request.nextUrl.searchParams.get("path");

    let query = `
      SELECT
        e.endpoint as path,
        ep.label,
        COUNT(*) as calls,
        ROUND(SUM(e.amount_usd), 2) as revenue,
        ROUND(AVG(e.latency_ms), 0) as avg_latency,
        ROUND(SUM(CASE WHEN e.status = 'error' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 1) as error_rate,
        MAX(e.timestamp) as last_called
      FROM events e
      LEFT JOIN endpoints ep ON ep.api_key_id = e.api_key_id AND ep.path = e.endpoint
      WHERE e.api_key_id = ?`;
    const params: (string | number)[] = [auth.apiKeyId];

    if (pathFilter) {
      query += " AND e.endpoint = ?";
      params.push(pathFilter);
    }

    query += `
      GROUP BY e.endpoint
      ORDER BY revenue DESC`;

    const rows = db.prepare(query).all(...params) as EndpointRow[];

    return NextResponse.json({ endpoints: rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
