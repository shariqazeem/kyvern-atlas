/**
 * ════════════════════════════════════════════════════════════════════
 * Sample Kyvern agent
 *
 * Demonstrates the three behaviors every agent developer needs to see:
 *
 *   1. An ALLOWED call — the agent pays an allowlisted merchant; USDC
 *      moves on-chain; we print the Solana Explorer link.
 *   2. A BLOCKED call (policy) — the agent tries to pay an off-allowlist
 *      merchant; the Kyvern program rejects it; we print the *failed*
 *      transaction's Explorer link so you can see the program error in
 *      the logs.
 *   3. A BLOCKED call (cap) — the agent tries to overspend; our per-tx
 *      cap rejects before the Squads CPI fires.
 *
 * Every "blocked" outcome here is a real failed Solana transaction,
 * not an HTTP 402. Click the link. Read the logs. That's the guarantee.
 * ════════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { OnChainVault } from "@kyvernlabs/sdk";

function env(name: string, required = true): string {
  const v = process.env[name];
  if (required && (!v || v.trim().length === 0)) {
    throw new Error(`missing ${name} in .env — see .env.example`);
  }
  return (v ?? "").trim();
}

async function main() {
  const cluster = (env("KYVERN_CLUSTER") as "devnet" | "mainnet") || "devnet";
  const rpc = env("SOLANA_RPC_URL");
  const multisig = new PublicKey(env("KYVERN_MULTISIG"));
  const spendingLimit = new PublicKey(env("KYVERN_SPENDING_LIMIT"));
  const agent = Keypair.fromSecretKey(bs58.decode(env("KYVERN_AGENT_KEY")));
  const recipient = new PublicKey(env("RECIPIENT_WALLET"));
  const allowedMerchant = env("ALLOWED_MERCHANT", false) || "merchant.example.com";

  const connection = new Connection(rpc, "confirmed");

  const vault = new OnChainVault({
    cluster,
    connection,
    multisig,
    spendingLimit,
  });

  console.log(`\nKyvern agent · cluster ${cluster}`);
  console.log(`agent pubkey:   ${agent.publicKey.toBase58()}`);
  console.log(`multisig:       ${multisig.toBase58()}`);
  console.log(`spending limit: ${spendingLimit.toBase58()}\n`);

  /* ── 1. ALLOWED ── */
  console.log("→ 1. allowed: pay 0.10 to", allowedMerchant);
  try {
    const res = await vault.pay({
      agent,
      recipient,
      amount: 0.1,
      merchant: allowedMerchant,
      memo: "sample forecast call",
    });
    if (res.decision === "allowed") {
      console.log(`  ✓ on-chain:  ${res.explorerUrl}\n`);
    } else {
      console.log(`  ? unexpectedly blocked: ${res.code}`);
      console.log(`    log: ${res.log}`);
      console.log(`    ${res.explorerUrl}\n`);
    }
  } catch (e: any) {
    console.error("  ✗ error:", e?.message ?? e, "\n");
  }

  /* ── 2. BLOCKED: off-allowlist merchant ── */
  console.log("→ 2. blocked: pay 0.10 to evil.example.com (not allowlisted)");
  try {
    const res = await vault.pay({
      agent,
      recipient,
      amount: 0.1,
      merchant: "evil.example.com",
      memo: "should be rejected",
    });
    if (res.decision === "blocked") {
      console.log(`  ✓ rejected: ${res.code}`);
      console.log(`  on-chain:   ${res.explorerUrl}\n`);
    } else {
      console.log(`  ? unexpectedly allowed: ${res.explorerUrl}\n`);
    }
  } catch (e: any) {
    console.error("  ✗ error:", e?.message ?? e, "\n");
  }

  /* ── 3. BLOCKED: over-cap amount ── */
  console.log("→ 3. blocked: pay $5 (exceeds per-tx cap)");
  try {
    const res = await vault.pay({
      agent,
      recipient,
      amount: 5.0,
      merchant: allowedMerchant,
      memo: "overbudget",
    });
    if (res.decision === "blocked") {
      console.log(`  ✓ rejected: ${res.code}`);
      console.log(`  on-chain:   ${res.explorerUrl}\n`);
    } else {
      console.log(`  ? unexpectedly allowed: ${res.explorerUrl}\n`);
    }
  } catch (e: any) {
    console.error("  ✗ error:", e?.message ?? e, "\n");
  }

  console.log("done — paste any Explorer link above into your browser.\n");
}

main().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(1);
});
