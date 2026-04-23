"use client";

/**
 * /vault/[id] — Device Detail.
 *
 * Full view of one agent device inside KyvernOS.
 * Budget card, action buttons, activity feed, integration info.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Pause,
  Play,
  Wallet,
  Shield,
} from "lucide-react";
import type {
  Vault,
  Payment,
  BudgetSnapshot,
  VelocitySnapshot,
} from "@/components/vault/types";
import { EASE_PREMIUM as ease } from "@/lib/motion";

interface DashboardPayload {
  vault: Vault;
  budget: BudgetSnapshot;
  velocity: VelocitySnapshot;
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
  const [pauseBusy, setPauseBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      try {
        if (!opts.silent) setLoading(true);
        const res = await fetch(`/api/vault/${id}?limit=50`);
        if (res.status === 404) { setError("not_found"); return; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData((await res.json()) as DashboardPayload);
        setError(null);
      } catch (e) {
        if (!opts.silent) setError(e instanceof Error ? e.message : "failed");
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    function start() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => void load({ silent: true }), 5000);
    }
    function stop() {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    function onVis() {
      if (document.visibilityState === "visible") { start(); } else { stop(); }
    }
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  const togglePause = useCallback(async () => {
    if (!data || pauseBusy) return;
    setPauseBusy(true);
    try {
      const method = data.vault.pausedAt ? "DELETE" : "POST";
      await fetch(`/api/vault/${id}/pause`, {
        method,
        headers: { "Content-Type": "application/json", "x-owner-wallet": data.vault.ownerWallet },
        body: JSON.stringify({ ownerWallet: data.vault.ownerWallet }),
      });
      await load({ silent: true });
    } catch { /* silent */ } finally { setPauseBusy(false); }
  }, [data, id, load, pauseBusy]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "#111" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-[15px] text-[#6B7280] mb-3">
          {error === "not_found" ? "Device not found." : error}
        </p>
        <Link href="/app" className="text-[13px] font-medium text-[#111] underline underline-offset-2">
          Back to devices
        </Link>
      </div>
    );
  }

  if (!data) return null;
  const v = data.vault;
  const b = data.budget;
  const active = !v.pausedAt;
  const util = Math.min(b.dailyUtilization * 100, 100);

  return (
    <div className="py-2">
      {/* Back + title */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="mb-6"
      >
        <Link href="/app" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9CA3AF] mb-3 hover:text-[#6B7280] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Devices
        </Link>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px]"
            style={{ background: "#F3F4F6" }}>
            {v.emoji || "🧭"}
          </span>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#111]">{v.name}</h1>
            <div className="flex items-center gap-2">
              <motion.span className="w-[6px] h-[6px] rounded-full"
                style={{ background: active ? "#22C55E" : "#EF4444" }}
                animate={active ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
              <span className="text-[12px] font-medium" style={{ color: active ? "#22C55E" : "#EF4444" }}>
                {active ? "Active" : "Paused"}
              </span>
              <span className="text-[11px] text-[#D1D5DB]">·</span>
              <span className="text-[11px] text-[#9CA3AF]">{v.network}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Budget card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease }}
        className="rounded-[20px] p-5 mb-4"
        style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.05)" }}
      >
        <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-1">
          Today&apos;s budget
        </p>
        <p className="text-[36px] font-semibold tracking-tight text-[#111] font-mono leading-none">
          ${b.spentToday.toFixed(2)}
        </p>
        <div className="mt-3 mb-2">
          <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${util}%` }}
              transition={{ duration: 0.8, ease }}
              style={{
                background: util > 85 ? "#EF4444" : util > 60 ? "#F59E0B" : "#22C55E",
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#9CA3AF]">
            {Math.round(util)}% of ${b.dailyLimitUsd} daily limit
          </span>
          <span className="text-[12px] text-[#9CA3AF]">
            ${b.dailyRemaining.toFixed(2)} remaining
          </span>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease }}
        className="grid grid-cols-3 gap-2 mb-6"
      >
        <ActionButton
          icon={active ? Pause : Play}
          label={pauseBusy ? "..." : active ? "Pause" : "Resume"}
          onClick={togglePause}
          variant={active ? "default" : "success"}
        />
        <ActionButton icon={Wallet} label="Fund" onClick={() => {}} variant="default" />
        <ActionButton icon={Shield} label="Policy" onClick={() => {}} variant="default" />
      </motion.div>

      {/* Activity feed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <h2 className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
          Activity
        </h2>
        <div className="rounded-[16px] overflow-hidden"
          style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.05)" }}>
          {data.payments.length === 0 ? (
            <p className="text-[13px] text-[#9CA3AF] text-center py-10">
              No payments yet. Connect your agent to start.
            </p>
          ) : (
            data.payments.slice(0, 20).map((p, i) => (
              <PaymentRow key={p.id} payment={p} network={v.network} first={i === 0} />
            ))
          )}
        </div>
      </motion.div>

      {/* Integration */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-6"
      >
        <h2 className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
          Integration
        </h2>
        <div className="rounded-[16px] p-4 space-y-3"
          style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.05)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#6B7280]">Vault ID</span>
            <CopyPill value={id} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#6B7280]">Squads address</span>
            <CopyPill value={v.squadsAddress} truncate />
          </div>
          <div className="pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
            <p className="text-[11px] text-[#9CA3AF] mb-1.5">Quick start</p>
            <code className="block text-[11px] font-mono text-[#6B7280] bg-[#F9FAFB] rounded-[8px] p-3 leading-relaxed">
              npm install @kyvernlabs/sdk
            </code>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Sub-components ── */

function ActionButton({ icon: Icon, label, onClick, variant = "default" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: "default" | "success";
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 rounded-[14px] transition-all active:scale-[0.96]"
      style={{
        background: variant === "success" ? "#F0FDF4" : "#F3F4F6",
        color: variant === "success" ? "#22C55E" : "#6B7280",
      }}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

function PaymentRow({ payment: p, network, first }: {
  payment: Payment;
  network: string;
  first: boolean;
}) {
  const blocked = p.status === "blocked" || p.status === "failed";
  const sig = p.txSignature;
  const explorer = sig
    ? `https://explorer.solana.com/tx/${sig}?cluster=${network}`
    : null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={!first ? { borderTop: "1px solid #F3F4F6" } : {}}
    >
      <span className="w-[6px] h-[6px] rounded-full shrink-0"
        style={{ background: blocked ? "#EF4444" : "#22C55E" }} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#111] truncate">
          {p.merchant}
          {blocked && (
            <span className="ml-1.5 text-[10px] font-medium text-[#EF4444]">blocked</span>
          )}
        </p>
        {p.reason && (
          <p className="text-[10px] text-[#9CA3AF] truncate">{p.reason}</p>
        )}
      </div>
      <span className={`text-[12px] font-mono shrink-0 ${blocked ? "line-through text-[#D1D5DB]" : "text-[#111]"}`}>
        ${p.amountUsd.toFixed(2)}
      </span>
      {explorer && (
        <a href={explorer} target="_blank" rel="noopener noreferrer"
          className="shrink-0 text-[#D1D5DB] hover:text-[#9CA3AF] transition-colors">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

function CopyPill({ value, truncate: t }: { value: string; truncate?: boolean }) {
  const [copied, setCopied] = useState(false);
  const display = t && value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-[11px] font-mono text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
    >
      {display}
      {copied ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}
