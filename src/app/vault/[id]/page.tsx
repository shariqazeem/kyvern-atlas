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
  OctagonAlert,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import { AgentObservatoryStrip } from "@/components/vault/agent-observatory-strip";
import { VaultTabs } from "@/components/vault/vault-tabs";
import { EASE_PREMIUM as EASE } from "@/lib/motion";

/* ─── Types that match the API response ─── */

// Dashboard types moved to src/components/vault/types.ts so that
// sibling components (tabs, cards) can share them without drift.
import type {
  Vault,
  Payment,
  BudgetSnapshot,
  VelocitySnapshot,
} from "@/components/vault/types";

interface DashboardPayload {
  vault: Vault;
  budget: BudgetSnapshot;
  velocity: VelocitySnapshot;
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

        {/* ─── Tabbed dashboard surface ───
             Replaces the old single-long-scroll stack. Each tab owns
             its own concern (Live, Budget, Activity, Policy, Integrate)
             and its own accent color. See src/components/vault/vault-tabs.tsx
             for the tab architecture + deep-link support via ?tab=. */}
        <VaultTabs
          vault={data.vault}
          payments={data.payments}
          budget={data.budget}
          velocity={data.velocity}
          onAfterAction={() => void load({ silent: true })}
          onKillSwitch={() => setPauseModal(true)}
        />
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
          href={`https://explorer.solana.com/address/${health.keystore.pubkey}?cluster=${health.network}`}
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

// explorerUrl + accountExplorer helpers moved to the components that
// need them (activity-feed.tsx, policy-tab.tsx). Page.tsx no longer
// constructs explorer URLs directly.
