"use client";

/**
 * Atlas Findings — dark-variant signal feed for /atlas.
 *
 * Sits above the Attack Wall. Reads from /api/atlas/findings (last 7
 * days, scoped to agent_id=agt_atlas). Read-only — no mark-read; this
 * is a public observatory, not an inbox. Polls every 8 seconds.
 *
 * Visual register: matches the dark hardware surface of the rest of
 * /atlas. Each card is a thinner, simpler variant of the user-facing
 * SignalCard — same shape, different colour weights.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Megaphone,
  Wallet,
  TrendingUp,
  GitBranch,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { Signal, SignalKind } from "@/lib/agents/types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const KIND_ICON: Record<SignalKind, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  bounty: Award,
  ecosystem_announcement: Megaphone,
  wallet_move: Wallet,
  price_trigger: TrendingUp,
  github_release: GitBranch,
  observation: Sparkles,
};

const KIND_LABEL: Record<SignalKind, string> = {
  bounty: "BOUNTY",
  ecosystem_announcement: "ANNOUNCEMENT",
  wallet_move: "WALLET MOVE",
  price_trigger: "PRICE TRIGGER",
  github_release: "RELEASE",
  observation: "OBSERVATION",
};

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface AtlasFindingsProps {
  initialFindings: Signal[];
  initialThisWeek: number;
}

export function AtlasFindings({ initialFindings, initialThisWeek }: AtlasFindingsProps) {
  const [findings, setFindings] = useState<Signal[]>(initialFindings);
  const [thisWeek, setThisWeek] = useState<number>(initialThisWeek);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/atlas/findings?limit=30")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d || !Array.isArray(d.findings)) return;
          setFindings(d.findings as Signal[]);
          setThisWeek(typeof d.thisWeek === "number" ? d.thisWeek : d.findings.length);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 8_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="rounded-[16px] overflow-hidden mb-10"
      style={{
        background: "rgba(8,11,20,0.55)",
        border: "1px solid rgba(134,239,172,0.18)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#86EFAC",
              boxShadow: "0 0 0 3px rgba(134,239,172,0.18)",
            }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="font-mono uppercase"
            style={{
              color: "rgba(134,239,172,0.85)",
              fontSize: "11px",
              letterSpacing: "0.14em",
            }}
          >
            Atlas Findings
          </span>
        </div>
        <span
          className="font-mono"
          style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}
        >
          {thisWeek} surfaced this week
        </span>
      </div>

      {/* Rows */}
      <div
        className="overflow-y-auto"
        style={{
          maxHeight: 420,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.12) transparent",
        }}
      >
        {findings.length === 0 ? (
          <div
            className="px-5 py-8 font-mono text-center"
            style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}
          >
            Atlas hasn&apos;t surfaced any findings in the last 7 days.
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {findings.map((s, idx) => {
              const Icon = KIND_ICON[s.kind] ?? Sparkles;
              const label = KIND_LABEL[s.kind] ?? "SIGNAL";
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(idx, 5) * 0.04,
                    ease: EASE,
                  }}
                  className="px-5 py-3 border-b last:border-b-0"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3 h-3" style={{ color: "#86EFAC" }} />
                    <span
                      className="font-mono uppercase"
                      style={{
                        color: "rgba(134,239,172,0.7)",
                        fontSize: "9.5px",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {label}
                    </span>
                    <span
                      className="font-mono"
                      style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px" }}
                    >
                      · {fmtAgo(s.createdAt)}
                    </span>
                  </div>
                  <div
                    className="text-[14px] font-medium leading-tight mb-1"
                    style={{ color: "rgba(255,255,255,0.95)" }}
                  >
                    {s.subject}
                  </div>
                  {s.evidence.length > 0 && (
                    <ul className="space-y-0.5 mb-1.5">
                      {s.evidence.slice(0, 3).map((e, i) => (
                        <li
                          key={i}
                          className="font-mono"
                          style={{
                            color: "rgba(255,255,255,0.55)",
                            fontSize: "11px",
                            lineHeight: 1.45,
                            paddingLeft: 10,
                            position: "relative",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              left: 0,
                              color: "rgba(255,255,255,0.3)",
                            }}
                          >
                            ·
                          </span>
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.sourceUrl && (
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono"
                      style={{
                        color: "rgba(134,239,172,0.85)",
                        fontSize: "10.5px",
                      }}
                    >
                      Open source <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.section>
  );
}
