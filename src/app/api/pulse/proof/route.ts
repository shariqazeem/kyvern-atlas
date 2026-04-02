import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();

    const verified = db.prepare(
      "SELECT COUNT(*) as count FROM events WHERE source = 'middleware'"
    ).get() as { count: number };

    const endpoints = db.prepare(
      "SELECT COUNT(DISTINCT endpoint) as count FROM events WHERE source = 'middleware'"
    ).get() as { count: number };

    const recentHour = db.prepare(
      "SELECT COUNT(*) as count FROM events WHERE timestamp >= datetime('now', '-1 hour')"
    ).get() as { count: number };

    const totalRevenue = db.prepare(
      "SELECT COALESCE(SUM(amount_usd), 0) as total FROM events WHERE source = 'middleware'"
    ).get() as { total: number };

    return NextResponse.json({
      verified_payments: verified.count,
      connected_endpoints: endpoints.count,
      payments_last_hour: recentHour.count,
      total_revenue: Math.round(totalRevenue.total * 1000) / 1000,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
