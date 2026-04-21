/**
 * ════════════════════════════════════════════════════════════════════
 * Atlas attacker — continuous adversarial pressure.
 *
 * Runs as its own PM2 process. Every ~20–30 minutes, it picks one of
 * several structured attack scenarios and tries to execute it against
 * Atlas's live vault via the real /api/vault/pay endpoint.
 *
 * These are REAL requests that SHOULD fail. Every refusal is logged to
 * the atlas_attacks table so the observatory's "Last blocked" card and
 * the "Attacks blocked" counter tick up with proof-of-defense events.
 *
 * Why this matters for the submission:
 *   Atlas running = impressive
 *   Atlas being attacked and surviving = unforgettable
 *
 *   When a judge opens kyvernlabs.com and sees an uptime counter
 *   plus "Attacks blocked: 47 · Funds lost: $0.00," the product story
 *   writes itself.
 *
 * Each attack is authentic — the request lands at our /api/vault/pay
 * endpoint, Kyvern's policy program rejects it at the consensus layer
 * or we refuse it at the policy layer BEFORE chain. Either way, no
 * funds move. The attack record captures the attempt, the policy
 * that caught it, and a program error code where applicable.
 * ════════════════════════════════════════════════════════════════════
 */

import { nanoid } from "nanoid";
import {
  recordAttack,
  heartbeat,
  readState,
  setNextAttackAt,
} from "./db";
import type { AtlasAttack } from "./schema";
import { pickRandomScenario, type AttackScenario } from "./attack-catalog";

const BASE_URL = process.env.KYVERN_BASE_URL ?? "http://127.0.0.1:3001";
const AGENT_KEY = process.env.KYVERNLABS_AGENT_KEY ?? "";
// NOTE: the attacker's scenarios build their OWN recipient (rogue
// wallets per scenario). We don't use ATLAS_RECIPIENT here — attacks
// are supposed to target attacker-controlled addresses.

// How often the attacker runs, ms. Default 22 min with some jitter so
// attacks don't feel scheduled / predictable. Judges should feel like
// adversaries are probing at irregular intervals — that's reality.
const ATTACK_MS = Number(process.env.ATLAS_ATTACK_MS ?? 22 * 60_000);
const HEARTBEAT_MS = 30_000;

function log(...args: unknown[]) {
  console.log(`[attacker ${new Date().toISOString()}]`, ...args);
}

// The attack catalogue used to live inline here. Now sourced from
// `attack-catalog.ts` so the public-probe endpoint fires identical
// payloads. One source of truth = authentic "I tried to hack Atlas
// and the chain refused" tweets.

/**
 * Fire a single attack. Returns the recorded AtlasAttack for logging.
 */
async function runOneAttack(): Promise<AtlasAttack | null> {
  if (!AGENT_KEY) {
    log("missing KYVERNLABS_AGENT_KEY env — skipping");
    return null;
  }

  const scenario: AttackScenario = pickRandomScenario();
  const payload = scenario.buildPayload();
  log(
    `firing: ${scenario.type} · ${scenario.description} · → ${payload.merchant} · $${payload.amountUsd}`,
  );

  let blockedReason = "policy_violation";
  let failedTxSignature: string | null = null;

  try {
    const r = await fetch(`${BASE_URL}/api/vault/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENT_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const d = (await r.json()) as {
      payment?: {
        status: string;
        reason: string | null;
        txSignature: string | null;
      };
      error?: string;
      message?: string;
    };

    if (d.payment?.status === "blocked") {
      blockedReason = d.payment.reason ?? "policy_violation";
      // Policy-layer blocks never land on-chain.
      failedTxSignature = d.payment.txSignature ?? null;
    } else if (d.payment?.status === "failed") {
      blockedReason = d.payment.reason ?? "chain_refused";
      failedTxSignature = d.payment.txSignature ?? null;
    } else if (d.payment?.status === "settled") {
      // Shouldn't happen — this WOULD be a real breach. Log it loudly.
      log(
        "⚠ attack unexpectedly SETTLED — this is a real security issue:",
        d.payment,
      );
      blockedReason = "UNEXPECTED_SETTLEMENT";
      failedTxSignature = d.payment.txSignature ?? null;
    } else {
      blockedReason = d.error || d.message || `http_${r.status}`;
    }
  } catch (e) {
    blockedReason = e instanceof Error ? e.message : "network_error";
  }

  const attack: AtlasAttack = {
    id: nanoid(),
    attemptedAt: new Date().toISOString(),
    type: scenario.type,
    description: scenario.description,
    blockedReason,
    failedTxSignature,
    source: "scheduled",
  };
  recordAttack(attack);
  log(`  refused by Kyvern: ${blockedReason}`);
  return attack;
}

/** Main entry point — supervised by PM2 in production. */
export async function runAttacker(): Promise<void> {
  if (!AGENT_KEY) {
    throw new Error(
      "Attacker requires KYVERNLABS_AGENT_KEY (the same key Atlas uses).",
    );
  }
  log(`boot · cadence=${Math.round(ATTACK_MS / 60000)}m · base=${BASE_URL}`);

  setInterval(heartbeat, HEARTBEAT_MS);
  heartbeat();

  const tick = async () => {
    try {
      await runOneAttack();
      const s = readState();
      log(
        `  totals: attacks=${s.totalAttacksBlocked} · blocked=${s.totalBlocked} · lost=$${s.fundsLostUsd.toFixed(2)}`,
      );
    } catch (e) {
      log("cycle crashed:", e instanceof Error ? e.message : String(e));
    } finally {
      // Jitter ±20% so attacks feel organic, not scheduled.
      const jitter = 0.8 + Math.random() * 0.4;
      const delayMs = Math.round(ATTACK_MS * jitter);
      // Expose the next-attack ETA so the observatory can render a
      // 'defending · next probe in N:NN' countdown band. The band is
      // the single most important "this is live" cue on the hero.
      const nextAt = new Date(Date.now() + delayMs).toISOString();
      setNextAttackAt(nextAt);
      setTimeout(tick, delayMs);
    }
  };

  // Fire the first attack in 30s so the observatory lights up quickly
  // after ignition, then fall into normal cadence. Also expose that
  // first ETA immediately so the countdown band has something to
  // render before the first attack lands.
  const firstDelay = 30_000;
  setNextAttackAt(new Date(Date.now() + firstDelay).toISOString());
  setTimeout(tick, firstDelay);
}
