"use client";

/**
 * UserVaultCard — the user's own worker as a Worker Card.
 *
 * Mirrors the structure of WorkerCard (Atlas) but with the user's
 * vault data instead. Used in two places:
 *
 *   1. /app — as the hero (replaces Atlas as the protagonist on
 *      the user's own device)
 *   2. /app/vaults/[id] — as the page body
 *
 * Critical UX moment in here: FirstCallPanel. Brand-new users have
 * a $0 vault, no KAST, no SDK setup. The chain-refuses-a-violation
 * scenario via /api/atlas/probe-scenarios works regardless — it
 * produces a real failed-tx signature with a custom error code. So
 * the "first call" we walk the user through is the unforgettable
 * moment: their OWN policy program refusing a $5 attempt against a
 * $0.50 per-tx cap, on-chain, in 3 seconds.
 *
 * No fake activity. No simulated economy. Real on-chain proof.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Code2,
  ExternalLink,
  Shield,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const POLICY_PROGRAM = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

export interface VaultRecord {
  id: string;
  ownerWallet: string;
  name: string;
  emoji: string;
  network: "devnet" | "mainnet";
  dailyLimitUsd: number;
  weeklyLimitUsd: number;
  perTxMaxUsd: number;
  maxCallsPerWindow: number;
  velocityWindow: string;
  allowedMerchants: string[];
  requireMemo: boolean;
  vaultPda: string | null;
  squadsAddress: string;
  pausedAt: string | null;
  createdAt: string;
}

export interface BudgetSnapshot {
  dailyLimitUsd: number;
  weeklyLimitUsd: number;
  perTxMaxUsd: number;
  spentToday: number;
  spentThisWeek: number;
  dailyRemaining: number;
  weeklyRemaining: number;
  dailyUtilization: number;
  weeklyUtilization: number;
}

export interface Payment {
  id: string;
  createdAt: string;
  merchant: string;
  amountUsd: number;
  status: "settled" | "blocked" | "failed" | "allowed";
  reason?: string | null;
  txSignature?: string | null;
  memo?: string | null;
}

export interface VaultPayload {
  vault: VaultRecord;
  budget: BudgetSnapshot;
  payments: Payment[];
}

export function deriveSerial(vaultId: string): string {
  return `KVN-${vaultId.replace("vlt_", "").slice(0, 8).toUpperCase()}`;
}

interface Props {
  data: VaultPayload;
  ownerWallet: string | null;
  now: number;
  /** Show the first-call panel. Default true. */
  firstCall?: boolean;
  className?: string;
}

