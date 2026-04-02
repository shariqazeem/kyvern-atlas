import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const DEMO_API_KEY_ID = "demo_key_001";

function getDateRange(range: string): { start: string; prevStart: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;
  let prevStart: Date;

  switch (range) {
    case "24h":
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      prevStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      break;
    case "7d":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      break;
  }

  return {
    start: start.toISOString(),
    prevStart: prevStart.toISOString(),
    end,
  };
}

interface AggRow {
  revenue: number;
  calls: number;
  customers: number;
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const range = request.nextUrl.searchParams.get("range") || "30d";
    const { start, prevStart, end } = getDateRange(range);

    const query = `
      SELECT
        COALESCE(SUM(amount_usd), 0) as revenue,
        COUNT(*) as calls,
        COUNT(DISTINCT payer_address) as customers
      FROM events
      WHERE api_key_id = ? AND timestamp >= ? AND timestamp <= ?
    `;

    const current = db.prepare(query).get(DEMO_API_KEY_ID, start, end) as AggRow;
    const previous = db.prepare(query).get(DEMO_API_KEY_ID, prevStart, start) as AggRow;

    const avgPrice = current.calls > 0 ? current.revenue / current.calls : 0;
    const prevAvgPrice = previous.calls > 0 ? previous.revenue / previous.calls : 0;

    const sourceBreakdown = db.prepare(`
      SELECT COALESCE(source, 'seed') as source, COUNT(*) as count
      FROM events WHERE api_key_id = ?
      GROUP BY source
    `).all(DEMO_API_KEY_ID) as Array<{ source: string; count: number }>;

    return NextResponse.json({
      revenue: Math.round(current.revenue * 100) / 100,
      calls: current.calls,
      customers: current.customers,
      avg_price: Math.round(avgPrice * 100) / 100,
      deltas: {
        revenue_pct: pctChange(current.revenue, previous.revenue),
        calls_pct: pctChange(current.calls, previous.calls),
        customers_pct: pctChange(current.customers, previous.customers),
        avg_price_pct: pctChange(avgPrice, prevAvgPrice),
      },
      has_real_data: sourceBreakdown.some((s) => s.source === "middleware"),
      source_breakdown: Object.fromEntries(sourceBreakdown.map((s) => [s.source, s.count])),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
