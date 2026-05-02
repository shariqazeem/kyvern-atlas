"use client";

/**
 * Phase 7 — Atlas economy panels.
 *
 * Two components rendered side-by-side at the top of /atlas (just below
 * the device plinth). Replaces the old AtlasMicroStats + 24h sparkline
 * pair with an earnings-first hero + a richer 5-stat economy strip.
 *
 *   AtlasEarningsHero  — "Atlas earned $X.XX in N days" + 14-day sparkline
 *   AtlasEconomyStats  — Tasks created · Tasks completed · Average payout
 *                        · Success rate · On-chain actions
 *
 * Both pull from /api/atlas/economy. Polling is owned by the parent
 * (atlas-client.tsx) — these are pure presentational components.
 */

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { NumberScramble } from "./number-scramble";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const ACCENT = "#86EFAC";

export interface AtlasEconomy {
  atlas: { agentId: string; vaultId: string };
  tasksPosted: number;
  tasksCompleted: number;
  tasksPaidOutByAtlas: number;
  totalEarnedUsd: number;
  totalSpentUsd: number;
  onChainActions: number;
  approvedActions: number;
  blockedActions: number;
  successRate: number; // 0..1
  dailyEarnings: { date: string; earned: number }[];
  lastEarning: {
    bountyUsd: number;
    paymentSignature: string | null;
    completedAt: number | null;
    postingAgentId: string;
  } | null;
  lastOnChain: {
    status: string;
    amountUsd: number;
    txSignature: string | null;
    merchant: string;
    createdAt: number;
  } | null;
}

/* ── Atlas earnings hero ─────────────────────────────────────────── */

interface EarningsHeroProps {
  economy: AtlasEconomy | null;
  /** ISO of Atlas's first ignition; passed in from /atlas state so we
   *  don't double-query atlas.db here. */
  firstIgnitionAt: string | null;
}

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  if (isNaN(t)) return 0;
  return Math.max(1, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)));
}

export function AtlasEarningsHero({
  economy,
  firstIgnitionAt,
}: EarningsHeroProps) {
  const earned =
    typeof economy?.totalEarnedUsd === "number" ? economy.totalEarnedUsd : 0;
  const days = daysSince(firstIgnitionAt);
  const series = economy?.dailyEarnings ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.2, ease: EASE }}
      className="relative rounded-[18px] overflow-hidden p-5 sm:p-6 mb-5"
      style={{
        background:
          "linear-gradient(180deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 70%, rgba(255,255,255,0) 100%)",
        border: "1px solid rgba(134,239,172,0.18)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 22px -10px rgba(34,197,94,0.18)",
      }}
    >
      {/* eyebrow */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ color: ACCENT, fontSize: 10, fontWeight: 600 }}
        >
          Atlas earned
        </span>
        <span
          className="font-mono uppercase tracking-[0.10em]"
          style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}
        >
          {days > 0 ? `${days} day${days === 1 ? "" : "s"} live · devnet` : "warming up"}
        </span>
      </div>

      {/* hero number + sparkline */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <NumberScramble
            value={earned}
            format={(n) => `$${n.toFixed(2)}`}
            duration={650}
            className="font-mono"
            style={{
              color: "rgba(255,255,255,0.98)",
              fontSize: "clamp(40px, 6.2vw, 72px)",
              lineHeight: 1.0,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 300,
              letterSpacing: "-0.02em",
            }}
          />
          <p
            className="mt-2 max-w-[420px]"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            Real worker-to-worker payments, settled on Solana devnet under the
            Kyvern policy program.{" "}
            {economy?.lastEarning?.paymentSignature && (
              <a
                href={`https://explorer.solana.com/tx/${economy.lastEarning.paymentSignature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1"
                style={{ color: ACCENT }}
              >
                Last $
                {(economy.lastEarning.bountyUsd ?? 0).toFixed(3)} on Explorer
                <ExternalLink className="w-3 h-3" strokeWidth={2.2} />
              </a>
            )}
          </p>
        </div>
        <DailyEarningsSparkline series={series} />
      </div>
    </motion.div>
  );
}

/* ── Daily earnings sparkline (14d, $ per day) ────────────────────── */

function DailyEarningsSparkline({
  series,
}: {
  series: { date: string; earned: number }[];
}) {
  const width = 220;
  const height = 60;
  if (!series || series.length === 0) {
    return (
      <div
        className="font-mono"
        style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}
      >
        no earnings yet
      </div>
    );
  }

  // Bars (small bars per day) — clearer than a line for 14 buckets.
  const max = Math.max(...series.map((d) => d.earned), 0.001);
  const barW = (width - (series.length - 1) * 2) / series.length;
  return (
    <svg width={width} height={height} className="block flex-shrink-0">
      <defs>
        <linearGradient id="atlas-day-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.7} />
          <stop offset="100%" stopColor={ACCENT} stopOpacity={0.18} />
        </linearGradient>
      </defs>
      {series.map((d, i) => {
        const h = Math.max(2, (d.earned / max) * (height - 4));
        return (
          <rect
            key={d.date}
            x={i * (barW + 2)}
            y={height - h}
            width={barW}
            height={h}
            rx={1}
            fill="url(#atlas-day-grad)"
          />
        );
      })}
      {/* baseline */}
      <line
        x1={0}
        y1={height - 0.5}
        x2={width}
        y2={height - 0.5}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />
    </svg>
  );
}

/* ── Economy stats strip ──────────────────────────────────────────── */

interface EconomyStatsProps {
  economy: AtlasEconomy | null;
}

export function AtlasEconomyStats({ economy }: EconomyStatsProps) {
  const tasksPosted = economy?.tasksPosted ?? 0;
  const tasksCompleted = economy?.tasksCompleted ?? 0;
  const tasksPaid = economy?.tasksPaidOutByAtlas ?? 0;
  const onChain = economy?.onChainActions ?? 0;
  const success = economy?.successRate ?? 0;
  const avgPayout =
    tasksCompleted > 0 ? (economy?.totalEarnedUsd ?? 0) / tasksCompleted : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.28, ease: EASE }}
      className="grid grid-cols-2 sm:grid-cols-5 gap-x-2 gap-y-3 mb-12 pb-6"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <Stat label="Tasks created" value={tasksPosted.toLocaleString()} />
      <Stat
        label="Tasks completed"
        value={tasksCompleted.toLocaleString()}
        accent
      />
      <Stat
        label="Avg payout"
        value={tasksCompleted > 0 ? `$${avgPayout.toFixed(3)}` : "—"}
      />
      <Stat
        label="Success rate"
        value={onChain > 0 ? `${(success * 100).toFixed(1)}%` : "—"}
        helper={
          onChain > 0
            ? `${economy?.approvedActions} approved · ${economy?.blockedActions} blocked`
            : undefined
        }
      />
      <Stat
        label="On-chain actions"
        value={onChain.toLocaleString()}
        helper={tasksPaid > 0 ? `${tasksPaid} payouts` : undefined}
      />
    </motion.div>
  );
}

function Stat({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: string;
  helper?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span
        className="font-mono"
        style={{
          color: accent ? ACCENT : "rgba(255,255,255,0.92)",
          fontSize: 22,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 400,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase mt-1"
        style={{
          color: "rgba(255,255,255,0.42)",
          fontSize: 10,
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </span>
      {helper && (
        <span
          className="font-mono mt-0.5"
          style={{ color: "rgba(255,255,255,0.32)", fontSize: 10 }}
        >
          {helper}
        </span>
      )}
    </div>
  );
}
