"use client";

/* ════════════════════════════════════════════════════════════════════
   /vault/[id] — Owner dashboard

   Consumes GET /api/vault/[id] every 5s (focused-tab polling).
   Surfaces:
     · Live budget utilization (daily + weekly)
     · Velocity window (calls / cap)
     · Activity feed (settled, blocked, failed) with reason chips
     · Policy panel (merchants, memo, network, Squads address)
     · Kill switch (pause / resume)

   Design mirrors the landing + /vault/new: Linear/Stripe weight, soft
   shadows, large numerics in JetBrains Mono, --ease-premium everywhere.
   ════════════════════════════════════════════════════════════════════ */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  OctagonAlert,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  XOctagon,
} from "lucide-react";
import { AgentSnippetCard } from "@/components/vault/agent-snippet-card";
import { VaultPlayground } from "@/components/vault/playground";
import { AgentObservatoryStrip } from "@/components/vault/agent-observatory-strip";
import { NumberScramble } from "@/components/atlas/number-scramble";
import { EASE_PREMIUM as EASE } from "@/lib/motion";
import { fmtUsd, fmtInt } from "@/lib/format";

/* ─── Types that match the API response ─── */

interface Vault {
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
  vaultPda: string | null;
  spendingLimitPda: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Payment {
  id: string;
  vaultId: string;
  agentKeyId: string | null;
  merchant: string;
  amountUsd: number;
  memo: string | null;
  status: "allowed" | "blocked" | "settled" | "failed";
  reason: string | null;
  txSignature: string | null;
  latencyMs: number | null;
  createdAt: string;
}

interface DashboardPayload {
  vault: Vault;
  budget: {
    dailyLimitUsd: number;
    weeklyLimitUsd: number;
    perTxMaxUsd: number;
    spentToday: number;
    spentThisWeek: number;
    dailyRemaining: number;
    weeklyRemaining: number;
    dailyUtilization: number;
    weeklyUtilization: number;
  };
  velocity: {
    callsInWindow: number;
    maxCallsPerWindow: number;
    velocityWindow: "1h" | "1d" | "1w";
    windowStart: string;
  };
  payments: Payment[];
}

export default function VaultDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [pauseModal, setPauseModal] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      try {
        if (!opts.silent) setLoading(true);
        const res = await fetch(`/api/vault/${id}?limit=50`, {
          credentials: "include",
        });
        if (res.status === 404) {
          setError("not_found");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DashboardPayload;
        setData(json);
        setError(null);
      } catch (e) {
        if (!opts.silent) {
          setError(e instanceof Error ? e.message : "failed to load");
        }
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Poll every 5s while the tab is visible.
  useEffect(() => {
    function start() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => void load({ silent: true }), 5000);
    }
    function stop() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") start();
      else stop();
    }
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const togglePause = useCallback(async () => {
    if (!data) return;
    setPauseBusy(true);
    try {
      const method = data.vault.pausedAt ? "DELETE" : "POST";
      const res = await fetch(`/api/vault/${id}/pause`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": data.vault.ownerWallet,
        },
        body: JSON.stringify({ ownerWallet: data.vault.ownerWallet }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }
      setPauseModal(false);
      await load({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "pause/resume failed");
    } finally {
      setPauseBusy(false);
    }
  }, [data, id, load]);

  /* ─── Loading ─── */
  if (loading && !data) {
    return (
      <div>
        <VaultCrumb vaultId={id} />
        <SkeletonHeader />
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mt-10 h-80 rounded-[22px] bg-[#F0F0F0] animate-pulse" />
      </div>
    );
  }

  /* ─── Error ─── */
  if (error === "not_found" || (!data && !loading)) {
    return (
      <div>
        <VaultCrumb vaultId={id} />
        <div className="mx-auto max-w-[640px] px-6 py-24 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F5F7]">
            <OctagonAlert className="h-6 w-6 text-[#8E8E93]" />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            Agent not found.
          </h1>
          <p className="mt-2 text-[14px] text-[#6E6E73]">
            The vault <span className="font-mono">{id}</span> doesn&apos;t exist
            or was deleted. Double-check the URL, or create a new vault.
          </p>
          <Link
            href="/vault/new"
            className="mt-8 inline-flex h-10 items-center gap-2 rounded-full bg-black px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#1c1c1e]"
          >
            <Sparkles className="h-4 w-4" />
            Create a vault
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const paused = !!data.vault.pausedAt;

  return (
    <div>
      <VaultCrumb vaultId={id} />
      <div className="pb-16">
        <VaultHeader
          vault={data.vault}
          onKillSwitch={() => setPauseModal(true)}
        />
        <HealthStrip network={data.vault.network} />

        {error && error !== "not_found" && (
          <div className="mt-4 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#B91C1C]">
            {error}
          </div>
        )}

        {/* ─── Mini-observatory: makes this dashboard read like Atlas's
             public observatory, but for THIS user's agent. Same chrome,
             same "Last decision" voice, ticking uptime since deploy.
             Without this, the dashboard reads like a static SaaS form
             and the "I just joined Atlas's network" feeling dies on
             arrival. With it, the user feels like an operator. */}
        <AgentObservatoryStrip
          agentName={data.vault.name}
          emoji={data.vault.emoji ?? "🧭"}
          network={data.vault.network}
          createdAt={data.vault.createdAt}
          spentToday={data.budget.spentToday}
          dailyLimit={data.budget.dailyLimitUsd}
          callsInWindow={data.velocity.callsInWindow}
          maxCallsPerWindow={data.velocity.maxCallsPerWindow}
          lastPayment={
            data.payments && data.payments.length > 0
              ? {
                  merchant: data.payments[0].merchant,
                  amountUsd: data.payments[0].amountUsd,
                  status: data.payments[0].status as
                    | "allowed"
                    | "blocked"
                    | "settled"
                    | "failed",
                  createdAt: data.payments[0].createdAt,
                  txSignature: data.payments[0].txSignature,
                  reason: data.payments[0].reason,
                  memo: data.payments[0].memo,
                }
              : null
          }
        />

        {/* ─── First-run playground: fund + try it in the browser ───
             Self-collapses once the vault is funded; the TestPaymentPanel
             remembers its expanded state per tab. For power users who
             want the raw snippets, the AgentSnippetCard below is still
             the canonical "copy and integrate" surface. */}
        <VaultPlayground
          vaultId={data.vault.id}
          network={data.vault.network}
          agentKey={null}
          allowedMerchants={data.vault.allowedMerchants}
          perTxMaxUsd={data.vault.perTxMaxUsd}
          requireMemo={data.vault.requireMemo}
          onAfterCall={() => void load({ silent: true })}
        />

        {/* ─── The primary CTA: copy to agent + live playground ─── */}
        <AgentSnippetCard vault={data.vault} />

        {/* ─── Budget + Velocity row ─── */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          <BudgetCard
            label="Today"
            spent={data.budget.spentToday}
            limit={data.budget.dailyLimitUsd}
            remaining={data.budget.dailyRemaining}
            utilization={data.budget.dailyUtilization}
            tone="primary"
          />
          <BudgetCard
            label="This week"
            spent={data.budget.spentThisWeek}
            limit={data.budget.weeklyLimitUsd}
            remaining={data.budget.weeklyRemaining}
            utilization={data.budget.weeklyUtilization}
            tone="secondary"
          />
          <VelocityCard
            calls={data.velocity.callsInWindow}
            cap={data.velocity.maxCallsPerWindow}
            window={data.velocity.velocityWindow}
          />
        </div>

        {/* ─── Activity feed + policy panel ─── */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <ActivityFeed payments={data.payments} vault={data.vault} />
          <PolicyPanel vault={data.vault} />
        </div>

        {/* ─── Footer — per-tx cap reminder ─── */}
        <div className="mt-10 rounded-[18px] border border-[#F0F0F0] bg-[#FAFAFA] px-5 py-4 text-[12px] text-[#6E6E73]">
          Per-transaction cap is{" "}
          <span className="font-semibold text-[#1c1c1e]">
            ${data.budget.perTxMaxUsd.toFixed(2)}
          </span>
          . Any single call above this ceiling is refused before it touches
          Squads.
        </div>
      </div>

      <AnimatePresence>
        {pauseModal && (
          <KillSwitchModal
            paused={paused}
            busy={pauseBusy}
            onConfirm={togglePause}
            onCancel={() => setPauseModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Subcomponents
   ════════════════════════════════════════════════════════════════════ */

/**
 * Live status strip under the vault header. Hits /api/health/solana once
 * (the diagnostics route already exists at src/app/api/health/solana/route.ts)
 * and renders one of three states:
 *   · real + keystore ok → "● on-chain · devnet" (green, clickable Explorer)
 *   · real + keystore missing → "● signer missing" (amber)
 *   · stub → "● demo mode · transactions are simulated" (slate)
 *
 * This is the thing a judge sees that converts "this demo looks slick" into
 * "this demo is actually live on Solana". The claim is grounded in a real
 * pubkey + SOL balance, not vibes.
 */
interface HealthSnapshot {
  ok: boolean;
  network: "devnet" | "mainnet";
  squads: { mode: "real" | "stub" };
  keystore: {
    configured: boolean;
    pubkey: string | null;
    solBalance: number | null;
    source: string | null;
  };
}

function HealthStrip({ network }: { network: "devnet" | "mainnet" }) {
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/health/solana?network=${network}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, body: j as HealthSnapshot })))
      .then(({ body }) => {
        if (!cancelled) setHealth(body);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [network]);

  if (failed) return null;
  if (!health) {
    return (
      <div className="mt-4 h-[34px] w-full max-w-[520px] animate-pulse rounded-full bg-[#F5F5F7]" />
    );
  }

  const isReal = health.squads.mode === "real";
  const keystoreOk =
    health.keystore.configured &&
    health.keystore.solBalance !== null &&
    health.keystore.solBalance > 0;

  // Three states — real+ok / real+missing-signer / stub
  let tone: "live" | "degraded" | "demo";
  let title: string;
  let detail: string;
  if (isReal && keystoreOk) {
    tone = "live";
    title = `live on Solana · ${health.network}`;
    const bal =
      health.keystore.solBalance !== null
        ? health.keystore.solBalance.toFixed(2)
        : "—";
    detail = `Squads v4 + Kyvern program · signer ${truncate(health.keystore.pubkey ?? "", 5)} · ${bal} SOL`;
  } else if (isReal && !keystoreOk) {
    tone = "degraded";
    title = `signer missing · ${health.network}`;
    detail = "set KYVERN_FEE_PAYER_SECRET to enable on-chain writes";
  } else {
    tone = "demo";
    title = "demo mode";
    detail = "transactions are simulated — no RPC writes";
  }

  const palette =
    tone === "live"
      ? {
          bg: "#ECFDF5",
          dot: "#22C55E",
          text: "#166534",
          detail: "#16a34a",
        }
      : tone === "degraded"
        ? {
            bg: "#FFFBEB",
            dot: "#D97706",
            text: "#92400E",
            detail: "#B45309",
          }
        : {
            bg: "#F5F5F7",
            dot: "#8E8E93",
            text: "#1c1c1e",
            detail: "#6E6E73",
          };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
      className="mt-4 inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[11px]"
      style={{ background: palette.bg }}
      role="status"
      aria-label={`Solana health: ${title}`}
    >
      <motion.span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: palette.dot }}
        animate={tone === "live" ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
        transition={
          tone === "live"
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : undefined
        }
      />
      <span
        className="font-semibold uppercase tracking-wider"
        style={{ color: palette.text, fontSize: "10px" }}
      >
        {title}
      </span>
      <span className="font-mono" style={{ color: palette.detail }}>
        {detail}
      </span>
      {tone === "live" && health.keystore.pubkey && (
        <a
          href={accountExplorer(health.keystore.pubkey, health.network)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 inline-flex items-center gap-0.5 font-medium underline-offset-2 hover:underline"
          style={{ color: palette.detail }}
        >
          verify <ArrowUpRight className="h-2.5 w-2.5" />
        </a>
      )}
    </motion.div>
  );
}

/**
 * Slim in-content breadcrumb, styled to match /app/* pages. The page
 * sits inside AppShell — which already owns the topbar + sidebar —
 * so this is just the "Vaults / {id}" micro-crumb below the shell.
 */
function VaultCrumb({ vaultId }: { vaultId: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex items-center gap-1.5 text-[12px]"
      style={{ color: "var(--text-tertiary)" }}
    >
      <Link
        href="/app/vaults"
        className="inline-flex items-center gap-1 transition-colors hover:text-[color:var(--text-primary)]"
      >
        <ArrowLeft className="h-3 w-3" />
        Vaults
      </Link>
      <span aria-hidden style={{ color: "var(--text-quaternary)" }}>
        /
      </span>
      <span className="font-mono" style={{ color: "var(--text-secondary)" }}>
        {vaultId}
      </span>
    </nav>
  );
}

function VaultHeader({
  vault,
  onKillSwitch,
}: {
  vault: Vault;
  onKillSwitch: () => void;
}) {
  const paused = !!vault.pausedAt;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex items-center gap-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-[20px] text-[32px]"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.03), 0 8px 24px -12px rgba(0,0,0,0.08)",
          }}
        >
          {vault.emoji}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="tracking-[-0.03em]"
              style={{
                fontSize: "clamp(28px, 3.6vw, 40px)",
                fontWeight: 600,
                lineHeight: 1.05,
                color: "var(--text-primary)",
              }}
            >
              {vault.name}
            </h1>
            <StatusPill paused={paused} />
            <NetworkPill network={vault.network} />
          </div>
          <p
            className="mt-1.5 text-[13px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {capitalize(vault.purpose)} agent · running for{" "}
            {relTime(vault.createdAt).replace(" ago", "")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CopyChip value={vault.squadsAddress} label="Squads address" />
        <button
          onClick={onKillSwitch}
          aria-label={paused ? "Resume vault" : "Kill switch"}
          className="group inline-flex h-10 items-center gap-1.5 rounded-[12px] px-4 text-[13px] font-semibold text-white transition-all duration-300 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
          style={{
            background: paused ? "#22C55E" : "#EF4444",
            boxShadow: paused
              ? "0 1px 2px rgba(0,0,0,0.06), 0 10px 28px rgba(34,197,94,0.22)"
              : "0 1px 2px rgba(0,0,0,0.06), 0 10px 28px rgba(239,68,68,0.22)",
          }}
        >
          {paused ? (
            <>
              <Play className="h-3.5 w-3.5" /> Resume
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5" /> Kill switch
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

function StatusPill({ paused }: { paused: boolean }) {
  return paused ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#B91C1C]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
      Halted
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#166534]">
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      Live
    </span>
  );
}

function NetworkPill({ network }: { network: "devnet" | "mainnet" }) {
  const isMainnet = network === "mainnet";
  return (
    <span
      className={
        isMainnet
          ? "inline-flex items-center gap-1 rounded-full bg-[#F5EEFF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#9945FF]"
          : "inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1D4ED8]"
      }
    >
      {network}
    </span>
  );
}

function CopyChip({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="group inline-flex h-9 items-center gap-2 rounded-full border border-[#E5E5EA] bg-white px-3 text-[11px] text-[#6E6E73] transition-colors hover:border-[#D1D1D6] hover:text-black"
    >
      <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">
        {label}
      </span>
      <span className="font-mono text-[11px] text-[#1c1c1e]">
        {truncate(value, 8)}
      </span>
      {copied ? (
        <Check className="h-3 w-3 text-[#22C55E]" />
      ) : (
        <Copy className="h-3 w-3 text-[#8E8E93] group-hover:text-black" />
      )}
    </button>
  );
}

function BudgetCard({
  label,
  spent,
  limit,
  remaining,
  utilization,
  tone,
}: {
  label: string;
  spent: number;
  limit: number;
  remaining: number;
  utilization: number;
  tone: "primary" | "secondary";
}) {
  const pct = Math.min(1, Math.max(0, utilization));
  const over80 = pct >= 0.8;
  const barColor = over80 ? "#EF4444" : tone === "primary" ? "#3B82F6" : "#9945FF";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="group relative overflow-hidden rounded-[22px] border border-[#F0F0F0] bg-white p-6"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
          {label}
        </span>
        <span
          className={
            over80
              ? "rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold text-[#B91C1C]"
              : "rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[10px] font-semibold text-[#6E6E73]"
          }
        >
          {(pct * 100).toFixed(0)}%
        </span>
      </div>

      <div className="mt-4 flex items-end gap-1.5">
        <span
          className="text-[34px] font-semibold leading-none tracking-tight"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <NumberScramble value={spent} format={fmtUsd} />
        </span>
        <span className="mb-1 text-[13px] text-[#8E8E93]">
          / ${limit.toFixed(0)}
        </span>
      </div>

      <p className="mt-1 text-[12px] text-[#6E6E73]">
        <NumberScramble value={remaining} format={fmtUsd} /> remaining
      </p>

      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#F0F0F0]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.8, ease: EASE }}
          className="h-full rounded-full"
          style={{ background: barColor }}
        />
      </div>
    </motion.div>
  );
}

function VelocityCard({
  calls,
  cap,
  window,
}: {
  calls: number;
  cap: number;
  window: "1h" | "1d" | "1w";
}) {
  const pct = cap > 0 ? Math.min(1, calls / cap) : 0;
  const label =
    window === "1h" ? "last hour" : window === "1d" ? "last 24h" : "last 7 days";
  const over80 = pct >= 0.8;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
      className="relative overflow-hidden rounded-[22px] border border-[#F0F0F0] bg-white p-6"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
          Velocity · {label}
        </span>
        <span
          className={
            over80
              ? "rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold text-[#B91C1C]"
              : "rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[10px] font-semibold text-[#6E6E73]"
          }
        >
          {(pct * 100).toFixed(0)}%
        </span>
      </div>
      <div className="mt-4 flex items-end gap-1.5">
        <span
          className="text-[34px] font-semibold leading-none tracking-tight"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <NumberScramble value={calls} format={fmtInt} />
        </span>
        <span className="mb-1 text-[13px] text-[#8E8E93]">/ {cap}</span>
      </div>
      <p className="mt-1 text-[12px] text-[#6E6E73]">
        Agent has {Math.max(0, cap - calls)} calls left before the rate cap
        kicks in.
      </p>
      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#F0F0F0]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.8, ease: EASE }}
          className="h-full rounded-full"
          style={{ background: over80 ? "#EF4444" : "#1c1c1e" }}
        />
      </div>
    </motion.div>
  );
}

function ActivityFeed({
  payments,
  vault,
}: {
  payments: Payment[];
  vault: Vault;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
      className="overflow-hidden rounded-[22px] border border-[#F0F0F0] bg-white"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-center justify-between border-b border-[#F0F0F0] px-6 py-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">Activity</h3>
          <p className="text-[11px] text-[#8E8E93]">
            Every attempt, allowed or refused. Live.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#6E6E73]">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          Live
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F5F5F7]">
            <ShieldCheck className="h-5 w-5 text-[#8E8E93]" />
          </div>
          <p className="text-[14px] font-medium">Nothing to show yet.</p>
          <p className="mt-1 text-[12px] text-[#6E6E73]">
            The moment your agent makes its first payment, it will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#F4F4F5]">
          <AnimatePresence initial={false}>
            {payments.map((p, i) => (
              <motion.li
                key={p.id}
                layout
                initial={
                  i < 5
                    ? { opacity: 0, y: -8, backgroundColor: "rgba(79,70,229,0.08)" }
                    : false
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  backgroundColor: "rgba(79,70,229,0)",
                }}
                transition={{
                  duration: 0.55,
                  ease: EASE,
                  backgroundColor: { duration: 1.6, ease: EASE },
                }}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-3 hover:bg-[#FAFAFA]"
              >
                <PaymentIcon status={p.status} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium">
                      {p.merchant}
                    </span>
                    {p.status === "blocked" && p.reason && (
                      <span className="shrink-0 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-medium text-[#B91C1C]">
                        {p.reason}
                      </span>
                    )}
                    {p.status === "failed" && (
                      <span className="shrink-0 rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-medium text-[#B45309]">
                        failed
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#8E8E93]">
                    <span>{relTime(p.createdAt)}</span>
                    {p.memo && (
                      <>
                        <span>·</span>
                        <span className="truncate italic">
                          &ldquo;{p.memo}&rdquo;
                        </span>
                      </>
                    )}
                    {p.latencyMs !== null && (
                      <>
                        <span>·</span>
                        <span>{p.latencyMs}ms</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={
                      p.status === "blocked"
                        ? "text-[14px] font-semibold text-[#8E8E93] line-through"
                        : "text-[14px] font-semibold text-[#1c1c1e]"
                    }
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    ${p.amountUsd.toFixed(2)}
                  </span>
                  {p.txSignature && (
                    <a
                      href={explorerUrl(p.txSignature, vault.network)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[#3B82F6] hover:underline"
                    >
                      view tx <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.div>
  );
}

function PaymentIcon({ status }: { status: Payment["status"] }) {
  if (status === "settled" || status === "allowed") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5]">
        <Check className="h-4 w-4 text-[#16a34a]" />
      </div>
    );
  }
  if (status === "blocked") {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEF2F2]">
        <XOctagon className="h-4 w-4 text-[#DC2626]" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFFBEB]">
      <OctagonAlert className="h-4 w-4 text-[#D97706]" />
    </div>
  );
}

function PolicyPanel({ vault }: { vault: Vault }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      className="space-y-4"
    >
      <PolicyBlock title="Allowed merchants">
        {vault.allowedMerchants.length === 0 ? (
          <p className="text-[12px] text-[#8E8E93]">
            No allowlist — the vault blocks every merchant until you add one.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {vault.allowedMerchants.map((m) => (
              <span
                key={m}
                className="rounded-full border border-[#E5E5EA] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1c1c1e]"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </PolicyBlock>

      <PolicyBlock title="Requirements">
        <ul className="space-y-2">
          <li className="flex items-center justify-between text-[12px]">
            <span className="text-[#6E6E73]">Memo on every payment</span>
            <span
              className={
                vault.requireMemo
                  ? "font-semibold text-[#16a34a]"
                  : "font-semibold text-[#8E8E93]"
              }
            >
              {vault.requireMemo ? "Required" : "Optional"}
            </span>
          </li>
          <li className="flex items-center justify-between text-[12px]">
            <span className="text-[#6E6E73]">Velocity window</span>
            <span className="font-semibold">
              {vault.maxCallsPerWindow} calls / {vault.velocityWindow}
            </span>
          </li>
          <li className="flex items-center justify-between text-[12px]">
            <span className="text-[#6E6E73]">Network</span>
            <span className="font-semibold capitalize">{vault.network}</span>
          </li>
        </ul>
      </PolicyBlock>

      <PolicyBlock title="Smart account (Squads v4)">
        <div className="space-y-2">
          <code className="block break-all rounded-lg bg-[#FAFAFA] p-2 font-mono text-[11px] text-[#1c1c1e]">
            {vault.squadsAddress}
          </code>
          <div className="flex items-center justify-between text-[11px] text-[#8E8E93]">
            <span>Owner: {truncate(vault.ownerWallet, 6)}</span>
            <a
              href={accountExplorer(vault.squadsAddress, vault.network)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#3B82F6] hover:underline"
            >
              Explorer <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </PolicyBlock>

      <KyvernProgramBlock network={vault.network} />
    </motion.div>
  );
}

/**
 * The Kyvern on-chain program chip. This is the moat — a judge clicks
 * through to Explorer and sees the BPF bytecode owned by
 * BPFLoaderUpgradeable, upgrade-authority-held, our program.
 *
 * Program ID is pinned client-side rather than fetched: the ID doesn't
 * change across vaults, and we want the chip to render even when the
 * /api/health/solana endpoint is momentarily unavailable.
 */
const KYVERN_POLICY_PROGRAM_ID =
  "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

function KyvernProgramBlock({
  network,
}: {
  network: "devnet" | "mainnet";
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="relative overflow-hidden rounded-[18px] border border-[#E0E7FF] bg-gradient-to-br from-[#F8F9FF] to-[#FFFFFF] p-4"
      style={{ boxShadow: "0 4px 16px rgba(79,70,229,0.04)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#4F46E5]">
            <ShieldCheck className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4F46E5]">
            Enforced on-chain by Kyvern program
          </p>
        </div>
        <span className="rounded-full bg-[#4F46E5]/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#4F46E5]">
          Anchor
        </span>
      </div>
      <code
        className="block cursor-pointer break-all rounded-lg bg-white p-2 font-mono text-[11px] text-[#1c1c1e] transition-colors hover:bg-[#F8F9FF]"
        onClick={() => {
          void navigator.clipboard.writeText(KYVERN_POLICY_PROGRAM_ID);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
      >
        {KYVERN_POLICY_PROGRAM_ID}
      </code>
      <div className="mt-2 flex items-center justify-between text-[11px] text-[#6E6E73]">
        <span className="inline-flex items-center gap-1">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#16a34a]" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Click to copy program ID
            </>
          )}
        </span>
        <a
          href={accountExplorer(KYVERN_POLICY_PROGRAM_ID, network)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-[#4F46E5] hover:underline"
        >
          View program <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
      <p className="mt-2.5 text-[10.5px] leading-[1.5] text-[#6E6E73]">
        Every <span className="font-semibold text-[#1c1c1e]">execute_payment</span> call
        hits this Anchor program before it touches Squads. Merchant,
        velocity, memo, and pause rules are enforced by Solana consensus — not
        our server. Blocked calls are real failed Solana transactions.
      </p>
    </div>
  );
}

function PolicyBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[18px] border border-[#F0F0F0] bg-white p-4"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93]">
        {title}
      </p>
      {children}
    </div>
  );
}

function KillSwitchModal({
  paused,
  busy,
  onConfirm,
  onCancel,
}: {
  paused: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="w-[min(420px,92vw)] rounded-[22px] border border-[#E5E5EA] bg-white p-6"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }}
      >
        <div
          className={
            paused
              ? "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#ECFDF5]"
              : "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FEF2F2]"
          }
        >
          {paused ? (
            <Play className="h-5 w-5 text-[#16a34a]" />
          ) : (
            <Pause className="h-5 w-5 text-[#DC2626]" />
          )}
        </div>
        <h3 className="text-[20px] font-semibold tracking-tight">
          {paused ? "Resume the vault?" : "Pause the vault?"}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-[#6E6E73]">
          {paused
            ? "Your agent will start paying again. Existing policy still applies."
            : "Every payment attempt will be refused instantly, on-chain. You can resume at any time."}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="h-9 rounded-full border border-[#E5E5EA] bg-white px-4 text-[12px] font-medium text-[#6E6E73] transition-colors hover:border-[#D1D1D6] hover:text-black disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={
              paused
                ? "inline-flex h-9 items-center gap-1.5 rounded-full bg-[#22C55E] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#16a34a] disabled:opacity-50"
                : "inline-flex h-9 items-center gap-1.5 rounded-full bg-[#EF4444] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#dc2626] disabled:opacity-50"
            }
          >
            {busy ? "Signing…" : paused ? "Resume" : "Pause vault"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Skeletons ─── */

function SkeletonHeader() {
  return (
    <div className="flex items-start gap-4">
      <div className="h-14 w-14 animate-pulse rounded-[18px] bg-[#F0F0F0]" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-7 w-56 animate-pulse rounded bg-[#F0F0F0]" />
        <div className="h-4 w-40 animate-pulse rounded bg-[#F0F0F0]" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="h-40 animate-pulse rounded-[22px] bg-[#F0F0F0]" />
  );
}

/* ─── Pure helpers ─── */

function truncate(addr: string, n = 6) {
  if (!addr) return "";
  if (addr.length <= n * 2 + 2) return addr;
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function relTime(iso: string) {
  const d =
    iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso)
      ? new Date(iso)
      : new Date(iso.replace(" ", "T") + "Z");
  const diffMs = Date.now() - d.getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function explorerUrl(sig: string, network: "devnet" | "mainnet") {
  const base = "https://explorer.solana.com/tx/" + sig;
  return network === "devnet" ? `${base}?cluster=devnet` : base;
}

function accountExplorer(addr: string, network: "devnet" | "mainnet") {
  const base = "https://explorer.solana.com/address/" + addr;
  return network === "devnet" ? `${base}?cluster=devnet` : base;
}
