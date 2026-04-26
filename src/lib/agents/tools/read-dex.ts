import type { AgentTool } from "../types";

/**
 * read_dex — query a token's USD price.
 *
 * Free. Uses two backends:
 *   1. CoinGecko `/simple/price` for symbols (SOL, USDC, BONK, …) —
 *      fast, reliable, no API key. Symbols below are mapped to
 *      CoinGecko IDs.
 *   2. DexScreener `/dex/tokens/{mint}` for arbitrary Solana mint
 *      addresses — handles long-tail tokens by mint, also no key.
 *
 * Why not Jupiter? `price.jup.ag` resolves inconsistently from VM
 * environments (DNS / Cloudflare gating). The two sources above hold
 * up under the same conditions.
 */

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  SOL: "solana",
  USDC: "usd-coin",
  USDT: "tether",
  BTC: "bitcoin",
  ETH: "ethereum",
  BONK: "bonk",
  WIF: "dogwifcoin",
  JUP: "jupiter-exchange-solana",
  PYTH: "pyth-network",
  JTO: "jito-governance-token",
  RAY: "raydium",
  ORCA: "orca",
  PUMP: "pump-fun",
  POPCAT: "popcat",
};

interface PriceResult {
  symbol: string;
  priceUsd: number;
  source: "coingecko" | "dexscreener";
}

async function fetchCoinGecko(coingeckoId: string): Promise<PriceResult | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      // 5-second budget — agents should never stall on a price fetch
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const entry = json[coingeckoId];
    if (!entry || typeof entry.usd !== "number") return null;
    return {
      symbol: coingeckoId.toUpperCase(),
      priceUsd: entry.usd,
      source: "coingecko",
    };
  } catch {
    return null;
  }
}

async function fetchDexScreener(mintOrQuery: string): Promise<PriceResult | null> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mintOrQuery)}`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      pairs?: Array<{
        baseToken?: { symbol?: string; address?: string };
        priceUsd?: string;
        liquidity?: { usd?: number };
      }>;
    };
    const pairs = json.pairs ?? [];
    if (pairs.length === 0) return null;
    // Pick the pair with highest liquidity for a stable price
    const best = pairs.reduce((a, b) =>
      (a.liquidity?.usd ?? 0) >= (b.liquidity?.usd ?? 0) ? a : b,
    );
    const priceUsd = parseFloat(best.priceUsd ?? "0");
    if (!isFinite(priceUsd) || priceUsd <= 0) return null;
    return {
      symbol: best.baseToken?.symbol ?? mintOrQuery,
      priceUsd,
      source: "dexscreener",
    };
  } catch {
    return null;
  }
}

export const readDexTool: AgentTool = {
  id: "read_dex",
  name: "Read DEX price",
  description:
    "Get the current USD price of a token. Pass a known symbol (SOL, USDC, BTC, ETH, BONK, WIF, JUP, PYTH, JTO, RAY, ORCA, PUMP, POPCAT) or a Solana mint address.",
  category: "read",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      tokenIdOrSymbol: {
        type: "string",
        description:
          "Token symbol (e.g. 'SOL', 'BONK') or a Solana mint address (base58, ~44 chars).",
      },
    },
    required: ["tokenIdOrSymbol"],
  },
  execute: async (_ctx, input) => {
    const raw = String(input.tokenIdOrSymbol ?? "").trim();
    if (!raw) return { ok: false, message: "tokenIdOrSymbol required" };

    const upper = raw.toUpperCase();
    const cgId = SYMBOL_TO_COINGECKO_ID[upper];

    // Symbol path: try CoinGecko first
    if (cgId) {
      const cg = await fetchCoinGecko(cgId);
      if (cg) {
        return {
          ok: true,
          message: `${cg.symbol} price: $${cg.priceUsd.toFixed(cg.priceUsd < 1 ? 6 : 4)} (CoinGecko)`,
          data: { ...cg },
        };
      }
      // CoinGecko miss for a known symbol — uncommon; fall through to dex
    }

    // Mint-address-or-unknown path: try DexScreener
    const ds = await fetchDexScreener(raw);
    if (ds) {
      return {
        ok: true,
        message: `${ds.symbol} price: $${ds.priceUsd.toFixed(ds.priceUsd < 1 ? 6 : 4)} (DexScreener)`,
        data: { ...ds },
      };
    }

    return {
      ok: false,
      message: `Could not resolve price for "${raw}". Try a known symbol or a Solana mint address.`,
    };
  },
};
