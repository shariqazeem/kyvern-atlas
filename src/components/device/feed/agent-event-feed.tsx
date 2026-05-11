"use client";

/**
 * AgentEventFeed — live event feed for the user's own vault.
 *
 * Per TRANSFORM_24H §T1. Polls /api/vault/[id]/events every 3s. New
 * rows fade in at the top. Each row expands on click → memo,
 * signature, Explorer link.
 *
 * Empty state copy is the bridge into the wizard:
 *   "Mint a key + run the snippet on the left.
 *    Your first event lands here in seconds."
 *
 * Visual register matches the device chassis — JetBrains Mono for
 * numbers, Apple-Settings card with a thin status pill per row.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Loader2,
  Radio,
  X as XIcon,
} from "lucide-react";

const POLL_MS = 3000;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface VaultEvent {
  id: string;
  ts: string;            // ISO
  merchant: string;
  amountUsd: number;
  status: "allowed" | "blocked" | "settled" | "failed" | string;
  reason?: string | null;
  memo?: string | null;
  txSignature?: string | null;
  explorerUrl?: string | null;
}

type Filter = "all" | "settled" | "blocked";

interface Props {
  vaultId: string | null;
  ownerWallet: string | null;
  className?: string;
  /** Optional: notify parent when a new event lands so the wizard
   *  can mark the relevant step complete. */
  onNewEvent?: (event: VaultEvent) => void;
}

