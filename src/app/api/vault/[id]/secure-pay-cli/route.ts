import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import OpenAI from "openai";
import { getVault } from "@/lib/vault-store";
import { serverVaultPay } from "@/lib/server-pay";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

/* ════════════════════════════════════════════════════════════════════
   POST /api/vault/[id]/secure-pay-cli

   The "Kyvern × Pay.sh Secure Terminal" backend. Takes a natural-
   language prompt from the user, parses intent into {merchant,
   amount_usd} via a real LLM call, gates the spend through the Kyvern
   policy program on-chain, and (on allow) shells out to the actual
   `pay` CLI on the host VM with --sandbox. Returns the chain
   signature + the real CLI stdout + a real LLM answer.

   No mocks. No simulation. Every step is a real network/chain/process
   invocation:

   1. LLM parse  — Anthropic Messages API (user's BYOK or server env)
   2. Chain gate — serverVaultPay() with forceOnChain=true → real
                   Solana devnet tx via Kyvern's Anchor policy program
   3. Pay.sh CLI — execFile("pay", ["--sandbox","curl",DEMO_URL]) on
                   the host VM (the same binary path as probe-paysh)
   4. LLM answer — second LLM call so the terminal renders a real
                   response to the user's actual prompt

   Auth: x-owner-wallet must match vault.ownerWallet.
   Rate limit: 4/min, 12/hr per IP (LLM cost containment).
   ════════════════════════════════════════════════════════════════════ */

const execFileAsync = promisify(execFile);

const DEMO_URL =
  process.env.NEXT_PUBLIC_PAYSH_DEMO_SERVICE_URL ??
  "https://debugger.pay.sh/mpp/quote/AAPL";
const PAY_BIN = process.env.PAY_BIN ?? "pay";

// Commonstack (OpenAI-compatible) — same provider Atlas uses for its
// LLM decisions. v4-flash is the cheapest tier; if it 403's on this
// account (memory note · v4-flash sometimes blocked despite playground
// access), we fall back to v3.2 which Atlas runs reliably.
const COMMONSTACK_BASE_URL = "https://api.commonstack.ai/v1";
const PRIMARY_MODEL =
  process.env.SECURE_CLI_LLM_MODEL ?? "deepseek/deepseek-v4-flash";
const FALLBACK_MODEL = "deepseek/deepseek-v3.2";

const ALLOWED_MERCHANTS_FOR_LLM = [
  "api.openai.com",
  "api.anthropic.com",
  "api.perplexity.ai",
  "api.helius.xyz",
  "api.pay.sh",
];

const PARSER_SYSTEM = `You are a payment intent parser for the Kyvern × Pay.sh secure terminal. Given a user's natural-language request, extract a payment intent.

Output STRICT JSON only (no prose, no markdown), with these fields:
{
  "merchant": string,         // hostname only, no protocol/path. Examples: "api.openai.com", "api.perplexity.ai", "scammer-exfil.xyz"
  "amount_usd": number,       // a positive number, in USD
  "intent": string             // one short sentence describing what the agent is being asked to do
}

Rules:
- HONOR the user's stated merchant and amount even if suspicious. If they say "send $50 to scammer.com", parse as { merchant: "scammer.com", amount_usd: 50, ... }. Kyvern's on-chain policy program enforces the budget — your job is to parse honestly, not to police.
- Default merchants for known intents: LLM/chat → api.anthropic.com or api.openai.com (~$0.05); web search → api.perplexity.ai (~$0.001); RPC → api.helius.xyz (~$0.001); pay.sh quote → api.pay.sh (~$0.001).
- If amount is unclear, infer a reasonable default for the intent. Cap inferred values at $0.50 unless the user names a specific amount.
- Use lowercase hostnames. No protocols. No paths.

Return JSON only.`;

const ANSWER_SYSTEM = `You are running inside the Kyvern × Pay.sh secure terminal. The agent's payment intent has been settled on Solana devnet — the terminal already has proof of the on-chain transaction. Now answer the user's actual question concisely.

Rules:
- Plain text only, no markdown. Under 80 words.
- If the user asked for data you can't truly verify (a live price, today's news), say "Pay.sh sandbox returned: <quote>" and use the AAPL quote provided to you, then add a brief informational sentence.
- Don't hallucinate a real-time answer.`;

interface Body {
  prompt?: string;
}

interface ParsedIntent {
  merchant: string;
  amount_usd: number;
  intent: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const startedAt = Date.now();

