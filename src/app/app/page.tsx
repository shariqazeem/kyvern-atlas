"use client";

/* ════════════════════════════════════════════════════════════════════
   /app — the unified Kyvern home.

   One screen. Both sides of agent commerce. Clean flow to everything.

   Sections (top to bottom):
     1. Welcome + two stat totals (spent / earned today)
     2. Two-column "Pay side" + "Earn side" summary cards
     3. Unified recent activity feed (outgoing + inbound in one stream)
     4. Quickstart checklist for brand-new accounts

   Data sources:
     · /api/vault/list?ownerWallet=…      (the pay side)
     · /api/pulse/stats?range=1d          (the earn side aggregate)
     · /api/pulse/recent?limit=10         (inbound events)

   Note: for the brand-new case (no vaults, no keys yet) the layout
   collapses to a single onboarding block that leads to /vault/new or
   /app/services. No empty-state dead-ends.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  Wallet,
  Globe,
  Plus,
  TrendingUp,
  ArrowLeftRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { JourneyChecklist } from "@/components/app/journey-checklist";
import { AtlasRunningStrip } from "@/components/vault/atlas-running-strip";
import { AttackLeaderboard } from "@/components/atlas/attack-leaderboard";
import { NumberScramble } from "@/components/atlas/number-scramble";
import { EASE_PREMIUM as EASE } from "@/lib/motion";

/* ─── Fallback dev wallet (mirrors /vault/new) ─── */
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

/* ─── Types (minimal — we only read what the home uses) ─── */

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
    status: "allowed" | "blocked" | "settled" | "failed";
    createdAt: string;
  } | null;
}

interface PulseStats {
  revenue: number;
  calls: number;
  customers: number;
  avg_price: number;
}

interface ActivityItem {
  key: string;
  side: "pay" | "earn";
  label: string; // "agent paid merchant.com" or "you received from agent"
  amount: number;
  status: "allowed" | "blocked" | "settled" | "failed" | "received";
  at: string;
  tx: string | null;
  network: "devnet" | "mainnet";
}

/* ─── Helpers ─── */

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  if (n === 0) return "$0";
  return n < 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(2)}`;
}

function relTime(iso: string): string {
  try {
    const d =
      iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso)
        ? new Date(iso)
        : new Date(iso.replace(" ", "T") + "Z");
    const diffMs = Date.now() - d.getTime();
    const s = Math.floor(diffMs / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return `${days}d`;
  } catch {
    return "—";
  }
}

function explorerUrl(
  sig: string | null,
  network: "devnet" | "mainnet" = "devnet",
): string | null {
  if (!sig) return null;
  const base = `https://explorer.solana.com/tx/${sig}`;
  return network === "devnet" ? `${base}?cluster=devnet` : base;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Night owl";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ═══════════════════════════════════════════════════════════════════ */

