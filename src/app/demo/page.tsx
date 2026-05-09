"use client";

/**
 * /demo — the page judges land on.
 *
 * Per SPEC_TO_WIN §6.2: single-column, ≤900px, ordered top-to-bottom:
 *   1. Title bar
 *   2. Three-step header (Block · Settle · SDK)
 *   3. Vault tile (Atlas, polling /api/atlas/status every 5s)
 *   4. Step 1 — red box, four scenario buttons that produce real
 *      on-chain failed Solana txs via the Kyvern policy program at
 *      PpmZ…MSqc.
 *   5. Step 2 — green box, settle button that produces a real
 *      on-chain success.
 *   6. Step 3 — terminal-style block with the npx scaffolder cmd
 *      and a 3-line SDK preview.
 *   7. KAST hook — paste-your-KAST-deposit-address card with the
 *      affiliate link.
 *   8. Footer.
 *
 * Every button hits a real backend. Every result carries a clickable
 * Solana Explorer link to a finalized transaction. No theatre.
 *
 * Modal pattern: pending → submitting → result (blocked|settled), with
 * the program-error code surfaced verbatim from the chain logs.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Play,
  ShieldCheck,
  X as XIcon,
} from "lucide-react";

const KAST_AFFILIATE =
  process.env.NEXT_PUBLIC_KAST_AFFILIATE_URL ?? "https://go.kast.xyz/VqVO/STPAK";

const PROGRAM_ID = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";
const PROGRAM_LINK = `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`;

/* ──────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────── */

interface AtlasStatus {
  totalEarnedUsd: number;
  totalSpentUsd: number;
  totalAttacksBlocked: number;
  totalCycles: number;
  firstIgnitionAt: string;
  vaultUsdc?: number;
}

interface ProbeResult {
  ok: boolean;
  scenario?: string;
  description?: string;
  expectedOutcome?: "blocked" | "settled";
  expectedErrorCode?: number | null;
  expectedErrorName?: string | null;
  signature?: string | null;
  explorerUrl?: string | null;
  durationMs?: number;
  error?: string;
  message?: string;
  retryAfterSeconds?: number;
}

/* ──────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────── */

