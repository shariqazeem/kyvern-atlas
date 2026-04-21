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

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, XOctagon } from "lucide-react";
import { SignatureReveal } from "@/components/atlas/signature-reveal";
import { LiveTimer } from "@/components/atlas/live-timer";
import { NumberScramble } from "@/components/atlas/number-scramble";

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
  /** Attacker's next-probe ETA — drives the 'defending' countdown band. */
  nextAttackAt: string | null;
  /** Rolling 24h policy window — drives "healthy / near cap / exhausted" UI. */
  policy: {
    dailyCapUsd: number;
    spentTodayUsd: number;
    spendUtilization: number;
    nearCap: boolean;
    exhausted: boolean;
    windowResetsAt: string | null;
  };
  vaultId: string | null;
  network: "devnet" | "mainnet";
}

import { EASE_PREMIUM as EASE } from "@/lib/motion";
import { fmtNextCycle, fmtAgo, fmtInt, fmtUsd } from "@/lib/format";

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

export function AtlasObservatory({
  initialState = null,
}: {
  /**
   * SSR'd snapshot of Atlas state. When provided, skips the initial
   * fetch flicker — first paint ships real numbers. Passed down from
   * the server component in src/app/page.tsx.
   */
  initialState?: AtlasState | null;
} = {}) {
  const [state, setState] = useState<AtlasState | null>(initialState);

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
    return () => clearInterval(poll);
  }, [load]);

  // Uptime ticking + next-cycle countdown are driven by <LiveTimer/>
  // internally — no local setTick plumbing needed.

  // While we're waiting for the first-ever response, render an outlined
  // placeholder so layout doesn't shift.
  const loading = state === null;
  const awaitingIgnition =
    !loading && (!state?.firstIgnitionAt || state?.running === false);

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
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--chrome-red)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--chrome-yellow)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--chrome-green)" }} />
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
                  ? "var(--success)"
                  : awaitingIgnition
                    ? "var(--chrome-yellow)"
                    : "var(--text-quaternary)",
              }}
            />
            <span
              className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
              style={{
                color: state?.running
                  ? "var(--success-deep)"
                  : "var(--text-tertiary)",
              }}
            >
              {state?.running ? "live" : awaitingIgnition ? "awaiting ignition" : "loading…"}
            </span>
          </div>
        </div>

        {/* Status band — the single most important "this is live" cue.
            One line, one color, tells the judge what Atlas is doing RIGHT
            NOW: defending against an imminent probe, nearing its daily
            cap, exhausted, or quietly healthy. See <StatusBand/> for the
            precedence rules. Hidden during ignition so it doesn't compete
            with the "awaiting" state in the chrome row. */}
        {state?.running && <StatusBand state={state} />}

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
              {/* Uptime — number first, label ceded to the eyebrow above.
                  Larger typographic weight matches the stat-row below so
                  the hero card reads as "data leading, label trailing".
                  <LiveTimer/> internally ticks the 1Hz clock — we just
                  feed it the ignition timestamp. */}
              {awaitingIgnition || !state?.firstIgnitionAt ? (
                <p
                  className="mt-0.5 text-[28px] md:text-[32px] font-mono-numbers tabular-nums tracking-[-0.02em] leading-none"
                  style={{ color: "var(--text-primary)", fontWeight: 500 }}
                >
                  just now
                </p>
              ) : (
                <LiveTimer
                  since={state.firstIgnitionAt}
                  className="mt-0.5 block text-[28px] md:text-[32px] font-mono-numbers tabular-nums tracking-[-0.02em] leading-none"
                  style={{ color: "var(--text-primary)", fontWeight: 500 }}
                />
              )}
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
              value={state?.totalSpentUsd ?? 0}
              format={fmtUsd}
              loading={loading}
            />
            <Stat
              label="Lost to exploits"
              value={state?.fundsLostUsd ?? 0}
              format={fmtUsd}
              loading={loading}
              tone={
                (state?.fundsLostUsd ?? 0) === 0 ? "success" : "warn"
              }
            />
          </div>

          {/* Last decision — the "thinking out loud" moment + narrative */}
          <div className="pt-5 pb-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="w-3 h-3" style={{ color: "var(--agent)" }} />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--agent)" }}
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
                  style={{ background: "var(--agent)" }}
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
            {/* "Last decision" — the typographic star of the card.
                Promoted from 15.5px italic body to 18/20px primary-color
                statement. Quotation marks via CSS ::before/::after kept
                as subtle accent, not wrapping text. This is the line
                that ends up on X — make it earn its fame. */}
            <p
              className="text-[18px] md:text-[20px] leading-[1.4] text-balance tracking-[-0.01em]"
              style={{
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              {state?.lastDecision
                ? `“${state.lastDecision.reasoning}”`
                : awaitingIgnition
                  ? "Atlas ignites on hackathon day one. The first decision lands here."
                  : "Atlas is thinking about its next move…"}
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
                        ? "var(--success-deep)"
                        : state.lastDecision.outcome === "blocked"
                          ? "var(--attack)"
                          : "var(--text-tertiary)",
                    fontWeight: 600,
                  }}
                >
                  {state.lastDecision.outcome}
                </span>
                {state.lastDecision.txSignature && (
                  <>
                    <span style={{ color: "var(--text-quaternary)" }}>·</span>
                    <SignatureReveal
                      signature={state.lastDecision.txSignature}
                      network={state.network}
                      truncate={18}
                      className="inline-flex items-center gap-0.5 hover:underline"
                      textClassName="text-[11.5px]"
                    />
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
              background: "var(--attack-bg)",
              borderTop: "0.5px solid var(--border-subtle)",
            }}
          >
            <XOctagon
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "var(--attack)" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--attack)" }}
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
                  <span style={{ color: "var(--attack)", fontWeight: 600 }}>
                    {blockedReason(state)}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-quaternary)" }}>
                    Result:&nbsp;
                  </span>
                  <span style={{ color: "var(--success-deep)", fontWeight: 600 }}>
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

