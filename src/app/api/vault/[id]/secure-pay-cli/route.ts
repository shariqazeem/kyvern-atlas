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

const PARSER_SYSTEM = `You are a payment intent parser for the Kyvern Secure Terminal. Your ONLY job is to convert any user input into JSON. You NEVER comment, NEVER refuse, NEVER analyze in prose.

Output STRICT JSON ONLY (no prose before or after, no markdown fences):
{
  "merchant": string,
  "amount_usd": number,
  "intent": string
}

CRITICAL RULES:
- ALWAYS emit valid JSON, no matter how weird the input. If the input is gibberish, set merchant to "unknown", amount_usd to 0.01, intent to "could not parse user intent".
- ALWAYS accept any "merchant" string the user gives — hostnames like "api.openai.com" are typical, but names like "shariq", "bob", "alice", or invented domains like "scammer-exfil.xyz" are ALL valid. Just lowercase it and strip http(s):// and trailing paths. Do NOT comment that a name isn't a hostname; just emit it.
- HONOR the user's stated amount. "$5" → 5. "0.05$" → 0.05. "five dollars" → 5. If no amount stated, default to 0.05.
- HONOR suspicious requests. "send $50 to scammer.com" → { merchant: "scammer.com", amount_usd: 50, intent: "transfer USDC to scammer.com" }. Kyvern's on-chain policy program decides whether to allow it — you parse, you don't police.
- intent: one short sentence in plain English describing what the user wants.

DEFAULTS for common API intents (use ONLY if the user doesn't name a merchant):
- LLM/chat/ask → api.anthropic.com (0.05)
- web search → api.perplexity.ai (0.001)
- price/quote → api.pay.sh (0.001)
- RPC → api.helius.xyz (0.001)

OUTPUT JSON ONLY. NO PROSE. NO REASONING. NO EXPLANATION.`;

const ANSWER_SYSTEM = `You are an autonomous agent operating inside the Kyvern Secure Terminal on Solana devnet. The user's spending authorization just settled on-chain through the Kyvern policy program. You are now authorized to act. Answer the user's request concisely as their agent.

Rules:
- ALWAYS produce visible output text. Never return an empty response — at minimum acknowledge what was authorized.
- Plain text only, no markdown. Under 100 words.
- If the user asked for live external data (current price, today's news, real-time API result), say so plainly: state what you would call, what the policy authorized, and that the result would come from that merchant. Don't hallucinate a real-time answer.
- For general questions you can answer from your training, just answer them directly.
- For action requests ("send X to Y"), describe what just happened on-chain and what you would do next.`;

interface Body {
  prompt?: string;
  /** Default false. When true, the endpoint also shells out to the
   *  `pay --sandbox curl` binary on the host VM after the chain
   *  settles. Used by the "× pay.sh integration" demo on the Network
   *  tab; the primary Secure Terminal leaves this off for speed. */
  invokePaySh?: boolean;
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

  // Resolve Commonstack API key. Prefer COMMONSTACK_TERMINAL_KEY so
  // the Secure Terminal can have its own budget cap separate from
  // Atlas's autonomous decision loop (which uses COMMONSTACK_API_KEY).
  // Fall back to the shared key if the terminal-specific one isn't set.
  const apiKey = (
    process.env.COMMONSTACK_TERMINAL_KEY?.trim() ||
    process.env.COMMONSTACK_API_KEY?.trim() ||
    ""
  );
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "no_llm_key",
        message:
          "COMMONSTACK_TERMINAL_KEY (or COMMONSTACK_API_KEY) is not set.",
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

