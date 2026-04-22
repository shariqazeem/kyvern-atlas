"use client";

/* ════════════════════════════════════════════════════════════════════
   Step 2 — Budgets

   Two columns on desktop:

     LEFT                          RIGHT
     · Preset row (3 chips)        · Live 24-hour simulation —
     · 3 numeric caps                "At this cap your agent could
                                      make ~14 calls, spend up to
                                      $4.80, hit its limit in ~11h."
                                      Numbers animate as you slide.

   The sim converts abstract caps into an operator-level narrative —
   "what does this actually mean?" — which is what turns a form into
   a configurator.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Wallet, Zap } from "lucide-react";
import type { VaultConfig } from "../types";
import { EASE_PREMIUM as ease } from "@/lib/motion";
import { NumberScramble } from "@/components/atlas/number-scramble";
import { fmtInt, fmtUsd } from "@/lib/format";

export interface BudgetsStepProps {
  config: VaultConfig;
  setConfig: (updater: (c: VaultConfig) => VaultConfig) => void;
}

const PRESETS = [
  { label: "Tinker", daily: 5, weekly: 20, perTx: 0.5 },
  { label: "Startup", daily: 50, weekly: 250, perTx: 5 },
  { label: "Production", daily: 500, weekly: 2500, perTx: 25 },
];

export function BudgetsStep({ config, setConfig }: BudgetsStepProps) {
  const activePreset = PRESETS.findIndex(
    (p) =>
      p.daily === config.dailyLimit &&
      p.weekly === config.weeklyLimit &&
      p.perTx === config.perTxMax,
  );

  const setAll = (daily: number, weekly: number, perTx: number) =>
    setConfig((c) => ({
      ...c,
      dailyLimit: daily,
      weeklyLimit: weekly,
      perTxMax: perTx,
    }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] gap-8">
      {/* LEFT — preset + fine-tune */}
      <div className="space-y-8">
        {/* Preset row */}
        <div>
          <label
            className="text-[13px] font-medium mb-3 block"
            style={{ color: "var(--text-primary)" }}
          >
            Pick a preset
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {PRESETS.map((p, i) => {
              const selected = activePreset === i;
              return (
                <button
                  key={p.label}
                  onClick={() => setAll(p.daily, p.weekly, p.perTx)}
                  className="p-4 rounded-[14px] text-left"
                  style={{
                    background: selected
                      ? "var(--surface)"
                      : "var(--surface-2)",
                    border: selected
                      ? "0.5px solid var(--text-primary)"
                      : "0.5px solid transparent",
                    boxShadow: selected
                      ? "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)"
                      : "none",
                    transition: "all 250ms var(--ease-premium)",
                  }}
                >
                  <div
                    className="text-[13.5px] font-semibold mb-1.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {p.label}
                  </div>
                  <div
                    className="text-[12px] font-mono-numbers tabular-nums"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    ${p.daily}
                    <span style={{ color: "var(--text-quaternary)" }}>
                      {" "}/ day
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fine-tune */}
        <div
          className="p-5 rounded-[18px]"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <div className="grid grid-cols-3 gap-5">
            <NumField
              label="Daily cap"
              value={config.dailyLimit}
              onChange={(v) =>
                setConfig((c) => ({ ...c, dailyLimit: v }))
              }
              hint="Resets at 00:00 UTC."
            />
            <NumField
              label="Weekly ceiling"
              value={config.weeklyLimit}
              onChange={(v) =>
                setConfig((c) => ({ ...c, weeklyLimit: v }))
              }
              hint="Rolls for 7 days."
            />
            <NumField
              label="Per-tx max"
              value={config.perTxMax}
              step={0.1}
              onChange={(v) =>
                setConfig((c) => ({ ...c, perTxMax: v }))
              }
              hint="Single payment."
            />
          </div>
        </div>

        {/* Worst-case sentence (kept — explains the safety guarantee) */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex gap-3 p-4 rounded-[14px]"
          style={{
            background: "var(--accent-bg)",
            border: "0.5px solid rgba(59, 130, 246, 0.15)",
          }}
        >
          <div
            className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <svg viewBox="0 0 20 20" fill="white" className="w-3 h-3">
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 100 16 8 8 0 000-16zm-1 5a1 1 0 112 0v3a1 1 0 11-2 0V7zm1 7a1 1 0 110-2 1 1 0 010 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p
            className="text-[13px] leading-[1.55]"
            style={{ color: "var(--text-secondary)" }}
          >
            Worst-case, this agent can spend{" "}
            <span
              className="font-mono-numbers tabular-nums font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              ${config.dailyLimit}
            </span>
            {" "}today and no more than{" "}
            <span
              className="font-mono-numbers tabular-nums font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              ${config.perTxMax}
            </span>
            {" "}on any single call. If a bug tries to burn{" "}
            <span
              className="font-mono-numbers tabular-nums font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              ${config.dailyLimit * 10}
            </span>
            {" "}in five minutes, Squads will simply refuse to co-sign.
          </p>
        </motion.div>
      </div>

      {/* RIGHT — live 24-hour simulation */}
      <LiveSimulation config={config} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Live simulation — "what does this cap actually mean?"

   We model an agent that runs at a realistic cadence (6 calls/hr by
   default, or the velocity cap if tighter) at average spend of
   perTx × 0.7 (agents typically don't max out every call). From
   those inputs we derive:
     · Max calls possible in 24h before hitting the daily cap
     · Estimated spend at the realistic cadence
     · Rough hour-mark when the cap would be hit
   ──────────────────────────────────────────────────────────────── */

function LiveSimulation({ config }: { config: VaultConfig }) {
  const sim = useMemo(() => {
    const avgSpendPerCall = config.perTxMax * 0.7; // agents rarely max out
    const callsAllowedInDay =
      avgSpendPerCall > 0
        ? Math.floor(config.dailyLimit / avgSpendPerCall)
        : 0;
    // Velocity cap (calls/window) competes with daily cap.
    const windowHours =
      config.velocityWindow === "1h"
        ? 1
        : config.velocityWindow === "1d"
          ? 24
          : 24 * 7;
    const callsPerHourFromVelocity =
      windowHours > 0 ? config.maxCallsPerWindow / windowHours : Infinity;
    // Realistic run rate: the tighter of (what budget allows across 24h)
    // and (what velocity window allows per hour × 24).
    const callsFromBudget = callsAllowedInDay;
    const callsFromVelocity = Math.floor(callsPerHourFromVelocity * 24);
    const realisticCalls = Math.max(
      0,
      Math.min(callsFromBudget, callsFromVelocity),
    );
    const estSpend = Math.min(
      config.dailyLimit,
      realisticCalls * avgSpendPerCall,
    );
    // When (in hours) does it hit the daily cap at max rate?
    const hoursToCap =
      callsPerHourFromVelocity > 0 && avgSpendPerCall > 0
        ? config.dailyLimit /
          (callsPerHourFromVelocity * avgSpendPerCall)
        : 24;
    const capHours = Math.max(0.1, Math.min(24, hoursToCap));

    return {
      realisticCalls,
      estSpend,
      capHours,
    };
  }, [config]);

  return (
    <aside className="sticky md:top-28 h-fit">
      <div
        className="rounded-[18px] overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.15)",
        }}
      >
        <div
          className="px-5 py-3 flex items-center gap-1.5"
          style={{
            borderBottom: "0.5px solid var(--border-subtle)",
            background: "var(--agent-bg)",
          }}
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--agent)" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--agent)" }}
          >
            Simulated next 24h
          </span>
        </div>

        <div className="p-5 space-y-4">
          <SimRow
            icon={Zap}
            label="Calls possible"
            value={
              <NumberScramble value={sim.realisticCalls} format={fmtInt} />
            }
            caption="at ~70% of per-tx cap"
          />
          <SimRow
            icon={Wallet}
            label="Expected spend"
            value={<NumberScramble value={sim.estSpend} format={fmtUsd} />}
            caption={`of ${fmtUsd(config.dailyLimit)} daily`}
          />
          <SimRow
            icon={Clock}
            label="Time-to-cap at full throttle"
            value={
              <span>
                ~<NumberScramble value={Math.round(sim.capHours)} format={fmtInt} />
                <span style={{ color: "var(--text-quaternary)" }}>h</span>
              </span>
            }
            caption="then Squads refuses further payments"
          />
        </div>
      </div>
      <p
        className="mt-3 text-[11px] leading-[1.5]"
        style={{ color: "var(--text-quaternary)" }}
      >
        Numbers assume typical agent behavior. Real throughput depends on the
        merchants you allowlist.
      </p>
    </aside>
  );
}

function SimRow({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  caption: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
        style={{ background: "var(--surface-2)" }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-quaternary)" }}
        >
          {label}
        </p>
        <p
          className="text-[20px] font-semibold leading-tight tracking-tight"
          style={{
            color: "var(--text-primary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </p>
        <p
          className="text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {caption}
        </p>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  hint,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint: string;
  step?: number;
}) {
  return (
    <div>
      <label
        className="text-[11px] font-medium uppercase tracking-[0.08em] mb-2 block"
        style={{ color: "var(--text-quaternary)" }}
      >
        {label}
      </label>
      <div
        className="flex items-baseline gap-1.5 pb-1"
        style={{ borderBottom: "0.5px solid var(--border)" }}
      >
        <span
          className="text-[22px] font-semibold"
          style={{ color: "var(--text-tertiary)" }}
        >
          $
        </span>
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full bg-transparent text-[26px] font-semibold font-mono-numbers tabular-nums outline-none"
          style={{
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        />
      </div>
      <p
        className="mt-2 text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {hint}
      </p>
    </div>
  );
}
