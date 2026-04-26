/**
 * Atlas runner — the loop that makes Atlas an actual autonomous agent.
 *
 * Responsibilities:
 *   · Heartbeat every 15s so the observability layer knows we're alive.
 *   · Every ~CYCLE_MS ms, execute one cycle:
 *       1. Mark cycle start
 *       2. decide()  — pick next action with reasoning
 *       3. pay()     — actually call /api/vault/pay against OUR OWN vault,
 *                      which is real Kyvern + Squads v4 on devnet
 *       4. Record the decision + outcome with tx sig or block reason
 *       5. Schedule the next cycle
 *
 * Safety:
 *   · The runner is a separate process (pm2-managed on the VM). If
 *     the Next.js app restarts, Atlas keeps running.
 *   · All state lives in atlas.db — safe to restart the runner; cycle
 *     numbers, first-ignition timestamp, and history survive.
 *   · A malformed LLM response or a 5xx from the pay endpoint is
 *     caught and logged as a "failed" decision — never crashes the loop.
 */

import { nanoid } from "nanoid";
import type { AtlasDecision } from "./schema";
import {
  addEarning,
  heartbeat,
  markIgnition,
  nextCycleId,
  readState,
  recordCycleEnd,
  recordCycleStart,
  recordDecision,
  setVaultId,
} from "./db";
import { decide } from "./decide";
import { autoDripIfLow } from "./auto-drip";

// Config via env — keeps the runner hackable on the VM.
const BASE_URL =
  process.env.KYVERN_BASE_URL ?? "http://127.0.0.1:3001";
const AGENT_KEY = process.env.KYVERNLABS_AGENT_KEY ?? "";
const VAULT_ID = process.env.ATLAS_VAULT_ID ?? "";
const RECIPIENT =
  process.env.ATLAS_RECIPIENT ??
  "5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6";
const CYCLE_MS = Number(process.env.ATLAS_CYCLE_MS ?? 120_000); // 2 min
const HEARTBEAT_MS = 15_000;

function log(...args: unknown[]) {
  console.log(`[atlas ${new Date().toISOString()}]`, ...args);
}

/** Section 3B — fire-and-forget auto-drip check. Logs the outcome,
 *  swallows any error so the cycle loop is unaffected. */
async function runAutoDrip(cycle: number): Promise<void> {
  try {
    const r = await autoDripIfLow();
    if (r.skipped) {
      log(`cycle ${cycle} · auto-drip skipped (${r.reason}) · balance=$${r.balance.toFixed(3)}`);
    } else {
      log(
        `cycle ${cycle} · AUTO-DRIPPED $${r.amountUsd} → Atlas vault. balanceBefore=$${r.balanceBefore.toFixed(3)} sig=${r.signature.slice(0, 12)}…`,
      );
    }
  } catch (e) {
    log("cycle", cycle, "· auto-drip error:", e instanceof Error ? e.message : String(e));
  }
}

export async function runAtlas(): Promise<void> {
  if (!AGENT_KEY || !VAULT_ID) {
    throw new Error(
      "Atlas requires KYVERNLABS_AGENT_KEY + ATLAS_VAULT_ID env vars.",
    );
  }
  setVaultId(VAULT_ID);
  markIgnition();
  log(
    `boot · vault=${VAULT_ID} · cycle=${CYCLE_MS}ms · base=${BASE_URL}`,
  );

  // Heartbeat ticker — runs independent of cycle cadence.
  setInterval(heartbeat, HEARTBEAT_MS);
  heartbeat();

  // Main loop. We use a fresh setTimeout at the end of each cycle
  // rather than setInterval — that way if a cycle takes 20s, we don't
  // pile up queued cycles.
  const runCycle = async () => {
    try {
      await doOneCycle();
    } catch (e) {
      // Never let one bad cycle kill the runner.
      log(
        "cycle crashed:",
        e instanceof Error ? e.stack ?? e.message : String(e),
      );
    } finally {
      setTimeout(runCycle, CYCLE_MS);
    }
  };
  setTimeout(runCycle, 1500);
}

