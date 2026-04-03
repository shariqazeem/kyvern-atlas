/**
 * @kyvernlabs/pulse — x402 analytics middleware
 *
 * Captures every x402 payment that flows through your endpoint.
 * Decodes PAYMENT-SIGNATURE and PAYMENT-RESPONSE headers,
 * extracts payer, amount, network, tx_hash.
 * Sends to your Pulse dashboard at kyvernlabs.com.
 *
 * Usage:
 *   import { withPulse } from '@kyvernlabs/pulse'
 *   import { withX402 } from '@x402/next'
 *
 *   const x402Handler = withX402(handler, routeConfig, server)
 *   export const GET = withPulse(x402Handler, { apiKey: 'kv_live_...' })
 */

interface PulseConfig {
  /** Your Pulse API key (kv_live_...) from kyvernlabs.com/pulse/dashboard/keys */
  apiKey: string;
  /** Custom ingest URL. Defaults to https://kyvernlabs.com/api/pulse/ingest */
  ingestUrl?: string;
}

interface PulseEvent {
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

function convertAtomicToUSD(amountStr?: string): number {
  if (!amountStr) return 0;
  try {
    const amount = BigInt(amountStr);
    return Number(amount) / 1e6;
  } catch {
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

/**
 * Wraps an x402 handler to capture payment analytics.
 *
 * @param x402Handler - Your x402-wrapped route handler
 * @param config - Pulse configuration with your API key
 * @returns A wrapped handler that captures analytics on every successful payment
 *
 * @example
 * ```typescript
 * import { withPulse } from '@kyvernlabs/pulse'
 * import { withX402 } from '@x402/next'
 *
 * const x402Handler = withX402(handler, {
 *   accepts: { scheme: 'exact', price: '$0.01', network: 'eip155:8453', payTo: '0x...' }
 * }, server)
 *
 * export const GET = withPulse(x402Handler, {
 *   apiKey: 'kv_live_your_key_here'
 * })
 * ```
 */
export function withPulse<TReq extends Request, TRes extends Response>(
  x402Handler: (req: TReq) => Promise<TRes>,
  config: PulseConfig
): (req: TReq) => Promise<TRes> {
  const ingestUrl = config.ingestUrl || "https://kyvernlabs.com/api/pulse/ingest";

  return async (req: TReq): Promise<TRes> => {
    const start = Date.now();

    const paymentSigHeader = req.headers.get("payment-signature") || req.headers.get("x-payment");
    const paymentData = safeBase64Decode(paymentSigHeader) as {
      payload?: { authorization?: { from?: string; value?: string } };
      accepted?: { amount?: string; network?: string; asset?: string; scheme?: string };
    } | null;

    const response = await x402Handler(req);

    if (response.status === 402) return response;

    const paymentResponseHeader = response.headers.get("payment-response");
    const settlement = safeBase64Decode(paymentResponseHeader) as {
      transaction?: string;
      success?: boolean;
      payer?: string;
      network?: string;
      amount?: string;
    } | null;

    if (paymentData || settlement) {
      const event: PulseEvent = {
        endpoint: new URL(req.url).pathname,
        payer_address: settlement?.payer || paymentData?.payload?.authorization?.from || "unknown",
        amount_usd: convertAtomicToUSD(
          settlement?.amount || paymentData?.accepted?.amount || paymentData?.payload?.authorization?.value
        ),
        network: settlement?.network || paymentData?.accepted?.network,
        asset: paymentData?.accepted?.asset,
        scheme: paymentData?.accepted?.scheme,
        tx_hash: settlement?.transaction,
        latency_ms: Date.now() - start,
        status: settlement?.success !== false ? "success" : "error",
        timestamp: new Date().toISOString(),
      };

      fetch(ingestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": config.apiKey },
        body: JSON.stringify(event),
      }).catch(() => {});
    }

    return response;
  };
}

export type { PulseConfig, PulseEvent };
