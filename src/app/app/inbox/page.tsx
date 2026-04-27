"use client";

/**
 * /app/inbox — the device's notification center.
 *
 * Top: LED-strip header showing online dot · KVN-XXXX serial · counts.
 * Below: filter pills (All / Unread). Below that: the "Still on watch"
 * status row — workers that are looking but haven't surfaced anything
 * yet — rendered as a small LED strip so an empty inbox doesn't read
 * as broken. Then the signal feed.
 *
 * When a brand-new signal arrives, the page bezel briefly flashes
 * green and a "new notification" pulse plays at the top of the feed.
 *
 * Light premium register everywhere. Polls /api/devices/[id]/inbox +
 * live-status every 5s. Backend untouched.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SignalCard } from "@/components/inbox/signal-card";
import type { Signal } from "@/lib/agents/types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface VaultBrief {
  vault: { id: string };
}

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

interface WorkerBrief {
  id: string;
  name: string;
  emoji: string;
  template: string;
  lastThoughtAt: number | null;
  totalThoughts: number;
}

interface LiveStatus {
  serial: string;
  network: "devnet" | "mainnet";
  paused: boolean;
  workers?: WorkerBrief[];
}

type Filter = "all" | "unread";

function fmtAgo(ms: number | null): string {
  if (ms == null) return "warming up";
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

export default function InboxPage() {
  const { wallet, isLoading } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [serial, setSerial] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [signals, setSignals] = useState<SignalWithWorker[]>([]);
  const [workers, setWorkers] = useState<WorkerBrief[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [arrivalFlash, setArrivalFlash] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Find the user's primary device
  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) {
      setLoading(false);
      return;
    }
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) setDeviceId(vaults[0].vault.id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoading, wallet]);

  // Poll inbox + live-status every 5s.
  const load = useCallback(async () => {
    if (!deviceId) return;
    try {
      const [inboxRes, statusRes] = await Promise.all([
        fetch(`/api/devices/${deviceId}/inbox?status=all&limit=100`),
        fetch(`/api/devices/${deviceId}/live-status`),
      ]);
      if (inboxRes.ok) {
        const d = (await inboxRes.json()) as {
          signals: SignalWithWorker[];
          unreadCount: number;
          totalCount: number;
        };
        const incoming = d.signals ?? [];

        // Detect "first time we see this signal id" since the page mounted
        if (isFirstLoad.current) {
          for (const s of incoming) seenIds.current.add(s.id);
          isFirstLoad.current = false;
        } else {
          let hadNew = false;
          for (const s of incoming) {
            if (!seenIds.current.has(s.id)) {
              seenIds.current.add(s.id);
              hadNew = true;
            }
          }
          if (hadNew) {
            setArrivalFlash(true);
            window.setTimeout(() => setArrivalFlash(false), 1400);
          }
        }

        setSignals(incoming);
        setUnreadCount(d.unreadCount ?? 0);
        setTotalCount(d.totalCount ?? 0);
      }
      if (statusRes.ok) {
        const s = (await statusRes.json()) as LiveStatus;
        setWorkers(s.workers ?? []);
        setSerial(s.serial ?? null);
        setPaused(!!s.paused);
      }
    } catch {
      /* silent */
    }
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    void load();
    const iv = setInterval(load, 5_000);
    return () => clearInterval(iv);
  }, [deviceId, load]);

  const visible = useMemo(() => {
    if (filter === "unread") return signals.filter((s) => s.status === "unread");
    return signals;
  }, [signals, filter]);

  const watchingWorkers = useMemo(() => {
    if (workers.length === 0) return [];
    const idsWithSignals = new Set(signals.map((s) => s.agentId));
    return workers.filter(
      (w) => w.template === "whale_tracker" && !idsWithSignals.has(w.id),
    );
  }, [workers, signals]);

  const onMarkRead = (id: string) => {
    setSignals((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "read" as const } : s)),
    );
    setUnreadCount((n) => Math.max(0, n - 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "#0A0A0A" }}
        />
      </div>
    );
  }

  if (!deviceId) {
    return <NoDeviceState />;
  }

  return (
    <div className="py-2 pb-24">
      {/* Bezel-flash overlay — fires when a brand-new signal lands */}
      <AnimatePresence>
        {arrivalFlash && (
          <motion.div
            key="arrival-flash"
            aria-hidden
            className="pointer-events-none fixed inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{
              boxShadow:
                "inset 0 0 0 2px rgba(34,197,94,0.55), inset 0 0 60px rgba(34,197,94,0.18)",
            }}
          />
        )}
      </AnimatePresence>

      {/* LED-strip status header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative rounded-[18px] overflow-hidden mb-4"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8FA 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "0 1px 2px rgba(15,23,42,0.04)",
            "0 8px 24px -10px rgba(15,23,42,0.08)",
          ].join(", "),
        }}
      >
        <div
          aria-hidden
          className="absolute top-0 left-6 right-6 pointer-events-none"
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,1), transparent)",
          }}
        />

        {/* LED strip top — online dot · KVN-XXXX */}
        <div
          className="relative flex items-center justify-between px-5 pt-3 pb-2.5"
          style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <motion.span
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                background: paused ? "#EF4444" : "#22C55E",
                boxShadow: paused
                  ? "0 0 0 3px rgba(239,68,68,0.12), 0 0 8px rgba(239,68,68,0.55)"
                  : "0 0 0 3px rgba(34,197,94,0.12), 0 0 8px rgba(34,197,94,0.55)",
              }}
              animate={paused ? {} : { opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className="font-mono text-[10px] uppercase"
              style={{
                color: paused ? "#B91C1C" : "#15803D",
                letterSpacing: "0.14em",
              }}
            >
              Notification Center
            </span>
          </div>
          <span
            className="font-mono text-[11px] tracking-[0.08em]"
            style={{
              color: "#374151",
              textShadow: "0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            {serial ?? "KVN-————————"}
          </span>
        </div>

        {/* Title + counts */}
        <div className="relative px-5 pt-3 pb-3.5 flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[#0A0A0A] leading-none">
              Inbox
            </h1>
            <p className="text-[12.5px] text-[#6B6B6B] mt-1.5">
              What your workers found while you were away.
            </p>
          </div>
          <div
            className="font-mono flex items-center gap-2.5 mb-0.5"
            style={{ color: "#9CA3AF", fontSize: 11 }}
          >
            <span>
              <span style={{ color: "#0A0A0A", fontWeight: 600 }}>
                {totalCount}
              </span>{" "}
              total
            </span>
            <span style={{ color: "#D1D5DB" }}>·</span>
            <span>
              <span
                style={{
                  color: unreadCount > 0 ? "#15803D" : "#0A0A0A",
                  fontWeight: 600,
                }}
              >
                {unreadCount}
              </span>{" "}
              unread
            </span>
          </div>
        </div>
      </motion.div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          All ({totalCount})
        </FilterPill>
        <FilterPill
          active={filter === "unread"}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </FilterPill>
      </div>

      {/* "Still on watch" LED strip — pinned at the top so an empty
          inbox immediately reads as "your workers are alive". */}
      {watchingWorkers.length > 0 && (
        <WatchingStrip workers={watchingWorkers} />
      )}

      {/* Signal feed */}
      {visible.length === 0 ? (
        <EmptyInbox
          unread={filter === "unread"}
          hasAnySignals={signals.length > 0}
        />
      ) : (
        <div className="space-y-3 mt-1">
          <AnimatePresence initial={false}>
            {visible.map((s) => (
              <SignalCard key={s.id} signal={s} onMarkRead={onMarkRead} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.6 }}
      className="h-8 px-4 rounded-full text-[12px] font-medium transition-colors"
      style={{
        background: active ? "#0A0A0A" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#6B7280",
        border: active
          ? "1px solid #0A0A0A"
          : "1px solid rgba(15,23,42,0.08)",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10)"
          : "0 1px 1px rgba(15,23,42,0.03)",
      }}
    >
      {children}
    </motion.button>
  );
}

function EmptyInbox({
  unread,
  hasAnySignals,
}: {
  unread: boolean;
  hasAnySignals: boolean;
}) {
  if (unread && hasAnySignals) {
    return (
      <div
        className="rounded-[16px] py-10 text-center mt-2"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.05)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
        }}
      >
        <p className="text-[13px]" style={{ color: "#6B7280" }}>
          Nothing new. Caught up.
        </p>
      </div>
    );
  }

  // Light empty state — premium register, nudges to spawn flow
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative rounded-[20px] overflow-hidden mt-2"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8FA 100%)",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,1)",
          "0 1px 2px rgba(15,23,42,0.04)",
          "0 12px 32px -12px rgba(15,23,42,0.10)",
        ].join(", "),
      }}
    >
      <div
        aria-hidden
        className="absolute top-0 left-8 right-8 pointer-events-none"
        style={{
          height: 1,
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,1), transparent)",
        }}
      />
      <div className="relative px-6 py-12 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-[26px]"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow:
              "inset 0 1px 2px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          🌱
        </div>
        <h3 className="text-[18px] font-semibold text-[#0A0A0A] tracking-tight mb-1.5">
          Your workers haven&apos;t found anything yet.
        </h3>
        <p
          className="text-[13px] mb-5 max-w-[320px] mx-auto leading-relaxed"
          style={{ color: "#6B7280" }}
        >
          Hire one and point it at a wallet, a bounty board, or a feed
          you&apos;d normally check yourself.
        </p>
        <Link
          href="/app/agents/spawn"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-[12px] text-[13px] font-semibold transition active:scale-[0.97]"
          style={{
            background: "#0A0A0A",
            color: "#fff",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.10), 0 8px 18px -6px rgba(15,23,42,0.30)",
          }}
        >
          Hire a worker
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

