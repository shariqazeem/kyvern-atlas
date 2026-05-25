// Tiered Solana RPC — central place every Connection in this codebase
// should be built from.
//
// Why:
//   The public Solana RPCs (api.devnet.solana.com, api.mainnet-beta.solana.com)
//   are heavily rate-limited. Burst load — a UI page that fans out ~10
//   getAccountInfo calls in parallel — frequently trips them, returning
//   HTTP 429 or a JSON-RPC body with `{ error: { code: -32429, message:
//   "max usage reached" } }`. The errors surface to users as
//   "ata_prep_failed" / "sandbox setup hiccup".
//
// Trigger-aware tiers:
//   Two RPC profiles, picked by the caller's `trigger` flag:
//
//   • "user"       Use the paid Helius (or QuickNode etc) endpoint FIRST.
//                  These calls are user-driven — vault create, vault pay,
//                  ATA prep on the funding page. Total daily call count
//                  is bounded.
//   • "background" Use ONLY the public RPC. These calls come from
//                  background loops — atlas-runner, atlas-attacker,
//                  agent-pool, auto-drip. Hitting them all to Helius
//                  would burn the 1M-credit quota in days.
//
//   Default is "background" so a forgotten flag never drains the paid
//   plan. API routes that respond to a user action explicitly opt in to
//   "user" tier.
//
// What:
//   This module builds a Connection backed by a custom fetch that:
//     1. Tries every configured endpoint in the trigger's tier in order
//     2. Treats HTTP 429 / 5xx AND JSON-RPC -32429 as "rotate to next tier"
//     3. Applies a small backoff between tiers
//     4. Surfaces a single descriptive error when every tier is exhausted
//
// How to configure (set any of these in .env.local / pm2 env):
//
//   # SIMPLE: a Helius API key — used for the "user" tier on both networks.
//   KYVERN_SOLANA_HELIUS_KEY=ef291a68-…
//
//   # ADVANCED: explicit tier lists (comma-separated, most-preferred first).
//   # Per-trigger:
//   KYVERN_SOLANA_DEVNET_RPCS_USER=https://devnet.helius-rpc.com/?api-key=…
//   KYVERN_SOLANA_DEVNET_RPCS_BG=https://api.devnet.solana.com
//   KYVERN_SOLANA_MAINNET_RPCS_USER=https://mainnet.helius-rpc.com/?api-key=…
//   KYVERN_SOLANA_MAINNET_RPCS_BG=https://api.mainnet-beta.solana.com
//
//   # Legacy single-list env (applied to USER tier only — explicit list):
//   KYVERN_SOLANA_DEVNET_RPCS=…
//   KYVERN_SOLANA_MAINNET_RPCS=…
//
//   # Legacy singular env (applied to USER tier only):
//   SOLANA_DEVNET_RPC=…
//   SOLANA_MAINNET_RPC=…
//   KYVERN_SOLANA_RPC_URL=…
//
//   # Provider-specific (USER tier, appended after the primary list):
//   HELIUS_RPC_URL_DEVNET=…
//   HELIUS_RPC_URL_MAINNET=…
//   QUICKNODE_RPC_URL_DEVNET=…
//   QUICKNODE_RPC_URL_MAINNET=…
//
//   The public RPC is always appended last as a final fallback on the
//   USER tier; the BACKGROUND tier is public-only.

import { Connection, type Commitment } from "@solana/web3.js";

export type SolanaNetwork = "mainnet" | "devnet";

/**
 * Whether the caller is responding to a user action ("user") or running
 * a background loop ("background"). User-mode reaches for paid Helius
 * first; background-mode stays on public RPC so loops don't drain quota.
 *
 * Default is "background" — a forgotten flag will never burn paid credits.
 */
export type RpcTrigger = "user" | "background";

const PUBLIC_FALLBACK: Record<SolanaNetwork, string> = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
};

/** Backoff schedule indexed by tier — applied AFTER a tier fails. */
const TIER_BACKOFF_MS = [120, 320, 700, 1400];

