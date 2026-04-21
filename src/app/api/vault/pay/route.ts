import { NextRequest, NextResponse } from "next/server";
import {
  resolveAgentKey,
  getVault,
  getSpendSnapshot,
  recordPayment,
  touchAgentKey,
  getAgentKeySolana,
} from "@/lib/vault-store";
import { evaluatePayment, normalizeMerchant } from "@/lib/policy-engine";
import {
  coSignPayment,
  ensureRecipientUsdcAta,
  isSquadsReal,
} from "@/lib/squads-v4";

/* ════════════════════════════════════════════════════════════════════
   POST /api/vault/pay

   The hot path. An agent presents its key and asks the vault to pay a
   merchant. The vault enforces policy (budget / velocity / allowlist /
   memo / kill-switch) and, if allowed, co-signs the USDC transfer via
   Squads v4.

   Authentication:
     Authorization: Bearer kv_live_…
     ── OR ──
     body.agentKey: "kv_live_…"

   Request body (JSON):
   {
     merchant:        string,          // URL or host; normalized server-side
     recipientPubkey: string,          // Solana pubkey of the payee
     amountUsd:       number,
     memo?:           string | null
   }

   Responses:
     200 { decision: "allowed", payment, tx:{ signature, explorerUrl }, budget, velocity }
     402 { decision: "blocked", payment, code, reason, budget?, velocity? }
     401 { error: "unauthorized" }
     400 { error: "validation_error", errors: string[] }
     502 { error: "squads_cosign_failed", ... } + payment logged as failed
   ════════════════════════════════════════════════════════════════════ */

interface PayBody {
  agentKey?: string;
  merchant?: string;
  recipientPubkey?: string;
  amountUsd?: number;
  memo?: string | null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function extractAgentKey(req: NextRequest, body: PayBody): string | null {
  // Prefer the Authorization: Bearer header (industry standard).
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (auth) {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m && m[1]) return m[1].trim();
  }
  // Fallback: body.agentKey (convenient for server-side demos).
  if (body.agentKey && typeof body.agentKey === "string") {
    return body.agentKey.trim();
  }
  return null;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();

