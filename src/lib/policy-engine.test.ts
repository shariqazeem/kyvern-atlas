/* ════════════════════════════════════════════════════════════════════
   Policy-engine tests — the security-critical core.

   Every block code + the allowed path has a test. These tests are pure;
   no DB, no network, no clock — just the evaluation function against
   hand-built vault/snapshot fixtures.

   Run:  npx vitest run
   ════════════════════════════════════════════════════════════════════ */

import { describe, it, expect } from "vitest";
import { evaluatePayment, normalizeMerchant } from "./policy-engine";
import type { VaultRecord, VaultSpendSnapshot } from "./vault-store";

/* ─── Fixtures ─── */

function makeVault(overrides: Partial<VaultRecord> = {}): VaultRecord {
  return {
    id: "vlt_test",
    ownerWallet: "5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6",
    name: "Test vault",
    emoji: "🧪",
    purpose: "research",
    dailyLimitUsd: 10,
    weeklyLimitUsd: 50,
    perTxMaxUsd: 1,
    maxCallsPerWindow: 60,
    velocityWindow: "1h",
    allowedMerchants: ["api.openai.com", "api.anthropic.com"],
    requireMemo: false,
    squadsAddress: "StubSquads1111111111111111111111111111111111",
    network: "devnet",
    pausedAt: null,
    vaultPda: null,
    createSignature: null,
    spendingLimitPda: null,
    spendingLimitCreateKey: null,
    setSpendingLimitSignature: null,
    createdAt: "2026-04-16T00:00:00Z",
    updatedAt: "2026-04-16T00:00:00Z",
    ...overrides,
  };
}

function makeSnapshot(
  overrides: Partial<VaultSpendSnapshot> = {},
): VaultSpendSnapshot {
  return {
    spentToday: 0,
    spentThisWeek: 0,
    callsInWindow: 0,
    windowStart: new Date(Date.now() - 3600 * 1000).toISOString(),
    ...overrides,
  };
}

const attempt = (
  merchant = "api.openai.com",
  amountUsd = 0.1,
  memo: string | null = "forecast",
) => ({ merchant, amountUsd, memo });

/* ─── Allowed path ─── */

describe("evaluatePayment — allowed", () => {
  it("passes a well-formed payment inside every limit", () => {
    const res = evaluatePayment(
      { vault: makeVault(), snapshot: makeSnapshot() },
      attempt(),
    );
    expect(res.decision).toBe("allowed");
    expect(res.budget?.dailyRemainingAfter).toBeCloseTo(10 - 0.1);
    expect(res.budget?.weeklyRemainingAfter).toBeCloseTo(50 - 0.1);
  });

  it("allows a payment that exactly equals the per-tx cap", () => {
    const res = evaluatePayment(
      { vault: makeVault({ perTxMaxUsd: 1 }), snapshot: makeSnapshot() },
      attempt("api.openai.com", 1),
    );
    expect(res.decision).toBe("allowed");
  });

  it("allows a payment that exactly fills the daily budget", () => {
    const res = evaluatePayment(
      {
        vault: makeVault({ dailyLimitUsd: 10, perTxMaxUsd: 10 }),
        snapshot: makeSnapshot({ spentToday: 9 }),
      },
      attempt("api.openai.com", 1),
    );
    expect(res.decision).toBe("allowed");
    expect(res.budget?.dailyRemainingAfter).toBe(0);
  });

  it("allows any merchant when allowlist is empty (open vault)", () => {
    const res = evaluatePayment(
      { vault: makeVault({ allowedMerchants: [] }), snapshot: makeSnapshot() },
      attempt("whatever.example.com"),
    );
    expect(res.decision).toBe("allowed");
  });
});

/* ─── Blocked paths ─── */