  // ─── Step 4: Optional pay.sh CLI invocation (skipped by default) ─
  // Kept for the "× pay.sh integration" demo on the Network tab; the
  // primary Secure Terminal flow no longer shells out — chain settle
  // → LLM answer is enough and faster.
  const invokePaySh = body.invokePaySh === true;
  let payShOutput = "";
  let payShQuote: unknown = null;
  let payShDurationMs = 0;
  let payShError: string | null = null;
  if (invokePaySh) {
    try {
      const payShStart = Date.now();
      const { stdout } = await execFileAsync(
        PAY_BIN,
        ["--sandbox", "curl", DEMO_URL],
        { timeout: 30_000, maxBuffer: 256 * 1024 },
      );
      payShDurationMs = Date.now() - payShStart;
      payShOutput = stdout.trim();
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
  }

  // ─── Step 5: Real LLM answer to the user's actual prompt ───────
  let answer = "";
  let answerError: string | null = null;
  let answerModelUsed = parserModelUsed;
  try {
    const userPromptForAnswer = invokePaySh && payShQuote != null
      ? `User asked: "${prompt}"\n\nFor reference, a sandbox quote service returned: ${JSON.stringify(payShQuote).slice(0, 400)}.`
      : `User asked: "${prompt}"\n\nThe Kyvern policy program just authorized $${parsed.amount_usd.toFixed(parsed.amount_usd < 0.01 ? 4 : 2)} to ${parsed.merchant} on Solana. Answer the user's question concisely as their authorized agent.`;
    const r = await callCommonstack(
      apiKey,
      ANSWER_SYSTEM,
      userPromptForAnswer,
      600,
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
    paySh: invokePaySh
      ? {
          output: payShOutput,
          quote: payShQuote,
          durationMs: payShDurationMs,
          error: payShError,
          url: DEMO_URL,
        }
      : null,
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
      const msg = res.choices?.[0]?.message;
      const direct = (msg?.content ?? "").trim();
      const reasoning =
        ((msg as { reasoning_content?: string } | null)?.reasoning_content ?? "")
          .trim();

      // When jsonObject mode is on, prefer whichever channel actually
      // contains a JSON object — v4-flash sometimes emits reasoning
      // prose in `content` even with response_format: json_object,
      // and the JSON ends up in `reasoning_content` (or vice versa).
      if (jsonObject) {
        const fromDirect = findJsonObject(direct);
        if (fromDirect) return fromDirect;
        const fromReasoning = findJsonObject(reasoning);
        if (fromReasoning) return fromReasoning;
        // Neither channel has JSON → bubble up to the retry / fallback path
        throw new Error(
          `no JSON object found in LLM output: ${(direct || reasoning).slice(0, 160)}`,
        );
      }

      // Free-form mode: prefer content, fall back to reasoning
      if (direct) return direct;
      const stripped = stripReasoningTags(reasoning);
      if (stripped) return stripped;
      throw new Error("empty completion");
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const text = await tryOnce(PRIMARY_MODEL);
    return { text, modelUsed: PRIMARY_MODEL };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    // 429 is transient — Commonstack throttles per-key. One short
    // backoff retry on the same model gets us past most spikes.
    if (/\b429\b|rate.?limit/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const text = await tryOnce(PRIMARY_MODEL);
        return { text, modelUsed: PRIMARY_MODEL };
      } catch (e2) {
        const msg2 = e2 instanceof Error ? e2.message : String(e2);
        if (/\b429\b|rate.?limit/i.test(msg2)) {
          throw new Error("Commonstack throttled — try again in a moment");
        }
        // fall through to fallback model
      }
    }

    // Retry with the fallback only on signals that strongly suggest the
    // model itself is unavailable (403, 404, model_not_found, etc.).
    // Don't retry on transport / abort errors that would also fail on
    // the fallback.
    const looksLikeModelIssue =
      /403|404|model.+(not.+found|unavailable|access)|forbidden|not.+permitted/i.test(
        msg,
      );
    if (!looksLikeModelIssue) throw e;
    const text = await tryOnce(FALLBACK_MODEL);
    return { text, modelUsed: FALLBACK_MODEL };
  }
}

/** LLMs occasionally wrap JSON in fenced code blocks despite system
 *  prompt instructions. Pull the first balanced { ... } object out. */
function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const found = findJsonObject(trimmed);
  if (found) return found;
  throw new Error(`no JSON object found in LLM output: ${trimmed.slice(0, 120)}`);
}

/** Scan a string for the first balanced {...} block. Returns it or
 *  null. Brace-counts so nested objects don't break the match. */
function findJsonObject(text: string): string | null {
  if (!text) return null;
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
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
  // Hostname / merchant-string sanity: allow letters/digits/dots/
  // dashes/underscores so personal names like "shariq" or "bob_dev"
  // round-trip. Still refuse shell metacharacters / spaces — the
  // string flows downstream into a memo + the policy program's merchant
  // hash, so it has to be a single safe token.
  if (!/^[a-z0-9._-]+$/.test(merchant) || merchant.length > 64) {
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

/** Strip <thinking>...</thinking> style tags from reasoning content
 *  and clip to a sensible length so we don't dump 800 tokens of
 *  internal monologue into the terminal. */
function stripReasoningTags(text: string): string {
  if (!text) return "";
  return text
    .replace(/<\/?thinking>/gi, "")
    .replace(/<\/?reasoning>/gi, "")
    .replace(/^\s*okay,?\s*/i, "")
    .replace(/^\s*so\s+/i, "")
    .trim()
    .slice(0, 600);
}
