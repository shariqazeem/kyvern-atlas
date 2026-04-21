/* ════════════════════════════════════════════════════════════════════
   policy-engine — the heart of KyvernLabs.

   Given a vault's configured policy and a live spend snapshot, decide
   whether a proposed payment is ALLOWED or BLOCKED. Pure function; no
   DB access, no side effects, no time dependency beyond what's passed
   in. This is what every API request, SDK call, and audit log flows
   through.

   Contract:

     evaluatePayment(
       { vault, snapshot },
       { merchant, amountUsd, memo }
     ) => { decision, reason?, code? }

   ════════════════════════════════════════════════════════════════════ */

import type { VaultRecord, VaultSpendSnapshot } from "./vault-store";

/* ─── Types ─── */

export interface PaymentAttempt {
  merchant: string;        // a URL or bare host; we normalize
  amountUsd: number;
  memo?: string | null;
}

export type PolicyDecision = "allowed" | "blocked";

export type PolicyBlockCode =
  | "vault_paused"
  | "invalid_amount"
  | "amount_exceeds_per_tx"
  | "amount_exceeds_daily"
  | "amount_exceeds_weekly"
  | "merchant_not_allowed"
  | "invalid_merchant"
  | "velocity_cap"
  | "missing_memo";

export interface PolicyResult {
  decision: PolicyDecision;
  code?: PolicyBlockCode;
  reason?: string;

  /** Human-shaped diagnostics for the audit log and dashboard. */
  budget?: {
    dailyRemainingBefore: number;
    weeklyRemainingBefore: number;
    dailyRemainingAfter: number;
    weeklyRemainingAfter: number;
  };
  velocity?: {
    callsInWindow: number;
    windowLabel: string;
  };
}

export interface PolicyContext {
  vault: VaultRecord;
  snapshot: VaultSpendSnapshot;
}

/* ─── Helpers ─── */

/**
 * Normalize a merchant identifier to its bare host.
 *
 *   "https://api.openai.com/v1/chat"  → "api.openai.com"
 *   "api.openai.com/foo"              → "api.openai.com"
 *   "HTTPS://API.OpenAI.com/"         → "api.openai.com"
 */
export function normalizeMerchant(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0];
  s = s.split("?")[0];
  s = s.replace(/:\d+$/, ""); // strip port
  if (!s) return null;
  // Must look like a host (contains a dot OR is 'localhost')
  if (!s.includes(".") && s !== "localhost") return null;
  // Invalid characters (no whitespace, no quotes, etc)
  if (/\s/.test(s)) return null;
  return s;
}

function velocityWindowLabel(w: VaultRecord["velocityWindow"]): string {
  if (w === "1h") return "per hour";
  if (w === "1d") return "per day";
  return "per week";
}

function fmtUsd(n: number): string {
  if (n >= 100) return `$${n.toFixed(0)}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}

/* ─── The evaluation function ─── */

export function evaluatePayment(
  ctx: PolicyContext,
  attempt: PaymentAttempt,
): PolicyResult {
  const { vault, snapshot } = ctx;

  // 1. Kill switch trumps everything.
  if (vault.pausedAt) {
    return {
      decision: "blocked",
      code: "vault_paused",
      reason: "vault paused by owner",
    };
  }

  // 2. Amount sanity — must be a positive finite number.
  if (
    !Number.isFinite(attempt.amountUsd) ||
    attempt.amountUsd <= 0
  ) {
    return {
      decision: "blocked",
      code: "invalid_amount",
      reason: "amount must be a positive number",
    };
  }

  // 3. Merchant — normalize + allowlist check.
  const host = normalizeMerchant(attempt.merchant);
  if (!host) {
    return {
      decision: "blocked",
      code: "invalid_merchant",
      reason: "merchant is not a valid host",
    };
  }
  if (
    vault.allowedMerchants.length > 0 &&
    !vault.allowedMerchants.includes(host)
  ) {
    return {
      decision: "blocked",
      code: "merchant_not_allowed",
      reason: `${host} is not in the allowlist`,
    };
  }

  // 4. Per-tx cap.
  if (attempt.amountUsd > vault.perTxMaxUsd) {
    return {
      decision: "blocked",
      code: "amount_exceeds_per_tx",
      reason: `per-tx max ${fmtUsd(vault.perTxMaxUsd)}`,
    };
  }

  // 5. Daily budget.
  const dailyRemainingBefore = Math.max(
    0,
    vault.dailyLimitUsd - snapshot.spentToday,
  );
  if (attempt.amountUsd > dailyRemainingBefore) {
    return {
      decision: "blocked",
      code: "amount_exceeds_daily",
      reason: `daily cap ${fmtUsd(vault.dailyLimitUsd)}`,
      budget: {
        dailyRemainingBefore,
        dailyRemainingAfter: dailyRemainingBefore,
        weeklyRemainingBefore: Math.max(
          0,
          vault.weeklyLimitUsd - snapshot.spentThisWeek,
        ),
        weeklyRemainingAfter: Math.max(
          0,
          vault.weeklyLimitUsd - snapshot.spentThisWeek,
        ),
      },
    };
  }

  // 6. Weekly ceiling.
  const weeklyRemainingBefore = Math.max(
    0,
    vault.weeklyLimitUsd - snapshot.spentThisWeek,
  );
  if (attempt.amountUsd > weeklyRemainingBefore) {
    return {
      decision: "blocked",
      code: "amount_exceeds_weekly",
      reason: `weekly ceiling ${fmtUsd(vault.weeklyLimitUsd)}`,
      budget: {
        dailyRemainingBefore,
        dailyRemainingAfter: dailyRemainingBefore,
        weeklyRemainingBefore,
        weeklyRemainingAfter: weeklyRemainingBefore,
      },
    };
  }

  // 7. Velocity cap (rolling window).
  if (snapshot.callsInWindow >= vault.maxCallsPerWindow) {
    return {
      decision: "blocked",
      code: "velocity_cap",
      reason: `velocity cap (${vault.maxCallsPerWindow}/${vault.velocityWindow})`,
      velocity: {
        callsInWindow: snapshot.callsInWindow,
        windowLabel: velocityWindowLabel(vault.velocityWindow),
      },
    };
  }

  // 8. Memo requirement.
  if (vault.requireMemo && !attempt.memo?.trim()) {
    return {
      decision: "blocked",
      code: "missing_memo",
      reason: "memo required by policy",
    };
  }

  // All checks passed.
  return {
    decision: "allowed",
    budget: {
      dailyRemainingBefore,
      dailyRemainingAfter: dailyRemainingBefore - attempt.amountUsd,
      weeklyRemainingBefore,
      weeklyRemainingAfter: weeklyRemainingBefore - attempt.amountUsd,
    },
    velocity: {
      callsInWindow: snapshot.callsInWindow,
      windowLabel: velocityWindowLabel(vault.velocityWindow),
    },
  };
}
