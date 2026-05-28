import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAtlasDb } from "@/lib/atlas/db";

/**
 * GET /api/atlas/economy
 *
 * Phase 7 — surfaces Atlas's task-economy footprint for the new
 * /atlas hero. Pulls from `agent_tasks` (where Atlas is poster or
 * claimer) + Atlas's existing `vault_payments` rows.
 *
 * Returns:
 *   tasksPosted          — count where posting_agent_id = 'agt_atlas'
 *   tasksCompleted       — count where claiming_agent_id = 'agt_atlas'
 *                          AND status = 'completed'
 *   tasksPaidOutByAtlas  — count Atlas paid out as treasury (incoming
 *                          completions from any worker, since Atlas is
 *                          the platform treasury)
 *   totalEarnedUsd       — sum bounty for Atlas-claimed completed tasks
 *   totalSpentUsd        — sum bounty for Atlas-posted tasks settled
 *   onChainActions       — count vault_payments rows for Atlas's vault
 *   approvedActions      — count where status in (allowed,settled)
 *   blockedActions       — count where status in (blocked,failed)
 *   successRate          — approved / (approved + blocked); 0..1
 *   dailyEarnings        — { date: 'YYYY-MM-DD', earned: number }[]
 *                          sorted ASC over the last 14 days. Used by
 *                          the hero sparkline.
 *
 * Public endpoint — same auth posture as /api/atlas/status. Cheap
 * single-digit-ms aggregations on the existing indexes.
 */

const ATLAS_AGENT_ID = "agt_atlas";
// Mirrors src/lib/agents/treasury.ts. Hardcoded here so this route
// has zero non-DB imports.
const ATLAS_VAULT_ID =
  process.env.ATLAS_VAULT_ID ?? "vlt_QcCPbp3XTzHtF5";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function tsToMs(s: string): number {
  if (!s) return 0;
  const hasT = s.includes("T");
  const normalised = hasT
    ? s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s)
      ? s
      : s + "Z"
    : s.replace(" ", "T") + "Z";
  const ms = Date.parse(normalised);
  return isNaN(ms) ? 0 : ms;
}

