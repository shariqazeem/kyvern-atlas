"use client";

/* ════════════════════════════════════════════════════════════════════
   Step 2 — Budgets
   Three numeric fields with live "what this means" preview.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import type { VaultConfig } from "../types";

const ease = [0.25, 0.1, 0.25, 1] as const;

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

      {/* Live copy explaining what this means */}
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