export function UserVaultCard({
  data,
  ownerWallet,
  now,
  firstCall = true,
  className,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className={`relative w-full ${className ?? ""}`}
      style={{
        background: "#FFFFFF",
        borderRadius: 20,
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 24px 60px -28px rgba(15,23,42,0.18)",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative p-5 sm:p-6 flex flex-col gap-5">
        <Identity vault={data.vault} payments={data.payments} now={now} />
        <RuntimePanel vault={data.vault} now={now} />
        {firstCall && (
          <FirstCallPanel
            vaultId={data.vault.id}
            ownerWallet={ownerWallet}
            perTxMaxUsd={data.budget.perTxMaxUsd}
            network={data.vault.network}
          />
        )}
        <PolicyRibbon budget={data.budget} />
        <StatsGrid vault={data.vault} payments={data.payments} />
        <RecentActivity payments={data.payments} network={data.vault.network} />
        <Allowlist merchants={data.vault.allowedMerchants} />
        <Footer network={data.vault.network} />
      </div>
    </motion.div>
  );
}

/* ─── Identity ──────────────────────────────────────────────────── */

function Identity({
  vault,
  payments,
  now,
}: {
  vault: VaultRecord;
  payments: Payment[];
  now: number;
}) {
  const lastEvent = payments[0];
  const lastTs = lastEvent ? parseTs(lastEvent.createdAt) : null;
  const lastRel = lastTs ? relTime(now - lastTs) : null;
  const alive = !vault.pausedAt;
  const serial = deriveSerial(vault.id);

  return (
    <div className="flex items-start gap-4">
      <Avatar emoji={vault.emoji} alive={alive} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2
            className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.015em] truncate"
            style={{ color: "#0A0A0A" }}
          >
            {vault.name}
          </h2>
          <span
            className="font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-md"
            style={{
              fontSize: 9,
              color: "rgba(15,23,42,0.65)",
              background: "rgba(15,23,42,0.04)",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            Your worker · vault
          </span>
        </div>
        <p
          className="mt-0.5 text-[12.5px]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          <span className="font-mono">{serial}</span> · Solana {vault.network}
        </p>

        <div className="mt-2 flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5">
            <motion.span
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                background: alive ? "#22C55E" : "#9CA3AF",
                boxShadow: alive
                  ? "0 0 0 3px rgba(34,197,94,0.18), 0 0 8px #22C55E"
                  : "none",
              }}
              animate={
                alive ? { opacity: [0.55, 1, 0.55] } : { opacity: 0.55 }
              }
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 9.5, color: alive ? "#15803D" : "#9CA3AF" }}
            >
              {alive ? "Runtime online" : "Paused"}
            </span>
          </span>
          {lastRel ? (
            <>
              <Sep />
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "rgba(15,23,42,0.65)" }}
              >
                last call {lastRel}
              </span>
            </>
          ) : (
            <>
              <Sep />
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "rgba(15,23,42,0.55)" }}
              >
                no calls yet
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ emoji, alive }: { emoji: string; alive: boolean }) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: 56, height: 56 }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-[14px]"
        animate={
          alive
            ? {
                boxShadow: [
                  "0 0 0 2px rgba(34,197,94,0.25)",
                  "0 0 0 2px rgba(34,197,94,0.45), 0 0 10px rgba(34,197,94,0.25)",
                  "0 0 0 2px rgba(34,197,94,0.25)",
                ],
              }
            : {
                boxShadow: "0 0 0 2px rgba(15,23,42,0.12)",
              }
        }
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 rounded-[14px] flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0A0A0A 0%, #1F2937 100%)",
        }}
      >
        <span style={{ fontSize: 24, lineHeight: 1 }}>{emoji}</span>
      </div>
      <div
        aria-hidden
        className="absolute inset-px rounded-[13px] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)",
        }}
      />
    </div>
  );
}

/* ─── Runtime Panel (dark terminal) ──────────────────────────────── */

function RuntimePanel({ vault, now }: { vault: VaultRecord; now: number }) {
  const phrases = useMemo(
    () => [
      "policy compiled",
      "allowlist enforced",
      "vault on-chain",
      "spending limit attached",
      "kill switch armed",
      "awaiting first SDK call",
    ],
    [],
  );
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % phrases.length), 3500);
    return () => clearInterval(t);
  }, [phrases.length]);

  const ageMs = now - new Date(vault.createdAt).getTime();
  const age = ageMs > 0 ? formatAge(ageMs) : "0s";

  return (
    <div
      className="relative rounded-[14px] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0A0E1A 0%, #0F1426 100%)",
        border: "1px solid rgba(34,197,94,0.18)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 24px -8px rgba(34,197,94,0.18)",
      }}
    >
      <div className="px-4 py-3.5 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono uppercase tracking-[0.18em]"
            style={{ fontSize: 9, color: "rgba(134,239,172,0.75)" }}
          >
            Runtime Status
          </span>
          <span
            className="font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
            style={{
              fontSize: 8.5,
              color: "rgba(134,239,172,0.85)",
              background: "rgba(34,197,94,0.10)",
              border: "1px solid rgba(34,197,94,0.18)",
            }}
          >
            attached · age {age}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span
            className="font-mono mt-0.5"
            style={{ fontSize: 13, color: "#86EFAC" }}
          >
            &gt;
          </span>
          <span
            className="font-mono leading-[1.55]"
            style={{
              fontSize: 13.5,
              color: "#E5E7EB",
              letterSpacing: "-0.005em",
            }}
          >
            Awaiting strategy. Wire your code via{" "}
            <span style={{ color: "#86EFAC" }}>@kyvernlabs/sdk</span> to
            define this worker&apos;s behavior — every call routes through the
            policy program.
          </span>
        </div>

        <div className="flex items-center gap-2.5 mt-1 flex-wrap">
          <span className="flex items-center gap-1.5">
            <motion.span
              className="rounded-full"
              style={{ width: 5, height: 5, background: "#86EFAC" }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="font-mono"
                style={{ fontSize: 10.5, color: "rgba(134,239,172,0.75)" }}
              >
                {phrases[idx]}…
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(134,239,172,0.45), transparent)",
        }}
      />
    </div>
  );
}

