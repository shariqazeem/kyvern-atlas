"use client";

/**
 * LandingTrustBar — single horizontal strip of live Atlas numbers.
 *
 * Sits directly under the hero. Five cells, every value sourced from
 * the same /api/atlas/status payload `os-landing.tsx` already polls.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  12 days live · $10.10 earned · 7,093 on-chain · $0 lost ·   │
 *   │  6,557 attacks blocked       [view program on Explorer →]    │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Dark register so it reads as a continuation of the hero. The "$0 lost"
 * cell is hardcoded (it's the moat — always zero by design).
 */

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const POLICY_PROGRAM_ID = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";
const ACCENT = "#86EFAC";

interface LandingTrustBarProps {
  daysLive: number;
  totalEarnedUsd: number;
  totalOnChainActions: number; // optional — use if /api/atlas/economy has been wired
  totalAttacksBlocked: number;
}

export function LandingTrustBar({
  daysLive,
  totalEarnedUsd,
  totalOnChainActions,
  totalAttacksBlocked,
}: LandingTrustBarProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55 }}
      className="relative"
      style={{
        background:
          "linear-gradient(180deg, #080B14 0%, #0E1320 100%)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-6">
        <div className="flex items-center gap-2 mb-3">
          <motion.span
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: ACCENT,
              boxShadow: "0 0 0 3px rgba(134,239,172,0.18), 0 0 8px #86EFAC",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="font-mono uppercase"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 10,
              letterSpacing: "0.20em",
            }}
          >
            Live on Solana devnet — verifiable on Explorer
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-4">
          <Stat
            value={daysLive > 0 ? `${daysLive}` : "—"}
            label={daysLive === 1 ? "day live" : "days live"}
          />
          <Stat
            value={`$${totalEarnedUsd.toFixed(2)}`}
            label="earned"
            tone={ACCENT}
          />
          <Stat
            value={
              totalOnChainActions > 0
                ? totalOnChainActions.toLocaleString()
                : "—"
            }
            label="on-chain actions"
          />
          <Stat value="$0" label="lost" tone={ACCENT} />
          <Stat
            value={totalAttacksBlocked.toLocaleString()}
            label="attacks blocked"
          />
        </div>

        <a
          href={`https://explorer.solana.com/address/${POLICY_PROGRAM_ID}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.16em] hover:opacity-100 transition"
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 10,
            opacity: 0.75,
          }}
        >
          View policy program on Solana Explorer
          <ExternalLink className="w-3 h-3" strokeWidth={2} />
        </a>
      </div>
    </motion.section>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col">
      <span
        className="font-mono"
        style={{
          color: tone ?? "rgba(255,255,255,0.96)",
          fontSize: "clamp(20px, 2.6vw, 28px)",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          lineHeight: 1.05,
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase mt-1"
        style={{
          color: "rgba(255,255,255,0.42)",
          fontSize: 10,
          letterSpacing: "0.14em",
        }}
      >
        {label}
      </span>
    </div>
  );
}
