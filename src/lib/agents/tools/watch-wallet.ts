/**
 * Wallet-watching tools.
 *
 * Two tools share the same RPC + parsing core:
 *   · `watch_wallet`        — generic recent-activity feed with type
 *                              detection (swap / transfer / mint / call).
 *                              Useful when an agent's job is exploratory.
 *   · `watch_wallet_swaps`  — specialized: Jupiter swaps only, with USD
 *                              valuation, optional minUsdThreshold filter.
 *                              Built so jobs like "alert me when wallet X
 *                              swaps >$500 on Jupiter" actually deliver.
 *
 * Both default to **mainnet** RPC for the watched address (read-only).
 * Override with `SOLANA_MAINNET_RPC` in env. The agent's own vault
 * transactions still use the devnet RPC — this tool is purely a lens
 * onto the outside world.
 *
 * Address validation: rejects Ethereum-style addresses (0x...) with a
 * helpful message instead of silently failing 30 cycles in a row.
 */

import type { AgentTool, AgentToolResult } from "../types";
import { PublicKey } from "@solana/web3.js";

const JUPITER_PROGRAM_IDS = [
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // V6 (current)
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB", // V4 (legacy)
  "JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph", // V3
];

const SOL_MINT = "So11111111111111111111111111111111111111112"; // wrapped SOL
const KNOWN_STABLES = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
]);

interface RpcSig {
  signature: string;
  slot: number;
  err: unknown;
  blockTime: number | null;
}

interface ParsedTx {
  meta: {
    preTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      owner?: string;
      uiTokenAmount?: { uiAmount?: number | null; decimals?: number };
    }>;
    postTokenBalances?: Array<{
      accountIndex: number;
      mint: string;
      owner?: string;
      uiTokenAmount?: { uiAmount?: number | null; decimals?: number };
    }>;
    preBalances?: number[];
    postBalances?: number[];
    fee?: number;
  } | null;
  transaction: {
    message: {
      accountKeys: Array<{ pubkey: string } | string>;
      instructions: Array<{ programId?: string; program?: string }>;
    };
  };
}

interface SwapDetail {
  signature: string;
  timestamp: number | null;
  tokenInMint: string;
  tokenInAmount: number;
  tokenOutMint: string;
  tokenOutAmount: number;
  valueUsd: number | null;
  jupiterVersion: string | null;
}

interface ActivityEntry {
  signature: string;
  timestamp: number | null;
  type: "swap" | "transfer" | "program_call" | "unknown";
  programs: string[];
  netSolDeltaSol: number;
  tokenChanges: Array<{ mint: string; delta: number }>;
}

/* ─── shared helpers ─── */

function detectAddressType(addr: string): "solana" | "ethereum" | "invalid" {
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) return "ethereum";
  try {
    new PublicKey(addr);
    return "solana";
  } catch {
    return "invalid";
  }
}

function mainnetRpc(): string {
  return process.env.SOLANA_MAINNET_RPC ?? "https://api.mainnet-beta.solana.com";
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(mainnetRpc(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.result ?? null) as T | null;
  } catch {
    return null;
  }
}

function programIdsFromTx(tx: ParsedTx): string[] {
  const out = new Set<string>();
  for (const ix of tx.transaction?.message?.instructions ?? []) {
    if (ix.programId) out.add(ix.programId);
  }
  for (const k of tx.transaction?.message?.accountKeys ?? []) {
    const pubkey = typeof k === "string" ? k : k.pubkey;
    if (pubkey) out.add(pubkey);
  }
  return Array.from(out);
}

function tokenDeltasForOwner(tx: ParsedTx, owner: string): Array<{ mint: string; delta: number }> {
  const map = new Map<string, number>();
  const pre = tx.meta?.preTokenBalances ?? [];
  const post = tx.meta?.postTokenBalances ?? [];
  for (const b of pre) {
    if (b.owner !== owner) continue;
    const amt = Number(b.uiTokenAmount?.uiAmount ?? 0);
    map.set(b.mint, (map.get(b.mint) ?? 0) - amt);
  }
  for (const b of post) {
    if (b.owner !== owner) continue;
    const amt = Number(b.uiTokenAmount?.uiAmount ?? 0);
    map.set(b.mint, (map.get(b.mint) ?? 0) + amt);
  }
  const result: Array<{ mint: string; delta: number }> = [];
  for (const [mint, delta] of map.entries()) {
    if (Math.abs(delta) > 1e-9) result.push({ mint, delta });
  }
  return result;
}

function netSolDelta(tx: ParsedTx, accountIndex: number): number {
  const pre = tx.meta?.preBalances?.[accountIndex] ?? 0;
  const post = tx.meta?.postBalances?.[accountIndex] ?? 0;
  return (post - pre) / 1e9;
}

function findAccountIndex(tx: ParsedTx, address: string): number {
  const keys = tx.transaction?.message?.accountKeys ?? [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const pubkey = typeof k === "string" ? k : k.pubkey;
    if (pubkey === address) return i;
  }
  return -1;
}