/* ─── First-call panel ──────────────────────────────────────────── */

interface FirstCallResult {
  ok: boolean;
  signature: string | null;
  explorerUrl: string | null;
  expectedErrorCode?: number;
  expectedErrorName?: string;
  message?: string;
  scenario?: string;
}

function FirstCallPanel({
  vaultId,
  ownerWallet,
  perTxMaxUsd,
  network,
}: {
  vaultId: string;
  ownerWallet: string | null;
  perTxMaxUsd: number;
  network: "devnet" | "mainnet";
}) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FirstCallResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fire = useCallback(async () => {
    if (!ownerWallet || running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/atlas/probe-scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({
          scenario: "amount_exceeds_per_tx",
          vaultId,
        }),
      });
      const d = (await r.json()) as FirstCallResult & { error?: string };
      if (!r.ok || d?.error) {
        setError(d?.message ?? d?.error ?? `request failed (${r.status})`);
      } else if (d?.signature) {
        const explorerUrl =
          d.explorerUrl ??
          `https://explorer.solana.com/tx/${d.signature}?cluster=${network}`;
        setResult({ ...d, explorerUrl });
      } else {
        setError("No signature returned");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setRunning(false);
    }
  }, [ownerWallet, running, vaultId, network]);

  return (
    <div
      className="rounded-[14px] p-4 flex flex-col gap-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(34,197,94,0.05) 0%, #FFFFFF 100%)",
        border: "1.5px solid rgba(34,197,94,0.30)",
        boxShadow: "0 0 0 4px rgba(34,197,94,0.04)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <Zap
          className="w-4 h-4 flex-shrink-0 mt-0.5"
          strokeWidth={2.2}
          style={{ color: "#15803D" }}
        />
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <h4
            className="text-[14px] font-semibold tracking-[-0.005em]"
            style={{ color: "#0A0A0A" }}
          >
            Make your worker&apos;s first call
          </h4>
          <p
            className="text-[12px] leading-[1.45]"
            style={{ color: "rgba(15,23,42,0.65)" }}
          >
            Send a $5 payment attempt. Your policy program refuses it on-chain
            because per-tx cap is ${perTxMaxUsd.toFixed(2)}. Real Solana tx,
            real failure code, real Explorer link in 3 seconds.
          </p>
        </div>
      </div>

      <button
        onClick={fire}
        disabled={running || !ownerWallet}
        className="group inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[10px] text-[13px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: running
            ? "rgba(15,23,42,0.06)"
            : "linear-gradient(180deg, #15803D 0%, #166534 100%)",
          color: running ? "rgba(15,23,42,0.55)" : "#FFFFFF",
          boxShadow: running
            ? "none"
            : "0 1px 2px rgba(21,128,61,0.30), 0 8px 24px -12px rgba(21,128,61,0.40)",
        }}
      >
        {running ? (
          <>
            <span
              className="w-3.5 h-3.5 border-2 rounded-full animate-spin flex-shrink-0"
              style={{
                borderColor: "rgba(15,23,42,0.15)",
                borderTopColor: "rgba(15,23,42,0.55)",
              }}
            />
            Submitting on Solana…
          </>
        ) : (
          <>
            <ShieldAlert className="w-4 h-4" strokeWidth={2.2} />
            Watch the chain refuse a violation
            <ArrowRight
              className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.2}
            />
          </>
        )}
      </button>

      <AnimatePresence>
        {result?.signature && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="rounded-[10px] p-3"
            style={{
              background: "linear-gradient(180deg, #0A0E1A 0%, #0F1426 100%)",
              border: "1px solid rgba(245,158,11,0.30)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Shield
                className="w-3.5 h-3.5 flex-shrink-0"
                strokeWidth={2.2}
                style={{ color: "#FCA5A5" }}
              />
              <span
                className="font-mono uppercase tracking-[0.14em]"
                style={{ fontSize: 9.5, color: "#FCA5A5" }}
              >
                Refused on-chain
              </span>
              {result.expectedErrorCode && (
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    color: "rgba(252,165,165,0.65)",
                  }}
                >
                  · code {result.expectedErrorCode}
                </span>
              )}
            </div>
            <p
              className="font-mono leading-[1.5]"
              style={{
                fontSize: 12.5,
                color: "#E5E7EB",
                letterSpacing: "-0.005em",
              }}
            >
              <span style={{ color: "#86EFAC" }}>KyvernPolicy</span>::
              <span style={{ color: "#FCA5A5" }}>
                {result.expectedErrorName ?? "AmountExceedsPerTxMax"}
              </span>{" "}
              — $5 attempted vs ${perTxMaxUsd.toFixed(2)} per-tx cap
            </p>
            {result.explorerUrl && (
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-mono hover:underline"
                style={{ color: "#86EFAC" }}
              >
                <span className="truncate max-w-[260px]">
                  Sig{" "}
                  {result.signature.slice(0, 8)}…
                  {result.signature.slice(-8)}
                </span>
                <ExternalLink className="w-3 h-3" strokeWidth={2.2} />
              </a>
            )}
            <p
              className="mt-2 text-[11px] leading-[1.45]"
              style={{ color: "rgba(229,231,235,0.55)" }}
            >
              This is the moat. Every payment your code makes routes through
              this exact on-chain check.
            </p>
          </motion.div>
        )}
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[10px] px-3 py-2 text-[12px]"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.20)",
              color: "#B45309",
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <Link
        href="/app/developer"
        className="group inline-flex items-center gap-1.5 text-[11.5px] hover:underline self-start"
        style={{ color: "rgba(15,23,42,0.65)" }}
      >
        <Code2 className="w-3 h-3" strokeWidth={2} />
        Or send a real settled payment via the SDK
        <ArrowRight
          className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </Link>
    </div>
  );
}

