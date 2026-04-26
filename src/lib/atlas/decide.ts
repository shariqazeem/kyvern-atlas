/**
 * Atlas's decision-maker.
 *
 * This is the function that generates the "thinking out loud" text users
 * see on the observatory — "Buying fresh news from Perplexity because
 * last forecast is 4h stale" — plus the machine-readable action that
 * the runner will attempt via `vault.pay()`.
 *
 * Intentionally a plain TypeScript function for now. Next session we
 * swap this implementation for a real LLM call (Claude / GPT-5) while
 * keeping the `decide()` signature stable. Everything downstream
 * (runner, DB, observatory) stays put.
 */

import type { AtlasDecision } from "./schema";
import { readRecentDecisions, readState } from "./db";
import { llmDecide } from "./decide-llm";

export interface DecisionProposal {
  reasoning: string;
  action: AtlasDecision["action"];
  merchant: string | null;
  amountUsd: number;
  memo: string | null;
}

// The shape of the world Atlas makes decisions with: last few decisions,
// time-of-day, overall totals. LLM replacement will receive this too.
export interface AtlasContext {
  hourOfDay: number;
  minutesSinceLastDecision: number | null;
  lastAction: AtlasDecision["action"] | null;
  totalCycles: number;
  totalSpentUsd: number;
  totalEarnedUsd: number;
}

/**
 * Build the context blob that feeds the decision function.
 * Reads from SQLite so decisions are based on actual Atlas history.
 */
export function buildContext(): AtlasContext {
  const state = readState();
  const recent = readRecentDecisions(1);
  const last = recent[0] ?? null;
  const minutesSinceLastDecision = last
    ? Math.round(
        (Date.now() - new Date(last.decidedAt).getTime()) / 60_000,
      )
    : null;
  return {
    hourOfDay: new Date().getHours(),
    minutesSinceLastDecision,
    lastAction: last?.action ?? null,
    totalCycles: state.totalCycles,
    totalSpentUsd: state.totalSpentUsd,
    totalEarnedUsd: state.totalEarnedUsd,
  };
}

/**
 * A small catalogue of what Atlas can choose from. Keep amounts under
 * our demo vault's $0.50 per-tx cap so they pass the policy layer.
 *
 * Real merchant domains (api.openai.com etc.) so Pulse captures these
 * as if Atlas is actually spending money at named vendors. For the
 * devnet demo we're sending USDC to a fixed test recipient, but the
 * DECISION reasoning names the intended merchant.
 */
const ACTIONS: Array<Omit<DecisionProposal, "reasoning">> = [
  {
    action: "buy_data",
    merchant: "api.perplexity.ai",
    amountUsd: 0.04,
    memo: "perplexity · news pull",
  },
  {
    action: "buy_data",
    merchant: "api.brave.com",
    amountUsd: 0.02,
    memo: "brave search · verification pass",
  },
  {
    action: "reason",
    merchant: "api.openai.com",
    amountUsd: 0.07,
    memo: "gpt · summarize & forecast",
  },
  {
    action: "reason",
    merchant: "api.anthropic.com",
    amountUsd: 0.09,
    memo: "claude · cross-check signal",
  },
  {
    action: "publish",
    merchant: "api.arweave.net",
    amountUsd: 0.03,
    memo: "arweave · permanent forecast record",
  },
  {
    action: "self_report",
    merchant: "api.openai.com",
    amountUsd: 0.02,
    memo: "gpt · daily self-report",
  },
];

/**
 * The "thinking" — a curated, context-aware reasoning string per action.
 * Sounds like Atlas is justifying its move out loud. When we swap to a
 * real LLM, the LLM generates this line from the context.
 */
function reasoningFor(
  action: AtlasDecision["action"],
  merchant: string | null,
  ctx: AtlasContext,
): string {
  const sinceLast = ctx.minutesSinceLastDecision;
  const stale =
    sinceLast !== null && sinceLast > 10
      ? ` — last signal is ${sinceLast}m stale`
      : "";
  switch (action) {
    case "buy_data":
      if (merchant?.includes("perplexity")) {
        return `Buying fresh market/agent-economy news from Perplexity${stale}.`;
      }
      return `Running a Brave verification pass on yesterday's forecast to catch drift.`;
    case "reason":
      if (merchant?.includes("anthropic")) {
        return `Cross-checking today's signal with Claude — GPT alone leaves blind spots.`;
      }
      return `Generating today's forecast with GPT from the freshest data on hand.`;
    case "publish":
      return `Publishing the finalized forecast to Arweave — permanent, cheap, verifiable.`;
    case "self_report":
      return `Writing today's self-report: spend, earn, attacks caught, uptime.`;
    case "idle":
      return `Idling — nothing worth spending on right now. Next pass scheduled soon.`;
  }
}

/**
 * The decision function. Two paths:
 *
 *   1. If COMMONSTACK_API_KEY is set, Atlas uses DeepSeek V4 flash
 *      (via Commonstack) to generate a decision + first-person
 *      reasoning in real time. Atlas is then genuinely thinking —
 *      not replaying canned scripts.
 *
 *   2. If no key, or the LLM call fails/times out, we fall back to
 *      the scripted catalogue. Same shape, zero external dependency.
 *
 * The runner doesn't need to know which path fired — `decide()` is a
 * clean seam. When the key is added to the VM, Atlas starts
 * improvising without any code change or redeploy.
 */
export async function decide(): Promise<DecisionProposal> {
  const ctx = buildContext();

  // ── LLM path (optional, active when COMMONSTACK_API_KEY is set) ──
  const llm = await llmDecide(ctx);
  if (llm) return llm;

  // ── Scripted fallback path ──

  // Very occasionally (5% of the time) Atlas idles — shows that "wise
  // non-action" is a decision. This prevents the observatory from ever
  // looking spammy / robotic.
  if (Math.random() < 0.05) {
    return {
      reasoning: reasoningFor("idle", null, ctx),
      action: "idle",
      merchant: null,
      amountUsd: 0,
      memo: null,
    };
  }

  // Don't pick the same action twice in a row if we have alternatives.
  const pool = ctx.lastAction
    ? ACTIONS.filter((a) => a.action !== ctx.lastAction)
    : ACTIONS;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  return {
    reasoning: reasoningFor(chosen.action, chosen.merchant, ctx),
    action: chosen.action,
    merchant: chosen.merchant,
    amountUsd: chosen.amountUsd,
    memo: chosen.memo,
  };
}
