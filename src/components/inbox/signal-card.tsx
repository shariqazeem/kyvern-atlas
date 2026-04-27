"use client";

/**
 * Signal card — Path C inbox row.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ {kind icon} {worker emoji} {worker name} · 2m ago    ●  │
 *   │ {subject — Inter 18px}                                   │
 *   │ {evidence as 2-4 mono bullets}                           │
 *   │ {suggestion if present, italic, gray}                    │
 *   │ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──│
 *   │ [signature pill ↗]  [source ↗]  [Mark read]              │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Light/OS register. Fade + slide-in entrance via parent's AnimatePresence.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Megaphone,
  Wallet,
  TrendingUp,
  GitBranch,
  Sparkles,
  ExternalLink,
  Check,
} from "lucide-react";
import type { Signal, SignalKind } from "@/lib/agents/types";

const KIND_ICON: Record<SignalKind, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  bounty: Award,
  ecosystem_announcement: Megaphone,
  wallet_move: Wallet,
  price_trigger: TrendingUp,
  github_release: GitBranch,
  observation: Sparkles,
};

const KIND_COLOR: Record<SignalKind, string> = {
  bounty: "#16A34A",
  ecosystem_announcement: "#2563EB",
  wallet_move: "#EA580C",
  price_trigger: "#9333EA",
  github_release: "#0F766E",
  observation: "#6B7280",
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

function shortSig(sig: string): string {
  return `${sig.slice(0, 4)}…${sig.slice(-4)}`;
}

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

export function SignalCard({
  signal,
  onMarkRead,
}: {
  signal: SignalWithWorker;
  onMarkRead?: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [marked, setMarked] = useState(signal.status !== "unread");
  const Icon = KIND_ICON[signal.kind] ?? Sparkles;
  const accent = KIND_COLOR[signal.kind] ?? "#6B7280";
  const label = KIND_LABEL[signal.kind] ?? "SIGNAL";
  const isUnread = signal.status === "unread" && !marked;

  const handleMarkRead = async () => {
    if (busy || marked) return;
    setBusy(true);
    try {
      await fetch(`/api/signals/${signal.id}/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      });
      setMarked(true);
      onMarkRead?.(signal.id);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[14px] p-4"
      style={{
        background: "var(--surface, #fff)",
        border: "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono uppercase"
          style={{
            background: `${accent}15`,
            color: accent,
            fontSize: "9.5px",
            letterSpacing: "0.08em",
          }}
        >
          <Icon className="w-2.5 h-2.5" />
          {label}
        </span>
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[14px] shrink-0"
          style={{
            background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          {signal.worker.emoji}
        </span>
        <span
          className="text-[12px] font-medium"
          style={{ color: "#0A0A0A" }}
        >
          {signal.worker.name}
        </span>
        <span
          className="font-mono text-[11px]"
          style={{ color: "#9CA3AF" }}
        >
          · {fmtAgo(signal.createdAt)}
        </span>
        {isUnread && (
          <motion.span
            className="ml-auto w-2 h-2 rounded-full"
            style={{ background: "#22C55E" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            aria-label="Unread"
          />
        )}
      </div>

      {/* Subject */}
      <h3
        className="text-[#0A0A0A]"
        style={{
          fontSize: "18px",
          fontWeight: 600,
          lineHeight: 1.35,
        }}
      >
        {signal.subject}
      </h3>

      {/* Evidence */}
      {signal.evidence.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {signal.evidence.map((e, i) => (
            <li
              key={i}
              className="font-mono"
              style={{
                color: "#374151",
                fontSize: "12px",
                lineHeight: 1.55,
                paddingLeft: "12px",
                position: "relative",
              }}
            >
              <span style={{ position: "absolute", left: 0, color: "#9CA3AF" }}>·</span>
              {e}
            </li>
          ))}
        </ul>
      )}

      {/* Suggestion */}
      {signal.suggestion && (
        <p
          className="mt-2.5 italic"
          style={{
            color: "#6B7280",
            fontSize: "13px",
            lineHeight: 1.55,
          }}
        >
          {signal.suggestion}
        </p>
      )}

      {/* Footer */}
      {(signal.signature || signal.sourceUrl || !marked) && (
        <div
          className="flex items-center gap-2 mt-3 pt-3 flex-wrap"
          style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}
        >
          {signal.signature && (
            <a
              href={`https://explorer.solana.com/tx/${signal.signature}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono"
              style={{
                background: "rgba(0,0,0,0.04)",
                color: "#374151",
                fontSize: "10.5px",
              }}
            >
              {shortSig(signal.signature)}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {signal.sourceUrl && (
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition active:scale-[0.97]"
              style={{
                background: "#0A0A0A",
                color: "#fff",
              }}
            >
              Open source
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          <span className="ml-auto" />
          {!marked && (
            <button
              type="button"
              onClick={handleMarkRead}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition active:scale-[0.97]"
              style={{
                background: "transparent",
                color: "#6B7280",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <Check className="w-3 h-3" />
              {busy ? "Marking…" : "Mark read"}
            </button>
          )}
        </div>
      )}
    </motion.article>
  );
}
