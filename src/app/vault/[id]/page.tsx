"use client";

/**
 * /vault/[id] — Full-screen interactive device view.
 *
 * No sidebar, no SaaS chrome. Just your device running in the dark.
 * Polls the vault API every 5s for live data.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { KyvernDevice } from "@/components/device/kyvern-device";
import type {
  DeviceAtlasState,
  DeviceFeedItem,
} from "@/components/device/kyvern-device";
import type {
  Vault,
  Payment,
  BudgetSnapshot,
} from "@/components/vault/types";
import { EASE_PREMIUM as ease } from "@/lib/motion";

interface DashboardPayload {
  vault: Vault;
  budget: BudgetSnapshot;
  payments: Payment[];
}

export default function VaultDevicePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      try {
        if (!opts.silent) setLoading(true);
        const res = await fetch(`/api/vault/${id}?limit=50`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Device not found");
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as DashboardPayload;
        setData(json);
        setError(null);
      } catch (e) {
        if (!opts.silent) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Poll every 5s while tab is visible
  useEffect(() => {
    function start() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => void load({ silent: true }), 5000);
    }
    function stop() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    function onVis() {
      if (document.visibilityState === "visible") { start(); } else { stop(); }
    }
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  // Toggle pause
  const handleKill = useCallback(async () => {
    if (!data) return;
    const method = data.vault.pausedAt ? "DELETE" : "POST";
    try {
      await fetch(`/api/vault/${id}/pause`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": data.vault.ownerWallet,
        },
        body: JSON.stringify({ ownerWallet: data.vault.ownerWallet }),
      });
      await load({ silent: true });
    } catch {
      /* silent */
    }
  }, [data, id, load]);

  // Transform vault data → device format
  const deviceState: DeviceAtlasState | null = data
    ? {
        running: !data.vault.pausedAt,
        uptimeMs: Date.now() - new Date(data.vault.createdAt).getTime(),
        totalSettled: data.payments.filter(
          (p) => p.status === "settled" || p.status === "allowed",
        ).length,
        totalSpentUsd: data.budget.spentToday + data.budget.spentThisWeek * 0, // spentToday is the main metric
        totalAttacksBlocked: data.payments.filter(
          (p) => p.status === "blocked",
        ).length,
        fundsLostUsd: 0,
        firstIgnitionAt: data.vault.createdAt,
        network: data.vault.network,
        policy: {
          dailyCapUsd: data.budget.dailyLimitUsd,
          spentTodayUsd: data.budget.spentToday,
          spendUtilization: data.budget.dailyUtilization,
        },
        nextCycleAt: null,
      }
    : null;

  const deviceFeed: DeviceFeedItem[] = data
    ? data.payments.slice(0, 20).map((p) => ({
        id: p.id,
        _kind: "decision" as const,
        _when: p.createdAt,
        merchant: p.merchant,
        amountUsd: p.amountUsd,
        outcome: p.status,
        txSignature: p.txSignature,
        blockedReason: p.reason,
      }))
    : [];

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-5 h-5 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              borderTopColor: "#00ff88",
            }}
          />
          <p className="font-mono text-[11px] text-white/20">
            Loading device...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-[14px] text-white/50 mb-2">{error}</p>
          <Link
            href="/app"
            className="font-mono text-[12px] text-white/30 underline"
          >
            Back to devices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal top bar */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="flex items-center justify-between px-5 sm:px-8 h-14 shrink-0"
      >
        <Link
          href="/app"
          className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-mono text-[11px] tracking-wider">
            DEVICES
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-white/20">
            {data?.vault.network.toUpperCase()}
          </span>
          <VaultIdCopy vaultId={id} />
        </div>
      </motion.nav>

      {/* Device centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        {/* Device name above */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-6"
        >
          <p className="font-mono text-[10px] tracking-[0.15em] text-white/25 mb-1">
            YOUR DEVICE
          </p>
          <h1 className="text-[20px] font-semibold text-white/80">
            {data?.vault.emoji} {data?.vault.name}
          </h1>
        </motion.div>

        {/* The device */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <KyvernDevice
            state={deviceState}
            feed={deviceFeed}
            agentName={data?.vault.name?.toUpperCase() ?? "AGENT"}
            onKill={handleKill}
            bootDelay={600}
          />
        </motion.div>

        {/* Quick info below device */}
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-8 flex items-center gap-6"
          >
            <InfoPill
              label="Squads"
              value={truncate(data.vault.squadsAddress, 8, 4)}
              href={`https://explorer.solana.com/address/${data.vault.squadsAddress}?cluster=${data.vault.network}`}
            />
            {data.vault.spendingLimitPda && (
              <InfoPill
                label="Policy"
                value={truncate(data.vault.spendingLimitPda, 8, 4)}
                href={`https://explorer.solana.com/address/${data.vault.spendingLimitPda}?cluster=${data.vault.network}`}
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */

function truncate(s: string, lead = 8, tail = 4): string {
  if (s.length <= lead + tail + 1) return s;
  return `${s.slice(0, lead)}...${s.slice(-tail)}`;
}

function VaultIdCopy({ vaultId }: { vaultId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(vaultId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 font-mono text-[11px] text-white/20 hover:text-white/40 transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {vaultId.slice(0, 10)}...
    </button>
  );
}

function InfoPill({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-white/[0.03]"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="font-mono text-[9px] tracking-wider text-white/25">
        {label}
      </span>
      <span className="font-mono text-[11px] text-white/40">{value}</span>
    </a>
  );
}
