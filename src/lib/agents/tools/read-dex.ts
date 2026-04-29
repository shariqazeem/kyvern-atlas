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

/** Compute deterministic band-breach state. The tool does the math
 *  so the LLM doesn't have to — Token Pulse jobs end up with a
 *  reliable `breach` field they can branch on instead of fuzzy
 *  "is $0.187761 outside [0.30, 0.80]" comparisons. */
function computeBand(
  priceUsd: number,
  lower?: number | null,
  upper?: number | null,
): {
  hasBand: boolean;
  inBand: boolean;
  breach: "lower" | "upper" | null;
  lowerBand: number | null;
  upperBand: number | null;
} {
  const l =
    typeof lower === "number" && Number.isFinite(lower) && lower > 0
      ? lower
      : null;
  const u =
    typeof upper === "number" && Number.isFinite(upper) && upper > 0
      ? upper
      : null;
  const hasBand = l !== null || u !== null;
  if (!hasBand) {
    return { hasBand: false, inBand: true, breach: null, lowerBand: null, upperBand: null };
  }
  if (l !== null && priceUsd < l) {
    return { hasBand: true, inBand: false, breach: "lower", lowerBand: l, upperBand: u };
  }
  if (u !== null && priceUsd > u) {
    return { hasBand: true, inBand: false, breach: "upper", lowerBand: l, upperBand: u };
  }
  return { hasBand: true, inBand: true, breach: null, lowerBand: l, upperBand: u };
}

export const readDexTool: AgentTool = {
  id: "read_dex",
  name: "Read DEX price",
  description:
    "Get the current USD price of a token, optionally with a band check. Pass lowerBand and/or upperBand to get a deterministic { inBand, breach: 'lower'|'upper'|null } result — use this for Token Pulse style 'alert if outside $X–$Y' jobs so you don't have to do the band math yourself. Pass a known symbol (SOL, USDC, BTC, ETH, BONK, WIF, JUP, PYTH, JTO, RAY, ORCA, PUMP, POPCAT) or a Solana mint address.",
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
      lowerBand: {
        type: "number",
        description:
          "Optional lower price floor in USD. If the returned price is strictly below this, breach='lower' and inBand=false. Omit if no band check needed.",
      },
      upperBand: {
        type: "number",
        description:
          "Optional upper price ceiling in USD. If the returned price is strictly above this, breach='upper' and inBand=false. Omit if no band check needed.",
      },
    },
    required: ["tokenIdOrSymbol"],
  },
  execute: async (_ctx, input) => {
    const raw = String(input.tokenIdOrSymbol ?? "").trim();
    if (!raw) return { ok: false, message: "tokenIdOrSymbol required" };

    const lowerBand =
      typeof input.lowerBand === "number" ? input.lowerBand : null;
    const upperBand =
      typeof input.upperBand === "number" ? input.upperBand : null;

    const upper = raw.toUpperCase();
    const cgId = SYMBOL_TO_COINGECKO_ID[upper];

    // Helper to format the message including band state when set
    const formatMsg = (
      symbol: string,
      priceUsd: number,
      source: string,
      band: ReturnType<typeof computeBand>,
    ) => {
      const priceStr = `$${priceUsd.toFixed(priceUsd < 1 ? 6 : 4)}`;
      const base = `${symbol} price: ${priceStr} (${source})`;
      if (!band.hasBand) return base;
      if (band.breach === "lower") {
        return `${base} — BELOW lower band $${band.lowerBand}. Breach.`;
      }
      if (band.breach === "upper") {
        return `${base} — ABOVE upper band $${band.upperBand}. Breach.`;
      }
      return `${base} — inside band [${band.lowerBand ?? "—"}, ${band.upperBand ?? "—"}]. No breach.`;
    };

    // Symbol path: try CoinGecko first
    if (cgId) {
      const cg = await fetchCoinGecko(cgId);
      if (cg) {
        const band = computeBand(cg.priceUsd, lowerBand, upperBand);
        return {
          ok: true,
          message: formatMsg(cg.symbol, cg.priceUsd, "CoinGecko", band),
          data: { ...cg, ...band },
        };
      }
      // CoinGecko miss for a known symbol — uncommon; fall through to dex
    }

    // Mint-address-or-unknown path: try DexScreener
    const ds = await fetchDexScreener(raw);
    if (ds) {
      const band = computeBand(ds.priceUsd, lowerBand, upperBand);
      return {
        ok: true,
        message: formatMsg(ds.symbol, ds.priceUsd, "DexScreener", band),
        data: { ...ds, ...band },
      };
    }

    return {
      ok: false,
      message: `Could not resolve price for "${raw}". Try a known symbol or a Solana mint address.`,
    };
  },
};
