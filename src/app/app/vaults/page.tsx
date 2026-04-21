"use client";

/* ════════════════════════════════════════════════════════════════════
   /app/vaults — vault list inside the unified shell.

   Renders the same cards as /vault but without the Navbar + outer hero,
   because /app already has both. Same data source, same link targets
   (/vault/[id] still opens the deep dashboard — that page stays
   standalone until we port the entire dashboard into the shell).
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Pause,
  Plus,
  ShieldCheck,
  Wallet as WalletIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const EASE = [0.25, 0.1, 0.25, 1] as const;

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

function devFallbackWallet(): string {
  if (typeof window === "undefined")
    return "DevPlaceholderWallet11111111111111111111111";
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

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${n.toFixed(n < 10 ? 2 : 0)}`;
}

function truncate(s: string, head = 4, tail = 4): string {
  if (!s || s.length <= head + tail + 2) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function relTime(iso: string): string {
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
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function AppVaultsPage() {
  const { wallet, isLoading: authLoading } = useAuth();

  const [owner, setOwner] = useState<string | null>(null);
  const [entries, setEntries] = useState<VaultSummary[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setOwner(wallet ?? devFallbackWallet());
  }, [wallet, authLoading]);

  const load = useCallback(() => {
    if (!owner) return;
    setEntries(null);
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => setEntries((d?.vaults ?? []) as VaultSummary[]))
      .catch(() => setEntries([]));
  }, [owner]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    if (!entries) return null;
    const active = entries.filter((e) => e.vault.pausedAt == null).length;
    const paused = entries.length - active;
    const spentToday = entries.reduce((a, e) => a + e.budget.spentToday, 0);
    return { active, paused, spentToday };
  }, [entries]);

  return (
    <div className="space-y-7 pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2"
      >
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
            style={{ color: "#4F46E5" }}
          >
            Agents
          </p>
          <h1
            className="tracking-[-0.035em] text-balance"
            style={{
              fontSize: "clamp(30px, 4.2vw, 42px)",
              lineHeight: 1.02,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Your agents.
          </h1>
          <p
            className="mt-2 text-[14.5px] leading-[1.55] max-w-[580px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Each agent is a Squads multisig + Kyvern policy PDA + bound
            keypair. Fund it once, set the rules on-chain, and let it operate
            autonomously — Solana enforces every boundary.
          </p>
        </div>
        <Link
          href="/vault/new"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[11px] text-[13px] font-semibold transition-opacity hover:opacity-90 shrink-0"
          style={{ background: "var(--text-primary)", color: "var(--background)" }}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          Deploy agent
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>

      {/* Stat tiles */}
      {entries && entries.length > 0 && totals && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <StatTile label="Vaults" value={entries.length.toString()} />
          <StatTile label="Active" value={totals.active.toString()} />
          <StatTile label="Paused" value={totals.paused.toString()} muted />
          <StatTile
            label="Spent today"
            value={fmtUsd(totals.spentToday)}
          />
        </motion.div>
      )}

      {/* Body */}
      {entries === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-48 rounded-[18px] animate-pulse"
              style={{ background: "var(--surface-2)" }}
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <AnimatePresence initial={false}>
            {entries.map((e, i) => (
              <VaultCard key={e.vault.id} entry={e} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div
      className="p-4 rounded-[14px]"
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
    </div>
  );
}

function VaultCard({ entry, index }: { entry: VaultSummary; index: number }) {
  const { vault, budget, lastPayment } = entry;
  const paused = vault.pausedAt !== null;
  const util = Math.round(budget.dailyUtilization * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.985 }}
      transition={{
        duration: 0.5,
        ease: EASE,
        delay: Math.min(index * 0.045, 0.25),
      }}
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
                <span
                  className="inline-flex items-center h-5 px-1.5 rounded-[5px] text-[9.5px] font-semibold uppercase tracking-[0.06em]"
                  style={{
                    background:
                      vault.network === "mainnet"
                        ? "rgba(16,185,129,0.08)"
                        : "var(--surface-2)",
                    color:
                      vault.network === "mainnet"
                        ? "#047857"
                        : "var(--text-tertiary)",
                  }}
                >
                  {vault.network}
                </span>
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
          <span
            className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-semibold tracking-[0.02em] whitespace-nowrap"
            style={{
              background: paused
                ? "rgba(245,158,11,0.10)"
                : "rgba(16,185,129,0.10)",
              color: paused ? "#b45309" : "#047857",
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
        </div>

        {/* Daily budget */}
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
                    ? "#EF4444"
                    : util >= 70
                      ? "#F59E0B"
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

        {/* Last activity */}
        <div
          className="mt-5 pt-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {lastPayment ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[12px]">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background:
                      lastPayment.status === "allowed" ||
                      lastPayment.status === "settled"
                        ? "#047857"
                        : "#b45309",
                  }}
                />
                <span
                  className="font-medium truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {lastPayment.merchant}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  · {relTime(lastPayment.createdAt)}
                </span>
              </div>
            </div>
          ) : (
            <div
              className="text-[12px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              No activity yet
            </div>
          )}
          <span
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold group-hover:gap-2 transition-all"
            style={{ color: "var(--text-primary)" }}
          >
            Open
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="rounded-[20px] p-10 text-center"
      style={{
        background: "var(--surface)",
        border: "0.5px dashed var(--border)",
      }}
    >
      <div
        className="w-12 h-12 rounded-[14px] mx-auto mb-4 flex items-center justify-center"
        style={{ background: "#EEF0FF" }}
      >
        <WalletIcon className="w-5 h-5" style={{ color: "#4F46E5" }} />
      </div>
      <h2
        className="text-[18px] font-semibold tracking-[-0.02em] mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        No vaults yet.
      </h2>
      <p
        className="text-[13.5px] leading-[1.5] max-w-[420px] mx-auto"
        style={{ color: "var(--text-tertiary)" }}
      >
        Create your first vault in 60 seconds. Deploys a real Squads multisig +
        Kyvern policy PDA on Solana devnet.
      </p>
      <Link
        href="/vault/new"
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[11px] text-[13px] font-semibold mt-6 transition-opacity hover:opacity-90"
        style={{ background: "#4F46E5", color: "white" }}
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
        Create your first vault
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </motion.div>
  );
}
