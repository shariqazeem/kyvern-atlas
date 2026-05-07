"use client";

/**
 * InboxPageShell — Phase 3 (Final Polish + Multi-Surface).
 *
 * iPadOS Mail master/detail pattern:
 *
 *   ┌─ PAGE HEADER ───────────────────────────────────────────────┐
 *   │ ●  KVN-XXXXXXXX  ·  Solana devnet            FINDINGS · N   │
 *   ├──────────────────────┬──────────────────────────────────────┤
 *   │  FILTERS             │                                      │
 *   │  [All] [Unread]      │  ┌─ Selected finding ──────────────┐  │
 *   │  [All workers ▼]     │  │ INFO · ANNOUNCEMENT             │  │
 *   │                      │  │ Title                           │  │
 *   │  ────                │  │ 🎯 Worker · ago                 │  │
 *   │  ●  Title            │  │                                 │  │
 *   │     KIND · w · ago   │  │ Source: …                       │  │
 *   │  ●  Title            │  │ Body                            │  │
 *   │     KIND · w · ago   │  │ [Read] [Mark read] [Dismiss]    │  │
 *   │  ●  Title …          │  └─────────────────────────────────┘  │
 *   └──────────────────────┴──────────────────────────────────────┘
 *
 * Desktop: master + detail side-by-side, selection driven by `?id=`.
 * Mobile (<768px): list only; tap row pushes to /app/inbox/[id].
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Signal } from "@/lib/agents/types";
import { severityForSignal, isOnChainSignal } from "@/lib/agents/signal-severity";
import { PageShell } from "../shell/page-shell";
import { PageHeader } from "../shell/page-header";
import { FindingsList } from "./findings-list";
import { FindingDetail } from "./finding-detail";
import { InboxEmptyState } from "./inbox-empty-state";
import { FiltersBar, type InboxFilter } from "./filters-bar";

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

interface WorkerBrief {
  id: string;
  name: string;
  emoji: string;
}

interface Props {
  serial: string | null;
  network: "devnet" | "mainnet";
  paused: boolean;
  signals: SignalWithWorker[];
  workers: WorkerBrief[];
  unreadCount: number;
  totalCount: number;
  onMarkRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onSnooze: (id: string) => Promise<void>;
}

export function InboxPageShell({
  serial,
  network,
  paused,
  signals,
  workers,
  unreadCount,
  totalCount,
  onMarkRead,
  onDismiss,
  onSnooze,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams?.get("id") ?? null;

  const [filter, setFilter] = useState<InboxFilter>("all");
  const [workerFilter, setWorkerFilter] = useState<string>("all");

  const visible = useMemo(() => {
    let v = signals;
    if (workerFilter !== "all") {
      v = v.filter((s) => s.agentId === workerFilter);
    }
    if (filter === "unread") v = v.filter((s) => s.status === "unread");
    else if (filter === "critical")
      v = v.filter((s) => severityForSignal(s) === "critical");
    else if (filter === "onchain") v = v.filter(isOnChainSignal);
    else v = v.filter((s) => s.status !== "archived");
    return v;
  }, [signals, filter, workerFilter]);

  const selected = useMemo(
    () => (selectedId ? visible.find((s) => s.id === selectedId) ?? null : null),
    [visible, selectedId],
  );

  const setSelected = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(
        Array.from(searchParams?.entries() ?? []),
      );
      if (id) params.set("id", id);
      else params.delete("id");
      const qs = params.toString();
      router.replace(qs ? `/app/inbox?${qs}` : "/app/inbox", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const header = (
    <PageHeader
      left={
        <>
          <motion.span
            className="rounded-full flex-shrink-0"
            style={{
              width: 7,
              height: 7,
              background: paused ? "#F59E0B" : "#22C55E",
              boxShadow: paused
                ? "0 0 0 3px rgba(245,158,11,0.12), 0 0 8px rgba(245,158,11,0.55)"
                : "0 0 0 3px rgba(34,197,94,0.12), 0 0 8px rgba(34,197,94,0.55)",
            }}
            animate={paused ? {} : { opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            aria-label={paused ? "paused" : "online"}
          />
          <span
            className="font-mono text-[12px] sm:text-[13px] font-medium tracking-[0.04em] truncate flex-shrink-0"
            style={{ color: "#0A0A0A" }}
          >
            {serial ?? "KVN-————————"}
          </span>
          <Sep />
          <span
            className="text-[12.5px] hidden sm:inline truncate"
            style={{ color: "#6B7280" }}
          >
            Solana {network}
          </span>
        </>
      }
      right={
        <span
          className="font-mono uppercase tracking-[0.16em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
        >
          Findings · {unreadCount} unread
        </span>
      }
    />
  );

  const masterColumn = (
    <>
      <FiltersBar
        filter={filter}
        onFilter={setFilter}
        workerFilter={workerFilter}
        onWorkerFilter={setWorkerFilter}
        workers={workers}
        unreadCount={unreadCount}
        totalCount={totalCount}
      />
      <FindingsList
        signals={visible}
        selectedId={selectedId}
        onSelectDesktop={setSelected}
        network={network}
      />
    </>
  );

  const detailColumn = (
    <AnimatePresence mode="wait">
      {selected ? (
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <FindingDetail
            signal={selected}
            network={network}
            onMarkRead={onMarkRead}
            onDismiss={onDismiss}
            onSnooze={onSnooze}
          />
        </motion.div>
      ) : (
        <InboxEmptyState />
      )}
    </AnimatePresence>
  );

  return (
    <PageShell
      header={header}
      primaryZone={masterColumn}
      secondaryZone={detailColumn}
      // Inbox uses 360px master · fills detail (per spec §4.1)
      gridCols="lg:grid-cols-[360px_minmax(0,1fr)]"
    />
  );
}

function Sep({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex-shrink-0 ${className ?? ""}`}
      style={{ color: "rgba(15,23,42,0.20)", fontSize: 12 }}
    >
      ·
    </span>
  );
}
