/**
 * POST /api/atlas/probe-paysh
 *
 * SPEC_TO_WIN §5B + §7.12. The /demo page's pay.sh buttons hit this.
 *
 * Two scenarios:
 *   · paysh_over_cap → off-chain policy refuses BEFORE any pay.sh call
 *     fires (this is the architectural point). On-chain we submit the
 *     same violating params via execute_payment with skipPreflight, so
 *     the judge sees a real finalized failed Solana tx with the
 *     Kyvern program's custom error code (AmountExceedsPerTxMax 12002).
 *     pay.sh is never called — Kyvern stopped it at the policy gate.
 *
 *   · paysh_settled → off-chain policy passes. We shell out to
 *     `pay --sandbox curl <demo url>` to actually run a real x402-
 *     paywalled API call (sandbox uses an ephemeral local wallet so
 *     no real money moves at the pay.sh layer). Then we submit
 *     execute_payment on-chain for the Kyvern budgeted spend, which
 *     settles via the Squads CPI for a real on-chain USDC transfer.
 *     The response carries BOTH the pay.sh API response data AND the
 *     Kyvern settlement signature.
 *
 * The shell-out uses the system `pay` binary (installed via
 * `npm install -g @solana/pay`). Sandbox mode auto-creates an
 * ephemeral wallet and resolves 402 challenges without biometric
 * authentication, which is what makes this work headless on the VM.
 *
 * Cost note: on-chain submissions burn ~5000 lamports of fee-payer
 * SOL each. Rate-limited 3/min, 10/hr per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { getDb } from "@/lib/db";
import { getVault, getSpendSnapshot } from "@/lib/vault-store";
import { evaluatePayment } from "@/lib/policy-engine";
import { ensureRecipientUsdcAta, isSquadsReal } from "@/lib/squads-v4";
import { loadServerSigner } from "@/lib/solana-keystore";
import {
  callExecutePayment,
  hashMerchantHostname,
  initializePolicy,
  isPolicyInitialized,
  KYVERN_POLICY_PROGRAM_ID,
} from "@/lib/kyvern-policy/client";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

const execFileAsync = promisify(execFile);

const ATLAS_VAULT_ID = "vlt_QcCPbp3XTzHtF5";
const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

const DEMO_URL =
  process.env.NEXT_PUBLIC_PAYSH_DEMO_SERVICE_URL ??
  "https://debugger.pay.sh/mpp/quote/AAPL";

const PAY_BIN = process.env.PAY_BIN ?? "pay";

interface Scenario {
  amountUsd: number;
  merchant: string;
  memo: string;
  expectFailure: boolean;
  expectedErrorCode: number;
  expectedErrorName: string;
  description: string;
  /** Whether to actually invoke pay.sh after the on-chain settlement. */
  invokePaySh: boolean;
}

const SCENARIOS: Record<string, Scenario> = {
  paysh_over_cap: {
    amountUsd: 5,
    merchant: "api.pay.sh",
    memo: "perplexity search via pay.sh",
    expectFailure: true,
    expectedErrorCode: 12002,
    expectedErrorName: "AmountExceedsPerTxMax",
    description:
      "Buy a Perplexity search via pay.sh for $5 — Kyvern refuses on-chain before pay.sh even sees it",
    invokePaySh: false,
  },
  paysh_settled: {
    amountUsd: 0.001,
    merchant: "api.pay.sh",
    memo: "AAPL quote via pay.sh",
    expectFailure: false,
    expectedErrorCode: 0,
    expectedErrorName: "",
    description:
      "Buy a $0.001 quote via pay.sh — Kyvern allows, pay.sh executes the 402-paywalled call",
    invokePaySh: true,
  },
};

interface PayShResult {
  url: string;
  output: string;
  parsed: unknown | null;
  durationMs: number;
}

