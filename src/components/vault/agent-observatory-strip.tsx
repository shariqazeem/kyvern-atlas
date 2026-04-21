"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * AgentObservatoryStrip — the user's mini-Atlas, on their own vault.
 *
 * Visually mirrors the public Atlas observatory on the landing page:
 * live browser chrome, ticking uptime, "Last decision" card with the
 * agent's most recent on-chain action, defense-side counters.
 *
 * The difference from the public Atlas: this isn't autonomous. It
 * shows the result of whatever the user just did (test payments via
 * the playground, real payments via their integrated SDK). But it
 * READS as alive — uptime ticks since deployment, the "What it just
 * did" card updates the moment a payment lands, the chrome bar makes
 * the whole dashboard feel like an operations console.
 *
 * Why this matters:
 *   When a user clones Atlas and lands on their dashboard, they need
 *   to feel "I just joined the network — my agent is now part of
 *   what I just watched." A static SaaS dashboard kills that feeling.
 *   This observatory strip preserves it.
 * ════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Shield } from "lucide-react";

const EASE = [0.25, 0.1, 0.25, 1] as const;

export interface AgentObservatoryStripProps {
  agentName: string;
  emoji: string;
  network: "devnet" | "mainnet";
  createdAt: string;
  spentToday: number;
  dailyLimit: number;
  callsInWindow: number;
  maxCallsPerWindow: number;
  lastPayment: {
    merchant: string;
    amountUsd: number;
    status: "allowed" | "blocked" | "settled" | "failed";
    createdAt: string;
    txSignature?: string | null;
    reason?: string | null;
    memo?: string | null;
  } | null;
}

function fmtUptime(ms: number): string {
  if (ms <= 0) return "00d 00h 00m 00s";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(d).padStart(2, "0")}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function fmtAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * Translate a payment outcome into a first-person sentence the agent
 * "would say." Mirrors the Atlas observatory's reasoning voice so the
 * two surfaces feel like the same product.
 */
function reasoningFor(p: AgentObservatoryStripProps["lastPayment"]): string {
  if (!p) {
    return "Standing by — make a payment via the playground or the SDK and your agent's first decision will land here.";
  }
  if (p.status === "settled" || p.status === "allowed") {
    return `Paid ${p.merchant} — Kyvern verified the policy, Squads v4 signed, Solana settled.`;
  }
  if (p.status === "blocked") {
    return `Tried to pay ${p.merchant}, refused by Kyvern: ${p.reason ?? "policy violation"}. Nothing moved.`;
  }
  return `Attempted ${p.merchant}, did not land on-chain.`;
}

export function AgentObservatoryStrip(props: AgentObservatoryStripProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const uptimeMs = Date.now() - new Date(props.createdAt).getTime();
  const utilization =
    props.dailyLimit > 0
      ? Math.min(100, (props.spentToday / props.dailyLimit) * 100)
      : 0;
  const velocity =
    props.maxCallsPerWindow > 0
      ? Math.min(100, (props.callsInWindow / props.maxCallsPerWindow) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mt-6 rounded-[18px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 16px 48px -28px rgba(0,0,0,0.10)",
      }}
    >
      {/* Browser-chrome bar — same language as Atlas */}
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "#F87171" }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "#FBBF24" }}
          />
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "#4ADE80" }}
          />
        </div>
        <div
          className="text-[11px] font-mono-numbers tracking-tight truncate px-2"
          style={{ color: "var(--text-quaternary)" }}
        >
          your-agent · {props.network}
        </div>
        <div className="flex items-center gap-1.5">
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#22C55E" }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "#15803D" }}
          >
            live
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pt-5 pb-5">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="text-[28px] shrink-0 leading-none"
              aria-hidden
            >
              {props.emoji}
            </div>
            <div className="min-w-0">
              <p
                className="text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "var(--text-quaternary)" }}
              >
                Your autonomous agent
              </p>
              <h3
                className="text-[18px] font-semibold tracking-[-0.015em] truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {props.agentName}
              </h3>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--text-quaternary)" }}
            >
              Uptime
            </p>
            <p
              className="text-[15px] font-mono-numbers tabular-nums tracking-tight"
              style={{ color: "var(--text-primary)", fontWeight: 500 }}
            >
              {fmtUptime(uptimeMs)}
            </p>
          </div>
        </div>

        {/* Last decision — first-person reasoning, same voice as Atlas */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="w-3 h-3" style={{ color: "#4F46E5" }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "#4F46E5" }}
            >
              Last decision
            </span>
            {props.lastPayment && (
              <span
                className="text-[10.5px]"
                style={{ color: "var(--text-quaternary)" }}
              >
                · {fmtAgo(props.lastPayment.createdAt)}
              </span>
            )}
          </div>
          <p
            className="text-[14px] leading-[1.55] text-balance"
            style={{
              color: "var(--text-primary)",
              fontStyle: props.lastPayment ? "italic" : "normal",
            }}
          >
            {props.lastPayment
              ? `“${reasoningFor(props.lastPayment)}”`
              : reasoningFor(null)}
          </p>
          {props.lastPayment?.txSignature && (
            <a
              href={`https://explorer.solana.com/tx/${props.lastPayment.txSignature}?cluster=${props.network}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-0.5 text-[11.5px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--text-secondary)" }}
            >
              verify on Solana Explorer
              <ArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Mini stats row — utilization bars beneath each */}
        <div
          className="grid grid-cols-2 gap-4 pt-4"
          style={{ borderTop: "0.5px solid var(--border-subtle)" }}
        >
          <MiniBar
            label="Spent today"
            value={`$${props.spentToday.toFixed(2)}`}
            limit={`/ $${props.dailyLimit.toFixed(0)}`}
            pct={utilization}
            color="#4F46E5"
          />
          <MiniBar
            label="Calls this hour"
            value={String(props.callsInWindow)}
            limit={`/ ${props.maxCallsPerWindow}`}
            pct={velocity}
            color="#0EA5E9"
          />
        </div>
      </div>
    </motion.div>
  );
}

function MiniBar({
  label,
  value,
  limit,
  pct,
  color,
}: {
  label: string;
  value: string;
  limit: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-quaternary)" }}
        >
          {label}
        </span>
        <span
          className="text-[12.5px] font-mono-numbers tabular-nums"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          {value}
          <span style={{ color: "var(--text-quaternary)" }}>{" "}{limit}</span>
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </div>
    </div>
  );
}
