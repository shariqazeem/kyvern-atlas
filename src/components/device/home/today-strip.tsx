"use client";

/**
 * TodayStrip — "today's hunt" stat row sitting between the balance
 * orbit and the inbox preview. Pulls everything from the live-status
 * payload — earned/spent come from device_log (recorded by tools that
 * move money), signals from the signals table for today, on-chain from
 * vault_payments for today.
 *
 * If every cell is zero (fresh device, just unboxed), the strip
 * collapses to a one-line warming-up message instead of pretending the
 * device is broken.
 */

import { Link2 } from "lucide-react";

interface TodayStripProps {
  earnedToday: number;
  spentToday: number;
  signalsToday: number;
  workersActive: number;
  /** Total workers (includes paused) — surfaced as N/M ratio. Optional
   *  for backwards-compat with old call sites. */
  workersTotal?: number;
  /** vault_payments today — the chain-touched count. Optional, default 0. */
  onChainToday?: number;
}

export function TodayStrip({
  earnedToday,
  spentToday,
  signalsToday,
  workersActive,
  workersTotal,
  onChainToday = 0,
}: TodayStripProps) {
  const allZero =
    earnedToday <= 0 &&
    spentToday <= 0 &&
    signalsToday <= 0 &&
    onChainToday <= 0;

  if (allZero && workersActive > 0) {
    return (
      <div
        className="w-full rounded-[14px] px-3 py-3 text-center"
        style={{
          background: "rgba(15,23,42,0.02)",
          border: "1px solid rgba(15,23,42,0.05)",
          color: "#6B7280",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        <span className="font-mono uppercase tracking-[0.12em] text-[9.5px] mr-1.5" style={{ color: "#9CA3AF" }}>
          Today
        </span>
        Workers warming up — on-chain activity starts when they find opportunities.
      </div>
    );
  }

  const stats: Array<{
    label: string;
    value: string;
    tone?: string;
    icon?: "chain";
  }> = [
    {
      label: "earned",
      value: `+$${earnedToday.toFixed(2)}`,
      tone: earnedToday > 0 ? "#15803D" : "#0A0A0A",
    },
    {
      label: "spent",
      value: `$${spentToday.toFixed(2)}`,
      tone: spentToday > 0 ? "#B45309" : "#0A0A0A",
    },
    {
      label: "signals",
      value: `${signalsToday}`,
    },
    {
      label: "workers",
      value:
        typeof workersTotal === "number"
          ? `${workersActive}/${workersTotal}`
          : `${workersActive}`,
    },
    {
      label: "on-chain",
      value: `${onChainToday}`,
      tone: onChainToday > 0 ? "#15803D" : "#9CA3AF",
      icon: onChainToday > 0 ? "chain" : undefined,
    },
  ];

  return (
    <div
      className="w-full grid grid-cols-3 sm:grid-cols-5 rounded-[14px] overflow-hidden"
      style={{
        background: "rgba(15,23,42,0.02)",
        border: "1px solid rgba(15,23,42,0.05)",
      }}
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="px-2 py-2.5 flex flex-col items-center text-center"
          style={
            i % 5 > 0 || (i % 3 > 0 && i < 3)
              ? { borderLeft: "1px solid rgba(15,23,42,0.05)" }
              : undefined
          }
        >
          <span
            className="font-mono text-[14px] flex items-center gap-1"
            style={{
              color: s.tone ?? "#0A0A0A",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 500,
            }}
          >
            {s.icon === "chain" && (
              <Link2 className="w-3 h-3" strokeWidth={2.4} />
            )}
            {s.value}
          </span>
          <span
            className="font-mono text-[9px] uppercase tracking-[0.14em] mt-0.5"
            style={{ color: "#9CA3AF" }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
