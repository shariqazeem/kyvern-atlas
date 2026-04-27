"use client";

/**
 * SignalCard — a notification card on the device.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ ▌ {KIND} · {worker emoji} {worker name} · 2m ago      ●  │
 *   │   {subject}                                              │
 *   │   {evidence as 2-4 mono bullets}                         │
 *   │   {suggestion if present, italic, gray}                  │
 *   │ ─────────────────────────────────────────────────────── │
 *   │   [signature pill ↗]  [Open source ↗]   [Mark read]     │
 *   └──────────────────────────────────────────────────────────┘
 *
 * Premium light register. A coloured kind-accent stripe runs along the
 * left edge of every card; unread cards get a brighter accent + outer
 * glow. Hover gives the card a tiny lift + subtle 3D tilt — it reads
 * like a physical notification placed on a glass surface.
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
import type { LucideIcon } from "lucide-react";
import type { Signal, SignalKind } from "@/lib/agents/types";

const KIND_ICON: Record<SignalKind, LucideIcon> = {
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

const SPRING = { type: "spring" as const, stiffness: 320, damping: 22, mass: 0.6 };

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
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, rotateX: 0.5, rotateY: -0.3 }}
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #FFFFFF 0%, #FBFBFD 100%)",
        border: isUnread
          ? `1px solid ${accent}33`
          : "1px solid rgba(15,23,42,0.06)",
        borderRadius: 16,
        boxShadow: isUnread
          ? [
              "inset 0 1px 0 rgba(255,255,255,1)",
              "0 1px 2px rgba(15,23,42,0.04)",
              "0 8px 22px -10px rgba(15,23,42,0.10)",
              `0 0 0 4px ${accent}10`,
            ].join(", ")
          : [
              "inset 0 1px 0 rgba(255,255,255,1)",
              "0 1px 2px rgba(15,23,42,0.03)",
              "0 6px 18px -10px rgba(15,23,42,0.08)",
            ].join(", "),
        overflow: "hidden",
        transformStyle: "preserve-3d",
        transformPerspective: 800,
      }}
    >
      {/* Kind-accent stripe along the left edge */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 12,
          bottom: 12,
          width: 3,
          borderRadius: "0 3px 3px 0",
          background: accent,
          opacity: isUnread ? 0.95 : 0.4,
        }}
      />

      <div className="relative px-4 py-3.5 pl-5">
        {/* Top row */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase"
            style={{
              background: `${accent}14`,
              color: accent,
              fontSize: "9.5px",
              letterSpacing: "0.10em",
            }}
          >
            <Icon className="w-2.5 h-2.5" strokeWidth={2.2} />
            {label}
          </span>
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[14px] shrink-0"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow:
                "inset 0 1px 1px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.02)",
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
          <span className="font-mono text-[11px]" style={{ color: "#9CA3AF" }}>
            · {fmtAgo(signal.createdAt)}
          </span>
          {isUnread && (
            <motion.span
              className="ml-auto rounded-full"
              style={{
                width: 8,
                height: 8,
                background: accent,
                boxShadow: `0 0 0 3px ${accent}1F`,
              }}
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              aria-label="Unread"
            />
          )}
        </div>

        {/* Subject */}
        <h3
          className="text-[#0A0A0A] tracking-tight"
          style={{
            fontSize: 17,
            fontWeight: 600,
            lineHeight: 1.32,
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
                  fontSize: 12,
                  lineHeight: 1.55,
                  paddingLeft: 12,
                  position: "relative",
                }}
              >
                <span style={{ position: "absolute", left: 0, color: "#9CA3AF" }}>
                  ·
                </span>
                {e}
              </li>
            ))}
          </ul>
        )}

        {/* Suggestion */}
        {signal.suggestion && (
          <p
            className="mt-2.5 italic"
            style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.55 }}
          >
            {signal.suggestion}
          </p>
        )}

        {/* Footer */}
        {(signal.signature || signal.sourceUrl || !marked) && (
          <div
            className="flex items-center gap-2 mt-3 pt-3 flex-wrap"
            style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
          >
            {signal.signature && (
              <a
                href={`https://explorer.solana.com/tx/${signal.signature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono"
                style={{
                  background: "rgba(15,23,42,0.04)",
                  color: "#374151",
                  fontSize: "10.5px",
                }}
              >
                {shortSig(signal.signature)}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {signal.sourceUrl && (
              <motion.a
                href={signal.sourceUrl}
                target="_blank"
                rel="noreferrer"
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{
                  background: "#0A0A0A",
                  color: "#fff",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10)",
                }}
              >
                Open source
                <ExternalLink className="w-2.5 h-2.5" />
              </motion.a>
            )}
            <span className="ml-auto" />
            {!marked && (
              <motion.button
                type="button"
                onClick={handleMarkRead}
                disabled={busy}
                whileTap={{ scale: 0.96 }}
                transition={SPRING}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{
                  background: "#FFFFFF",
                  color: "#374151",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 1px 1px rgba(15,23,42,0.03)",
                }}
              >
                <Check className="w-3 h-3" />
                {busy ? "Marking…" : "Mark read"}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}
