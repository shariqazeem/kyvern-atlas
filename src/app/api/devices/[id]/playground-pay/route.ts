import { NextRequest, NextResponse } from "next/server";
import { serverVaultPay } from "@/lib/server-pay";
import { getVault } from "@/lib/vault-store";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * POST /api/devices/[id]/playground-pay
 *
 * The Policy Playground in Tab 3 — judge punches in a merchant +
 * amount + memo, this endpoint runs it through serverVaultPay (the
 * real on-chain path), returns the chain's decision.
 *
 * Same backend path the SDK uses. The point of the playground is to
 * let the user FEEL the policy program decide, without copy-pasting
 * code or opening a terminal. Real chain enforcement, no theater.
 *
 * Body: { merchant, amountUsd, memo? }
 * Returns: { ok, signature, reason, decisionMs }
 */

interface Body {
  merchant?: unknown;
  amountUsd?: unknown;
  memo?: unknown;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limit per IP — `forceOnChain` mode burns ~5000 lamports of
  // server fee-payer SOL on every blocked attempt (Squads charges fees
  // even on failed txs). 3/min, 10/hr is enough for a judge to try
  // every scenario; not enough to drain the fee payer.
  const ip = getClientIP(req);
  const perMin = checkRateLimit(`playground-pay:min:${ip}`, 3, 60_000);
  if (!perMin.allowed) {
    return NextResponse.json(
      {
        ok: false,
        reason: "rate_limited",
        message: "Too many tests — try 3 per minute.",
        retryAfterSeconds: Math.ceil(perMin.resetIn / 1000),
      },
      { status: 429 },
    );
  }
  const perHour = checkRateLimit(`playground-pay:hr:${ip}`, 10, 60 * 60_000);
  if (!perHour.allowed) {
    return NextResponse.json(
      {
        ok: false,
        reason: "rate_limited",
        message: "Hourly cap reached — come back in an hour.",
        retryAfterSeconds: Math.ceil(perHour.resetIn / 1000),
      },
      { status: 429 },
    );
  }

  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, reason: "device not found" },
      { status: 404 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid json" },
      { status: 400 },
    );
  }

  const merchant = String(body.merchant ?? "").trim();
  const amountUsd = Number(body.amountUsd);
  const memo =
    typeof body.memo === "string" && body.memo.trim()
      ? String(body.memo).trim().slice(0, 200)
      : "playground-test";

  if (!merchant) {
    return NextResponse.json(
      { ok: false, reason: "merchant required" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return NextResponse.json(
      { ok: false, reason: "amountUsd must be > 0" },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  const pay = await serverVaultPay({
    vaultId: params.id,
    merchant,
    recipientPubkey: vault.ownerWallet, // self — never lands on disallowed
    amountUsd,
    memo,
    // Force Squads-enforceable violations (per-tx, daily, weekly cap)
    // onto chain so the user sees a real failed tx in Explorer rather
    // than a 1ms off-chain "caught locally". Other violations stay
    // off-chain — see SQUADS_ENFORCED_CODES in server-pay.ts.
    forceOnChain: true,
    trigger: "user",
    logEvent: {
      eventType: pay_isOk(amountUsd, vault.perTxMaxUsd) ? "spending_sent" : "attack_blocked",
      counterparty: merchant,
      description: `Playground · $${amountUsd.toFixed(2)} → ${merchant}`,
    },
  });
  const decisionMs = Date.now() - startedAt;

  return NextResponse.json({
    ok: pay.success,
    signature: pay.signature ?? null,
    explorerUrl: pay.explorerUrl ?? null,
    reason: pay.reason ?? null,
    decisionMs,
    inputs: { merchant, amountUsd, memo },
  });
}

function pay_isOk(amount: number, perTxMax: number): boolean {
  return amount <= perTxMax;
}
