/**
 * Starter recipes — pre-composed agent graphs that deploy with one
 * click and **work out of the box** with just a Commonstack BYOK key.
 *
 * v1.1 trim: every recipe in the gallery has been stress-tested to
 * succeed on first run without user configuration. Recipes that
 * previously needed user-supplied pubkeys, allowlisted merchants, or
 * KAST destinations were removed from the gallery. Users who want
 * to compose those flows should start blank — the composer's full
 * surface area is the right tool for graphs that need vault-specific
 * configuration.
 *
 * The three recipes that survived:
 *
 *   1. Daily Solana brief — LLM → log → signal
 *      Pure LLM. No chain ops. Works on first run as long as the
 *      user has any LLM provider key.
 *
 *   2. Wallet watcher — http → llm → signal
 *      Polls Solana RPC for the Kyvern policy program's recent
 *      signatures (a public address that always has activity), asks
 *      the LLM whether anything's noteworthy, posts to inbox. No
 *      chain ops. Works on first run.
 *
 *   3. Vault digest — llm → signal
 *      End-of-day "how was my day" summary. No HTTP, no chain. Pure
 *      LLM with a prompt that doesn't pretend to know the user's
 *      activity (composer can edit it to wire in real data).
 *
 * All three default to Commonstack/gpt-oss-120b. The composer is
 * always one click away if a user wants to add chain ops.
 */

import { randomUUID } from "@/lib/uuid-shim";
import type { AgentGraph } from "./types";

export interface RecipeDef {
  id: string;
  name: string;
  emoji: string;
  /** One-line tagline shown on the gallery card. */
  description: string;
  /** Longer story for the detail panel. */
  longDescription: string;
  /** Categorical tag for the gallery filter. */
  tag: "ai" | "spend" | "watch" | "earn" | "scheduled";
  graph: AgentGraph;
}

const COMMONSTACK_DEFAULT_MODEL = "openai/gpt-oss-120b";

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

/* ─── 1. Daily Solana brief (LLM → log → signal) ─────────────── */

const dailySolanaBrief: RecipeDef = {
  id: "daily-solana-brief",
  name: "Daily Solana brief",
  emoji: "🧠",
  description: "Every morning your agent writes a short Solana market brief and posts it to your inbox.",
  longDescription:
    "Once a day at 8am UTC, your agent prompts your LLM (BYOK) for a 3-bullet " +
    "summary of what's worth knowing about Solana right now — protocol news, " +
    "ecosystem launches, notable on-chain moves. The result is logged to your " +
    "event feed AND emitted as an inbox finding so you can scan it without " +
    "clicking into the device. Pure LLM — no chain ops, works on first run " +
    "with just a Commonstack key.",
  tag: "ai",
  graph: {
    version: 1,
    trigger: { kind: "cron", expr: "0 8 * * *" }, // daily at 8am UTC
    config: { maxRunsPerDay: 3, maxCostPerRunUsd: 0.10 },
    steps: [
      {
        id: newId("step"),
        type: "llm",
        label: "Generate brief",
        outputVar: "brief",
        config: {
          provider: "commonstack",
          model: COMMONSTACK_DEFAULT_MODEL,
          system:
            "Output exactly 3 bullets about Solana, no preamble. Each " +
            "bullet 1 short sentence prefixed with '• '. Topics: a " +
            "protocol fact, an ecosystem theme, a developer takeaway. " +
            "Generic is fine — be useful, not breaking news.",
          prompt: "3 bullets:",
          maxTokens: 2000,
          temperature: 0.7,
        },
      },
      {
        id: newId("step"),
        type: "log",
        label: "Log to feed",
        config: {
          message: "📰 Solana brief · {{brief.text}}",
          level: "info",
        },
      },
      {
        id: newId("step"),
        type: "signal",
        label: "Post to inbox",
        config: {
          kind: "daily_brief",
          subject: "Today's Solana brief",
          evidence: "{{brief.text}}",
          suggestion: "",
          sourceUrl: "",
        },
      },
    ],
  },
};

/* ─── 2. Wallet watcher (HTTP → LLM → signal) ────────────────── */
//
// Defaults to watching the Kyvern policy program's public address —
// always has signatures, so the LLM always has something to assess.
// User can edit the address in the composer to watch their own.

const POLICY_PROGRAM_PUBKEY = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

