#!/usr/bin/env -S npx tsx
/* ════════════════════════════════════════════════════════════════════
   seed-demo-vault.ts — one-shot script to populate a demo vault.

   Creates a vault called "Forecaster" with:
     · $20/day, $100/week, $0.50 per-tx
     · 4 allowed merchants (OpenAI, Anthropic, Perplexity, weather API)
     · A realistic stream of 42 payments over the last 26h:
         - 36 settled
         - 4 blocked (merchant not allowed, amount, memo, velocity)
         - 2 failed (simulated Squads retry)

   After running:
     1. Copy the printed vault ID
     2. Visit http://localhost:3000/vault/<id>
     3. See a dashboard that looks like it's been in production for a week

   Usage:
     KYVERNLABS_DB_PATH=./kyvernlabs.db npx tsx scripts/seed-demo-vault.ts

   This is a DEV-ONLY data seeder — it forces stub mode for Squads so it
   can run without RPC access. Production flows always use real mode.
   ════════════════════════════════════════════════════════════════════ */

// Force stub mode before any @/lib/squads-v4 imports resolve.
process.env.KYVERN_SQUADS_MODE = process.env.KYVERN_SQUADS_MODE ?? "stub";

import { createVault, issueAgentKey, recordPayment } from "../src/lib/vault-store";
import { createSmartAccount, setSpendingLimit } from "../src/lib/squads-v4";

const OWNER_WALLET = "5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6";

async function main() {
  console.log("seeding demo vault…");

  const smart = await createSmartAccount({
    ownerPubkey: OWNER_WALLET,
    vaultSeed: `demo-${Date.now()}`,
    network: "devnet",
  });

  const vault = createVault({
    ownerWallet: OWNER_WALLET,
    name: "Forecaster",
    emoji: "🧭",
    purpose: "research",
    dailyLimitUsd: 20,
    weeklyLimitUsd: 100,
    perTxMaxUsd: 0.5,
    maxCallsPerWindow: 60,
    velocityWindow: "1h",
    allowedMerchants: [
      "api.openai.com",
      "api.anthropic.com",
      "api.perplexity.ai",
      "weather-api.example.com",
    ],
    requireMemo: true,
    squadsAddress: smart.address,
    network: "devnet",
  });

  const { record: key, raw } = issueAgentKey(vault.id, "demo-agent");
  await setSpendingLimit({
    smartAccountAddress: vault.squadsAddress,
    agentKeyPubkey: null, // stub mode
    dailyLimitUsd: vault.dailyLimitUsd,
    weeklyLimitUsd: vault.weeklyLimitUsd,
    perTxMaxUsd: vault.perTxMaxUsd,
  });

  console.log("\nvault:", vault.id);
  console.log("agent key (store safely):", raw);
  console.log("squads:", vault.squadsAddress);

  /* ─── Seed activity ─── */

  const now = Date.now();
  const merchants = [
    "api.openai.com",
    "api.anthropic.com",
    "api.perplexity.ai",
    "weather-api.example.com",
  ];
  const memos = [
    "chat completion",
    "search query",
    "embedding lookup",
    "summary of tx history",
    "7-day forecast",
    "entity lookup",
    "translation",
    "re-ranking",
  ];

  let settled = 0;
  let blocked = 0;
  let failed = 0;

  // 36 settled — last 26 hours, random-ish spread.
  for (let i = 0; i < 36; i++) {
    const ageMs = randInt(60_000, 26 * 60 * 60 * 1000);
    const merchant = pick(merchants);
    const memo = pick(memos);
    const amount = round2(randFloat(0.01, 0.18));
    await insertBackdated({
      vaultId: vault.id,
      agentKeyId: key.id,
      merchant,
      amountUsd: amount,
      memo,
      status: "settled",
      reason: null,
      txSignature: stubSig(),
      latencyMs: randInt(180, 720),
      ageMs,
    });
    settled++;
  }

  // 2 failed
  for (let i = 0; i < 2; i++) {
    await insertBackdated({
      vaultId: vault.id,
      agentKeyId: key.id,
      merchant: pick(merchants),
      amountUsd: round2(randFloat(0.02, 0.15)),
      memo: pick(memos),
      status: "failed",
      reason: "squads rpc: block height exceeded",
      txSignature: null,
      latencyMs: randInt(2800, 5100),
      ageMs: randInt(3 * 60 * 60 * 1000, 10 * 60 * 60 * 1000),
    });
    failed++;
  }

  // 4 blocked — one of each interesting reason.
  await insertBackdated({
    vaultId: vault.id,
    agentKeyId: key.id,
    merchant: "sketchy-merchant.xyz",
    amountUsd: 0.05,
    memo: "outbound to random host",
    status: "blocked",
    reason: "merchant_not_allowed",
    txSignature: null,
    latencyMs: 12,
    ageMs: 55 * 60 * 1000,
  });
  await insertBackdated({
    vaultId: vault.id,
    agentKeyId: key.id,
    merchant: "api.openai.com",
    amountUsd: 2.5,
    memo: "16k token run",
    status: "blocked",
    reason: "amount_exceeds_per_tx",
    txSignature: null,
    latencyMs: 10,
    ageMs: 35 * 60 * 1000,
  });
  await insertBackdated({
    vaultId: vault.id,
    agentKeyId: key.id,
    merchant: "api.anthropic.com",
    amountUsd: 0.08,
    memo: null,
    status: "blocked",
    reason: "missing_memo",
    txSignature: null,
    latencyMs: 11,
    ageMs: 18 * 60 * 1000,
  });
  await insertBackdated({
    vaultId: vault.id,
    agentKeyId: key.id,
    merchant: "api.openai.com",
    amountUsd: 0.02,
    memo: "burst #47",
    status: "blocked",
    reason: "velocity_cap",
    txSignature: null,
    latencyMs: 9,
    ageMs: 4 * 60 * 1000,
  });
  blocked = 4;

  // Suppress unused-variable lint since `now` is only used above inside helpers.
  void now;

  console.log("\nseeded:");
  console.log(`  ${settled} settled`);
  console.log(`  ${blocked} blocked`);
  console.log(`  ${failed} failed`);

  console.log(`\nopen: http://localhost:3000/vault/${vault.id}`);
}

/* ─── helpers ─── */

async function insertBackdated(input: {
  vaultId: string;
  agentKeyId: string;
  merchant: string;
  amountUsd: number;
  memo: string | null;
  status: "allowed" | "blocked" | "settled" | "failed";
  reason: string | null;
  txSignature: string | null;
  latencyMs: number | null;
  ageMs: number;
}) {
  // Record via the store, then rewrite created_at so the timeline looks real.
  const payment = recordPayment({
    vaultId: input.vaultId,
    agentKeyId: input.agentKeyId,
    merchant: input.merchant,
    amountUsd: input.amountUsd,
    memo: input.memo,
    status: input.status,
    reason: input.reason,
    txSignature: input.txSignature,
    latencyMs: input.latencyMs,
  });
  const { getDb } = await import("../src/lib/db");
  const when = new Date(Date.now() - input.ageMs).toISOString().replace("T", " ").replace("Z", "");
  getDb()
    .prepare(`UPDATE vault_payments SET created_at = ? WHERE id = ?`)
    .run(when, payment.id);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function stubSig() {
  const BASE58 =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 88; i++) s += BASE58[Math.floor(Math.random() * BASE58.length)];
  return s;
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exit(1);
});
