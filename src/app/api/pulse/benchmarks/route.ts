import { NextRequest, NextResponse } from "next/server";
import { authenticateSession } from "@/lib/auth";
import { getTierForApiKey } from "@/lib/tier";
import { getMarketBenchmarks, getUserPricingComparison } from "@/lib/db";

export const dynamic = "force-dynamic";

// Simple 5-minute cache
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateSession(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Pro tier check
    const tier = getTierForApiKey(auth.apiKeyId);
    if (tier !== "pro") {
      return NextResponse.json(
        { error: "pro_required", message: "Pricing benchmarks require Pulse Pro. Upgrade to compare your pricing against the market." },
        { status: 403 }
      );
    }

    // Check cache
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      // Return cached market data + fresh user comparison
      const userComparison = getUserPricingComparison(auth.apiKeyId);
      return NextResponse.json({ ...(cache.data as object), user_comparison: userComparison });
    }

    // Fresh query
    const marketData = getMarketBenchmarks();
    const userComparison = getUserPricingComparison(auth.apiKeyId);

    // Cache market data (user comparison is always fresh)
    cache = { data: marketData, timestamp: now };

    return NextResponse.json({
      ...marketData,
      user_comparison: userComparison,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
