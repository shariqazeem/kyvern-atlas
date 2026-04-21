"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <BudgetTab/> — the cinematic budget surface.
 *
 * This tab owns the answer to one question:
 *   "How close is my agent to its caps, and when do they reset?"
 *
 * Visual language:
 *   · Big breathing spend ring — 220px circular progress, pulses once
 *     every ~5s to communicate "this is live". Center text is the
 *     current spend (NumberScramble) over the daily cap.
 *   · Right-side rail: weekly bar + per-tx ceiling + next reset.
 *   · Bottom strip: velocity indicator (calls/window) with its own ring.
 *
 * When the user is near cap (>= 80%), the ring color flips to attack
 * red and a "heads-up" banner appears above the grid.
 * ════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { OctagonAlert, Timer, Zap } from "lucide-react";
import { EASE_PREMIUM as EASE } from "@/lib/motion";
import { fmtUsd, fmtInt } from "@/lib/format";
import { NumberScramble } from "@/components/atlas/number-scramble";
import type { Vault, BudgetSnapshot, VelocitySnapshot } from "../types";

export interface BudgetTabProps {
  vault: Vault;
  budget: BudgetSnapshot;
  velocity: VelocitySnapshot;
}

export function BudgetTab({ vault, budget, velocity }: BudgetTabProps) {
  const dailyPct = Math.min(1, Math.max(0, budget.dailyUtilization));
  const weeklyPct = Math.min(1, Math.max(0, budget.weeklyUtilization));
  const velocityPct =
    velocity.maxCallsPerWindow > 0
      ? Math.min(1, velocity.callsInWindow / velocity.maxCallsPerWindow)
      : 0;
  const nearCap = dailyPct >= 0.8 || weeklyPct >= 0.8 || velocityPct >= 0.8;

  // Reset times — daily resets at 00:00 UTC, weekly rolls 7d from the
  // vault's createdAt (same heuristic Atlas uses).
  const nextDailyResetMs = useMemo(() => {
    const now = new Date();
    const utc = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
      ),
    );
    return utc.getTime();
  }, []);

  return (
    <div className="space-y-4">
      {/* Heads-up banner when any dimension is near cap */}
      {nearCap && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-[12px]"
          style={{
            background: "var(--warning-bg)",
            border: "0.5px solid rgba(245,158,11,0.3)",
            color: "var(--text-primary)",
          }}
        >
          <OctagonAlert
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--warning)" }}
          />
          <span className="text-[12.5px]">
            <span style={{ fontWeight: 600, color: "var(--warning)" }}>
              Near cap
            </span>
            {" · "}
            Your agent is within 20% of a limit. Anything beyond will be refused
            at consensus before it signs.
          </span>
        </motion.div>
      )}

      {/* Hero: breathing daily-spend ring + right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
        <HeroRing
          spent={budget.spentToday}
          limit={budget.dailyLimitUsd}
          utilization={dailyPct}
        />

        <aside className="flex flex-col gap-3">
          <WeeklyBar
            spent={budget.spentThisWeek}
            limit={budget.weeklyLimitUsd}
            utilization={weeklyPct}
          />
          <PerTxCap perTxMax={budget.perTxMaxUsd} />
          <ResetCountdown at={nextDailyResetMs} />
        </aside>
      </div>

      {/* Velocity ring — calls/window */}
      <VelocityRing
        calls={velocity.callsInWindow}
        cap={velocity.maxCallsPerWindow}
        window={velocity.velocityWindow}
        pct={velocityPct}
      />

      {/* Tiny footer — vault id + window reset info for operators */}
      <p
        className="pt-3 text-[11px]"
        style={{ color: "var(--text-quaternary)" }}
      >
        Daily window resets at 00:00 UTC · Weekly window rolls 7 days · Agent
        can never exceed{" "}
        <span
          className="font-mono-numbers"
          style={{ color: "var(--text-tertiary)" }}
        >
          ${budget.perTxMaxUsd.toFixed(2)}
        </span>{" "}
        in a single payment. Configured at deploy, enforced at consensus. Vault{" "}
        <code className="code-inline">{shorten(vault.id)}</code>.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Hero spend ring — the cinematic centerpiece of the Budget tab.

   SVG circle with a breathing outer glow. Color flips red at ≥80%.
   Center stack shows: huge spent amount, daily limit as denominator,
   a percentage chip floating at the top-right of the ring.
   ──────────────────────────────────────────────────────────────── */

