"use client";

/**
 * GraphTile — a single agent tile in the canvas.
 *
 * Compact card: emoji + name + trigger summary + status pill.
 * Hover: faint lift + ring. Click: opens the detail page.
 *
 * The status pill mirrors the wire's color (idle/running/succeeded/failed)
 * so the visual story is consistent — string + pill always agree.
 */

import { motion } from "framer-motion";
import type { GraphAgentSummary } from "@/lib/agents/graph/agent-store";

interface Props {
  agent: GraphAgentSummary;
  onClick: () => void;
}

export function GraphTile({ agent, onClick }: Props) {
  const triggerLabel = formatTrigger(agent.trigger);
  const status = pillStatus(agent);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="rounded-[12px] flex flex-col items-stretch justify-center gap-1 px-3 py-2 transition"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.10)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 8px 16px -10px rgba(15,23,42,0.10)",
        minWidth: 132,
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[15px] leading-none">{agent.emoji}</span>
        <span
          className="text-[12.5px] font-semibold tracking-[-0.005em] truncate"
          style={{ color: "#0A0A0A", maxWidth: 90 }}
        >
          {agent.name}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <StatusDot tone={status.tone} pulse={status.pulse} />
        <span
          className="font-mono uppercase tracking-[0.12em] truncate"
          style={{ fontSize: 8.5, color: status.label === "ready" ? "#9CA3AF" : status.color, maxWidth: 100 }}
        >
          {status.label}
        </span>
      </div>
      <div
        className="font-mono uppercase tracking-[0.10em]"
        style={{ fontSize: 8, color: "#9CA3AF" }}
      >
        {triggerLabel}
      </div>
    </motion.button>
  );
}

function formatTrigger(trigger: GraphAgentSummary["trigger"]): string {
  switch (trigger.kind) {
    case "manual":
      return "manual";
    case "interval":
      return `every ${formatMs(trigger.ms)}`;
    case "cron":
      return `cron · ${trigger.expr}`;
    case "webhook":
      return "webhook";
  }
}

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function pillStatus(agent: GraphAgentSummary): {
  label: string;
  tone: "idle" | "running" | "ok" | "fail";
  color: string;
  pulse: boolean;
} {
  if (agent.status === "paused") {
    return { label: "paused", tone: "idle", color: "#9CA3AF", pulse: false };
  }
  if (!agent.lastRunStatus) {
    return { label: "ready", tone: "idle", color: "#9CA3AF", pulse: false };
  }
  if (agent.lastRunStatus === "queued" || agent.lastRunStatus === "running") {
    return { label: "running", tone: "running", color: "#B45309", pulse: true };
  }
  if (agent.lastRunStatus === "succeeded") {
    return { label: "ok · " + relTime(agent.lastRunAt), tone: "ok", color: "#15803D", pulse: false };
  }
  return { label: agent.lastRunStatus, tone: "fail", color: "#B91C1C", pulse: false };
}

function StatusDot({ tone, pulse }: { tone: "idle" | "running" | "ok" | "fail"; pulse: boolean }) {
  const color =
    tone === "idle" ? "#9CA3AF"
    : tone === "running" ? "#F59E0B"
    : tone === "ok" ? "#22C55E"
    : "#EF4444";
  return (
    <motion.span
      className="rounded-full"
      style={{
        width: 5,
        height: 5,
        background: color,
        boxShadow: pulse ? `0 0 0 3px ${color}40` : undefined,
      }}
      animate={pulse ? { opacity: [0.55, 1, 0.55] } : { opacity: 0.85 }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function relTime(ms: number | null): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}
