"use client";

/**
 * BottomRail — the scoreboard beneath the worker stage.
 *
 * The judge's eye lands here last and reads the answer to "is the
 * chain actually doing anything?" in three numbers + one tx:
 *
 *   · spent today / daily cap          (the dollar gauge)
 *   · K calls today                    (chain saw activity)
 *   · N blocked today                  (the moat made visible)
 *   · last settled tx signature pill   (proof, one tap to Explorer)
 *
 * Compact. Mono. The rail is the line under the show, not the show.
 */

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
}

export function BottomRail({ summary, network }: Props) {
  const dailyLimit = summary?.dailyLimitUsd ?? 0;
  const dailySpent = summary?.dailySpentUsd ?? 0;
  const usedPct =
    dailyLimit > 0 ? Math.min(100, Math.round((dailySpent / dailyLimit) * 100)) : 0;
  const calls = summary?.callsToday ?? 0;
  const blocked = summary?.blockedToday ?? 0;
  const sig = summary?.lastSettledTxSignature ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-[12px] px-3.5 py-2.5"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        {/* Daily-cap gauge — the live dollar bar */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: 12,
                  color: "#0A0A0A",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ${dailySpent.toFixed(2)}
              </span>
              <span
                className="font-mono uppercase tracking-[0.14em]"
                style={{
                  fontSize: 9,
                  color: "rgba(15,23,42,0.45)",
                }}
              >
                / ${dailyLimit.toFixed(0)} daily
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(15,23,42,0.06)" }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${usedPct}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background:
                    usedPct >= 90
                      ? "#F59E0B"
                      : usedPct >= 60
                        ? "#22C55E"
                        : "#0A0A0A",
                }}
              />
            </div>
          </div>
        </div>

        {/* Calls today — the chain saw activity */}
        <Counter label="Calls" value={calls} tone="neutral" />

        {/* Blocked today — the moat number. Amber when > 0 to read
            as "the chain DID stop something today" — the brag. */}
        <Counter label="Blocked" value={blocked} tone={blocked > 0 ? "amber" : "neutral"} />

        {/* Latest settled tx pill */}
        {sig ? (
          <a
            href={`https://explorer.solana.com/tx/${sig}?cluster=${network}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono rounded-full px-2.5 py-1 hover:opacity-90 transition"
            style={{
              fontSize: 10,
              letterSpacing: "0.04em",
              color: "#15803D",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.20)",
            }}
          >
            <span style={{ color: "rgba(21,128,61,0.7)" }}>last tx</span>
            <span>
              {sig.slice(0, 5)}…{sig.slice(-4)}
            </span>
            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
          </a>
        ) : (
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{
              fontSize: 9.5,
              color: "rgba(15,23,42,0.35)",
            }}
          >
            no tx today
          </span>
        )}
      </div>
    </motion.div>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "amber";
}) {
  const fg =
    tone === "amber" ? "#B45309" : "rgba(15,23,42,0.85)";
  return (
    <div className="flex flex-col items-end">
      <span
        className="font-mono tabular-nums"
        style={{
          fontSize: 13,
          color: fg,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{
          fontSize: 9,
          color: "rgba(15,23,42,0.45)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
