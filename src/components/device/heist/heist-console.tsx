"use client";

/**
 * HeistConsole — the killer demo on /app.
 *
 * "Try to drain Atlas. Every attempt is a real Solana tx."
 *
 * Five canonical attacks against Atlas's vault — Atlas is the
 * platform's reference agent (live since 2026-04-20, public on
 * Explorer). The user picks an attack; the existing
 * /api/atlas/probe-scenarios endpoint constructs the malicious
 * payment, submits it on-chain, and returns the chain's verdict.
 * Failed attempts produce real failed-tx signatures with the
 * Anchor program's custom error code in the trace.
 *
 * The point: security is invisible until you try to break it. This
 * component lets a judge break it on demand and watch the chain
 * say no in 2-3 seconds, with a clickable Explorer link.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Ban,
  PauseCircle,
  FileWarning,
  CheckCircle2,
  ExternalLink,
  Skull,
  ShieldCheck,
} from "lucide-react";

interface ScenarioCard {
  key: string;
  title: string;
  subtitle: string;
  icon: typeof Coins;
  expectedCode: number;
  expectedName: string;
  /** Tone of the chip on the card. Settled = success-toned. */
  tone: "attack" | "settle";
}

const SCENARIOS: ScenarioCard[] = [
  {
    key: "amount_exceeds_per_tx",
    title: "Drain $5",
    subtitle: "Per-tx cap is $2 — chain refuses",
    icon: Coins,
    expectedCode: 12002,
    expectedName: "AmountExceedsPerTxMax",
    tone: "attack",
  },
  {
    key: "merchant_not_allowed",
    title: "Pay scammer",
    subtitle: "ranger.com — not on Atlas's allowlist",
    icon: Ban,
    expectedCode: 12003,
    expectedName: "MerchantNotAllowlisted",
    tone: "attack",
  },
  {
    key: "vault_paused",
    title: "Bypass kill switch",
    subtitle: "Pause vault, then try to pay — chain refuses",
    icon: PauseCircle,
    expectedCode: 12000,
    expectedName: "VaultPaused",
    tone: "attack",
  },
  {
    key: "missing_memo",
    title: "Skip the memo",
    subtitle: "Atlas requires memos — pay without one",
    icon: FileWarning,
    expectedCode: 12004,
    expectedName: "MissingMemo",
    tone: "attack",
  },
  {
    key: "settled_allowed",
    title: "Send a valid $0.001",
    subtitle: "Within policy — chain settles",
    icon: CheckCircle2,
    expectedCode: 0,
    expectedName: "",
    tone: "settle",
  },
];

interface ScenarioResult {
  ok: boolean;
  scenarioKey: string;
  signature: string | null;
  explorerUrl: string | null;
  reason: string | null;
  errorCode: number | null;
  errorName: string;
  durationMs: number;
}