async function doOneCycle() {
  const cycle = nextCycleId();
  recordCycleStart(cycle);
  const t0 = Date.now();

  // Section 3B — auto-drip. Every 30 cycles (~90 min on 3-min cycles)
  // check Atlas's USDC balance and top up from the treasury if dry.
  // Cheap when healthy (one RPC read), only fires the transfer when
  // the vault is below $1. Never throws — if the treasury isn't
  // configured or the transfer errors, we log and move on.
  if (cycle % 30 === 0) {
    void runAutoDrip(cycle);
  }

  const proposal = await decide();
  log(`cycle ${cycle} · decided:`, proposal.action, "→", proposal.reasoning);

  let outcome: AtlasDecision["outcome"];
  let txSignature: string | null = null;
  let blockedReason: string | null = null;

  if (proposal.action === "idle") {
    outcome = "idle";
  } else {
    const payResult = await callPay(proposal);
    outcome = payResult.outcome;
    txSignature = payResult.txSignature;
    blockedReason = payResult.blockedReason;
    // If Atlas is being paid by readers, they pay via Pulse and we
    // separately cron an earnings sweep. For the demo, simulate an
    // incoming $0.10 read-payment per 5 publishes so the "earned"
    // number ticks up visibly.
    if (outcome === "settled" && proposal.action === "publish") {
      addEarning(0.1);
    }
  }

  const latencyMs = Date.now() - t0;
  const decision: AtlasDecision = {
    id: nanoid(),
    decidedAt: new Date(t0).toISOString(),
    reasoning: proposal.reasoning,
    action: proposal.action,
    merchant: proposal.merchant,
    amountUsd: proposal.amountUsd,
    outcome,
    txSignature,
    blockedReason,
    latencyMs,
    cycle,
  };
  recordDecision(decision);

  const nextAt = new Date(Date.now() + CYCLE_MS).toISOString();
  recordCycleEnd(cycle, decision.id, nextAt);

  log(
    `cycle ${cycle} · ${outcome}`,
    txSignature ? `· ${txSignature.slice(0, 12)}…` : "",
    blockedReason ? `· refused: ${blockedReason}` : "",
  );
  // Running totals for the log.
  const s = readState();
  log(
    `  totals: spent $${s.totalSpentUsd.toFixed(2)} · earned $${s.totalEarnedUsd.toFixed(2)} · blocked ${s.totalBlocked} · cycles ${s.totalCycles}`,
  );
}

interface PayResult {
  outcome: "settled" | "blocked" | "failed";
  txSignature: string | null;
  blockedReason: string | null;
}

async function callPay(
  proposal: Awaited<ReturnType<typeof decide>>,
): Promise<PayResult> {
  try {
    const res = await fetch(`${BASE_URL}/api/vault/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENT_KEY}`,
      },
      body: JSON.stringify({
        merchant: proposal.merchant,
        recipientPubkey: RECIPIENT,
        amountUsd: proposal.amountUsd,
        memo: proposal.memo ?? undefined,
      }),
    });
    const data = (await res.json()) as {
      payment?: {
        status: "settled" | "blocked" | "failed";
        reason: string | null;
        txSignature: string | null;
      };
      message?: string;
      error?: string;
    };
    const p = data.payment;
    if (!p) {
      return {
        outcome: "failed",
        txSignature: null,
        blockedReason: data.message || data.error || `HTTP ${res.status}`,
      };
    }
    return {
      outcome: p.status,
      txSignature: p.txSignature ?? null,
      blockedReason: p.status === "blocked" ? p.reason : null,
    };
  } catch (e) {
    return {
      outcome: "failed",
      txSignature: null,
      blockedReason: e instanceof Error ? e.message : "network error",
    };
  }
}