/* ─── Policy Ribbon ──────────────────────────────────────────────── */

function PolicyRibbon({ budget }: { budget: BudgetSnapshot }) {
  const utilPct = Math.min(100, Math.round(budget.dailyUtilization * 100));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Activity
          className="w-3 h-3"
          style={{ color: "rgba(15,23,42,0.45)" }}
          strokeWidth={2}
        />
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
        >
          Policy enforced on-chain
        </span>
      </div>

      <div
        className="rounded-[12px] p-3 flex flex-col gap-2.5"
        style={{
          background:
            "linear-gradient(180deg, rgba(34,197,94,0.04) 0%, rgba(15,23,42,0.02) 100%)",
          border: "1px solid rgba(15,23,42,0.05)",
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <RibbonCell
            label="Daily cap"
            value={`$${budget.dailyLimitUsd.toFixed(2)}`}
            sub={`$${budget.spentToday.toFixed(2)} spent`}
          />
          <RibbonCell
            label="Weekly cap"
            value={`$${budget.weeklyLimitUsd.toFixed(2)}`}
            sub={`$${budget.spentThisWeek.toFixed(2)} spent`}
          />
          <RibbonCell
            label="Per-tx max"
            value={`$${budget.perTxMaxUsd.toFixed(2)}`}
            sub="hard ceiling"
          />
          <RibbonCell
            label="Allowlist"
            value="enforced"
            sub="merchant-locked"
            tone="green"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 9, color: "rgba(15,23,42,0.50)" }}
            >
              Today&apos;s utilization
            </span>
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: 10.5, color: "rgba(15,23,42,0.65)" }}
            >
              {utilPct}%
            </span>
          </div>
          <div
            className="relative h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(15,23,42,0.06)" }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: utilPct >= 90 ? "#B45309" : "#22C55E",
                opacity: utilPct === 0 ? 0 : 1,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, utilPct)}%` }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RibbonCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "green";
}) {
  const valueColor = tone === "green" ? "#15803D" : "#0A0A0A";
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 8.5, color: "rgba(15,23,42,0.55)" }}
      >
        {label}
      </span>
      <span
        className="font-mono tabular-nums font-semibold whitespace-nowrap"
        style={{
          fontSize: 14,
          color: valueColor,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
      <span
        className="text-[10px]"
        style={{ color: "rgba(15,23,42,0.45)" }}
      >
        {sub}
      </span>
    </div>
  );
}

/* ─── Stats Grid ─────────────────────────────────────────────────── */

function StatsGrid({
  vault,
  payments,
}: {
  vault: VaultRecord;
  payments: Payment[];
}) {
  const callsToday = payments.filter((p) => isToday(parseTs(p.createdAt))).length;
  const blockedToday = payments.filter(
    (p) =>
      isToday(parseTs(p.createdAt)) &&
      (p.status === "blocked" || p.status === "failed"),
  ).length;
  const vaultAddr = vault.vaultPda ?? vault.squadsAddress ?? "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <StatTile label="Calls today" value={callsToday.toLocaleString()} />
      <StatTile
        label="Blocked today"
        value={blockedToday.toLocaleString()}
        tone={blockedToday > 0 ? "amber" : undefined}
      />
      <StatTile
        label="Allowed merchants"
        value={vault.allowedMerchants.length.toString()}
      />
      <StatTile
        label="Vault PDA"
        value={
          vaultAddr.length > 8
            ? `${vaultAddr.slice(0, 4)}…${vaultAddr.slice(-4)}`
            : vaultAddr
        }
        mono
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "amber";
  mono?: boolean;
}) {
  const valueColor = tone === "amber" ? "#B45309" : "#0A0A0A";
  return (
    <div
      className="rounded-[12px] p-3 flex flex-col gap-1"
      style={{
        background: "rgba(15,23,42,0.025)",
        border: "1px solid rgba(15,23,42,0.05)",
      }}
    >
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 8.5, color: "rgba(15,23,42,0.55)" }}
      >
        {label}
      </span>
      <span
        className={`tabular-nums font-semibold ${mono ? "font-mono" : "font-mono"}`}
        style={{
          fontSize: mono ? 13 : 16,
          color: valueColor,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Recent Activity ────────────────────────────────────────────── */

function RecentActivity({
  payments,
  network,
}: {
  payments: Payment[];
  network: "devnet" | "mainnet";
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Sparkles
          className="w-3 h-3"
          style={{ color: "rgba(15,23,42,0.45)" }}
          strokeWidth={2}
        />
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
        >
          Recent SDK Calls
        </span>
      </div>

      {payments.length === 0 ? (
        <div
          className="rounded-[12px] p-4 text-center"
          style={{
            background: "rgba(15,23,42,0.025)",
            border: "1px dashed rgba(15,23,42,0.10)",
          }}
        >
          <p className="text-[12.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
            No calls yet. Click <span style={{ fontWeight: 600 }}>Watch the
            chain refuse</span> above for your first on-chain proof, or
            <span className="font-mono"> vault.pay()</span> from your code.
          </p>
        </div>
      ) : (
        <div
          className="rounded-[12px] overflow-hidden"
          style={{ border: "1px solid rgba(15,23,42,0.05)" }}
        >
          {payments.slice(0, 5).map((p, i) => (
            <PaymentRow
              key={p.id}
              p={p}
              network={network}
              isLast={i === Math.min(payments.length, 5) - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentRow({
  p,
  isLast,
  network,
}: {
  p: Payment;
  isLast: boolean;
  network: "devnet" | "mainnet";
}) {
  const ts = formatHHMM(parseTs(p.createdAt));
  const explorerUrl = p.txSignature
    ? `https://explorer.solana.com/tx/${p.txSignature}?cluster=${network}`
    : null;
  return (
    <div
      className="px-3 py-2.5 flex items-center gap-3"
      style={{
        background: "#FFFFFF",
        borderBottom: isLast ? undefined : "1px solid rgba(15,23,42,0.04)",
      }}
    >
      <span
        className="font-mono tabular-nums flex-shrink-0"
        style={{ fontSize: 10.5, color: "rgba(15,23,42,0.45)", width: 38 }}
      >
        {ts}
      </span>
      <span
        className="text-[12px] truncate flex-1 min-w-0"
        style={{ color: "rgba(15,23,42,0.75)" }}
        title={p.merchant}
      >
        {p.merchant}
      </span>
      <PaymentChip status={p.status} amountUsd={p.amountUsd} />
      {explorerUrl ? (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0"
          aria-label="View on Explorer"
        >
          <ExternalLink
            className="w-3 h-3"
            style={{ color: "rgba(15,23,42,0.40)" }}
            strokeWidth={2}
          />
        </a>
      ) : (
        <span style={{ width: 12 }} />
      )}
    </div>
  );
}

