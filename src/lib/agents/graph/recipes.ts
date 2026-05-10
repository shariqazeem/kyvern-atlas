/**
 * Starter recipes — pre-composed agent graphs the user can deploy
 * with one click and customize.
 *
 * Each recipe is a complete AgentGraph (not a template — the user
 * gets the actual graph and can edit it). The `id` is referenced
 * by the recipe gallery in the builder modal; the rest is just
 * the graph + display copy.
 *
 * Step ids are stable per-recipe so the executor's step output
 * tracking stays consistent across edits. When the user clicks
 * "Deploy", the entire graph is cloned (with new step ids) and
 * persisted to the agent.
 *
 * Pricing assumptions: amounts are tiny ($0.001-$0.05) so a $1
 * vault-funded balance lasts hundreds of runs. Cron schedules are
 * spread out (daily/weekly) to avoid wasted ticks during demos.
 */

import { randomUUID } from "crypto";
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

const ANTHROPIC_DEFAULT_MODEL = "claude-haiku-4-5";
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
const DEEPSEEK_DEFAULT_MODEL = "deepseek-chat";

function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

/* ─── 1. Daily AI inference (LLM + log) ──────────────────────── */

const dailyAiInference: RecipeDef = {
  id: "daily-ai-inference",
  name: "Daily AI inference",
  emoji: "🧠",
  description: "Ask your LLM a question once a day, log the answer to your feed.",
  longDescription:
    "Sends one prompt to Anthropic (BYOK key required) every 24 hours and " +
    "logs the result to your device feed. The simplest possible LLM agent — " +
    "good for daily summaries, scheduled status checks, or just kicking the " +
    "tires on the composer.",
  tag: "ai",
  graph: {
    version: 1,
    trigger: { kind: "interval", ms: 86_400_000 }, // 24h
    config: { maxRunsPerDay: 5, maxCostPerRunUsd: 0.10 },
    steps: [
      {
        id: newId("step"),
        type: "llm",
        label: "Ask Claude",
        outputVar: "answer",
        config: {
          provider: "anthropic",
          model: ANTHROPIC_DEFAULT_MODEL,
          system: "You are a concise assistant. Answer in 1-2 sentences.",
          prompt: "Give me one interesting fact about Solana from this week.",
          maxTokens: 200,
          temperature: 0.7,
        },
      },
      {
        id: newId("step"),
        type: "log",
        label: "Log answer to feed",
        config: {
          message: "📰 Daily AI: {{answer.text}}",
          level: "info",
        },
      },
    ],
  },
};

/* ─── 2. Subscription renewer (vault.pay weekly) ─────────────── */

const subscriptionRenewer: RecipeDef = {
  id: "subscription-renewer",
  name: "Subscription renewer",
  emoji: "🔁",
  description: "Pay an allowlisted x402 endpoint every week.",
  longDescription:
    "Fires a vault.pay() to an allowlisted merchant on a weekly cron. The " +
    "merchant + amount must already be on your vault's allowlist or the chain " +
    "rejects the tx (which is the point — every refusal is verifiable on " +
    "Explorer). Edit the merchant + amount + recipient pubkey to match your " +
    "subscription.",
  tag: "spend",
  graph: {
    version: 1,
    trigger: { kind: "cron", expr: "0 12 * * 1" }, // Mondays at noon UTC
    config: { maxRunsPerDay: 2, maxCostPerRunUsd: 5.00 },
    steps: [
      {
        id: newId("step"),
        type: "vault.pay",
        label: "Renew subscription",
        outputVar: "payment",
        config: {
          merchant: "api.openai.com",
          to: "<paste-allowlisted-recipient-pubkey>",
          amount: 1.00,
          memo: "weekly subscription renewal",
        },
      },
      {
        id: newId("step"),
        type: "log",
        label: "Log result",
        config: {
          message: "Renewal {{payment.signature}} settled · ${{payment.amountUsd}}",
          level: "info",
        },
      },
    ],
  },
};

/* ─── 3. KAST auto-topup (transfer.usdc monthly) ─────────────── */

