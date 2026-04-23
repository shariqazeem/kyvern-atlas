"use client";

/**
 * /app — KyvernOS Home. Atlas live at the top, your devices below.
 *
 * The page has a heartbeat because Atlas is always running.
 * Users see proof before committing — real txs, real blocks,
 * real Solana Explorer links. Then they clone Atlas or build their own.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Plus, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fmtUptime, fmtAgo } from "@/lib/format";
import { EASE_PREMIUM as ease } from "@/lib/motion";

/* ── Types ── */

interface AtlasState {
  running: boolean;
  totalCycles: number;
  firstIgnitionAt: string | null;
  uptimeMs: number;
  totalSettled: number;
  totalSpentUsd: number;
  totalAttacksBlocked: number;
  fundsLostUsd: number;
  network: "devnet" | "mainnet";
}

interface FeedItem {
  id: string;
  _kind: "decision" | "attack";
  _when: string;
  reasoning?: string;
  action?: string;
  merchant?: string | null;
  amountUsd?: number;
  outcome?: string;
  type?: string;
  txSignature?: string | null;
  blockedReason?: string | null;
  description?: string;
}

interface VaultBrief {
  vault: {
    id: string;
    name: string;
    emoji: string;
    dailyLimitUsd: number;
    pausedAt: string | null;
    network: "devnet" | "mainnet";
  };
  budget: { spentToday: number; dailyLimitUsd: number; dailyUtilization: number };
  lastPayment: { merchant: string; amountUsd: number; status: string; createdAt: string } | null;
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

export default function OSHome() {
  const { wallet, isLoading } = useAuth();
  // Atlas data
  const [atlas, setAtlas] = useState<AtlasState | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);

  // User vaults
  const [vaults, setVaults] = useState<VaultBrief[] | null>(null);

