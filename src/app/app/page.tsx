"use client";

/**
 * /app — Device Home Screen.
 *
 * Alive from second one. Atlas pulses at the top.
 * Your device identity, installed abilities, real activity feed.
 * Every 5 seconds something updates.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";
import { getAbility } from "@/lib/abilities/registry";
import { fmtAgo, fmtUptime } from "@/lib/format";

/* ── Types ── */

interface VaultBrief {
  vault: {
    id: string; name: string; emoji: string;
    dailyLimitUsd: number; pausedAt: string | null; network: string;
  };
  budget: { spentToday: number; dailyLimitUsd: number; dailyUtilization: number };
  lastPayment: { merchant: string; amountUsd: number; status: string; createdAt: string } | null;
}

interface AtlasState {
  running: boolean; totalCycles: number; totalSettled: number;
  totalAttacksBlocked: number; totalSpentUsd: number; totalEarnedUsd: number;
  fundsLostUsd: number; uptimeMs: number; firstIgnitionAt: string | null;
}

interface FeedItem {
  id: string; _kind: "decision" | "attack"; _when: string;
  reasoning?: string; merchant?: string | null; amountUsd?: number;
  outcome?: string; type?: string; txSignature?: string | null;
  blockedReason?: string | null; description?: string;
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  const K = "kyvern:dev-wallet";
  const e = window.localStorage.getItem(K);
  if (e) return e;
  const a = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) s += a[Math.floor(Math.random() * a.length)];
  window.localStorage.setItem(K, s);
  return s;
}

