import { NextRequest, NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";

export async function POST(req: NextRequest) {
  try {
    const clientKey = process.env.X402_CLIENT_PRIVATE_KEY;
    if (!clientKey) {
      return NextResponse.json(
        { error: "X402_CLIENT_PRIVATE_KEY not configured. Set it in .env.local to enable live demo." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const isUpgrade = body._upgrade === true;
    const symbol = body.symbol || "ETH";

    // Set up x402 client with test wallet
    const signer = privateKeyToAccount(clientKey as `0x${string}`);
    const client = new x402Client();
    client.register("eip155:*", new ExactEvmScheme(signer));
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);

    // Call either the upgrade or demo price endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const targetUrl = isUpgrade
      ? `${baseUrl}/api/x402/upgrade-pro`
      : `${baseUrl}/api/x402/price?symbol=${encodeURIComponent(symbol)}`;

    const response = await fetchWithPayment(targetUrl, {
      method: isUpgrade ? "POST" : "GET",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `x402 call failed: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    // Extract settlement info
    const paymentResponseHeader = response.headers.get("payment-response");
    let settlement = null;
    if (paymentResponseHeader) {
      try {
        settlement = JSON.parse(Buffer.from(paymentResponseHeader, "base64").toString());
      } catch {
        // ignore decode errors
      }
    }

    return NextResponse.json({
      success: true,
      data,
      settlement: {
        tx_hash: settlement?.transaction || null,
        network: settlement?.network || null,
        payer: settlement?.payer || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
