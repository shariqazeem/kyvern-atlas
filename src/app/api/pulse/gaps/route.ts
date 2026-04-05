import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public endpoint — no auth needed. Shows market gaps (high demand, few providers)
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function categorize(endpoint: string): string {
  const lower = endpoint.toLowerCase();
  if (lower.includes("translate") || lower.includes("summarize") || lower.includes("sentiment") || lower.includes("ai") || lower.includes("generate") || lower.includes("nlp")) return "AI / NLP";
  if (lower.includes("search") || lower.includes("query")) return "Search";
  if (lower.includes("oracle") || lower.includes("price") || lower.includes("market")) return "Price / Oracle";
  if (lower.includes("weather") || lower.includes("data") || lower.includes("analytics")) return "Data";
  if (lower.includes("image") || lower.includes("vision") || lower.includes("photo")) return "Image / Vision";
  if (lower.includes("code") || lower.includes("review") || lower.includes("lint")) return "Code Analysis";
  if (lower.includes("reputation") || lower.includes("trust") || lower.includes("score")) return "Reputation";
  if (lower.includes("swap") || lower.includes("defi") || lower.includes("trade")) return "DeFi";
  return "Other";
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const db = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Get all endpoints with their stats
  const endpoints = db.prepare(`
    SELECT endpoint, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
           ROUND(AVG(amount_usd), 6) as avg_price,
           COUNT(DISTINCT api_key_id) as providers,
           COUNT(DISTINCT payer_address) as unique_agents
    FROM events WHERE timestamp >= ?
    GROUP BY endpoint
  `).all(thirtyDaysAgo) as Array<{
    endpoint: string; calls: number; revenue: number;
    avg_price: number; providers: number; unique_agents: number;
  }>;

  // Group by category
  const categoryMap = new Map<string, {
    calls: number; revenue: number; providers: Set<string>;
    endpoints: string[]; avg_prices: number[]; agents: number;
  }>();

  for (const ep of endpoints) {
    const cat = categorize(ep.endpoint);
    const existing = categoryMap.get(cat) || {
      calls: 0, revenue: 0, providers: new Set<string>(),
      endpoints: [], avg_prices: [], agents: 0,
    };
    existing.calls += ep.calls;
    existing.revenue += ep.revenue;
    existing.endpoints.push(ep.endpoint);
    existing.avg_prices.push(ep.avg_price);
    existing.agents += ep.unique_agents;
    categoryMap.set(cat, existing);
  }

  const categories = [...categoryMap.entries()]
    .map(([name, data]) => ({
      category: name,
      total_calls: data.calls,
      total_revenue: Math.round(data.revenue * 10000) / 10000,
      endpoint_count: data.endpoints.length,
      unique_agents: data.agents,
      avg_price: Math.round((data.avg_prices.reduce((a, b) => a + b, 0) / data.avg_prices.length) * 10000) / 10000,
      // Gap score: high demand (calls) + few endpoints = big opportunity
      gap_score: Math.round((data.calls / Math.max(data.endpoints.length, 1)) * 10),
      top_endpoints: data.endpoints.slice(0, 3),
    }))
    .sort((a, b) => b.gap_score - a.gap_score);

  // Identify specific gaps: endpoints with many calls from many agents but few providers
  const gaps = endpoints
    .filter((ep) => ep.calls >= 5 && ep.unique_agents >= 2)
    .map((ep) => ({
      endpoint: ep.endpoint,
      category: categorize(ep.endpoint),
      demand_calls: ep.calls,
      demand_agents: ep.unique_agents,
      providers: ep.providers,
      avg_price: ep.avg_price,
      monthly_revenue: ep.revenue,
      opportunity_score: Math.round((ep.calls * ep.unique_agents) / Math.max(ep.providers, 1)),
    }))
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 15);

  const result = { categories, gaps, updated_at: new Date().toISOString() };
  cache = { data: result, timestamp: now };
  return NextResponse.json(result);
}
