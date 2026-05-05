import { NextRequest, NextResponse } from "next/server";
import { serverVaultPay } from "@/lib/server-pay";
import { getVault } from "@/lib/vault-store";

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
    reason: pay.reason ?? null,
    decisionMs,
    inputs: { merchant, amountUsd, memo },
  });
}

function pay_isOk(amount: number, perTxMax: number): boolean {
  return amount <= perTxMax;
}
