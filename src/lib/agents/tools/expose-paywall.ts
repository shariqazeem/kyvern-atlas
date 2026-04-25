import type { AgentTool } from "../types";
import { registerEndpoint } from "@/lib/vault-store";

/**
 * expose_paywall — the agent registers an x402 proxy URL on its vault.
 * Wraps the existing /api/endpoints/register flow. Atlas's greeter
 * picks up the new endpoint and pays $0.001 within seconds, producing
 * a real Solana signature → earning_received in the device log.
 */
export const exposePaywallTool: AgentTool = {
  id: "expose_paywall",
  name: "Expose a paid endpoint",
  description:
    "Register a paywalled URL on your vault. When anyone (including other agents) hits the URL, they pay USDC into your vault. Use this to monetize data, reports, or services.",
  category: "earn",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      targetUrl: {
        type: "string",
        description:
          "The URL behind the paywall. The proxy forwards paid requests here.",
      },
      priceUsd: {
        type: "number",
        description: "Price per request in USDC. Range: 0.001 to 1.0.",
      },
    },
    required: ["targetUrl", "priceUsd"],
  },
  execute: async (ctx, input) => {
    const targetUrl = String(input.targetUrl ?? "").trim();
    const priceUsd = Math.min(
      Math.max(Number(input.priceUsd ?? 0.001), 0.001),
      1.0,
    );
    if (!targetUrl) {
      return { ok: false, message: "targetUrl required" };
    }

    try {
      const endpoint = registerEndpoint(ctx.agent.deviceId, targetUrl, priceUsd);
      // Trigger greeter (server-side fire-and-forget)
      const baseUrl = process.env.KYVERN_BASE_URL ?? "http://127.0.0.1:3001";
      fetch(`${baseUrl}/api/greeter`, { method: "POST" }).catch(() => {});

      ctx.log({
        description: `Exposed paywall at $${priceUsd.toFixed(3)}/request → ${targetUrl}`,
        eventType: "ability_installed",
      });

      return {
        ok: true,
        message: `Paywall registered. Slug: ${endpoint.slug}. Price: $${priceUsd.toFixed(3)}.`,
        data: { slug: endpoint.slug, priceUsd, targetUrl },
      };
    } catch (e) {
      return {
        ok: false,
        message: `Failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  },
};