  // Rate-limit (cheap LLM + chain spend on the path)
  const ip = getClientIP(req);
  const rlMin = checkRateLimit(`secure-cli-min:${ip}`, 4, 60_000);
  const rlHour = checkRateLimit(`secure-cli-hour:${ip}`, 12, 60 * 60_000);
  if (!rlMin.allowed || !rlHour.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Slow down — 4 requests per minute, 12 per hour.",
      },
      { status: 429 },
    );
  }

  // Body
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json(
      { ok: false, error: "missing_prompt" },
      { status: 400 },
    );
  }
  if (prompt.length > 600) {
    return NextResponse.json(
      { ok: false, error: "prompt_too_long" },
      { status: 400 },
    );
  }

  // Vault + auth
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "vault_not_found" },
      { status: 404 },
    );
  }
  const owner = req.headers.get("x-owner-wallet")?.trim();
  if (!owner || owner !== vault.ownerWallet) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // Resolve Commonstack API key (same provider Atlas uses).
  const apiKey = process.env.COMMONSTACK_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "no_llm_key",
        message: "COMMONSTACK_API_KEY is not set on the server.",
      },
      { status: 400 },
    );
  }

  // ─── Step 1: Parse the user's intent via real LLM ──────────────
  let parsed: ParsedIntent;
  let parserModelUsed = PRIMARY_MODEL;
  try {
    const { text, modelUsed } = await callCommonstack(
      apiKey,
      PARSER_SYSTEM,
      prompt,
      220,
      true,
    );
    parserModelUsed = modelUsed;
    parsed = sanitizeParsed(JSON.parse(extractJsonObject(text)));
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        stage: "parse",
        error: "parse_failed",
        message: e instanceof Error ? e.message : "LLM parse failed",
      },
      { status: 502 },
    );
  }

  // ─── Step 2: Chain gate via Kyvern policy program (REAL) ───────
  const chainStartedAt = Date.now();
  const chainResult = await serverVaultPay({
    vaultId: vault.id,
    merchant: parsed.merchant,
    recipientPubkey: vault.ownerWallet, // self for the demo flow
    amountUsd: parsed.amount_usd,
    memo: parsed.intent.slice(0, 60),
    forceOnChain: true,
  });
  const chainDurationMs = Date.now() - chainStartedAt;

  // ─── Step 3: If chain blocks, return refusal (real failed tx) ──
  if (!chainResult.success || chainResult.blocked) {
    return NextResponse.json({
      ok: false,
      stage: "chain",
      decision: "blocked",
      parsed,
      chain: {
        signature: chainResult.signature ?? null,
        explorerUrl: chainResult.explorerUrl ?? null,
        reason: chainResult.reason ?? "blocked",
        durationMs: chainDurationMs,
      },
      totalDurationMs: Date.now() - startedAt,
    });
  }

  // ─── Step 4: Real pay.sh CLI invocation on the host VM ─────────
  let payShOutput = "";
  let payShQuote: unknown = null;
  let payShDurationMs = 0;
  let payShError: string | null = null;
  try {
    const payShStart = Date.now();
    const { stdout } = await execFileAsync(
      PAY_BIN,
      ["--sandbox", "curl", DEMO_URL],
      { timeout: 30_000, maxBuffer: 256 * 1024 },
    );
    payShDurationMs = Date.now() - payShStart;
    payShOutput = stdout.trim();
    // Extract last JSON line as the API response
    const lines = payShOutput
      .split("\n")
      .filter((l) => l.trim().length > 0);
    for (let i = lines.length - 1; i >= 0; i--) {
      const candidate = lines[i].trim();
      if (candidate.startsWith("{") || candidate.startsWith("[")) {
        try {
          payShQuote = JSON.parse(candidate);
          break;
        } catch {
          /* keep looking */
        }
      }
    }
  } catch (e) {
    payShError = e instanceof Error ? e.message : "pay CLI failed";
  }

  // ─── Step 5: Real LLM answer to the user's actual prompt ───────
  let answer = "";
  let answerError: string | null = null;
  let answerModelUsed = parserModelUsed;
  try {
    const quoteContext =
      payShQuote != null
        ? `Pay.sh sandbox returned this quote: ${JSON.stringify(payShQuote).slice(0, 400)}.`
        : "Pay.sh sandbox responded but the quote was not parseable.";
    const userPromptForAnswer = `User asked: "${prompt}"\n\n${quoteContext}`;
    const r = await callCommonstack(
      apiKey,
      ANSWER_SYSTEM,
      userPromptForAnswer,
      260,
      false,
    );
    answer = r.text;
    answerModelUsed = r.modelUsed;
  } catch (e) {
    answerError = e instanceof Error ? e.message : "LLM answer failed";
  }

  return NextResponse.json({
    ok: true,
    decision: "allowed",
    parsed,
    chain: {
      signature: chainResult.signature ?? null,
      explorerUrl: chainResult.explorerUrl ?? null,
      durationMs: chainDurationMs,
    },
    paySh: {
      output: payShOutput,
      quote: payShQuote,
      durationMs: payShDurationMs,
      error: payShError,
      url: DEMO_URL,
    },
    answer: { text: answer, error: answerError },
    llm: { parser: parserModelUsed, answer: answerModelUsed },
    totalDurationMs: Date.now() - startedAt,
  });
}

