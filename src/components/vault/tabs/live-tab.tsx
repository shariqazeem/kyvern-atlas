"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * <LiveTab/> — the "what's happening right now" dashboard surface.
 *
 * The default landing tab on /vault/[id]. Designed to answer, in one
 * glance: is my agent running? What did it just do? Am I near any cap?
 *
 * Layout:
 *   ┌──────────────────────────┬──────────────────────┐
 *   │  Recent payments (top 6) │  Right-now snapshot  │
 *   │  server-log-tight feed   │  · spent today       │
 *   │                          │  · calls in window   │
 *   │                          │  · headroom chip     │
 *   └──────────────────────────┴──────────────────────┘
 *
 * Deeper payloads (full feed, cap timelines, policy tuning) live in
 * their own tabs. This surface is the "control tower radar" — just
 * the first 3 seconds of attention.
 * ════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  OctagonAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { EASE_PREMIUM as EASE } from "@/lib/motion";
import { fmtAgo, fmtUsd, fmtInt } from "@/lib/format";
import { NumberScramble } from "@/components/atlas/number-scramble";
import type {
  Vault,
  Payment,
  BudgetSnapshot,
  VelocitySnapshot,
} from "../types";

export interface LiveTabProps {
  vault: Vault;
  payments: Payment[];
  budget: BudgetSnapshot;
  velocity: VelocitySnapshot;
}

export function LiveTab({
  vault,
  payments,
  budget,
  velocity,
}: LiveTabProps) {
  const recent = payments.slice(0, 6);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,320px)] gap-4">
      {/* ── Left · Recent activity (compressed) ── */}
      <section
        className="rounded-[18px] overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--agent)" }}
            >
              What just happened
            </span>
          </div>
          <Link
            href="?tab=activity"
            scroll={false}
            className="text-[11px] font-semibold inline-flex items-center gap-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            full history
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState vault={vault} />
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {recent.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.035, ease: EASE }}
                className="grid items-center gap-3 px-5 py-2.5 font-mono-numbers text-[11.5px]"
                style={{
                  gridTemplateColumns: "72px 1fr auto",
                }}
              >
                <span style={{ color: "var(--text-quaternary)" }}>
                  {fmtAgo(p.createdAt)}
                </span>
                <span className="truncate" style={{ color: "var(--text-primary)" }}>
                  <OutcomeDot status={p.status} />
                  <span className="ml-1.5">{p.merchant}</span>
                  {p.reason && (
                    <span className="ml-1.5" style={{ color: "var(--attack)" }}>
                      · {p.reason}
                    </span>
                  )}
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    color:
                      p.status === "blocked"
                        ? "var(--text-tertiary)"
                        : "var(--text-primary)",
                    textDecoration:
                      p.status === "blocked" ? "line-through" : "none",
                    fontWeight: 600,
                  }}
                >
                  {fmtUsd(p.amountUsd)}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Right · Snapshot column ── */}
      <aside className="flex flex-col gap-4">
        <SnapshotCard
          label="Spent today"
          value={budget.spentToday}
          limit={budget.dailyLimitUsd}
          utilization={budget.dailyUtilization}
          format="usd"
          tone="revenue"
        />
        <SnapshotCard
          label={`Calls in ${velocity.velocityWindow === "1h" ? "last hour" : velocity.velocityWindow === "1d" ? "last 24h" : "last 7d"}`}
          value={velocity.callsInWindow}
          limit={velocity.maxCallsPerWindow}
          utilization={
            velocity.maxCallsPerWindow > 0
              ? velocity.callsInWindow / velocity.maxCallsPerWindow
              : 0
          }
          format="int"
          tone="agent"
        />
        <PolicyHealthChip vault={vault} />
      </aside>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Sub-components
   ──────────────────────────────────────────────────────────────── */

function OutcomeDot({ status }: { status: Payment["status"] }) {
  const color =
    status === "settled" || status === "allowed"
      ? "var(--success)"
      : status === "blocked"
        ? "var(--attack)"
        : status === "failed"
          ? "var(--warning)"
          : "var(--text-quaternary)";
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full align-middle shrink-0"
      style={{ background: color }}
    />
  );
}

function SnapshotCard({
  label,
  value,
  limit,
  utilization,
  format,
  tone,
}: {
  label: string;
  value: number;
  limit: number;
  utilization: number;
  format: "usd" | "int";
  tone: "agent" | "revenue";
}) {
  const pct = Math.min(1, Math.max(0, utilization));
  const near = pct >= 0.8;
  const accent = tone === "agent" ? "var(--agent)" : "var(--revenue)";
  const barColor = near ? "var(--attack)" : accent;
  const formatFn = format === "usd" ? fmtUsd : fmtInt;
  return (
    <div
      className="p-5 rounded-[16px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-quaternary)" }}
        >
          {label}
        </p>
        <p
          className="text-[11px] font-mono-numbers tabular-nums"
          style={{
            color: near ? "var(--attack)" : "var(--text-tertiary)",
            fontWeight: near ? 700 : 500,
          }}
        >
          {Math.round(pct * 100)}%
        </p>
      </div>
      <p
        className="text-[28px] font-semibold tracking-tight leading-none"
        style={{
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <NumberScramble value={value} format={formatFn} />
        <span
          className="text-[14px] ml-1.5"
          style={{ color: "var(--text-quaternary)", fontWeight: 400 }}
        >
          / {formatFn(limit)}
        </span>
      </p>
      <div
        className="mt-3 h-1 rounded-full overflow-hidden"
        style={{ background: "var(--surface-2)" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{ background: barColor }}
        />
      </div>
    </div>
  );
}

function PolicyHealthChip({ vault }: { vault: Vault }) {
  const paused = !!vault.pausedAt;
  const Icon = paused ? OctagonAlert : ShieldCheck;
  const accent = paused ? "var(--attack)" : "var(--success-deep)";
  const bg = paused ? "var(--attack-bg)" : "var(--success-bg)";
  const label = paused ? "Kill switch active" : "Policy healthy";
  const caption = paused
    ? "All payments refused until you resume."
    : "Allowlist + caps are being enforced at consensus.";
  return (
    <div
      className="p-4 rounded-[14px]"
      style={{
        background: bg,
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <span
          className="text-[11.5px] font-semibold"
          style={{ color: accent }}
        >
          {label}
        </span>
      </div>
      <p
        className="text-[12px] leading-[1.5]"
        style={{ color: "var(--text-secondary)" }}
      >
        {caption}
      </p>
    </div>
  );
}

function EmptyState({ vault }: { vault: Vault }) {
  return (
    <div className="px-6 py-12 text-center">
      <div
        className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: "var(--agent-bg)" }}
      >
        <Zap className="h-5 w-5" style={{ color: "var(--agent)" }} />
      </div>
      <p
        className="text-[16px] font-semibold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Fire your first payment.
      </p>
      <p
        className="mx-auto mt-1.5 max-w-[320px] text-[12.5px] leading-[1.5]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Every test is a real Solana tx you can verify on Explorer — the
        policy enforces before a single token moves.
      </p>
      <Link
        href="?tab=integrate"
        scroll={false}
        className="mt-5 inline-flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-[12.5px] font-semibold transition-colors"
        style={{
          background: "var(--text-primary)",
          color: "var(--background)",
        }}
      >
        Open Playground
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <p
        className="mt-4 text-[11.5px]"
        style={{ color: "var(--text-quaternary)" }}
      >
        Or wire{" "}
        <code
          className="code-inline"
          title={vault.id}
        >
          @kyvernlabs/sdk
        </code>
        {" "}into your own agent.
      </p>
    </div>
  );
}
