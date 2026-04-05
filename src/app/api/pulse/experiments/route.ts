import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { getTierForApiKey } from "@/lib/tier";

export const dynamic = "force-dynamic";

// A/B pricing experiment: compare revenue/retention at different price points for the same endpoint
// Uses actual event data — no setup required. Just analyze what happened at different prices.
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (getTierForApiKey(auth.apiKeyId) !== "pro") {
      return NextResponse.json({ error: "pro_required" }, { status: 403 });
    }

    const db = getDb();
    const endpoint = request.nextUrl.searchParams.get("endpoint");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    if (endpoint) {
      // Detailed analysis for one endpoint — compare different price points
      const priceAnalysis = db.prepare(`
        SELECT
          ROUND(amount_usd, 4) as price_point,
          COUNT(*) as total_calls,
          COUNT(DISTINCT payer_address) as unique_payers,
          ROUND(SUM(amount_usd), 4) as total_revenue,
          ROUND(AVG(latency_ms), 0) as avg_latency,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen
        FROM events
        WHERE api_key_id = ? AND endpoint = ? AND timestamp >= ?
        GROUP BY ROUND(amount_usd, 4)
        ORDER BY total_calls DESC
      `).all(auth.apiKeyId, endpoint, thirtyDaysAgo);

      // Repeat rate per price point (agents who came back)
      const repeatRates = db.prepare(`
        SELECT
          ROUND(amount_usd, 4) as price_point,
          payer_address,
          COUNT(*) as visits
        FROM events
        WHERE api_key_id = ? AND endpoint = ? AND timestamp >= ?
        GROUP BY ROUND(amount_usd, 4), payer_address
      `).all(auth.apiKeyId, endpoint, thirtyDaysAgo) as Array<{
        price_point: number;
        payer_address: string;
        visits: number;
      }>;

      // Calculate retention per price
      const retentionByPrice = new Map<number, { total: number; returning: number }>();
      for (const r of repeatRates) {
        const existing = retentionByPrice.get(r.price_point) || { total: 0, returning: 0 };
        existing.total++;
        if (r.visits > 1) existing.returning++;
        retentionByPrice.set(r.price_point, existing);
      }

      const analysis = (priceAnalysis as Array<Record<string, unknown>>).map((pa) => {
        const retention = retentionByPrice.get(pa.price_point as number);
        return {
          ...pa,
          repeat_rate: retention ? Math.round((retention.returning / retention.total) * 100) : 0,
        };
      });

      return NextResponse.json({ endpoint, analysis });
    }

    // Overview: endpoints with multiple price points (natural experiments)
    const experiments = db.prepare(`
      SELECT
        endpoint,
        COUNT(DISTINCT ROUND(amount_usd, 4)) as price_variants,
        COUNT(*) as total_calls,
        ROUND(SUM(amount_usd), 4) as total_revenue,
        ROUND(MIN(amount_usd), 4) as min_price,
        ROUND(MAX(amount_usd), 4) as max_price
      FROM events
      WHERE api_key_id = ? AND timestamp >= ?
      GROUP BY endpoint
      HAVING price_variants >= 1
      ORDER BY total_calls DESC
    `).all(auth.apiKeyId, thirtyDaysAgo);

    return NextResponse.json({ experiments });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
