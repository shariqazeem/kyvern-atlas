"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 *  Vault Playground — the "ready to use" onboarding surface.
 *
 *  Two jobs, one component:
 *
 *   A. FundWidget          — shows the vault's USDC ATA + live balance,
 *                            with a one-click Circle faucet link. Makes
 *                            funding a new vault feel like topping up a
 *                            prepaid card, not like CLI voodoo.
 *
 *   B. TestPaymentPanel    — four pre-baked scenario buttons that hit
 *                            the live /api/vault/pay endpoint with the
 *                            agent key. Replaces the CLI demo-agent for
 *                            judges / first-time users: the "moat moment"
 *                            happens IN the product, not in a terminal.
 *
 *  Both are collapsible and remember their dismissed state per-vault in
 *  localStorage — so the page doesn't get cluttered once the user
 *  doesn't need them anymore.
 * ════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";

const EASE = [0.25, 0.1, 0.25, 1] as const;

// Demo recipient — a well-known devnet address. We don't actually care
// who receives the USDC in the test-mode flow; we care that the on-chain
// tx lands (or gets refused by the program, which is the whole point).
const DEMO_RECIPIENT = "5eyKt4yXtD9Wz8gPWs9fEUv9AQCoTFv9o6xAiBm1Kjv6";

export interface PlaygroundProps {
  vaultId: string;
  network: "devnet" | "mainnet";
  agentKey: string | null; // null = user never saved theirs → show info panel
  allowedMerchants: string[];
  perTxMaxUsd: number;
  requireMemo: boolean;
  /** Called after each test call so the parent can re-fetch the activity feed. */
  onAfterCall?: () => void;
}

