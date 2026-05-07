"use client";

/**
 * /app/inbox/[id] — Mobile detail route (Phase 3 multi-surface).
 *
 * iPadOS Mail mobile pattern. The list at /app/inbox renders rows; tap
 * one and we push to this route. Renders the same FindingDetail card
 * with a "← Findings" back-link in the page header.
 *
 * Desktop users hit this route too if they share a deep link, but
 * normally desktop selection stays on /app/inbox?id= for master/detail.
 */

import { useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/device/shell/page-shell";
import { PageHeader } from "@/components/device/shell/page-header";
import { FindingDetail } from "@/components/device/inbox/finding-detail";
import type { Signal } from "@/lib/agents/types";

interface SignalWithWorker extends Signal {
  worker: { name: string; emoji: string };
}

interface VaultBrief {
  vault: { id: string; network: "devnet" | "mainnet" };
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

export default function InboxDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { wallet, isLoading } = useAuth();
  const [signal, setSignal] = useState<SignalWithWorker | null>(null);
  const [network, setNetwork] = useState<"devnet" | "mainnet">("devnet");
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  // Resolve device + load signal
  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) {
      setLoading(false);
      return;
    }
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then(async (d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length === 0) {
          setLoading(false);
          return;
        }
        const deviceId = vaults[0].vault.id;
        setNetwork(vaults[0].vault.network ?? "devnet");
        const inboxRes = await fetch(
          `/api/devices/${deviceId}/inbox?status=all&limit=200`,
        );
        if (!inboxRes.ok) {
          setLoading(false);
          return;
        }
        const inboxJson = (await inboxRes.json()) as {
          signals: SignalWithWorker[];
        };
        const found = inboxJson.signals.find((s) => s.id === params.id);
        if (!found) setNotFoundFlag(true);
        else setSignal(found);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoading, wallet, params.id]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/signals/${id}/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      });
      setSignal((s) => (s ? { ...s, status: "read" } : s));
    } catch {
      /* ignore */
    }
  }, []);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await fetch(`/api/signals/${id}/dismiss`, { method: "POST" });
      setSignal((s) => (s ? { ...s, status: "archived" } : s));
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
      setSignal((s) =>
        s
          ? {
              ...s,
              status: "read",
              snoozedUntil: Date.now() + 4 * 60 * 60 * 1000,
            }
          : s,
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

  if (notFoundFlag) {
    notFound();
  }

  if (!signal) {
    return (
      <div className="py-20 text-center">
        <p className="text-[14px]" style={{ color: "#6B7280" }}>
          Finding not found.
        </p>
      </div>
    );
  }

  const header = (
    <PageHeader
      back={{ href: "/app/inbox", label: "Findings" }}
      left={
        <span
          className="text-[12.5px] truncate"
          style={{ color: "#6B7280" }}
        >
          {signal.worker.emoji} {signal.worker.name}
        </span>
      }
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <PageShell
        header={header}
        primaryZone={
          <FindingDetail
            signal={signal}
            network={network}
            onMarkRead={handleMarkRead}
            onDismiss={handleDismiss}
            onSnooze={handleSnooze}
          />
        }
      />
    </motion.div>
  );
}
