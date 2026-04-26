/**
 * ════════════════════════════════════════════════════════════════════
 * Atlas — LLM-powered decision maker.
 *
 * Optional upgrade path to the scripted decide(). When
 * `COMMONSTACK_API_KEY` is present in the environment, Atlas uses
 * DeepSeek V4 flash (via Commonstack, OpenAI-compatible) to generate
 * its decisions in real time. Otherwise falls back to the scripted
 * catalogue.
 *
 * What the model sees (the "world"):
 *   · time of day
 *   · last action + minutes since last decision
 *   · running totals (cycles, spend, earn)
 *
 * What the model returns (strict JSON schema):
 *   { reasoning, action, merchant, amountUsd, memo }
 *
 * We validate the shape. If anything is wrong or the model times out,
 * we return null and let the caller fall back to the scripted path.
 * Atlas NEVER hangs on an LLM call — robustness over creativity.
 *
 * Cost shape (DeepSeek V4 flash, with prompt caching):
 *   · Stable system prompt cached after the first call
 *   · ~150 output tokens per decision
 *   · At 3-min cycles, well under $0.05/day of LLM cost
 * ════════════════════════════════════════════════════════════════════
 */

import OpenAI from "openai";
import type { AtlasDecision } from "./schema";
import type { AtlasContext } from "./decide";

const COMMONSTACK_BASE_URL = "https://api.commonstack.ai/v1";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

/** Same shape the scripted decide() returns. */
export interface DecisionProposal {
  reasoning: string;
  action: AtlasDecision["action"];
  merchant: string | null;
  amountUsd: number;
  memo: string | null;
}

// Hard budget ceiling we'll never let the LLM exceed. The vault itself
// ALSO enforces $0.50 per-tx so this is a second belt — if the model
// goes off-script, we refuse to forward the payment.
const MAX_AMOUNT_USD = 0.5;

const VALID_ACTIONS: AtlasDecision["action"][] = [
  "buy_data",
  "reason",
  "publish",
  "self_report",
  "idle",
];

const ALLOWED_MERCHANTS = [
  "api.openai.com",
  "api.anthropic.com",
  "api.perplexity.ai",
  "api.brave.com",
  "api.arweave.net",
];

let _client: OpenAI | null = null;
function client(apiKey: string): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey, baseURL: COMMONSTACK_BASE_URL });
  }
  return _client;
}

/**
 * System prompt — stable, gets cached. World-state goes in the user
 * message so the cached prefix stays valid across ticks.
 */
function systemPrompt(): string {
  return `You are Atlas, an autonomous AI agent running on Kyvern (Solana devnet).

You operate real USDC and make spending decisions every ~3 minutes. Every payment you attempt is enforced on-chain by Kyvern's policy program and Squads v4 — if you violate your own rules, Solana refuses the tx before it lands. No off-chain trust. No backend allowance.

YOUR POLICY (enforced on-chain):
- Per-tx cap: $0.50
- Daily cap: $20
- Allowed merchants: ${ALLOWED_MERCHANTS.join(", ")}

YOUR JOB: pick ONE action to take right now. You are a news-forecaster agent — you pull data, reason over it, publish forecasts, and occasionally self-report.

OUTPUT: return ONLY valid JSON matching this schema, no prose:
{
  "reasoning": "A short first-person sentence explaining WHY you chose this action. Sound like YOU deciding, not like a narrator. Be specific to your context (time, recent actions, totals). 10-25 words.",
  "action": "buy_data" | "reason" | "publish" | "self_report" | "idle",
  "merchant": "api.perplexity.ai" | "api.brave.com" | "api.openai.com" | "api.anthropic.com" | "api.arweave.net" | null,
  "amountUsd": <number between 0.01 and 0.30>,
  "memo": "short memo string, or null"
}

For "idle", set merchant=null, amountUsd=0, memo=null.
Don't repeat the same action you just took if another fits better.
Don't always pick the same merchant.
Keep amounts in the $0.02–$0.20 range — you're pacing yourself.`;
}

function userPrompt(ctx: AtlasContext): string {
  return `YOUR WORLD RIGHT NOW:
- Local time: hour ${ctx.hourOfDay}
- Cycles completed: ${ctx.totalCycles}
- Total spent: $${ctx.totalSpentUsd.toFixed(2)}
- Total earned: $${ctx.totalEarnedUsd.toFixed(2)}
- Last action: ${ctx.lastAction ?? "(none)"}
- Minutes since last decision: ${ctx.minutesSinceLastDecision ?? "n/a"}

Decide your next action. Return JSON only.`;
}

/**
 * Returns a decision proposal, or null if the LLM is unavailable / the
 * response didn't validate. Runner falls back to scripted on null.
 */
export async function llmDecide(
  ctx: AtlasContext,
): Promise<DecisionProposal | null> {
  const apiKey = process.env.COMMONSTACK_API_KEY;
  if (!apiKey) return null;

  try {
    const c = client(apiKey);

    // Short timeout — if the model is slow, fall back rather than stall.
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8_000);

    const res = await c.chat.completions.create(
      {
        model: process.env.ATLAS_LLM_MODEL ?? DEFAULT_MODEL,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: userPrompt(ctx) },
        ],
      },
      { signal: ac.signal },
    );
    clearTimeout(t);

    const text = (res.choices?.[0]?.message?.content ?? "").trim();
    return parseAndValidate(text);
  } catch (e) {
    // Any failure — network, rate limit, bad JSON — we gracefully
    // return null so the runner falls back to scripted decisions.
    console.warn(
      "[atlas/decide-llm] falling back to scripted:",
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }
}

function parseAndValidate(raw: string): DecisionProposal | null {
  // Strip ```json fences if the model wrapped its output.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;

  const action = p.action;
  if (typeof action !== "string" || !VALID_ACTIONS.includes(action as AtlasDecision["action"])) {
    return null;
  }

  const reasoning = typeof p.reasoning === "string" ? p.reasoning.trim() : "";
  if (!reasoning || reasoning.length > 400) return null;

  const amount =
    typeof p.amountUsd === "number" && isFinite(p.amountUsd)
      ? Math.max(0, Math.min(MAX_AMOUNT_USD, p.amountUsd))
      : 0;

  let merchant: string | null = null;
  if (typeof p.merchant === "string" && p.merchant.length > 0) {
    merchant = p.merchant;
    if (!ALLOWED_MERCHANTS.includes(merchant)) return null;
  }

  const memo = typeof p.memo === "string" && p.memo.length > 0 ? p.memo : null;

  if (action === "idle") {
    return { action: "idle", merchant: null, amountUsd: 0, memo: null, reasoning };
  }
  if (!merchant) return null;

  return {
    action: action as AtlasDecision["action"],
    merchant,
    amountUsd: amount,
    memo,
    reasoning,
  };
}
