"use client";

/**
 * FindingsList — Phase 3.
 *
 * Compact single-line rows. Severity dot left, title + meta middle,
 * unread indicator right. Hairline dividers, generous padding,
 * subtle hover/selected accent.
 *
 * Click on desktop: updates the master/detail selection via URL.
 * Click on mobile: pushes to /app/inbox/[id].
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Repeat } from "lucide-react";
import type { Signal } from "@/lib/agents/types";
import { severityForSignal, severityVisuals } from "@/lib/agents/signal-severity";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

interface Props {
  signals: SignalWithWorker[];
  selectedId: string | null;
  onSelectDesktop: (id: string) => void;
  network: "devnet" | "mainnet";
}

const KIND_LABEL: Record<string, string> = {
  drafted_application: "Draft ready",
  wallet_alert: "Whale move",
  trigger_armed: "Heads-up",
  trigger_fired: "On-chain ✓",
  trigger_blocked: "Blocked ✕",
  bounty: "Bounty",
  ecosystem_announcement: "Announcement",
  wallet_move: "Wallet Move",
  price_trigger: "Price Trigger",
  github_release: "Release",
  observation: "Observation",
  condition_update: "Update",
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

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const fn = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return isDesktop;
}

export function FindingsList({
  signals,
  selectedId,
  onSelectDesktop,
}: Props) {
  const isDesktop = useIsDesktop();

  if (signals.length === 0) {
    return (
      <div
        className="rounded-2xl px-4 py-6 text-center text-[12.5px]"
        style={{
          background: "rgba(15,23,42,0.02)",
          border: "1px dashed rgba(15,23,42,0.10)",
          color: "rgba(15,23,42,0.55)",
        }}
      >
        Nothing to read here yet. Workers&apos; findings will land here.
      </div>
    );
  }

  return (
    <ul
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
      }}
    >
      {/* Phase 7 — slide-in animation when new findings land. The
          parent re-fetches every 5s; AnimatePresence diff-tracks by
          key=signal.id so freshly arriving rows fade + translate
          rather than just appearing. */}
      <AnimatePresence initial={false}>
        {signals.map((s, i) => (
          <Row
            key={s.id}
            signal={s}
            last={i === signals.length - 1}
            selected={s.id === selectedId}
            isDesktop={isDesktop}
            onSelectDesktop={onSelectDesktop}
          />
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Row({
  signal,
  last,
  selected,
  isDesktop,
  onSelectDesktop,
}: {
  signal: SignalWithWorker;
  last: boolean;
  selected: boolean;
  isDesktop: boolean;
  onSelectDesktop: (id: string) => void;
}) {
  const sev = severityForSignal(signal);
  const vis = severityVisuals(sev, !!signal.signature);
  const isUnread = signal.status === "unread";
  const label = KIND_LABEL[signal.kind] ?? signal.kind.toUpperCase();

  // Phase 7 — terminal-status badges. Sentinel drafted_application that
  // the user has tapped Submit on shows ✓ Submitted; Wren wallet_alert
  // mirrored to a Pulse trigger shows ↻ Mirrored. These move the row
  // from "unread" framing to "acted on" without losing it from the list.
  const submitted = !!signal.submittedAt;
  const mirrored = !!signal.mirroredPulseTriggerId;
  const onChain = !!signal.onChainSignature || !!signal.signature;

  const inner = (
    <>
      {/* Selected accent rail (left) */}
      {selected && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0"
          style={{ width: 3, background: "#0A0A0A" }}
        />
      )}
      <span
        aria-hidden
        className="rounded-full flex-shrink-0"
        style={{
          width: 7,
          height: 7,
          background: vis.dot,
          opacity: isUnread ? 1 : 0.45,
        }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-[12.5px] truncate"
          style={{
            color: "#0A0A0A",
            fontWeight: isUnread ? 600 : 500,
          }}
        >
          {signal.subject}
        </div>
        <div
          className="text-[10.5px] truncate font-mono uppercase tracking-[0.10em] flex items-center gap-1.5"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          <span className="truncate">
            {label} · {signal.worker.emoji} {signal.worker.name} ·{" "}
            {fmtAgo(signal.createdAt)}
          </span>
          {submitted && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px tracking-[0.06em] flex-shrink-0"
              style={{
                background: "rgba(34,197,94,0.10)",
                color: "#15803D",
                fontSize: 9,
              }}
            >
              <Check className="w-2.5 h-2.5" strokeWidth={2.6} />
              Submitted
            </span>
          )}
          {mirrored && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px tracking-[0.06em] flex-shrink-0"
              style={{
                background: "rgba(59,130,246,0.10)",
                color: "#1D4ED8",
                fontSize: 9,
              }}
            >
              <Repeat className="w-2.5 h-2.5" strokeWidth={2.6} />
              Mirrored
            </span>
          )}
          {!submitted && !mirrored && onChain && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px tracking-[0.06em] flex-shrink-0"
              style={{
                background: "rgba(34,197,94,0.08)",
                color: "#15803D",
                fontSize: 9,
              }}
            >
              On-chain
            </span>
          )}
        </div>
      </div>
      {isUnread && (
        <span
          aria-hidden
          className="rounded-full flex-shrink-0"
          style={{
            width: 6,
            height: 6,
            background: "#22C55E",
          }}
        />
      )}
    </>
  );

  const baseStyle = {
    background: selected ? "rgba(15,23,42,0.04)" : "transparent",
    borderBottom: last ? "none" : "1px solid rgba(15,23,42,0.05)",
  };

  if (isDesktop) {
    return (
      <motion.li
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4, height: 0 }}
        transition={{ duration: 0.32, ease: EASE }}
      >
        <motion.button
          type="button"
          onClick={() => onSelectDesktop(signal.id)}
          whileTap={{ scale: 0.99 }}
          className="relative w-full flex items-center gap-2.5 px-4 py-3 text-left transition hover:bg-black/[0.02]"
          style={baseStyle}
        >
          {inner}
        </motion.button>
      </motion.li>
    );
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
    >
      <Link
        href={`/app/inbox/${signal.id}`}
        className="relative flex items-center gap-2.5 px-4 py-3 transition hover:bg-black/[0.02]"
        style={baseStyle}
      >
        {inner}
      </Link>
    </motion.li>
  );
}
