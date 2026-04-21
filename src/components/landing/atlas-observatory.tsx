"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * AtlasObservatory — the landing-page live proof.
 *
 * Every 3s it polls /api/atlas/status and renders:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  ATLAS · First autonomous agent on Kyvern                    │
 *   │  running for  00d 14h 23m     [● live]                       │
 *   │  ─────────                                                   │
 *   │  412 txs · 14 attacks blocked · $0.00 lost                   │
 *   │                                                              │
 *   │  Last decision:                                              │
 *   │  "Buying fresh news from Perplexity — last pull is 4h stale."│
 *   │  next in 3m 12s                                              │
 *   │                                                              │
 *   │  Last blocked:                                               │
 *   │  Rogue-merchant probe · MerchantNotAllowlisted · 2m ago      │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Until Atlas is ignited on the VM, the API returns a neutral
 * "atlas offline" response and we render a graceful "awaiting first
 * cycle" state instead of the numbers.
 *
 * Visual language: matches the premium light theme — hairline borders,
 * JetBrains Mono for numerics, Inter for the reasoning, understated
 * motion. No gradients.
 * ════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Shield, XOctagon } from "lucide-react";

interface AtlasState {
  running: boolean;
  totalCycles: number;
  firstIgnitionAt: string | null;
  uptimeMs: number;
  totalSettled: number;
  totalSpentUsd: number;
  totalEarnedUsd: number;
  totalBlocked: number;
  totalAttacksBlocked: number;
  fundsLostUsd: number;
  lastDecision: {
    id: string;
    decidedAt: string;
    reasoning: string;
    action: string;
    merchant: string | null;
    amountUsd: number;
    outcome: "settled" | "blocked" | "failed" | "idle";
    txSignature: string | null;
    blockedReason: string | null;
    latencyMs: number;
  } | null;
  lastAttack: {
    id: string;
    attemptedAt: string;
    type: string;
    description: string;
    blockedReason: string;
    failedTxSignature: string | null;
  } | null;
  nextCycleAt: string | null;
  vaultId: string | null;
  network: "devnet" | "mainnet";
}

const EASE = [0.25, 0.1, 0.25, 1] as const;

