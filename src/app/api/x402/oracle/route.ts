import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { getResourceServer, getPayToAddress, getNetwork } from "@/lib/x402-server";
import { withPulse } from "@/lib/pulse-middleware";

export const dynamic = "force-dynamic";

// Fetch real prices from CoinGecko free API
async function fetchPrice(token: string): Promise<{
  price: number;
  change_24h: number;
  market_cap: number;
  volume_24h: number;
} | null> {
  const ids: Record<string, string> = {
    BTC: "bitcoin", ETH: "ethereum", SOL: "solana",
    USDC: "usd-coin", BASE: "base-protocol",
    MATIC: "matic-network", AVAX: "avalanche-2",
    ARB: "arbitrum", OP: "optimism", LINK: "chainlink",
  };

  const id = ids[token.toUpperCase()];
  if (!id) return null;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
      { next: { revalidate: 30 } }
    );
    const data = await res.json();
    const d = data[id];
    if (!d) return null;

    return {
      price: d.usd,
      change_24h: d.usd_24h_change || 0,
      market_cap: d.usd_market_cap || 0,
      volume_24h: d.usd_24h_vol || 0,
    };
  } catch {
    return null;
  }
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token") || "ETH";
  const data = await fetchPrice(token);

  if (!data) {
    return NextResponse.json({
      error: `Unknown token: ${token}. Supported: BTC, ETH, SOL, USDC, MATIC, AVAX, ARB, OP, LINK`,
    }, { status: 400 });
  }

  return NextResponse.json({
    token: token.toUpperCase(),
    price_usd: data.price,
    change_24h_pct: Math.round(data.change_24h * 100) / 100,
    market_cap_usd: data.market_cap,
    volume_24h_usd: data.volume_24h,
    timestamp: new Date().toISOString(),
    source: "kyvernlabs-oracle",
    powered_by: "x402",
  });
}

export async function GET(req: NextRequest) {
  const x402Handler = withX402(
    handler,
    {
      accepts: {
        scheme: "exact",
        price: "$0.001",
        network: getNetwork(),
        payTo: getPayToAddress(),
      },
      description: "Real-time crypto price oracle — powered by KyvernLabs x402",
    },
    getResourceServer()
  );

  const pulseHandler = withPulse(x402Handler, {
    apiKey: process.env.PULSE_API_KEY || "demo_key_001",
  });

  return pulseHandler(req);
}