  // Poll Atlas
  useEffect(() => {
    const load = async () => {
      try {
        const [s, f] = await Promise.all([
          fetch("/api/atlas/status").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/atlas/decisions?kind=both&limit=8").then((r) => (r.ok ? r.json() : null)),
        ]);
        if (s) setAtlas(s as AtlasState);
        if (f?.feed) setFeed(f.feed as FeedItem[]);
      } catch { /* silent */ }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  // Load vaults
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

  // Attack Atlas
  const handleProbe = useCallback(async () => {
    if (probing) return;
    setProbing(true);
    setProbeResult(null);
    try {
      const r = await fetch("/api/atlas/probe", { method: "POST" });
      const d = await r.json();
      setProbeResult(d.blocked ? `Blocked: ${d.reason ?? "policy violation"}` : "Probe sent");
      // Refresh feed
      setTimeout(async () => {
        const f = await fetch("/api/atlas/decisions?kind=both&limit=8").then((r) => r.ok ? r.json() : null);
        if (f?.feed) setFeed(f.feed as FeedItem[]);
      }, 1500);
    } catch {
      setProbeResult("Network error");
    } finally {
      setTimeout(() => setProbing(false), 2000);
    }
  }, [probing]);

  const hasVaults = (vaults ?? []).length > 0;
  const [uptimeMs, setUptimeMs] = useState(0);
  useEffect(() => {
    if (!atlas?.firstIgnitionAt) return;
    const iv = setInterval(() => {
      setUptimeMs(Date.now() - new Date(atlas.firstIgnitionAt!).getTime());
    }, 1000);
    return () => clearInterval(iv);
  }, [atlas?.firstIgnitionAt]);

  return (
    <div className="py-2">
      {/* ── Atlas Live Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="rounded-[20px] overflow-hidden mb-6"
        style={{
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.span
              className="w-[8px] h-[8px] rounded-full"
              style={{ background: atlas?.running ? "#22C55E" : "#EF4444" }}
              animate={atlas?.running ? { opacity: [0.5, 1, 0.5] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div>
              <p className="text-[14px] font-semibold text-[#111]">
                Atlas is {atlas?.running ? "running" : "offline"}
              </p>
              <p className="text-[11px] text-[#9CA3AF]">
                {fmtUptime(uptimeMs)} uptime · {atlas?.totalCycles ?? 0} cycles · ${(atlas?.fundsLostUsd ?? 0).toFixed(0)} lost
              </p>
            </div>
          </div>
          <Link
            href="/atlas"
            className="text-[11px] font-medium text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            Full view →
          </Link>
        </div>

        {/* Live stats strip */}
        <div className="px-5 pb-3 flex items-center gap-6">
          <MiniStat label="Transactions" value={String(atlas?.totalSettled ?? 0)} />
          <MiniStat label="Attacks blocked" value={String(atlas?.totalAttacksBlocked ?? 0)} />
          <MiniStat label="Total spent" value={`$${(atlas?.totalSpentUsd ?? 0).toFixed(2)}`} />
        </div>

        {/* Live feed */}
        <div style={{ borderTop: "1px solid #F3F4F6" }}>
          {feed.length === 0 ? (
            <p className="text-[12px] text-[#D1D5DB] text-center py-6">Loading feed...</p>
          ) : (
            feed.slice(0, 5).map((item, i) => (
              <AtlasFeedRow key={item.id} item={item} first={i === 0} />
            ))
          )}
        </div>

        {/* Actions */}
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderTop: "1px solid #F3F4F6" }}
        >
          <button
            onClick={handleProbe}
            disabled={probing}
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-[10px] text-[12px] font-semibold transition-all active:scale-[0.97]"
            style={{
              background: probing ? "#FEF2F2" : "#F3F4F6",
              color: probing ? "#EF4444" : "#6B7280",
            }}
          >
            <Zap className="w-3.5 h-3.5" />
            {probing ? "Probing..." : "Attack Atlas"}
          </button>
          <Link
            href="/vault/new"
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-[10px] text-[12px] font-semibold transition-all active:scale-[0.97]"
            style={{ background: "#111", color: "#fff" }}
          >
            Clone Atlas
          </Link>
        </div>

        {/* Probe result */}
        {probeResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="px-5 py-2 text-[11px] font-medium"
            style={{
              background: "#FEF2F2",
              color: "#EF4444",
              borderTop: "1px solid rgba(239,68,68,0.1)",
            }}
          >
            {probeResult}
          </motion.div>
        )}
      </motion.div>

      {/* ── Your Devices ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[18px] font-semibold text-[#111] tracking-tight">
            Your devices
          </h2>
          <Link
            href="/vault/new"
            className="flex items-center gap-1 text-[12px] font-medium text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Link>
        </div>

        {vaults === null ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-[120px] rounded-[16px] animate-pulse" style={{ background: "rgba(0,0,0,0.03)" }} />
            ))}
          </div>
        ) : !hasVaults ? (
          <Link
            href="/vault/new"
            className="block rounded-[16px] p-5 text-center group transition-all hover:shadow-md"
            style={{
              background: "#fff",
              border: "1px dashed rgba(0,0,0,0.1)",
            }}
          >
            <span className="text-[28px] block mb-2">🧭</span>
            <p className="text-[14px] font-semibold text-[#111]">
              Create your first device
            </p>
            <p className="text-[12px] text-[#9CA3AF] mt-1">
              Clone Atlas or build from scratch
            </p>
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {vaults.map((v, i) => (
              <DeviceCard key={v.vault.id} vault={v} index={i} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Atlas Feed Row ── */

function AtlasFeedRow({ item, first }: { item: FeedItem; first: boolean }) {
  const isAttack = item._kind === "attack";
  const blocked = isAttack || item.outcome === "blocked" || item.outcome === "failed";
  const merchant = isAttack ? (item.type?.replace(/_/g, " ") ?? "attack") : (item.merchant ?? "—");
  const reasoning = isAttack ? item.description : item.reasoning;
  const sig = item.txSignature;
  const explorer = sig ? `https://explorer.solana.com/tx/${sig}?cluster=devnet` : null;

  return (
    <div
      className="px-5 py-2.5 flex items-start gap-3"
      style={!first ? { borderTop: "1px solid #F9FAFB" } : {}}
    >
      <span
        className="w-[6px] h-[6px] rounded-full mt-1.5 shrink-0"
        style={{ background: blocked ? "#EF4444" : "#22C55E" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#111] truncate">
            {isAttack ? "Attack" : "→"} {merchant}
          </span>
          {blocked && (
            <span className="text-[9px] font-semibold text-[#EF4444] bg-[#FEF2F2] px-1.5 py-0.5 rounded shrink-0">
              {isAttack ? "BLOCKED" : item.outcome?.toUpperCase()}
            </span>
          )}
        </div>
        {reasoning && (
          <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">{reasoning}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        {(item.amountUsd ?? 0) > 0 && (
          <span className={`text-[11px] font-mono ${blocked ? "line-through text-[#D1D5DB]" : "text-[#111]"}`}>
            ${(item.amountUsd ?? 0).toFixed(2)}
          </span>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-[#D1D5DB]">{fmtAgo(item._when)}</span>
          {explorer && (
            <a href={explorer} target="_blank" rel="noopener noreferrer" className="text-[#D1D5DB] hover:text-[#9CA3AF]">
              <ArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Mini Stat ── */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">{label}</p>
      <p className="text-[14px] font-semibold font-mono text-[#111]">{value}</p>
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease }}
    >
      <Link href={`/vault/${v.id}`} className="block group">
        <div
          className="rounded-[16px] p-3.5 transition-all group-hover:shadow-md group-active:scale-[0.98]"
          style={{
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[15px]"
              style={{ background: "#F3F4F6" }}
            >
              {v.emoji || "🧭"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111] truncate">{v.name}</p>
              <div className="flex items-center gap-1">
                <span
                  className="w-[5px] h-[5px] rounded-full"
                  style={{ background: active ? "#22C55E" : "#EF4444" }}
                />
                <span className="text-[10px]" style={{ color: active ? "#22C55E" : "#EF4444" }}>
                  {active ? "Active" : "Paused"}
                </span>
              </div>
            </div>
          </div>

          {/* Budget */}
          <div className="mb-2">
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
              <div className="h-full rounded-full" style={{
                width: `${util}%`,
                background: util > 85 ? "#EF4444" : util > 60 ? "#F59E0B" : "#22C55E",
              }} />
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1 font-mono">
              ${b.spentToday.toFixed(2)} / ${b.dailyLimitUsd}
            </p>
          </div>

          {vault.lastPayment && (
            <p className="text-[10px] text-[#9CA3AF] truncate">
              {vault.lastPayment.merchant} · {fmtAgo(vault.lastPayment.createdAt)}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