function heliusUrlFor(network: SolanaNetwork): string | null {
  const key = process.env.KYVERN_SOLANA_HELIUS_KEY?.trim();
  if (!key) return null;
  const host =
    network === "mainnet"
      ? "mainnet.helius-rpc.com"
      : "devnet.helius-rpc.com";
  return `https://${host}/?api-key=${key}`;
}

function pushIfNew(out: string[], seen: Set<string>, url: string | null | undefined): void {
  if (!url) return;
  const trimmed = url.trim();
  if (!trimmed) return;
  if (seen.has(trimmed)) return;
  seen.add(trimmed);
  out.push(trimmed);
}

/**
 * Resolve the ordered list of RPC endpoints for a network + trigger.
 *
 *   trigger="user"       → Helius first (if KYVERN_SOLANA_HELIUS_KEY or
 *                          any provider URL is set), public RPC last.
 *   trigger="background" → public RPC only. Background loops never burn
 *                          paid quota.
 *
 * Always returns at least one URL (the public fallback).
 */
export function tieredRpcUrls(
  network: SolanaNetwork,
  trigger: RpcTrigger = "background",
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  if (trigger === "user") {
    // 1. Per-trigger explicit list (most preferred).
    const userListKey =
      network === "mainnet"
        ? "KYVERN_SOLANA_MAINNET_RPCS_USER"
        : "KYVERN_SOLANA_DEVNET_RPCS_USER";
    const userList = process.env[userListKey];
    if (userList) {
      for (const url of userList.split(",").map((s) => s.trim()).filter(Boolean)) {
        pushIfNew(out, seen, url);
      }
    }

    // 2. Single Helius API key — synthesized to provider URL.
    pushIfNew(out, seen, heliusUrlFor(network));

    // 3. Legacy single-list env vars (treated as user tier).
    const legacyListKey =
      network === "mainnet"
        ? "KYVERN_SOLANA_MAINNET_RPCS"
        : "KYVERN_SOLANA_DEVNET_RPCS";
    const legacyList = process.env[legacyListKey];
    if (legacyList) {
      for (const url of legacyList.split(",").map((s) => s.trim()).filter(Boolean)) {
        pushIfNew(out, seen, url);
      }
    }

    // 4. Legacy singular env vars + generic catch-all (user tier).
    pushIfNew(
      out,
      seen,
      network === "mainnet"
        ? process.env.SOLANA_MAINNET_RPC
        : process.env.SOLANA_DEVNET_RPC,
    );
    pushIfNew(out, seen, process.env.KYVERN_SOLANA_RPC_URL);

    // 5. Provider-specific keys.
    const providerKeys = [
      `HELIUS_RPC_URL_${network.toUpperCase()}`,
      `QUICKNODE_RPC_URL_${network.toUpperCase()}`,
      `TRITON_RPC_URL_${network.toUpperCase()}`,
      `ALCHEMY_RPC_URL_${network.toUpperCase()}`,
    ];
    for (const k of providerKeys) {
      pushIfNew(out, seen, process.env[k]);
    }
  } else {
    // BACKGROUND TIER — public-only. We accept an explicit override so
    // operators can point background loops at a private RPC of their own
    // (e.g., a self-hosted Solana validator), but we NEVER reach for the
    // Helius key here.
    const bgListKey =
      network === "mainnet"
        ? "KYVERN_SOLANA_MAINNET_RPCS_BG"
        : "KYVERN_SOLANA_DEVNET_RPCS_BG";
    const bgList = process.env[bgListKey];
    if (bgList) {
      for (const url of bgList.split(",").map((s) => s.trim()).filter(Boolean)) {
        pushIfNew(out, seen, url);
      }
    }
  }

  // Always end with the public RPC fallback.
  pushIfNew(out, seen, PUBLIC_FALLBACK[network]);

  return out;
}

/**
 * Build a Connection that rotates through tiered endpoints when one
 * returns a rate-limit (HTTP 429 / 5xx / JSON-RPC -32429 / "max usage").
 *
 * Notes for callers:
 *   - The Connection is constructed with the FIRST endpoint as its
 *     `_rpcEndpoint`, but all HTTP calls go through `fetchMiddleware`
 *     which ignores the URL passed in and walks the tier list. This
 *     means subscription URLs (websockets) still target tier-0 — we
 *     don't currently use ws subscriptions in this codebase so that's
 *     acceptable.
 *   - When EVERY tier rate-limits in one call, we throw a single error
 *     `RpcTiersExhausted: …` that callers can pattern-match on for
 *     user-facing copy ("RPC is throttled — try again in a moment").
 */
