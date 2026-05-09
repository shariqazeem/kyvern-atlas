/**
 * ════════════════════════════════════════════════════════════════════
 * Sample Kyvern agent — pay.sh + KAST.
 *
 * Three behaviours every builder needs to see:
 *
 *   1. checkAllowance + over-cap pay.sh call — the agent asks the
 *      vault FIRST. Kyvern refuses ($5 exceeds the per-tx cap).
 *      pay.sh is never called. The local-wallet prompt would never
 *      have fired. The chain decided before any rail did.
 *
 *   2. checkAllowance + allowed pay.sh call — Kyvern allows the
 *      $0.001 spend, pay.sh's CLI handles the 402 challenge and
 *      returns real API response data, and Kyvern settles the
 *      budgeted spend on Solana via the policy program.
 *
 *   3. KAST payout (optional) — if MY_KAST_ADDRESS is set, the
 *      agent routes a share of accrued earnings to the user's
 *      KAST-funded card. Real on-chain USDC transfer, real card
 *      top-up.
 *
 * Pay.sh is the Solana Foundation's HTTP-402 payment layer
 * (https://pay.sh). Their docs say "Real payments still require
 * local user authorization." Kyvern is the policy layer above the
 * rails — the chain takes the place of the wallet approval prompt
 * so an agent can run autonomously without compromising safety.
 *
 * Kyvern is *compatible with pay.sh and any HTTP-402 rail.* Not
 * partnered with pay.sh. The composability is the integration.
 *
 * Kyvern is *compatible with KAST deposit rails.* Not affiliated
 * with KAST.
 * ════════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Vault, KastDestination } from "@kyvernlabs/sdk";

const execFileAsync = promisify(execFile);

function env(name: string, required = true): string {
  const v = process.env[name];
  if (required && (!v || v.trim().length === 0)) {
    throw new Error(`missing ${name} in .env — see .env.example`);
  }
  return (v ?? "").trim();
}

const PAYSH_DEMO_URL =
  process.env.PAYSH_DEMO_URL ?? "https://debugger.pay.sh/mpp/quote/AAPL";
const PAY_BIN = process.env.PAY_BIN ?? "pay";

async function runPayShSandbox(url: string): Promise<string> {
  const { stdout } = await execFileAsync(PAY_BIN, ["--sandbox", "curl", url], {
    timeout: 30_000,
    maxBuffer: 256 * 1024,
  });
  return stdout.trim();
}

async function main() {
  const vault = new Vault({
    agentKey: env("KYVERN_AGENT_KEY"),
    baseUrl: env("KYVERN_BASE_URL", false) || "https://kyvernlabs.com",
  });

  const myKast = process.env.MY_KAST_ADDRESS
    ? KastDestination.fromAddress(process.env.MY_KAST_ADDRESS)
    : null;

  console.log("\nKyvern + pay.sh + KAST sample agent");
  console.log(`  pay.sh service:  ${PAYSH_DEMO_URL}`);
  console.log(`  MY_KAST set:     ${myKast ? "yes" : "no"}\n`);

  /* ── 1. checkAllowance + over-cap pay.sh call (BLOCKED) ── */
  console.log("→ 1. ask the vault FIRST: $5 to pay.sh (over the per-tx cap)");
  {
    const allowance = await vault.checkAllowance({
      merchant: "api.pay.sh",
      amount: 5,
      memo: "perplexity search",
    });
    if (allowance.decision === "blocked") {
      console.log(`   ✓ Kyvern refused before pay.sh fired`);
      console.log(`   reason: ${allowance.reason}`);
      console.log(`   pay.sh is NOT invoked — the chain stopped it.\n`);
    } else {
      console.log(`   ? unexpectedly allowed — proceeding anyway\n`);
    }
  }

  /* ── 2. checkAllowance + allowed pay.sh call (SETTLED) ── */
  console.log("→ 2. ask the vault FIRST: $0.001 to pay.sh (within policy)");
  {
    const allowance = await vault.checkAllowance({
      merchant: "api.pay.sh",
      amount: 0.001,
      memo: "AAPL quote",
    });
    if (allowance.decision !== "allowed") {
      console.log(`   ✗ Kyvern refused: ${allowance.reason}`);
    } else {
      console.log(`   ✓ Kyvern allowed — invoking pay.sh`);
      try {
        const response = await runPayShSandbox(PAYSH_DEMO_URL);
        // pay.sh interleaves status events; show the last few lines
        const tail = response.split("\n").slice(-3).join("\n");
        console.log(`   pay.sh response:\n${tail}\n`);
      } catch (e) {
        console.error(
          `   ✗ pay.sh failed (is "pay" installed? brew/npm install -g @solana/pay):`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  /* ── 3. KAST payout (optional, only if MY_KAST_ADDRESS set) ── */
  if (myKast) {
    console.log("→ 3. route earnings to MY_KAST (real on-chain USDC transfer)");
    try {
      const res = await vault.pay({
        ...myKast,
        amount: 0.10,
        memo: "weekly earnings share",
      });
      if (res.decision === "allowed") {
        console.log(`   ✓ settled — ${res.tx.explorerUrl}\n`);
      } else {
        console.log(`   ✗ blocked: ${res.code} — ${res.reason}\n`);
      }
    } catch (e) {
      console.error("   ✗ error:", e instanceof Error ? e.message : e, "\n");
    }
  } else {
    console.log("→ 3. set MY_KAST_ADDRESS in .env to enable the KAST payout step.\n");
  }

  console.log("done.\n");
}

main().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(1);
});
