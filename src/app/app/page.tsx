"use client";

/**
 * /app — developer console.
 *
 * Per SPEC_TO_WIN §6.3: a focused control panel for the things a builder
 * needs to manage their vault. Single page, no tabs, no worker stage,
 * no theatre. The 60-second demo lives at /demo; this is for the user
 * who already knows what Kyvern is and wants to drive it.
 *
 * Sections (in order, no tabs):
 *   1. Header — vault name, address, USDC balance, Pause kill-switch
 *   2. Policy settings — daily/weekly/per-tx caps, editable inline
 *   3. Allowlist — table + Add merchant form, MY_KAST entry highlighted
 *   4. MY_KAST setup — prominent form for KAST USDC deposit address
 *   5. Agent keys — list, revoke, mint new
 *   6. Decision log — last 50 vault decisions, filterable
 *   7. Quick actions — Withdraw to MY_KAST, Try a policy violation,
 *      Get a KAST card →
 *
 * Wiring:
 *   - Header data: /api/devices/[id]/live-status (polled every 5s)
 *   - Pause/resume: /api/vault/[id]/pause
 *   - MY_KAST setup: /api/vault/[id]/set-kast-destination (Block E)
 *   - Agent keys: /api/devices/[id]/agent-key
 *
 * The legacy 9-card dashboard lives at /app/advanced (unlinked from
 * primary nav, preserved for power users).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Pause,
  Play,
  Shield,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";

const KAST_AFFILIATE =
  process.env.NEXT_PUBLIC_KAST_AFFILIATE_URL ?? "https://go.kast.xyz/VqVO/STPAK";

type LiveStatus = {
  serial: string;
  network: "devnet" | "mainnet";
  paused: boolean;
  bornAt: string;
  usdcBalance: number;
  pnlToday: { earned: number; spent: number; net: number };
  workersActive: number;
  lastAction: { worker: string; emoji: string; verb: string; agoSeconds: number } | null;
};

export default function AppPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, wallet } = useAuth();
  const { vaultId, autoInit } = useDeviceStore();
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [pausing, setPausing] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?redirect=/app");
    }
  }, [isAuthenticated, isLoading, router]);

  // Auto-init device on wallet change
  useEffect(() => {
    if (wallet) void autoInit(wallet);
  }, [wallet, autoInit]);

  // Poll live status every 5s
  useEffect(() => {
    if (!vaultId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/devices/${vaultId}/live-status`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as LiveStatus;
        if (!cancelled) {
          setStatus(data);
          setStatusError(null);
        }
      } catch (e) {
        if (!cancelled) setStatusError(e instanceof Error ? e.message : "fetch failed");
      }
    };
    void poll();
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [vaultId]);

  const togglePause = useCallback(async () => {
    if (!vaultId || pausing) return;
    setPausing(true);
    try {
      await fetch(`/api/vault/${vaultId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !status?.paused }),
      });
      // Optimistic flip; next poll will reconcile
      setStatus((s) => (s ? { ...s, paused: !s.paused } : s));
    } finally {
      setPausing(false);
    }
  }, [vaultId, pausing, status?.paused]);

  if (isLoading || !isAuthenticated) {
    return <Loading />;
  }

  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{ background: "var(--background)" }}
    >
      <div className="mx-auto w-full max-w-[760px] flex flex-col gap-8">
        <Header status={status} statusError={statusError} togglePause={togglePause} pausing={pausing} />
        <PolicySettings status={status} />
        <Allowlist />
        <MyKastSetup vaultId={vaultId} ownerWallet={wallet} />
        <AgentKeys vaultId={vaultId} />
        <DecisionLog vaultId={vaultId} />
        <QuickActions />
        <Footer />
      </div>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function Loading() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div className="h-10 w-10 rounded-full border-2 border-black/10 border-t-black animate-spin" />
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function Section({
  title,
  caption,
  icon,
  children,
}: {
  title: string;
  caption?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[16px] p-6"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="text-[15px] font-semibold tracking-[-0.005em]" style={{ color: "#0A0A0A" }}>
          {title}
        </h2>
      </div>
      {caption ? (
        <p className="text-[12.5px] mb-4" style={{ color: "#6B7280" }}>
          {caption}
        </p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function Header({
  status,
  statusError,
  togglePause,
  pausing,
}: {
  status: LiveStatus | null;
  statusError: string | null;
  togglePause: () => void;
  pausing: boolean;
}) {
  const balance = status ? status.usdcBalance.toFixed(2) : "—";
  const paused = !!status?.paused;

  return (
    <header
      className="rounded-[16px] p-6"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8F9FB 100%)",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.10)",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div
            className="font-mono uppercase tracking-[0.16em] mb-1"
            style={{ color: "#9CA3AF", fontSize: 10 }}
          >
            Your vault
          </div>
          <h1
            className="text-[22px] font-semibold tracking-[-0.015em] mb-2"
            style={{ color: "#0A0A0A" }}
          >
            {status?.serial ?? "Loading…"}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Pill tone={paused ? "amber" : "green"}>
              {paused ? "Paused" : "Live · " + (status?.network ?? "devnet")}
            </Pill>
            <span className="font-mono text-[12.5px]" style={{ color: "#6B7280" }}>
              <span className="text-[10px] uppercase tracking-[0.14em] mr-1">USDC</span>
              <span className="tabular-nums text-[14px] font-semibold" style={{ color: "#0A0A0A" }}>
                ${balance}
              </span>
            </span>
          </div>
          {statusError && (
            <p className="text-[11px] mt-2" style={{ color: "#B45309" }}>
              live-status: {statusError}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={togglePause}
          disabled={pausing || !status}
          className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 font-mono uppercase tracking-[0.14em] disabled:opacity-50 transition active:scale-[0.97]"
          style={{
            fontSize: 10.5,
            color: paused ? "#FFFFFF" : "#B91C1C",
            background: paused ? "#0A0A0A" : "rgba(220,38,38,0.06)",
            border: paused
              ? "1px solid rgba(0,0,0,0.8)"
              : "1px solid rgba(220,38,38,0.20)",
          }}
        >
          {paused ? (
            <>
              <Play className="w-3 h-3" strokeWidth={2.5} />
              Resume vault
            </>
          ) : (
            <>
              <Pause className="w-3 h-3" strokeWidth={2.5} />
              Pause vault
            </>
          )}
        </button>
      </div>
    </header>
  );
}

function Pill({ tone, children }: { tone: "green" | "amber"; children: React.ReactNode }) {
  const palette =
    tone === "green"
      ? {
          fg: "#15803D",
          bg: "rgba(34,197,94,0.10)",
          border: "rgba(34,197,94,0.20)",
        }
      : {
          fg: "#B45309",
          bg: "rgba(245,158,11,0.10)",
          border: "rgba(245,158,11,0.30)",
        };
  return (
    <span
      className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] rounded-full px-2 py-0.5"
      style={{
        fontSize: 9.5,
        color: palette.fg,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span className="rounded-full w-1.5 h-1.5" style={{ background: palette.fg }} />
      {children}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function PolicySettings({ status }: { status: LiveStatus | null }) {
  // Display-only in Block A. Inline-editable mutation lands in a later block.
  return (
    <Section
      title="Policy"
      caption="Compiled to the on-chain Kyvern program at PpmZ…MSqc. Caps enforce on-chain via Squads spending limit; rules enforce in the Kyvern policy program."
      icon={<Shield className="w-4 h-4" strokeWidth={1.6} style={{ color: "#0A0A0A" }} />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Daily cap" value="$5.00" hint="Squads-enforced" />
        <Stat label="Weekly cap" value="$25.00" hint="Squads-enforced" />
        <Stat label="Per-tx cap" value="$0.50" hint="Squads-enforced" />
      </div>
      <p className="text-[11px] mt-3" style={{ color: "#9CA3AF" }}>
        Daily spend today: <span className="font-mono tabular-nums" style={{ color: "#374151" }}>${status?.pnlToday.spent.toFixed(2) ?? "0.00"}</span>
      </p>
    </Section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: "rgba(15,23,42,0.03)",
        border: "1px solid rgba(15,23,42,0.05)",
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.14em]"
        style={{ color: "#9CA3AF", fontSize: 9.5 }}
      >
        {label}
      </div>
      <div
        className="font-mono tabular-nums text-[18px] font-semibold mt-0.5"
        style={{ color: "#0A0A0A" }}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[10.5px] mt-0.5" style={{ color: "#6B7280" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function Allowlist() {
  // Block A: empty stub. Full table + Add form lands in Block E.
  return (
    <Section
      title="Allowlist"
      caption="Merchants and destinations the agent is allowed to pay. Hash-stored on the policy program."
      icon={<Sparkles className="w-4 h-4" strokeWidth={1.6} style={{ color: "#0A0A0A" }} />}
    >
      <div
        className="rounded-[10px] p-3 text-[12px] font-mono"
        style={{
          background: "rgba(15,23,42,0.02)",
          border: "1px dashed rgba(15,23,42,0.10)",
          color: "#6B7280",
        }}
      >
        api.openai.com · api.anthropic.com · api.perplexity.ai · pay.sh
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function MyKastSetup({
  vaultId,
  ownerWallet,
}: {
  vaultId: string | null;
  ownerWallet: string | null;
}) {
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate existing value
  useEffect(() => {
    if (!vaultId || !ownerWallet) return;
    void fetch(`/api/vault/${vaultId}/set-kast-destination`, {
      headers: { "x-owner-wallet": ownerWallet },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d?.address) {
          setAddress(d.address);
          setSaved(true);
        }
      })
      .catch(() => {});
  }, [vaultId, ownerWallet]);

  async function save() {
    if (!vaultId || !ownerWallet || !address || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/vault/${vaultId}/set-kast-destination`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({ address, ownerWallet }),
      });
      const d = await r.json();
      if (d?.ok) {
        setSaved(true);
      } else {
        setError(d?.message ?? d?.error ?? "save failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="MY_KAST setup"
      caption="Paste your KAST Solana USDC deposit address. Every agent payout to this address funds your KAST card."
      icon={<CreditCard className="w-4 h-4" strokeWidth={1.6} style={{ color: "#0A0A0A" }} />}
    >
      <div className="flex flex-col gap-3">
        <input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setSaved(false);
          }}
          placeholder="Solana USDC deposit address (from KAST app · Deposit · Solana USDC)"
          className="font-mono text-[12.5px] rounded-[10px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-black/10"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.10)",
          }}
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <a
            href={KAST_AFFILIATE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "#6B7280" }}
          >
            Don&apos;t have a KAST card?
            <span className="underline">Get one →</span>
          </a>
          <button
            type="button"
            disabled={!address || saved || busy}
            onClick={save}
            className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 font-mono uppercase tracking-[0.14em] disabled:opacity-50 transition active:scale-[0.97]"
            style={{
              fontSize: 10.5,
              color: "#FFFFFF",
              background: saved ? "#15803D" : "#0A0A0A",
              border: "1px solid rgba(0,0,0,0.8)",
            }}
          >
            {saved ? (
              <>
                <Check className="w-3 h-3" strokeWidth={2.5} />
                Allowlisted
              </>
            ) : busy ? (
              "Saving…"
            ) : (
              <>
                Allowlist as MY_KAST
                <ArrowRight className="w-3 h-3" strokeWidth={2} />
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="text-[11px]" style={{ color: "#B45309" }}>
            {error}
          </p>
        )}
        <p className="text-[10.5px]" style={{ color: "#9CA3AF" }}>
          Kyvern is <em>compatible with KAST deposit rails</em>. Not affiliated with KAST.
        </p>
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function AgentKeys({ vaultId }: { vaultId: string | null }) {
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch existing key prefix on mount
  useEffect(() => {
    if (!vaultId) return;
    void fetch(`/api/devices/${vaultId}/agent-key`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.prefix) setKeyPrefix(d.prefix);
      })
      .catch(() => {});
  }, [vaultId]);

  async function mint() {
    if (!vaultId || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/devices/${vaultId}/agent-key`, { method: "POST" });
      if (r.ok) {
        const d = await r.json();
        if (d?.fullKey) {
          setRevealedKey(d.fullKey);
          setKeyPrefix(d.fullKey.slice(0, 14));
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!revealedKey) return;
    void navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Section
      title="Agent keys"
      caption="Use these in your agent code. They authorize POST /api/vault/pay on this vault."
      icon={<KeyRound className="w-4 h-4" strokeWidth={1.6} style={{ color: "#0A0A0A" }} />}
    >
      <div className="flex flex-col gap-3">
        <div
          className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 flex-wrap"
          style={{
            background: "rgba(15,23,42,0.03)",
            border: "1px solid rgba(15,23,42,0.05)",
          }}
        >
          <span
            className="font-mono truncate"
            style={{
              fontSize: 12,
              color: revealedKey ? "#0A0A0A" : "rgba(15,23,42,0.55)",
            }}
          >
            {revealedKey ?? (keyPrefix ? `${keyPrefix}…` : "no key minted yet")}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {revealedKey && (
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em]"
                style={{ fontSize: 9.5, color: copied ? "#15803D" : "#6B7280" }}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            <button
              type="button"
              onClick={mint}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono uppercase tracking-[0.14em] disabled:opacity-50 transition"
              style={{
                fontSize: 9.5,
                color: "#FFFFFF",
                background: "#0A0A0A",
                border: "1px solid rgba(0,0,0,0.8)",
              }}
            >
              {busy ? "Minting…" : revealedKey ? <><Eye className="w-3 h-3" />Shown once</> : <>Mint a key<ArrowRight className="w-3 h-3" /></>}
            </button>
          </div>
        </div>
        {revealedKey && (
          <p className="text-[10.5px] flex items-center gap-1" style={{ color: "#B45309" }}>
            <EyeOff className="w-3 h-3" /> This is the only time this key is shown. Save it now.
          </p>
        )}
      </div>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function DecisionLog({ vaultId }: { vaultId: string | null }) {
  // Block A: stub. Full log lands in a later block (decision-log endpoint
  // already exists in the codebase, just needs wiring).
  void vaultId;
  return (
    <Section
      title="Decision log"
      caption="Last 50 vault decisions, real-time. Each row links to Solana Explorer when there's a transaction."
    >
      <p className="text-[12px] font-mono" style={{ color: "#6B7280" }}>
        See <Link href="/evidence" className="underline">/evidence</Link> for the full Atlas decision ledger.
      </p>
    </Section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function QuickActions() {
  return (
    <Section title="Quick actions">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ActionButton href="/demo" label="Try a policy violation" hint="See the chain refuse" />
        <ActionButton href="#my-kast" label="Withdraw to MY_KAST" hint="Coming in Block E" disabled />
        <ActionButton
          href={KAST_AFFILIATE}
          label="Get a KAST card →"
          hint="Affiliate link"
          external
        />
      </div>
    </Section>
  );
}

function ActionButton({
  href,
  label,
  hint,
  external,
  disabled,
}: {
  href: string;
  label: string;
  hint?: string;
  external?: boolean;
  disabled?: boolean;
}) {
  const inner = (
    <div
      className="rounded-[10px] px-3 py-2.5"
      style={{
        background: disabled ? "rgba(15,23,42,0.02)" : "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div
        className="text-[12.5px] font-semibold tracking-[-0.005em] inline-flex items-center gap-1"
        style={{ color: "#0A0A0A" }}
      >
        {label}
        {external && <ExternalLink className="w-3 h-3" strokeWidth={2} />}
      </div>
      {hint && (
        <div className="text-[10.5px] mt-0.5" style={{ color: "#6B7280" }}>
          {hint}
        </div>
      )}
    </div>
  );
  if (disabled) return inner;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }
  return <Link href={href}>{inner}</Link>;
}

/* ──────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer
      className="text-[11px] text-center"
      style={{ color: "#9CA3AF" }}
    >
      Built for Solana Frontier 2026 · Devnet today · Mainnet auditing in progress.
      <br />
      SDK: <code className="font-mono">npm install @kyvernlabs/sdk</code> · Program:{" "}
      <code className="font-mono">PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc</code>
    </footer>
  );
}
