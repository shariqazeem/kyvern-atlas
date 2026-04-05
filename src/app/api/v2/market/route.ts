import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Public Market Data API — tiered rate limiting
// Free: 100 calls/day (no key needed)
// With API key: 10,000 calls/day
export async function GET(request: NextRequest) {
  try {
    // Rate limit by IP or API key
    const apiKey = request.headers.get("x-api-key");
    const identifier = apiKey || request.headers.get("x-forwarded-for") || "anonymous";
    const limit = apiKey ? 10000 : 100;
    const rl = checkRateLimit(`market:${identifier}`, limit, 86400000); // per day
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Add an X-API-Key header for higher limits.", limit },
        { status: 429 }
      );
    }

    const db = getDb();
    const sp = request.nextUrl.searchParams;
    const metric = sp.get("metric") || "overview";
    const range = sp.get("range") || "30d";
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    let result: unknown;

    switch (metric) {
      case "overview": {
        const stats = db.prepare(`
          SELECT COUNT(*) as total_transactions,
                 ROUND(SUM(amount_usd), 2) as total_volume,
                 COUNT(DISTINCT endpoint) as active_endpoints,
                 COUNT(DISTINCT payer_address) as unique_agents,
                 COUNT(DISTINCT api_key_id) as providers,
                 ROUND(AVG(amount_usd), 6) as avg_price
          FROM events WHERE timestamp >= ?
        `).get(since);
        result = { metric: "overview", range, data: stats };
        break;
      }

      case "endpoints": {
        const endpoints = db.prepare(`
          SELECT endpoint, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
                 ROUND(AVG(amount_usd), 6) as avg_price,
                 COUNT(DISTINCT payer_address) as unique_agents
          FROM events WHERE timestamp >= ?
          GROUP BY endpoint ORDER BY calls DESC LIMIT 50
        `).all(since);
        result = { metric: "endpoints", range, count: (endpoints as unknown[]).length, data: endpoints };
        break;
      }

      case "volume": {
        const daily = db.prepare(`
          SELECT date(timestamp) as date, COUNT(*) as transactions,
                 ROUND(SUM(amount_usd), 4) as volume
          FROM events WHERE timestamp >= ?
          GROUP BY date(timestamp) ORDER BY date ASC
        `).all(since);
        result = { metric: "volume", range, data: daily };
        break;
      }

      case "categories": {
        const cats = db.prepare(`
          SELECT endpoint, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
                 ROUND(AVG(amount_usd), 6) as avg_price
          FROM events WHERE timestamp >= ?
          GROUP BY endpoint
        `).all(since) as Array<{ endpoint: string; calls: number; revenue: number; avg_price: number }>;

        // Categorize
        const catMap = new Map<string, { calls: number; revenue: number; endpoints: number }>();
        for (const ep of cats) {
          const lower = ep.endpoint.toLowerCase();
          const cat = lower.includes("ai") || lower.includes("translate") || lower.includes("summarize") || lower.includes("sentiment") ? "AI / NLP"
            : lower.includes("search") ? "Search"
            : lower.includes("price") || lower.includes("oracle") ? "Price / Oracle"
            : lower.includes("weather") || lower.includes("data") ? "Data"
            : lower.includes("image") || lower.includes("generate") ? "Image"
            : "Other";
          const existing = catMap.get(cat) || { calls: 0, revenue: 0, endpoints: 0 };
          existing.calls += ep.calls;
          existing.revenue += ep.revenue;
          existing.endpoints++;
          catMap.set(cat, existing);
        }
        const categories = [...catMap.entries()].map(([name, d]) => ({
          category: name, ...d, revenue: Math.round(d.revenue * 10000) / 10000,
        })).sort((a, b) => b.calls - a.calls);

        result = { metric: "categories", range, data: categories };
        break;
      }

      case "pricing": {
        const pricing = db.prepare(`
          SELECT endpoint, ROUND(AVG(amount_usd), 6) as avg_price,
                 ROUND(MIN(amount_usd), 6) as min_price,
                 ROUND(MAX(amount_usd), 6) as max_price,
                 COUNT(*) as sample_size
          FROM events WHERE timestamp >= ?
          GROUP BY endpoint ORDER BY sample_size DESC LIMIT 30
        `).all(since);
        result = { metric: "pricing", range, data: pricing };
        break;
      }

      default:
        return NextResponse.json({
          error: "Unknown metric. Available: overview, endpoints, volume, categories, pricing",
          docs: "https://kyvernlabs.com/docs/api",
        }, { status: 400 });
    }

    return NextResponse.json({
      ...result as object,
      api_version: "v2",
      updated_at: new Date().toISOString(),
      rate_limit: { remaining: rl.remaining, limit },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
