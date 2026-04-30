import { NextRequest, NextResponse } from "next/server";
import { getVault } from "@/lib/vault-store";
import { getDb } from "@/lib/db";

/**
 * GET /api/devices/[id]/policy-shield
 *
 * Returns the data the PolicyShield strip on /app needs in one round
 * trip: the active per-tx / daily / weekly limits from the vault, the
 * last 5 vault_payments (whose status reads as approved | rejected),
 * and the device's network for Explorer link cluster suffixes.
 *
 * Approval = status in {allowed, settled}
 * Rejection = status in {blocked, failed}
 *
 * The component renders the most recent row as the right-side strip
 * and the rest are available when the user expands the drawer.
 */

interface PaymentRow {
  id: string;
  vault_id: string;
  agent_key_id: string | null;
  merchant: string;
  amount_usd: number;
  status: "allowed" | "blocked" | "settled" | "failed";
  reason: string | null;
  tx_signature: string | null;
  created_at: string;
}

function tsToMs(s: string): number {
  const ms = Date.parse(s.replace(" ", "T") + (s.includes("Z") ? "" : "Z"));
  return isNaN(ms) ? 0 : ms;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const vault = getVault(params.id);
  if (!vault) {
    return NextResponse.json({ error: "device not found" }, { status: 404 });
  }

  const db = getDb();

  const rows = db
    .prepare(
      `SELECT id, vault_id, agent_key_id, merchant, amount_usd, status, reason,
              tx_signature, created_at
         FROM vault_payments
         WHERE vault_id = ?
         ORDER BY created_at DESC
         LIMIT 8`,
    )
    .all(params.id) as PaymentRow[];

  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const todayMs = todayMidnight.getTime();

  const allToday = db
    .prepare(
      `SELECT status, amount_usd, created_at FROM vault_payments WHERE vault_id = ?`,
    )
    .all(params.id) as Array<{
    status: string;
    amount_usd: number;
    created_at: string;
  }>;
  let approvedToday = 0;
  let rejectedToday = 0;
  let onChainToday = 0;
  for (const r of allToday) {
    const ms = tsToMs(r.created_at);
    if (ms < todayMs) continue;
    if (r.status === "allowed" || r.status === "settled") approvedToday++;
    else rejectedToday++;
    onChainToday++;
  }

  const decisions = rows.map((r) => ({
    id: r.id,
    merchant: r.merchant,
    amountUsd: r.amount_usd,
    status: r.status,
    approved: r.status === "allowed" || r.status === "settled",
    reason: r.reason,
    txSignature: r.tx_signature,
    createdAt: tsToMs(r.created_at),
  }));

  return NextResponse.json({
    network: vault.network,
    paused: !!vault.pausedAt,
    budgets: {
      perTxMaxUsd: vault.perTxMaxUsd,
      dailyLimitUsd: vault.dailyLimitUsd,
      weeklyLimitUsd: vault.weeklyLimitUsd,
    },
    today: {
      approved: approvedToday,
      rejected: rejectedToday,
      onChain: onChainToday,
    },
    lastDecision: decisions[0] ?? null,
    decisions,
  });
}
