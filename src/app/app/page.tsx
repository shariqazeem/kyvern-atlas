"use client";

/**
 * /app — Device Collection.
 *
 * Dark surface showing all your devices (vaults) as mini device cards.
 * Each card shows the device name, budget gauge, LED, and last activity.
 * Click a device to open its full-screen view.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { EASE_PREMIUM as ease } from "@/lib/motion";

/* ── Types ── */

interface VaultBrief {
  vault: {
    id: string;
    name: string;
    emoji: string;
    dailyLimitUsd: number;
    pausedAt: string | null;
    network: "devnet" | "mainnet";
    squadsAddress: string;
    createdAt?: string;
  };
  budget: {
    spentToday: number;
    dailyLimitUsd: number;
    dailyUtilization: number;
  };
  lastPayment: {
    merchant: string;
    amountUsd: number;
    status: string;
    createdAt: string;
  } | null;
}

/* ── Fallback wallet ── */
function devFallbackWallet(): string {
  if (typeof window === "undefined") return "";
  const KEY = "kyvern:dev-wallet";
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const a = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) s += a[Math.floor(Math.random() * a.length)];
  window.localStorage.setItem(KEY, s);
  return s;
}

export default function AppDeviceCollection() {
  const { wallet, isLoading: authLoading } = useAuth();
  const [owner, setOwner] = useState<string | null>(null);
  const [vaults, setVaults] = useState<VaultBrief[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setOwner(wallet ?? devFallbackWallet());
  }, [wallet, authLoading]);

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => !cancelled && setVaults((d?.vaults ?? []) as VaultBrief[]))
      .catch(() => !cancelled && setVaults([]));
    return () => { cancelled = true; };
  }, [owner]);

  const hasVaults = (vaults ?? []).length > 0;
  const loading = vaults === null;

  return (
    <div
      className="-mx-5 md:-mx-8 -my-8 px-5 md:px-8 py-8 min-h-[calc(100vh-56px)]"
      style={{ background: "#050505" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <p className="font-mono text-[10px] tracking-[0.15em] text-white/25 mb-1">
            YOUR DEVICES
          </p>
          <h1 className="text-[24px] font-semibold text-white/85 tracking-[-0.02em]">
            {hasVaults
              ? `${vaults!.length} device${vaults!.length > 1 ? "s" : ""}`
              : "No devices yet"}
          </h1>
        </div>
        <Link
          href="/vault/new"
          className="flex items-center gap-2 h-9 px-4 rounded-full font-mono text-[11px] font-semibold tracking-wider transition-all hover:scale-[1.02]"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          NEW DEVICE
        </Link>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[200px] rounded-[20px] animate-pulse"
              style={{ background: "rgba(255,255,255,0.03)" }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasVaults && <EmptyDevices />}

      {/* Device grid */}
      {hasVaults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vaults!.map((v, i) => (
            <DeviceCard key={v.vault.id} vault={v} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Device Card (mini device for the grid) ── */

function DeviceCard({ vault, index }: { vault: VaultBrief; index: number }) {
  const v = vault.vault;
  const b = vault.budget;
  const isActive = !v.pausedAt;
  const util = Math.min(b.dailyUtilization * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease }}
    >
      <Link href={`/vault/${v.id}`} className="block group">
        <div
          className="rounded-[20px] p-4 transition-all group-hover:scale-[1.01] group-hover:shadow-lg"
          style={{
            background: "linear-gradient(165deg, #151515 0%, #0c0c0c 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Top: name + LED */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[18px]">{v.emoji || "🧭"}</span>
              <div>
                <p className="font-mono text-[13px] font-semibold text-white/80 truncate max-w-[160px]">
                  {v.name}
                </p>
                <p className="font-mono text-[9px] text-white/25 tracking-wider">
                  {v.network.toUpperCase()}
                </p>
              </div>
            </div>
            {/* LED */}
            <div className="relative">
              <motion.div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: isActive ? "#00ff88" : "#ff4444" }}
                animate={{
                  boxShadow: [
                    `0 0 4px ${isActive ? "#00ff88" : "#ff4444"}`,
                    `0 0 10px ${isActive ? "#00ff88" : "#ff4444"}`,
                    `0 0 4px ${isActive ? "#00ff88" : "#ff4444"}`,
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>

          {/* OLED-style mini screen */}
          <div
            className="rounded-[12px] p-3 mb-3"
            style={{
              background: "#000",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            {/* Budget gauge */}
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-mono text-[9px] text-white/30 tracking-wider">
                BUDGET
              </span>
              <span className="font-mono text-[11px] text-white/60">
                ${b.spentToday.toFixed(2)}
                <span className="text-white/20"> / ${b.dailyLimitUsd.toFixed(0)}</span>
              </span>
            </div>
            <div
              className="h-[2px] rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${util}%`,
                  background:
                    util > 80
                      ? "linear-gradient(90deg, #ffaa00, #ff4444)"
                      : "#00ff88",
                }}
              />
            </div>

            {/* Last activity */}
            {vault.lastPayment && (
              <div className="mt-2.5 flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background:
                      vault.lastPayment.status === "blocked"
                        ? "#ff4444"
                        : "#00ff88",
                  }}
                />
                <span className="font-mono text-[10px] text-white/40 truncate">
                  {vault.lastPayment.merchant}
                </span>
                <span className="font-mono text-[10px] text-white/20 shrink-0 ml-auto">
                  ${vault.lastPayment.amountUsd.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-[9px] font-semibold tracking-wider px-2 py-0.5 rounded"
              style={{
                background: isActive
                  ? "rgba(0,255,136,0.1)"
                  : "rgba(255,68,68,0.1)",
                color: isActive ? "#00ff88" : "#ff4444",
              }}
            >
              {isActive ? "ACTIVE" : "PAUSED"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Empty state ── */

function EmptyDevices() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center text-center py-20"
    >
      {/* Mini device outline */}
      <div
        className="w-[120px] h-[180px] rounded-[18px] mb-6 flex items-center justify-center"
        style={{
          background: "linear-gradient(165deg, #151515 0%, #0c0c0c 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="w-[96px] h-[130px] rounded-[12px] flex items-center justify-center"
          style={{ background: "#000" }}
        >
          <span className="font-mono text-[10px] text-white/15 tracking-[0.2em]">
            KYVERN
          </span>
        </div>
      </div>

      <h2 className="text-[22px] font-semibold text-white/80 tracking-[-0.02em]">
        Get your first device.
      </h2>
      <p className="mt-2 text-[14px] text-white/30 max-w-sm leading-[1.6]">
        Create a device for your AI agent. Set its budget, allowlist, and
        spending rules — all enforced on-chain by Solana.
      </p>
      <Link
        href="/vault/new"
        className="group mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-full font-semibold text-[14px] transition-all hover:scale-[1.02]"
        style={{ background: "#00ff88", color: "#000" }}
      >
        Create your first device
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
