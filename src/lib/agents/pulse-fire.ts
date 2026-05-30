/**
 * Pulse trigger-fire side-effect — Phase 2 (KYVERN_FRONTIER_GRAND_CHAMPION).
 *
 * When a Pulse trigger crosses (price ≤ threshold for direction='below'
 * or price ≥ threshold for direction='above') the runner emits a
 * `kind=trigger_fired` signal AND fires a real on-chain payment so the
 * inbox card has a verifiable Solana Explorer link.
 *
 * Two callers, same helper:
 *   1. message-user.ts — when the LLM emits message_user with
 *      kind=trigger_fired (the LLM-driven path).
 *   2. scripted.ts — when the scripted Pulse fallback evaluates the
 *      configured triggers and finds one that has crossed (the
 *      deterministic path that runs when the LLM is rate-limited).
 *
 * Both paths converge on serverVaultPay so the on-chain artifact is
 * identical regardless of which runner produced it.
 *
 * target_token set  → memo "kvn.swap.{TOKEN} {asset}@$X"
 *                     merchant "kyvern.swap.{token}"
 *                     Routes through the same coSignPayment path; the
 *                     chain-enforced swap_via_oracle ix (deployed
 *                     2026-05-07) is the next-iteration wire when
 *                     per-vault policy PDAs are initialized.
 *
 * target_token unset → memo "gemini-flash · {asset}@$X · validate trigger"
 *                     merchant "api.pay.sh/gemini"
 *                     Pay.sh-shaped fallback so every trigger lands
 *                     a real Solana Explorer artifact today.
 */

import { serverVaultPay } from "@/lib/server-pay";
import { TREASURY_VAULT_ID, treasuryRecipientPubkey } from "./treasury";
import type { PulseTrigger } from "./types";

export interface FirePulseInput {
  agentId: string;
  deviceId: string;
  trigger: PulseTrigger;
  /** Live price the runner observed when the trigger crossed. */
  livePrice: number | null;
  /** Optional override label for the counterparty in the device log. */
  counterpartyLabel?: string;
}

export interface FirePulseResult {
  signature: string | null;
  blocked: boolean;
  reason: string | null;
}

export async function firePulseTrigger(
  input: FirePulseInput,
): Promise<FirePulseResult> {
  if (input.deviceId === TREASURY_VAULT_ID) {
    return { signature: null, blocked: false, reason: "treasury_vault" };
  }

  let recipientPubkey: string;
  try {
    recipientPubkey = treasuryRecipientPubkey();
  } catch {
    return { signature: null, blocked: false, reason: "treasury_unavailable" };
  }

  const trigger = input.trigger;
  const asset = (trigger.asset ?? "").toUpperCase();
  // Cap at trigger amount AND program-level $50 ceiling (defense in depth
  // against the rare runner bug that emits a trigger_fired without
  // re-validating amount_usd).
  const amount = Math.min(
    Math.max(Number(trigger.amount_usd) || 0, 0.01),
    50,
  );

  const priceStr = input.livePrice
    ? input.livePrice < 1
      ? `$${input.livePrice.toFixed(6)}`
      : `$${input.livePrice.toFixed(2)}`
    : "live";

  const merchant = trigger.target_token
    ? `kyvern.swap.${trigger.target_token.toLowerCase()}`
    : "api.pay.sh/gemini";
  const memo = trigger.target_token
    ? `kvn.swap.${trigger.target_token} ${asset}@${priceStr}`
    : `gemini-flash · ${asset}@${priceStr} · validate trigger`;

  const counterparty =
    input.counterpartyLabel ??
    (trigger.target_token
      ? `↻ Kyvern · swap router (${trigger.target_token})`
      : "🛰️ Pay.sh · Gemini");

  const fire = await serverVaultPay({
    vaultId: input.deviceId,
    merchant,
    recipientPubkey,
    amountUsd: amount,
    memo,
    // See stake-on-finding for rationale — emit a real on-chain failed
    // tx when the policy refuses so blocked rows in the audit table
    // are still verifiable on Explorer.
    forceOnChain: true,
    logEvent: {
      eventType: "spending_sent",
      abilityId: "pulse_trigger_fire",
      counterparty,
      description: `Pulse fired · $${amount.toFixed(3)} · ${asset}@${priceStr}${
        trigger.target_token ? ` → ${trigger.target_token}` : ""
      }`,
    },
  });

  if (!fire.success || !fire.signature) {
    return {
      signature: null,
      blocked: !!fire.blocked,
      reason: fire.reason ?? null,
    };
  }
  return { signature: fire.signature, blocked: false, reason: null };
}

/**
 * Pure check: did this trigger cross? Used by both the scripted runner
 * (per-tick evaluation) and any UI that wants to render a "live · X
 * away" badge next to each configured trigger.
 *
 *   direction='below' AND price ≤ threshold → crossed
 *   direction='above' AND price ≥ threshold → crossed
 *   within ±5% but not crossed → armed
 *   otherwise → idle
 */
export function evaluateTrigger(
  trigger: PulseTrigger,
  price: number,
): "fired" | "armed" | "idle" {
  const t = Number(trigger.threshold_usd);
  if (!isFinite(t) || !isFinite(price)) return "idle";
  if (trigger.direction === "below") {
    if (price <= t) return "fired";
    if (price <= t * 1.05) return "armed";
    return "idle";
  }
  if (trigger.direction === "above") {
    if (price >= t) return "fired";
    if (price >= t * 0.95) return "armed";
    return "idle";
  }
  return "idle";
}
