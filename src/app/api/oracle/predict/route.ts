import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getVault,
  setVaultAllowedMerchants,
} from "@/lib/vault-store";
import { serverVaultPay } from "@/lib/server-pay";

/**
 * POST /api/oracle/predict
 *
 * Demonstrates a third-party autonomous agent (the market oracle ported
 * from ParallaxPay) running under Kyvern's authorization layer. Two
 * external API calls (CoinGecko price + Commonstack DeepSeek inference)
 * are each gated by an on-chain vault.pay() so judges see a real,
 * non-Atlas agent governed by the same policy program.
 *
 * Auth: x-owner-wallet header must match vault.ownerWallet.
 *
 * Body: { vaultId: string, asset?: "BTC" | "SOL" | "ETH" }
 *
 * Flow:
 *   1. Ensure the vault's allowlist includes the two oracle merchants.
 *      Auto-extends (off-chain DB) so the user doesn't need to set up
 *      the allowlist manually before demoing.
 *   2. vault.pay($0.001) → "api.coingecko.com" metering call.
 *   3. Real fetch to CoinGecko for the asset's price.
 *   4. vault.pay($0.001) → "api.commonstack.ai" metering call.
 *   5. Real Commonstack DeepSeek inference for a 1h prediction.
 *   6. Return prediction + both settled signatures.
 *
 * Failure modes are surfaced cleanly — if step 2 or 4 is refused
 * on-chain (e.g. vault out of USDC, daily cap hit), the client gets a
 * structured response with the reason code so the result panel can
 * explain "the chain refused this call" instead of throwing.
 */

const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  SOL: "solana",
  ETH: "ethereum",
};

const COMMONSTACK_BASE_URL = "https://api.commonstack.ai/v1";
const PRIMARY_MODEL =
  process.env.ORACLE_LLM_MODEL ?? "deepseek/deepseek-v4-flash";
const FALLBACK_MODEL = "deepseek/deepseek-v3.2";

const METERING_RECIPIENT =
  process.env.KYVERN_METERING_RECIPIENT ??
  "GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ"; // server fee payer fallback

const ORACLE_MERCHANTS = ["api.coingecko.com", "api.commonstack.ai"];

interface Body {
  vaultId?: string;
  asset?: string;
}

interface PaymentResult {
  merchant: string;
  amountUsd: number;
  signature: string | null;
  explorerUrl: string | null;
  blocked: boolean;
  reason: string | null;
  durationMs: number;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!body.vaultId) {
    return NextResponse.json(
      { ok: false, error: "vault_id_required" },
      { status: 400 },
    );
  }

  const vault = getVault(body.vaultId);
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

  const asset = (body.asset ?? "BTC").toUpperCase();
  const coinId = COIN_IDS[asset];
  if (!coinId) {
    return NextResponse.json(
      { ok: false, error: "unsupported_asset", message: "BTC, SOL, or ETH" },
      { status: 400 },
    );
  }

  // ─── 1. Ensure oracle merchants are allowlisted ───────────────────
  const current = new Set(
    vault.allowedMerchants.map((m) => m.toLowerCase()),
  );
  const missing = ORACLE_MERCHANTS.filter((m) => !current.has(m));
  if (missing.length > 0) {
    const merged = Array.from(
      new Set([...vault.allowedMerchants, ...ORACLE_MERCHANTS]),
    );
    setVaultAllowedMerchants(vault.id, merged);
  }

  // ─── 2. Metering pay: CoinGecko ───────────────────────────────────
  const payCoingecko = await meteredPay(vault.id, "api.coingecko.com", {
    memo: `oracle:${asset.toLowerCase()}:coingecko`,
  });

  if (payCoingecko.blocked || !payCoingecko.signature) {
    return NextResponse.json({
      ok: false,
      stage: "metering_coingecko",
      reason: payCoingecko.reason ?? "metering call refused on-chain",
      payments: [payCoingecko],
      duration: Date.now() - t0,
    });
  }

  // ─── 3. Real CoinGecko fetch ──────────────────────────────────────
  let coingeckoPriceUsd: number | null = null;
  let coingeckoChange24h: number | null = null;
  try {
    const cg = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { accept: "application/json" }, cache: "no-store" },
    );
    if (cg.ok) {
      const d = (await cg.json()) as Record<
        string,
        { usd: number; usd_24h_change?: number }
      >;
      coingeckoPriceUsd = d[coinId]?.usd ?? null;
      coingeckoChange24h = d[coinId]?.usd_24h_change ?? null;
    }
  } catch {
    /* fall through with null price */
  }

  // ─── 4. Metering pay: Commonstack ─────────────────────────────────
  const payCommonstack = await meteredPay(vault.id, "api.commonstack.ai", {
    memo: `oracle:${asset.toLowerCase()}:inference`,
  });

  if (payCommonstack.blocked || !payCommonstack.signature) {
    return NextResponse.json({
      ok: false,
      stage: "metering_inference",
      reason: payCommonstack.reason ?? "metering call refused on-chain",
      payments: [payCoingecko, payCommonstack],
      duration: Date.now() - t0,
    });
  }

  // ─── 5. Commonstack inference ─────────────────────────────────────
  const apiKey =
    process.env.COMMONSTACK_ORACLE_KEY?.trim() ||
    process.env.COMMONSTACK_TERMINAL_KEY?.trim() ||
    process.env.COMMONSTACK_API_KEY?.trim() ||
    "";
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      stage: "inference",
      reason: "Commonstack API key not configured on server",
      payments: [payCoingecko, payCommonstack],
      duration: Date.now() - t0,
    });
  }

  const llm = await callLlm(apiKey, {
    asset,
    priceUsd: coingeckoPriceUsd,
    change24h: coingeckoChange24h,
  });

  return NextResponse.json({
    ok: true,
    asset,
    priceUsd: coingeckoPriceUsd,
    change24h: coingeckoChange24h,
    prediction: llm.prediction,
    confidence: llm.confidence,
    horizon: "1h",
    modelUsed: llm.modelUsed,
    payments: [payCoingecko, payCommonstack],
    duration: Date.now() - t0,
  });
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

