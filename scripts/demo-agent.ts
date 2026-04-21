#!/usr/bin/env -S npx tsx
/* ════════════════════════════════════════════════════════════════════
   demo-agent.ts — the "look, it works" script.

   Runs a tiny AI-agent simulation against the Kyvern API:

     · 5 successful micro-payments to allowed merchants
     · 1 refused payment (merchant not on allowlist)
     · 1 refused payment (amount exceeds per-tx cap)
     · 1 refused payment (memo required but missing)
     · 1 deliberate burst to trip the velocity cap

   Usage:
     KYVERN_BASE_URL=http://localhost:3000 \
     KYVERNLABS_AGENT_KEY=kv_live_... \
     RECIPIENT=5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6 \
     npx tsx scripts/demo-agent.ts

   Designed to look great in a terminal next to the dashboard at
   /vault/[id] during the hackathon demo.
   ════════════════════════════════════════════════════════════════════ */

import { Vault } from "../packages/sdk/src";

const BASE_URL = process.env.KYVERN_BASE_URL ?? "http://localhost:3000";
const AGENT_KEY = requireEnv("KYVERNLABS_AGENT_KEY");
const RECIPIENT =
  process.env.RECIPIENT ?? "5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6";

const vault = new Vault({
  agentKey: AGENT_KEY,
  baseUrl: BASE_URL,
  timeoutMs: 20_000,
});

async function main() {
  banner("Kyvern demo agent · live");
  hint(`API: ${BASE_URL}`);
  hint(`Agent: ${AGENT_KEY.slice(0, 14)}…`);
  hint(`Recipient: ${RECIPIENT.slice(0, 6)}…${RECIPIENT.slice(-4)}`);

  await pause(400);

  /* ─── Scenario 1: healthy day ─── */
  section("Scenario 1 · A healthy day of agent payments");
  await tryPay(0.05, "api.openai.com", "chat completion (gpt-4o-mini)");
  await tryPay(0.02, "api.perplexity.ai", "search for ETH deposit addresses");
  await tryPay(0.08, "api.anthropic.com", "summarize last 10 transactions");
  await tryPay(0.01, "api.openai.com", "embedding lookup");
  await tryPay(0.04, "weather-api.example.com", "7-day forecast for SF");

  await pause(800);

  /* ─── Scenario 2: policy refusals ─── */
  section("Scenario 2 · The agent gets ambitious");

  await tryPay(0.05, "sketchy-merchant.xyz", "rogue call", {
    expectBlocked: "merchant_not_allowed",
  });

  await tryPay(999, "api.openai.com", "a 1-dollar run of GPT-4 agents", {
    expectBlocked: "amount_exceeds_per_tx",
  });

  // Missing memo — only blocks if vault.requireMemo === true.
  await tryPay(0.02, "api.anthropic.com", null, {
    expectBlocked: "missing_memo",
    quietIfAllowed: true,
  });

  await pause(800);

  /* ─── Scenario 3: velocity burst ─── */
  section("Scenario 3 · Rate-limit burst");
  hint("Firing 15 requests back-to-back — watch the dashboard tick up.");
  for (let i = 0; i < 15; i++) {
    await tryPay(
      0.01,
      "api.openai.com",
      `burst #${String(i + 1).padStart(2, "0")}`,
      { quiet: true },
    );
  }

  banner("Demo complete — refresh the dashboard to see final state.");
}

interface TryPayOptions {
  expectBlocked?: string;
  quiet?: boolean;
  quietIfAllowed?: boolean;
}

async function tryPay(
  amount: number,
  merchant: string,
  memo: string | null,
  opts: TryPayOptions = {},
) {
  const started = Date.now();
  try {
    const res = await vault.pay({
      merchant,
      recipientPubkey: RECIPIENT,
      amount,
      ...(memo !== null ? { memo } : {}),
    });
    const ms = Date.now() - started;
    if (res.decision === "allowed") {
      if (!opts.quiet && !opts.quietIfAllowed) {
        line(
          green("✓ allowed "),
          pad(`$${amount.toFixed(2)}`, 7),
          gray(" → "),
          pad(merchant, 28),
          gray(" "),
          gray(`${ms}ms`),
          gray("  "),
          dim(shortSig(res.tx.signature)),
        );
      }
    } else {
      const expected = opts.expectBlocked === res.code;
      line(
        expected ? yellow("✓ blocked") : red("✗ blocked"),
        pad(`$${amount.toFixed(2)}`, 7),
        gray(" → "),
        pad(merchant, 28),
        gray(" "),
        red(`[${res.code}]`),
        gray(" "),
        dim(res.reason ?? ""),
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    line(red("! error "), pad(`$${amount.toFixed(2)}`, 7), gray(" → "), merchant, gray("  "), red(msg));
  }
}

/* ─── tiny TTY helpers ─── */

function ansi(code: string, s: string) {
  return `\x1b[${code}m${s}\x1b[0m`;
}
const bold = (s: string) => ansi("1", s);
const dim = (s: string) => ansi("2", s);
const gray = (s: string) => ansi("90", s);
const red = (s: string) => ansi("31", s);
const green = (s: string) => ansi("32", s);
const yellow = (s: string) => ansi("33", s);
const blue = (s: string) => ansi("34", s);

function banner(text: string) {
  const bar = "═".repeat(Math.min(72, text.length + 4));
  console.log();
  console.log(blue(bar));
  console.log(blue("  ") + bold(text));
  console.log(blue(bar));
}
function section(title: string) {
  console.log();
  console.log(bold(title));
  console.log(gray("─".repeat(Math.min(72, title.length))));
}
function hint(s: string) {
  console.log(gray("  " + s));
}
function line(...parts: string[]) {
  console.log("  " + parts.join(""));
}
function pad(s: string, n: number) {
  if (s.length >= n) return s;
  return s + " ".repeat(n - s.length);
}
function shortSig(sig: string) {
  if (sig.length <= 20) return sig;
  return sig.slice(0, 8) + "…" + sig.slice(-6);
}

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(
      `\n${ansi("31", "✗")} missing env var ${ansi("1", name)}. ` +
        `Mint an agent key at /vault/new and export it before running.\n`,
    );
    process.exit(1);
  }
  return v;
}

main().catch((e) => {
  console.error(red("\ndemo failed: "), e);
  process.exit(1);
});