const walletWatcher: RecipeDef = {
  id: "wallet-watcher",
  name: "Wallet watcher",
  emoji: "🔍",
  description: "Poll a Solana address every 15 minutes; LLM judges if activity is noteworthy.",
  longDescription:
    "Every 15 minutes, fetches the latest signatures from public Solana RPC " +
    "for a watched address (defaults to the Kyvern policy program — always " +
    "active, so the loop runs end-to-end on first deploy). Asks your LLM " +
    "whether anything looks noteworthy, emits an inbox finding when it does. " +
    "No money moves — pure observation. Edit the watched address in the " +
    "composer to point at your own counterparty / cold wallet / treasury.",
  tag: "watch",
  graph: {
    version: 1,
    // 24h interval by default — daily check-in. The composer's
    // trigger picker can drop it to 15min if the user wants tighter
    // monitoring; at that cadence the Commonstack cost is still
    // negligible (< $0.05/day).
    trigger: { kind: "interval", ms: 86_400_000 },
    config: { maxRunsPerDay: 100, maxCostPerRunUsd: 0.05 },
    steps: [
      {
        id: newId("step"),
        type: "http",
        label: "Fetch recent signatures",
        outputVar: "signatures",
        config: {
          method: "POST",
          url: "https://api.devnet.solana.com",
          headers: { "Content-Type": "application/json" },
          body: {
            jsonrpc: "2.0",
            id: 1,
            method: "getSignaturesForAddress",
            params: [POLICY_PROGRAM_PUBKEY, { limit: 5 }],
          },
          payShWrap: false,
          timeoutMs: 30_000,
        },
      },
      {
        id: newId("step"),
        type: "llm",
        label: "Assess significance",
        outputVar: "assessment",
        config: {
          provider: "commonstack",
          model: COMMONSTACK_DEFAULT_MODEL,
          system:
            "You're a wallet-watching analyst. Given recent Solana " +
            "signatures (RPC JSON), summarize the most recent activity " +
            "in one short sentence. Don't fabricate detail you can't " +
            "infer from the data. Plain prose, no markdown.",
          prompt: "Recent signatures: {{signatures.body}}",
          maxTokens: 1500,
          temperature: 0,
        },
      },
      {
        id: newId("step"),
        type: "signal",
        label: "Post to inbox",
        config: {
          kind: "wallet_watch",
          subject: "Wallet activity check",
          evidence: "{{assessment.text}}",
          suggestion: "Click the source URL to see recent txs on Explorer.",
          sourceUrl: `https://explorer.solana.com/address/${POLICY_PROGRAM_PUBKEY}?cluster=devnet`,
        },
      },
    ],
  },
};

/* ─── 3. Vault digest (LLM → signal) ─────────────────────────── */

const vaultDigest: RecipeDef = {
  id: "vault-digest",
  name: "Vault digest",
  emoji: "📜",
  description: "Daily LLM-written summary card that lands in your inbox at 9pm UTC.",
  longDescription:
    "At 9pm UTC daily, asks your LLM for a calm 2-3 sentence end-of-day " +
    "card describing the kind of activity a Solana vault might have had. " +
    "Pure LLM — no real activity wired in. Use this as the shell; the " +
    "composer can add an HTTP step that fetches your vault's events into " +
    "the LLM context for a real digest.",
  tag: "ai",
  graph: {
    version: 1,
    trigger: { kind: "cron", expr: "0 21 * * *" },
    config: { maxRunsPerDay: 2, maxCostPerRunUsd: 0.10 },
    steps: [
      {
        id: newId("step"),
        type: "llm",
        label: "Write digest",
        outputVar: "digest",
        config: {
          provider: "commonstack",
          model: COMMONSTACK_DEFAULT_MODEL,
          system:
            "You write calm 2-3 sentence end-of-day summaries for a " +
            "Solana vault owner. Tone: factual, brief, lightly warm. " +
            "Mention typical activity (a few payments, on-chain " +
            "checks, allowlist updates) without inventing specifics. " +
            "No markdown, no lists.",
          prompt: "Today's vault digest:",
          maxTokens: 1500,
          temperature: 0.6,
        },
      },
      {
        id: newId("step"),
        type: "signal",
        label: "Post digest to inbox",
        config: {
          kind: "vault_digest",
          subject: "Today's vault digest",
          evidence: "{{digest.text}}",
          suggestion: "",
          sourceUrl: "",
        },
      },
    ],
  },
};

/* ─── Export ─────────────────────────────────────────────────── */

export const RECIPES: RecipeDef[] = [
  dailySolanaBrief,
  walletWatcher,
  vaultDigest,
];

export function getRecipeById(id: string): RecipeDef | null {
  return RECIPES.find((r) => r.id === id) ?? null;
}

export function cloneRecipeGraph(recipe: RecipeDef): AgentGraph {
  return regenerateStepIds(recipe.graph);
}

export function regenerateStepIds(graph: AgentGraph): AgentGraph {
  return {
    ...graph,
    steps: graph.steps.map(regenStepId),
  };
}

function regenStepId<T extends AgentGraph["steps"][number]>(step: T): T {
  const fresh = { ...step, id: newId("step") } as T;
  if (fresh.type === "branch") {
    fresh.config = {
      ...fresh.config,
      then: fresh.config.then.map(regenStepId),
      else: fresh.config.else.map(regenStepId),
    };
  } else if (fresh.type === "loop") {
    fresh.config = {
      ...fresh.config,
      body: fresh.config.body.map(regenStepId),
    };
  }
  return fresh;
}
