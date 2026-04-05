import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { getResourceServer, getPayToAddress, getNetwork } from "@/lib/x402-server";
import { withPulse } from "@/lib/pulse-middleware";
import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";

export const dynamic = "force-dynamic";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function getWalletReputation(address: string) {
  const client = createPublicClient({
    chain: base,
    transport: http(),
  });

  // Check ETH balance
  let ethBalance = 0;
  try {
    const bal = await client.getBalance({ address: address as `0x${string}` });
    ethBalance = parseFloat(formatUnits(bal, 18));
  } catch {
    // ignore
  }

  // Check USDC balance
  let usdcBalance = 0;
  try {
    const bal = await client.readContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: [{
        name: "balanceOf",
        type: "function",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
      }],
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    usdcBalance = parseFloat(formatUnits(bal as bigint, 6));
  } catch {
    // ignore
  }

  // Check transaction count (nonce = how active the wallet is)
  let txCount = 0;
  try {
    txCount = await client.getTransactionCount({ address: address as `0x${string}` });
  } catch {
    // ignore
  }

  // Calculate reputation score (0-100)
  let score = 0;
  if (txCount > 0) score += 20;
  if (txCount > 10) score += 15;
  if (txCount > 50) score += 15;
  if (usdcBalance > 0) score += 20;
  if (usdcBalance > 10) score += 10;
  if (ethBalance > 0) score += 10;
  if (ethBalance > 0.01) score += 10;

  const tier =
    score >= 80 ? "excellent" :
    score >= 60 ? "good" :
    score >= 30 ? "moderate" :
    score > 0 ? "new" : "unknown";

  return {
    address,
    network: "eip155:8453",
    reputation_score: Math.min(score, 100),
    tier,
    on_chain: {
      transaction_count: txCount,
      eth_balance: Math.round(ethBalance * 10000) / 10000,
      usdc_balance: Math.round(usdcBalance * 100) / 100,
    },
    analysis: {
      has_funds: usdcBalance > 0 || ethBalance > 0,
      is_active: txCount > 10,
      can_pay_x402: usdcBalance > 0,
    },
    timestamp: new Date().toISOString(),
    source: "kyvernlabs-reputation",
    powered_by: "x402",
    note: "Reputation score based on Base on-chain activity. Higher score = more trustworthy payer.",
  };
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const address = req.nextUrl.searchParams.get("address");

  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return NextResponse.json({
      error: "Provide a valid wallet address: ?address=0x...",
    }, { status: 400 });
  }

  const data = await getWalletReputation(address);
  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const x402Handler = withX402(
    handler,
    {
      accepts: {
        scheme: "exact",
        price: "$0.01",
        network: getNetwork(),
        payTo: getPayToAddress(),
      },
      description: "Agent reputation score — on-chain wallet analysis powered by KyvernLabs",
    },
    getResourceServer()
  );

  const pulseHandler = withPulse(x402Handler, {
    apiKey: process.env.PULSE_API_KEY || "demo_key_001",
  });

  return pulseHandler(req);
}
