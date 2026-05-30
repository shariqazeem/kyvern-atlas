/**
 * vault.pay + transfer.usdc step executors.
 *
 * Both routes the user's USDC through the existing on-chain policy
 * program via serverVaultPay. The two step types are sugar around
 * the same primitive:
 *
 *   vault.pay        — { merchant, to, amount, memo }
 *                      The merchant label is the rule-check key
 *                      (e.g. "api.openai.com"). Use this when the
 *                      user is paying for a service.
 *
 *   transfer.usdc    — { to, amount, memo }
 *                      Synthetic merchant label "self_transfer". Use
 *                      this for KAST top-ups or sending to your own
 *                      allowlisted address.
 *
 * Both write a row through serverVaultPay.logEvent so the activity
 * lands in the user's per-vault event feed automatically.
 */

import { serverVaultPay } from "@/lib/server-pay";
import { interpolate, resolveNumber } from "../interpolate";
import type {
  RunContext,
  StepExecutionResult,
  TransferUsdcStepConfig,
  VaultPayStepConfig,
} from "../types";

/** Coarse cost-of-spend estimate. The actual on-chain cost is
 *  ~5000 lamports (about $0.0005 at SOL ~$100), but for budget
 *  purposes we count the spend amount itself — that's what the user
 *  cares about when they cap "max $X per run". */
function spendCostUsd(amountUsd: number): number {
  return amountUsd;
}

export async function executeVaultPay(
  ctx: RunContext,
  config: VaultPayStepConfig,
): Promise<StepExecutionResult> {
  const merchant = interpolate(config.merchant, ctx.vars).trim();
  const to = interpolate(config.to, ctx.vars).trim();
  const memo = interpolate(config.memo, ctx.vars);
  let amountUsd: number;
  try {
    amountUsd = resolveNumber(config.amount, ctx.vars, "vault.pay.amount");
  } catch (e) {
    return {
      ok: false,
      output: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
  if (amountUsd <= 0) {
    return { ok: false, output: null, error: "amount must be > 0" };
  }
  if (!merchant) {
    return { ok: false, output: null, error: "merchant required" };
  }
  if (!to) {
    return { ok: false, output: null, error: "recipient address required" };
  }

  const result = await serverVaultPay({
    vaultId: ctx.vaultId,
    merchant,
    recipientPubkey: to,
    amountUsd,
    memo,
    // Real on-chain failed tx on refusal so the SDK audit row in
    // /app stays verifiable on Explorer.
    forceOnChain: true,
    logEvent: {
      eventType: "spending_sent",
      counterparty: merchant,
      description: `${merchant} · $${amountUsd.toFixed(3)}`,
    },
  });

  if (result.success) {
    return {
      ok: true,
      output: {
        signature: result.signature,
        explorerUrl: result.explorerUrl,
        amountUsd,
        merchant,
        to,
      },
      signature: result.signature ?? undefined,
      signatureStatus: "success",
      costUsd: spendCostUsd(amountUsd),
    };
  }

  return {
    ok: false,
    output: {
      reason: result.reason ?? "unknown",
      blocked: result.blocked === true,
      signature: result.signature ?? null,
      explorerUrl: result.explorerUrl ?? null,
    },
    error: result.reason ?? "vault.pay rejected",
    signature: result.signature ?? undefined,
    signatureStatus: "failed",
    costUsd: 0,
  };
}

export async function executeTransferUsdc(
  ctx: RunContext,
  config: TransferUsdcStepConfig,
): Promise<StepExecutionResult> {
  // Sugar around vault.pay with a synthetic merchant label. The
  // "self_transfer" label is reserved — we surface it in the rule
  // engine as MY_KAST + similar self-allowlist destinations.
  return executeVaultPay(ctx, {
    merchant: "self_transfer",
    to: config.to,
    amount: config.amount,
    memo: config.memo,
  });
}