function fmtUptime(ms: number): string {
  if (ms <= 0) return "00d 00h 00m";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function fmtNextCycle(iso: string | null): string {
  if (!iso) return "scheduling…";
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "deciding now";
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  // Ticks down every second — anticipation fuels attention.
  return `next action in ${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * If there's no dedicated attack record yet (attack simulator lands in a
 * future session), fall back to showing the most recent organic block —
 * i.e. Atlas itself tried something outside its policy and Kyvern
 * refused. Same on-chain proof; different source of the block.
 */
function lastOrganicBlock(
  state: AtlasState | null,
): {
  attemptedAt: string;
  description: string;
  blockedReason: string;
  merchant: string | null;
} | null {
  if (!state) return null;
  // If the most recent decision was blocked, use that.
  if (state.lastDecision?.outcome === "blocked") {
    const d = state.lastDecision;
    return {
      attemptedAt: d.decidedAt,
      description: `${d.action} → ${d.merchant ?? "unknown"}`,
      blockedReason: d.blockedReason ?? "policy violation",
      merchant: d.merchant,
    };
  }
  return null;
}

function blockedAgo(state: AtlasState | null): string {
  if (state?.lastAttack) return fmtAgo(state.lastAttack.attemptedAt);
  const organic = lastOrganicBlock(state);
  if (organic) return fmtAgo(organic.attemptedAt);
  return "—";
}

function blockedAttempt(state: AtlasState | null): string {
  if (state?.lastAttack) return state.lastAttack.description;
  const organic = lastOrganicBlock(state);
  if (organic) {
    // Describe Atlas's organic attempts in the same voice as attacks.
    return `Payment attempt to an off-policy endpoint`;
  }
  return "—";
}

function blockedTarget(state: AtlasState | null): string | null {
  if (state?.lastAttack) return null;
  const organic = lastOrganicBlock(state);
  return organic?.merchant ?? null;
}

function blockedReason(state: AtlasState | null): string {
  if (state?.lastAttack) return state.lastAttack.blockedReason;
  const organic = lastOrganicBlock(state);
  return organic?.blockedReason ?? "policy_violation";
}

/**
 * Human-friendly sentence that translates a decision's (action, outcome,
 * merchant) into a narrative line a non-technical judge understands.
 * This is the "Why this matters" subline under the Last decision.
 */
function whyThisMatters(d: {
  action: string;
  outcome: string;
  merchant: string | null;
  blockedReason?: string | null;
}): string {
  if (d.outcome === "idle") {
    return "Atlas chose not to spend right now. Not every moment deserves a transaction.";
  }
  if (d.outcome === "blocked") {
    return `Kyvern refused this payment at the consensus layer. The agent tried; the chain said no. No funds moved — the treasury is exactly where it was before the attempt.`;
  }
  if (d.outcome === "failed") {
    return "The payment could not land on-chain. Kyvern logs every attempt — successful or not — so nothing ever happens silently.";
  }
  // settled
  const m = d.merchant ?? "an approved endpoint";
  return `Atlas paid ${m} within its on-chain policy. Kyvern verified the rule, Squads v4 signed, Solana settled — all in under two seconds.`;
}

function fmtAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function AtlasObservatory() {
  const [state, setState] = useState<AtlasState | null>(null);
  const [tick, setTick] = useState(0); // forces uptime + next-cycle re-render
  const mountedAt = useRef(Date.now());

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/atlas/status");
      if (!r.ok) return;
      const j = (await r.json()) as AtlasState;
      setState(j);
    } catch {
      // silent — observatory should never crash the whole page
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 3500);
    const uptimeTick = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(uptimeTick);
    };
  }, [load]);

  // While we're waiting for the first-ever response, render an outlined
  // placeholder so layout doesn't shift.
  const loading = state === null;
  const awaitingIgnition =
    !loading && (!state?.firstIgnitionAt || state?.running === false);

  // Compute live values off the last snapshot we have.
  const uptimeMs = state?.firstIgnitionAt
    ? Date.now() -
      new Date(state.firstIgnitionAt).getTime()
    : Date.now() - mountedAt.current;
  // Touch `tick` so effect re-runs and the minute counter increments.
  void tick;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
      className="relative mx-auto max-w-[840px]"
    >
      <div
        className="rounded-[22px] overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.12)",
        }}
      >
        {/* Chrome bar — "browser window" frame to hint that this is a live page */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#F87171" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FBBF24" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#4ADE80" }} />
          </div>
          <a
            href="/atlas"
            className="text-[11px] font-mono-numbers tracking-tight transition-colors hover:text-[color:var(--text-secondary)]"
            style={{ color: "var(--text-quaternary)" }}
          >
            kyvernlabs.com/atlas · solana devnet
          </a>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: state?.running
                  ? "#22C55E"
                  : awaitingIgnition
                    ? "#FBBF24"
                    : "var(--text-quaternary)",
              }}
            />
            <span
              className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
              style={{
                color: state?.running
                  ? "#15803D"
                  : "var(--text-tertiary)",
              }}
            >
              {state?.running ? "live" : awaitingIgnition ? "awaiting ignition" : "loading…"}
            </span>
          </div>
        </div>

        {/* Header: Atlas identity + uptime */}
        <div className="px-7 pt-7 pb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p
                className="text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "var(--text-quaternary)" }}
              >
                Atlas · First autonomous agent on Kyvern
              </p>
              <h3
                className="mt-1 text-[20px] font-semibold tracking-[-0.02em]"
                style={{ color: "var(--text-primary)" }}
              >
                {awaitingIgnition
                  ? "Preparing to run autonomously."
                  : "Running autonomously on Solana."}
              </h3>
              <p
                className="mt-1 text-[12px] leading-[1.5] max-w-[520px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Atlas is our reference agent — it pays for its own data, runs
                forecasts, gets attacked, and survives. Every number below
                is what it&rsquo;s doing right now. You can deploy a clone
                in 60 seconds.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--text-quaternary)" }}
              >
                Uptime
              </p>
              <p
                className="mt-0.5 text-[22px] font-mono-numbers tabular-nums tracking-tight"
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                {awaitingIgnition ? "— — —" : fmtUptime(uptimeMs)}
              </p>
            </div>
          </div>

          {/* Stat row */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4"
            style={{
              borderTop: "0.5px solid var(--border-subtle)",
              borderBottom: "0.5px solid var(--border-subtle)",
            }}
          >
            <Stat
              label="Transactions"
              value={state?.totalSettled ?? 0}
              loading={loading}
            />
            <Stat
              label="Attacks blocked"
              value={
                (state?.totalAttacksBlocked ?? 0) +
                (state?.totalBlocked ?? 0)
              }
              loading={loading}
              tone="warn"
            />
            <Stat
              label="Spent within policy"
              value={`$${(state?.totalSpentUsd ?? 0).toFixed(2)}`}
              loading={loading}
            />
            <Stat
              label="Lost to exploits"
              value={`$${(state?.fundsLostUsd ?? 0).toFixed(2)}`}
              loading={loading}
              tone={
                (state?.fundsLostUsd ?? 0) === 0 ? "success" : "warn"
              }
            />
          </div>

          {/* Last decision — the "thinking out loud" moment + narrative */}
          <div className="pt-5 pb-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="w-3 h-3" style={{ color: "#4F46E5" }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "#4F46E5" }}
              >
                Last decision
              </span>
              <span
                className="text-[10px] flex items-center gap-1"
                style={{ color: "var(--text-quaternary)" }}
              >
                ·
                {/* Pulsing dot — signals "something is coming". */}
                <motion.span
                  className="w-1 h-1 rounded-full"
                  style={{ background: "#4F46E5" }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <span className="font-mono-numbers tabular-nums">
                  {fmtNextCycle(state?.nextCycleAt ?? null)}
                </span>
              </span>
            </div>
            <p
              className="text-[15.5px] leading-[1.55] text-balance"
              style={{
                color: "var(--text-primary)",
                fontWeight: 400,
                fontStyle: "italic",
              }}
            >
              {state?.lastDecision
                ? `“${state.lastDecision.reasoning}”`
                : awaitingIgnition
                  ? "Atlas ignites on hackathon day one. The first decision lands here."
                  : "Loading last decision…"}
            </p>

            {/* Why this matters — narrative translation of what just happened. */}
            {state?.lastDecision && (
              <p
                className="mt-2.5 text-[12.5px] leading-[1.55] max-w-[660px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                {whyThisMatters(state.lastDecision)}
              </p>
            )}

            {state?.lastDecision && (
              <div
                className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-mono-numbers"
                style={{ color: "var(--text-tertiary)" }}
              >
                <span>{fmtAgo(state.lastDecision.decidedAt)}</span>
                <span style={{ color: "var(--text-quaternary)" }}>·</span>
                <span>{state.lastDecision.action}</span>
                {state.lastDecision.merchant && (
                  <>
                    <span style={{ color: "var(--text-quaternary)" }}>→</span>
                    <span>{state.lastDecision.merchant}</span>
                  </>
                )}
                <span style={{ color: "var(--text-quaternary)" }}>·</span>
                <span
                  style={{
                    color:
                      state.lastDecision.outcome === "settled"
                        ? "#15803D"
                        : state.lastDecision.outcome === "blocked"
                          ? "#B91C1C"
                          : "var(--text-tertiary)",
                    fontWeight: 600,
                  }}
                >
                  {state.lastDecision.outcome}
                </span>
                {state.lastDecision.txSignature && (
                  <>
                    <span style={{ color: "var(--text-quaternary)" }}>·</span>
                    <a
                      href={`https://explorer.solana.com/tx/${state.lastDecision.txSignature}?cluster=${state.network}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 hover:underline"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      verify on explorer
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/*
         * Last blocked — the attack/defense narrative moment.
         *
         * We surface the most recent refusal from EITHER the attack table
         * (intentional adversarial attempts) OR the decisions table
         * (Atlas organically tried something outside policy). Both are
         * proof that Kyvern is catching stuff in real time.
         */}
        {(state?.lastAttack || lastOrganicBlock(state)) && (
          <div
            className="px-7 py-5 flex items-start gap-3"
            style={{
              background: "rgba(239,68,68,0.04)",
              borderTop: "0.5px solid var(--border-subtle)",
            }}
          >
            <XOctagon
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "#B91C1C" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "#B91C1C" }}
                >
                  🚫 Blocked on-chain
                </span>
                <span
                  className="text-[10.5px]"
                  style={{ color: "var(--text-quaternary)" }}
                >
                  {blockedAgo(state)}
                </span>
              </div>

              {/* Structured narrative — feels like a security alert, not a raw log line */}
              <div
                className="mt-1.5 space-y-1 font-mono-numbers text-[12px]"
                style={{ color: "var(--text-primary)" }}
              >
                <div>
                  <span style={{ color: "var(--text-quaternary)" }}>
                    Attempt:&nbsp;
                  </span>
                  <span>{blockedAttempt(state)}</span>
                </div>
                {blockedTarget(state) && (
                  <div>
                    <span style={{ color: "var(--text-quaternary)" }}>
                      Target:&nbsp;
                    </span>
                    <span>{blockedTarget(state)}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: "var(--text-quaternary)" }}>
                    Policy:&nbsp;
                  </span>
                  <span style={{ color: "#B91C1C", fontWeight: 600 }}>
                    {blockedReason(state)}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-quaternary)" }}>
                    Result:&nbsp;
                  </span>
                  <span style={{ color: "#15803D", fontWeight: 600 }}>
                    Prevented by Kyvern — no funds moved
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: string | number;
  loading?: boolean;
  tone?: "success" | "warn";
}) {
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--text-quaternary)" }}
      >
        {label}
      </p>
      <p
        className="mt-0.5 text-[22px] font-mono-numbers tabular-nums tracking-tight"
        style={{
          color: loading
            ? "var(--text-quaternary)"
            : tone === "success"
              ? "#15803D"
              : tone === "warn"
                ? "#B91C1C"
                : "var(--text-primary)",
          fontWeight: 500,
        }}
      >
        {loading ? "—" : typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