export default function AppHomePage() {
  const router = useRouter();
  const { wallet, isLoading: authLoading } = useAuth();

  const [owner, setOwner] = useState<string | null>(null);
  const [vaults, setVaults] = useState<VaultBrief[] | null>(null);
  const [pulseStats, setPulseStats] = useState<PulseStats | null>(null);
  const [pulseKeyCount, setPulseKeyCount] = useState<number>(0);

  // First-time visitor → redirect to /welcome for a 12s cinematic
  // orientation. The welcome page sets localStorage.welcomeSeen=1
  // on exit so this redirect stops firing for returning users.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (authLoading) return;
    try {
      const seen = window.localStorage.getItem("kyvern:welcomeSeen");
      if (!seen) {
        router.replace("/welcome");
      }
    } catch {
      /* storage unavailable — silently skip welcome. Better than never landing. */
    }
  }, [authLoading, router]);

  useEffect(() => {
    if (authLoading) return;
    setOwner(wallet ?? devFallbackWallet());
  }, [wallet, authLoading]);

  // Pay side — vault list
  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        if (cancelled) return;
        setVaults((d?.vaults ?? []) as VaultBrief[]);
      })
      .catch(() => !cancelled && setVaults([]));
    return () => {
      cancelled = true;
    };
  }, [owner]);

  // Earn side — stats + keys (best-effort; Pulse endpoints may 401 for
  // un-paying users; we treat that as "no data yet").
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetch("/api/pulse/stats?range=1d", { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : null),
      ),
      // Pulse keys live behind /api/auth/keys (our unified key store for
      // both agent-side and service-side credentials). There is no
      // /api/pulse/keys — that was a 404 in production console.
      fetch("/api/auth/keys", { credentials: "include" }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]).then(([statsRes, keysRes]) => {
      if (cancelled) return;
      if (statsRes.status === "fulfilled" && statsRes.value) {
        setPulseStats({
          revenue: Number(statsRes.value.revenue ?? 0),
          calls: Number(statsRes.value.calls ?? 0),
          customers: Number(statsRes.value.customers ?? 0),
          avg_price: Number(statsRes.value.avg_price ?? 0),
        });
      } else {
        setPulseStats({ revenue: 0, calls: 0, customers: 0, avg_price: 0 });
      }
      if (keysRes.status === "fulfilled" && keysRes.value) {
        const n = Array.isArray(keysRes.value?.keys)
          ? keysRes.value.keys.length
          : 0;
        setPulseKeyCount(n);
      } else {
        setPulseKeyCount(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived totals
  const spentToday = useMemo(
    () => (vaults ?? []).reduce((a, v) => a + v.budget.spentToday, 0),
    [vaults],
  );
  const activeVaults = useMemo(
    () => (vaults ?? []).filter((v) => v.vault.pausedAt == null).length,
    [vaults],
  );

  // Unified activity feed — merge outgoing (vault last payments) + inbound
  // (pulse recent — best-effort).
  const activity = useUnifiedActivity(vaults);

  const hasVaults = (vaults ?? []).length > 0;
  const hasServices = pulseKeyCount > 0 || (pulseStats?.calls ?? 0) > 0;
  const brandNew = vaults !== null && !hasVaults && !hasServices;

  // Journey checklist — live state across BOTH sides of the product.
  // Powers the top-of-page "take your agent all the way" card which
  // cross-converts pay users into earn and vice versa. Self-collapses
  // once every task is done. Balance is fetched lazily for the first
  // vault only (the next step is "fund this one" — batching for all
  // vaults would waste RPC without a clearer UX win).
  const firstVaultId = hasVaults ? (vaults![0].vault.id ?? null) : null;
  const [firstVaultBalance, setFirstVaultBalance] = useState<number | null>(
    null,
  );
  useEffect(() => {
    if (!firstVaultId) {
      setFirstVaultBalance(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/vault/${firstVaultId}/funding`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setFirstVaultBalance(
          d && typeof d.balanceUsdc === "number" ? d.balanceUsdc : 0,
        );
      })
      .catch(() => !cancelled && setFirstVaultBalance(0));
    return () => {
      cancelled = true;
    };
  }, [firstVaultId]);

  const hasSettledPayment = useMemo(() => {
    return (vaults ?? []).some(
      (v) =>
        v.budget.spentToday > 0 ||
        v.lastPayment?.status === "settled" ||
        v.lastPayment?.status === "allowed",
    );
  }, [vaults]);

  return (
    <div className="space-y-10 pb-16">
      {/* ── Network pulse — the live Atlas network sits above every
           user surface so "you are inside a running network" reads
           on first paint. Self-hides on /atlas / /tour. ── */}
      <AtlasRunningStrip />

      {/* ── Hello row ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col gap-1.5"
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--text-quaternary)" }}
        >
          {greeting()}
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
          Your agents on Solana.
        </h1>
      </motion.div>

      {brandNew ? (
        <BrandNewHero />
      ) : (
        <>
          {/* ── Journey checklist (Phase 2 · cross-conversion engine) ──
               Lives directly under the hello row so every returning user
               sees their progress across both sides. Self-dismissable +
               auto-collapses once every step is done. */}
          <JourneyChecklist
            state={{
              hasVault: hasVaults,
              vaultUsdcBalance: firstVaultBalance,
              hasSettledPayment,
              hasPulseKey: pulseKeyCount > 0,
              hasPulseEvent: (pulseStats?.calls ?? 0) > 0,
              firstVaultId,
            }}
          />

          {/* ── Day at a glance — one hero card replaces the 4-stat row.
               Chrome bar + huge net-flow number + a supporting row of
               mini-stats. Mirrors the observatory's visual language so
               /app reads as an operator cockpit, not a SaaS grid. ── */}
          <DayAtAGlance
            spentToday={spentToday}
            earnedToday={pulseStats?.revenue ?? 0}
            calls={pulseStats?.calls ?? 0}
            customers={pulseStats?.customers ?? 0}
            activeVaults={activeVaults}
          />

          {/* ── Two-column: Pay side + Earn side ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PaySideCard vaults={vaults} />
            <EarnSideCard
              pulseStats={pulseStats}
              pulseKeyCount={pulseKeyCount}
            />
          </div>

          {/* ── Unified activity feed ── */}
          <ActivityCard items={activity} />

          {/* ── Network presence — the Atlas attack leaderboard
               appears here so the user sees the live network
               around them, not just their own numbers. "You're
               in a network that survived 184 attacks this week." ── */}
          <div className="pt-4">
            <h3
              className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-3"
              style={{ color: "var(--text-quaternary)" }}
            >
              The network around your agents
            </h3>
            <AttackLeaderboard />
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*                              Sub-cards                             */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * DayAtAGlance — hero card replacing the 4-stat row.
 *
 * Old layout: 4 equal-weight tiles (spent / earned / agents / net).
 * Problem: no hierarchy — the user had to read four numbers to
 * understand today. Felt like a QBR dashboard, not a cockpit.
 *
 * New: one premium card with the observatory's visual language.
 *   · Chrome bar with traffic lights + date + live pill
 *   · Huge NET-FLOW number (the one metric that answers "how are we
 *     doing today?") with a breathing ambient halo
 *   · Supporting row of 4 micro-stats beneath — still visible, but
 *     cedes focus to the headline
 *   · NumberScramble on every digit so polling refreshes visibly land
 *
 * Net flow flips color: green when positive, neutral when zero, red
 * when negative (agents outspent revenue today).
 */
function DayAtAGlance({
  spentToday,
  earnedToday,
  calls,
  customers,
  activeVaults,
}: {
  spentToday: number;
  earnedToday: number;
  calls: number;
  customers: number;
  activeVaults: number;
}) {
  const net = earnedToday - spentToday;
  const netTone =
    net > 0.005
      ? "var(--success-deep)"
      : net < -0.005
        ? "var(--attack)"
        : "var(--text-primary)";
  const netSign = net > 0 ? "+" : net < 0 ? "−" : "";
  const netAbs = Math.abs(net);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -30px rgba(0,0,0,0.10)",
      }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-red)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-yellow)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--chrome-green)" }}
          />
          <span
            className="ml-2 text-[10.5px] font-mono-numbers"
            style={{ color: "var(--text-quaternary)" }}
          >
            today · {today}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--success)" }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--success-deep)" }}
          >
            live
          </span>
        </div>
      </div>

      {/* Hero row */}
      <div className="relative px-6 md:px-8 pt-6 pb-5">
        {/* Breathing halo behind the big number — same treatment as
            the Budget tab's spend ring. Keeps the "this is alive"
            signal consistent across surfaces. */}
        <motion.div
          aria-hidden
          className="absolute left-6 top-4 w-[180px] h-[80px] rounded-full -z-0"
          style={{
            background:
              net >= 0 ? "var(--success-bg)" : "var(--attack-bg)",
            filter: "blur(32px)",
            opacity: 0.55,
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative">
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Net flow today
          </p>
          <p
            className="mt-1 text-[52px] md:text-[60px] font-semibold leading-none tracking-[-0.025em]"
            style={{
              color: netTone,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {netSign}
            <NumberScramble value={netAbs} format={fmtUsd} />
          </p>
          <p
            className="mt-2 text-[13px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {net >= 0
              ? "Your agents are paying their way — revenue beats spend."
              : "Your agents have spent more than they earned today. Still well inside policy caps."}
          </p>
        </div>
      </div>

      {/* Supporting row — 4 mini-stats with subtle separators */}
      <div
        className="grid grid-cols-2 md:grid-cols-4"
        style={{ borderTop: "0.5px solid var(--border-subtle)" }}
      >
        <DayStat
          label="Spent today"
          icon={Wallet}
          value={<NumberScramble value={spentToday} format={fmtUsd} />}
          sub={`${activeVaults} active ${activeVaults === 1 ? "vault" : "vaults"}`}
          accent="var(--agent)"
          divider
        />
        <DayStat
          label="Earned today"
          icon={TrendingUp}
          value={<NumberScramble value={earnedToday} format={fmtUsd} />}
          sub={`${calls} call${calls === 1 ? "" : "s"}`}
          accent="var(--revenue)"
          divider
        />
        <DayStat
          label="Unique agents"
          icon={Globe}
          value={<NumberScramble value={customers} format={(n) => String(n)} />}
          sub="paying your services"
          accent="var(--text-tertiary)"
          divider
        />
        <DayStat
          label="Calls"
          icon={ArrowLeftRight}
          value={<NumberScramble value={calls} format={(n) => String(n)} />}
          sub="inbound x402 today"
          accent="var(--text-tertiary)"
        />
      </div>
    </motion.section>
  );
}

/** One cell in the day-at-a-glance supporting row. */
function DayStat({
  label,
  icon: Icon,
  value,
  sub,
  accent,
  divider,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: React.ReactNode;
  sub: string;
  accent: string;
  divider?: boolean;
}) {
  return (
    <div
      className="px-5 py-4 md:py-5"
      style={
        divider
          ? { borderRight: "0.5px solid var(--border-subtle)" }
          : undefined
      }
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color: accent }}>
          <Icon className="w-3 h-3" />
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-quaternary)" }}
        >
          {label}
        </span>
      </div>
      <p
        className="text-[22px] font-semibold leading-none tracking-tight"
        style={{
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
      <p
        className="mt-1 text-[11px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {sub}
      </p>
    </div>
  );
}

function PaySideCard({ vaults }: { vaults: VaultBrief[] | null }) {
  const loading = vaults === null;
  const empty = vaults !== null && vaults.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{ background: "#EEF0FF" }}
          >
            <Wallet className="w-3.5 h-3.5" style={{ color: "#4F46E5" }} />
          </div>
          <div>
            <p
              className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "#4F46E5" }}
            >
              Agents
            </p>
            <h3
              className="text-[16px] font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Your agents
            </h3>
          </div>
        </div>
        <Link
          href="/vault/new"
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[11.5px] font-semibold transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-primary)" }}
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
          New
        </Link>
      </div>

      <div
        className="px-6 py-3"
        style={{ borderTop: "0.5px solid var(--border-subtle)" }}
      >
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[52px] rounded-[10px] animate-pulse"
                style={{ background: "var(--surface-2)" }}
              />
            ))}
          </div>
        ) : empty ? (
          <EmptyBlock
            label="No agents yet"
            copy="Deploy your first autonomous agent and let Solana enforce its budget."
            ctaLabel="Deploy your first agent"
            ctaHref="/vault/new"
            tone="indigo"
          />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {vaults!.slice(0, 4).map((v) => {
              const util = Math.min(100, Math.round(v.budget.dailyUtilization * 100));
              return (
                <li key={v.vault.id}>
                  <Link
                    href={`/vault/${v.vault.id}`}
                    className="flex items-center gap-3 py-3 group"
                  >
                    <div
                      className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[18px] shrink-0"
                      style={{
                        background: "var(--surface-2)",
                        border: "0.5px solid var(--border-subtle)",
                      }}
                    >
                      <span aria-hidden>{v.vault.emoji || "🧭"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-[13.5px] font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {v.vault.name}
                        </p>
                        {v.vault.pausedAt && (
                          <span
                            className="px-1.5 py-0 rounded-[4px] text-[9px] font-semibold uppercase tracking-wider"
                            style={{
                              background: "#FEF2F2",
                              color: "#B91C1C",
                            }}
                          >
                            Paused
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-1 h-1 w-full rounded-full overflow-hidden"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${util}%`,
                            background:
                              util >= 90
                                ? "#EF4444"
                                : util >= 70
                                  ? "#F59E0B"
                                  : "var(--text-primary)",
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-[12.5px] font-mono-numbers font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {fmtUsd(v.budget.spentToday)}
                      </p>
                      <p
                        className="text-[10.5px] font-mono-numbers"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        of {fmtUsd(v.vault.dailyLimitUsd)}
                      </p>
                    </div>
                    <ArrowUpRight
                      className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!empty && !loading && (vaults?.length ?? 0) > 4 && (
        <div
          className="px-6 py-3 text-right"
          style={{ borderTop: "0.5px solid var(--border-subtle)" }}
        >
          <Link
            href="/vault"
            className="text-[12px] font-medium inline-flex items-center gap-1"
            style={{ color: "var(--text-secondary)" }}
          >
            View all {vaults!.length}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

function EarnSideCard({
  pulseStats,
  pulseKeyCount,
}: {
  pulseStats: PulseStats | null;
  pulseKeyCount: number;
}) {
  const empty = pulseKeyCount === 0 && (pulseStats?.calls ?? 0) === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{ background: "#E8F4FE" }}
          >
            <Globe className="w-3.5 h-3.5" style={{ color: "#0EA5E9" }} />
          </div>
          <div>
            <p
              className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "#0EA5E9" }}
            >
              Revenue
            </p>
            <h3
              className="text-[16px] font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Payments from agents
            </h3>
          </div>
        </div>
        <Link
          href="/pulse/dashboard/keys"
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[11.5px] font-semibold transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-primary)" }}
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
          Key
        </Link>
      </div>

      <div
        className="px-6 py-4"
        style={{ borderTop: "0.5px solid var(--border-subtle)" }}
      >
        {empty ? (
          <EmptyBlock
            label="No services wrapped yet"
            copy="One line of middleware and every agent payment shows up here, verified on-chain."
            ctaLabel="Set up Pulse"
            ctaHref="/pulse/dashboard/setup"
            tone="sky"
          />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              label="Revenue (24h)"
              value={fmtUsd(pulseStats?.revenue ?? 0)}
            />
            <MiniStat
              label="Calls"
              value={(pulseStats?.calls ?? 0).toLocaleString()}
            />
            <MiniStat
              label="Agents"
              value={(pulseStats?.customers ?? 0).toString()}
            />
          </div>
        )}
      </div>

      {!empty && (
        <div
          className="px-6 py-3 text-right"
          style={{ borderTop: "0.5px solid var(--border-subtle)" }}
        >
          <Link
            href="/pulse/dashboard"
            className="text-[12px] font-medium inline-flex items-center gap-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Open full dashboard
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 rounded-[12px]"
      style={{
        background: "var(--surface-2)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--text-quaternary)" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-[18px] font-semibold tracking-tight"
        style={{
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyBlock({
  label,
  copy,
  ctaLabel,
  ctaHref,
  tone,
}: {
  label: string;
  copy: string;
  ctaLabel: string;
  ctaHref: string;
  tone: "indigo" | "sky";
}) {
  const accent = tone === "indigo" ? "#4F46E5" : "#0EA5E9";
  return (
    <div className="py-4 flex flex-col items-start gap-3">
      <div>
        <p
          className="text-[13px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </p>
        <p
          className="mt-0.5 text-[12.5px] leading-[1.5] max-w-[360px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {copy}
        </p>
      </div>
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[12.5px] font-semibold transition-opacity hover:opacity-90"
        style={{ background: accent, color: "white" }}
      >
        {ctaLabel}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

/* ── Unified activity feed ── */

function useUnifiedActivity(vaults: VaultBrief[] | null): ActivityItem[] {
  return useMemo(() => {
    const out: ActivityItem[] = [];
    (vaults ?? []).forEach((v) => {
      if (!v.lastPayment) return;
      out.push({
        key: `pay-${v.vault.id}`,
        side: "pay",
        label: `${v.vault.name} → ${v.lastPayment.merchant}`,
        amount: v.lastPayment.amountUsd,
        status: v.lastPayment.status,
        at: v.lastPayment.createdAt,
        tx: null,
        network: v.vault.network,
      });
    });
    // Sort by recency
    out.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
    return out.slice(0, 12);
  }, [vaults]);
}

function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div>
          <p
            className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Recent activity · both sides
          </p>
          <h3
            className="text-[16px] font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Every Solana transaction. One place.
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          Live
        </div>
      </div>

      <div
        className="px-2 pb-2"
        style={{ borderTop: "0.5px solid var(--border-subtle)" }}
      >
        {items.length === 0 ? (
          <div className="py-12 text-center">
            <Activity
              className="w-5 h-5 mx-auto mb-2"
              style={{ color: "var(--text-quaternary)" }}
            />
            <p
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Nothing to show yet.
            </p>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              The moment an agent pays or your service receives, it appears
              here.
            </p>
          </div>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.key}>
                <ActivityRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const isBlocked = item.status === "blocked" || item.status === "failed";
  const isPay = item.side === "pay";
  const txUrl = explorerUrl(item.tx, item.network);

  return (
    <div className="px-4 py-2.5 rounded-[10px] hover:bg-[var(--surface-2)] transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0"
          style={{
            background: isBlocked
              ? "#FEF2F2"
              : isPay
                ? "#EEF0FF"
                : "#E8F4FE",
            color: isBlocked ? "#DC2626" : isPay ? "#4F46E5" : "#0EA5E9",
          }}
        >
          {isBlocked ? (
            <span className="text-[14px] leading-none">✕</span>
          ) : isPay ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {item.label}
            {isBlocked && (
              <span
                className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "#FEF2F2", color: "#B91C1C" }}
              >
                blocked
              </span>
            )}
          </p>
          <p
            className="text-[11.5px] mt-0.5"
            style={{ color: "var(--text-tertiary)" }}
          >
            {relTime(item.at)} ago · {item.network}
            {txUrl && (
              <>
                {" · "}
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:underline"
                  style={{ color: "var(--text-secondary)" }}
                >
                  view tx
                </a>
              </>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className={`text-[13px] font-semibold font-mono-numbers ${isBlocked ? "line-through" : ""}`}
            style={{
              color: isBlocked
                ? "var(--text-tertiary)"
                : "var(--text-primary)",
            }}
          >
            {isPay ? "−" : "+"}
            {fmtUsd(item.amount)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Brand-new hero — Apple-grade single moment ──
 *
 * No card grid. No checklist. Just one centered statement, one magnetic
 * button, one quiet "we're live" whisper. The first action is obvious;
 * everything else waits until the user creates their first vault.
 */

function BrandNewHero() {
  return (
    <section
      className="relative flex flex-col items-center text-center pt-6 pb-14"
      style={{ minHeight: "62vh" }}
    >
      {/* Tiny "Start here" eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        className="inline-flex items-center gap-2 h-7 px-3 rounded-full text-[11px] font-medium mb-10 mt-4"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          color: "var(--text-tertiary)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--success)" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        Programs live on Solana devnet
      </motion.div>

      {/* The statement */}
      <motion.h2
        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
        className="text-balance max-w-[720px] mb-4"
        style={{
          fontSize: "clamp(38px, 5.5vw, 62px)",
          lineHeight: 1.02,
          letterSpacing: "-0.04em",
          fontWeight: 500,
          color: "var(--text-primary)",
        }}
      >
        Deploy your first agent.
        <br />
        <span style={{ color: "var(--text-tertiary)", fontWeight: 300 }}>
          Let Solana enforce the boundaries.
        </span>
      </motion.h2>

      {/* The sub */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
        className="mx-auto max-w-[540px] text-[15px] leading-[1.55] mb-10"
        style={{ color: "var(--text-tertiary)" }}
      >
        Sixty seconds. A real Squads multisig, a real Kyvern policy PDA,
        and an agent keypair the chain itself is watching.
      </motion.p>

      {/* One primary CTA, one quiet secondary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
        className="flex flex-col sm:flex-row items-center gap-3"
      >
        <Link
          href="/vault/new"
          className="group inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[14px] text-[15px] font-semibold transition-opacity hover:opacity-90"
          style={{
            background: "var(--text-primary)",
            color: "var(--background)",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.08), 0 10px 28px rgba(0,0,0,0.14)",
          }}
        >
          Deploy your first agent
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/app/services"
          className="inline-flex items-center gap-2 h-12 px-5 text-[14px] font-semibold transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          Running a service? See revenue →
        </Link>
      </motion.div>

      {/* Micro-breadcrumb — implied next steps, unobtrusive */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        className="mt-14 flex items-center gap-4 text-[11.5px]"
        style={{ color: "var(--text-quaternary)" }}
      >
        <TrailItem n="1" label="Name it" active />
        <Dash />
        <TrailItem n="2" label="Set the budget" />
        <Dash />
        <TrailItem n="3" label="Deploy on Solana" />
        <Dash />
        <TrailItem n="4" label="Let it run" />
      </motion.div>
    </section>
  );
}

function TrailItem({
  n,
  label,
  active,
}: {
  n: string;
  label: string;
  active?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full font-mono-numbers text-[9px] font-semibold"
        style={{
          background: active ? "var(--text-primary)" : "var(--surface-2)",
          color: active ? "var(--background)" : "var(--text-tertiary)",
          border: active ? "none" : "0.5px solid var(--border-subtle)",
        }}
      >
        {n}
      </span>
      <span
        style={{
          color: active ? "var(--text-secondary)" : "var(--text-quaternary)",
        }}
      >
        {label}
      </span>
    </span>
  );
}

function Dash() {
  return (
    <span
      aria-hidden
      className="h-px w-5 opacity-60"
      style={{ background: "var(--border)" }}
    />
  );
}