function PaymentChip({
  status,
  amountUsd,
}: {
  status: Payment["status"];
  amountUsd: number;
}) {
  let bg = "rgba(15,23,42,0.04)";
  let color = "rgba(15,23,42,0.55)";
  let label: string = status;
  if (status === "settled" || status === "allowed") {
    bg = "rgba(34,197,94,0.10)";
    color = "#15803D";
    label = `+$${amountUsd.toFixed(amountUsd < 0.1 ? 3 : 2)}`;
  } else if (status === "blocked" || status === "failed") {
    bg = "rgba(245,158,11,0.10)";
    color = "#B45309";
  }
  return (
    <span
      className="font-mono uppercase tracking-[0.10em] px-1.5 py-0.5 rounded flex-shrink-0"
      style={{ fontSize: 9, color, background: bg }}
    >
      {label}
    </span>
  );
}

/* ─── Allowlist ──────────────────────────────────────────────────── */

function Allowlist({ merchants }: { merchants: string[] }) {
  if (!merchants || merchants.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Shield
            className="w-3 h-3"
            style={{ color: "rgba(15,23,42,0.45)" }}
            strokeWidth={2}
          />
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
          >
            Merchant allowlist
          </span>
        </div>
        <div
          className="rounded-[12px] p-3 text-[12px]"
          style={{
            background: "rgba(245,158,11,0.04)",
            border: "1px solid rgba(245,158,11,0.18)",
            color: "#B45309",
          }}
        >
          No merchants whitelisted — every payment will be refused on-chain
          until you add at least one.
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Shield
          className="w-3 h-3"
          style={{ color: "#15803D" }}
          strokeWidth={2.2}
        />
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
        >
          Merchant allowlist
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
        >
          · {merchants.length} approved
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {merchants.map((m) => (
          <span
            key={m}
            className="font-mono px-2 py-1 rounded-md text-[11px]"
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.18)",
              color: "#0A0A0A",
            }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */

function Footer({ network }: { network: "devnet" | "mainnet" }) {
  return (
    <div
      className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t"
      style={{ borderColor: "rgba(15,23,42,0.05)", paddingTop: 12 }}
    >
      <span
        className="text-[10.5px]"
        style={{ color: "rgba(15,23,42,0.45)" }}
      >
        Authorization enforced by{" "}
        <a
          href={`https://explorer.solana.com/address/${POLICY_PROGRAM}?cluster=${network}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono hover:underline"
          style={{ color: "rgba(15,23,42,0.65)" }}
        >
          PpmZ…MSqc
        </a>{" "}
        · secured by Squads v4
      </span>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function Sep() {
  return (
    <span style={{ width: 1, height: 10, background: "rgba(15,23,42,0.10)" }} />
  );
}

function parseTs(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string" || raw.length === 0) return 0;
  let ms = Date.parse(raw);
  if (isNaN(ms)) {
    const norm = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
    ms = Date.parse(norm);
  }
  return isNaN(ms) ? 0 : ms;
}

function isToday(ms: number): boolean {
  if (!ms) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return ms >= start.getTime();
}

function relTime(diffMs: number): string {
  if (diffMs < 5_000) return "just now";
  if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  return `${Math.floor(diffMs / 3_600_000)}h ago`;
}

function formatAge(ms: number): string {
  if (ms <= 0) return "0s";
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return `${Math.floor(ms / 1000)}s`;
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${totalMin % 60}m`;
  return `${totalMin}m`;
}

function formatHHMM(ms: number): string {
  if (!ms) return "--:--";
  try {
    const d = new Date(ms);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
}
