"use client";

/**
 * PolicyPlayground — the interactive replacement for the static SDK
 * code that used to live in Tab 3.
 *
 * The judge sees a real form: merchant + amount + memo + a button.
 * Click → real on-chain payment attempt → real decision rendered.
 * No code, no terminal, no docs. The chain is the playground.
 *
 * Above the form: a quiet readout of the device's current rules so
 * the judge sees what they're testing against. ("$5 daily · $0.50
 * per-tx · open merchants · memo required")
 *
 * Three pre-set scenarios as one-click chips so the judge doesn't
 * have to think:
 *   · "$0.05 to api.openai.com"     (within rules — should settle)
 *   · "$0.40 to api.helius.xyz"     (within rules — should settle)
 *   · "$5.00 to ranger.com"         (over per-tx — should block)
 *
 * Real chain enforcement, both outcomes visible.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Check, Loader2, Sparkles, X } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface PolicySummary {
  dailyLimitUsd: number;
  dailySpentUsd: number;
  callsToday: number;
  blockedToday: number;
  lastSettledTxSignature: string | null;
}

interface Props {
  deviceId: string | null;
  network: "devnet" | "mainnet";
  policySummary: PolicySummary | null;
  perTxMaxUsd?: number;
}

interface PlaygroundResult {
  ok: boolean;
  signature: string | null;
  reason: string | null;
  decisionMs: number;
  inputs: { merchant: string; amountUsd: number; memo: string };
}

const SCENARIOS: Array<{
  label: string;
  merchant: string;
  amountUsd: number;
  memo: string;
  hint: "approve" | "block";
}> = [
  {
    label: "Pay.sh · Gemini",
    merchant: "api.pay.sh/gemini",
    amountUsd: 0.05,
    memo: "gemini-pro: weather",
    hint: "approve",
  },
  {
    label: "$0.05 to OpenAI",
    merchant: "api.openai.com",
    amountUsd: 0.05,
    memo: "gpt-4 inference",
    hint: "approve",
  },
  {
    label: "$5 → over cap",
    merchant: "ranger.com",
    amountUsd: 5,
    memo: "test over cap",
    hint: "block",
  },
];

export function PolicyPlayground({
  deviceId,
  network,
  policySummary,
  perTxMaxUsd,
}: Props) {
  const [merchant, setMerchant] = useState("api.openai.com");
  const [amount, setAmount] = useState(0.05);
  const [memo, setMemo] = useState("gpt-4 inference");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlaygroundResult | null>(null);

  async function run() {
    if (!deviceId || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}/playground-pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant, amountUsd: amount, memo }),
      });
      const data = await res.json();
      setResult(data as PlaygroundResult);
    } catch (e) {
      setResult({
        ok: false,
        signature: null,
        reason: e instanceof Error ? e.message : "request failed",
        decisionMs: 0,
        inputs: { merchant, amountUsd: amount, memo },
      });
    } finally {
      setRunning(false);
    }
  }

  function pickScenario(s: (typeof SCENARIOS)[number]) {
    setMerchant(s.merchant);
    setAmount(s.amountUsd);
    setMemo(s.memo);
    setResult(null);
  }

  const dailyLimit = policySummary?.dailyLimitUsd ?? 5;
  const perTx = perTxMaxUsd ?? 0.5;

  return (
    <div
      className="rounded-[16px] p-5"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
      }}
    >
      {/* HEADER */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div
            className="font-mono uppercase tracking-[0.16em] mb-1"
            style={{ color: "#9CA3AF", fontSize: 10 }}
          >
            Policy playground
          </div>
          <h3
            className="text-[16px] font-semibold tracking-[-0.005em]"
            style={{ color: "#0A0A0A" }}
          >
            Test a payment.
          </h3>
        </div>
        <Sparkles
          className="w-4 h-4"
          strokeWidth={1.6}
          style={{ color: "#15803D" }}
        />
      </div>

      {/* SCENARIO CHIPS */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SCENARIOS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => pickScenario(s)}
            className="inline-flex items-center gap-1 font-mono rounded-full px-2.5 py-1 transition active:scale-[0.97]"
            style={{
              fontSize: 10.5,
              color:
                merchant === s.merchant && amount === s.amountUsd
                  ? "#0A0A0A"
                  : "rgba(15,23,42,0.55)",
              background:
                merchant === s.merchant && amount === s.amountUsd
                  ? "rgba(15,23,42,0.04)"
                  : "transparent",
              border:
                merchant === s.merchant && amount === s.amountUsd
                  ? "1px solid rgba(15,23,42,0.12)"
                  : "1px solid rgba(15,23,42,0.06)",
            }}
          >
            <span
              className="rounded-full inline-block"
              style={{
                width: 5,
                height: 5,
                background:
                  s.hint === "approve" ? "#22C55E" : "#F59E0B",
              }}
            />
            {s.label}
          </button>
        ))}
      </div>

      {/* INPUTS */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-2">
        <Field label="Merchant">
          <input
            type="text"
            value={merchant}
            onChange={(e) => {
              setMerchant(e.target.value);
              setResult(null);
            }}
            placeholder="api.openai.com"
            className="w-full px-3 py-2 rounded-[8px] outline-none font-mono"
            style={{
              fontSize: 12.5,
              color: "#0A0A0A",
              background: "#FAFAFA",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          />
        </Field>
        <Field label="Amount" hint={`max ${fmt(perTx)}`}>
          <div className="relative">
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono"
              style={{ color: "rgba(15,23,42,0.45)", fontSize: 12.5 }}
            >
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                setResult(null);
              }}
              className="w-[110px] pl-5 pr-3 py-2 rounded-[8px] outline-none font-mono tabular-nums"
              style={{
                fontSize: 12.5,
                color: "#0A0A0A",
                background: "#FAFAFA",
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            />
          </div>
        </Field>
      </div>
      <Field label="Memo">
        <input
          type="text"
          value={memo}
          onChange={(e) => {
            setMemo(e.target.value);
            setResult(null);
          }}
          placeholder="optional"
          className="w-full px-3 py-2 rounded-[8px] outline-none font-mono"
          style={{
            fontSize: 12.5,
            color: "#0A0A0A",
            background: "#FAFAFA",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        />
      </Field>

      {/* RULES READOUT */}
      <div
        className="mt-4 mb-4 rounded-[10px] px-3 py-2 flex items-center gap-1.5 flex-wrap"
        style={{
          background: "rgba(15,23,42,0.025)",
          border: "1px solid rgba(15,23,42,0.05)",
        }}
      >
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ color: "#9CA3AF", fontSize: 9.5 }}
        >
          Rules
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 10.5, color: "rgba(15,23,42,0.65)" }}
        >
          {fmt(dailyLimit)} daily
        </span>
        <span style={{ color: "rgba(15,23,42,0.20)" }}>·</span>
        <span
          className="font-mono"
          style={{ fontSize: 10.5, color: "rgba(15,23,42,0.65)" }}
        >
          {fmt(perTx)} per-tx
        </span>
        <span style={{ color: "rgba(15,23,42,0.20)" }}>·</span>
        <span
          className="font-mono"
          style={{ fontSize: 10.5, color: "rgba(15,23,42,0.65)" }}
        >
          open merchants
        </span>
        <span style={{ color: "rgba(15,23,42,0.20)" }}>·</span>
        <span
          className="font-mono"
          style={{ fontSize: 10.5, color: "rgba(15,23,42,0.65)" }}
        >
          memo required
        </span>
      </div>

      {/* RUN */}
      <motion.button
        type="button"
        onClick={run}
        disabled={!deviceId || running}
        whileTap={{ scale: 0.98 }}
        className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-[10px] text-[13px] font-semibold tracking-[-0.005em] transition disabled:opacity-60"
        style={{
          background: "#0A0A0A",
          color: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.8)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.10)",
        }}
      >
        {running ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
            Running through chain…
          </>
        ) : (
          <>
            Run through policy
            <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
          </>
        )}
      </motion.button>

      {/* RESULT */}
      <AnimatePresence>
        {result && (
          <motion.div
            key={result.signature ?? result.reason ?? "result"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mt-3"
          >
            <ResultCard result={result} network={network} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({
  result,
  network,
}: {
  result: PlaygroundResult;
  network: "devnet" | "mainnet";
}) {
  const tone = result.ok ? "approved" : "blocked";
  const palette =
    tone === "approved"
      ? {
          fg: "#15803D",
          bg: "rgba(34,197,94,0.06)",
          border: "rgba(34,197,94,0.22)",
          accent: "rgba(21,128,61,0.7)",
        }
      : {
          fg: "#B45309",
          bg: "rgba(245,158,11,0.06)",
          border: "rgba(245,158,11,0.30)",
          accent: "rgba(180,83,9,0.7)",
        };

  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em]"
          style={{ color: palette.fg, fontSize: 10 }}
        >
          {tone === "approved" ? (
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          ) : (
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          )}
          {tone === "approved" ? "Approved · settled" : "Blocked"}
        </span>
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 10.5, color: palette.accent }}
        >
          {result.decisionMs}ms
        </span>
      </div>
      <div
        className="text-[12.5px] leading-[1.5] mb-2"
        style={{ color: tone === "approved" ? "#0A0A0A" : "#92400E" }}
      >
        {tone === "approved" ? (
          <>
            Tried <strong>{fmt(result.inputs.amountUsd)}</strong> to{" "}
            <strong>{result.inputs.merchant}</strong> — chain settled.
          </>
        ) : (
          <>
            Tried <strong>{fmt(result.inputs.amountUsd)}</strong> to{" "}
            <strong>{result.inputs.merchant}</strong> —{" "}
            {result.reason ?? "chain rejected"}.
          </>
        )}
      </div>
      {result.signature ? (
        <a
          href={`https://explorer.solana.com/tx/${result.signature}?cluster=${network}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono"
          style={{ color: palette.fg, fontSize: 10.5 }}
        >
          {result.signature.slice(0, 8)}…{result.signature.slice(-6)}
          <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
        </a>
      ) : (
        <span
          className="font-mono"
          style={{ color: palette.accent, fontSize: 10.5 }}
        >
          caught locally · same rules run on-chain at PpmZ…MSqc
        </span>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-baseline justify-between">
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ color: "#9CA3AF", fontSize: 9.5 }}
        >
          {label}
        </span>
        {hint && (
          <span
            className="font-mono"
            style={{ color: "rgba(15,23,42,0.45)", fontSize: 9.5 }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(2)}`;
}
