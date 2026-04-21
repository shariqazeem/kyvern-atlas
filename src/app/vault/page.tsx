"use client";

/* ════════════════════════════════════════════════════════════════════
   /vault — Your KyvernLabs vaults

   Lists every vault owned by the signed-in wallet, with a budget
   utilization bar, status pill, and last-activity preview. Card per
   vault, clickable straight into /vault/[id]. Premium empty state
   with a single primary "Create your first vault" CTA.

   Wiring:
   · Auth → useAuth() → wallet (or devFallbackWallet for local demo)
   · Data → GET /api/vault/list?ownerWallet=<pubkey>
   · Nav  → each card links to /vault/[id]
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Copy,
  Pause,
  Plus,
  ShieldCheck,
  Sparkles,
  Wallet as WalletIcon,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { useAuth } from "@/hooks/use-auth";

const EASE = [0.25, 0.1, 0.25, 1] as const;

/* ─── Types (mirror /api/vault/list) ─── */

interface VaultSummary {
  vault: {
    id: string;
    ownerWallet: string;
    name: string;
    emoji: string;
    purpose: string;
    dailyLimitUsd: number;
    weeklyLimitUsd: number;
    perTxMaxUsd: number;
    maxCallsPerWindow: number;
    velocityWindow: "1h" | "1d" | "1w";
    allowedMerchants: string[];
    requireMemo: boolean;
    squadsAddress: string;
    network: "devnet" | "mainnet";
    pausedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  budget: {
    dailyLimitUsd: number;
    weeklyLimitUsd: number;
    spentToday: number;
    spentThisWeek: number;
    dailyUtilization: number;
    weeklyUtilization: number;
  };
  lastPayment: {
    merchant: string;
    amountUsd: number;
    status: "allowed" | "blocked" | "settled" | "failed";
    createdAt: string;
  } | null;
}

/* ─── Dev fallback owner wallet (mirrors /vault/new) ─── */

function devFallbackWallet(): string {
  if (typeof window === "undefined") return "DevPlaceholderWallet11111111111111111111111";
  const KEY = "kyvern:dev-wallet";
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const alphabet =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  window.localStorage.setItem(KEY, s);
  return s;
}

/* ─── Formatting helpers ─── */

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${n.toFixed(n < 10 ? 2 : 0)}`;
}

function fmtRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(then)) return "—";
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function truncate(s: string, head = 4, tail = 4): string {
  if (!s || s.length <= head + tail + 2) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*                                Page                                */
/* ═══════════════════════════════════════════════════════════════════ */

export default function VaultListPage() {
  const { wallet, isLoading: authLoading } = useAuth();

  const [ownerWallet, setOwnerWallet] = useState<string | null>(null);
  const [entries, setEntries] = useState<VaultSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Resolve effective owner wallet (Privy-connected OR dev-fallback)
  useEffect(() => {
    if (authLoading) return;
    setOwnerWallet(wallet ?? devFallbackWallet());
  }, [wallet, authLoading]);

  // Fetch vault list
  useEffect(() => {
    if (!ownerWallet) return;
    let cancelled = false;
    setEntries(null);
    setError(null);
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(ownerWallet)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.message ?? "failed to load vaults");
        return data as { vaults: VaultSummary[]; total: number };
      })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.vaults);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "failed to load vaults");
        setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerWallet]);

  const totals = useMemo(() => {
    if (!entries) return null;
    const active = entries.filter((e) => e.vault.pausedAt == null).length;
    const paused = entries.length - active;
    const spentToday = entries.reduce((a, e) => a + e.budget.spentToday, 0);
    const dailyCap = entries.reduce((a, e) => a + e.budget.dailyLimitUsd, 0);
    return { active, paused, spentToday, dailyCap };
  }, [entries]);

  const copyOwner = async () => {
    if (!ownerWallet) return;
    try {
      await navigator.clipboard.writeText(ownerWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <main
      className="relative min-h-screen"
      style={{ background: "var(--background)" }}
    >
      <Navbar />

      {/* Soft dot-grid backdrop, mirrors login page */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-dot-grid opacity-60"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 45% at 50% 0%, black 35%, transparent 100%)",
          WebkitBackdropFilter:
            "radial-gradient(ellipse 80% 45% at 50% 0%, black 35%, transparent 100%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pt-28 pb-24">
        {/* ─── Header row ─── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10"
        >
          <div>
            <span
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-semibold tracking-[0.02em] mb-4"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
                border: "0.5px solid var(--border-subtle)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              YOUR VAULTS
            </span>
            <h1
              className="text-[34px] sm:text-[38px] font-semibold tracking-[-0.028em]"
              style={{ color: "var(--text-primary)", lineHeight: 1.05 }}
            >
              Budgets for every agent you run.
            </h1>
            <p
              className="mt-2.5 text-[15px] max-w-[560px] leading-[1.55]"
              style={{ color: "var(--text-secondary)" }}
            >
              Each vault is a Squads v4 smart account with a policy layer:
              daily cap, per-transaction max, merchant allowlist, kill
              switch. Agents get keys with budgets — not keys with blanks.
            </p>

            {/* Owner wallet pill */}
            {ownerWallet && (
              <button
                onClick={copyOwner}
                className="group mt-5 inline-flex items-center gap-2 h-8 pl-2 pr-3 rounded-full text-[12px] font-medium transition-colors"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-tertiary)",
                  border: "0.5px solid var(--border-subtle)",
                }}
                aria-label="Copy owner wallet"
              >
                <span
                  className="w-5 h-5 rounded-full inline-flex items-center justify-center"
                  style={{ background: "var(--text-primary)" }}
                >
                  <WalletIcon
                    className="w-2.5 h-2.5"
                    style={{ color: "var(--background)" }}
                  />
                </span>
                <span className="font-mono tracking-tight">
                  {truncate(ownerWallet, 6, 6)}
                </span>
                <Copy
                  className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity"
                />
                {copied && (
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    copied
                  </span>
                )}
              </button>
            )}
          </div>

          <Link
            href="/vault/new"
            className="group inline-flex items-center gap-2 h-11 px-5 rounded-[12px] text-[14px] font-semibold transition-opacity duration-200 hover:opacity-90 self-start sm:self-auto"
            style={{
              background: "var(--text-primary)",
              color: "var(--background)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.10)",
            }}
          >
            <Plus className="w-4 h-4" />
            Create vault
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        {/* ─── Summary strip (only when we have vaults) ─── */}
        {entries && entries.length > 0 && totals && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
          >
            <StatTile label="Vaults" value={entries.length.toString()} />
            <StatTile label="Active" value={totals.active.toString()} />
            <StatTile
              label="Paused"
              value={totals.paused.toString()}
              muted
            />
            <StatTile
              label="Spent today"
              value={fmtUsd(totals.spentToday)}
              sub={totals.dailyCap > 0 ? `of ${fmtUsd(totals.dailyCap)} cap` : undefined}
            />
          </motion.div>
        )}

        {/* ─── Body ─── */}
        {entries === null ? (
          <LoadingGrid />
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <AnimatePresence initial={false}>
              {entries.map((entry, i) => (
                <VaultCard key={entry.vault.id} entry={entry} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {error && (
          <p
            className="mt-6 text-[13px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Couldn&apos;t load vaults: {error}. Try refreshing.
          </p>
        )}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*                            Sub-components                          */
/* ═══════════════════════════════════════════════════════════════════ */

function StatTile({
  label,
  value,
  sub,
  muted,
}: {
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div
      className="px-4 py-3.5 rounded-[14px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div
        className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-[22px] font-semibold tracking-[-0.02em] font-mono-numbers"
        style={{
          color: muted ? "var(--text-tertiary)" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[11.5px] mt-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function VaultCard({
  entry,
  index,
}: {
  entry: VaultSummary;
  index: number;
}) {
  const { vault, budget, lastPayment } = entry;
  const paused = vault.pausedAt !== null;
  const util = Math.round(budget.dailyUtilization * 100);
  const isMainnet = vault.network === "mainnet";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.985 }}
      transition={{ duration: 0.55, ease: EASE, delay: Math.min(index * 0.045, 0.25) }}
    >
      <Link
        href={`/vault/${vault.id}`}
        className="group block p-5 sm:p-6 rounded-[20px] transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.03), 0 10px 28px rgba(0,0,0,0.04)",
        }}
      >
        {/* Row 1 — identity + status */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[22px] flex-shrink-0"
              style={{
                background: "var(--surface-2)",
                border: "0.5px solid var(--border-subtle)",
              }}
            >
              <span aria-hidden>{vault.emoji || "🧭"}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="text-[16.5px] font-semibold tracking-[-0.015em] truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {vault.name}
                </h3>
                <NetworkPill mainnet={isMainnet} />
              </div>
              <p
                className="mt-0.5 text-[12.5px] truncate"
                style={{ color: "var(--text-tertiary)" }}
              >
                {vault.purpose || "research agent"} ·{" "}
                <span className="font-mono">
                  {truncate(vault.squadsAddress, 4, 4)}
                </span>
              </p>
            </div>
          </div>

          <StatusPill paused={paused} />
        </div>

        {/* Row 2 — daily budget meter */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-1.5">
            <span
              className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Daily budget
            </span>
            <span
              className="text-[12px] font-mono-numbers font-medium tabular-nums"
              style={{ color: "var(--text-secondary)" }}
            >
              <span style={{ color: "var(--text-primary)" }}>
                {fmtUsd(budget.spentToday)}
              </span>{" "}
              / {fmtUsd(budget.dailyLimitUsd)}
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--surface-2)" }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${util}%` }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              className="h-full rounded-full"
              style={{
                background:
                  util >= 90
                    ? "linear-gradient(90deg, #f59e0b, #dc2626)"
                    : "var(--text-primary)",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span
              className="text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {util}% used · {fmtUsd(Math.max(0, budget.dailyLimitUsd - budget.spentToday))} left
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Weekly {fmtUsd(budget.spentThisWeek)} / {fmtUsd(budget.weeklyLimitUsd)}
            </span>
          </div>
        </div>

        {/* Row 3 — last activity + policy badges */}
        <div
          className="mt-5 pt-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <LastActivity payment={lastPayment} />
          <div
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold group-hover:gap-2 transition-all"
            style={{ color: "var(--text-primary)" }}
          >
            Open
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function NetworkPill({ mainnet }: { mainnet: boolean }) {
  return (
    <span
      className="inline-flex items-center h-5 px-1.5 rounded-[5px] text-[9.5px] font-semibold uppercase tracking-[0.06em]"
      style={{
        background: mainnet ? "rgba(16,185,129,0.08)" : "var(--surface-2)",
        color: mainnet ? "#047857" : "var(--text-tertiary)",
        border: mainnet ? "0.5px solid rgba(16,185,129,0.25)" : "0.5px solid var(--border-subtle)",
      }}
    >
      {mainnet ? "Mainnet" : "Devnet"}
    </span>
  );
}

function StatusPill({ paused }: { paused: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-semibold tracking-[0.02em] whitespace-nowrap"
      style={{
        background: paused ? "rgba(245,158,11,0.10)" : "rgba(16,185,129,0.10)",
        color: paused ? "#b45309" : "#047857",
        border: paused
          ? "0.5px solid rgba(245,158,11,0.28)"
          : "0.5px solid rgba(16,185,129,0.28)",
      }}
    >
      {paused ? (
        <>
          <Pause className="w-2.5 h-2.5" /> Paused
        </>
      ) : (
        <>
          <ShieldCheck className="w-2.5 h-2.5" /> Live
        </>
      )}
    </span>
  );
}

function LastActivity({
  payment,
}: {
  payment: VaultSummary["lastPayment"];
}) {
  if (!payment) {
    return (
      <div
        className="text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        No activity yet
      </div>
    );
  }

  const statusColor: Record<"allowed" | "settled" | "blocked" | "failed", string> = {
    allowed: "#047857",
    settled: "#047857",
    blocked: "#b45309",
    failed: "#b91c1c",
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 text-[12px]">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: statusColor[payment.status] ?? "var(--text-primary)" }}
        />
        <span
          className="font-medium truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {payment.merchant}
        </span>
        <span
          className="font-mono-numbers tabular-nums flex-shrink-0"
          style={{ color: "var(--text-primary)" }}
        >
          {fmtUsd(payment.amountUsd)}
        </span>
      </div>
      <div
        className="text-[11px] mt-0.5 capitalize"
        style={{ color: "var(--text-tertiary)" }}
      >
        {payment.status} · {fmtRelative(payment.createdAt)}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-6 rounded-[20px] animate-pulse"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-[14px]"
              style={{ background: "var(--surface-2)" }}
            />
            <div className="flex-1 space-y-2">
              <div
                className="h-4 w-1/2 rounded"
                style={{ background: "var(--surface-2)" }}
              />
              <div
                className="h-3 w-2/3 rounded"
                style={{ background: "var(--surface-2)" }}
              />
            </div>
          </div>
          <div
            className="mt-6 h-1.5 w-full rounded-full"
            style={{ background: "var(--surface-2)" }}
          />
          <div
            className="mt-6 h-3 w-3/4 rounded"
            style={{ background: "var(--surface-2)" }}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-[24px] p-10 sm:p-14 text-center"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 18px 40px rgba(0,0,0,0.05)",
      }}
    >
      {/* Backdrop glow */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,0,0,0.04), transparent 70%)",
        }}
      />

      {/* Icon stack */}
      <div className="flex justify-center mb-5">
        <div className="relative">
          <div
            className="w-14 h-14 rounded-[18px] flex items-center justify-center"
            style={{
              background: "var(--text-primary)",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.08), 0 12px 28px rgba(0,0,0,0.12)",
            }}
          >
            <ShieldCheck
              className="w-6 h-6"
              style={{ color: "var(--background)" }}
            />
          </div>
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
            className="absolute -right-3 -top-3 w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border-subtle)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <Sparkles
              className="w-3.5 h-3.5"
              style={{ color: "var(--text-primary)" }}
            />
          </motion.div>
        </div>
      </div>

      <h2
        className="text-[26px] font-semibold tracking-[-0.02em]"
        style={{ color: "var(--text-primary)" }}
      >
        No vaults yet.
      </h2>
      <p
        className="mt-2 max-w-[460px] mx-auto text-[14.5px] leading-[1.55]"
        style={{ color: "var(--text-secondary)" }}
      >
        A vault is a Squads v4 smart account with a policy layer. Set
        limits, pick allowed merchants, and hand the agent a key that
        carries budgets — not bearer power.
      </p>

      <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/vault/new"
          className="group inline-flex items-center gap-2 h-12 px-6 rounded-[14px] text-[14.5px] font-semibold transition-opacity duration-200 hover:opacity-90"
          style={{
            background: "var(--text-primary)",
            color: "var(--background)",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.10)",
          }}
        >
          Create your first vault
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 h-12 px-5 rounded-[14px] text-[13.5px] font-semibold transition-colors duration-200"
          style={{
            background: "var(--surface-2)",
            color: "var(--text-secondary)",
            border: "0.5px solid var(--border-subtle)",
          }}
        >
          Read the docs
        </Link>
      </div>

      {/* Micro-stat row (conceptual — matches the product's pitch) */}
      <div
        className="mt-9 pt-6 border-t grid grid-cols-3 gap-4 max-w-[520px] mx-auto"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <MiniFact top="Squads v4" bottom="Smart account" />
        <MiniFact top="Policy-first" bottom="Budgets, not keys" />
        <MiniFact top="< 2 min" bottom="To first vault" />
      </div>
    </motion.div>
  );
}

function MiniFact({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div>
      <div
        className="text-[14px] font-semibold tracking-[-0.01em]"
        style={{ color: "var(--text-primary)" }}
      >
        {top}
      </div>
      <div
        className="text-[11.5px] mt-0.5"
        style={{ color: "var(--text-tertiary)" }}
      >
        {bottom}
      </div>
    </div>
  );
}
