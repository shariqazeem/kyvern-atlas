"use client";

/**
 * /app/inbox — Path C surface.
 *
 * Workers find things in the world, format them as structured signals,
 * and surface them here. Each card is a finding the owner should read.
 *
 * Light/OS register. Polls /api/devices/[id]/inbox every 5s. New signals
 * slide in from the top via the SignalCard's AnimatePresence entrance.
 *
 * Empty state: a dark hardware card that nudges to /app/agents/spawn.
 * Tab bar handles the unread-count badge separately.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox as InboxIcon, ArrowRight } from "lucide-react";
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

type Filter = "all" | "unread";

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

export default function InboxPage() {
  const { wallet, isLoading } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [signals, setSignals] = useState<SignalWithWorker[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

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

  // Poll inbox every 5s
  const load = useCallback(async () => {
    if (!deviceId) return;
    try {
      const res = await fetch(`/api/devices/${deviceId}/inbox?status=all&limit=100`);
      if (!res.ok) return;
      const d = (await res.json()) as {
        signals: SignalWithWorker[];
        unreadCount: number;
        totalCount: number;
      };
      setSignals(d.signals ?? []);
      setUnreadCount(d.unreadCount ?? 0);
      setTotalCount(d.totalCount ?? 0);
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="mb-5"
      >
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-[#0A0A0A]">
            Inbox
          </h1>
          <span className="text-[11px] font-mono" style={{ color: "#9CA3AF" }}>
            {totalCount} total · {unreadCount} unread
          </span>
        </div>
        <p className="text-[13px] text-[#6B6B6B]">
          What your workers found while you were away.
        </p>
      </motion.div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          All ({totalCount})
        </FilterPill>
        <FilterPill active={filter === "unread"} onClick={() => setFilter("unread")}>
          Unread ({unreadCount})
        </FilterPill>
      </div>

      {/* Signal feed */}
      {visible.length === 0 ? (
        <EmptyInbox unread={filter === "unread"} hasAnySignals={signals.length > 0} />
      ) : (
        <div className="space-y-3">
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
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-4 rounded-full text-[12px] font-medium transition-colors active:scale-[0.97]"
      style={{
        background: active ? "#0A0A0A" : "transparent",
        color: active ? "#fff" : "#6B7280",
        border: active ? "none" : "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {children}
    </button>
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
        className="rounded-[16px] py-10 text-center"
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.05)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <p className="text-[13px]" style={{ color: "#6B7280" }}>
          Nothing new. Caught up.
        </p>
      </div>
    );
  }

  // True empty state — dark hardware card to invite the spawn flow
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-[20px] overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 12px 40px -12px rgba(0,0,0,0.45)",
      }}
    >
      <div className="px-6 py-10 text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <InboxIcon className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
        </div>
        <h3
          className="font-mono mb-2"
          style={{
            color: "rgba(255,255,255,0.95)",
            fontSize: "16px",
            letterSpacing: "0.01em",
          }}
        >
          Your workers haven&apos;t found anything yet.
        </h3>
        <p
          className="text-[13px] mb-5 max-w-[320px] mx-auto leading-relaxed"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Spawn one and point it at a wallet, a bounty board, or a feed
          you&apos;d normally check yourself.
        </p>
        <Link
          href="/app/agents/spawn"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-[12px] text-[13px] font-semibold transition active:scale-[0.97]"
          style={{ background: "white", color: "#0A0A0A" }}
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
