"use client";

/**
 * /app — KyvernOS Home Screen.
 *
 * Your devices in a clean grid. Today's stats. Recent activity.
 * White, minimal, Apple-grade.
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

function devWallet(): string {
  if (typeof window === "undefined") return "";
  const KEY = "kyvern:dev-wallet";
  const e = window.localStorage.getItem(KEY);
  if (e) return e;
  const a = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) s += a[Math.floor(Math.random() * a.length)];
  window.localStorage.setItem(KEY, s);
  return s;
}

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function OSHome() {
  const { wallet, isLoading } = useAuth();
  const [vaults, setVaults] = useState<VaultBrief[] | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) return;
    let c = false;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => !c && setVaults((d?.vaults ?? []) as VaultBrief[]))
      .catch(() => !c && setVaults([]));
    return () => { c = true; };
  }, [wallet, isLoading]);

  const loading = vaults === null;
  const hasVaults = (vaults ?? []).length > 0;
  const spentToday = (vaults ?? []).reduce((a, v) => a + v.budget.spentToday, 0);
  const activeCount = (vaults ?? []).filter((v) => !v.vault.pausedAt).length;

  return (
    <div className="py-2">
      {/* Large title */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex items-end justify-between mb-6"
      >
        <h1
          className="text-[28px] font-semibold tracking-[-0.025em]"
          style={{ color: "#111" }}
        >
          Your devices
        </h1>
        <Link
          href="/vault/new"
          className="flex items-center gap-1.5 h-8 px-3.5 rounded-[10px] text-[12px] font-semibold transition-all active:scale-[0.97]"
          style={{
            background: "#111",
            color: "#fff",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </Link>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-[140px] rounded-[20px] animate-pulse"
              style={{ background: "rgba(0,0,0,0.03)" }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasVaults && <EmptyState />}

      {/* Device grid */}
      {hasVaults && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vaults!.map((v, i) => (
              <DeviceCard key={v.vault.id} vault={v} index={i} />
            ))}
          </div>

          {/* Today summary */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-8 rounded-[16px] px-5 py-4 flex items-center justify-between"
            style={{
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <div>
              <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">
                Today
              </p>
              <p className="text-[22px] font-semibold tracking-tight text-[#111] font-mono">
                ${spentToday.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[11px] text-[#9CA3AF]">Active</p>
                <p className="text-[15px] font-semibold text-[#111]">
                  {activeCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[#9CA3AF]">Lost</p>
                <p className="text-[15px] font-semibold text-[#22C55E]">$0</p>
              </div>
            </div>
          </motion.div>

          {/* Recent activity */}
          <RecentActivity vaults={vaults!} />
        </>
      )}
    </div>
  );
}

/* ── Device Card ── */

function DeviceCard({ vault, index }: { vault: VaultBrief; index: number }) {
  const v = vault.vault;
  const b = vault.budget;
  const active = !v.pausedAt;
  const util = Math.min(b.dailyUtilization * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease }}
    >
      <Link href={`/vault/${v.id}`} className="block group">
        <div
          className="rounded-[20px] p-4 transition-all group-hover:shadow-md group-active:scale-[0.98]"
          style={{
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {/* Top: emoji + name + LED */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[17px]"
                style={{ background: "#F3F4F6" }}
              >
                {v.emoji || "🧭"}
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[#111] truncate max-w-[140px]">
                  {v.name}
                </p>
                <p className="text-[10px] text-[#9CA3AF] font-medium">
                  {v.network}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.span
                className="w-[7px] h-[7px] rounded-full"
                style={{ background: active ? "#22C55E" : "#EF4444" }}
                animate={{ opacity: active ? [0.6, 1, 0.6] : 1 }}
                transition={
                  active
                    ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    : {}
                }
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "#22C55E" : "#EF4444" }}
              >
                {active ? "Active" : "Paused"}
              </span>
            </div>
          </div>

          {/* Budget bar */}
          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] text-[#9CA3AF]">Daily budget</span>
              <span className="text-[12px] font-mono font-medium text-[#111]">
                ${b.spentToday.toFixed(2)}
                <span className="text-[#D1D5DB]"> / ${b.dailyLimitUsd}</span>
              </span>
            </div>
            <div
              className="h-[4px] rounded-full overflow-hidden"
              style={{ background: "#F3F4F6" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${util}%`,
                  background:
                    util > 85 ? "#EF4444" : util > 60 ? "#F59E0B" : "#22C55E",
                }}
              />
            </div>
          </div>

          {/* Last payment */}
          {vault.lastPayment && (
            <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
              <span
                className="w-[5px] h-[5px] rounded-full shrink-0"
                style={{
                  background:
                    vault.lastPayment.status === "blocked" ? "#EF4444" : "#22C55E",
                }}
              />
              <span className="text-[11px] text-[#6B7280] truncate flex-1">
                {vault.lastPayment.merchant}
              </span>
              <span className="text-[11px] font-mono text-[#9CA3AF] shrink-0">
                ${vault.lastPayment.amountUsd.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#D1D5DB] shrink-0">
                {relTime(vault.lastPayment.createdAt)}
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Recent Activity ── */

function RecentActivity({ vaults }: { vaults: VaultBrief[] }) {
  const items = vaults
    .filter((v) => v.lastPayment)
    .map((v) => ({
      device: v.vault.name,
      emoji: v.vault.emoji,
      merchant: v.lastPayment!.merchant,
      amount: v.lastPayment!.amountUsd,
      status: v.lastPayment!.status,
      at: v.lastPayment!.createdAt,
      network: v.vault.network,
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="mt-6"
    >
      <h2 className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
        Recent
      </h2>
      <div
        className="rounded-[16px] overflow-hidden divide-y"
        style={{
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        {items.map((item, i) => {
          const blocked = item.status === "blocked" || item.status === "failed";
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3"
              style={i > 0 ? { borderTop: "1px solid #F3F4F6" } : {}}
            >
              <span
                className="w-[5px] h-[5px] rounded-full shrink-0"
                style={{ background: blocked ? "#EF4444" : "#22C55E" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#111] truncate">
                  {item.device} → {item.merchant}
                  {blocked && (
                    <span className="ml-1.5 text-[10px] font-medium text-[#EF4444]">
                      blocked
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`text-[12px] font-mono shrink-0 ${blocked ? "line-through text-[#D1D5DB]" : "text-[#111]"}`}
              >
                ${item.amount.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#D1D5DB] shrink-0 w-12 text-right">
                {relTime(item.at)}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Empty State ── */

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center py-16"
    >
      {/* Abstract device shape */}
      <div
        className="w-[80px] h-[80px] rounded-[22px] mb-5 flex items-center justify-center"
        style={{ background: "#F3F4F6" }}
      >
        <span className="text-[28px]">🧭</span>
      </div>

      <h2 className="text-[20px] font-semibold text-[#111] tracking-tight">
        Create your first device.
      </h2>
      <p className="mt-2 text-[14px] text-[#6B7280] max-w-[320px] leading-[1.6]">
        Give your AI agent a wallet with spending rules enforced on-chain by
        Solana. 60 seconds.
      </p>
      <Link
        href="/vault/new"
        className="group mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-[12px] text-[14px] font-semibold transition-all active:scale-[0.97]"
        style={{ background: "#111", color: "#fff" }}
      >
        Create device
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <Link
        href="/atlas"
        className="mt-3 text-[13px] font-medium text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
      >
        or watch Atlas live →
      </Link>
    </motion.div>
  );
}