export async function GET() {
  try {
    const db = getDb();

    // ── tasks ────────────────────────────────────────────────────
    const tasksPosted = (db
      .prepare(
        `SELECT COUNT(*) AS n FROM agent_tasks WHERE posting_agent_id = ?`,
      )
      .get(ATLAS_AGENT_ID) as { n: number }).n;

    const completedAsClaimer = db
      .prepare(
        `SELECT bounty_usd, completed_at FROM agent_tasks
           WHERE claiming_agent_id = ? AND status = 'completed'`,
      )
      .all(ATLAS_AGENT_ID) as Array<{
      bounty_usd: number;
      completed_at: number | null;
    }>;
    const tasksCompleted = completedAsClaimer.length;
    const totalEarnedUsd = completedAsClaimer.reduce(
      (s, r) => s + (r.bounty_usd ?? 0),
      0,
    );

    const completedAsPoster = db
      .prepare(
        `SELECT bounty_usd, completed_at FROM agent_tasks
           WHERE posting_agent_id = ? AND status = 'completed'`,
      )
      .all(ATLAS_AGENT_ID) as Array<{
      bounty_usd: number;
      completed_at: number | null;
    }>;
    const totalSpentUsd = completedAsPoster.reduce(
      (s, r) => s + (r.bounty_usd ?? 0),
      0,
    );

    // ── vault_payments (on-chain enforcement footprint) ──────────
    interface PayRow {
      status: string;
      amount_usd: number;
      created_at: string;
    }
    const allPayments = db
      .prepare(
        `SELECT status, amount_usd, created_at FROM vault_payments
           WHERE vault_id = ?`,
      )
      .all(ATLAS_VAULT_ID) as PayRow[];
    let approvedActions = 0;
    let blockedActions = 0;
    for (const r of allPayments) {
      if (r.status === "allowed" || r.status === "settled") approvedActions++;
      else blockedActions++;
    }
    const onChainActions = approvedActions + blockedActions;
    const successRate =
      onChainActions > 0 ? approvedActions / onChainActions : 0;

    // ── tasksPaidOutByAtlas — payouts from Atlas treasury ────────
    // Identified by merchant=kyvern.payout. complete_task tags every
    // treasury → claimer settlement with this merchant.
    const paidOutRow = db
      .prepare(
        `SELECT COUNT(*) AS n FROM vault_payments
           WHERE vault_id = ? AND merchant = ?
             AND status IN ('allowed','settled')`,
      )
      .get(ATLAS_VAULT_ID, "kyvern.payout") as { n: number };
    const tasksPaidOutByAtlas = paidOutRow.n;

    // ── dailyEarnings — last 14 UTC days ──────────────────────────
    // Atlas's earnings have two sources:
    //   (a) Task-economy completions where Atlas was the claimer.
    //       Pulled from agent_tasks (above).
    //   (b) Reader payments simulated by addEarning($0.10) every time
    //       Atlas's `publish` action settles. These don't materialise
    //       as their own row anywhere — they tick up state.totalEarnedUsd
    //       directly. We use atlas_decisions (action='publish',
    //       outcome='settled') as a proxy: each settled publish is
    //       worth $0.10 of incoming reader revenue.
    const dayMs = 24 * 60 * 60 * 1000;
    const todayMid = new Date();
    todayMid.setUTCHours(0, 0, 0, 0);
    const days: { date: string; earned: number }[] = [];
    const dayIndex = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const t = todayMid.getTime() - i * dayMs;
      const d = new Date(t);
      const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      days.push({ date: iso, earned: 0 });
      dayIndex.set(iso, days.length - 1);
    }
    const bucketIso = (ms: number): string => {
      const d = new Date(ms);
      d.setUTCHours(0, 0, 0, 0);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    };

    for (const r of completedAsClaimer) {
      if (r.completed_at == null) continue;
      const idx = dayIndex.get(bucketIso(r.completed_at));
      if (idx != null) days[idx].earned += r.bounty_usd ?? 0;
    }

    // (b) Reader-payment proxy from atlas.db. Best-effort — atlas.db
    // lives in a separate file; if it's unreadable we silently skip
    // and just show task earnings.
    try {
      const atlasDb = getAtlasDb();
      interface PublishRow {
        decided_at: string;
      }
      const sinceIso = new Date(
        todayMid.getTime() - 13 * dayMs,
      ).toISOString();
      const publishedRows = atlasDb
        .prepare(
          `SELECT decided_at FROM atlas_decisions
             WHERE action = 'publish' AND outcome = 'settled'
               AND decided_at >= ?`,
        )
        .all(sinceIso) as PublishRow[];
      for (const r of publishedRows) {
        const ms = Date.parse(
          r.decided_at.endsWith("Z") ? r.decided_at : r.decided_at + "Z",
        );
        if (isNaN(ms)) continue;
        const idx = dayIndex.get(bucketIso(ms));
        if (idx != null) days[idx].earned += 0.1;
      }
    } catch {
      /* atlas.db unavailable — fall back to task earnings only */
    }

    // ── lastEarning — most recent completion Atlas claimed ────────
    interface LastEarningRow {
      bounty_usd: number;
      payment_signature: string | null;
      completed_at: number | null;
      posting_agent_id: string;
    }
    const lastEarning = db
      .prepare(
        `SELECT bounty_usd, payment_signature, completed_at, posting_agent_id
           FROM agent_tasks
           WHERE claiming_agent_id = ? AND status = 'completed'
           ORDER BY completed_at DESC LIMIT 1`,
      )
      .get(ATLAS_AGENT_ID) as LastEarningRow | undefined;

    // Most-recent on-chain action for the hero "last action" chip.
    const lastOnChain = db
      .prepare(
        `SELECT status, amount_usd, tx_signature, merchant, created_at
           FROM vault_payments WHERE vault_id = ?
           ORDER BY created_at DESC LIMIT 1`,
      )
      .get(ATLAS_VAULT_ID) as
      | {
          status: string;
          amount_usd: number;
          tx_signature: string | null;
          merchant: string;
          created_at: string;
        }
      | undefined;

    return NextResponse.json(
      {
        atlas: { agentId: ATLAS_AGENT_ID, vaultId: ATLAS_VAULT_ID },
        tasksPosted,
        tasksCompleted,
        tasksPaidOutByAtlas,
        totalEarnedUsd,
        totalSpentUsd,
        onChainActions,
        approvedActions,
        blockedActions,
        successRate,
        dailyEarnings: days,
        lastEarning: lastEarning
          ? {
              bountyUsd: lastEarning.bounty_usd,
              paymentSignature: lastEarning.payment_signature,
              completedAt: lastEarning.completed_at,
              postingAgentId: lastEarning.posting_agent_id,
            }
          : null,
        lastOnChain: lastOnChain
          ? {
              status: lastOnChain.status,
              amountUsd: lastOnChain.amount_usd,
              txSignature: lastOnChain.tx_signature,
              merchant: lastOnChain.merchant,
              createdAt: tsToMs(lastOnChain.created_at),
            }
          : null,
      },
      {
        // Economy rolls slowly (Atlas posts/completes tasks every few
        // cycles). 3 s edge cache + SWR cuts the GROUP BY scan from
        // every poll.
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=3, stale-while-revalidate=15, must-revalidate",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: "atlas_economy_failed",
        message: e instanceof Error ? e.message : "internal",
      },
      { status: 200 },
    );
  }
}
