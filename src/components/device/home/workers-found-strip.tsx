"use client";

/**
 * WorkersFoundStrip — the headline of the device home.
 *
 * Renders the last 2-3 unread signals as a horizontal swipeable strip
 * ABOVE the balance/workers/budget block on /app. This is the daily
 * reason the owner opens the app: "what did my workers find while I
 * was away?"
 *
 * Polls /api/devices/[id]/inbox?status=unread&limit=3 every 5s.
 *
 * If there are no unread signals, the strip collapses to a slim hint
 * card instead of taking up vertical real estate. This keeps the
 * device home focused without an empty placeholder feeling like a bug.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Signal } from "@/lib/agents/types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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

/** Compress a signal subject into a chip-friendly headline. The full
 *  subject is shown on the Inbox card; here we want a glanceable
 *  summary that reads at a tap-distance. Strategy: take the first
 *  meaningful 26 chars, soft-wrap on word, append ellipsis if needed. */
function summarize(subject: string, max = 36): string {
  const t = subject.trim();
  if (t.length <= max) return t;
  // Prefer cutting at a word boundary
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max - 10 ? cut.slice(0, lastSpace) : cut) + "…";
}

interface WorkersFoundStripProps {
  deviceId: string;
}

export function WorkersFoundStrip({ deviceId }: WorkersFoundStripProps) {
  const [signals, setSignals] = useState<SignalWithWorker[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(`/api/devices/${deviceId}/inbox?status=unread&limit=3`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive || !d) return;
          setSignals((d.signals ?? []) as SignalWithWorker[]);
          setUnread(d.unreadCount ?? 0);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    };
    load();
    const iv = setInterval(load, 5_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [deviceId]);

  const hasSignals = signals.length > 0;

  return (
    <div className="w-full">
      {/* Header row — eyebrow + view-all link */}
      <div className="flex items-end justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Sparkles
            className="w-3 h-3"
            strokeWidth={2}
            style={{ color: hasSignals ? "#15803D" : "#9CA3AF" }}
          />
          <div
            className="font-mono uppercase tracking-[0.14em]"
            style={{
              color: "#9CA3AF",
              fontSize: 9.5,
            }}
          >
            Your workers found
          </div>
          {unread > 0 && (
            <span
              className="ml-1 normal-case tracking-normal font-mono"
              style={{ color: "#15803D", fontSize: 10 }}
            >
              {unread} new
            </span>
          )}
        </div>
        <Link
          href="/app/inbox"
          className="font-mono uppercase tracking-[0.14em] flex items-center gap-1 hover:text-[#0A0A0A] transition"
          style={{ color: "#6B7280", fontSize: 9.5 }}
        >
          Inbox
          <ArrowRight className="w-2.5 h-2.5" strokeWidth={2} />
        </Link>
      </div>

      {/* Body */}
      {!loaded ? (
        <SkeletonStrip />
      ) : hasSignals ? (
        <div
          ref={scrollerRef}
          className="relative -mx-1 px-1 overflow-x-auto scrollbar-none"
          style={{
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="flex gap-2.5 min-w-max">
            <AnimatePresence initial={false}>
              {signals.slice(0, 3).map((s) => (
                <FoundCard key={s.id} signal={s} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <EmptyStripCard />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   FoundCard — one mini notification in the horizontal strip.
   Tap → /app/inbox.
   ──────────────────────────────────────────────────────────────────── */

function FoundCard({ signal }: { signal: SignalWithWorker }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.32, ease: EASE }}
      style={{ scrollSnapAlign: "start" }}
    >
      <Link
        href="/app/inbox"
        className="block rounded-[14px] active:scale-[0.985] transition"
        style={{
          width: 168,
          minHeight: 86,
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "0 1px 2px rgba(15,23,42,0.04)",
            "0 6px 14px -6px rgba(15,23,42,0.08)",
          ].join(", "),
        }}
      >
        <div className="px-3 pt-2.5 pb-2 h-full flex flex-col">
          {/* Worker line */}
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[12px] flex-none"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #F4F5F7 100%)",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              {signal.worker.emoji}
            </span>
            <span
              className="font-mono truncate"
              style={{
                color: "#374151",
                fontSize: 10.5,
                letterSpacing: "0.02em",
                fontWeight: 500,
              }}
            >
              {signal.worker.name}
            </span>
          </div>

          {/* Subject summary — 1-2 lines max */}
          <div
            className="text-[#0A0A0A] mb-1.5"
            style={{
              fontSize: 12.5,
              lineHeight: 1.35,
              fontWeight: 500,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {summarize(signal.subject)}
          </div>

          {/* Footer — timestamp + unread dot */}
          <div className="mt-auto flex items-center justify-between gap-2">
            <span
              className="font-mono"
              style={{ color: "#9CA3AF", fontSize: 10 }}
            >
              {fmtAgo(signal.createdAt)}
            </span>
            {signal.status === "unread" && (
              <span
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: "#22C55E",
                  boxShadow:
                    "0 0 0 2.5px rgba(34,197,94,0.14), 0 0 6px rgba(34,197,94,0.5)",
                }}
                aria-label="unread"
              />
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   EmptyStripCard — slim placeholder when no findings yet. Pivots to
   the spawn flow rather than feeling like dead space.
   ──────────────────────────────────────────────────────────────────── */

function EmptyStripCard() {
  return (
    <Link
      href="/app/agents/spawn"
      className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 active:scale-[0.99] transition group"
      style={{
        background: "rgba(15,23,42,0.02)",
        border: "1px dashed rgba(15,23,42,0.10)",
      }}
    >
      <span className="text-[12.5px] text-[#6B7280] leading-[1.5]">
        Your workers haven&apos;t found anything yet.
      </span>
      <span className="font-mono uppercase tracking-[0.14em] flex items-center gap-1 flex-none text-[#0A0A0A] group-hover:translate-x-0.5 transition" style={{ fontSize: 10 }}>
        Spawn one
        <ArrowRight className="w-3 h-3" strokeWidth={2} />
      </span>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SkeletonStrip — loading shimmer while the first inbox call resolves.
   ──────────────────────────────────────────────────────────────────── */

function SkeletonStrip() {
  return (
    <div className="flex gap-2.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-[14px]"
          style={{
            width: 168,
            height: 86,
            background:
              "linear-gradient(110deg, rgba(15,23,42,0.04) 30%, rgba(15,23,42,0.06) 50%, rgba(15,23,42,0.04) 70%)",
            backgroundSize: "200% 100%",
            border: "1px solid rgba(15,23,42,0.05)",
            animation: `shimmer 1.6s ${i * 0.1}s ease-in-out infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}