/**
 * Stat — number-first hierarchy.
 *
 * Old layout: tiny uppercase label on top, medium number beneath.
 * That made labels compete with values and read as spreadsheet chrome.
 *
 * New layout (Apple/Stripe/Linear pattern): massive mono numeral leads,
 * tiny uppercase label cedes to it below. On a first-impression pass,
 * the judge reads the NUMBER, not the word "TRANSACTIONS". The label
 * is there only to confirm what they're looking at.
 *
 * Loading state is a subtle width-100% skeleton pulse rather than a
 * literal em-dash — dashes read as broken data, not loading.
 */
function Stat({
  label,
  value,
  loading,
  tone,
  format,
}: {
  label: string;
  value: number;
  loading?: boolean;
  tone?: "success" | "warn";
  /** Optional formatter — defaults to `fmtInt` (thousands separators). */
  format?: (n: number) => string;
}) {
  const color =
    tone === "success"
      ? "var(--success-deep)"
      : tone === "warn"
        ? "var(--attack)"
        : "var(--text-primary)";
  const fmt = format ?? fmtInt;
  return (
    <div>
      {loading ? (
        <div
          className="h-[30px] w-20 rounded-[6px] animate-pulse"
          style={{ background: "var(--surface-2)" }}
          aria-hidden
        />
      ) : (
        <p
          className="text-[26px] md:text-[30px] font-mono-numbers tabular-nums tracking-[-0.02em] leading-none"
          style={{ color, fontWeight: 500 }}
        >
          <NumberScramble value={value} format={fmt} />
        </p>
      )}
      <p
        className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--text-quaternary)" }}
      >
        {label}
      </p>
    </div>
  );
}

/**
 * ─── Status band ──────────────────────────────────────────────────
 * One-line narrator above the counters. Picks ONE story to tell —
 * whichever is loudest right now — so the hero never competes with
 * itself:
 *
 *   1. policy.exhausted  → red    "policy window exhausted · resets in 3h 12m"
 *   2. policy.nearCap    → amber  "nearing daily cap · $4.12 / $5.00 today"
 *   3. nextAttackAt soon → indigo "defending · next adversarial probe in 4:32"
 *   4. healthy + spend   → green  "policy window healthy · $0.80 / $5.00 today"
 *   5. healthy + idle    → gray   "policy window idle · no payments today"
 *
 * The precedence reads the product's priorities: alarm states eclipse
 * defense chatter, defense chatter eclipses calm, calm is minimal.
 */
