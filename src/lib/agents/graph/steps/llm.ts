/**
 * LLM step executor — multi-provider BYOK.
 *
 * Supports Anthropic (native messages), OpenAI / DeepSeek /
 * Commonstack (all OpenAI-compatible chat completions).
 *
 * The user's BYOK key for the requested provider is loaded via
 * keys-store.loadKeyForUse(); the plaintext is held in a function
 * scope and discarded when the function returns. Never logged.
 *
 * If the user has no key for the requested provider, the step fails
 * with `provider_unavailable` so the user can fix it (add a key in
 * /app settings) without a confusing 401 from upstream.
 *
 * Pricing for cost tracking is approximate — these are list prices
 * per 1M tokens at the time of build; they're used for the run's
 * cost-budget enforcement and the per-step cost display in run
 * history. Off by a few percent is fine.
 */

import { interpolate } from "../interpolate";
import { loadKeyForUse, recordKeyUsed } from "../keys-store";
import type {
  LlmProvider,
  LlmStepConfig,
  RunContext,
  StepExecutionResult,
} from "../types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const COMMONSTACK_URL = "https://api.commonstack.ai/v1/chat/completions";

const TIMEOUT_MS = 60_000;

/** Rough USD-per-1M-token rates, averaged across the most common
 *  models on each provider. The composer doesn't know which model
 *  the user picked, so we use one rate per provider. Off by a few
 *  percent — fine for budget enforcement. */
const PRICING_USD_PER_M: Record<LlmProvider, { input: number; output: number }> = {
  anthropic:   { input: 3.00, output: 15.00 },  // ~Claude Sonnet
  openai:      { input: 2.50, output: 10.00 },  // ~GPT-4o
  deepseek:    { input: 0.27, output: 1.10 },   // ~DeepSeek V3
  commonstack: { input: 0.14, output: 0.56 },   // ~DeepSeek/oss-120b on Commonstack
};

interface LlmResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function executeLlm(
  ctx: RunContext,
  config: LlmStepConfig,
): Promise<StepExecutionResult> {
  const system = interpolate(config.system, ctx.vars);
  const prompt = interpolate(config.prompt, ctx.vars);

  const keyRow = loadKeyForUse(ctx.ownerWallet, config.provider);
  if (!keyRow) {
    return {
      ok: false,
      output: null,
      error:
        `provider_unavailable: no ${config.provider} key configured. ` +
        `Add one in /app → settings → provider keys.`,
    };
  }

  let response: LlmResponse;
  try {
    if (config.provider === "anthropic") {
      response = await callAnthropic(keyRow.plaintext, config, system, prompt);
    } else {
      response = await callOpenAiCompat(
        config.provider,
        keyRow.plaintext,
        config,
        system,
        prompt,
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      output: null,
      error: `llm_error: ${msg}`,
    };
  } finally {
    // Mark the key as used (timestamp only — for "active" sort + UI).
    try { recordKeyUsed(keyRow.id); } catch { /* non-fatal */ }
  }

  return {
    ok: true,
    output: {
      text: response.text,
      tokens: {
        input: response.inputTokens,
        output: response.outputTokens,
      },
      provider: config.provider,
      model: config.model,
    },
    costUsd: response.costUsd,
  };
}

/* ─── Anthropic (native messages API) ─────────────────────────── */

async function callAnthropic(
  apiKey: string,
  config: LlmStepConfig,
  system: string,
  prompt: string,
): Promise<LlmResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    throw new Error(`anthropic ${r.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await r.json()) as {
    content?: Array<{ type: string; text: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };
  const text = (data.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");
  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;
  return {
    text,
    inputTokens,
    outputTokens,
    costUsd: estimateCost("anthropic", inputTokens, outputTokens),
  };
}

/* ─── OpenAI / DeepSeek / Commonstack (OpenAI-compat) ─────────── */

async function callOpenAiCompat(
  provider: Exclude<LlmProvider, "anthropic">,
  apiKey: string,
  config: LlmStepConfig,
  system: string,
  prompt: string,
): Promise<LlmResponse> {
  const url =
    provider === "openai" ? OPENAI_URL
    : provider === "deepseek" ? DEEPSEEK_URL
    : COMMONSTACK_URL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    throw new Error(`${provider} ${r.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await r.json()) as {
    choices?: Array<{
      message?: {
        // Standard OpenAI-compat field
        content?: string | null;
        // Reasoning models on Commonstack (gpt-oss-120b, DeepSeek-R1
        // family) put their thinking in reasoning_content and leave
        // content empty when the response is reasoning-heavy.
        reasoning_content?: string | null;
      };
    }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };
  const msg = data.choices?.[0]?.message;
  const text =
    (msg?.content && msg.content.trim()) ||
    (msg?.reasoning_content && msg.reasoning_content.trim()) ||
    "";
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  return {
    text,
    inputTokens,
    outputTokens,
    costUsd: estimateCost(provider, inputTokens, outputTokens),
  };
}

/* ─── Cost estimation ────────────────────────────────────────── */

function estimateCost(
  provider: LlmProvider,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = PRICING_USD_PER_M[provider];
  const cost =
    (inputTokens * rates.input) / 1_000_000 +
    (outputTokens * rates.output) / 1_000_000;
  return Math.max(0, cost);
}