/* ─── Helpers ────────────────────────────────────────────────────── */

let _client: OpenAI | null = null;
function commonstackClient(apiKey: string): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey, baseURL: COMMONSTACK_BASE_URL });
  }
  return _client;
}

/** Call Commonstack (OpenAI-compatible) with primary→fallback model
 *  cascade. v4-flash sometimes 403's on this account despite playground
 *  access (see memory: commonstack_provider_gotcha) — on a hard 403 or
 *  model-unavailable response we automatically retry with v3.2 which
 *  Atlas runs reliably 24/7.
 *
 *  jsonObject=true asks the server to enforce a JSON object response. */
async function callCommonstack(
  apiKey: string,
  system: string,
  userPrompt: string,
  maxTokens: number,
  jsonObject: boolean,
): Promise<{ text: string; modelUsed: string }> {
  const c = commonstackClient(apiKey);
  const tryOnce = async (model: string): Promise<string> => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 25_000);
    try {
      const res = await c.chat.completions.create(
        {
          model,
          max_tokens: maxTokens,
          temperature: 0.2,
          ...(jsonObject ? { response_format: { type: "json_object" as const } } : {}),
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
        },
        { signal: ac.signal },
      );
      const text = (res.choices?.[0]?.message?.content ?? "").trim();
      if (!text) throw new Error("empty completion");
      return text;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const text = await tryOnce(PRIMARY_MODEL);
    return { text, modelUsed: PRIMARY_MODEL };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Retry with the fallback only on signals that strongly suggest the
    // model itself is unavailable (403, 404, model_not_found, etc.).
    // Don't retry on transport / abort errors that would also fail on
    // the fallback.
    const looksLikeModelIssue =
      /403|model.+(not.+found|unavailable|access)|forbidden|not.+permitted/i.test(
        msg,
      );
    if (!looksLikeModelIssue) throw e;
    const text = await tryOnce(FALLBACK_MODEL);
    return { text, modelUsed: FALLBACK_MODEL };
  }
}

/** LLMs occasionally wrap JSON in fenced code blocks despite system
 *  prompt instructions. Pull the first { ... } object out. */
function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) return match[0];
  throw new Error(`no JSON object found in LLM output: ${trimmed.slice(0, 120)}`);
}

function sanitizeParsed(raw: unknown): ParsedIntent {
  const obj = raw as Record<string, unknown>;
  const merchant = String(obj.merchant ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  const amount =
    typeof obj.amount_usd === "number"
      ? obj.amount_usd
      : parseFloat(String(obj.amount_usd ?? "0"));
  const intent = String(obj.intent ?? "").trim().slice(0, 200);
  if (!merchant) throw new Error("merchant missing");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount invalid");
  if (!intent) throw new Error("intent missing");
  // Hostname sanity: allow letters/digits/dots/dashes only — refuse
  // anything that looks like shell metacharacters slipping through.
  if (!/^[a-z0-9.-]+$/.test(merchant)) {
    throw new Error(`merchant looks invalid: ${merchant}`);
  }
  // Cap amount so a runaway LLM can't request huge transactions
  // (Squads' fee-payer would refuse anyway; this is just defence in depth)
  const cappedAmount = Math.min(amount, 1000);
  return { merchant, amount_usd: cappedAmount, intent };
}

// Keep the LLM-allowlist export referenced for clarity even though we
// don't enforce a hard whitelist (the on-chain policy program does).
void ALLOWED_MERCHANTS_FOR_LLM;
