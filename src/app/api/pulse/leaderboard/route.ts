import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Cache for 5 minutes
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const db = getDb();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Top 10 endpoints by volume (7 days, anonymized - no api_key_id exposed)
  const topByVolume = db.prepare(`
    SELECT endpoint, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
           ROUND(AVG(amount_usd), 6) as avg_price,
           COUNT(DISTINCT payer_address) as unique_payers
    FROM events WHERE timestamp >= ?
    GROUP BY endpoint ORDER BY calls DESC LIMIT 10
  `).all(sevenDaysAgo);

  // Top 10 by revenue
  const topByRevenue = db.prepare(`
    SELECT endpoint, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
           ROUND(AVG(amount_usd), 6) as avg_price,
           COUNT(DISTINCT payer_address) as unique_payers
    FROM events WHERE timestamp >= ?
    GROUP BY endpoint ORDER BY revenue DESC LIMIT 10
  `).all(sevenDaysAgo);

  // Market stats (30 days)
  const stats = db.prepare(`
    SELECT COUNT(*) as total_transactions,
           ROUND(SUM(amount_usd), 2) as total_volume,
           COUNT(DISTINCT endpoint) as active_endpoints,
           COUNT(DISTINCT payer_address) as unique_agents,
           COUNT(DISTINCT api_key_id) as providers
    FROM events WHERE timestamp >= ?
  `).get(thirtyDaysAgo);

  // Daily volume (last 14 days for sparkline)
  const dailyVolume = db.prepare(`
    SELECT date(timestamp) as date, COUNT(*) as transactions, ROUND(SUM(amount_usd), 4) as volume
    FROM events WHERE timestamp >= ?
    GROUP BY date(timestamp) ORDER BY date ASC
  `).all(new Date(Date.now() - 14 * 86400000).toISOString());

  // Fastest growing (last 7 days vs previous 7 days)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const recentCalls = db.prepare(`
    SELECT endpoint, COUNT(*) as calls FROM events WHERE timestamp >= ? GROUP BY endpoint
  `).all(sevenDaysAgo) as Array<{ endpoint: string; calls: number }>;
  const prevCalls = db.prepare(`
    SELECT endpoint, COUNT(*) as calls FROM events WHERE timestamp >= ? AND timestamp < ? GROUP BY endpoint
  `).all(fourteenDaysAgo, sevenDaysAgo) as Array<{ endpoint: string; calls: number }>;

  const prevMap = new Map(prevCalls.map((p) => [p.endpoint, p.calls]));
  const trending = recentCalls
    .map((r) => {
      const prev = prevMap.get(r.endpoint) || 0;
      const growth = prev > 0 ? Math.round(((r.calls - prev) / prev) * 100) : (r.calls > 3 ? 100 : 0);
      return { endpoint: r.endpoint, calls: r.calls, growth_pct: growth };
    })
    .filter((g) => g.growth_pct > 0)
    .sort((a, b) => b.growth_pct - a.growth_pct)
    .slice(0, 5);

  const data = {
    market_stats: stats,
    top_by_volume: topByVolume,
    top_by_revenue: topByRevenue,
    daily_volume: dailyVolume,
    trending,
    updated_at: new Date().toISOString(),
  };

  cache = { data, timestamp: now };
  return NextResponse.json(data);
}
