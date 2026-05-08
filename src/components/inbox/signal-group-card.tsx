"use client";

/**
 * SignalGroupCard — the new inbox card.
 *
 * Renders a group of signals (1..N) that share (agent, kind, subject_hash)
 * as a single intelligence-briefing card. Cane's transformation #4 spec:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ▌ {SEVERITY badge} · {KIND chip} · {emoji name} · 2m ago      ●  │
 *   │   {subject}                                                      │
 *   │   • evidence …                                                   │
 *   │   Persistent: below band for 6h                                  │
 *   │   Next trigger: bounce above $85 on volume                       │
 *   │ ─────────────────────────────────────────────────────────────── │
 *   │   [On-chain ↗] [Apply ↗] [Post to task board] [Snooze 4h] [⋯]   │
 *   │   ▸ 3 updates — last 22m ago (click to expand)                   │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Action buttons are kind-driven (see ACTIONS_FOR_KIND below). Snooze
 * + Dismiss + Mark-read all hit existing endpoints from T4.2.
 *
 * On mobile (<sm) the action row collapses to "Open" + a "More ⋯"
 * popover so the card stays glanceable in portrait. The popover is
 * implemented as a simple stacked list under the card on mobile —
 * lighter than a full dialog and matches the device-feel of the UI.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WorkerEmoji } from "@/components/icons/worker-emoji";
import {
  Award,
  Megaphone,
  Wallet,
  TrendingUp,
  GitBranch,
  Sparkles,
  Target,
  BarChart3,
  ExternalLink,
  Check,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  Link as LinkIcon,
  FileEdit,
  AlertTriangle,
  Zap,
  Crosshair,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Signal, SignalKind } from "@/lib/agents/types";
import {
  severityForSignal,
  severityVisuals,
} from "@/lib/agents/signal-severity";
import type { SignalGroup } from "@/lib/agents/signal-group";

const KIND_ICON: Record<SignalKind, LucideIcon> = {
  drafted_application: FileEdit,
  wallet_alert: AlertTriangle,
  trigger_armed: Crosshair,
  trigger_fired: Zap,
  trigger_blocked: Zap,
  bounty: Award,
  ecosystem_announcement: Megaphone,
  wallet_move: Wallet,
  price_trigger: TrendingUp,
  github_release: GitBranch,
  observation: Sparkles,
  condition_update: TrendingUp,
  opportunity: Target,
  market_intel: BarChart3,
};

const KIND_LABEL: Record<SignalKind, string> = {
  drafted_application: "DRAFTED APPLICATION",
  wallet_alert: "WALLET ALERT",
  trigger_armed: "TRIGGER ARMED",
  trigger_fired: "TRIGGER FIRED",
  trigger_blocked: "TRIGGER BLOCKED",
  bounty: "BOUNTY",
  ecosystem_announcement: "ANNOUNCEMENT",
  wallet_move: "WALLET MOVE",
  price_trigger: "PRICE TRIGGER",
  github_release: "RELEASE",
  observation: "OBSERVATION",
  condition_update: "UPDATE",
  opportunity: "OPPORTUNITY",
  market_intel: "MARKET INTEL",
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

function explorerUrl(sig: string, network: "devnet" | "mainnet"): string {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

const SPRING = { type: "spring" as const, stiffness: 320, damping: 22, mass: 0.6 };

export function SignalGroupCard({
  group,
  network = "devnet",
  onChange,
}: {
  group: SignalGroup<SignalWithWorker>;
  network?: "devnet" | "mainnet";
  /** Called after any action mutates the signal (mark/snooze/dismiss/post).
   *  The page uses it to optimistically update its state. */
  onChange?: () => void;
}) {
  const head = group.head;
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const severity = severityForSignal(head);
  const vis = severityVisuals(severity, !!head.signature);
  const Icon = KIND_ICON[head.kind] ?? Sparkles;
  const label = KIND_LABEL[head.kind] ?? "SIGNAL";
  const isUnread = group.hasUnread;
  const moreCount = group.members.length - 1;

  if (hidden) return null;

  const callAction = async (
    pathSuffix: string,
    body?: Record<string, unknown>,
    optimisticHide = false,
  ) => {
    if (busy) return;
    setBusy(pathSuffix);
    try {
      const res = await fetch(`/api/signals/${head.id}/${pathSuffix}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        if (optimisticHide) setHidden(true);
        onChange?.();
      }
    } finally {
      setBusy(null);
    }
  };

  const onMarkRead = () => callAction("mark-read", { status: "read" });
  const onSnooze4h = () => callAction("snooze", { hours: 4 }, true);
  const onDismiss = () => callAction("dismiss", undefined, true);
  const onPostAsTask = () =>
    callAction("post-as-task", { bountyUsd: 0.1 }, true);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "relative",
        background: "linear-gradient(180deg, #FFFFFF 0%, #FBFBFD 100%)",
        border: isUnread
          ? `1px solid ${vis.accent === "transparent" ? "rgba(15,23,42,0.10)" : `${vis.accent}33`}`
          : "1px solid rgba(15,23,42,0.06)",
        borderRadius: 16,
        boxShadow: isUnread
          ? [
              "inset 0 1px 0 rgba(255,255,255,1)",
              "0 1px 2px rgba(15,23,42,0.04)",
              "0 8px 22px -10px rgba(15,23,42,0.10)",
              vis.accent === "transparent"
                ? "0 0 0 4px rgba(15,23,42,0.04)"
                : `0 0 0 4px ${vis.accent}10`,
            ].join(", ")
          : [
              "inset 0 1px 0 rgba(255,255,255,1)",
              "0 1px 2px rgba(15,23,42,0.03)",
              "0 6px 18px -10px rgba(15,23,42,0.08)",
            ].join(", "),
        overflow: "hidden",
      }}
    >
      {/* Severity left stripe — only when severity > routine */}
      {vis.accent !== "transparent" && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: vis.accent,
            opacity: isUnread ? 1 : 0.55,
          }}
        />
      )}

      <div className="relative px-4 py-3.5 pl-5 sm:pl-6">
        {/* Top row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {vis.badge && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase"
              style={{
                background: `${vis.accent}14`,
                color: vis.accent,
                fontSize: "9.5px",
                letterSpacing: "0.10em",
                fontWeight: 600,
              }}
            >
              {head.signature && vis.badge === "ON-CHAIN" && (
                <LinkIcon className="w-2.5 h-2.5" strokeWidth={2.4} />
              )}
              {vis.badge}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase"
            style={{
              background: "rgba(15,23,42,0.04)",
              color: "#374151",
              fontSize: "9.5px",
              letterSpacing: "0.10em",
            }}
          >
            <Icon className="w-2.5 h-2.5" strokeWidth={2.2} />
            {label}
          </span>
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow:
                "inset 0 1px 1px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.02)",
              color: "#0A0A0A",
            }}
          >
            <WorkerEmoji emoji={head.worker.emoji} size={13} strokeWidth={1.8} />
          </span>
          <span
            className="text-[12px] font-medium"
            style={{ color: "#0A0A0A" }}
          >
            {head.worker.name}
          </span>
          <span className="font-mono text-[11px]" style={{ color: "#9CA3AF" }}>
            · {fmtAgo(head.createdAt)}
          </span>
          {isUnread && (
            <motion.span
              className="ml-auto rounded-full"
              style={{
                width: 8,
                height: 8,
                background:
                  vis.accent === "transparent" ? "#22C55E" : vis.accent,
                boxShadow: `0 0 0 3px ${vis.accent === "transparent" ? "rgba(34,197,94,0.18)" : `${vis.accent}1F`}`,
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
          style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.32 }}
        >
          {head.subject}
        </h3>

        {/* Evidence */}
        {head.evidence.length > 0 && (
          <ul className="mt-2.5 space-y-1">
            {head.evidence.slice(0, 4).map((e, i) => (
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

        {/* Persistence + next trigger */}
        {head.persistenceContext && (
          <p
            className="mt-2 text-[12px]"
            style={{ color: "#6B7280", lineHeight: 1.5 }}
          >
            <span className="font-mono uppercase tracking-[0.08em] text-[10px] mr-1.5" style={{ color: "#9CA3AF" }}>
              Persistent:
            </span>
            {head.persistenceContext}
          </p>
        )}
        {head.nextTrigger && (
          <p
            className="mt-1 italic text-[12.5px]"
            style={{ color: "#15803D", lineHeight: 1.5 }}
          >
            <span className="not-italic font-mono uppercase tracking-[0.08em] text-[10px] mr-1.5" style={{ color: "#15803D", opacity: 0.65 }}>
              Next trigger:
            </span>
            {head.nextTrigger}
          </p>
        )}

        {/* Suggestion */}
        {head.suggestion && !head.nextTrigger && (
          <p
            className="mt-2 italic"
            style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.55 }}
          >
            {head.suggestion}
          </p>
        )}

        {/* Group expander */}
        {moreCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-mono"
            style={{ color: "#6B7280" }}
          >
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {expanded
              ? "Hide updates"
              : `${moreCount} earlier ${moreCount === 1 ? "update" : "updates"}`}
          </button>
        )}
        <AnimatePresence initial={false}>
          {expanded && moreCount > 0 && (
            <motion.div
              key="updates"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-2 ml-1 border-l space-y-1.5 pl-3"
              style={{ borderColor: "rgba(15,23,42,0.10)" }}
            >
              {group.members.slice(1).map((m) => (
                <div key={m.id} className="text-[12px]" style={{ color: "#374151" }}>
                  <span className="font-mono text-[10.5px] mr-2" style={{ color: "#9CA3AF" }}>
                    {fmtAgo(m.createdAt)}
                  </span>
                  {m.subject}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer — actions */}
        <div
          className="flex items-center gap-2 mt-3 pt-3 flex-wrap"
          style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
        >
          {head.signature && (
            <a
              href={explorerUrl(head.signature, network)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded font-mono"
              style={{
                background: "rgba(15,23,42,0.04)",
                color: "#374151",
                fontSize: "10.5px",
              }}
            >
              <LinkIcon className="w-2.5 h-2.5" />
              {shortSig(head.signature)}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}

          {head.sourceUrl && (
            <ActionButton
              variant="primary"
              href={head.sourceUrl}
              icon={<ExternalLink className="w-3 h-3" />}
            >
              {head.kind === "bounty" || head.kind === "opportunity"
                ? "Apply"
                : head.kind === "github_release"
                  ? "View release"
                  : head.kind === "ecosystem_announcement"
                    ? "Read more"
                    : "Open source"}
            </ActionButton>
          )}

          {(head.kind === "bounty" || head.kind === "opportunity") && (
            <ActionButton
              onClick={onPostAsTask}
              busy={busy === "post-as-task"}
              icon={<Send className="w-3 h-3" />}
            >
              Post to task board
            </ActionButton>
          )}

          {(head.kind === "price_trigger" ||
            head.kind === "condition_update" ||
            head.kind === "observation") && (
            <ActionButton
              onClick={onSnooze4h}
              busy={busy === "snooze"}
              icon={<Clock className="w-3 h-3" />}
            >
              Snooze 4h
            </ActionButton>
          )}

          <span className="ml-auto" />

          {!head.signature && head.status === "unread" && (
            <ActionButton
              onClick={onMarkRead}
              busy={busy === "mark-read"}
              icon={<Check className="w-3 h-3" />}
            >
              Mark read
            </ActionButton>
          )}
          <ActionButton
            onClick={onDismiss}
            busy={busy === "dismiss"}
            icon={<X className="w-3 h-3" />}
            quiet
          >
            Dismiss
          </ActionButton>
        </div>
      </div>
    </motion.article>
  );
}

/* ── ActionButton ───────────────────────────────────────────────────── */

function ActionButton({
  children,
  href,
  onClick,
  icon,
  variant,
  busy,
  quiet,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: "primary";
  busy?: boolean;
  quiet?: boolean;
}) {
  const sharedProps = {
    whileTap: { scale: 0.96 },
    transition: SPRING,
    className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium",
    style:
      variant === "primary"
        ? {
            background: "#0A0A0A",
            color: "#fff",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10)",
          }
        : quiet
          ? {
              background: "transparent",
              color: "#6B7280",
              border: "1px solid rgba(15,23,42,0.06)",
            }
          : {
              background: "#FFFFFF",
              color: "#374151",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 1px 1px rgba(15,23,42,0.03)",
            },
  } as const;
  if (href) {
    return (
      <motion.a href={href} target="_blank" rel="noreferrer" {...sharedProps}>
        {icon}
        {children}
      </motion.a>
    );
  }
  return (
    <motion.button
      type="button"
      disabled={busy}
      onClick={onClick}
      {...sharedProps}
    >
      {icon}
      {busy ? "…" : children}
    </motion.button>
  );
}
