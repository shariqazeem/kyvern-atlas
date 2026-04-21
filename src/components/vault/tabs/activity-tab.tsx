"use client";

/**
 * <ActivityTab/> — full payments history surface.
 *
 * Thin wrapper: tab owns the chrome (header with filter chips), body
 * delegates to the shared <ActivityFeed/> in bare mode. Later we'll
 * wire filter chips into the ActivityFeed; for now the feed shows
 * everything and the header reads "All events".
 */

import { motion } from "framer-motion";
import { EASE_PREMIUM as EASE } from "@/lib/motion";
import { ActivityFeed } from "../activity-feed";
import type { Payment, Vault } from "../types";

export interface ActivityTabProps {
  vault: Vault;
  payments: Payment[];
}

export function ActivityTab({ vault, payments }: ActivityTabProps) {
  const counts = {
    all: payments.length,
    settled: payments.filter((p) => p.status === "settled" || p.status === "allowed").length,
    blocked: payments.filter((p) => p.status === "blocked").length,
    failed: payments.filter((p) => p.status === "failed").length,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-[22px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.03)",
      }}
    >
      {/* Header strip with counts */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
      >
        <div>
          <h3
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            All activity
          </h3>
          <p
            className="text-[11.5px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Every attempt your agent made — allowed, blocked, or failed.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <CountChip label="total" value={counts.all} tone="plain" />
          <CountChip label="settled" value={counts.settled} tone="success" />
          <CountChip label="blocked" value={counts.blocked} tone="attack" />
          {counts.failed > 0 && (
            <CountChip label="failed" value={counts.failed} tone="warning" />
          )}
        </div>
      </div>
      <ActivityFeed payments={payments} vault={vault} variant="bare" />
    </motion.div>
  );
}

function CountChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "plain" | "success" | "attack" | "warning";
}) {
  const colors = {
    plain: {
      bg: "var(--surface-2)",
      fg: "var(--text-secondary)",
    },
    success: {
      bg: "var(--success-bg)",
      fg: "var(--success-deep)",
    },
    attack: {
      bg: "var(--attack-bg)",
      fg: "var(--attack)",
    },
    warning: {
      bg: "var(--warning-bg)",
      fg: "var(--warning)",
    },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 h-5 rounded-full font-mono-numbers tabular-nums"
      style={{ background: colors.bg, color: colors.fg }}
    >
      <strong style={{ fontWeight: 700 }}>{value}</strong>
      <span style={{ opacity: 0.75 }}>{label}</span>
    </span>
  );
}