async function fetchDexScreenerPrice(mint: string): Promise<number | null> {
  if (KNOWN_STABLES.has(mint)) return 1;
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`, {
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { pairs?: Array<{ priceUsd?: string; liquidity?: { usd?: number } }> };
    const pairs = json.pairs ?? [];
    if (pairs.length === 0) return null;
    const best = pairs.reduce((a, b) => ((a.liquidity?.usd ?? 0) >= (b.liquidity?.usd ?? 0) ? a : b));
    const p = parseFloat(best.priceUsd ?? "0");
    return isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

async function valueSwapUsd(
  inMint: string,
  inAmount: number,
  outMint: string,
  outAmount: number,
): Promise<number | null> {
  // Prefer the stable side (known $1)
  if (KNOWN_STABLES.has(inMint)) return inAmount;
  if (KNOWN_STABLES.has(outMint)) return outAmount;
  // Otherwise pick the side that gets a price
  const [pIn, pOut] = await Promise.all([fetchDexScreenerPrice(inMint), fetchDexScreenerPrice(outMint)]);
  if (pIn !== null) return inAmount * pIn;
  if (pOut !== null) return outAmount * pOut;
  return null;
}

function shortMint(mint: string): string {
  if (mint === SOL_MINT) return "SOL";
  if (mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") return "USDC";
  if (mint === "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB") return "USDT";
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

function validateAddressOrError(address: string): AgentToolResult | null {
  const t = detectAddressType(address);
  if (t === "ethereum") {
    return {
      ok: false,
      message: `That looks like an Ethereum address (${address.slice(0, 8)}…). Solana uses base58 (e.g. 7Yk8…bWqA, ~44 chars). Tell your owner you need a Solana address — Ethereum-format wallets can't be watched on Solana.`,
    };
  }
  if (t === "invalid") {
    return {
      ok: false,
      message: `Not a valid Solana address: ${address}. A valid one is base58, 32–44 characters.`,
    };
  }
  return null;
}

/* ─── Tool 1: watch_wallet (generic) ─── */

export const watchWalletTool: AgentTool = {
  id: "watch_wallet",
  name: "Watch wallet activity",
  description:
    "Scan a Solana wallet's recent transactions on mainnet and return a parsed activity feed (swap / transfer / program call). Use when your job is to watch a wallet for any kind of meaningful action. Returns up to 15 entries.",
  category: "read",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "The Solana wallet address to watch (base58, mainnet).",
      },
      lookbackCount: {
        type: "number",
        description: "How many recent signatures to scan (1–25, default 10).",
      },
    },
    required: ["address"],
  },
  execute: async (_ctx, input): Promise<AgentToolResult> => {
    const address = String(input.address ?? "").trim();
    if (!address) return { ok: false, message: "address required" };
    const invalid = validateAddressOrError(address);
    if (invalid) return invalid;

    const limit = Math.min(Math.max(Number(input.lookbackCount ?? 10), 1), 25);

    const sigs = await rpcCall<RpcSig[]>("getSignaturesForAddress", [address, { limit }]);
    if (!sigs) return { ok: false, message: "Mainnet RPC unavailable; try again." };
    if (sigs.length === 0) {
      return {
        ok: true,
        message: `No recent activity for ${address.slice(0, 8)}…`,
        data: { entries: [], scanned: 0, watchedAddress: address },
      };
    }

    const successSigs = sigs.filter((s) => s.err === null).slice(0, 12);
    const entries: ActivityEntry[] = [];

    for (const s of successSigs) {
      const tx = await rpcCall<ParsedTx | null>("getTransaction", [
        s.signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ]);
      if (!tx) continue;

      const programs = programIdsFromTx(tx);
      const tokenChanges = tokenDeltasForOwner(tx, address);
      const idx = findAccountIndex(tx, address);
      const solDelta = idx >= 0 ? netSolDelta(tx, idx) : 0;

      let type: ActivityEntry["type"] = "unknown";
      const isJupiter = programs.some((p) => JUPITER_PROGRAM_IDS.includes(p));
      const tokenChangeCount = tokenChanges.length;
      if (isJupiter && tokenChangeCount >= 2) type = "swap";
      else if (tokenChangeCount === 1 || Math.abs(solDelta) > 0.0001) type = "transfer";
      else if (programs.length > 0) type = "program_call";

      entries.push({
        signature: s.signature,
        timestamp: s.blockTime,
        type,
        programs,
        netSolDeltaSol: solDelta,
        tokenChanges,
      });
    }

    const summary =
      entries.length === 0
        ? `Scanned ${successSigs.length} txs, none parseable.`
        : `Scanned ${successSigs.length} txs: ${entries.filter((e) => e.type === "swap").length} swap, ${entries.filter((e) => e.type === "transfer").length} transfer, ${entries.filter((e) => e.type === "program_call").length} other.`;

    return {
      ok: true,
      message: summary,
      data: { entries, scanned: successSigs.length, watchedAddress: address },
    };
  },
};

