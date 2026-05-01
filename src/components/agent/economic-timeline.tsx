"use client";

/**
 * EconomicTimeline — per-worker activity log (Phase 6 redesign).
 *
 * Replaces the raw "Internal log" thought feed on /app/agents/[id].
 * Shows ONLY the worker's economic actions — post / claim / complete /
 * stake / subscribe. Anti-noise rules already filter idle-mode reasoning
 * thoughts so this stays focused on money movements.
 *
 *   ┌─ Activity ──────────────────────────────── 12 actions ──┐
 *   │ 22m ago   posted research task           $0.15 ✓ ↗      │
 *   │ 21m ago   surfaced bounty                                │
 *   │ 12m ago   completed task → earned        +$0.15 ✓ ↗     │
 *   │  4m ago   staked $0.02 on SOL band       $0.02 ✓ ↗      │
 *   │  1m ago   tried to stake — blocked       $0.05 ✗        │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Polls /api/agents/[id]/thoughts?economic=1 every 8s. Empty state:
 * "Still warming up — first economic actions will appear here."
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Check,
  X,
  ExternalLink,
  Link2,
  Send,
  CheckCircle2,
  Coins,
  Megaphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface ThoughtItem {
  id: string;
  agentId: string;
  timestamp: number;
  thought: string;
  toolUsed: string | null;
  signature: string | null;
  signatureStatus: "success" | "failed" | null;
  amountUsd: number | null;
  counterparty: string | null;
  mode: "llm" | "scripted";
}

const TOOL_VERB: Record<
  string,
  {
    Icon: LucideIcon;
    success: string;
    failed: string;
    /** "earned" tone (green) for incoming USDC; "spent" (amber) for outgoing. */
    tone: "earned" | "spent";
  }
