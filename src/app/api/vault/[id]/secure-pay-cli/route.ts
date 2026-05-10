import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getVault } from "@/lib/vault-store";
import { serverVaultPay } from "@/lib/server-pay";
import { loadKeyForUse } from "@/lib/agents/graph/keys-store";
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
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const LLM_MODEL = "claude-3-5-haiku-20241022";

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

  // Resolve LLM key — BYOK (anthropic) preferred, else server env fallback.
  const apiKey = resolveAnthropicKey(vault.ownerWallet);
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "no_llm_key",
        message:
          "Add an Anthropic API key in /app/keys, or set ANTHROPIC_API_KEY on the server.",
      },
      { status: 400 },
    );
  }

  // ─── Step 1: Parse the user's intent via real LLM ──────────────
  let parsed: ParsedIntent;
  try {
    const text = await callAnthropic(apiKey, PARSER_SYSTEM, prompt, 200);
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
  try {
    const quoteContext =
      payShQuote != null
        ? `Pay.sh sandbox returned this quote: ${JSON.stringify(payShQuote).slice(0, 400)}.`
        : "Pay.sh sandbox responded but the quote was not parseable.";
    const userPromptForAnswer = `User asked: "${prompt}"\n\n${quoteContext}`;
    answer = await callAnthropic(apiKey, ANSWER_SYSTEM, userPromptForAnswer, 240);
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
    totalDurationMs: Date.now() - startedAt,
  });
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function resolveAnthropicKey(ownerWallet: string): string | null {
  try {
    const byok = loadKeyForUse(ownerWallet, "anthropic");
    if (byok?.plaintext) return byok.plaintext;
  } catch {
    /* swallow — fall through to env */
  }
  const env = process.env.ANTHROPIC_API_KEY?.trim();
  return env && env.length > 0 ? env : null;
}

async function callAnthropic(
  apiKey: string,
  system: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
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
        model: LLM_MODEL,
        max_tokens: maxTokens,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    throw new Error(`anthropic ${r.status}: ${errText.slice(0, 240)}`);
  }
  const data = (await r.json()) as {
    content?: Array<{ type: string; text: string }>;
  };
  return (data.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
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
