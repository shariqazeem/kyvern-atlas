"use client";

/**
 * WorkingForYouStrip — Phase 4.
 *
 *   WORKING FOR YOU THIS WEEK
 *   2 drafts · 14 alerts · 1 trigger · $0.18 AI · $5 cap
 *
 * One compact strip below the canvas + ticker that summarises what
 * the device delivered to the human owner over the past 7 days. Every
 * counter ticks up only when a real signal lands or a Pay.sh-shaped
 * spend settles.
 *
 * Hides itself when every counter is zero AND no daily cap is set
 * (fresh-device empty state — the canvas already says "standing by").
 */

import { motion } from "framer-motion";

interface WeeklyBenefit {
  drafts: number;
  alerts: number;
  triggersFired: number;
  aiSpendUsd: number;
  dailyCapUsd: number;
}

interface Props {
  benefit: WeeklyBenefit | null;
}

export function WorkingForYouStrip({ benefit }: Props) {
  const b = benefit ?? {
    drafts: 0,
    alerts: 0,
    triggersFired: 0,
    aiSpendUsd: 0,
    dailyCapUsd: 0,
  };
  const empty =
    b.drafts === 0 &&
    b.alerts === 0 &&
    b.triggersFired === 0 &&
    b.aiSpendUsd === 0 &&
    b.dailyCapUsd === 0;
  if (empty) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[14px] px-4 py-3"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.18em] mb-1.5"
        style={{ fontSize: 9, color: "rgba(15,23,42,0.45)" }}
      >
        Working for you this week
      </div>
      <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
        <Stat n={b.drafts} unit="draft" plural="drafts" />
        <Dot />
        <Stat n={b.alerts} unit="alert" plural="alerts" />
        <Dot />
        <Stat n={b.triggersFired} unit="trigger" plural="triggers" />
        <Dot />
        <UsdStat label="AI" n={b.aiSpendUsd} />
        {b.dailyCapUsd > 0 && (
          <>
            <Dot />
            <UsdStat label="cap" n={b.dailyCapUsd} integer />
          </>
        )}
      </div>
    </motion.div>
  );
}

function Stat({
  n,
  unit,
  plural,
}: {
  n: number;
  unit: string;
  plural: string;
}) {
  return (
    <span
      className="font-mono tabular-nums"
      style={{ fontSize: 12, color: "#0A0A0A", fontWeight: 500 }}
    >
      <span style={{ color: "#0A0A0A" }}>{n}</span>{" "}
      <span style={{ color: "rgba(15,23,42,0.55)", fontWeight: 400 }}>
        {n === 1 ? unit : plural}
      </span>
    </span>
  );
}

function UsdStat({
  label,
  n,
  integer,
}: {
  label: string;
  n: number;
  integer?: boolean;
}) {
  const formatted = integer ? `$${Math.round(n)}` : `$${n.toFixed(2)}`;
  return (
    <span
      className="font-mono tabular-nums"
      style={{ fontSize: 12, color: "#0A0A0A", fontWeight: 500 }}
    >
      <span style={{ color: "#0A0A0A" }}>{formatted}</span>{" "}
      <span style={{ color: "rgba(15,23,42,0.55)", fontWeight: 400 }}>
        {label}
      </span>
    </span>
  );
}

function Dot() {
  return (
    <span
      aria-hidden
      className="font-mono"
      style={{ color: "rgba(15,23,42,0.20)", fontSize: 11 }}
    >
      ·
    </span>
  );
}