const kastAutoTopup: RecipeDef = {
  id: "kast-auto-topup",
  name: "KAST auto-topup",
  emoji: "💳",
  description: "Send USDC to your KAST card on the first of every month.",
  longDescription:
    "Once a month, transfers a fixed amount from your vault to your MY_KAST " +
    "destination address (must be allowlisted on the vault first). The transfer " +
    "settles on-chain through the Kyvern policy program — every payout is " +
    "verifiable on Explorer.",
  tag: "spend",
  graph: {
    version: 1,
    trigger: { kind: "cron", expr: "0 9 1 * *" }, // 1st of month, 9am UTC
    config: { maxRunsPerDay: 1, maxCostPerRunUsd: 100 },
    steps: [
      {
        id: newId("step"),
        type: "transfer.usdc",
        label: "Top up KAST",
        outputVar: "transfer",
        config: {
          to: "<paste-MY_KAST-allowlisted-address>",
          amount: 25.00,
          memo: "monthly KAST top-up",
        },
      },
      {
        id: newId("step"),
        type: "log",
        label: "Log payout",
        config: {
          message: "💳 KAST topped up · {{transfer.signature}}",
          level: "info",
        },
      },
    ],
  },
};

/* ─── 4. Wallet watcher (HTTP poll, no money) ────────────────── */

const walletWatcher: RecipeDef = {
  id: "wallet-watcher",
  name: "Wallet watcher",
  emoji: "🔍",
  description: "Poll a Solana address every 15 minutes; log significant moves.",
  longDescription:
    "Hits the Helius API to fetch the SOL + USDC balance of a watched address. " +
    "Logs any balance change to your feed. No money moves — pure observation. " +
    "Replace the address with one you actually care about (e.g. a counterparty " +
    "or your own cold wallet).",
  tag: "watch",
  graph: {
    version: 1,
    trigger: { kind: "interval", ms: 900_000 }, // 15 min
    config: { maxRunsPerDay: 100, maxCostPerRunUsd: 0 },
    steps: [
      {
        id: newId("step"),
        type: "http",
        label: "Fetch balance",
        outputVar: "balance",
        config: {
          method: "GET",
          url: "https://api.devnet.solana.com",
          headers: { "Content-Type": "application/json" },
          body: null,
          payShWrap: false,
          timeoutMs: 30_000,
        },
      },
      {
        id: newId("step"),
        type: "log",
        label: "Log observation",
        config: {
          message: "🔍 Wallet balance check at {{trigger.kind}} · status {{balance.status}}",
          level: "info",
        },
      },
    ],
  },
};

/* ─── 5. Yield rebalancer (branch + vault.pay) ───────────────── */

const yieldRebalancer: RecipeDef = {
  id: "yield-rebalancer",
  name: "Yield rebalancer",
  emoji: "📊",
  description: "When your idle USDC > $X, deploy to an allowlisted yield venue.",
  longDescription:
    "Reads your vault's USDC balance from the feed (currently a stub — the " +
    "real version polls a balance endpoint). If above the threshold, vault.pay " +
    "to the yield venue (must be allowlisted). The branch step lets you set " +
    "different policies for different balance tiers.",
  tag: "spend",
  graph: {
    version: 1,
    trigger: { kind: "interval", ms: 21_600_000 }, // 6h
    config: { maxRunsPerDay: 4, maxCostPerRunUsd: 50 },
    steps: [
      {
        id: newId("step"),
        type: "log",
        label: "Stub: fetch idle balance",
        config: {
          message: "Yield rebalancer ticked at {{trigger.kind}}",
          level: "info",
        },
      },
      {
        id: newId("step"),
        type: "branch",
        label: "Above threshold?",
        config: {
          condition: "1 > 0", // placeholder — user edits to use a real var
          then: [
            {
              id: newId("step"),
              type: "vault.pay",
              label: "Deploy to yield venue",
              config: {
                merchant: "marinade.finance",
                to: "<paste-allowlisted-yield-recipient>",
                amount: 1.00,
                memo: "rebalance into yield",
              },
            },
          ],
          else: [
            {
              id: newId("step"),
              type: "log",
              label: "Below threshold — skip",
              config: { message: "Below threshold; nothing to deploy.", level: "info" },
            },
          ],
        },
      },
    ],
  },
};

/* ─── 6. Tip jar (webhook trigger) ───────────────────────────── */

const tipJar: RecipeDef = {
  id: "tip-jar",
  name: "Tip jar",
  emoji: "🫙",
  description: "Webhook-triggered. Each inbound POST routes a tip to a recipient.",
  longDescription:
    "Listens for POST /api/agents/[id]/webhook/[secret] with a JSON body like " +
    '{ "to": "<address>", "amount": 0.50 }. Pays out from your vault to the ' +
    "recipient (which must be allowlisted). Useful for a Discord bot or a " +
    "personal site that lets fans tip you.",
  tag: "earn",
  graph: {
    version: 1,
    trigger: { kind: "webhook", secret: "REPLACE_WITH_GENERATED_SECRET" },
    config: { maxRunsPerDay: 200, maxCostPerRunUsd: 100 },
    steps: [
      {
        id: newId("step"),
        type: "vault.pay",
        label: "Forward tip",
        outputVar: "payout",
        config: {
          merchant: "tip_jar",
          to: "{{trigger.payload.to}}",
          amount: "{{trigger.payload.amount}}",
          memo: "tip from {{?trigger.payload.from}}",
        },
      },
      {
        id: newId("step"),
        type: "log",
        label: "Log tip",
        config: {
          message: "🫙 Tip {{payout.signature}} · ${{payout.amountUsd}} → {{payout.to}}",
          level: "info",
        },
      },
    ],
  },
};

