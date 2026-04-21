#!/usr/bin/env -S npx tsx
/* ════════════════════════════════════════════════════════════════════
   fund-vault.ts — prep a freshly-created vault for real devnet payments.

   Why this exists:
     Squads v4 `spendingLimitUse` transfers SPL USDC from the vault's
     associated token account (ATA) to the recipient's ATA. If either
     ATA doesn't exist, Solana rejects the tx with
         "The program expected this account to be already initialized"
     which is what every first-time vault hits before funding.

   What this script does:
     1. Reads the vault record (via the API so the server-signer flows
        stay identical to production).
     2. Derives the vault's USDC ATA (devnet USDC mint).
     3. Derives the recipient's USDC ATA.
     4. For each ATA that doesn't exist, submits a
        `createAssociatedTokenAccountInstruction` paid by the server
        keystore signer.
     5. Prints a Circle devnet-USDC faucet link, prefilled with the
        vault's ATA, so the user can top up with one click.

   Usage:
     VAULT_ID=vlt_... \
     RECIPIENT=5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6 \
     [KYVERN_BASE_URL=https://app.kyvernlabs.com] \
     npx tsx scripts/fund-vault.ts

   Safe to run multiple times — skips ATAs that already exist.
   ════════════════════════════════════════════════════════════════════ */

import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as multisig from "@sqds/multisig";
import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

// ─── Config ───
const BASE_URL = process.env.KYVERN_BASE_URL ?? "https://app.kyvernlabs.com";
const VAULT_ID = requireEnv("VAULT_ID");
const RECIPIENT =
  process.env.RECIPIENT ?? "5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6";
const DEVNET_RPC = process.env.KYVERN_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`✗ missing env var ${name}`);
    process.exit(1);
  }
  return v;
}

// ─── Colours ───
const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};
const ok = (s: string) => console.log(`${c.green}✓${c.reset} ${s}`);
const warn = (s: string) => console.log(`${c.yellow}!${c.reset} ${s}`);
const dim = (s: string) => console.log(`${c.dim}${s}${c.reset}`);
const fail = (s: string) => console.log(`${c.red}✗${c.reset} ${s}`);

