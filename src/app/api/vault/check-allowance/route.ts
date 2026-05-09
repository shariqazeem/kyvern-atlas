import { NextRequest, NextResponse } from "next/server";
import { resolveAgentKey, getVault, getSpendSnapshot } from "@/lib/vault-store";
import { evaluatePayment } from "@/lib/policy-engine";

/**
 * POST /api/vault/check-allowance
 *
 * SPEC_TO_WIN §7.11 — non-mutating policy probe. Same off-chain rules
 * as /api/vault/pay's pre-check, but no chain action, no DB write.
 * Returns `{ decision, reason?, code? }` so the agent can decide
 * whether to fire its underlying paid call (pay.sh, x402, or any
 * 402-paywalled HTTP request).
 *
 * Architectural point: with this endpoint the vault decides BEFORE
 * pay.sh's local-wallet prompt fires. Kyvern is the policy layer
 * above the rails.
 *
 * Auth: Bearer agent key (same as pay()).
 *
 * Body: { merchant: string, amountUsd: number, memo?: string | null }
 */

interface Body {
  merchant?: unknown;
  amountUsd?: unknown;
  memo?: unknown;
}

export async function POST(req: NextRequest) {
  // Auth
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!bearer) {
    return NextResponse.json(
      { decision: "blocked", code: "no_agent_key", reason: "Missing Authorization header" },
      { status: 401 },
    );
  }

  const resolved = resolveAgentKey(bearer);
  if (!resolved) {
    return NextResponse.json(
      { decision: "blocked", code: "invalid_agent_key", reason: "Agent key not recognized" },
      { status: 401 },
    );
  }

  const vault = getVault(resolved.vaultId);
  if (!vault) {
    return NextResponse.json(
      { decision: "blocked", code: "vault_not_found", reason: "Vault no longer exists" },
      { status: 404 },
    );
  }

  // Parse body
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { decision: "blocked", code: "invalid_json", reason: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const merchant = String(body.merchant ?? "").trim();
  const amountUsd = Number(body.amountUsd);
  const memo =
    typeof body.memo === "string" && body.memo.trim()
      ? body.memo.trim()
      : null;

  if (!merchant) {
    return NextResponse.json(
      { decision: "blocked", code: "missing_merchant", reason: "merchant required" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return NextResponse.json(
      { decision: "blocked", code: "invalid_amount", reason: "amountUsd must be > 0" },
      { status: 400 },
    );
  }

  // Run the same evaluator pay() uses — no chain action, no DB write.
  const snapshot = getSpendSnapshot(vault.id, vault.velocityWindow);
  const decision = evaluatePayment(
    { vault, snapshot },
    { merchant, amountUsd, memo },
  );

  if (decision.decision === "blocked") {
    return NextResponse.json({
      decision: "blocked",
      code: decision.code,
      reason: decision.reason,
    });
  }

  return NextResponse.json({ decision: "allowed" });
}