export default function DeviceHome() {
  const { wallet, isLoading } = useAuth();
  const { abilities, init } = useDeviceStore();

  const [vault, setVault] = useState<VaultBrief | null>(null);
  const [atlas, setAtlas] = useState<AtlasState | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uptimeMs, setUptimeMs] = useState(0);

  // Load vault + init store
  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) { setLoading(false); return; }

    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) {
          setVault(vaults[0]);
          init(vaults[0].vault.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoading, wallet, init]);

  // Poll Atlas (the heartbeat) + feed
  useEffect(() => {
    const load = async () => {
      try {
        const [s, f] = await Promise.all([
          fetch("/api/atlas/status").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/atlas/decisions?kind=both&limit=6").then((r) => (r.ok ? r.json() : null)),
        ]);
        if (s) setAtlas(s as AtlasState);
        if (f?.feed) setFeed(f.feed as FeedItem[]);
      } catch { /* silent */ }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  // Live uptime
  useEffect(() => {
    if (!atlas?.firstIgnitionAt) return;
    const iv = setInterval(() => {
      setUptimeMs(Date.now() - new Date(atlas.firstIgnitionAt!).getTime());
    }, 1000);
    return () => clearInterval(iv);
  }, [atlas?.firstIgnitionAt]);

  if (!loading && !vault) return <NoDeviceState />;

  const hasAbilities = abilities.length > 0;
  const serialNum = vault?.vault.id
    ? `KVN-${vault.vault.id.replace("vlt_", "").slice(0, 8).toUpperCase()}`
    : "";

  return (
    <div className="py-2">
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "#111" }} />
        </div>
      )}

      {vault && (
        <>
          {/* ── Network Pulse ── */}
          {atlas && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-between px-1 mb-4"
            >
              <div className="flex items-center gap-2">
                <motion.span
                  className="w-[6px] h-[6px] rounded-full"
                  style={{ background: "#22C55E" }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[11px] text-[#9CA3AF]">
                  Solana {vault.vault.network} · {fmtUptime(uptimeMs)} uptime
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#9CA3AF]">
                {atlas.totalCycles} cycles
              </span>
            </motion.div>
          )}

          {/* ── Device Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-[24px] p-5 mb-5"
            style={{
              background: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-[18px] flex items-center justify-center text-[28px]"
                style={{
                  background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                {vault.vault.emoji || "🧭"}
              </div>
              <div className="flex-1">
                <h1 className="text-[20px] font-semibold text-[#111] tracking-tight">
                  {vault.vault.name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
                    {serialNum}
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: vault.vault.pausedAt ? "#EF4444" : "#22C55E" }}
                  >
                    {vault.vault.pausedAt ? "Paused" : "Active"}
                  </span>
                </div>
              </div>
            </div>

            {/* Budget bar */}
            <div className="mb-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] text-[#9CA3AF]">Daily budget</span>
                <span className="text-[13px] font-mono font-semibold text-[#111]">
                  ${vault.budget.spentToday.toFixed(2)}
                  <span className="text-[#D1D5DB]"> / ${vault.budget.dailyLimitUsd}</span>
                </span>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(vault.budget.dailyUtilization * 100, 100)}%` }}
                  transition={{ duration: 0.8 }}
                  style={{
                    background: vault.budget.dailyUtilization > 0.85 ? "#EF4444"
                      : vault.budget.dailyUtilization > 0.6 ? "#F59E0B" : "#22C55E",
                  }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: "1px solid #F3F4F6" }}>
              <div className="text-center">
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Settled</p>
                <p className="text-[16px] font-semibold font-mono text-[#111]">{atlas?.totalSettled ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Blocked</p>
                <p className="text-[16px] font-semibold font-mono text-[#EF4444]">{atlas?.totalAttacksBlocked ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Lost</p>
                <p className="text-[16px] font-semibold font-mono text-[#22C55E]">$0</p>
              </div>
            </div>
          </motion.div>

          {/* ── Abilities ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-[#111]">
                {hasAbilities ? "Abilities" : "Get started"}
              </h2>
              <Link
                href="/app/store"
                className="flex items-center gap-1 text-[12px] font-semibold text-[#9CA3AF] hover:text-[#111] transition-colors"
              >
                <Store className="w-3.5 h-3.5" />
                Store
              </Link>
            </div>

            {hasAbilities ? (
              <div className="grid grid-cols-3 gap-3">
                {abilities.map((inst, i) => {
                  const def = getAbility(inst.abilityId);
                  if (!def) return null;
                  return (
                    <motion.div
                      key={inst.abilityId}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={`/app/ability/${inst.abilityId}`}
                        className="flex flex-col items-center gap-2 p-3 rounded-[20px] group transition-all active:scale-[0.95]"
                        style={{
                          background: "#fff",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                          border: "1px solid rgba(0,0,0,0.05)",
                        }}
                      >
                        <div className="relative">
                          <div
                            className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-[24px]"
                            style={{ background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)" }}
                          >
                            {def.emoji}
                          </div>
                          <span
                            className="absolute -top-0.5 -right-0.5 w-[9px] h-[9px] rounded-full border-[2px] border-[#FAFAFA]"
                            style={{ background: inst.status === "active" ? "#22C55E" : "#9CA3AF" }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-[#6B7280] text-center leading-tight">
                          {def.name.split(" ").slice(0, 2).join(" ")}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: abilities.length * 0.08 + 0.1 }}
                >
                  <Link
                    href="/app/store"
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-[20px] h-full transition-all active:scale-[0.95]"
                    style={{ border: "1px dashed rgba(0,0,0,0.1)", minHeight: "100px" }}
                  >
                    <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center" style={{ background: "#F9FAFB" }}>
                      <span className="text-[20px] text-[#D1D5DB]">+</span>
                    </div>
                    <span className="text-[11px] text-[#D1D5DB]">Add</span>
                  </Link>
                </motion.div>
              </div>
            ) : (
              <Link
                href="/app/store"
                className="block rounded-[20px] p-6 text-center group transition-all hover:shadow-md active:scale-[0.98]"
                style={{ background: "#fff", border: "1px dashed rgba(0,0,0,0.1)" }}
              >
                <div className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-3" style={{ background: "#F3F4F6" }}>
                  <Store className="w-6 h-6 text-[#9CA3AF]" />
                </div>
                <p className="text-[15px] font-semibold text-[#111]">Open the Ability Store</p>
                <p className="text-[12px] text-[#9CA3AF] mt-1 max-w-[240px] mx-auto">
                  Install abilities — earn, protect, monitor. No code needed.
                </p>
              </Link>
            )}
          </motion.div>

          {/* ── Live Atlas Feed (the heartbeat) ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                Network activity
              </h2>
              <Link href="/atlas" className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280]">
                Full view →
              </Link>
            </div>
            <div
              className="rounded-[20px] overflow-hidden"
              style={{
                background: "#fff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
            >
              {feed.length === 0 ? (
                <p className="text-[12px] text-[#D1D5DB] text-center py-6">Loading...</p>
              ) : (
                feed.slice(0, 5).map((item, i) => {
                  const isAttack = item._kind === "attack";
                  const blocked = isAttack || item.outcome === "blocked";
                  const label = isAttack
                    ? (item.type?.replace(/_/g, " ") ?? "attack")
                    : (item.merchant ?? "—");
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={i > 0 ? { borderTop: "1px solid #F9FAFB" } : {}}
                    >
                      <span
                        className="w-[6px] h-[6px] rounded-full shrink-0"
                        style={{ background: blocked ? "#EF4444" : "#22C55E" }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] text-[#111] truncate block">
                          {isAttack ? "Attack: " : "→ "}{label}
                          {blocked && (
                            <span className="ml-1.5 text-[9px] font-semibold text-[#EF4444] bg-[#FEF2F2] px-1 py-0.5 rounded">
                              BLOCKED
                            </span>
                          )}
                        </span>
                      </div>
                      {(item.amountUsd ?? 0) > 0 && (
                        <span className={`text-[11px] font-mono shrink-0 ${blocked ? "line-through text-[#D1D5DB]" : "text-[#111]"}`}>
                          ${(item.amountUsd ?? 0).toFixed(2)}
                        </span>
                      )}
                      {item.txSignature && (
                        <a href={`https://explorer.solana.com/tx/${item.txSignature}?cluster=devnet`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[#D1D5DB] hover:text-[#9CA3AF] shrink-0">
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                      <span className="text-[10px] text-[#D1D5DB] shrink-0">
                        {fmtAgo(item._when)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* ── Footer links ── */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Link href="/app/devices" className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280]">
              Device registry
            </Link>
            <span className="text-[#E5E7EB]">·</span>
            <Link href="/atlas" className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280]">
              Atlas observatory
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function NoDeviceState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center py-20"
    >
      <div
        className="w-[80px] h-[80px] rounded-[22px] mb-5 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)", border: "1px solid rgba(0,0,0,0.04)" }}
      >
        <span className="text-[32px]">🧭</span>
      </div>
      <h2 className="text-[22px] font-semibold text-[#111] tracking-tight">Create your device.</h2>
      <p className="mt-2 text-[14px] text-[#6B7280] max-w-[300px] leading-[1.6]">
        A sovereign wallet on Solana. Install abilities. Earn, protect, monitor — no code.
      </p>
      <Link
        href="/vault/new"
        className="group mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-[14px] text-[14px] font-semibold transition-all active:scale-[0.97]"
        style={{ background: "#111", color: "#fff" }}
      >
        Create device
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
