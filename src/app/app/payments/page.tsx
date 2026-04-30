"use client";

/**
 * /app/payments — On-chain enforcement feed.
 *
 * The policy program is the moat. This page is where the owner sees
 * every decision the chain made on their behalf:
 *
 *   - Top: budget summary ($X/tx · $Y/day · $Z/week · N actions today)
 *   - Approved/Rejected pills feed (last 30 vault_payments)
 *     Each row shows worker → merchant → amount → time → Explorer link
 *
 * Polls /api/vault/[id] every 8s — same endpoint the vault detail page
 * already uses for `payments[]`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Link2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fmtAgo } from "@/lib/format";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface VaultBrief {
  vault: {
    id: string;
    network: "devnet" | "mainnet";
    dailyLimitUsd: number;
    weeklyLimitUsd: number;
    perTxMaxUsd: number;
  };
}

interface PaymentRecord {
  id: string;
  vaultId: string;
  agentKeyId: string | null;
  merchant: string;
  amountUsd: number;
  status: "allowed" | "blocked" | "settled" | "failed";
  reason: string | null;
  txSignature: string | null;
  createdAt: string;
}

interface VaultDetail {
  vault: {
    id: string;
    network: "devnet" | "mainnet";
  };
  budget: {
    dailyLimitUsd: number;
    weeklyLimitUsd: number;
    perTxMaxUsd: number;
    spentToday: number;
    spentThisWeek: number;
    dailyRemaining: number;
    weeklyRemaining: number;
    dailyUtilization: number;
  };
  payments: PaymentRecord[];
}

function explorerUrl(sig: string, network: "devnet" | "mainnet"): string {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  if (n < 10) return `$${n.toFixed(2)}`;
  return `$${Math.round(n)}`;
}

function isApproved(s: PaymentRecord["status"]): boolean {
  return s === "allowed" || s === "settled";
}

export default function PaymentsPage() {
  const { wallet, isLoading: authLoading } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VaultDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolve device
  useEffect(() => {
    if (authLoading) return;
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
  }, [authLoading, wallet]);

  const load = useCallback(() => {
    if (!deviceId) return;
    fetch(`/api/vault/${deviceId}?limit=30`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDetail(d as VaultDetail))
      .catch(() => {});
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    load();
    const iv = setInterval(load, 8_000);
    return () => clearInterval(iv);
  }, [deviceId, load]);

  const todayActions = useMemo(() => {
    if (!detail) return { approved: 0, rejected: 0 };
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    const since = day.getTime();
    let approved = 0;
    let rejected = 0;
    for (const p of detail.payments) {
      const t = Date.parse(
        p.createdAt.replace(" ", "T") +
          (p.createdAt.includes("Z") ? "" : "Z"),
      );
      if (!isFinite(t) || t < since) continue;
      if (isApproved(p.status)) approved++;
      else rejected++;
    }
    return { approved, rejected };
  }, [detail]);

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

  if (!deviceId) return <NoDeviceState />;

  return (
    <div className="py-2 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mb-4"
      >
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-[#0A0A0A] mb-1">
          On-chain enforcement
        </h1>
        <p className="text-[13px] text-[#6B6B6B]">
          Every payment your workers attempt — approved or blocked by the policy program before a single lamport moves.
        </p>
      </motion.div>

      {detail && (
        <BudgetHeader
          budget={detail.budget}
          actions={todayActions.approved + todayActions.rejected}
        />
      )}

      <h2
        className="font-mono uppercase tracking-[0.14em] mt-5 mb-2"
        style={{ color: "#9CA3AF", fontSize: 9.5 }}
      >
        Policy decisions
      </h2>

      {!detail || detail.payments.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="space-y-2">
          {detail.payments.map((p, i) => (
            <DecisionRow
              key={p.id}
              payment={p}
              network={detail.vault.network}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── BudgetHeader ───────────────────────────────────────────────────── */

