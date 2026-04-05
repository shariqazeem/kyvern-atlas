import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function categorize(endpoint: string): string {
  const l = endpoint.toLowerCase();
  if (l.includes("translate") || l.includes("summarize") || l.includes("sentiment") || l.includes("ai") || l.includes("nlp")) return "AI / NLP";
  if (l.includes("search") || l.includes("query")) return "Search";
  if (l.includes("oracle") || l.includes("price") || l.includes("market")) return "Price / Oracle";
  if (l.includes("weather") || l.includes("data") || l.includes("analytics")) return "Data";
  if (l.includes("image") || l.includes("generate") || l.includes("vision")) return "Image / Vision";
  if (l.includes("code") || l.includes("review")) return "Code Analysis";
  if (l.includes("reputation") || l.includes("trust") || l.includes("score")) return "Reputation";
  if (l.includes("swap") || l.includes("defi") || l.includes("trade")) return "DeFi";
  return "Other";
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  const sp = request.nextUrl.searchParams;
  const search = sp.get("search") || "";
  const category = sp.get("category") || "";

  if (cache && now - cache.timestamp < CACHE_TTL && !search && !category) {
    return NextResponse.json(cache.data);
  }

  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Get all unique endpoints from events data
  const endpoints = db.prepare(`
    SELECT endpoint,
           COUNT(*) as total_calls,
           ROUND(SUM(amount_usd), 4) as total_revenue,
           ROUND(AVG(amount_usd), 6) as avg_price,
           COUNT(DISTINCT payer_address) as unique_agents,
           COUNT(DISTINCT api_key_id) as providers,
           MAX(timestamp) as last_active,
           MIN(timestamp) as first_seen
    FROM events WHERE timestamp >= ?
    GROUP BY endpoint
    ORDER BY total_calls DESC
  `).all(thirtyDaysAgo) as Array<{
    endpoint: string; total_calls: number; total_revenue: number;
    avg_price: number; unique_agents: number; providers: number;
    last_active: string; first_seen: string;
  }>;

  // Check which endpoints are tracked by Pulse (have a matching entry in endpoints table)
  const trackedEndpoints = new Set(
    (db.prepare("SELECT DISTINCT path FROM endpoints").all() as Array<{ path: string }>)
      .map((e) => e.path)
  );

  let services = endpoints.map((ep) => ({
    endpoint: ep.endpoint,
    category: categorize(ep.endpoint),
    total_calls: ep.total_calls,
    total_revenue: ep.total_revenue,
    avg_price: ep.avg_price,
    unique_agents: ep.unique_agents,
    providers: ep.providers,
    last_active: ep.last_active,
    first_seen: ep.first_seen,
    tracked_by_pulse: trackedEndpoints.has(ep.endpoint),
    // Health: simple score based on recency and volume
    health: (() => {
      const daysSinceActive = (Date.now() - new Date(ep.last_active).getTime()) / 86400000;
      if (daysSinceActive < 1 && ep.total_calls >= 10) return "excellent";
      if (daysSinceActive < 3 && ep.total_calls >= 5) return "good";
      if (daysSinceActive < 7) return "fair";
      return "inactive";
    })(),
  }));

  // Filter
  if (search) {
    const q = search.toLowerCase();
    services = services.filter((s) => s.endpoint.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }
  if (category) {
    services = services.filter((s) => s.category === category);
  }

  // Category summary
  const categoryMap = new Map<string, { count: number; calls: number }>();
  for (const s of endpoints) {
    const cat = categorize(s.endpoint);
    const existing = categoryMap.get(cat) || { count: 0, calls: 0 };
    existing.count++;
    existing.calls += s.total_calls;
    categoryMap.set(cat, existing);
  }
  const categories = [...categoryMap.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.calls - a.calls);

  const result = {
    services,
    categories,
    total: services.length,
    updated_at: new Date().toISOString(),
  };

  if (!search && !category) {
    cache = { data: result, timestamp: now };
  }

  return NextResponse.json(result);
}
