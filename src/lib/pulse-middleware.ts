/**
 * @kyvernlabs/pulse middleware
 *
 * Wraps an x402 handler to capture payment analytics.
 * Decodes PAYMENT-SIGNATURE and PAYMENT-RESPONSE headers,
 * extracts payer, amount, network, tx_hash, and sends to Pulse API.
 *
 * Usage:
 *   import { withX402 } from "@x402/next";
 *   import { withPulse } from "@/lib/pulse-middleware";
 *
 *   const x402Handler = withX402(handler, routeConfig, server);
 *   export const GET = withPulse(x402Handler, { apiKey: "kv_..." });
 */
import { NextRequest, NextResponse } from "next/server";

export interface PulseConfig {
  apiKey: string;
  ingestUrl?: string;
}

interface PulseEventPayload {
  endpoint: string;
  payer_address: string;
  amount_usd: number;
  network?: string;
  asset?: string;
  scheme?: string;
  tx_hash?: string;
  latency_ms: number;
  status: "success" | "error";
  timestamp: string;
}

// USDC has 6 decimals — convert atomic units to USD
function convertAtomicToUSD(amountStr?: string): number {
  if (!amountStr) return 0;
  try {
    const amount = BigInt(amountStr);
    return Number(amount) / 1e6;
  } catch {
    // If it's already a decimal string like "0.001", parse directly
    const num = parseFloat(amountStr);
    return isNaN(num) ? 0 : num;
  }
}

function safeBase64Decode(str: string | null | undefined): Record<string, unknown> | null {
  if (!str) return null;
  try {
    return JSON.parse(Buffer.from(str, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export function withPulse<T>(
  x402Handler: (req: NextRequest) => Promise<NextResponse<T>>,
  config: PulseConfig
): (req: NextRequest) => Promise<NextResponse<T>> {
  const ingestUrl =
    config.ingestUrl ||
    process.env.PULSE_INGEST_URL ||
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/pulse/ingest`;

  return async (req: NextRequest): Promise<NextResponse<T>> => {
    const start = Date.now();

    // Decode PAYMENT-SIGNATURE from the incoming request
    const paymentSigHeader = req.headers.get("payment-signature") || req.headers.get("x-payment");
    const paymentData = safeBase64Decode(paymentSigHeader) as {
      x402Version?: number;
      payload?: {
        authorization?: { from?: string; value?: string };
      };
      accepted?: {
        amount?: string;
        network?: string;
        asset?: string;
        scheme?: string;
      };
    } | null;

    // Run the actual x402 handler (verify → handler → settle)
    const response = await x402Handler(req);

    // If 402 response, client hasn't paid yet — skip analytics
    if (response.status === 402) {
      return response;
    }

    // Decode PAYMENT-RESPONSE from the response headers
    const paymentResponseHeader = response.headers.get("payment-response");
    const settlement = safeBase64Decode(paymentResponseHeader) as {
      transaction?: string;
      success?: boolean;
      payer?: string;
      network?: string;
      amount?: string;
    } | null;

    // Only log if we have payment data (successful x402 transaction)
    if (paymentData || settlement) {
      const event: PulseEventPayload = {
        endpoint: new URL(req.url).pathname,
        payer_address:
          settlement?.payer ||
          paymentData?.payload?.authorization?.from ||
          "unknown",
        amount_usd: convertAtomicToUSD(
          settlement?.amount ||
          paymentData?.accepted?.amount ||
          paymentData?.payload?.authorization?.value
        ),
        network: settlement?.network || paymentData?.accepted?.network,
        asset: paymentData?.accepted?.asset,
        scheme: paymentData?.accepted?.scheme,
        tx_hash: settlement?.transaction,
        latency_ms: Date.now() - start,
        status: settlement?.success !== false ? "success" : "error",
        timestamp: new Date().toISOString(),
      };

      // Fire-and-forget — never block the response
      fetch(ingestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": config.apiKey,
        },
        body: JSON.stringify(event),
      }).catch((err) => {
        console.error("[Pulse] Failed to send analytics:", err.message);
      });
    }

    return response;
  };
}
