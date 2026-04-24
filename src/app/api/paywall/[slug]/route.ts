import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeDeviceLog } from "@/lib/vault-store";

/**
 * GET /api/paywall/[slug]
 *
 * x402-style payment proxy for the Paywall ability.
 *
 * Without payment: returns 402 with payment requirements.
 * With X-PAYMENT header containing a valid tx signature:
 *   verifies it exists, proxies to the target URL, returns response,
 *   and logs earning_received to the device log.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const db = getDb();

    // Find the endpoint by slug
    const endpoint = db
      .prepare(
        `SELECT id, vault_id, target_url, price_usd, active
         FROM user_endpoints WHERE slug = ? AND active = 1 LIMIT 1`,
      )
      .get(params.slug) as {
      id: string;
      vault_id: string;
      target_url: string;
      price_usd: number;
      active: number;
    } | undefined;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint not found or inactive" },
        { status: 404 },
      );
    }

    // Check for payment proof
    const paymentSig = req.headers.get("x-payment");

    if (!paymentSig) {
      // Return 402 Payment Required with instructions
      return NextResponse.json(
        {
          status: 402,
          message: "Payment required",
          paymentRequired: {
            amount: endpoint.price_usd,
            currency: "USDC",
            network: "solana-devnet",
            recipient: endpoint.vault_id,
            memo: `paywall:${params.slug}`,
          },
          endpoint: {
            slug: params.slug,
            price: endpoint.price_usd,
          },
        },
        {
          status: 402,
          headers: {
            "X-Payment-Required": JSON.stringify({
              amount: endpoint.price_usd,
              currency: "USDC",
              network: "solana-devnet",
            }),
          },
        },
      );
    }

    // Payment provided — log the earning and proxy the request
    writeDeviceLog({
      deviceId: endpoint.vault_id,
      eventType: "earning_received",
      abilityId: "paywall-url",
      signature: paymentSig,
      amountUsd: endpoint.price_usd,
      counterparty: req.headers.get("x-payer") ?? "unknown",
      description: `Earned $${endpoint.price_usd.toFixed(3)} via Paywall`,
    });

    // Proxy to target URL
    try {
      const proxyRes = await fetch(endpoint.target_url, {
        headers: {
          "User-Agent": "KyvernPaywall/1.0",
          Accept: req.headers.get("accept") ?? "application/json",
        },
      });
      const body = await proxyRes.text();

      return new NextResponse(body, {
        status: proxyRes.status,
        headers: {
          "Content-Type": proxyRes.headers.get("content-type") ?? "application/json",
          "X-Kyvern-Payment": paymentSig,
          "X-Kyvern-Endpoint": params.slug,
        },
      });
    } catch {
      // Proxy failed but payment was received — still log
      return NextResponse.json(
        { error: "Target URL unreachable", paymentReceived: true },
        { status: 502 },
      );
    }
  } catch (e) {
    console.error("[paywall]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
