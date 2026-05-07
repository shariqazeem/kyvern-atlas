"use client";

/**
 * BudgetCard — Phase 4 (Device Shell Redesign).
 *
 *   BUDGET
 *   $0.11 / $5 daily      ████████░░░░
 *   6 calls · 3 blocked
 *   last tx fb8G…MWVU ↗
 *
 * Replaces the legacy BottomRail. Same data (`policySummary`), card
 * chrome instead of a horizontal scoreboard. Three rows: cap+gauge,
 * calls/blocked, last settled tx pill.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface PolicySummary {
  dailyLimitUsd: number;
  dailySpentUsd: number;
  callsToday: number;
  blockedToday: number;
  lastSettledTxSignature: string | null;
}

interface Props {
  summary: PolicySummary | null;
  network: "devnet" | "mainnet";
  vaultEmpty?: boolean;
  onTopUp?: () => void;
  className?: string;
}

export function BudgetCard({
  summary,
  network,
  vaultEmpty,
  onTopUp,
  className,
}: Props) {
  const s = summary ?? {
    dailyLimitUsd: 0,
    dailySpentUsd: 0,
    callsToday: 0,
    blockedToday: 0,
    lastSettledTxSignature: null,
  };
  const dailyPct =
    s.dailyLimitUsd > 0
      ? Math.min(100, Math.max(0, (s.dailySpentUsd / s.dailyLimitUsd) * 100))
      : 0;

  return (
    <div
      className={`rounded-2xl bg-white px-5 py-4 ${className ?? ""}`}
      style={{
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.18em] mb-2.5"
        style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
      >
        Budget
      </div>

      {/* Row 1 — daily cap + progress bar */}
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 13, color: "#0A0A0A", fontWeight: 500 }}
        >
          ${s.dailySpentUsd.toFixed(2)}
          <span
            style={{ color: "rgba(15,23,42,0.45)", fontWeight: 400 }}
          >
            {" / "}${s.dailyLimitUsd.toFixed(0)} daily
          </span>
        </span>
        {vaultEmpty && onTopUp && (
          <button
            type="button"
            onClick={onTopUp}
            className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] rounded-full px-2.5 py-0.5 transition active:scale-[0.97]"
            style={{
              fontSize: 9,
              color: "#FFFFFF",
              background: "#0A0A0A",
              border: "1px solid rgba(0,0,0,0.8)",
            }}
          >
            Top up
            <ArrowUpRight className="w-2.5 h-2.5" strokeWidth={2} />
          </button>
        )}
      </div>
      <div
        className="rounded-full overflow-hidden"
        style={{
          height: 4,
          background: "rgba(15,23,42,0.06)",
        }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${dailyPct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background:
              dailyPct > 85
                ? "linear-gradient(90deg, #F59E0B, #EF4444)"
                : "linear-gradient(90deg, #15803D, #22C55E)",
          }}
        />
      </div>

      {/* Row 2 — calls + blocked */}
      <div
        className="flex items-baseline gap-3 mt-3 font-mono tabular-nums"
        style={{ fontSize: 11.5 }}
      >
        <span style={{ color: "#0A0A0A", fontWeight: 500 }}>
          {s.callsToday}{" "}
          <span style={{ color: "rgba(15,23,42,0.55)", fontWeight: 400 }}>
            calls
          </span>
        </span>
        <span aria-hidden style={{ color: "rgba(15,23,42,0.20)" }}>
          ·
        </span>
        <span
          style={{
            color: s.blockedToday > 0 ? "#B45309" : "#0A0A0A",
            fontWeight: 500,
          }}
        >
          {s.blockedToday}{" "}
          <span style={{ color: "rgba(15,23,42,0.55)", fontWeight: 400 }}>
            blocked
          </span>
        </span>
      </div>

      {/* Row 3 — last settled tx pill */}
      {s.lastSettledTxSignature ? (
        <Link
          href={`https://explorer.solana.com/tx/${s.lastSettledTxSignature}?cluster=${network}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 font-mono"
          style={{ fontSize: 11, color: "#15803D" }}
        >
          <span style={{ color: "rgba(15,23,42,0.45)", fontSize: 9.5 }}>
            last tx
          </span>
          <span
            className="rounded-md px-1.5 py-0.5 inline-flex items-center gap-0.5"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.20)",
              fontSize: 10.5,
            }}
          >
            {s.lastSettledTxSignature.slice(0, 4)}…
            {s.lastSettledTxSignature.slice(-4)}
            <ArrowUpRight className="w-2.5 h-2.5" strokeWidth={2.5} />
          </span>
        </Link>
      ) : (
        <div
          className="mt-3 font-mono"
          style={{ fontSize: 10.5, color: "rgba(15,23,42,0.40)" }}
        >
          no settled tx yet
        </div>
      )}
    </div>
  );
}