/* ─── Tool 2: watch_wallet_swaps (specialized) ─── */

export const watchWalletSwapsTool: AgentTool = {
  id: "watch_wallet_swaps",
  name: "Detect Jupiter swaps for a wallet",
  description:
    "Scan a Solana wallet's recent transactions on mainnet and return ONLY Jupiter swaps, valued in USD. Pre-filters by minUsdThreshold (default $100) so dust swaps never reach the worker. To loosen the floor for a particular job, pass minUsdThreshold explicitly (e.g. 25 for low-cap watching, 0 to see everything).",
  category: "read",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "The Solana wallet address to watch (base58, mainnet).",
      },
      lookbackCount: {
        type: "number",
        description: "How many recent signatures to scan (1–50, default 25).",
      },
      minUsdThreshold: {
        type: "number",
        description:
          "Minimum swap value in USD to return. DEFAULT 100 — anything smaller is treated as dust and never returned. Pass 0 to disable the filter, or a different positive number to tighten/loosen.",
      },
    },
    required: ["address"],
  },
  execute: async (_ctx, input): Promise<AgentToolResult> => {
    const address = String(input.address ?? "").trim();
    if (!address) return { ok: false, message: "address required" };
    const invalid = validateAddressOrError(address);
    if (invalid) return invalid;

    const limit = Math.min(Math.max(Number(input.lookbackCount ?? 25), 1), 50);
    // Default $100 floor — keeps dust swaps from polluting the
    // worker's context. The chip jobs that want lower thresholds
    // pass them explicitly; the LLM never lands on $0.0008 swaps
    // by accident.
    const rawThreshold = input.minUsdThreshold;
    const minUsd =
      rawThreshold === undefined || rawThreshold === null
        ? 100
        : Math.max(0, Number(rawThreshold));

    const sigs = await rpcCall<RpcSig[]>("getSignaturesForAddress", [address, { limit }]);
    if (!sigs) return { ok: false, message: "Mainnet RPC unavailable; try again." };
    if (sigs.length === 0) {
      return {
        ok: true,
        message: `No recent activity for ${address.slice(0, 8)}…`,
        data: { swaps: [], scanned: 0, watchedAddress: address },
      };
    }

    const successSigs = sigs.filter((s) => s.err === null).slice(0, 18);
    const swaps: SwapDetail[] = [];

    for (const s of successSigs) {
      const tx = await rpcCall<ParsedTx | null>("getTransaction", [
        s.signature,
        { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
      ]);
      if (!tx) continue;

      const programs = programIdsFromTx(tx);
      const jupVer = JUPITER_PROGRAM_IDS.find((p) => programs.includes(p));
      if (!jupVer) continue;

      const deltas = tokenDeltasForOwner(tx, address);
      if (deltas.length < 2) continue;

      // Pick the largest negative (input) and largest positive (output)
      const sortedNeg = deltas.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta);
      const sortedPos = deltas.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta);
      const tokenIn = sortedNeg[0];
      const tokenOut = sortedPos[0];
      if (!tokenIn || !tokenOut) continue;

      const valueUsd = await valueSwapUsd(
        tokenIn.mint,
        Math.abs(tokenIn.delta),
        tokenOut.mint,
        tokenOut.delta,
      );

      if (valueUsd !== null && valueUsd < minUsd) continue;
      // If we couldn't price it AND minUsd > 0, skip — can't satisfy the gate
      if (valueUsd === null && minUsd > 0) continue;

      swaps.push({
        signature: s.signature,
        timestamp: s.blockTime,
        tokenInMint: tokenIn.mint,
        tokenInAmount: Math.abs(tokenIn.delta),
        tokenOutMint: tokenOut.mint,
        tokenOutAmount: tokenOut.delta,
        valueUsd,
        jupiterVersion: jupVer === JUPITER_PROGRAM_IDS[0] ? "v6" : jupVer === JUPITER_PROGRAM_IDS[1] ? "v4" : "v3",
      });
    }

    const filterMsg = minUsd > 0 ? ` (≥$${minUsd})` : "";
    const summary =
      swaps.length === 0
        ? `No qualifying Jupiter swaps${filterMsg} in last ${successSigs.length} txs for ${address.slice(0, 8)}…`
        : `Found ${swaps.length} Jupiter swap${swaps.length === 1 ? "" : "s"}${filterMsg} for ${address.slice(0, 8)}…: ${swaps
            .slice(0, 3)
            .map(
              (sw) =>
                `${sw.tokenInAmount.toFixed(2)} ${shortMint(sw.tokenInMint)} → ${sw.tokenOutAmount.toFixed(2)} ${shortMint(sw.tokenOutMint)}${sw.valueUsd !== null ? ` ($${sw.valueUsd.toFixed(2)})` : ""}`,
            )
            .join(" · ")}`;

    return {
      ok: true,
      message: summary,
      data: { swaps, scanned: successSigs.length, watchedAddress: address },
    };
  },
};