> = {
  post_task: {
    Icon: Send,
    success: "posted research task — escrowed",
    failed: "tried to post task — escrow blocked",
    tone: "spent",
  },
  claim_task: {
    Icon: CheckCircle2,
    success: "claimed a task",
    failed: "tried to claim — taken",
    tone: "earned", // claim doesn't move money but signals incoming work
  },
  complete_task: {
    Icon: CheckCircle2,
    success: "completed task — earned",
    failed: "tried to complete — payout blocked",
    tone: "earned",
  },
  stake_on_finding: {
    Icon: Coins,
    success: "staked on finding",
    failed: "tried to stake — blocked",
    tone: "spent",
  },
  subscribe_to_agent: {
    Icon: Megaphone,
    success: "subscribed to feed",
    failed: "tried to subscribe — blocked",
    tone: "spent",
  },
};

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function explorerUrl(sig: string, network: "devnet" | "mainnet"): string {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

interface EconomicTimelineProps {
  agentId: string;
  isAlive: boolean;
  network?: "devnet" | "mainnet";
}

export function EconomicTimeline({
  agentId,
  isAlive,
  network = "devnet",
}: EconomicTimelineProps) {
  const [items, setItems] = useState<ThoughtItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/agents/${agentId}/thoughts?economic=1&limit=20`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive || !d) return;
          setItems((d.thoughts ?? []) as ThoughtItem[]);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    };
    load();
    const iv = setInterval(load, 8_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [agentId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="rounded-[16px] overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      {/* header */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2.5"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
      >
        <div className="flex items-center gap-1.5">
          <Activity
            className="w-3 h-3"
            strokeWidth={2.2}
            style={{ color: "#15803D" }}
          />
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ color: "#15803D", fontSize: 9.5, fontWeight: 600 }}
          >
            Economic activity
          </span>
          <motion.span
            aria-hidden
            className="rounded-full ml-0.5"
            style={{
              width: 5,
              height: 5,
              background: "#22C55E",
              boxShadow: "0 0 0 2.5px rgba(34,197,94,0.14)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span
          className="font-mono"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          {items.length} {items.length === 1 ? "action" : "actions"}
        </span>
      </div>

      {!loaded ? (
        <div
          className="py-8 text-center font-mono text-[12px]"
          style={{ color: "#9CA3AF" }}
        >
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div
          className="py-8 px-4 text-center"
          style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.55 }}
        >
          {isAlive
            ? "Still warming up — first economic actions will appear here."
            : "Worker is paused. Resume to record economic actions."}
        </div>
      ) : (
        <ul
          className="divide-y"
          style={{ borderColor: "rgba(15,23,42,0.04)" }}
        >
          <AnimatePresence initial={false}>
            {items.map((t) => (
              <TimelineRow key={t.id} item={t} network={network} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.div>
  );
}

function TimelineRow({
  item,
  network,
}: {
  item: ThoughtItem;
  network: "devnet" | "mainnet";
}) {
  const tool = item.toolUsed ?? "";
  const cfg = TOOL_VERB[tool];
  const failed = item.signatureStatus === "failed";
  const success = item.signatureStatus === "success";

  // Render a generic row when the tool isn't in our economic verb map
  // (still has a signature — e.g. an edge tool we forgot to register).
  const verb = cfg
    ? failed
      ? cfg.failed
      : cfg.success
    : `used ${tool.replace(/_/g, " ")}`;

  const Icon = cfg?.Icon ?? Activity;
  const tone = cfg?.tone ?? "spent";
  const amount = item.amountUsd ?? 0;
  const showAmount = amount > 0 && (success || failed);
  const amountColor = failed
    ? "#B91C1C"
    : tone === "earned"
      ? "#15803D"
      : "#B45309";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="px-4 py-2.5 flex items-center gap-2 flex-wrap"
    >
      {/* tool icon */}
      <span
        className="w-5 h-5 rounded-[6px] flex items-center justify-center flex-none"
        style={{
          background: failed
            ? "rgba(239,68,68,0.10)"
            : success && tone === "earned"
              ? "rgba(34,197,94,0.10)"
              : "rgba(15,23,42,0.04)",
          color: failed
            ? "#B91C1C"
            : success && tone === "earned"
              ? "#15803D"
              : "#374151",
        }}
      >
        <Icon className="w-3 h-3" strokeWidth={2.2} />
      </span>

      {/* time */}
      <span
        className="font-mono"
        style={{ color: "#9CA3AF", fontSize: 10.5 }}
      >
        {fmtAgo(item.timestamp)}
      </span>

      {/* verb */}
      <span
        className="text-[12.5px] min-w-0"
        style={{ color: "#374151", lineHeight: 1.4 }}
      >
        {verb}
        {showAmount && (
          <>
            {" "}
            <span
              className="font-mono font-semibold"
              style={{
                color: amountColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {tone === "earned" && success ? "+" : ""}${amount.toFixed(3)}
            </span>
          </>
        )}
      </span>

      {/* status badge */}
      {success && (
        <span
          className="inline-flex items-center"
          style={{ color: "#15803D" }}
        >
          <Check className="w-3 h-3" strokeWidth={2.6} />
        </span>
      )}
      {failed && (
        <span
          className="inline-flex items-center"
          style={{ color: "#B91C1C" }}
        >
          <X className="w-3 h-3" strokeWidth={2.6} />
        </span>
      )}

      <span className="ml-auto" />

      {/* explorer link */}
      {item.signature && (
        <a
          href={explorerUrl(item.signature, network)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono"
          style={{
            background: success
              ? "rgba(34,197,94,0.10)"
              : "rgba(15,23,42,0.04)",
            color: success ? "#15803D" : "#374151",
            fontSize: 10.5,
          }}
          title="Open on Solana Explorer"
        >
          <Link2 className="w-2.5 h-2.5" strokeWidth={2.4} />
          {item.signature.slice(0, 4)}…{item.signature.slice(-4)}
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </motion.li>
  );
}