  // ─── Parse body ───
  let body: PayBody;
  try {
    body = (await req.json()) as PayBody;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "body must be valid JSON" },
      { status: 400 },
    );
  }

  // ─── Authenticate ───
  const rawKey = extractAgentKey(req, body);
  if (!rawKey) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message:
          "provide an agent key via 'Authorization: Bearer kv_live_…' header",
      },
      { status: 401 },
    );
  }

  const resolved = resolveAgentKey(rawKey);
  if (!resolved) {
    return NextResponse.json(
      { error: "unauthorized", message: "agent key not recognized or revoked" },
      { status: 401 },
    );
  }

  // ─── Validate payment fields ───
  const errors: string[] = [];
  if (!body.merchant || typeof body.merchant !== "string")
    errors.push("merchant is required");
  if (!body.recipientPubkey || typeof body.recipientPubkey !== "string")
    errors.push("recipientPubkey is required");
  if (!isFiniteNumber(body.amountUsd) || body.amountUsd <= 0)
    errors.push("amountUsd must be a positive number");

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_error", errors },
      { status: 400 },
    );
  }

  // ─── Load vault ───
  const vault = getVault(resolved.vaultId);
  if (!vault) {
    // Extremely unlikely — the agent key FK points at a vault that vanished.
    return NextResponse.json(
      { error: "vault_not_found", message: "vault no longer exists" },
      { status: 404 },
    );
  }

  // ─── Snapshot current spend for the policy engine ───
  const snapshot = getSpendSnapshot(vault.id, vault.velocityWindow);

  // ─── Evaluate policy ───
  const decision = evaluatePayment(
    { vault, snapshot },
    {
      merchant: body.merchant!,
      amountUsd: body.amountUsd!,
      memo: body.memo ?? null,
    },
  );

  // Normalize merchant the same way the policy engine did, so the ledger
  // and dashboard show a consistent host even if the agent passed a URL.
  const merchantForLog =
    normalizeMerchant(body.merchant!) ?? body.merchant!.trim();
  const memoForLog = body.memo?.trim() ? body.memo.trim() : null;

  // Record the attempt no matter what — every call shows up in the audit log.
  touchAgentKey(resolved.keyId);

  if (decision.decision === "blocked") {
    const latencyMs = Date.now() - t0;
    const payment = recordPayment({
      vaultId: vault.id,
      agentKeyId: resolved.keyId,
      merchant: merchantForLog,
      amountUsd: body.amountUsd!,
      memo: memoForLog,
      status: "blocked",
      reason: decision.reason ?? decision.code ?? "blocked",
      txSignature: null,
      latencyMs,
    });

    // 402 Payment Required — semantically perfect for a policy block and a
    // direct nod to x402/HTTP 402. Dashboards and SDKs can branch on this.
    return NextResponse.json(
      {
        decision: "blocked",
        code: decision.code,
        reason: decision.reason,
        budget: decision.budget,
        velocity: decision.velocity,
        payment,
        vault: {
          id: vault.id,
          name: vault.name,
          pausedAt: vault.pausedAt,
        },
      },
      { status: 402 },
    );
  }

  // ─── Load the Solana delegate keypair + spending-limit PDA ───
  // In real mode both MUST be present — they were recorded at vault
  // creation time. In stub mode we allow nulls because coSignPayment()
  // just returns a deterministic fake signature.
  const agentSolana = getAgentKeySolana(resolved.keyId);
  const spendingLimitPda = vault.spendingLimitPda;
  if (isSquadsReal()) {
    if (!agentSolana) {
      const latencyMs = Date.now() - t0;
      const payment = recordPayment({
        vaultId: vault.id,
        agentKeyId: resolved.keyId,
        merchant: merchantForLog,
        amountUsd: body.amountUsd!,
        memo: memoForLog,
        status: "failed",
        reason:
          "agent key has no on-chain delegate; re-issue this key to migrate",
        txSignature: null,
        latencyMs,
      });
      return NextResponse.json(
        {
          error: "agent_key_missing_delegate",
          message:
            "agent key has no Solana delegate keypair — was it issued before real mode was enabled? Re-issue the key to migrate.",
          payment,
        },
        { status: 409 },
      );
    }
    if (!spendingLimitPda) {
      const latencyMs = Date.now() - t0;
      const payment = recordPayment({
        vaultId: vault.id,
        agentKeyId: resolved.keyId,
        merchant: merchantForLog,
        amountUsd: body.amountUsd!,
        memo: memoForLog,
        status: "failed",
        reason:
          "vault has no on-chain spending limit recorded; recreate the vault",
        txSignature: null,
        latencyMs,
      });
      return NextResponse.json(
        {
          error: "vault_missing_spending_limit",
          message:
            "vault has no on-chain spending limit PDA recorded — recreate the vault in real mode.",
          payment,
        },
        { status: 409 },
      );
    }
  }

  // ─── Ensure the recipient has a USDC token account on devnet/mainnet ───
  //
  // Squads' spendingLimitUse transfers SPL tokens; if the destination's
  // associated token account doesn't exist yet the whole tx fails deep
  // inside the program with the opaque
  //   "The program expected this account to be already initialized"
  // which is useless to the caller. We create the ATA on demand here
  // (paid by the server keystore, same fee payer as the rest of the
  // flow). Idempotent — skips the tx if the ATA is already there.
  try {
    await ensureRecipientUsdcAta({
      recipientPubkey: body.recipientPubkey!,
      network: vault.network,
    });
  } catch (e) {
    // If even the ATA prep fails the payment can't settle; log as failed
    // and return the real error so the dashboard shows something useful.
    const latencyMs = Date.now() - t0;
    const payment = recordPayment({
      vaultId: vault.id,
      agentKeyId: resolved.keyId,
      merchant: merchantForLog,
      amountUsd: body.amountUsd!,
      memo: memoForLog,
      status: "failed",
      reason:
        e instanceof Error
          ? `recipient_ata_prep_failed: ${e.message}`
          : "could not create recipient USDC token account",
      txSignature: null,
      latencyMs,
    });
    return NextResponse.json(
      {
        error: "recipient_ata_prep_failed",
        message:
          e instanceof Error ? e.message : "could not prep recipient token account",
        payment,
      },
      { status: 500 },
    );
  }

  // ─── Co-sign on-chain via Squads v4 ───
  let cosign;
  try {
    cosign = await coSignPayment({
      smartAccountAddress: vault.squadsAddress,
      spendingLimitPda: spendingLimitPda ?? "",
      agentSecretB58: agentSolana?.secretB58 ?? "",
      merchant: merchantForLog,
      recipientPubkey: body.recipientPubkey!,
      amountUsd: body.amountUsd!,
      memo: memoForLog,
      network: vault.network,
    });
  } catch (e) {
    const latencyMs = Date.now() - t0;
    const payment = recordPayment({
      vaultId: vault.id,
      agentKeyId: resolved.keyId,
      merchant: merchantForLog,
      amountUsd: body.amountUsd!,
      memo: memoForLog,
      status: "failed",
      reason:
        e instanceof Error ? e.message : "squads co-sign failed",
      txSignature: null,
      latencyMs,
    });
    return NextResponse.json(
      {
        error: "squads_cosign_failed",
        message:
          e instanceof Error
            ? e.message
            : "policy allowed the payment but on-chain co-sign failed",
        payment,
      },
      { status: 502 },
    );
  }

  // ─── Settle ───
  const latencyMs = Date.now() - t0;
  const payment = recordPayment({
    vaultId: vault.id,
    agentKeyId: resolved.keyId,
    merchant: merchantForLog,
    amountUsd: body.amountUsd!,
    memo: memoForLog,
    status: "settled",
    reason: null,
    txSignature: cosign.txSignature,
    latencyMs,
  });

  return NextResponse.json(
    {
      decision: "allowed",
      payment,
      tx: {
        signature: cosign.txSignature,
        explorerUrl: cosign.explorerUrl,
      },
      budget: decision.budget,
      velocity: decision.velocity,
      vault: {
        id: vault.id,
        name: vault.name,
        network: vault.network,
      },
    },
    { status: 200 },
  );
}