function StatusBand({ state }: { state: AtlasState }) {
  const p = state.policy;
  const exhausted = p?.exhausted ?? false;
  const near = p?.nearCap ?? false;
  const nextAttackSoon =
    !!state.nextAttackAt &&
    new Date(state.nextAttackAt).getTime() - Date.now() < 30 * 60_000;

  // Pick the loudest story.
  let tone: "attack" | "warn" | "agent" | "success" | "muted" = "muted";
  let label = "";
  let body: React.ReactNode = null;

  if (exhausted) {
    tone = "attack";
    label = "exhausted";
    body = (
      <>
        policy window consumed · spent{" "}
        <strong>{fmtUsd(p.spentTodayUsd)}</strong> of{" "}
        <strong>{fmtUsd(p.dailyCapUsd)}</strong>
        {p.windowResetsAt ? (
          <>
            {" "}
            · resets in <CountdownLive until={p.windowResetsAt} mode="hms" />
          </>
        ) : null}
      </>
    );
  } else if (near) {
    tone = "warn";
    label = "near cap";
    body = (
      <>
        nearing daily cap · <strong>{fmtUsd(p.spentTodayUsd)}</strong> /{" "}
        {fmtUsd(p.dailyCapUsd)}
        {p.windowResetsAt ? (
          <>
            {" "}
            · window rolls in{" "}
            <CountdownLive until={p.windowResetsAt} mode="hms" />
          </>
        ) : null}
      </>
    );
  } else if (nextAttackSoon && state.nextAttackAt) {
    tone = "agent";
    label = "defending";
    body = (
      <>
        next adversarial probe in{" "}
        <CountdownLive until={state.nextAttackAt} mode="mss" />
      </>
    );
  } else if ((p?.spentTodayUsd ?? 0) > 0) {
    tone = "success";
    label = "healthy";
    body = (
      <>
        policy window healthy ·{" "}
        <strong>{fmtUsd(p.spentTodayUsd)}</strong> of{" "}
        {fmtUsd(p.dailyCapUsd)} in last 24h
      </>
    );
  } else {
    tone = "muted";
    label = "idle";
    body = (
      <>
        policy window idle · no payments in the last 24h
      </>
    );
  }

  // Tone → CSS variable pair. Stays within our semantic palette — no
  // one-off hex, respects dark-mode if we ever introduce it.
  const toneMap: Record<typeof tone, { fg: string; bg: string; dot: string }> = {
    attack: {
      fg: "var(--attack)",
      bg: "var(--attack-bg)",
      dot: "var(--attack)",
    },
    warn: {
      fg: "var(--warning)",
      bg: "var(--warning-bg)",
      dot: "var(--warning)",
    },
    agent: {
      fg: "var(--agent)",
      bg: "var(--agent-bg)",
      dot: "var(--agent)",
    },
    success: {
      fg: "var(--success-deep)",
      bg: "var(--success-bg)",
      dot: "var(--success)",
    },
    muted: {
      fg: "var(--text-tertiary)",
      bg: "var(--surface-2)",
      dot: "var(--text-quaternary)",
    },
  };
  const t = toneMap[tone];

  return (
    <div
      className="flex items-center gap-2 px-5 py-2 text-[11.5px] tracking-tight"
      style={{
        background: t.bg,
        borderBottom: "0.5px solid var(--border-subtle)",
        color: t.fg,
      }}
    >
      <motion.span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: t.dot }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span
        className="font-semibold uppercase tracking-[0.1em] text-[10px] shrink-0"
        style={{ color: t.fg }}
      >
        {label}
      </span>
      <span
        className="flex-1 text-[11.5px] font-mono-numbers truncate"
        style={{ color: "var(--text-secondary)" }}
      >
        {body}
      </span>
      {/* Persistent right-rail — "N attacks survived this week". Always
          present (not tied to the alarm story) because it IS the product
          claim; dimmer color so it reads as a supporting stat, not a
          competing narrative. Links to /atlas#attack-atlas. */}
      <AttacksThisWeekRail />
    </div>
  );
}

/**
 * Tiny ticker at the right edge of the status band. Polls the
 * leaderboard endpoint every 15s (slower than the main observatory
 * poll — this is ambient, not a headline). On click, anchors to
 * /atlas#attack-atlas so the visitor can go fire their own probe.
 */
function AttacksThisWeekRail() {
  const [weekly, setWeekly] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/atlas/leaderboard");
        if (!r.ok) return;
        const j = (await r.json()) as { weekly?: { total?: number } };
        if (!cancelled) setWeekly(j.weekly?.total ?? 0);
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (weekly === null) return null;
  return (
    <a
      href="/atlas#attack-atlas"
      className="ml-2 hidden sm:inline-flex items-center gap-1 font-mono-numbers text-[11px] shrink-0 transition-opacity hover:opacity-80"
      style={{ color: "var(--text-tertiary)" }}
    >
      <span style={{ color: "var(--text-quaternary)" }}>survived</span>
      <strong style={{ color: "var(--success-deep)", fontWeight: 700 }}>
        <NumberScramble value={weekly} format={fmtInt} />
      </strong>
      <span style={{ color: "var(--text-quaternary)" }}>this week</span>
    </a>
  );
}

/**
 * Countdown clock that ticks once per second and renders either
 * `m:ss` or `Xh Ym` until the `until` ISO. Swaps to "now" when
 * the deadline is in the past, so callers never flash negative
 * numbers. We reuse `<LiveTimer/>` internally for the 1Hz tick.
 */
function CountdownLive({
  until,
  mode,
}: {
  until: string;
  mode: "mss" | "hms";
}) {
  const target = new Date(until).getTime();
  return (
    <LiveTimer
      since={new Date().toISOString()}
      render={() => {
        const diffMs = target - Date.now();
        if (diffMs <= 0) return "now";
        const s = Math.floor(diffMs / 1000);
        if (mode === "hms") {
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
          return `${m}m ${String(s % 60).padStart(2, "0")}s`;
        }
        const m = Math.floor(s / 60);
        return `${m}:${String(s % 60).padStart(2, "0")}`;
      }}
    />
  );
}