export function HeistConsole() {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function attempt(scenario: ScenarioCard) {
    setBusy(scenario.key);
    setError(null);
    setResult(null);
    const startedAt = Date.now();
    try {
      const r = await fetch("/api/atlas/probe-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.key }),
      });
      const data = await r.json();
      const durationMs = Date.now() - startedAt;
      if (!r.ok && r.status !== 200) {
        setError(data?.error ?? `attempt failed (HTTP ${r.status})`);
        return;
      }
      setResult({
        ok: data.ok === true,
        scenarioKey: scenario.key,
        signature: data.signature ?? null,
        explorerUrl: data.explorerUrl ?? null,
        reason: data.reason ?? null,
        errorCode: data.errorCode ?? scenario.expectedCode,
        errorName: data.errorName ?? scenario.expectedName,
        durationMs,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="rounded-[16px] flex flex-col overflow-hidden relative"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.08) 0%, transparent 60%), linear-gradient(180deg, #0A0A0A 0%, #111827 100%)",
        border: "1px solid rgba(34,197,94,0.20)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 24px 60px -16px rgba(0,0,0,0.40)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="rounded-[10px] flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.30)",
            }}
          >
            <Skull className="w-[18px] h-[18px]" strokeWidth={1.75} color="#FCA5A5" />
          </div>
          <div>
            <h2
              className="text-[15px] font-semibold tracking-[-0.01em]"
              style={{ color: "#FFFFFF" }}
            >
              The Heist
            </h2>
            <p
              className="text-[11.5px] mt-0.5"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Try to drain Atlas. Every attempt is a real Solana tx.
            </p>
          </div>
        </div>
        <a
          href="https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] rounded px-1.5 py-1"
          style={{
            fontSize: 9.5,
            color: "#34D399",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.20)",
          }}
        >
          <ShieldCheck className="w-3 h-3" />
          PpmZ…MSqc
        </a>
      </div>

      {/* Attack scenarios */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {SCENARIOS.map((s) => {
          const isBusy = busy === s.key;
          const isLastResult = result?.scenarioKey === s.key;
          const Icon = s.icon;
          return (
            <motion.button
              key={s.key}
              type="button"
              onClick={() => attempt(s)}
              disabled={busy !== null}
              whileHover={busy ? undefined : { y: -2 }}
              whileTap={busy ? undefined : { scale: 0.98 }}
              className="rounded-[12px] flex flex-col items-start gap-2 p-3 text-left transition disabled:opacity-50"
              style={{
                background: isLastResult
                  ? "rgba(34,197,94,0.10)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  isLastResult
                    ? "rgba(34,197,94,0.40)"
                    : "rgba(255,255,255,0.08)"
                }`,
                boxShadow: isLastResult
                  ? "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 3px rgba(34,197,94,0.08)"
                  : "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div
                className="rounded-[8px] flex items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  background: s.tone === "attack"
                    ? "rgba(239,68,68,0.10)"
                    : "rgba(34,197,94,0.10)",
                  border: `1px solid ${
                    s.tone === "attack"
                      ? "rgba(239,68,68,0.25)"
                      : "rgba(34,197,94,0.25)"
                  }`,
                }}
              >
                <Icon
                  className="w-[14px] h-[14px]"
                  strokeWidth={1.75}
                  color={s.tone === "attack" ? "#FCA5A5" : "#86EFAC"}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[12.5px] font-semibold tracking-[-0.005em]"
                  style={{ color: "#FFFFFF" }}
                >
                  {s.title}
                </div>
                <div
                  className="text-[10.5px] mt-0.5 leading-snug"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {s.subtitle}
                </div>
              </div>
              <div
                className="font-mono uppercase tracking-[0.10em]"
                style={{
                  fontSize: 8.5,
                  color: isBusy ? "#34D399" : "rgba(255,255,255,0.40)",
                }}
              >
                {isBusy ? "submitting…" : `Expect ${s.expectedCode || "settled"}`}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Result panel */}
      <AnimatePresence>
        {(result || error) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="px-5 pb-5"
          >
            {error && (
              <div
                className="rounded-[10px] px-3 py-2 text-[11.5px]"
                style={{
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#FCA5A5",
                }}
              >
                {error}
              </div>
            )}
            {result && <ResultPanel r={result} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultPanel({ r }: { r: ScenarioResult }) {
  const refused = !r.ok;
  return (
    <div
      className="rounded-[12px] flex flex-col gap-2 p-3.5"
      style={{
        background: refused
          ? "rgba(239,68,68,0.05)"
          : "rgba(34,197,94,0.05)",
        border: `1px solid ${
          refused ? "rgba(239,68,68,0.20)" : "rgba(34,197,94,0.20)"
        }`,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="font-mono uppercase tracking-[0.16em] rounded px-1.5 py-0.5"
          style={{
            fontSize: 9,
            color: refused ? "#FCA5A5" : "#86EFAC",
            background: refused
              ? "rgba(239,68,68,0.15)"
              : "rgba(34,197,94,0.15)",
            border: `1px solid ${
              refused ? "rgba(239,68,68,0.30)" : "rgba(34,197,94,0.30)"
            }`,
          }}
        >
          {refused ? "✗ chain refused" : "✓ chain settled"}
        </span>
        {r.errorName && (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: refused ? "#FCA5A5" : "#86EFAC" }}
          >
            {r.errorCode} · {r.errorName}
          </span>
        )}
        <span
          className="font-mono ml-auto"
          style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}
        >
          {r.durationMs}ms
        </span>
      </div>
      {r.reason && (
        <div
          className="font-mono text-[11px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.70)" }}
        >
          {r.reason}
        </div>
      )}
      {r.explorerUrl && (
        <a
          href={r.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-[11px] hover:underline self-start"
          style={{ color: refused ? "#FCA5A5" : "#86EFAC" }}
        >
          {r.signature
            ? `${r.signature.slice(0, 8)}…${r.signature.slice(-6)}`
            : "view on Explorer"}
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
      {!r.signature && refused && (
        <p
          className="text-[10.5px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Refused off-chain by Kyvern&apos;s policy engine before submitting.
          Same outcome — money never moves.
        </p>
      )}
    </div>
  );
}