export function tieredConnection(
  network: SolanaNetwork = "devnet",
  commitment: Commitment = "confirmed",
  opts: { trigger?: RpcTrigger } = {},
): Connection {
  const urls = tieredRpcUrls(network, opts.trigger ?? "background");
  // The Solana SDK requires a URL string in the constructor even when we
  // override fetch — pass the first as a sensible default.
  return new Connection(urls[0]!, {
    commitment,
    fetch: makeTieredFetch(urls),
  });
}

/**
 * The custom fetch that wraps the tier list. Exported for use in tests.
 *
 * Detection of "rate limited":
 *   - HTTP 429 anywhere
 *   - HTTP 502/503/504 (treat as transient — try next tier)
 *   - JSON-RPC error code = -32429
 *   - JSON-RPC error message contains "too many requests" / "max usage" / "rate"
 */
export function makeTieredFetch(urls: string[]): typeof fetch {
  if (urls.length === 0) throw new Error("tieredFetch: no RPC URLs configured");

  return (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const failures: string[] = [];

    for (let tier = 0; tier < urls.length; tier++) {
      const url = urls[tier]!;
      const host = hostOf(url);

      let resp: Response;
      try {
        resp = await fetch(url, init);
      } catch (e) {
        failures.push(`${host}: network ${(e as Error)?.message ?? e}`);
        await sleepIfMore(tier, urls.length);
        continue;
      }

      // HTTP-level rate-limit / transient
      if (
        resp.status === 429 ||
        resp.status === 502 ||
        resp.status === 503 ||
        resp.status === 504
      ) {
        failures.push(`${host}: HTTP ${resp.status}`);
        await sleepIfMore(tier, urls.length);
        continue;
      }

      // Non-2xx other → return as-is so the SDK surfaces it normally.
      if (!resp.ok) {
        return resp;
      }

      // 200 OK — peek at the JSON-RPC envelope for -32429 / rate text.
      // We must clone so the SDK can still read the body once.
      let bodyText: string;
      try {
        bodyText = await resp.clone().text();
      } catch {
        return resp;
      }
      if (isJsonRpcRateLimited(bodyText)) {
        failures.push(`${host}: jsonrpc rate limit (200)`);
        await sleepIfMore(tier, urls.length);
        continue;
      }
      return resp;
    }

    throw new Error(
      `RpcTiersExhausted: all ${urls.length} Solana RPC endpoints rate-limited or unreachable · ${failures.join(" · ")}`,
    );
  }) as typeof fetch;
}

function isJsonRpcRateLimited(bodyText: string): boolean {
  // Cheap text test first — most bodies are plain JSON-RPC.
  if (!bodyText.includes('"error"')) return false;
  if (bodyText.includes("-32429") || bodyText.includes('"code":429')) return true;
  const lowered = bodyText.toLowerCase();
  return (
    lowered.includes("too many requests") ||
    lowered.includes("max usage") ||
    lowered.includes("rate limited") ||
    lowered.includes("rate exceeded")
  );
}

function sleepIfMore(tier: number, total: number): Promise<void> {
  if (tier >= total - 1) return Promise.resolve(); // last tier — don't sleep, just throw
  const ms = TIER_BACKOFF_MS[Math.min(tier, TIER_BACKOFF_MS.length - 1)] ?? 200;
  return new Promise((r) => setTimeout(r, ms));
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.slice(0, 60);
  }
}

/**
 * Convenience predicate so API routes can map errors to friendly copy.
 *
 *   if (isRpcRateLimitedError(e)) {
 *     return Response.json({ error: "rpc_rate_limited", retryHint: "…" }, { status: 503 });
 *   }
 */
export function isRpcRateLimitedError(e: unknown): boolean {
  if (!e) return false;
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("RpcTiersExhausted") ||
    msg.includes("429") ||
    msg.includes("-32429") ||
    msg.toLowerCase().includes("max usage")
  );
}
