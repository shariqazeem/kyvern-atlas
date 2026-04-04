import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";
import { getTierForApiKey } from "@/lib/tier";

export const dynamic = "force-dynamic";

// Simple cache — intelligence data is expensive and doesn't change fast
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function categorize(endpoint: string): string {
  const lower = endpoint.toLowerCase();
  if (lower.includes("oracle") || lower.includes("price")) return "Price / Oracle";
  if (lower.includes("reputation") || lower.includes("trust") || lower.includes("score")) return "Reputation";
  if (lower.includes("search") || lower.includes("query")) return "Search";
  if (lower.includes("ai") || lower.includes("summarize") || lower.includes("sentiment") || lower.includes("translate")) return "AI / NLP";
  if (lower.includes("weather") || lower.includes("data") || lower.includes("analytics")) return "Data";
  if (lower.includes("swap") || lower.includes("defi") || lower.includes("trade")) return "DeFi";
  return "Other";
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateSession(request);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

    if (getTierForApiKey(auth.apiKeyId) !== "pro") {
      return NextResponse.json({ error: "pro_required", message: "Competitive Intelligence requires Pulse Pro." }, { status: 403 });
    }

    const db = getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    // Check minimum user threshold for privacy
    const providerCount = db.prepare(
      "SELECT COUNT(DISTINCT api_key_id) as count FROM events WHERE timestamp >= ?"
    ).get(thirtyDaysAgo) as { count: number };

    // Use cached market data if available
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      // Merge cached market data with fresh user-specific data
      const userEndpoints = db.prepare(
        "SELECT DISTINCT endpoint FROM events WHERE api_key_id = ?"
      ).all(auth.apiKeyId) as Array<{ endpoint: string }>;
      return NextResponse.json({ ...(cache.data as object), user_endpoints: userEndpoints.map((e) => e.endpoint) });
    }

    // Top endpoints by volume
    const topByVolume = db.prepare(`
      SELECT endpoint, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
             ROUND(AVG(amount_usd), 6) as avg_price, COUNT(DISTINCT api_key_id) as providers
      FROM events WHERE timestamp >= ?
      GROUP BY endpoint ORDER BY calls DESC LIMIT 20
    `).all(thirtyDaysAgo) as Array<{ endpoint: string; calls: number; revenue: number; avg_price: number; providers: number }>;

    // Top endpoints by revenue
    const topByRevenue = db.prepare(`
      SELECT endpoint, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
             ROUND(AVG(amount_usd), 6) as avg_price, COUNT(DISTINCT api_key_id) as providers
      FROM events WHERE timestamp >= ?
      GROUP BY endpoint ORDER BY revenue DESC LIMIT 20
    `).all(thirtyDaysAgo) as Array<{ endpoint: string; calls: number; revenue: number; avg_price: number; providers: number }>;

    // Market growth — daily transaction count
    const dailyGrowth = db.prepare(`
      SELECT date(timestamp) as date, COUNT(*) as transactions, ROUND(SUM(amount_usd), 4) as revenue
      FROM events WHERE timestamp >= ?
      GROUP BY date(timestamp) ORDER BY date ASC
    `).all(thirtyDaysAgo) as Array<{ date: string; transactions: number; revenue: number }>;

    // Category breakdown
    const allEndpoints = db.prepare(`
      SELECT endpoint, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
             ROUND(AVG(amount_usd), 6) as avg_price
      FROM events WHERE timestamp >= ?
      GROUP BY endpoint
    `).all(thirtyDaysAgo) as Array<{ endpoint: string; calls: number; revenue: number; avg_price: number }>;

    const categoryMap = new Map<string, { calls: number; revenue: number; prices: number[]; endpoints: number }>();
    for (const ep of allEndpoints) {
      const cat = categorize(ep.endpoint);
      const existing = categoryMap.get(cat) || { calls: 0, revenue: 0, prices: [], endpoints: 0 };
      existing.calls += ep.calls;
      existing.revenue += ep.revenue;
      existing.prices.push(ep.avg_price);
      existing.endpoints += 1;
      categoryMap.set(cat, existing);
    }

    const categories = [...categoryMap.entries()].map(([name, data]) => ({
      category: name,
      calls: data.calls,
      revenue: Math.round(data.revenue * 10000) / 10000,
      avg_price: Math.round((data.prices.reduce((a, b) => a + b, 0) / data.prices.length) * 10000) / 10000,
      endpoint_count: data.endpoints,
    })).sort((a, b) => b.revenue - a.revenue);

    // Fastest growing — compare last 7 days vs previous 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

    const recentCalls = db.prepare(`
      SELECT endpoint, COUNT(*) as calls FROM events WHERE timestamp >= ? GROUP BY endpoint
    `).all(sevenDaysAgo) as Array<{ endpoint: string; calls: number }>;

    const prevCalls = db.prepare(`
      SELECT endpoint, COUNT(*) as calls FROM events WHERE timestamp >= ? AND timestamp < ? GROUP BY endpoint
    `).all(fourteenDaysAgo, sevenDaysAgo) as Array<{ endpoint: string; calls: number }>;

    const prevMap = new Map(prevCalls.map((p) => [p.endpoint, p.calls]));
    const growing = recentCalls
      .map((r) => {
        const prev = prevMap.get(r.endpoint) || 0;
        const growthPct = prev > 0 ? Math.round(((r.calls - prev) / prev) * 100) : (r.calls > 5 ? 100 : 0);
        return { endpoint: r.endpoint, current_calls: r.calls, previous_calls: prev, growth_pct: growthPct };
      })
      .filter((g) => g.growth_pct > 0)
      .sort((a, b) => b.growth_pct - a.growth_pct)
      .slice(0, 10);

    // Market overview stats
    const marketStats = db.prepare(`
      SELECT COUNT(*) as total_txns, ROUND(SUM(amount_usd), 2) as total_volume,
             COUNT(DISTINCT endpoint) as active_endpoints, ROUND(AVG(amount_usd), 6) as avg_price
      FROM events WHERE timestamp >= ?
    `).get(thirtyDaysAgo) as { total_txns: number; total_volume: number; active_endpoints: number; avg_price: number };

    // User's endpoints for highlighting
    const userEndpoints = db.prepare(
      "SELECT DISTINCT endpoint FROM events WHERE api_key_id = ?"
    ).all(auth.apiKeyId) as Array<{ endpoint: string }>;

    const marketData = {
      market_overview: {
        total_volume: marketStats.total_volume || 0,
        total_transactions: marketStats.total_txns,
        active_endpoints: marketStats.active_endpoints,
        avg_price: marketStats.avg_price || 0,
        provider_count: providerCount.count,
        has_enough_data: true, // In production, check providerCount >= 5
      },
      top_by_volume: topByVolume.map((e) => ({ ...e, category: categorize(e.endpoint) })),
      top_by_revenue: topByRevenue.map((e) => ({ ...e, category: categorize(e.endpoint) })),
      daily_growth: dailyGrowth,
      categories,
      fastest_growing: growing,
      user_endpoints: userEndpoints.map((e) => e.endpoint),
    };

    cache = { data: marketData, timestamp: now };

    return NextResponse.json(marketData);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