async function main() {
  console.log(`${c.cyan}${c.reset}`);
  console.log(`  Kyvern vault prep · devnet USDC ATAs`);
  console.log(`────────────────────────────────────────`);
  dim(`  Vault ID:  ${VAULT_ID}`);
  dim(`  Recipient: ${RECIPIENT}`);
  dim(`  API:       ${BASE_URL}`);

  // ── 1. Resolve vault PDA via the API (public info, no auth needed) ──
  const vaultRes = await fetch(`${BASE_URL}/api/vault/${VAULT_ID}`, {
    headers: { "Content-Type": "application/json" },
  });
  if (!vaultRes.ok) {
    fail(`could not fetch vault ${VAULT_ID} → HTTP ${vaultRes.status}`);
    process.exit(1);
  }
  const vaultData = (await vaultRes.json()) as {
    vault?: { squadsAddress: string; network: string };
  };
  if (!vaultData.vault) {
    fail(`no vault in response — body: ${JSON.stringify(vaultData).slice(0, 200)}`);
    process.exit(1);
  }
  if (vaultData.vault.network !== "devnet") {
    fail(`vault is on ${vaultData.vault.network}, this script only funds devnet`);
    process.exit(1);
  }
  const multisigPda = new PublicKey(vaultData.vault.squadsAddress);
  ok(`vault → ${multisigPda.toBase58()}`);

  // ── 2. Derive vault PDA (Squads v4 index 0) ──
  const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });
  ok(`vault PDA → ${vaultPda.toBase58()}`);

  // ── 3. Derive both ATAs ──
  const vaultAta = getAssociatedTokenAddressSync(
    USDC_MINT_DEVNET,
    vaultPda,
    true, // allowOwnerOffCurve — vault PDAs are off curve
  );
  const recipientPk = new PublicKey(RECIPIENT);
  // allowOwnerOffCurve: true — some perfectly valid recipient pubkeys are
  // PDAs (off-curve). The default demo recipient happens to be one. It's
  // fine to create an ATA against a PDA — the ATA itself is a regular
  // account owned by the token program.
  const recipientAta = getAssociatedTokenAddressSync(
    USDC_MINT_DEVNET,
    recipientPk,
    true,
  );
  ok(`vault USDC ATA     → ${vaultAta.toBase58()}`);
  ok(`recipient USDC ATA → ${recipientAta.toBase58()}`);

  // ── 4. Load server signer + check which ATAs already exist ──
  const signerPath = resolveSignerPath();
  const signer = loadSignerKeypair(signerPath);
  ok(`server signer     → ${signer.publicKey.toBase58()}`);

  const connection = new Connection(DEVNET_RPC, "confirmed");
  const balance = await connection.getBalance(signer.publicKey);
  dim(`  signer SOL balance: ${(balance / 1e9).toFixed(4)}`);

  const vaultAtaInfo = await connection.getAccountInfo(vaultAta);
  const recipAtaInfo = await connection.getAccountInfo(recipientAta);

  const needs: { pubkey: PublicKey; owner: PublicKey; label: string }[] = [];
  if (!vaultAtaInfo) needs.push({ pubkey: vaultAta, owner: vaultPda, label: "vault" });
  else ok(`vault ATA already initialized`);
  if (!recipAtaInfo) needs.push({ pubkey: recipientAta, owner: recipientPk, label: "recipient" });
  else ok(`recipient ATA already initialized`);

  if (needs.length === 0) {
    console.log();
    ok(`all ATAs ready — no tx needed`);
  } else {
    // ── 5. Build & send one combined tx to create missing ATAs ──
    console.log();
    warn(`creating ${needs.length} missing ATA${needs.length === 1 ? "" : "s"}…`);
    const tx = new Transaction();
    for (const n of needs) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          signer.publicKey, // payer
          n.pubkey,         // associated token account
          n.owner,          // token account owner
          USDC_MINT_DEVNET,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }
    tx.feePayer = signer.publicKey;
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.sign(signer);
    const sig = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(sig, "confirmed");
    ok(`ATAs created → ${sig}`);
    dim(`  https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  }

  // ── 6. Fund reminder ──
  console.log();
  console.log(`${c.cyan}Next — mint devnet USDC to the vault ATA${c.reset}`);
  console.log(`────────────────────────────────────────────`);
  console.log();
  console.log(`  1. Open:  https://faucet.circle.com/`);
  console.log(`  2. Pick:  ${c.yellow}Solana Devnet${c.reset}`);
  console.log(`  3. Paste this ATA:`);
  console.log();
  console.log(`      ${c.green}${vaultAta.toBase58()}${c.reset}`);
  console.log();
  console.log(`  4. Request $10 USDC (enough for ~2000 micro-payments)`);
  console.log();
  console.log(`  Then re-run the agent:`);
  console.log(`     npx tsx scripts/demo-agent.ts`);
  console.log();
}

// ─── Server-signer helpers (kept lightweight — no @/ imports so the
// script runs standalone without the Next.js build). ───

function resolveSignerPath(): string {
  const fromEnv = process.env.KYVERN_KEYSTORE_DIR;
  if (fromEnv) return path.join(fromEnv, "server-signer.json");
  // Default matches src/lib/solana-keystore.ts defaults
  return path.join(process.cwd(), ".kyvern", "server-signer.json");
}

function loadSignerKeypair(p: string): Keypair {
  try {
    const raw = readFileSync(p, "utf8");
    const arr = JSON.parse(raw) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch (e) {
    fail(`could not load signer at ${p}`);
    fail(`  this script runs on the VM — SSH in and run it there:`);
    fail(`  ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190`);
    fail(`  cd ~/kyvernlabs-commerce && VAULT_ID=... npx tsx scripts/fund-vault.ts`);
    dim(`  (underlying error: ${e instanceof Error ? e.message : String(e)})`);
    process.exit(1);
  }
}

void main().catch((e) => {
  fail(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});

void os; // silence unused import (kept in case of future ~/.kyvern fallback)
