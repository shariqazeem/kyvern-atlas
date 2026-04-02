import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { nanoid } from "nanoid";
import { getResourceServer, getPayToAddress, getNetwork } from "@/lib/x402-server";
import { withPulse } from "@/lib/pulse-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Pro price: $49 USDC on mainnet, $1 USDC on testnet for demo
const PRO_PRICE = process.env.X402_NETWORK === "eip155:8453" ? "$49" : "$1";

async function handler(req: NextRequest) {
  const db = getDb();

  // Extract payer from x402 headers
  const paymentSig = req.headers.get("payment-signature");
  let payerAddress = "unknown";
  if (paymentSig) {
    try {
      const decoded = JSON.parse(Buffer.from(paymentSig, "base64").toString());
      payerAddress = decoded?.payload?.authorization?.from || "unknown";
    } catch {
      // fall through
    }
  }

  // Also check settlement response for payer
  const paymentResp = req.headers.get("payment-response");
  if (paymentResp) {
    try {
      const decoded = JSON.parse(Buffer.from(paymentResp, "base64").toString());
      if (decoded?.payer) payerAddress = decoded.payer;
    } catch {
      // fall through
    }
  }

  // Calculate expiry — 30 days from now
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Store subscription
  const subId = nanoid();
  db.prepare(`
    INSERT INTO subscriptions (id, wallet_address, plan, tx_hash, network, amount_usd, started_at, expires_at, status)
    VALUES (?, ?, 'pro', '', ?, ?, ?, ?, 'active')
  `).run(
    subId,
    payerAddress,
    getNetwork(),
    PRO_PRICE === "$49" ? 49 : 1,
    now.toISOString(),
    expiresAt.toISOString()
  );

  return NextResponse.json({
    success: true,
    subscription_id: subId,
    plan: "pro",
    wallet: payerAddress,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    message: "Pulse Pro activated for 30 days",
  });
}

export async function POST(req: NextRequest) {
  const x402Handler = withX402(
    handler,
    {
      accepts: {
        scheme: "exact",
        price: PRO_PRICE,
        network: getNetwork(),
        payTo: getPayToAddress(),
      },
      description: "Pulse Pro — 30-day subscription",
    },
    getResourceServer()
  );

  const pulseHandler = withPulse(x402Handler, {
    apiKey: process.env.PULSE_API_KEY || "demo_key_001",
  });

  return pulseHandler(req);
}