function WatchingStrip({ workers }: { workers: WorkerBrief[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
      className="rounded-[14px] mb-3 overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 pt-2.5 pb-1.5"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.04)" }}
      >
        <div
          className="font-mono uppercase flex items-center gap-1.5"
          style={{
            color: "#9CA3AF",
            fontSize: "9.5px",
            letterSpacing: "0.14em",
          }}
        >
          <motion.span
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "#22C55E",
              boxShadow: "0 0 0 2px rgba(34,197,94,0.14)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          Still on watch
        </div>
        <span
          className="font-mono"
          style={{ color: "#9CA3AF", fontSize: "10px" }}
        >
          {workers.length} {workers.length === 1 ? "worker" : "workers"}
        </span>
      </div>
      <ul className="divide-y" style={{ borderColor: "rgba(15,23,42,0.04)" }}>
        {workers.map((w) => (
          <li
            key={w.id}
            className="flex items-center gap-2.5 px-4 py-2"
            style={{ borderTop: "1px solid rgba(15,23,42,0.04)" }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] shrink-0"
              style={{
                background:
                  "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
              }}
            >
              {w.emoji}
            </span>
            <span className="text-[12.5px] text-[#0A0A0A]" style={{ fontWeight: 500 }}>
              {w.name}
            </span>
            <span className="ml-auto font-mono text-[10.5px]" style={{ color: "#9CA3AF" }}>
              last check {fmtAgo(w.lastThoughtAt)}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function NoDeviceState() {
  return (
    <div className="py-16 text-center">
      <p className="text-[14px] text-[#6B6B6B] mb-3">
        You need a device before you can have an Inbox.
      </p>
      <Link
        href="/vault/new"
        className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[12px] text-[13px] font-semibold"
        style={{ background: "#0A0A0A", color: "#fff" }}
      >
        Get your Kyvern
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
