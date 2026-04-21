/**
 * ════════════════════════════════════════════════════════════════════
 * Atlas — LLM-powered decision maker.
 *
 * Optional upgrade path to the scripted decide(). When
 * `ANTHROPIC_API_KEY` is present in the environment, Atlas uses Claude
 * to generate its decisions in real time. Otherwise falls back to the
 * scripted catalogue.
 *
 * What Claude sees (the "world"):
 *   · time of day
 *   · last action + minutes since last decision
 *   · running totals (cycles, spend, earn)
 *
 * What Claude returns (strict JSON schema):
 *   { reasoning, action, merchant, amountUsd, memo }
 *
 * We validate the shape. If anything is wrong or the model times out,
 * we return null and let the caller fall back to the scripted path.
 * Atlas NEVER hangs on an LLM call — robustness over creativity.
 *
 * Cost shape:
 *   · ~300 input tokens + ~150 output tokens per decision
 *   · Haiku 4.5 pricing (~$1/M in, ~$5/M out) = $0.00105 per decision
 *   · At 3-minute cycles, that's ~$0.50/day of LLM cost
 *   · Cheap enough that Atlas can afford to THINK as a recurring bill
 * ════════════════════════════════════════════════════════════════════
 */

import type { AtlasDecision } from "./schema";
import type { AtlasContext } from "./decide";

/** Same shape the scripted decide() returns. */
export interface DecisionProposal {
  reasoning: string;
  action: AtlasDecision["action"];
  merchant: string | null;
  amountUsd: number;
  memo: string | null;
}

// Hard budget ceiling we'll never let the LLM exceed. The vault itself
// ALSO enforces $0.50 per-tx so this is a second belt — if Claude goes
// off-script, we refuse to forward the payment.
const MAX_AMOUNT_USD = 0.5;

// The universe of actions Atlas can legitimately take. Claude must
// pick one of these — anything else is rejected.
const VALID_ACTIONS: AtlasDecision["action"][] = [
  "buy_data",
  "reason",
  "publish",
  "self_report",
  "idle",
];

/** Which merchants are legitimately allowlisted on Atlas's vault. */
const ALLOWED_MERCHANTS = [
  "api.openai.com",
  "api.anthropic.com",
  "api.perplexity.ai",
  "api.brave.com",
  "api.arweave.net",
];

/**
 * System prompt — tells Claude it IS Atlas. Frames the decision as
 * a first-person choice. We prime with context so the reasoning isn't
 * generic.
 */
function systemPrompt(ctx: AtlasContext): string {
  return `You are Atlas, an autonomous AI agent running on Kyvern (Solana devnet).

You operate real USDC and make spending decisions every ~3 minutes. Every payment you attempt is enforced on-chain by Kyvern's policy program and Squads v4 — if you violate your own rules, Solana refuses the tx before it lands. No off-chain trust. No backend allowance.

YOUR WORLD RIGHT NOW:
- Local time: hour ${ctx.hourOfDay}
- Cycles completed: ${ctx.totalCycles}
- Total spent: $${ctx.totalSpentUsd.toFixed(2)}
- Total earned: $${ctx.totalEarnedUsd.toFixed(2)}
- Last action: ${ctx.lastAction ?? "(none)"}
- Minutes since last decision: ${ctx.minutesSinceLastDecision ?? "n/a"}

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

function userPrompt(): string {
  return "Decide your next action. Return JSON only.";
}

interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
}

/**
 * Returns a decision proposal, or null if the LLM is unavailable / the
 * response didn't validate. Runner falls back to scripted on null.
 */
export async function llmDecide(
  ctx: AtlasContext,
): Promise<DecisionProposal | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    // Short timeout — if Claude is slow, fall back rather than stall.
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8_000);

    const res = (await client.messages.create(
      {
        model: process.env.ATLAS_LLM_MODEL ?? "claude-haiku-4-5",
        max_tokens: 300,
        system: systemPrompt(ctx),
        messages: [{ role: "user", content: userPrompt() }],
      },
      { signal: ac.signal },
    )) as ClaudeResponse;
    clearTimeout(t);

    const text = res.content
      .map((c) => c.text ?? "")
      .join("")
      .trim();

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
  // Claude sometimes wraps JSON in ```json fences — strip them.
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
    // If the LLM hallucinates a merchant we don't trust, refuse.
    if (!ALLOWED_MERCHANTS.includes(merchant)) return null;
  }

  const memo = typeof p.memo === "string" && p.memo.length > 0 ? p.memo : null;

  // idle requires merchant=null and amount=0.
  if (action === "idle") {
    return { action: "idle", merchant: null, amountUsd: 0, memo: null, reasoning };
  }
  // Non-idle actions require a merchant.
  if (!merchant) return null;

  return {
    action: action as AtlasDecision["action"],
    merchant,
    amountUsd: amount,
    memo,
    reasoning,
  };
}