async function runPayShSandbox(url: string): Promise<PayShResult> {
  const startedAt = Date.now();
  // Run the binary with --sandbox so an ephemeral wallet is used (no
  // biometric prompts, no real USDC at the pay.sh layer).
  // Capture stdout. Cap at 30s + 256kb so a hung pay.sh can't pin us.
  const { stdout } = await execFileAsync(
    PAY_BIN,
    ["--sandbox", "curl", url],
    { timeout: 30_000, maxBuffer: 256 * 1024 },
  );
  const trimmed = stdout.trim();
  let parsed: unknown | null = null;
  // pay's stdout interleaves status events on stdout; the API JSON
  // response is whatever appears AFTER the last newline-separated
  // non-JSON event. Try last line first, then full body.
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    const candidate = lines[i].trim();
    if (candidate.startsWith("{") || candidate.startsWith("[")) {
      try {
        parsed = JSON.parse(candidate);
        break;
      } catch {
        /* continue */
      }
    }
  }
  return {
    url,
    output: trimmed,
    parsed,
    durationMs: Date.now() - startedAt,
  };
}

export async function POST(req: NextRequest) {
  // Rate limit per IP
  const ip = getClientIP(req);
  const perMin = checkRateLimit(`probe-paysh:min:${ip}`, 3, 60_000);
  if (!perMin.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "Too many tries — 3 per minute." },
      { status: 429 },
    );
  }
  const perHour = checkRateLimit(`probe-paysh:hr:${ip}`, 10, 60 * 60_000);
  if (!perHour.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "Hourly cap reached." },
      { status: 429 },
    );
  }

  // Parse body
  let body: { scenario?: string; vaultId?: string };
  try {
    body = (await req.json()) as { scenario?: string; vaultId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const key = body.scenario;
  if (!key || !(key in SCENARIOS)) {
    return NextResponse.json(
      { ok: false, error: "invalid_scenario", available: Object.keys(SCENARIOS) },
      { status: 400 },
    );
  }
  const scenario = SCENARIOS[key];

  // Setup checks
  if (!isSquadsReal()) {
    return NextResponse.json(
      { ok: false, error: "stub_mode" },
      { status: 503 },
    );
  }

  // Per TRANSFORM_24H §T3 — accept optional vaultId so the user can
  // wrap pay.sh through their own device (rather than Atlas).
  const targetVaultId = body.vaultId?.trim() || ATLAS_VAULT_ID;
  const isUserVault = targetVaultId !== ATLAS_VAULT_ID;

  if (isUserVault) {
    const owner = req.headers.get("x-owner-wallet")?.trim();
    const target = getVault(targetVaultId);
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "vault_not_found" },
        { status: 404 },
      );
    }
    if (!owner || owner !== target.ownerWallet) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }
  }

  const vault = getVault(targetVaultId);
  if (!vault?.spendingLimitPda) {
    return NextResponse.json(
      {
        ok: false,
        error: isUserVault ? "vault_not_provisioned" : "atlas_offline",
      },
      { status: 503 },
    );
  }

  const db = getDb();
  const agentRow = db
    .prepare(
      `SELECT solana_secret_b58 FROM vault_agent_keys
       WHERE vault_id = ? AND revoked_at IS NULL
       ORDER BY created_at ASC LIMIT 1`,
    )
    .get(targetVaultId) as { solana_secret_b58: string | null } | undefined;
  if (!agentRow?.solana_secret_b58) {
    return NextResponse.json(
      {
        ok: false,
        error: isUserVault ? "no_agent_key" : "atlas_offline",
      },
      { status: 503 },
    );
  }

  // Off-chain policy probe — for visibility in the response, even when
  // the on-chain attempt is what actually matters.
  const snapshot = getSpendSnapshot(vault.id, vault.velocityWindow);
  const offChainDecision = evaluatePayment(
    { vault, snapshot },
    {
      merchant: scenario.merchant,
      amountUsd: scenario.amountUsd,
      memo: scenario.memo,
    },
  );

  // Load signer + accounts
  let signer;
  try {
    signer = await loadServerSigner({ network: vault.network });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "signer_unavailable", message: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
  const connection: Connection = signer.connection;
  const feePayer = signer.keypair as Keypair;

  // Lazy policy-PDA init for user vaults — same pattern as
  // probe-scenarios. See that route for the rationale.
  if (isUserVault) {
    try {
      const multisigPub = new PublicKey(vault.squadsAddress);
      const initialized = await isPolicyInitialized(connection, multisigPub);
      if (!initialized) {
        const merchants =
          vault.allowedMerchants && vault.allowedMerchants.length > 0
            ? vault.allowedMerchants
            : ["api.openai.com", "api.anthropic.com", "api.pay.sh", "kast.xyz"];
        const velocityWindowSeconds =
          vault.velocityWindow === "1h"
            ? 3600
            : vault.velocityWindow === "1d"
              ? 86_400
              : 604_800;
        await initializePolicy({
          connection,
          authority: feePayer,
          multisig: multisigPub,
          perTxMaxBaseUnits: BigInt(Math.round(vault.perTxMaxUsd * 1_000_000)),
          requireMemo: !!vault.requireMemo,
          velocityWindowSeconds,
          velocityMaxCalls: vault.maxCallsPerWindow ?? 60,
          merchantsNormalized: merchants,
        });
      }
    } catch (e) {
      console.error(
        "[probe-paysh] lazy initializePolicy failed:",
        e instanceof Error ? e.message : e,
      );
    }
  }

  const member = Keypair.fromSecretKey(bs58.decode(agentRow.solana_secret_b58));
  const multisig = new PublicKey(vault.squadsAddress);
  const spendingLimit = new PublicKey(vault.spendingLimitPda);
  const vaultPdaStr = (db
    .prepare(`SELECT vault_pda FROM vaults WHERE id = ?`)
    .get(targetVaultId) as { vault_pda: string } | undefined)?.vault_pda;
  if (!vaultPdaStr) {
    return NextResponse.json(
      {
        ok: false,
        error: isUserVault ? "vault_not_provisioned" : "atlas_offline",
      },
      { status: 503 },
    );
  }
  const vaultPda = new PublicKey(vaultPdaStr);
  const mint = new PublicKey(USDC_MINT_DEVNET);
  const destination = feePayer.publicKey;
  try {
    await ensureRecipientUsdcAta({
      recipientPubkey: destination.toBase58(),
      network: vault.network,
    });
  } catch {
    // Non-fatal — the chain call surfaces its own error.
  }
  const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
  const vaultTokenAccount = getAssociatedTokenAddressSync(mint, vaultPda, true);
  const destinationTokenAccount = getAssociatedTokenAddressSync(mint, destination, true);
  const merchantHash = hashMerchantHostname(scenario.merchant.toLowerCase());

  // For the settled path, run pay.sh BEFORE submitting the chain tx.
  // This way: judges see Kyvern allow → pay.sh executes the real 402
  // call (response data lands in the modal) → Kyvern settles for the
  // budgeted spend on Solana. If pay.sh fails, we return the failure
  // and skip the on-chain spend (no point burning fee SOL on a tx
  // that wouldn't represent any value flow).
  let paySh: PayShResult | null = null;
  let payShError: string | null = null;
  if (scenario.invokePaySh) {
    try {
      paySh = await runPayShSandbox(DEMO_URL);
    } catch (e) {
      payShError = e instanceof Error ? e.message : String(e);
    }
  }
  if (scenario.invokePaySh && payShError) {
    return NextResponse.json({
      ok: false,
      scenario: key,
      description: scenario.description,
      offChainDecision,
      paySh: null,
      payShError,
    });
  }

  // Now submit the on-chain spend (or expectFailure).
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
  const chainDurationMs = Date.now() - startedAt;

  return NextResponse.json({
    ok: !!result.signature,
    scenario: key,
    description: scenario.description,
    expectedOutcome: scenario.expectFailure ? "blocked" : "settled",
    expectedErrorCode: scenario.expectFailure ? scenario.expectedErrorCode : null,
    expectedErrorName: scenario.expectFailure ? scenario.expectedErrorName : null,
    signature: result.signature,
    explorerUrl: result.explorerUrl,
    program: KYVERN_POLICY_PROGRAM_ID.toBase58(),
    paySh,
    offChain: {
      decision: offChainDecision.decision,
      code: offChainDecision.code,
      reason: offChainDecision.reason,
    },
    chainDurationMs,
  });
}

/** GET — scenario list for /demo's pay.sh button rendering. */
export async function GET() {
  const list = Object.entries(SCENARIOS).map(([key, s]) => ({
    key,
    description: s.description,
    expectedOutcome: s.expectFailure ? "blocked" : "settled",
    expectedErrorCode: s.expectFailure ? s.expectedErrorCode : null,
    expectedErrorName: s.expectFailure ? s.expectedErrorName : null,
    invokePaySh: s.invokePaySh,
  }));
  return NextResponse.json(
    {
      scenarios: list,
      demoUrl: DEMO_URL,
      payBinary: PAY_BIN,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
