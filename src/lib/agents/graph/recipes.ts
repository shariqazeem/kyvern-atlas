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

// Recipes default to Commonstack with the most reliably-accessible
// cheap model — keeps the v1 experience friction-free on a single
// BYOK key. Users can switch any step's provider in the composer.
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
    "clicking into the device. Good first agent for testing the loop.",
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
            "You write tight 3-bullet morning briefs for solo developers " +
            "building on Solana. Each bullet is 1 short sentence. No " +
            "preamble, no markdown headers. Just three bullets prefixed " +
            "with '• '. Topics: protocol news, ecosystem launches, on-chain " +
            "trends. Be specific. Don't fabricate dates.",
          prompt: "Write today's Solana brief.",
          maxTokens: 300,
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

/* ─── 4. Wallet watcher (HTTP → LLM → signal) ────────────────── */

const walletWatcher: RecipeDef = {
  id: "wallet-watcher",
  name: "Wallet watcher",
  emoji: "🔍",
  description: "Watch a Solana address. When something noteworthy happens, your agent posts a finding to your inbox.",
  longDescription:
    "Every 15 minutes, fetches the latest signatures for a watched address " +
    "from the public Solana RPC, asks your LLM whether anything looks " +
    "noteworthy (large transfers, swaps, suspicious patterns), and emits an " +
    "inbox finding when it is. No money moves — pure observation. Useful for " +
    "watching a counterparty, a cold wallet, a treasury, or a competitor.\n\n" +
    "Edit the watched address in the HTTP step's body before deploying.",
  tag: "watch",
  graph: {
    version: 1,
    trigger: { kind: "interval", ms: 900_000 }, // 15 min
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
            params: [
              "<paste-address-to-watch>",
              { limit: 5 },
            ],
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
            "signatures, decide if anything in the last 15 minutes is " +
            "worth a notification. Return a JSON object with two fields: " +
            "{ \"alert\": boolean, \"summary\": string }. summary is " +
            "max 1 sentence describing the most notable activity. Set " +
            "alert=true only if something genuinely unusual happened.",
          prompt: "Recent signatures: {{signatures.body}}",
          maxTokens: 200,
          temperature: 0,
        },
      },
      {
        id: newId("step"),
        type: "signal",
        label: "Post finding (if alert)",
        config: {
          kind: "wallet_watch",
          subject: "Wallet activity flagged",
          evidence: "{{assessment.text}}",
          suggestion: "Click the source URL to see recent txs on Explorer.",
          sourceUrl: "https://explorer.solana.com/address/<paste-address>?cluster=devnet",
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

/* ─── 7. Vault digest (HTTP → LLM → signal) ──────────────────── */

const vaultDigest: RecipeDef = {
  id: "vault-digest",
  name: "Vault digest",
  emoji: "📜",
  description: "Every evening your agent reads your vault's activity and posts a one-paragraph summary to your inbox.",
  longDescription:
    "At 9pm UTC daily, fetches your vault's recent events (settled, blocked, " +
    "and refused payments), asks your LLM to summarize the day in 2-3 " +
    "sentences (what happened, what was blocked and why, what's notable), " +
    "and emits the summary as an inbox finding. Calmer alternative to " +
    "scrolling the feed — a daily 'how did my agents do' card.",
  tag: "ai",
  graph: {
    version: 1,
    trigger: { kind: "cron", expr: "0 21 * * *" }, // 9pm UTC
    config: { maxRunsPerDay: 2, maxCostPerRunUsd: 0.10 },
    steps: [
      {
        id: newId("step"),
        type: "http",
        label: "Fetch vault events",
        outputVar: "events",
        config: {
          method: "GET",
          url: "{{vault.id}}", // overridden after vault is known — placeholder
          headers: {},
          body: null,
          payShWrap: false,
          timeoutMs: 30_000,
        },
      },
      {
        id: newId("step"),
        type: "llm",
        label: "Summarize day",
        outputVar: "digest",
        config: {
          provider: "commonstack",
          model: COMMONSTACK_DEFAULT_MODEL,
          system:
            "You write a calm 2-3 sentence end-of-day summary of a " +
            "Solana vault's activity. Mention what settled, what was " +
            "blocked, and any notable spend pattern. Don't make up data.",
          prompt: "Today's events: {{events.body}}",
          maxTokens: 250,
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
          provider: "commonstack",
          model: COMMONSTACK_DEFAULT_MODEL,
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
  dailySolanaBrief,
  subscriptionRenewer,
  kastAutoTopup,
  walletWatcher,
  yieldRebalancer,
  tipJar,
  vaultDigest,
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
