import { NextRequest, NextResponse } from "next/server";
import { serverVaultPay } from "@/lib/server-pay";
import { getVault } from "@/lib/vault-store";

/**
 * POST /api/devices/[id]/drain-attempt
 *
 * The "try to drain your device" button on the Pay & Enforce tab.
 * Fires a real $50 vault.pay() to a clearly-disallowed merchant —
 * so the chain rejects on at least two grounds (per-tx cap + amount
 * exceeds daily, possibly merchant allowlist). Returns the policy
 * code + reason so the UI can render the exact failure mode.
 *
 * The point: the judge presses one button and the chain visibly says
 * NO. Real failed Solana transaction (or refused at policy stage with
 * no on-chain noise — both make the same point).
 */

const ATTEMPT_USD = 50;
const ATTEMPT_MERCHANT = "drain.example.com";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json(
      { ok: false, reason: "device not found" },
      { status: 404 },
    );
  }

  // Use Atlas's owner wallet as a syntactically-valid recipient. The
  // payment will never reach it because the policy program rejects
  // on per-tx cap before any USDC moves. The recipient field just has
  // to be a valid pubkey for the pre-policy checks to pass.
  const pay = await serverVaultPay({
    vaultId: params.id,
    merchant: ATTEMPT_MERCHANT,
    recipientPubkey: vault.ownerWallet, // self — won't reach anyway
    amountUsd: ATTEMPT_USD,
    memo: "drain-attempt-from-app",
    logEvent: {
      eventType: "attack_blocked",
      counterparty: ATTEMPT_MERCHANT,
      description: `Drain attempt — $${ATTEMPT_USD} to ${ATTEMPT_MERCHANT}`,
    },
  });

  return NextResponse.json({
    ok: pay.success,
    signature: pay.signature ?? null,
    reason: pay.reason ?? null,
  });
}
