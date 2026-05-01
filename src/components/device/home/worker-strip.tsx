"use client";

/**
 * WorkerStrip — compact horizontal chip row of every worker on the
 * device with their last action verb + total earnings.
 *
 * Demoted from the old WorkersFoundStrip (which was a scrollable
 * mini-card row) because Phase 5 makes the EarningsHero + ActionFeed
 * the headline. Workers still need a quick-glance visualisation but
 * a smaller chip row suffices.
 *
 *   ┌─ Workers ──────────────────────────────────────────────────┐
 *   │  🎯 Sentinel · posted task · +$0.02                        │
 *   │  🐋 Wren     · completed   · +$0.15                        │
 *   │  📈 Pulse    · staked      · +$0.04                        │
 *   └────────────────────────────────────────────────────────────┘
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface WorkerStripWorker {
  id: string;
  name: string;
  emoji: string;
  template: string;
  isThinking: boolean;
  lastThoughtAt: number | null;
  totalEarnedUsd: number;
}

interface WorkerStripProps {
  workers: WorkerStripWorker[];
  /** Verb to show next to each worker — keyed by template. The page
   *  derives this from the action feed (last tool used by that worker)
   *  and falls back to template-default verbs when nothing recent. */
  lastVerbByAgent?: Record<string, string>;
}

const TEMPLATE_DEFAULT_VERB: Record<string, string> = {
  bounty_hunter: "watching bounties",
  whale_tracker: "watching wallets",
  token_pulse: "watching prices",
  ecosystem_watcher: "watching feeds",
  github_watcher: "watching releases",
  atlas: "doing research",
};

export function WorkerStrip({ workers, lastVerbByAgent }: WorkerStripProps) {
  if (workers.length === 0) {
    return (
      <Link
        href="/app/agents/spawn"
        className="block w-full rounded-[14px] px-4 py-3 active:scale-[0.99] transition"
        style={{
          background: "rgba(15,23,42,0.02)",
          border: "1px dashed rgba(15,23,42,0.10)",
          color: "#6B7280",
          fontSize: 12.5,
        }}
      >
        Hire your first worker →
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="w-full rounded-[14px] overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <div
        className="px-4 pt-2.5 pb-1.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.04)" }}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles
            className="w-3 h-3"
            strokeWidth={2.2}
            style={{ color: "#9CA3AF" }}
          />
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ color: "#9CA3AF", fontSize: 9.5 }}
          >
            Workers
          </span>
        </div>
        <span
          className="font-mono"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          {workers.filter((w) => w.isThinking).length}/{workers.length} thinking
        </span>
      </div>
      <ul
        className="divide-y"
        style={{ borderColor: "rgba(15,23,42,0.04)" }}
      >
        {workers.map((w) => {
          const verb =
            lastVerbByAgent?.[w.id] ??
            TEMPLATE_DEFAULT_VERB[w.template] ??
            "active";
          return (
            <li key={w.id}>
              <Link
                href={`/app/agents/${w.id}`}
                className="flex items-center gap-2 px-4 py-2 hover:bg-[rgba(15,23,42,0.02)] transition"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] flex-none relative"
                  style={{
                    background:
                      "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
                    border: "1px solid rgba(15,23,42,0.06)",
                    boxShadow: w.isThinking
                      ? "0 0 0 1.5px rgba(34,197,94,0.32), inset 0 1px 1px rgba(15,23,42,0.04)"
                      : "inset 0 1px 1px rgba(15,23,42,0.04)",
                  }}
                >
                  {w.emoji}
                </span>
                <span
                  className="text-[12.5px] font-medium"
                  style={{ color: "#0A0A0A" }}
                >
                  {w.name}
                </span>
                <span
                  className="text-[11.5px] truncate min-w-0"
                  style={{ color: "#6B7280" }}
                >
                  · {verb}
                </span>
                <span className="ml-auto" />
                <span
                  className="font-mono"
                  style={{
                    color:
                      w.totalEarnedUsd > 0 ? "#15803D" : "#9CA3AF",
                    fontSize: 11,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 500,
                  }}
                >
                  +${w.totalEarnedUsd.toFixed(3)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
