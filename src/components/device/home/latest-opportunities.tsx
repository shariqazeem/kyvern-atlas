"use client";

/**
 * LatestOpportunities — Phase 6 promotion of Findings to /app home.
 *
 * Sits directly below DiscoveryHero on /app. Pulls the last ~5 unread
 * + read signals from /api/devices/[id]/inbox, renders each as a
 * one-line row (severity stripe + kind chip + worker + subject + ago +
 * Apply button when sourceUrl present).
 *
 * The full Findings page at /app/inbox stays — this is just the
 * "what did your workers just find?" strip on the home surface so the
 * user doesn't have to navigate to see the actual product value.
 *
 * Polls /api/devices/[id]/inbox?status=all&limit=6 every 8s.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ExternalLink,
  Award,
  Megaphone,
  Wallet,
  TrendingUp,
  GitBranch,
  Sparkles,
  Target,
  BarChart3,
  Send,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Signal, SignalKind } from "@/lib/agents/types";
import {
  severityForSignal,
  severityVisuals,
} from "@/lib/agents/signal-severity";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const KIND_ICON: Record<SignalKind, LucideIcon> = {
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
  bounty: "BOUNTY",
  ecosystem_announcement: "ANNOUNCEMENT",
  wallet_move: "WALLET",
  price_trigger: "PRICE",
  github_release: "RELEASE",
  observation: "NOTE",
  condition_update: "UPDATE",
  opportunity: "OPPORTUNITY",
  market_intel: "MARKET INTEL",
};

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  deviceId: string;
}

export function LatestOpportunities({ deviceId }: Props) {
  const [signals, setSignals] = useState<SignalWithWorker[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/devices/${deviceId}/inbox?status=all&limit=6`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive || !d) return;
          // Prefer high-value kinds at the top so the most relevant
          // discoveries lead the strip. Within each tier the inbox
          // already returns by created_at DESC.
          const high = ["opportunity", "market_intel", "bounty"];
          const all = (d.signals ?? []) as SignalWithWorker[];
          all.sort((a, b) => {
            const ah = high.includes(a.kind) ? 1 : 0;
            const bh = high.includes(b.kind) ? 1 : 0;
            if (ah !== bh) return bh - ah;
            return b.createdAt - a.createdAt;
          });
          setSignals(all.slice(0, 5));
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
  }, [deviceId]);

  // Hide the section entirely on first paint until we know if there's
  // anything to show — prevents an empty slab below the hero.
  if (!loaded) return null;
  if (signals.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="rounded-[16px] overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles
            className="w-3 h-3"
            strokeWidth={2.2}
            style={{ color: "#15803D" }}
          />
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ color: "#15803D", fontSize: 9.5, fontWeight: 600 }}
          >
            Latest opportunities
          </span>
        </div>
        <Link
          href="/app/inbox"
          className="font-mono uppercase tracking-[0.14em] inline-flex items-center gap-1 hover:text-[#0A0A0A] transition"
          style={{ color: "#6B7280", fontSize: 9.5 }}
        >
          All findings
          <ArrowRight className="w-2.5 h-2.5" strokeWidth={2} />
        </Link>
      </div>

      {/* Rows */}
      <ul className="divide-y" style={{ borderColor: "rgba(15,23,42,0.04)" }}>
        <AnimatePresence initial={false}>
          {signals.map((s) => (
            <OpportunityRow key={s.id} signal={s} />
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}

function OpportunityRow({ signal }: { signal: SignalWithWorker }) {
  const sev = severityForSignal(signal);
  const vis = severityVisuals(sev, !!signal.signature);
  const Icon = KIND_ICON[signal.kind] ?? Sparkles;
  const label = KIND_LABEL[signal.kind] ?? "SIGNAL";
  const isUnread = signal.status === "unread";
  const dispatchable =
    signal.kind === "bounty" ||
    signal.kind === "opportunity" ||
    signal.kind === "market_intel";

  // Dispatch state for the "Execute via Wren" button. Calls existing
  // /api/signals/[id]/post-as-task to create a paid task on the device's
  // board. Wren typically claims it on the next tick — the user feels
  // like they dispatched a worker rather than just bookmarked a URL.
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const onDispatch = async () => {
    if (dispatching || dispatched) return;
    setDispatching(true);
    try {
      const res = await fetch(`/api/signals/${signal.id}/post-as-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bountyUsd: 0.1 }),
      });
      if (res.ok) {
        setDispatched(true);
      }
    } finally {
      setDispatching(false);
    }
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="relative px-4 py-2.5 hover:bg-[rgba(15,23,42,0.015)] transition-colors"
    >
      {/* Severity left stripe (only when above routine) */}
      {vis.accent !== "transparent" && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0"
          style={{
            width: 3,
            background: vis.accent,
            opacity: isUnread ? 1 : 0.5,
          }}
        />
      )}

      <div className="flex items-center gap-2 flex-nowrap min-w-0">
        {/* Kind chip */}
        <span
          className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded font-mono uppercase flex-none"
          style={{
            background: "rgba(15,23,42,0.04)",
            color: "#374151",
            fontSize: 9,
            letterSpacing: "0.10em",
            fontWeight: 600,
          }}
        >
          <Icon className="w-2.5 h-2.5" strokeWidth={2.2} />
          {label}
        </span>

        {/* Worker chip */}
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[12px] flex-none"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
          }}
        >
          {signal.worker.emoji}
        </span>

        {/* Subject — the value */}
        <span
          className="text-[12.5px] min-w-0 flex-1 truncate"
          style={{
            color: "#0A0A0A",
            lineHeight: 1.4,
            fontWeight: isUnread ? 500 : 400,
          }}
          title={signal.subject}
        >
          {signal.subject}
        </span>

        {/* ago */}
        <span
          className="font-mono flex-none"
          style={{ color: "#9CA3AF", fontSize: 10.5 }}
        >
          {fmtAgo(signal.createdAt)}
        </span>

        {/* Execute via Wren — dispatch the signal to the worker pool.
            Posts a paid task to the device's board; Wren typically
            claims it on the next tick. Hidden when the kind isn't
            something a worker can act on. */}
        {dispatchable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void onDispatch();
            }}
            disabled={dispatching || dispatched}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono flex-none transition disabled:opacity-100"
            style={{
              background: dispatched
                ? "rgba(34,197,94,0.18)"
                : "#0A0A0A",
              color: dispatched ? "#15803D" : "#FFFFFF",
              fontSize: 10.5,
              fontWeight: 600,
            }}
            title={
              dispatched
                ? "Wren is on it"
                : "Dispatch this opportunity to Wren"
            }
          >
            {dispatched ? (
              <>
                <Check className="w-2.5 h-2.5" strokeWidth={2.6} />
                <span className="hidden sm:inline">Dispatched</span>
              </>
            ) : (
              <>
                <Send className="w-2.5 h-2.5" strokeWidth={2.4} />
                <span className="hidden sm:inline">
                  {dispatching ? "…" : "Execute via Wren"}
                </span>
              </>
            )}
          </button>
        )}

        {/* Apply / Open source — secondary action (the link out). */}
        {signal.sourceUrl && (
          <a
            href={signal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono flex-none"
            style={{
              background: "rgba(34,197,94,0.10)",
              color: "#15803D",
              fontSize: 10.5,
              fontWeight: 600,
            }}
            title="Open source"
          >
            <span className="hidden sm:inline">
              {signal.kind === "bounty" || signal.kind === "opportunity"
                ? "Apply"
                : "Open"}
            </span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </motion.li>
  );
}