describe("evaluatePayment — blocked", () => {
  it("blocks when the vault is paused", () => {
    const res = evaluatePayment(
      {
        vault: makeVault({ pausedAt: "2026-04-16T12:00:00Z" }),
        snapshot: makeSnapshot(),
      },
      attempt(),
    );
    expect(res.decision).toBe("blocked");
    expect(res.code).toBe("vault_paused");
  });

  it("blocks non-positive amounts", () => {
    const res = evaluatePayment(
      { vault: makeVault(), snapshot: makeSnapshot() },
      attempt("api.openai.com", 0),
    );
    expect(res.code).toBe("invalid_amount");
  });

  it("blocks NaN amounts", () => {
    const res = evaluatePayment(
      { vault: makeVault(), snapshot: makeSnapshot() },
      attempt("api.openai.com", NaN),
    );
    expect(res.code).toBe("invalid_amount");
  });

  it("blocks amounts above the per-tx cap", () => {
    const res = evaluatePayment(
      { vault: makeVault({ perTxMaxUsd: 0.5 }), snapshot: makeSnapshot() },
      attempt("api.openai.com", 0.51),
    );
    expect(res.code).toBe("amount_exceeds_per_tx");
  });

  it("blocks when daily budget would be exceeded", () => {
    const res = evaluatePayment(
      {
        vault: makeVault({ dailyLimitUsd: 1, perTxMaxUsd: 1 }),
        snapshot: makeSnapshot({ spentToday: 0.8 }),
      },
      attempt("api.openai.com", 0.3),
    );
    expect(res.code).toBe("amount_exceeds_daily");
    expect(res.budget?.dailyRemainingBefore).toBeCloseTo(0.2);
  });

  it("blocks when weekly ceiling would be exceeded", () => {
    const res = evaluatePayment(
      {
        vault: makeVault({ weeklyLimitUsd: 5, dailyLimitUsd: 5 }),
        snapshot: makeSnapshot({ spentThisWeek: 4.9 }),
      },
      attempt("api.openai.com", 0.5),
    );
    expect(res.code).toBe("amount_exceeds_weekly");
  });

  it("blocks a merchant not in the allowlist", () => {
    const res = evaluatePayment(
      { vault: makeVault(), snapshot: makeSnapshot() },
      attempt("sketchy.xyz"),
    );
    expect(res.code).toBe("merchant_not_allowed");
  });

  it("blocks an unparseable merchant", () => {
    const res = evaluatePayment(
      { vault: makeVault(), snapshot: makeSnapshot() },
      attempt("   "),
    );
    expect(res.code).toBe("invalid_merchant");
  });

  it("blocks when velocity cap is hit", () => {
    const res = evaluatePayment(
      {
        vault: makeVault({ maxCallsPerWindow: 10 }),
        snapshot: makeSnapshot({ callsInWindow: 10 }),
      },
      attempt(),
    );
    expect(res.code).toBe("velocity_cap");
  });

  it("blocks when memo is required but missing", () => {
    const res = evaluatePayment(
      { vault: makeVault({ requireMemo: true }), snapshot: makeSnapshot() },
      attempt("api.openai.com", 0.1, null),
    );
    expect(res.code).toBe("missing_memo");
  });

  it("blocks when memo is required but empty/whitespace", () => {
    const res = evaluatePayment(
      { vault: makeVault({ requireMemo: true }), snapshot: makeSnapshot() },
      attempt("api.openai.com", 0.1, "   "),
    );
    expect(res.code).toBe("missing_memo");
  });
});

/* ─── Precedence ─── */

describe("block-code precedence", () => {
  it("pause beats everything else", () => {
    const res = evaluatePayment(
      {
        vault: makeVault({
          pausedAt: "2026-04-16T00:00:00Z",
          perTxMaxUsd: 0.01,
          allowedMerchants: [],
        }),
        snapshot: makeSnapshot({ spentToday: 999, callsInWindow: 999 }),
      },
      attempt("unknown.xyz", 999),
    );
    expect(res.code).toBe("vault_paused");
  });

  it("invalid amount beats merchant checks", () => {
    const res = evaluatePayment(
      { vault: makeVault(), snapshot: makeSnapshot() },
      attempt("unknown.xyz", -5),
    );
    expect(res.code).toBe("invalid_amount");
  });

  it("per-tx cap beats daily budget", () => {
    const res = evaluatePayment(
      {
        vault: makeVault({ perTxMaxUsd: 0.1, dailyLimitUsd: 0.1 }),
        snapshot: makeSnapshot(),
      },
      attempt("api.openai.com", 0.2),
    );
    expect(res.code).toBe("amount_exceeds_per_tx");
  });

  it("daily budget beats weekly ceiling", () => {
    const res = evaluatePayment(
      {
        vault: makeVault({
          dailyLimitUsd: 1,
          weeklyLimitUsd: 0.5,
          perTxMaxUsd: 5,
        }),
        snapshot: makeSnapshot({
          spentToday: 0.9,
          spentThisWeek: 0.4,
        }),
      },
      attempt("api.openai.com", 0.2),
    );
    expect(res.code).toBe("amount_exceeds_daily");
  });
});

/* ─── normalizeMerchant ─── */

describe("normalizeMerchant", () => {
  it.each([
    ["https://api.openai.com/v1/chat", "api.openai.com"],
    ["HTTPS://API.OpenAI.com/", "api.openai.com"],
    ["api.openai.com/foo", "api.openai.com"],
    ["api.openai.com:8443", "api.openai.com"],
    ["localhost:3000", "localhost"],
    ["  api.openai.com  ", "api.openai.com"],
  ])("normalizes %s → %s", (input, expected) => {
    expect(normalizeMerchant(input)).toBe(expected);
  });

  it.each([
    ["", null],
    ["   ", null],
    ["no-dot", null],
    ["api openai com", null],
  ])("rejects invalid input %s", (input, expected) => {
    expect(normalizeMerchant(input)).toBe(expected);
  });
});