/* ─── 7. Daily digest (LLM summarizes feed) ──────────────────── */

const dailyDigest: RecipeDef = {
  id: "daily-digest",
  name: "Daily digest",
  emoji: "📜",
  description: "LLM summarizes today's vault activity, posts to your feed.",
  longDescription:
    "Once a day, asks your LLM provider to write a 2-sentence summary of the " +
    "day. The current version uses a static prompt; v1.1 will pipe in the " +
    "vault event feed as context so the digest reflects actual activity.",
  tag: "ai",
  graph: {
    version: 1,
    trigger: { kind: "cron", expr: "0 21 * * *" }, // 9pm UTC daily
    config: { maxRunsPerDay: 2, maxCostPerRunUsd: 0.10 },
    steps: [
      {
        id: newId("step"),
        type: "llm",
        label: "Summarize day",
        outputVar: "digest",
        config: {
          provider: "openai",
          model: OPENAI_DEFAULT_MODEL,
          system: "You write concise daily summaries. 2 sentences max.",
          prompt:
            "Summarize the kind of day a typical Kyvern user might have had: " +
            "a few payments settled, maybe a violation blocked, daily caps " +
            "respected. Make it warm but factual.",
          maxTokens: 150,
          temperature: 0.6,
        },
      },
      {
        id: newId("step"),
        type: "log",
        label: "Post digest",
        config: {
          message: "📜 Today: {{digest.text}}",
          level: "info",
        },
      },
    ],
  },
};

/* ─── 8. Quote-and-pay (LLM picks merchant, vault.pay) ───────── */

const quoteAndPay: RecipeDef = {
  id: "quote-and-pay",
  name: "Quote and pay",
  emoji: "🧾",
  description: "LLM picks a merchant from your allowlist, vault pays it.",
  longDescription:
    "An LLM step picks one merchant from a list (you edit the prompt to pick " +
    "based on whatever criteria you want — cheapest API, best uptime, etc). " +
    "A vault.pay step then settles. Demonstrates the chain remains the " +
    "arbiter even when an LLM is choosing where to spend.",
  tag: "ai",
  graph: {
    version: 1,
    trigger: { kind: "manual" },
    config: { maxRunsPerDay: 20, maxCostPerRunUsd: 1.00 },
    steps: [
      {
        id: newId("step"),
        type: "llm",
        label: "Pick merchant",
        outputVar: "choice",
        config: {
          provider: "deepseek",
          model: DEEPSEEK_DEFAULT_MODEL,
          system:
            "You pick one merchant from a list. Output ONLY the merchant " +
            "string, nothing else.",
          prompt:
            "Pick one of: api.openai.com, api.anthropic.com, api.deepseek.com.",
          maxTokens: 30,
          temperature: 0,
        },
      },
      {
        id: newId("step"),
        type: "vault.pay",
        label: "Pay chosen merchant",
        outputVar: "payment",
        config: {
          merchant: "{{choice.text}}",
          to: "<paste-allowlisted-recipient-for-the-merchant>",
          amount: 0.05,
          memo: "quote-and-pay",
        },
      },
      {
        id: newId("step"),
        type: "log",
        label: "Log result",
        config: {
          message: "🧾 Paid {{choice.text}} · {{payment.signature}}",
          level: "info",
        },
      },
    ],
  },
};

/* ─── Export ─────────────────────────────────────────────────── */

export const RECIPES: RecipeDef[] = [
  dailyAiInference,
  subscriptionRenewer,
  kastAutoTopup,
  walletWatcher,
  yieldRebalancer,
  tipJar,
  dailyDigest,
  quoteAndPay,
];

export function getRecipeById(id: string): RecipeDef | null {
  return RECIPES.find((r) => r.id === id) ?? null;
}

/** Clone a recipe's graph with fresh step ids. Used by the builder
 *  modal when the user clicks "Use this recipe" — they edit their
 *  own copy, not the shared template. */
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