function HeroRing({
  spent,
  limit,
  utilization,
}: {
  spent: number;
  limit: number;
  utilization: number;
}) {
  const size = 220;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, utilization));
  const near = pct >= 0.8;
  const color = near ? "var(--attack)" : "var(--revenue)";
  const bg = near ? "var(--attack-bg)" : "var(--revenue-bg)";

  return (
    <section
      className="p-8 rounded-[22px] flex items-center gap-6 flex-col md:flex-row"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.10)",
      }}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {/* Soft breathing halo behind the ring */}
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ background: bg }}
          animate={{ scale: [1, 1.04, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="relative"
          aria-hidden
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - pct * circ }}
            transition={{ duration: 1.2, ease: EASE }}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: `${size / 2}px ${size / 2}px`,
            }}
          />
        </svg>

        {/* Center stack */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1"
            style={{ color: "var(--text-quaternary)" }}
          >
            Spent today
          </p>
          <p
            className="text-[36px] font-semibold leading-none tracking-[-0.02em]"
            style={{
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <NumberScramble value={spent} format={fmtUsd} />
          </p>
          <p
            className="mt-1 text-[12px] font-mono-numbers"
            style={{ color: "var(--text-tertiary)" }}
          >
            of {fmtUsd(limit)} daily
          </p>
        </div>

        {/* % chip floating top-right */}
        <div
          className="absolute -right-1 top-1 inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-semibold"
          style={{
            background: near ? "var(--attack-bg)" : "var(--surface)",
            color: near ? "var(--attack)" : "var(--text-primary)",
            border: "0.5px solid var(--border-subtle)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {Math.round(pct * 100)}%
        </div>
      </div>

      {/* Side copy — the "what this means" translation */}
      <div className="text-center md:text-left">
        <h3
          className="text-[20px] font-semibold tracking-[-0.02em] mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          {near
            ? "Agent is approaching its daily ceiling."
            : "Your agent has room to operate."}
        </h3>
        <p
          className="text-[13.5px] leading-[1.55]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {near
            ? `After ${fmtUsd(limit)} is spent in any 24-hour window, Squads v4 will refuse to co-sign further payments until 00:00 UTC.`
            : `The ring represents how much of today's ${fmtUsd(limit)} daily cap has been spent. At 100%, Squads refuses further payments until the window rolls over.`}
        </p>
      </div>
    </section>
  );
}

/* Weekly bar + per-tx cap + reset — the right-rail trio. */

function WeeklyBar({
  spent,
  limit,
  utilization,
}: {
  spent: number;
  limit: number;
  utilization: number;
}) {
  const pct = Math.min(1, Math.max(0, utilization));
  const near = pct >= 0.8;
  return (
    <div
      className="p-5 rounded-[16px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-quaternary)" }}
        >
          Spent this week
        </p>
        <p
          className="text-[11px] font-mono-numbers tabular-nums"
          style={{
            color: near ? "var(--attack)" : "var(--text-tertiary)",
            fontWeight: near ? 700 : 500,
          }}
        >
          {Math.round(pct * 100)}%
        </p>
      </div>
      <p
        className="text-[22px] font-semibold leading-none tracking-tight"
        style={{
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <NumberScramble value={spent} format={fmtUsd} />
        <span
          className="text-[12px] ml-1.5"
          style={{ color: "var(--text-quaternary)", fontWeight: 400 }}
        >
          / {fmtUsd(limit)}
        </span>
      </p>
      <div
        className="mt-3 h-1 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{ background: near ? "var(--attack)" : "var(--revenue)" }}
        />
      </div>
    </div>
  );
}

function PerTxCap({ perTxMax }: { perTxMax: number }) {
  return (
    <div
      className="p-5 rounded-[16px] flex items-center gap-3"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: "var(--surface-2)" }}
      >
        <Zap className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-quaternary)" }}
        >
          Per-transaction ceiling
        </p>
        <p
          className="text-[17px] font-semibold tracking-tight"
          style={{
            color: "var(--text-primary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtUsd(perTxMax)}
        </p>
        <p
          className="text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Any single call above this amount is refused.
        </p>
      </div>
    </div>
  );
}

function ResetCountdown({ at }: { at: number }) {
  // Simple ticking re-render every 30s — enough granularity for a
  // countdown that shows hours/minutes.
  const diffMs = at - Date.now();
  const h = Math.max(0, Math.floor(diffMs / 3_600_000));
  const m = Math.max(0, Math.floor((diffMs % 3_600_000) / 60_000));
  return (
    <div
      className="p-5 rounded-[16px] flex items-center gap-3"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: "var(--surface-2)" }}
      >
        <Timer className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-quaternary)" }}
        >
          Daily window resets in
        </p>
        <p
          className="text-[17px] font-semibold tracking-tight font-mono-numbers tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {h}h {String(m).padStart(2, "0")}m
        </p>
        <p
          className="text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Rolls over at 00:00 UTC.
        </p>
      </div>
    </div>
  );
}

/* Bottom velocity strip — matches the ring's visual language but wider. */

function VelocityRing({
  calls,
  cap,
  window,
  pct,
}: {
  calls: number;
  cap: number;
  window: "1h" | "1d" | "1w";
  pct: number;
}) {
  const size = 96;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const near = pct >= 0.8;
  const color = near ? "var(--attack)" : "var(--agent)";
  const windowLabel =
    window === "1h" ? "hour" : window === "1d" ? "day" : "week";
  return (
    <section
      className="p-6 rounded-[18px] flex items-center gap-5"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - pct * circ }}
            transition={{ duration: 1, ease: EASE }}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: `${size / 2}px ${size / 2}px`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p
            className="text-[16px] font-semibold tracking-tight"
            style={{
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <NumberScramble value={calls} format={fmtInt} />
          </p>
        </div>
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-quaternary)" }}
        >
          Calls per {windowLabel}
        </p>
        <p
          className="mt-0.5 text-[16px] font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {fmtInt(calls)}{" "}
          <span style={{ color: "var(--text-quaternary)", fontWeight: 400 }}>
            / {fmtInt(cap)}
          </span>
        </p>
        <p
          className="mt-1 text-[12px] leading-[1.5]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {near
            ? `Agent is ${Math.round(pct * 100)}% through its call budget. New calls will be throttled until the window rolls over.`
            : `Agent has ${fmtInt(Math.max(0, cap - calls))} calls left before the rate cap kicks in.`}
        </p>
      </div>
    </section>
  );
}

function shorten(s: string): string {
  if (!s || s.length < 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}