export function VaultPlayground(props: PlaygroundProps) {
  return (
    <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <FundWidget vaultId={props.vaultId} network={props.network} />
      <TestPaymentPanel {...props} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  A. FundWidget                                                     */
/* ────────────────────────────────────────────────────────────────── */

interface FundingInfo {
  vaultId: string;
  network: "devnet" | "mainnet";
  vaultPda: string;
  usdcAta: string;
  balanceUsdc: number | null;
  ataExplorerUrl: string;
  faucetUrl: string;
}

function FundWidget({
  vaultId,
  network,
}: {
  vaultId: string;
  network: "devnet" | "mainnet";
}) {
  const [data, setData] = useState<FundingInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dismissKey = `kv:fund-widget-dismissed:${vaultId}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(dismissKey) === "1") setDismissed(true);
  }, [dismissKey]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/vault/${vaultId}/funding`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as FundingInfo;
      setData(j);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not load funding");
    }
  }, [vaultId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const funded = (data?.balanceUsdc ?? 0) > 0;

  // Once the agent has any balance, collapse to a one-line summary.
  // Funded agents don't need the big "how to top up" card anymore —
  // they need a tight, confident status line: "you're ready."
  if (dismissed || funded) {
    return (
      <CollapsedSummary
        title="Agent funded"
        detail={
          data
            ? `$${(data.balanceUsdc ?? 0).toFixed(2)} USDC · ${network}`
            : "loaded"
        }
        explorerUrl={data?.ataExplorerUrl ?? null}
        tone="success"
      />
    );
  }

  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-[18px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "#EEF6FF" }}
          >
            <Wallet className="w-4 h-4" style={{ color: "#2563EB" }} />
          </div>
          <div>
            <p
              className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "#2563EB" }}
            >
              Step 1 · fund
            </p>
            <h3
              className="text-[15.5px] font-semibold tracking-[-0.015em]"
              style={{ color: "var(--text-primary)" }}
            >
              Top up your vault with test USDC.
            </h3>
            <p
              className="mt-1 text-[12.5px] leading-[1.5]"
              style={{ color: "var(--text-tertiary)" }}
            >
              One click at the Circle faucet — your agent can then start
              making real on-chain payments.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            window.localStorage.setItem(dismissKey, "1");
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="p-1 rounded-[6px] transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-quaternary)" }}
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      <div
        className="mx-6 px-4 py-3 rounded-[12px] flex items-center justify-between gap-3"
        style={{
          background: "var(--surface-2)",
          border: "0.5px solid var(--border-subtle)",
        }}
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--text-quaternary)" }}
          >
            Your vault USDC address
          </p>
          <p
            className="mt-0.5 font-mono text-[12px] truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {data?.usdcAta ?? (error ? `— (${error})` : "…")}
          </p>
        </div>
        <button
          onClick={() => data && copy(data.usdcAta)}
          disabled={!data}
          className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
          title="Copy ATA"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
          ) : (
            <Copy className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
          )}
        </button>
      </div>

      <div className="px-6 pt-4 pb-5 flex items-center gap-2">
        <a
          href={data?.faucetUrl ?? "https://faucet.circle.com/"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[12px] text-[13px] font-semibold transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
          style={{
            background: "#2563EB",
            color: "white",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(37,99,235,0.25)",
          }}
        >
          Open Circle faucet
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
        <a
          href={data?.ataExplorerUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-[12px] text-[12.5px] font-semibold transition-colors hover:bg-[var(--surface-2)]"
          style={{
            color: "var(--text-secondary)",
            border: "0.5px solid var(--border-subtle)",
          }}
        >
          Explorer
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 h-10 px-3 rounded-[12px] text-[12.5px] font-semibold transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Refresh balance
        </button>
      </div>

      <p
        className="px-6 pb-5 text-[11.5px]"
        style={{ color: "var(--text-quaternary)" }}
      >
        At Circle: pick <span className="font-semibold">Solana Devnet</span>,
        paste the address above, request $10.
      </p>
    </motion.section>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  B. TestPaymentPanel                                               */
/* ────────────────────────────────────────────────────────────────── */

interface Scenario {
  key: string;
  label: string;
  description: string;
  merchant: string;
  amountUsd: number;
  memo?: string;
  expectedTone: "success" | "blocked";
}

interface RunResult {
  scenario: string;
  status: "settled" | "blocked" | "failed";
  reason: string | null;
  txSignature: string | null;
  explorerUrl: string | null;
}

function TestPaymentPanel({
  // vaultId is part of the shared shape but TestPaymentPanel doesn't use
  // it directly — the /api/vault/pay endpoint derives the vault from the
  // Bearer agent key. Kept here for API symmetry.
  network,
  agentKey,
  allowedMerchants,
  perTxMaxUsd,
  requireMemo,
  onAfterCall,
}: PlaygroundProps) {
  const [expanded, setExpanded] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [localKey, setLocalKey] = useState<string>("");

  // Scenarios derived from vault config so they actually fit YOUR vault.
  const scenarios: Scenario[] = useMemo(() => {
    const firstAllowed = allowedMerchants[0] ?? "api.openai.com";
    const rogue = "sketchy-merchant.xyz";
    return [
      {
        key: "allowed",
        label: "Allowed micropayment",
        description: `$0.05 → ${firstAllowed}. Should settle on-chain.`,
        merchant: firstAllowed,
        amountUsd: 0.05,
        memo: requireMemo ? "chat completion" : undefined,
        expectedTone: "success",
      },
      {
        key: "rogue",
        label: "Rogue merchant",
        description: `$0.10 → ${rogue}. Blocked before tx ever leaves.`,
        merchant: rogue,
        amountUsd: 0.1,
        memo: requireMemo ? "sus call" : undefined,
        expectedTone: "blocked",
      },
      {
        key: "overlimit",
        label: "Over per-tx limit",
        description: `$${(perTxMaxUsd * 10).toFixed(2)} → ${firstAllowed}. Policy blocks for amount.`,
        merchant: firstAllowed,
        amountUsd: perTxMaxUsd * 10,
        memo: requireMemo ? "ambitious GPT-4 run" : undefined,
        expectedTone: "blocked",
      },
      {
        key: "memo",
        label: "Missing memo",
        description: requireMemo
          ? `$0.02 → ${firstAllowed} with no memo. Blocked: memo required.`
          : `Memo requirement is OFF on this vault — enable it to test.`,
        merchant: firstAllowed,
        amountUsd: 0.02,
        memo: undefined,
        expectedTone: "blocked",
      },
    ];
  }, [allowedMerchants, perTxMaxUsd, requireMemo]);

  const runScenario = async (s: Scenario) => {
    const key = (agentKey ?? localKey).trim();
    if (!key) return;
    setRunning(s.key);
    try {
      const r = await fetch("/api/vault/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          merchant: s.merchant,
          recipientPubkey: DEMO_RECIPIENT,
          amountUsd: s.amountUsd,
          memo: s.memo,
        }),
      });
      const j = (await r.json()) as {
        payment?: {
          status: "settled" | "blocked" | "failed";
          reason: string | null;
          txSignature: string | null;
        };
        explorerUrl?: string | null;
        message?: string;
      };
      const result: RunResult = {
        scenario: s.key,
        status: j.payment?.status ?? (r.ok ? "settled" : "failed"),
        reason: j.payment?.reason ?? j.message ?? null,
        txSignature: j.payment?.txSignature ?? null,
        explorerUrl:
          j.explorerUrl ??
          (j.payment?.txSignature
            ? `https://explorer.solana.com/tx/${j.payment.txSignature}?cluster=${network}`
            : null),
      };
      setResults((prev) => ({ ...prev, [s.key]: result }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [s.key]: {
          scenario: s.key,
          status: "failed",
          reason: e instanceof Error ? e.message : "network error",
          txSignature: null,
          explorerUrl: null,
        },
      }));
    } finally {
      setRunning(null);
      onAfterCall?.();
    }
  };

  const haveKey = !!(agentKey || localKey.trim());

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
      className="rounded-[18px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "#F0FDF4" }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "#059669" }} />
          </div>
          <div>
            <p
              className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "#059669" }}
            >
              Step 2 · try it
            </p>
            <h3
              className="text-[15.5px] font-semibold tracking-[-0.015em]"
              style={{ color: "var(--text-primary)" }}
            >
              Send a test payment.
            </h3>
            <p
              className="mt-1 text-[12.5px] leading-[1.5]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Run a scenario — watch Solana either settle or refuse it in
              real-time.
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded-[6px] transition-colors hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-quaternary)" }}
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {!agentKey && (
              <div className="px-6 pb-3">
                <p
                  className="text-[11.5px] mb-1.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Paste the <code className="code-inline">kv_live_</code> key you
                  saved when you created this vault:
                </p>
                <input
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="kv_live_…"
                  className="w-full h-9 px-3 rounded-[10px] text-[12.5px] font-mono outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "0.5px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            )}

            <ul className="px-6 pb-5 space-y-2">
              {scenarios.map((s) => (
                <ScenarioRow
                  key={s.key}
                  scenario={s}
                  running={running === s.key}
                  disabled={!haveKey || !!running}
                  result={results[s.key]}
                  onRun={() => runScenario(s)}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function ScenarioRow({
  scenario,
  running,
  disabled,
  result,
  onRun,
}: {
  scenario: Scenario;
  running: boolean;
  disabled: boolean;
  result?: RunResult;
  onRun: () => void;
}) {
  const toneClasses =
    result?.status === "settled"
      ? { label: "settled", fg: "#059669", bg: "#ECFDF5" }
      : result?.status === "blocked"
        ? { label: "blocked on-chain", fg: "#DC2626", bg: "#FEF2F2" }
        : result?.status === "failed"
          ? { label: "error", fg: "#D97706", bg: "#FFFBEB" }
          : null;

  return (
    <li
      className="flex items-start gap-3 px-3 py-3 rounded-[12px]"
      style={{ background: "var(--surface-2)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[13px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {scenario.label}
          </span>
          {toneClasses && (
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-[6px]"
              style={{ color: toneClasses.fg, background: toneClasses.bg }}
            >
              {toneClasses.label}
            </span>
          )}
        </div>
        <p
          className="mt-0.5 text-[11.5px] leading-[1.4]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {scenario.description}
        </p>
        {result?.reason && (
          <p
            className="mt-1 text-[11px] font-mono truncate"
            style={{ color: "var(--text-quaternary)" }}
          >
            {result.reason}
          </p>
        )}
        {result?.explorerUrl && (
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: "#2563EB" }}
          >
            Open on Solana Explorer
            <ArrowUpRight className="w-3 h-3" />
          </a>
        )}
      </div>
      <button
        onClick={onRun}
        disabled={disabled}
        className="inline-flex items-center gap-1 h-8 px-3 rounded-[10px] text-[11.5px] font-semibold transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        style={{
          background: "var(--text-primary)",
          color: "var(--background)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {running ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Play className="w-3 h-3" fill="currentColor" />
        )}
        {running ? "Running" : result ? "Run again" : "Run"}
        {!running && !result && <ArrowRight className="w-3 h-3" />}
      </button>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  Shared — collapsed summary                                         */
/* ────────────────────────────────────────────────────────────────── */

function CollapsedSummary({
  title,
  detail,
  explorerUrl,
  tone,
}: {
  title: string;
  detail: string;
  explorerUrl: string | null;
  tone: "success" | "neutral";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      // Tight vertical padding. Previously py-3 left a 2-line card
      // floating in a too-spacious container — looked broken. 10px
      // vertical now matches the rest of the dashboard rhythm.
      className="rounded-[12px] px-4 py-2.5 flex items-center justify-between gap-3"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: tone === "success" ? "var(--success)" : "var(--surface-2)",
          }}
        >
          <Check className="w-3 h-3" color="white" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p
            className="text-[12.5px] font-semibold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
            <span
              className="ml-2 font-normal"
              style={{ color: "var(--text-tertiary)" }}
            >
              {detail}
            </span>
          </p>
        </div>
      </div>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold whitespace-nowrap transition-opacity hover:opacity-70"
          style={{ color: "var(--text-tertiary)" }}
        >
          Explorer
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  );
}
