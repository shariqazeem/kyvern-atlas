/**
 * POST /api/atlas/probe-scenarios
 *
 * The /demo page calls this when a judge clicks one of the scenario
 * buttons. We invoke the Kyvern policy program's `execute_payment`
 * instruction with parameters that violate a specific rule, then
 * submit with `skipPreflight: true` so the cluster ingests the tx
 * even though it'll revert. The return value carries a real failed
 * Solana signature with the program's custom error code surfaced
 * in Explorer logs.
 *
 * Available scenarios (all hit Atlas's vault `vlt_QcCPbp3XTzHtF5`):
 *   - merchant_not_allowed   → "ranger.com" is off-allowlist
 *                              expects KyvernPolicy::MerchantNotAllowlisted
 *   - missing_memo           → require_memo=true, no memo provided
 *                              expects KyvernPolicy::MissingMemo
 *   - amount_exceeds_per_tx  → $5 vs $2 per-tx cap
 *                              expects KyvernPolicy::AmountExceedsPerTxMax
 *   - settled_allowed        → $0.05 to api.openai.com with memo
 *                              expects clean settlement (CPI through
 *                              Squads, USDC moves)
 *
 * Body: { scenario: string }
 * Returns: { ok, signature, explorerUrl, scenario, expectedErrorName }
 *
 * Cost note: each blocked attempt burns ~5000 lamports of server fee
 * payer SOL (Solana charges fees even on revert). Rate-limited 3/min,
 * 10/hr per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { getDb } from "@/lib/db";
import { getVault } from "@/lib/vault-store";
import { ensureRecipientUsdcAta, isSquadsReal } from "@/lib/squads-v4";
import { loadServerSigner } from "@/lib/solana-keystore";
import {
  callExecutePayment,
  hashMerchantHostname,
  KYVERN_POLICY_PROGRAM_ID,
} from "@/lib/kyvern-policy/client";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

const ATLAS_VAULT_ID = "vlt_QcCPbp3XTzHtF5";
const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

interface ScenarioParams {
  amountUsd: number;
  merchant: string;
  memo: string | null;
  expectFailure: boolean;
  expectedErrorCode: number;
  expectedErrorName: string;
  description: string;
}

const SCENARIOS: Record<string, ScenarioParams> = {
  merchant_not_allowed: {
    amountUsd: 0.05,
    merchant: "ranger.com",
    memo: "buy weather data",
    expectFailure: true,
    expectedErrorCode: 12003,
    expectedErrorName: "MerchantNotAllowlisted",
    description: "Pay $0.05 to ranger.com — not on Atlas's allowlist",
  },
  missing_memo: {
    amountUsd: 0.05,
    merchant: "api.openai.com",
    memo: null,
    expectFailure: true,
    expectedErrorCode: 12004,
    expectedErrorName: "MissingMemo",
    description: "Pay $0.05 to api.openai.com — no memo on a vault that requires one",
  },
  amount_exceeds_per_tx: {
    amountUsd: 5,
    merchant: "api.openai.com",
    memo: "burn budget test",
    expectFailure: true,
    expectedErrorCode: 12002,
    expectedErrorName: "AmountExceedsPerTxMax",
    description: "Pay $5 to api.openai.com — per-tx cap is $2",
  },
  settled_allowed: {
    amountUsd: 0.05,
    merchant: "api.openai.com",
    memo: "weather lookup",
    expectFailure: false,
    expectedErrorCode: 0,
    expectedErrorName: "",
    description: "Pay $0.05 to api.openai.com with memo — within policy",
  },
};

// Kyvern Anchor program error codes — per anchor/programs/kyvern-policy
// (Anchor numbers user errors at 6000 by default but this program
// declares them at offset 12000 explicitly).
const KYVERN_ERROR_CODES: Record<number, string> = {
  12000: "VaultPaused",
  12001: "InvalidAmount",
  12002: "AmountExceedsPerTxMax",
  12003: "MerchantNotAllowlisted",
  12004: "MissingMemo",
  12005: "VelocityCapExceeded",
  12006: "MemoTooLong",
};

export async function POST(req: NextRequest) {
  // Rate limit per IP — failed txs cost real SOL.
  const ip = getClientIP(req);
  const perMin = checkRateLimit(`probe-scenarios:min:${ip}`, 3, 60_000);
  if (!perMin.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Too many tries — 3 per minute.",
        retryAfterSeconds: Math.ceil(perMin.resetIn / 1000),
      },
      { status: 429 },
    );
  }
  const perHour = checkRateLimit(`probe-scenarios:hr:${ip}`, 10, 60 * 60_000);
  if (!perHour.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Hourly cap reached — come back in an hour.",
        retryAfterSeconds: Math.ceil(perHour.resetIn / 1000),
      },
      { status: 429 },
    );
  }

  // Parse body
  let body: { scenario?: string };
  try {
    body = (await req.json()) as { scenario?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const scenarioKey = body.scenario;
  if (!scenarioKey || !(scenarioKey in SCENARIOS)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_scenario",
        available: Object.keys(SCENARIOS),
      },
      { status: 400 },
    );
  }
  const scenario = SCENARIOS[scenarioKey];

  // Configuration check
  if (!isSquadsReal()) {
    return NextResponse.json(
      { ok: false, error: "stub_mode", message: "KYVERN_SQUADS_MODE is not 'real' on this instance." },
      { status: 503 },
    );
  }

  // Load Atlas's vault config
  const vault = getVault(ATLAS_VAULT_ID);
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "atlas_offline", message: "Atlas vault config not found." },
      { status: 503 },
    );
  }
  if (!vault.spendingLimitPda) {
    return NextResponse.json(
      { ok: false, error: "atlas_offline", message: "Atlas spending limit PDA missing." },
      { status: 503 },
    );
  }

  // Pull agent secret
  const db = getDb();
  const agentRow = db
    .prepare(
      `SELECT solana_secret_b58 FROM vault_agent_keys
       WHERE vault_id = ? AND revoked_at IS NULL
       ORDER BY created_at ASC LIMIT 1`,
    )
    .get(ATLAS_VAULT_ID) as { solana_secret_b58: string | null } | undefined;
  if (!agentRow?.solana_secret_b58) {
    return NextResponse.json(
      { ok: false, error: "atlas_offline", message: "Atlas agent secret missing." },
      { status: 503 },
    );
  }

  // Load server signer + connection
  let signer;
  try {
    signer = await loadServerSigner({ network: vault.network });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "signer_unavailable",
        message: e instanceof Error ? e.message : "server signer load failed",
      },
      { status: 503 },
    );
  }
  const connection: Connection = signer.connection;
  const feePayer = signer.keypair as Keypair;

  // Derive accounts
  const member = Keypair.fromSecretKey(bs58.decode(agentRow.solana_secret_b58));
  const multisig = new PublicKey(vault.squadsAddress);
  const spendingLimit = new PublicKey(vault.spendingLimitPda);
  const vaultPdaStr = (vault as unknown as { vaultPda?: string }).vaultPda
    ?? (db
      .prepare(`SELECT vault_pda FROM vaults WHERE id = ?`)
      .get(ATLAS_VAULT_ID) as { vault_pda: string } | undefined)
      ?.vault_pda;
  if (!vaultPdaStr) {
    return NextResponse.json(
      { ok: false, error: "atlas_offline", message: "Atlas vault PDA missing." },
      { status: 503 },
    );
  }
  const vaultPda = new PublicKey(vaultPdaStr);
  const mint = new PublicKey(USDC_MINT_DEVNET);

  // Destination = server fee payer's USDC ATA. The settled_allowed
  // scenario actually moves USDC there. The blocked scenarios revert
  // before any USDC movement.
  const destination = feePayer.publicKey;

  // Ensure destination ATA exists (idempotent)
  try {
    await ensureRecipientUsdcAta({
      recipientPubkey: destination.toBase58(),
      network: vault.network,
    });
  } catch {
    // Non-fatal — the on-chain call will surface its own error.
  }

  // Compute ATAs
  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, vaultPda, true);
  const destinationTokenAccount = getAssociatedTokenAddressSync(mint, destination, true);

  // Build merchant hash
  const merchantHash = hashMerchantHostname(scenario.merchant.toLowerCase());

  // Fire it
  const startedAt = Date.now();
  const result = await callExecutePayment({
    connection,
    feePayer,
    member,
    multisig,
    spendingLimit,
    mint,
    vault: vaultPda,
    vaultTokenAccount,
    destination,
    destinationTokenAccount,
    amountBaseUnits: BigInt(Math.round(scenario.amountUsd * 1_000_000)),
    decimals: 6,
    merchantHash,
    memo: scenario.memo,
    expectFailure: scenario.expectFailure,
  });
  const durationMs = Date.now() - startedAt;

  if (!result.signature) {
    return NextResponse.json({
      ok: false,
      error: "send_failed",
      scenario: scenarioKey,
      description: scenario.description,
      durationMs,
    });
  }

  return NextResponse.json({
    ok: true,
    scenario: scenarioKey,
    description: scenario.description,
    expectedOutcome: scenario.expectFailure ? "blocked" : "settled",
    expectedErrorCode: scenario.expectFailure ? scenario.expectedErrorCode : null,
    expectedErrorName: scenario.expectFailure ? scenario.expectedErrorName : null,
    signature: result.signature,
    explorerUrl: result.explorerUrl,
    program: KYVERN_POLICY_PROGRAM_ID.toBase58(),
    durationMs,
  });
}

/**
 * GET /api/atlas/probe-scenarios — list scenarios for the /demo UI.
 */
export async function GET() {
  const list = Object.entries(SCENARIOS).map(([key, s]) => ({
    key,
    description: s.description,
    expectedOutcome: s.expectFailure ? "blocked" : "settled",
    expectedErrorCode: s.expectFailure ? s.expectedErrorCode : null,
    expectedErrorName: s.expectFailure ? s.expectedErrorName : null,
  }));
  return NextResponse.json(
    {
      scenarios: list,
      program: KYVERN_POLICY_PROGRAM_ID.toBase58(),
      programLink: `https://explorer.solana.com/address/${KYVERN_POLICY_PROGRAM_ID.toBase58()}?cluster=devnet`,
      errorCodes: KYVERN_ERROR_CODES,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
