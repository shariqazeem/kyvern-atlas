"use client";

/**
 * WatchChainPanel — the "Watch the chain refuse" instrument drawer.
 *
 * Five violation scenarios. Each click hits /api/atlas/probe-scenarios
 * (Block B). The Kyvern policy program at PpmZ…MSqc rejects on-chain.
 * Submission uses skipPreflight: true so the cluster ingests the failing
 * tx and we capture a real failed signature with the program's custom
 * error code.
 *
 * One settle scenario at the bottom — same plumbing, allowed merchant.
 *
 * The big idea: a judge clicks any button, sees a real Solana Explorer
 * link to a finalized failed/settled transaction, and can verify it.
 * This is the moat moment.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Loader2,
  Play,
  ShieldCheck,
  X as XIcon,
} from "lucide-react";
import { DevicePanel } from "./device-panel";

const PROGRAM_ID = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";
const PROGRAM_LINK = `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`;

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
}

const SCENARIOS = [
  {
    key: "amount_exceeds_per_tx",
    title: "Try to drain $5",
    desc: "Per-tx cap is $2.",
    badge: "12002",
  },
  {
    key: "merchant_not_allowed",
    title: "Pay an unknown wallet",
    desc: "ranger.com isn't allowlisted.",
    badge: "12003",
  },
  {
    key: "missing_memo",
    title: "Skip the required memo",
    desc: "Atlas requires a memo.",
    badge: "12004",
  },
  {
    key: "vault_paused",
    title: "Pause + try again",
    desc: "Flip the kill switch first.",
    badge: "12000",
  },
  {
    key: "settled_allowed",
    title: "Pay $0.001 to api.openai.com",
    desc: "Allowlisted, with memo. Settles.",
    badge: "settle",
    settle: true,
  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WatchChainPanel({ open, onClose }: Props) {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<ProbeResult | null>(null);

  async function fire(scenario: string) {
    if (running) return;
    setRunning(scenario);
    setResult(null);
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
      setRunning(null);
    }
  }

  return (
    <DevicePanel
      open={open}
      onClose={onClose}
      title="Watch the chain refuse"
      subtitle="On-chain proof"
    >
      <div className="px-5 pb-6 pt-3">
        <p className="text-[12.5px] leading-[1.55] mb-4" style={{ color: "#6B7280" }}>
          Each button below sends a real transaction to Solana devnet. The
          Kyvern policy program at{" "}
          <a
            href={PROGRAM_LINK}
            target="_blank"
            rel="noreferrer"
            className="font-mono hover:underline"
            style={{ color: "#0A0A0A" }}
          >
            PpmZ…MSqc
          </a>
          {" "}refuses (or settles) on-chain. Every result is a finalized
          transaction you can verify on Explorer.
        </p>

        <div className="grid grid-cols-1 gap-2.5">
          {SCENARIOS.map((s) => {
            const isSettle = "settle" in s && s.settle;
            const isBusy = running === s.key;
            return (
              <button
                key={s.key}
                type="button"
                disabled={!!running}
                onClick={() => fire(s.key)}
                className="text-left rounded-[12px] p-3.5 transition active:scale-[0.99] disabled:opacity-60"
                style={{
                  background: "#FFFFFF",
                  border: isSettle
                    ? "1px solid rgba(34,197,94,0.20)"
                    : "1px solid rgba(220,38,38,0.18)",
                  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-[13px] font-semibold tracking-[-0.005em]"
                    style={{ color: "#0A0A0A" }}
                  >
                    {s.title}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="font-mono uppercase tracking-[0.14em] rounded-full px-2 py-0.5"
                      style={{
                        fontSize: 9,
                        color: isSettle ? "#15803D" : "#B91C1C",
                        background: isSettle
                          ? "rgba(34,197,94,0.10)"
                          : "rgba(220,38,38,0.10)",
                        border: isSettle
                          ? "1px solid rgba(34,197,94,0.18)"
                          : "1px solid rgba(220,38,38,0.18)",
                      }}
                    >
                      {s.badge}
                    </span>
                    {isBusy ? (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        style={{ color: "#0A0A0A" }}
                      />
                    ) : (
                      <Play
                        className="w-3.5 h-3.5"
                        strokeWidth={2.2}
                        style={{
                          color: isSettle ? "#15803D" : "#B91C1C",
                        }}
                      />
                    )}
                  </div>
                </div>
                <p className="text-[11.5px]" style={{ color: "#6B7280" }}>
                  {s.desc}
                </p>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              key={result.signature ?? result.error ?? "result"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <ResultCard result={result} />
            </motion.div>
          )}
        </AnimatePresence>

        <a
          href={PROGRAM_LINK}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center justify-center gap-1 font-mono uppercase tracking-[0.14em] hover:underline"
          style={{ fontSize: 9.5, color: "#9CA3AF" }}
        >
          <ShieldCheck className="w-3 h-3" />
          Program · {PROGRAM_ID.slice(0, 6)}…{PROGRAM_ID.slice(-4)}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </DevicePanel>
  );
}

function ResultCard({ result }: { result: ProbeResult }) {
  const isSettled = !!result.ok && result.expectedOutcome === "settled";
  const isBlocked = result.expectedOutcome === "blocked";
  const palette = isSettled
    ? { fg: "#15803D", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.22)" }
    : { fg: "#B91C1C", bg: "rgba(220,38,38,0.06)", border: "rgba(220,38,38,0.22)" };

  if (!result.ok && !result.signature) {
    return (
      <div
        className="rounded-[12px] p-3"
        style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.20)",
          color: "#92400E",
          fontSize: 12,
        }}
      >
        {result.error === "rate_limited"
          ? "Hold up — 3 per minute, 10 per hour. Come back in a sec."
          : result.message ?? result.error ?? "Something went sideways."}
      </div>
    );
  }

  return (
    <div
      className="rounded-[12px] p-3"
      style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {isSettled ? (
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: palette.fg }} />
        ) : (
          <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} style={{ color: palette.fg }} />
        )}
        <span
          className="font-mono uppercase tracking-[0.16em]"
          style={{ color: palette.fg, fontSize: 10 }}
        >
          {isSettled ? "Settled on-chain" : "Blocked on-chain"}
          {result.durationMs ? ` · ${result.durationMs}ms` : ""}
        </span>
      </div>
      <p className="text-[12.5px] mb-2" style={{ color: "#0A0A0A" }}>
        {result.description}
      </p>
      {isBlocked && result.expectedErrorCode && (
        <div
          className="mb-2 inline-flex items-center font-mono rounded-full px-2 py-0.5"
          style={{
            fontSize: 10,
            color: "#B91C1C",
            background: "rgba(220,38,38,0.10)",
            border: "1px solid rgba(220,38,38,0.18)",
          }}
        >
          Custom error {result.expectedErrorCode} — {result.expectedErrorName}
        </div>
      )}
      {result.signature && (
        <a
          href={
            result.explorerUrl ??
            `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`
          }
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-[10px] p-2 group"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <span
            className="font-mono truncate"
            style={{ fontSize: 11.5, color: "#0A0A0A" }}
          >
            {result.signature.slice(0, 14)}…{result.signature.slice(-10)}
          </span>
          <span
            className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] flex-shrink-0 group-hover:underline"
            style={{ fontSize: 9, color: "#0A0A0A" }}
          >
            Explorer
            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
          </span>
        </a>
      )}
    </div>
  );
}