export function AgentEventFeed({
  vaultId,
  ownerWallet,
  className,
  onNewEvent,
}: Props) {
  const [events, setEvents] = useState<VaultEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const latestTsRef = useRef<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Poll. Initial fetch returns up to 50; subsequent ticks use
  // ?since=<latestTs> for cheap delta fetches.
  useEffect(() => {
    if (!vaultId || !ownerWallet) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const params = new URLSearchParams();
        params.set("limit", "50");
        if (latestTsRef.current) params.set("since", latestTsRef.current);
        const r = await fetch(
          `/api/vault/${vaultId}/events?${params.toString()}`,
          {
            headers: { "x-owner-wallet": ownerWallet },
          },
        );
        if (!r.ok) {
          // 401s on first paint are common: useAuth hydrates a beat
          // after vaultId resolves, so the very first poll can race
          // ahead of the wallet header. Swallow 401s silently — the
          // 3s retry will succeed once auth catches up. Only surface
          // genuine errors to the user.
          if (r.status !== 401 && !cancelled) {
            setError(`HTTP ${r.status}`);
            setLoading(false);
          } else if (!cancelled) {
            setLoading(false);
          }
          return;
        }
        const data = (await r.json()) as {
          ok: boolean;
          events: VaultEvent[];
          latestTs: string | null;
        };
        if (cancelled) return;
        if (data.ok) {
          if (!latestTsRef.current && data.events.length > 0) {
            // Initial load — populate.
            setEvents(data.events);
            data.events.forEach((e) => seenIdsRef.current.add(e.id));
          } else if (data.events.length > 0) {
            // Delta — prepend new ones we haven't seen.
            const newOnes = data.events.filter(
              (e) => !seenIdsRef.current.has(e.id),
            );
            if (newOnes.length > 0) {
              newOnes.forEach((e) => {
                seenIdsRef.current.add(e.id);
                onNewEvent?.(e);
              });
              setEvents((prev) => [...newOnes, ...prev].slice(0, 50));
            }
          }
          if (data.latestTs) latestTsRef.current = data.latestTs;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [vaultId, ownerWallet, onNewEvent]);

  // T4 polish — track which event ids have just landed so the row
  // can pulse green for ~1.5s. Hypnotic-feel cue: a judge sees their
  // tx land in real time, glowing.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (events.length === 0) return;
    const newest = events[0];
    if (!newest) return;
    setFreshIds((prev) => {
      if (prev.has(newest.id)) return prev;
      const next = new Set(prev);
      next.add(newest.id);
      return next;
    });
    const t = setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        next.delete(newest.id);
        return next;
      });
    }, 1800);
    return () => clearTimeout(t);
  }, [events]);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    if (filter === "settled")
      return events.filter((e) => e.status === "settled" || e.status === "allowed");
    return events.filter((e) => e.status === "blocked" || e.status === "failed");
  }, [events, filter]);

  const empty = events.length === 0;

  return (
    <div
      className={`flex flex-col rounded-[14px] overflow-hidden ${className ?? ""}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-3.5 py-2.5 flex-wrap"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Radio
            className="w-3.5 h-3.5 flex-shrink-0"
            strokeWidth={2}
            style={{ color: empty ? "#9CA3AF" : "#22C55E" }}
          />
          <h3
            className="text-[13px] font-semibold tracking-[-0.005em] whitespace-nowrap"
            style={{ color: "#0A0A0A" }}
          >
            Live events
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip
            label="Allowed"
            active={filter === "settled"}
            onClick={() => setFilter("settled")}
          />
          <FilterChip
            label="Blocked"
            active={filter === "blocked"}
            onClick={() => setFilter("blocked")}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 360 }}>
        {loading && empty ? (
          <LoadingState />
        ) : error && empty ? (
          <ErrorState message={error} />
        ) : empty ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <FilterEmptyState filter={filter} />
        ) : (
          <ul className="divide-y" style={{ borderColor: "rgba(15,23,42,0.05)" }}>
            <AnimatePresence initial={false}>
              {filtered.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  expanded={expanded === e.id}
                  fresh={freshIds.has(e.id)}
                  onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   States
   ────────────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10 h-full">
      <div
        className="w-10 h-10 rounded-full inline-flex items-center justify-center mb-3"
        style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.18)",
        }}
      >
        <Radio className="w-4 h-4" strokeWidth={1.8} style={{ color: "#15803D" }} />
      </div>
      <p
        className="text-[13px] leading-[1.5] mb-1"
        style={{ color: "#0A0A0A" }}
      >
        Mint a key + run the snippet on the left.
      </p>
      <p className="text-[12px]" style={{ color: "#6B7280" }}>
        Your first event lands here in seconds.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center px-6 py-10 h-full">
      <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#9CA3AF" }} />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-10">
      <p className="text-[12px]" style={{ color: "#B45309" }}>
        Couldn&apos;t reach the feed: {message}
      </p>
    </div>
  );
}

function FilterEmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="flex items-center justify-center text-center px-6 py-10 h-full">
      <p className="text-[12px]" style={{ color: "#9CA3AF" }}>
        No <strong>{filter}</strong> events yet.
      </p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-mono uppercase tracking-[0.14em] rounded-full px-2 py-0.5 transition"
      style={{
        fontSize: 9,
        color: active ? "#FFFFFF" : "#6B7280",
        background: active ? "#0A0A0A" : "transparent",
        border: active ? "1px solid #0A0A0A" : "1px solid rgba(15,23,42,0.10)",
      }}
    >
      {label}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Row + expand
   ────────────────────────────────────────────────────────────────── */

function EventRow({
  event,
  expanded,
  fresh,
  onToggle,
}: {
  event: VaultEvent;
  expanded: boolean;
  fresh?: boolean;
  onToggle: () => void;
}) {
  const isBlocked = event.status === "blocked" || event.status === "failed";
  const palette = isBlocked
    ? { fg: "#B91C1C", chipBg: "rgba(220,38,38,0.10)", chipBorder: "rgba(220,38,38,0.18)" }
    : { fg: "#15803D", chipBg: "rgba(34,197,94,0.10)", chipBorder: "rgba(34,197,94,0.18)" };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{
        opacity: 1,
        y: 0,
        // Fresh-row pulse: brief tinted backdrop in the row's status
        // colour when the event first lands. Hypnotic feel — the
        // judge sees their tx land in real time, glowing.
        backgroundColor: fresh
          ? [
              "rgba(255,255,255,0)",
              isBlocked
                ? "rgba(220,38,38,0.18)"
                : "rgba(34,197,94,0.18)",
              "rgba(255,255,255,0)",
            ]
          : "rgba(255,255,255,0)",
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: fresh ? 1.6 : 0.32, ease: EASE }}
      style={{ position: "relative" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 hover:bg-black/[0.02] transition"
      >
        <span
          className="font-mono uppercase tracking-[0.12em] flex-shrink-0"
          style={{ fontSize: 9, color: "#9CA3AF", width: 56 }}
        >
          {relativeTime(event.ts)}
        </span>
        <span
          className="text-[12.5px] truncate flex-1"
          style={{ color: "#0A0A0A" }}
        >
          {event.merchant}
        </span>
        <span
          className="font-mono tabular-nums text-[12px] flex-shrink-0"
          style={{ color: "#374151", width: 56, textAlign: "right" }}
        >
          ${formatAmount(event.amountUsd)}
        </span>
        <span
          className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] rounded-full px-2 py-0.5 flex-shrink-0"
          style={{
            fontSize: 9,
            color: palette.fg,
            background: palette.chipBg,
            border: `1px solid ${palette.chipBorder}`,
          }}
        >
          {isBlocked ? (
            <XIcon className="w-2.5 h-2.5" strokeWidth={3} />
          ) : (
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          )}
          {isBlocked ? "blocked" : "settled"}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div
              className="px-3.5 pb-3 pt-0 space-y-1.5"
              style={{ background: "rgba(15,23,42,0.02)" }}
            >
              {event.reason && (
                <Line label="Reason" value={event.reason} />
              )}
              {event.memo && <Line label="Memo" value={event.memo} mono />}
              {event.txSignature && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span
                    className="font-mono uppercase tracking-[0.14em]"
                    style={{ fontSize: 9, color: "#9CA3AF" }}
                  >
                    Signature
                  </span>
                  <a
                    href={event.explorerUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono hover:underline"
                    style={{ fontSize: 11, color: "#0A0A0A" }}
                  >
                    {event.txSignature.slice(0, 8)}…{event.txSignature.slice(-6)}
                    <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function Line({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className="font-mono uppercase tracking-[0.14em] flex-shrink-0"
        style={{ fontSize: 9, color: "#9CA3AF" }}
      >
        {label}
      </span>
      <span
        className={`text-right truncate ${mono ? "font-mono" : ""}`}
        style={{ fontSize: 11.5, color: "#374151" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  // SQLite returns "YYYY-MM-DD HH:MM:SS" without TZ. Treat as UTC.
  let ts = Date.parse(iso);
  if (isNaN(ts)) {
    const norm = iso.includes("T") ? iso : iso.replace(" ", "T") + "Z";
    ts = Date.parse(norm);
  }
  if (isNaN(ts)) return iso;
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatAmount(n: number): string {
  if (n >= 100) return n.toFixed(0);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(3);
}
