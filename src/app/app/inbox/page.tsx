"use client";

/**
 * /app/inbox — the device's intelligence briefing.
 *
 * Transformation #4 rebuild:
 *   - Daily digest banner: "3 new findings · 1 critical · 1 on-chain · 47 ticks"
 *   - Severity-coloured cards (critical/important/info/routine)
 *   - Signal grouping by (agent, kind, subject_hash) — repeats collapse
 *   - Inline action buttons per kind (Apply / Post-as-task / Snooze / Dismiss)
 *   - Filters: All / Unread / Critical / On-chain / Worker dropdown
 *
 * Polls /api/devices/[id]/inbox every 5s. Backend untouched aside
 * from snooze + dismiss + post-as-task endpoints introduced in T4.2.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Filter, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SignalGroupCard } from "@/components/inbox/signal-group-card";
import {
  groupSignals,
  type SignalGroup,
} from "@/lib/agents/signal-group";
import {
  isOnChainSignal,
  severityForSignal,
} from "@/lib/agents/signal-severity";
import type { Signal } from "@/lib/agents/types";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface VaultBrief {
  vault: { id: string; network: "devnet" | "mainnet" };
}

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

interface Digest {
  signalsToday: number;
  criticalToday: number;
  onChainToday: number;
  thoughtsToday: number;
}

interface WorkerBrief {
  id: string;
  name: string;
  emoji: string;
}

interface LiveStatus {
  serial: string;
  network: "devnet" | "mainnet";
  paused: boolean;
}

type Filter = "all" | "unread" | "critical" | "onchain";

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

export default function InboxPage() {
  const { wallet, isLoading } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [serial, setSerial] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [network, setNetwork] = useState<"devnet" | "mainnet">("devnet");
  const [signals, setSignals] = useState<SignalWithWorker[]>([]);
  const [workers, setWorkers] = useState<WorkerBrief[]>([]);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [workerFilter, setWorkerFilter] = useState<string>("all");
  const [arrivalFlash, setArrivalFlash] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Resolve user's primary device
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
        if (vaults.length > 0) {
          setDeviceId(vaults[0].vault.id);
          setNetwork(vaults[0].vault.network ?? "devnet");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoading, wallet]);

  // Poll inbox + live-status every 5s
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
          digest: Digest;
          workers: WorkerBrief[];
        };
        const incoming = d.signals ?? [];

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
        setDigest(d.digest ?? null);
        setWorkers(d.workers ?? []);
      }
      if (statusRes.ok) {
        const s = (await statusRes.json()) as LiveStatus;
        setSerial(s.serial ?? null);
        setPaused(!!s.paused);
        if (s.network) setNetwork(s.network);
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

  // Apply filters then group
  const groups: SignalGroup<SignalWithWorker>[] = useMemo(() => {
    let visible = signals;
    if (workerFilter !== "all") {
      visible = visible.filter((s) => s.agentId === workerFilter);
    }
    if (filter === "unread") {
      visible = visible.filter((s) => s.status === "unread");
    } else if (filter === "critical") {
      visible = visible.filter((s) => severityForSignal(s) === "critical");
    } else if (filter === "onchain") {
      visible = visible.filter(isOnChainSignal);
    } else {
      // "all" — hide archived signals from the default view; user can
      // re-surface them with the unread filter pill (or future archive view).
      visible = visible.filter((s) => s.status !== "archived");
    }
    return groupSignals(visible);
  }, [signals, filter, workerFilter]);

  const criticalCount = useMemo(
    () => signals.filter((s) => severityForSignal(s) === "critical").length,
    [signals],
  );
  const onChainCount = useMemo(
    () => signals.filter(isOnChainSignal).length,
    [signals],
  );

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
      {/* Bezel-flash overlay */}
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

      {/* LED-strip header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative rounded-[18px] overflow-hidden mb-3"
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
              Findings · secondary view
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

        {/* Title row + counts */}
        <div className="relative px-5 pt-3 pb-3.5 flex items-end justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[#0A0A0A] leading-none">
              Findings
            </h1>
            <p className="text-[12.5px] text-[#6B6B6B] mt-1.5">
              Read-only feed of what your workers surfaced.{" "}
              <Link
                href="/app/tasks"
                className="underline underline-offset-2"
                style={{ color: "#15803D" }}
              >
                Jobs
              </Link>{" "}
              is where the economy lives.
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

      {/* Daily digest banner */}
      {digest && (
        <DigestBanner
          digest={digest}
          criticalCount={criticalCount}
          onChainCount={onChainCount}
        />
      )}

      {/* Filter pills + worker dropdown */}
      <div className="flex gap-2 mb-4 mt-3 flex-wrap items-center">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          All ({totalCount})
        </FilterPill>
        <FilterPill
          active={filter === "unread"}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </FilterPill>
        {criticalCount > 0 && (
          <FilterPill
            active={filter === "critical"}
            onClick={() => setFilter("critical")}
            tone="#DC2626"
          >
            Critical ({criticalCount})
          </FilterPill>
        )}
        {onChainCount > 0 && (
          <FilterPill
            active={filter === "onchain"}
            onClick={() => setFilter("onchain")}
            tone="#D97706"
          >
            On-chain ({onChainCount})
          </FilterPill>
        )}
        {workers.length > 0 && (
          <WorkerDropdown
            workers={workers}
            value={workerFilter}
            onChange={setWorkerFilter}
          />
        )}
      </div>

      {/* Signal feed */}
      {groups.length === 0 ? (
        <EmptyInbox
          unread={filter === "unread"}
          hasAnySignals={signals.length > 0}
        />
      ) : (
        <div className="space-y-3 mt-1">
          <AnimatePresence initial={false}>
            {groups.map((g) => (
              <SignalGroupCard
                key={g.id}
                group={g}
                network={network}
                onChange={() => void load()}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ── DigestBanner ───────────────────────────────────────────────────── */

function DigestBanner({
  digest,
  criticalCount,
  onChainCount,
}: {
  digest: Digest;
  criticalCount: number;
  onChainCount: number;
}) {
  const items: Array<{ label: string; value: string; tone?: string }> = [
    { label: "new findings today", value: String(digest.signalsToday) },
  ];
  if (criticalCount > 0)
    items.push({
      label: "critical",
      value: String(criticalCount),
      tone: "#DC2626",
    });
  if (onChainCount > 0)
    items.push({
      label: "on-chain action",
      value: String(onChainCount),
      tone: "#D97706",
    });
  items.push({
    label: digest.thoughtsToday === 1 ? "tick" : "ticks",
    value: String(digest.thoughtsToday),
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="rounded-[12px] px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1"
      style={{
        background: "rgba(15,23,42,0.025)",
        border: "1px solid rgba(15,23,42,0.06)",
      }}
    >
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ color: "#9CA3AF", fontSize: 9.5 }}
      >
        Today
      </span>
      {items.map((it, i) => (
        <span
          key={`${it.label}-${i}`}
          className="font-mono"
          style={{ color: "#374151", fontSize: 11.5 }}
        >
          <span
            style={{
              color: it.tone ?? "#0A0A0A",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {it.value}
          </span>
          <span style={{ color: "#9CA3AF", marginLeft: 4 }}>{it.label}</span>
        </span>
      ))}
    </motion.div>
  );
}

/* ── FilterPill / WorkerDropdown ────────────────────────────────────── */

function FilterPill({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: string;
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
        background: active ? tone ?? "#0A0A0A" : "#FFFFFF",
        color: active ? "#FFFFFF" : tone ?? "#6B7280",
        border: active
          ? `1px solid ${tone ?? "#0A0A0A"}`
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

function WorkerDropdown({
  workers,
  value,
  onChange,
}: {
  workers: WorkerBrief[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = workers.find((w) => w.id === value);
  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.97 }}
        className="h-8 px-3 rounded-full text-[12px] font-medium inline-flex items-center gap-1.5"
        style={{
          background: value === "all" ? "#FFFFFF" : "rgba(15,23,42,0.04)",
          color: "#374151",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 1px 1px rgba(15,23,42,0.03)",
        }}
      >
        <Filter className="w-3 h-3" />
        {selected ? `${selected.emoji} ${selected.name}` : "All workers"}
        <ChevronDown className="w-3 h-3" />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="absolute z-20 mt-1 right-0 sm:left-0 min-w-[180px] rounded-[12px] py-1"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow:
                "0 1px 2px rgba(15,23,42,0.05), 0 8px 24px -8px rgba(15,23,42,0.18)",
            }}
          >
            <DropdownItem
              active={value === "all"}
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
            >
              All workers
            </DropdownItem>
            {workers.map((w) => (
              <DropdownItem
                key={w.id}
                active={value === w.id}
                onClick={() => {
                  onChange(w.id);
                  setOpen(false);
                }}
              >
                <span className="mr-1.5">{w.emoji}</span>
                {w.name}
              </DropdownItem>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownItem({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-[12.5px] flex items-center gap-1.5"
      style={{
        background: active ? "rgba(15,23,42,0.04)" : "transparent",
        color: "#0A0A0A",
      }}
    >
      {children}
    </button>
  );
}

/* ── Empty / no-device states ───────────────────────────────────────── */

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
