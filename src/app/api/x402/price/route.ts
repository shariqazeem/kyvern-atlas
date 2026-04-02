import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { getResourceServer, getPayToAddress, getNetwork } from "@/lib/x402-server";
import { withPulse } from "@/lib/pulse-middleware";

export const dynamic = "force-dynamic";

async function priceHandler(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") || "ETH";

  const prices: Record<string, number> = {
    ETH: 3245.67,
    BTC: 67891.23,
    SOL: 178.45,
    USDC: 1.0,
    BASE: 12.34,
  };

  return NextResponse.json({
    symbol: symbol.toUpperCase(),
    price_usd: prices[symbol.toUpperCase()] || null,
    timestamp: new Date().toISOString(),
    source: "kyvernlabs-pulse-demo",
    powered_by: "x402",
  });
}

export async function GET(req: NextRequest) {
  // Layer 1: x402 payment gate
  const x402Handler = withX402(
    priceHandler,
    {
      accepts: {
        scheme: "exact",
        price: "$0.001",
        network: getNetwork(),
        payTo: getPayToAddress(),
      },
      description: "Real-time crypto price data powered by Pulse",
    },
    getResourceServer()
  );

  // Layer 2: Pulse analytics
  const handler = withPulse(x402Handler, {
    apiKey: process.env.PULSE_API_KEY || "demo_key_001",
  });

  return handler(req);
}
