"use client";

/**
 * /app/inbox — Findings (Phase 3 redesign).
 *
 * iPadOS Mail master/detail pattern. Desktop: list-left + selected-
 * detail-right. Mobile: list view; tap pushes to /app/inbox/[id].
 *
 * Backend untouched — still polling /api/devices/[id]/inbox every 5s.
 * All action endpoints (POST /api/signals/[id]/mark-read · /dismiss ·
 * /snooze) are unchanged.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { InboxPageShell } from "@/components/device/inbox/inbox-page-shell";
import type { Signal } from "@/lib/agents/types";

interface VaultBrief {
  vault: { id: string; network: "devnet" | "mainnet" };
}

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
          workers: WorkerBrief[];
        };
        setSignals(d.signals ?? []);
        setUnreadCount(d.unreadCount ?? 0);
        setTotalCount(d.totalCount ?? 0);
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

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/signals/${id}/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "read" }),
        });
        setSignals((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: "read" } : s)),
        );
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await fetch(`/api/signals/${id}/dismiss`, { method: "POST" });
      setSignals((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "archived" } : s)),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const handleSnooze = useCallback(async (id: string) => {
    try {
      await fetch(`/api/signals/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: 4 }),
      });
      setSignals((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: "read",
                snoozedUntil: Date.now() + 4 * 60 * 60 * 1000,
              }
            : s,
        ),
      );
    } catch {
      /* ignore */
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{
            borderColor: "rgba(0,0,0,0.08)",
            borderTopColor: "#0A0A0A",
          }}
        />
      </div>
    );
  }

  if (!deviceId) {
    return (
      <div className="py-20 text-center">
        <p className="text-[14px]" style={{ color: "#6B7280" }}>
          No device yet. Visit /unbox to create one.
        </p>
      </div>
    );
  }

  return (
    <InboxPageShell
      serial={serial}
      network={network}
      paused={paused}
      signals={signals}
      workers={workers}
      unreadCount={unreadCount}
      totalCount={totalCount}
      onMarkRead={handleMarkRead}
      onDismiss={handleDismiss}
      onSnooze={handleSnooze}
    />
  );
}