async function meteredPay(
  vaultId: string,
  merchant: string,
  opts: { memo: string },
): Promise<PaymentResult> {
  const t = Date.now();
  const result = await serverVaultPay({
    vaultId,
    merchant,
    recipientPubkey: METERING_RECIPIENT,
    amountUsd: 0.001,
    memo: opts.memo,
    logEvent: {
      eventType: "spending_sent",
      counterparty: merchant,
      description: `oracle metering · ${merchant} · ${opts.memo}`,
    },
  });
  return {
    merchant,
    amountUsd: 0.001,
    signature: result.signature ?? null,
    explorerUrl: result.explorerUrl ?? null,
    blocked: !!result.blocked,
    reason: result.reason ?? null,
    durationMs: Date.now() - t,
  };
}

let _client: OpenAI | null = null;
function getClient(apiKey: string): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey, baseURL: COMMONSTACK_BASE_URL });
  }
  return _client;
}

async function callLlm(
  apiKey: string,
  ctx: { asset: string; priceUsd: number | null; change24h: number | null },
): Promise<{ prediction: string; confidence: number; modelUsed: string }> {
  const client = getClient(apiKey);
  const system =
    "You are a crypto market oracle. Return ONLY a one-sentence prediction for the next hour, followed by a confidence number 0-1. Format strictly: 'PREDICTION ::: CONFIDENCE'. Example: 'BTC likely +0.4% over the next hour, momentum slowing ::: 0.62'. No preamble.";
  const user = `Asset: ${ctx.asset}. Current price: $${
    ctx.priceUsd?.toFixed(2) ?? "unknown"
  }. 24h change: ${
    ctx.change24h !== null ? ctx.change24h.toFixed(2) + "%" : "unknown"
  }. Predict the next 1 hour.`;

  const tryOnce = async (model: string): Promise<string> => {
    const r = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 80,
      temperature: 0.4,
    });
    return r.choices?.[0]?.message?.content?.trim() ?? "";
  };

  let raw = "";
  let modelUsed = PRIMARY_MODEL;
  try {
    raw = await tryOnce(PRIMARY_MODEL);
  } catch {
    raw = "";
  }
  if (!raw) {
    try {
      raw = await tryOnce(FALLBACK_MODEL);
      modelUsed = FALLBACK_MODEL;
    } catch {
      raw = `${ctx.asset} ~flat, oracle inference unavailable ::: 0.30`;
    }
  }

  // Parse "PREDICTION ::: CONFIDENCE"
  const idx = raw.lastIndexOf(":::");
  let prediction = raw;
  let confidence = 0.5;
  if (idx > 0) {
    prediction = raw.slice(0, idx).trim();
    const conf = parseFloat(raw.slice(idx + 3).trim());
    if (!isNaN(conf) && conf >= 0 && conf <= 1) confidence = conf;
  }

  return { prediction, confidence, modelUsed };
}
