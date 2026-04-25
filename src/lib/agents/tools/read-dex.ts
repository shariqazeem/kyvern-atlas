import type { AgentTool } from "../types";

/**
 * read_dex — query Jupiter price API for a token's USD price.
 *
 * Free. Uses Jupiter's public price API (mainnet quotes — these
 * are still useful as price reference even when our agents transact
 * on devnet).
 */
export const readDexTool: AgentTool = {
  id: "read_dex",
  name: "Read DEX price",
  description:
    "Get the current USD price of a Solana token from Jupiter's price API. Pass a token mint address or a symbol like 'SOL'.",
  category: "read",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      tokenIdOrSymbol: {
        type: "string",
        description:
          "Token mint address (base58) or known symbol (e.g. 'SOL', 'USDC', 'BONK').",
      },
    },
    required: ["tokenIdOrSymbol"],
  },
  execute: async (_ctx, input) => {
    const id = String(input.tokenIdOrSymbol ?? "").trim();
    if (!id) return { ok: false, message: "tokenIdOrSymbol required" };

    try {
      const url = `https://price.jup.ag/v6/price?ids=${encodeURIComponent(id)}`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          ok: false,
          message: `Jupiter API returned ${res.status}`,
        };
      }
      const json = (await res.json()) as {
        data?: Record<string, { id: string; mintSymbol?: string; price: number }>;
      };
      const entry = Object.values(json.data ?? {})[0];
      if (!entry) {
        return { ok: false, message: `No price data for ${id}` };
      }
      return {
        ok: true,
        message: `${entry.mintSymbol ?? id} price: $${entry.price.toFixed(4)}`,
        data: {
          symbol: entry.mintSymbol ?? id,
          mint: entry.id,
          priceUsd: entry.price,
        },
      };
    } catch (e) {
      return {
        ok: false,
        message: `Jupiter error: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  },
};
