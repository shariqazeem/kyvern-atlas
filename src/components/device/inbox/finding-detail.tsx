"use client";

/**
 * FindingDetail — Phase 3.
 *
 * Detail card shown in the right pane on desktop and as the body of
 * /app/inbox/[id] on mobile. Title at top, kind+worker chips, source
 * meta, body content, action buttons at the bottom.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  ExternalLink,
  X,
} from "lucide-react";
import type { Signal } from "@/lib/agents/types";
import {
  severityForSignal,
  severityVisuals,
} from "@/lib/agents/signal-severity";

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

interface Props {
  signal: SignalWithWorker;
  network: "devnet" | "mainnet";
  onMarkRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onSnooze: (id: string) => Promise<void>;
}

const KIND_LABEL: Record<string, string> = {
  drafted_application: "Drafted Application",
  wallet_alert: "Wallet Alert",
  trigger_armed: "Trigger Armed",
  trigger_fired: "Trigger Fired",
  bounty: "Bounty",
  ecosystem_announcement: "Announcement",
  wallet_move: "Wallet Move",
  price_trigger: "Price Trigger",
  github_release: "Release",
  observation: "Observation",
  condition_update: "Condition Update",
  opportunity: "Opportunity",
  market_intel: "Market Intel",
};

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function FindingDetail({
  signal,
  network,
  onMarkRead,
  onDismiss,
  onSnooze,
}: Props) {
  const sev = severityForSignal(signal);
  const vis = severityVisuals(sev, !!signal.signature);
  const label = KIND_LABEL[signal.kind] ?? signal.kind.toUpperCase();
  const [marked, setMarked] = useState(signal.status !== "unread");
  const [busy, setBusy] = useState<"read" | "dismiss" | "snooze" | null>(null);

  const handleAction = async (
    action: "read" | "dismiss" | "snooze",
    fn: () => Promise<void>,
  ) => {
    if (busy) return;
    setBusy(action);
    try {
      await fn();
      if (action === "read") setMarked(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <article
      className="rounded-2xl bg-white p-5 sm:p-6"
      style={{
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
      }}
    >
      {/* Severity + kind eyebrow */}
      <div className="flex items-center gap-2 mb-2">
        <span
          aria-hidden
          className="rounded-full"
          style={{ width: 7, height: 7, background: vis.dot }}
        />
        <span
          className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 9.5, color: vis.accent !== "transparent" ? vis.accent : "rgba(15,23,42,0.55)" }}
        >
          {vis.badge ?? "ROUTINE"} · {label}
        </span>
      </div>

      {/* Title */}
      <h2
        className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.012em] leading-[1.3] mb-2"
        style={{ color: "#0A0A0A" }}
      >
        {signal.subject}
      </h2>

      {/* Worker + ago */}
      <div
        className="flex items-baseline gap-2 mb-4 text-[12px]"
        style={{ color: "#6B7280" }}
      >
        <span style={{ fontSize: 14 }}>{signal.worker.emoji}</span>
        <span style={{ fontWeight: 500, color: "#0A0A0A" }}>
          {signal.worker.name}
        </span>
        <span aria-hidden style={{ color: "rgba(15,23,42,0.20)" }}>
          ·
        </span>
        <span>{fmtAgo(signal.createdAt)}</span>
      </div>

      {/* Source */}
      {signal.sourceUrl && (
        <div className="mb-3">
          <div
            className="font-mono uppercase tracking-[0.14em] mb-0.5"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
          >
            Source
          </div>
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11.5px] truncate max-w-full"
            style={{ color: "#0A0A0A" }}
          >
            <span className="truncate">{signal.sourceUrl}</span>
            <ExternalLink className="w-3 h-3" strokeWidth={2} />
          </a>
        </div>
      )}

      {/* Evidence */}
      {signal.evidence && signal.evidence.length > 0 && (
        <div className="mb-3">
          <div
            className="font-mono uppercase tracking-[0.14em] mb-1"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
          >
            Evidence
          </div>
          <ul
            className="flex flex-col gap-1 text-[13px] leading-[1.6]"
            style={{ color: "#0A0A0A" }}
          >
            {signal.evidence.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span
                  aria-hidden
                  style={{ color: "rgba(15,23,42,0.30)" }}
                >
                  •
                </span>
                <span className="flex-1">{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestion */}
      {signal.suggestion && (
        <div
          className="rounded-[10px] p-3 mb-3"
          style={{
            background: "rgba(15,23,42,0.03)",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          <div
            className="font-mono uppercase tracking-[0.14em] mb-1"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
          >
            Suggestion
          </div>
          <p
            className="text-[12.5px] leading-[1.5]"
            style={{ color: "#0A0A0A" }}
          >
            {signal.suggestion}
          </p>
        </div>
      )}

      {/* On-chain */}
      {signal.onChainSignature && (
        <a
          href={`https://explorer.solana.com/tx/${signal.onChainSignature}?cluster=${network}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono mb-3"
          style={{ fontSize: 11, color: "#15803D" }}
        >
          {signal.onChainSignature.slice(0, 8)}…
          {signal.onChainSignature.slice(-6)}
          <ExternalLink className="w-3 h-3" strokeWidth={2} />
        </a>
      )}

      {/* Action buttons */}
      <div
        className="flex items-center flex-wrap gap-1.5 pt-3 mt-2"
        style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
      >
        {signal.sourceUrl && (
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[11.5px] font-medium transition active:scale-[0.97]"
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.85)",
            }}
          >
            Read more
            <ExternalLink className="w-3 h-3" strokeWidth={2} />
          </a>
        )}
        <ActionButton
          icon={<Check className="w-3 h-3" strokeWidth={2.5} />}
          label={marked ? "Read" : "Mark read"}
          disabled={marked || busy === "read"}
          loading={busy === "read"}
          onClick={() =>
            handleAction("read", () => onMarkRead(signal.id))
          }
        />
        <ActionButton
          icon={<X className="w-3 h-3" strokeWidth={2.5} />}
          label="Dismiss"
          disabled={busy === "dismiss"}
          loading={busy === "dismiss"}
          onClick={() =>
            handleAction("dismiss", () => onDismiss(signal.id))
          }
        />
        <ActionButton
          icon={<Clock className="w-3 h-3" strokeWidth={2} />}
          label="Snooze 4h"
          disabled={busy === "snooze"}
          loading={busy === "snooze"}
          onClick={() =>
            handleAction("snooze", () => onSnooze(signal.id))
          }
        />
      </div>
    </article>
  );
}

function ActionButton({
  icon,
  label,
  disabled,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[11.5px] font-medium transition disabled:opacity-50"
      style={{
        background: "#FFFFFF",
        color: "#0A0A0A",
        border: "1px solid rgba(15,23,42,0.10)",
      }}
    >
      {loading ? (
        <span
          className="w-3 h-3 rounded-full animate-spin"
          style={{
            border: "1.5px solid rgba(15,23,42,0.20)",
            borderTopColor: "#0A0A0A",
          }}
        />
      ) : (
        icon
      )}
      {label}
    </motion.button>
  );
}
