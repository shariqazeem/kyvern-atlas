#!/usr/bin/env -S npx tsx
/* ════════════════════════════════════════════════════════════════════
   bootstrap-solana-signer.ts — one-shot setup for the server signer.

   What it does:
     1. Resolves (or generates + writes) the server signer keypair
     2. On devnet, requests an airdrop so the signer can pay rent/fees
     3. Prints a summary: pubkey, source, balance, RPC URL

   Usage:
     npx tsx scripts/bootstrap-solana-signer.ts                # devnet
     npx tsx scripts/bootstrap-solana-signer.ts mainnet        # mainnet (no airdrop)

   Env overrides:
     KYVERN_FEE_PAYER_SECRET   — base58 secret key (wins over file)
     KYVERN_KEYSTORE_DIR       — dir to write ./server-signer.json
     KYVERN_SOLANA_RPC_URL     — custom RPC host
   ════════════════════════════════════════════════════════════════════ */

import { loadServerSigner, describeKeystore } from "../src/lib/solana-keystore";
import { squadsConfigSummary } from "../src/lib/squads-v4";

function arg(n: number): string | undefined {
  return process.argv[n + 2];
}

function parseNetwork(v: string | undefined): "devnet" | "mainnet" {
  return v === "mainnet" ? "mainnet" : "devnet";
}

async function main() {
  const network = parseNetwork(arg(0));
  const squads = squadsConfigSummary();

  console.log("┌─ KyvernLabs · solana signer bootstrap");
  console.log(`│  network:           ${network}`);
  console.log(`│  mode:              ${squads.mode}`);
  console.log(`│  rpc (devnet):      ${squads.rpcUrlDevnet}`);
  console.log(`│  rpc (mainnet):     ${squads.rpcUrlMainnet}`);
  console.log(`│  fee-payer env:     ${squads.feePayerEnvConfigured}`);
  console.log(`│  custom RPC env:    ${squads.rpcConfigured}`);
  console.log("└──");

  // Loading with allowBootstrap:true will mint + persist a keypair if none
  // is found, and (on devnet) will request an airdrop if the balance is low.
  const signer = await loadServerSigner({
    network,
    allowBootstrap: true,
  });

  console.log();
  console.log("✓ server signer ready");
  console.log(`  source:        ${signer.source}`);
  console.log(`  pubkey:        ${signer.pubkey}`);
  console.log(`  sol balance:   ${signer.solBalance.toFixed(4)} SOL`);
  console.log(`  airdropped:    ${signer.airdropped}`);

  if (network === "devnet" && signer.solBalance < 0.1) {
    console.warn();
    console.warn("⚠ signer balance is still very low after bootstrap.");
    console.warn("  The devnet faucet is rate-limited; try again in a minute,");
    console.warn("  or fund the address manually:");
    console.warn(`    solana airdrop 2 ${signer.pubkey} --url https://api.devnet.solana.com`);
  }

  if (network === "mainnet") {
    console.warn();
    console.warn("⚠ mainnet mode — this script does NOT airdrop SOL.");
    console.warn("  You must fund the signer address yourself before use:");
    console.warn(`    ${signer.pubkey}`);
  }

  // One more describe call so we see the "read-only" diagnostics shape
  // the /api/health/solana endpoint will return.
  const health = await describeKeystore(network);
  console.log();
  console.log("health snapshot:");
  console.log(JSON.stringify(health, null, 2));
}

main().catch((e) => {
  console.error("bootstrap failed:", e);
  process.exit(1);
});