function BudgetHeader({
  budget,
  actions,
}: {
  budget: VaultDetail["budget"];
  actions: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-[14px] p-3.5 sm:p-4"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%)",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck
          className="w-4 h-4"
          strokeWidth={2.2}
          style={{ color: "#15803D" }}
        />
        <span
          className="font-mono uppercase tracking-[0.12em]"
          style={{ color: "#15803D", fontSize: 10, fontWeight: 600 }}
        >
          Budget envelope
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-3">
        <BudgetCell label="Per-tx max" value={fmtUsd(budget.perTxMaxUsd)} />
        <BudgetCell
          label="Daily"
          value={`${fmtUsd(budget.spentToday)} / ${fmtUsd(budget.dailyLimitUsd)}`}
          muted
        />
        <BudgetCell
          label="Weekly"
          value={`${fmtUsd(budget.spentThisWeek)} / ${fmtUsd(budget.weeklyLimitUsd)}`}
          muted
        />
        <BudgetCell label="Today" value={`${actions} actions`} />
      </div>
      {/* Daily progress bar */}
      <div
        className="mt-3 h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(15,23,42,0.06)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: `${Math.min(100, budget.dailyUtilization * 100)}%`,
          }}
          transition={{ duration: 0.6, ease: EASE }}
          className="h-full"
          style={{
            background:
              budget.dailyUtilization > 0.9
                ? "#EF4444"
                : budget.dailyUtilization > 0.7
                  ? "#F59E0B"
                  : "#22C55E",
          }}
        />
      </div>
    </motion.div>
  );
}

function BudgetCell({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div
        className="font-mono uppercase tracking-[0.10em]"
        style={{ color: "#9CA3AF", fontSize: 9.5 }}
      >
        {label}
      </div>
      <div
        className="font-mono mt-0.5"
        style={{
          color: muted ? "#374151" : "#0A0A0A",
          fontSize: 13,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ── DecisionRow ────────────────────────────────────────────────────── */

function DecisionRow({
  payment,
  network,
  index,
}: {
  payment: PaymentRecord;
  network: "devnet" | "mainnet";
  index: number;
}) {
  const approved = isApproved(payment.status);
  const tone = approved ? "#15803D" : "#B45309";
  const bg = approved ? "rgba(34,197,94,0.10)" : "rgba(217,119,6,0.10)";
  const ts = Date.parse(
    payment.createdAt.replace(" ", "T") +
      (payment.createdAt.includes("Z") ? "" : "Z"),
  );
  const ago = isFinite(ts) ? fmtAgo(new Date(ts).toISOString()) : "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.18) }}
      className="rounded-[14px] p-3 flex items-center gap-3 flex-wrap sm:flex-nowrap"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${approved ? "rgba(34,197,94,0.18)" : "rgba(217,119,6,0.18)"}`,
        boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono"
        style={{
          background: bg,
          color: tone,
          fontSize: 10.5,
          fontWeight: 600,
          flex: "0 0 auto",
        }}
      >
        {approved ? (
          <Check className="w-2.5 h-2.5" strokeWidth={2.6} />
        ) : (
          <X className="w-2.5 h-2.5" strokeWidth={2.6} />
        )}
        {approved ? "Approved" : "Blocked"}
      </span>
      <div className="min-w-0 flex-1 order-3 sm:order-none w-full sm:w-auto">
        <div
          className="text-[#0A0A0A] truncate"
          style={{ fontSize: 13, fontWeight: 500 }}
        >
          {payment.merchant}
        </div>
        {payment.reason && !approved && (
          <div
            className="text-[11px] mt-0.5 truncate"
            style={{ color: "#B45309" }}
          >
            {payment.reason}
          </div>
        )}
      </div>
      <span
        className="font-mono whitespace-nowrap"
        style={{
          color: "#374151",
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
        }}
      >
        ${payment.amountUsd.toFixed(payment.amountUsd < 1 ? 3 : 2)}
      </span>
      <span
        className="font-mono whitespace-nowrap"
        style={{ color: "#9CA3AF", fontSize: 11 }}
      >
        {ago}
      </span>
      {payment.txSignature && (
        <a
          href={explorerUrl(payment.txSignature, network)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono"
          style={{
            background: "rgba(15,23,42,0.04)",
            color: "#374151",
            fontSize: 10.5,
          }}
        >
          <Link2 className="w-2.5 h-2.5" strokeWidth={2.4} />
          Explorer
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </motion.div>
  );
}

/* ── Empty / no-device states ───────────────────────────────────────── */

function EmptyFeed() {
  return (
    <div
      className="rounded-[16px] py-10 px-4 text-center"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.05)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <p
        className="text-[13px] mx-auto max-w-[420px] leading-[1.55]"
        style={{ color: "#6B7280" }}
      >
        No on-chain payments yet. As soon as one of your workers spends or earns USDC, the policy program will evaluate it and the approved/blocked decision will appear here with an Explorer link.
      </p>
    </div>
  );
}

function NoDeviceState() {
  return (
    <div className="py-16 text-center">
      <p className="text-[14px] text-[#6B6B6B] mb-3">
        You need a device before there&apos;s anything to enforce.
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