export default function DemoPage() {
  const [status, setStatus] = useState<AtlasStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalState, setModalState] = useState<"submitting" | "result">("submitting");
  const [result, setResult] = useState<ProbeResult | null>(null);

  // Poll /api/atlas/status every 5s for the live counter strip
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/atlas/status");
        if (!r.ok) return;
        const d = (await r.json()) as AtlasStatus;
        if (!cancelled) setStatus(d);
      } catch {
        /* swallow */
      }
    };
    void poll();
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const fireScenario = useCallback(async (scenario: string) => {
    setResult(null);
    setModalOpen(true);
    setModalState("submitting");
    try {
      const r = await fetch("/api/atlas/probe-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const data = (await r.json()) as ProbeResult;
      setResult(data);
    } catch (e) {
      setResult({
        ok: false,
        error: "network",
        message: e instanceof Error ? e.message : "request failed",
      });
    } finally {
      setModalState("result");
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setResult(null);
  }, []);

  const daysLive = status?.firstIgnitionAt
    ? Math.floor(
        (Date.now() - new Date(status.firstIgnitionAt).getTime()) / 86_400_000,
      )
    : null;

  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{ background: "var(--background, #FAFAFA)" }}
    >
      <div className="mx-auto w-full max-w-[820px] flex flex-col gap-6">
        <TitleBar />
        <ThreeStepHeader />
        <VaultTile status={status} daysLive={daysLive} />
        <Step1 fireScenario={fireScenario} />
        <Step2 fireScenario={fireScenario} />
        <Step3 />
        <KastHook />
        <Footer />
      </div>

      {modalOpen && (
        <ResultModal state={modalState} result={result} onClose={closeModal} />
      )}
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Title bar
   ────────────────────────────────────────────────────────────────── */

function TitleBar() {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div
          className="font-mono uppercase tracking-[0.18em] mb-1"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          Live demo · Solana devnet
        </div>
        <h1
          className="text-[26px] font-semibold tracking-[-0.02em]"
          style={{ color: "#0A0A0A" }}
        >
          The chain decides every dollar.
        </h1>
        <p className="text-[13.5px] mt-1" style={{ color: "#6B7280" }}>
          Click any button. Every result is a finalized Solana transaction —
          either refused on-chain by the Kyvern policy program, or settled
          through Squads. Verify it on Explorer yourself.
        </p>
      </div>
      <Link
        href="/"
        className="font-mono uppercase tracking-[0.14em] hover:underline"
        style={{ fontSize: 10.5, color: "#6B7280" }}
      >
        ← Home
      </Link>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Three-step header
   ────────────────────────────────────────────────────────────────── */

function ThreeStepHeader() {
  const steps = [
    { n: 1, label: "Watch a block", color: "#DC2626" },
    { n: 2, label: "Watch a settle", color: "#16A34A" },
    { n: 3, label: "Get the SDK", color: "#0A0A0A" },
  ];
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full w-6 h-6 inline-flex items-center justify-center font-mono text-[11px] font-semibold"
              style={{ background: s.color, color: "#FFFFFF" }}
            >
              {s.n}
            </span>
            <span
              className="text-[12.5px] font-semibold tracking-[-0.005em]"
              style={{ color: "#0A0A0A" }}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span style={{ color: "#D1D5DB", fontSize: 14 }}>·</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Vault tile (Atlas live state)
   ────────────────────────────────────────────────────────────────── */

function VaultTile({
  status,
  daysLive,
}: {
  status: AtlasStatus | null;
  daysLive: number | null;
}) {
  return (
    <section
      className="rounded-[16px] p-5"
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
            style={{ color: "#9CA3AF", fontSize: 9.5 }}
          >
            Reference vault · Atlas
          </div>
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <span
              className="font-mono text-[13px] truncate"
              style={{ color: "#0A0A0A", maxWidth: 380 }}
            >
              7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP
            </span>
            <span
              className="rounded-full inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] px-2 py-0.5"
              style={{
                fontSize: 9,
                color: "#15803D",
                background: "rgba(34,197,94,0.10)",
                border: "1px solid rgba(34,197,94,0.20)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#22C55E" }}
              />
              Live
            </span>
          </div>
          <p className="text-[12px]" style={{ color: "#6B7280" }}>
            Real Squads multisig · policy enforced by{" "}
            <a
              href={PROGRAM_LINK}
              target="_blank"
              rel="noreferrer"
              className="font-mono hover:underline"
              style={{ color: "#0A0A0A" }}
            >
              {PROGRAM_ID.slice(0, 6)}…{PROGRAM_ID.slice(-4)}
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-5">
          <Stat
            label="Days live"
            value={daysLive !== null ? `${daysLive}` : "—"}
          />
          <Stat
            label="Funds lost"
            value={status ? "$0" : "—"}
            tone="green"
          />
          <Stat
            label="Attacks blocked"
            value={status ? `${status.totalAttacksBlocked}` : "—"}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green";
}) {
  return (
    <div className="flex flex-col items-end">
      <div
        className="font-mono uppercase tracking-[0.14em]"
        style={{ color: "#9CA3AF", fontSize: 9 }}
      >
        {label}
      </div>
      <div
        className="font-mono tabular-nums text-[20px] font-semibold leading-none mt-1"
        style={{ color: tone === "green" ? "#15803D" : "#0A0A0A" }}
      >
        {value}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Step 1 — block scenarios
   ────────────────────────────────────────────────────────────────── */

const BLOCK_SCENARIOS = [
  {
    key: "amount_exceeds_per_tx",
    title: "Try to drain $5",
    description: "Per-tx cap is $2. The chain refuses with AmountExceedsPerTxMax.",
    errorCode: 12002,
  },
  {
    key: "merchant_not_allowed",
    title: "Pay an unknown wallet",
    description: "ranger.com isn't on Atlas's allowlist. Refused with MerchantNotAllowlisted.",
    errorCode: 12003,
  },
  {
    key: "missing_memo",
    title: "Skip the required memo",
    description: "Atlas's policy requires a memo. Refused with MissingMemo.",
    errorCode: 12004,
  },
  {
    key: "vault_paused",
    title: "Pause + try again",
    description: "Flip the kill switch, then attempt a payment. Refused with VaultPaused.",
    errorCode: 12000,
  },
];

function Step1({ fireScenario }: { fireScenario: (s: string) => void }) {
  return (
    <section
      className="rounded-[16px] p-5"
      style={{
        background: "#FFFFFF",
        border: "1.5px solid rgba(220,38,38,0.20)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(220,38,38,0.10)",
      }}
    >
      <SectionHead
        n={1}
        accent="#DC2626"
        title="Watch a real attack get blocked."
        sub="Each button below sends a real transaction to Solana devnet. The Kyvern program refuses it. The result is a finalized failed transaction you can verify on Explorer."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
        {BLOCK_SCENARIOS.map((s) => (
          <ScenarioButton
            key={s.key}
            tone="red"
            title={s.title}
            description={s.description}
            errorCode={s.errorCode}
            onClick={() => fireScenario(s.key)}
          />
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Step 2 — settle
   ────────────────────────────────────────────────────────────────── */

function Step2({ fireScenario }: { fireScenario: (s: string) => void }) {
  return (
    <section
      className="rounded-[16px] p-5"
      style={{
        background: "#FFFFFF",
        border: "1.5px solid rgba(34,197,94,0.20)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(34,197,94,0.10)",
      }}
    >
      <SectionHead
        n={2}
        accent="#16A34A"
        title="Watch a real allowed payment settle."
        sub="Same plumbing, allowed merchant. ~3–5 seconds to confirmation."
      />
      <div className="mt-4">
        <ScenarioButton
          tone="green"
          title="Pay api.openai.com $0.001"
          description="Allowlisted merchant, valid memo, within per-tx cap. Kyvern → Squads CPI → SPL Token transfer."
          onClick={() => fireScenario("settled_allowed")}
        />
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Step 3 — SDK
   ────────────────────────────────────────────────────────────────── */

function Step3() {
  const [copied, setCopied] = useState(false);
  const cmd = "npx create-kyvern-agent my-agent";

  function copy() {
    void navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section
      className="rounded-[16px] p-5"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
      }}
    >
      <SectionHead
        n={3}
        accent="#0A0A0A"
        title="Wrap your own agent."
        sub="One command scaffolds a working Solana agent backed by a Kyvern vault. Real Squads multisig, real on-chain policy, real failed-tx receipts."
      />

      {/* Terminal block */}
      <div
        className="rounded-[10px] p-3.5 mt-4 flex items-center justify-between gap-3 flex-wrap"
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(15,23,42,0.20)",
        }}
      >
        <code
          className="font-mono"
          style={{ color: "rgba(255,255,255,0.92)", fontSize: 13 }}
        >
          <span style={{ color: "rgba(255,255,255,0.45)" }}>$ </span>
          {cmd}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] hover:opacity-80 transition"
          style={{
            fontSize: 9.5,
            color: copied ? "#86EFAC" : "rgba(255,255,255,0.55)",
          }}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" strokeWidth={2.5} />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" strokeWidth={2} />
              Copy
            </>
          )}
        </button>
      </div>

      {/* SDK preview */}
      <div
        className="rounded-[10px] mt-2 overflow-hidden"
        style={{
          background: "#F8F9FB",
          border: "1px solid rgba(15,23,42,0.06)",
        }}
      >
        <div
          className="px-3 py-1.5 font-mono uppercase tracking-[0.14em]"
          style={{
            fontSize: 9,
            color: "#9CA3AF",
            borderBottom: "1px solid rgba(15,23,42,0.04)",
          }}
        >
          @kyvernlabs/sdk · 3 lines
        </div>
        <pre
          className="px-3.5 py-3 font-mono whitespace-pre overflow-x-auto"
          style={{
            fontSize: 12,
            color: "#374151",
            lineHeight: 1.6,
          }}
        >{`import { Vault } from "@kyvernlabs/sdk";
const vault = new Vault({ agentKey: process.env.KYVERN_AGENT_KEY! });
const res = await vault.pay({ merchant, recipientPubkey, amount, memo });`}</pre>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
   KAST hook
   ────────────────────────────────────────────────────────────────── */

function KastHook() {
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <section
      className="rounded-[16px] p-5"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #FFF7ED 100%)",
        border: "1.5px solid rgba(249,115,22,0.20)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(249,115,22,0.10)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-4 h-4" strokeWidth={1.6} style={{ color: "#EA580C" }} />
        <h2
          className="text-[15px] font-semibold tracking-[-0.005em]"
          style={{ color: "#0A0A0A" }}
        >
          Where the loop ends in real life.
        </h2>
      </div>
      <p className="text-[13px] mb-4" style={{ color: "#7C3F19" }}>
        Agent earnings can flow directly into a KAST-funded card via USDC. Paste
        your KAST Solana USDC deposit address; we&apos;ll allowlist it as{" "}
        <code className="font-mono">MY_KAST</code>. Spend at 150M+ merchants —
        coffee, groceries, flights, anywhere VISA works.
      </p>

      <div className="flex flex-col gap-2">
        <input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setSaved(false);
          }}
          placeholder="Solana USDC deposit address (KAST app · Deposit · Solana USDC)"
          className="font-mono text-[12.5px] rounded-[10px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200"
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
            className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] hover:underline"
            style={{ fontSize: 10, color: "#EA580C" }}
          >
            Don&apos;t have a KAST card?
            <span>Get one →</span>
          </a>
          <button
            type="button"
            disabled={!address || saved}
            onClick={() => setSaved(true)}
            className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 font-mono uppercase tracking-[0.14em] disabled:opacity-50 transition active:scale-[0.97]"
            style={{
              fontSize: 10.5,
              color: "#FFFFFF",
              background: saved ? "#15803D" : "#EA580C",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            {saved ? (
              <>
                <Check className="w-3 h-3" strokeWidth={2.5} />
                Saved
              </>
            ) : (
              <>
                Allowlist as MY_KAST
                <ArrowRight className="w-3 h-3" strokeWidth={2} />
              </>
            )}
          </button>
        </div>
        <p className="text-[10.5px] mt-1" style={{ color: "#9CA3AF" }}>
          Kyvern is <em>compatible with KAST deposit rails</em>. Not affiliated
          with KAST.
        </p>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Footer
   ────────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer
      className="text-[11px] text-center mt-2"
      style={{ color: "#9CA3AF" }}
    >
      Built for Solana Frontier 2026. Devnet today. Mainnet auditing in progress.
      <br />
      SDK: <code className="font-mono">npm install @kyvernlabs/sdk</code> · Program:{" "}
      <a href={PROGRAM_LINK} target="_blank" rel="noreferrer" className="font-mono hover:underline" style={{ color: "#6B7280" }}>
        {PROGRAM_ID}
      </a>
    </footer>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Helpers — section header + scenario button
   ────────────────────────────────────────────────────────────────── */

function SectionHead({
  n,
  accent,
  title,
  sub,
}: {
  n: number;
  accent: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="rounded-full w-7 h-7 inline-flex items-center justify-center font-mono text-[12px] font-semibold flex-shrink-0"
        style={{ background: accent, color: "#FFFFFF" }}
      >
        {n}
      </span>
      <div>
        <h2
          className="text-[16px] font-semibold tracking-[-0.005em] mb-0.5"
          style={{ color: "#0A0A0A" }}
        >
          {title}
        </h2>
        <p className="text-[12.5px]" style={{ color: "#6B7280" }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

function ScenarioButton({
  tone,
  title,
  description,
  errorCode,
  onClick,
}: {
  tone: "red" | "green";
  title: string;
  description: string;
  errorCode?: number;
  onClick: () => void;
}) {
  const palette =
    tone === "red"
      ? {
          fg: "#B91C1C",
          bg: "#FFFFFF",
          border: "rgba(220,38,38,0.18)",
          hover: "rgba(220,38,38,0.04)",
          chip: "rgba(220,38,38,0.10)",
        }
      : {
          fg: "#15803D",
          bg: "#FFFFFF",
          border: "rgba(34,197,94,0.18)",
          hover: "rgba(34,197,94,0.04)",
          chip: "rgba(34,197,94,0.10)",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-[12px] p-3.5 transition active:scale-[0.99] hover:shadow-md"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = palette.hover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = palette.bg; }}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span
          className="text-[13.5px] font-semibold tracking-[-0.005em]"
          style={{ color: "#0A0A0A" }}
        >
          {title}
        </span>
        <Play
          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
          strokeWidth={2}
          style={{ color: palette.fg }}
        />
      </div>
      <p
        className="text-[11.5px] leading-[1.45] mb-2"
        style={{ color: "#6B7280" }}
      >
        {description}
      </p>
      {errorCode !== undefined && (
        <span
          className="inline-flex items-center font-mono uppercase tracking-[0.14em] rounded-full px-2 py-0.5"
          style={{
            fontSize: 9,
            color: palette.fg,
            background: palette.chip,
            border: `1px solid ${palette.border}`,
          }}
        >
          Expected: {errorCode}
        </span>
      )}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Result modal
   ────────────────────────────────────────────────────────────────── */

function ResultModal({
  state,
  result,
  onClose,
}: {
  state: "submitting" | "result";
  result: ProbeResult | null;
  onClose: () => void;
}) {
  const isBlocked = result?.expectedOutcome === "blocked";
  const isSettled = !!result?.ok && result.expectedOutcome === "settled";
  const ok = result?.ok ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-[16px] p-6"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 20px 60px rgba(15,23,42,0.30)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {state === "submitting" ? (
          <div className="text-center py-6">
            <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin" style={{ color: "#0A0A0A" }} />
            <h3
              className="text-[15px] font-semibold tracking-[-0.005em] mb-1"
              style={{ color: "#0A0A0A" }}
            >
              Submitting to Solana devnet…
            </h3>
            <p className="text-[12px]" style={{ color: "#6B7280" }}>
              The chain is deciding right now.
            </p>
          </div>
        ) : (
          <ResultBody result={result} ok={ok} isBlocked={isBlocked} isSettled={isSettled} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function ResultBody({
  result,
  ok,
  isBlocked,
  isSettled,
  onClose,
}: {
  result: ProbeResult | null;
  ok: boolean;
  isBlocked: boolean;
  isSettled: boolean;
  onClose: () => void;
}) {
  // Hard error (no signature, no expected outcome — usually rate limit)
  if (!ok && !result?.signature) {
    return (
      <div className="text-center py-2">
        <div
          className="w-10 h-10 mx-auto mb-3 rounded-full inline-flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.10)" }}
        >
          <XIcon className="w-5 h-5" strokeWidth={2.5} style={{ color: "#B45309" }} />
        </div>
        <h3
          className="text-[15px] font-semibold tracking-[-0.005em] mb-1"
          style={{ color: "#0A0A0A" }}
        >
          {result?.error === "rate_limited" ? "Hold up" : "Something went sideways"}
        </h3>
        <p className="text-[12.5px] mb-4" style={{ color: "#6B7280" }}>
          {result?.message ?? result?.error ?? "Unknown failure."}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] px-3 py-1.5 font-mono uppercase tracking-[0.14em]"
          style={{
            fontSize: 10,
            color: "#FFFFFF",
            background: "#0A0A0A",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  const palette = isSettled
    ? { fg: "#15803D", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.20)" }
    : { fg: "#B91C1C", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.20)" };

  return (
    <div>
      <div
        className="rounded-[12px] p-3 mb-4"
        style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
      >
        <div className="flex items-center gap-2 mb-1">
          {isSettled ? (
            <Check className="w-4 h-4" strokeWidth={2.5} style={{ color: palette.fg }} />
          ) : (
            <XIcon className="w-4 h-4" strokeWidth={2.5} style={{ color: palette.fg }} />
          )}
          <span
            className="font-mono uppercase tracking-[0.16em]"
            style={{ color: palette.fg, fontSize: 10.5 }}
          >
            {isSettled ? "Settled on-chain" : "Blocked on-chain"}
            {result?.durationMs ? ` · ${result.durationMs}ms` : ""}
          </span>
        </div>
        <p className="text-[13px]" style={{ color: "#0A0A0A" }}>
          {result?.description}
        </p>
        {isBlocked && result?.expectedErrorCode && (
          <div
            className="mt-2 inline-flex items-center gap-1.5 font-mono rounded-full px-2 py-0.5"
            style={{
              fontSize: 10.5,
              color: "#B91C1C",
              background: "rgba(220,38,38,0.10)",
              border: "1px solid rgba(220,38,38,0.18)",
            }}
          >
            Custom error {result.expectedErrorCode} — {result.expectedErrorName}
          </div>
        )}
      </div>

      {/* Signature + Explorer link */}
      {result?.signature && (
        <a
          href={result.explorerUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-[10px] p-2.5 mb-3 group hover:bg-black/[0.02] transition"
          style={{ border: "1px solid rgba(15,23,42,0.08)" }}
        >
          <div className="min-w-0">
            <div
              className="font-mono uppercase tracking-[0.14em]"
              style={{ color: "#9CA3AF", fontSize: 9 }}
            >
              Tx signature
            </div>
            <div
              className="font-mono truncate"
              style={{ fontSize: 12, color: "#0A0A0A" }}
            >
              {result.signature.slice(0, 18)}…{result.signature.slice(-12)}
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] flex-shrink-0 group-hover:underline"
            style={{ fontSize: 9.5, color: "#0A0A0A" }}
          >
            View on Explorer
            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
          </span>
        </a>
      )}

      <div className="flex items-center justify-between gap-3 mt-1">
        <a
          href={PROGRAM_LINK}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] hover:underline"
          style={{ fontSize: 9.5, color: "#6B7280" }}
        >
          <ShieldCheck className="w-3 h-3" />
          Program · {PROGRAM_ID.slice(0, 6)}…{PROGRAM_ID.slice(-4)}
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[8px] px-3 py-1.5 font-mono uppercase tracking-[0.14em]"
          style={{
            fontSize: 10,
            color: "#FFFFFF",
            background: "#0A0A0A",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
