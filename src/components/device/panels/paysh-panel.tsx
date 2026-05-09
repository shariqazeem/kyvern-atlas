"use client";

/**
 * PayShPanel — "Wrap pay.sh" instrument drawer.
 *
 * Two scenarios. Both are real on the wire — no mocks.
 *   · paysh_over_cap → off-chain refuses BEFORE pay.sh fires; on-chain
 *     submission with skipPreflight returns a real failed Solana tx
 *     with the Kyvern program's custom error 12002. pay.sh is NEVER
 *     called — Kyvern stops it at the policy gate.
 *   · paysh_settled → off-chain allows; we shell out to
 *     `pay --sandbox curl https://debugger.pay.sh/mpp/quote/AAPL`,
 *     capture the real x402 response data, then settle on-chain via
 *     execute_payment for the $0.001 budgeted spend (real Squads CPI,
 *     real USDC transfer).
 *
 * The architectural moment per SPEC §5B.3: Kyvern decides BEFORE pay.sh's
 * local-wallet prompt fires. Pay.sh is the rails; Kyvern is the policy
 * layer above the rails.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Loader2,
  Play,
  Sparkles,
  X as XIcon,
} from "lucide-react";
import { DevicePanel } from "./device-panel";

interface PayShPayload {
  url: string;
  output: string;
  parsed: unknown | null;
  durationMs: number;
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
  paySh?: PayShPayload | null;
  chainDurationMs?: number;
  error?: string;
  message?: string;
}

const SCENARIOS = [
  {
    key: "paysh_over_cap",
    title: "Buy Perplexity via pay.sh — $5",
    desc: "Over the per-tx cap. Kyvern refuses BEFORE pay.sh is called.",
    badge: "12002",
    settle: false,
  },
  {
    key: "paysh_settled",
    title: "Buy a $0.001 quote via pay.sh",
    desc: "Within policy. pay.sh runs the real x402 call. Kyvern settles on-chain.",
    badge: "live",
    settle: true,
  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PayShPanel({ open, onClose }: Props) {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<ProbeResult | null>(null);

  async function fire(scenario: string) {
    if (running) return;
    setRunning(scenario);
    setResult(null);
    try {
      const r = await fetch("/api/atlas/probe-paysh", {
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
      title="Wrap pay.sh"
      subtitle="Solana × x402 · live shell-out"
    >
      <div className="px-5 pb-6 pt-3">
        <p className="text-[12.5px] leading-[1.55] mb-4" style={{ color: "#6B7280" }}>
          Pay.sh — the Solana Foundation&apos;s payment layer for HTTP agents
          — wraps any 402-paywalled call. Their docs say{" "}
          <em>&ldquo;Real payments still require local user
          authorization.&rdquo;</em> Kyvern closes that gap: the chain takes
          the place of the wallet approval prompt.
        </p>

        <div className="grid grid-cols-1 gap-2.5">
          {SCENARIOS.map((s) => {
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
                  border: s.settle
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
                        color: s.settle ? "#15803D" : "#B91C1C",
                        background: s.settle
                          ? "rgba(34,197,94,0.10)"
                          : "rgba(220,38,38,0.10)",
                        border: s.settle
                          ? "1px solid rgba(34,197,94,0.18)"
                          : "1px solid rgba(220,38,38,0.18)",
                      }}
                    >
                      {s.badge}
                    </span>
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#0A0A0A" }} />
                    ) : (
                      <Play
                        className="w-3.5 h-3.5"
                        strokeWidth={2.2}
                        style={{ color: s.settle ? "#15803D" : "#B91C1C" }}
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

        <div
          className="mt-4 rounded-[10px] p-2.5 text-[10.5px]"
          style={{
            background: "rgba(15,23,42,0.03)",
            border: "1px solid rgba(15,23,42,0.06)",
            color: "#6B7280",
          }}
        >
          <Sparkles className="w-3 h-3 inline mr-1" strokeWidth={2} />
          Kyvern is <em>compatible with pay.sh and any HTTP-402 payment rail</em>.
          Not partnered with pay.sh. The composability is the integration.
        </div>
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
          {result.chainDurationMs ? ` · ${result.chainDurationMs}ms` : ""}
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

      {/* pay.sh response — only for settled scenarios that invoked pay.sh */}
      {result.paySh && (
        <div
          className="rounded-[10px] mb-2 overflow-hidden"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(15,23,42,0.20)",
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}
            >
              pay.sh response · {result.paySh.durationMs}ms
            </span>
          </div>
          <pre
            className="px-3 py-2 font-mono whitespace-pre-wrap"
            style={{
              color: "rgba(255,255,255,0.92)",
              fontSize: 10.5,
              lineHeight: 1.5,
              maxHeight: 90,
              overflow: "auto",
            }}
          >
            {result.paySh.parsed
              ? JSON.stringify(result.paySh.parsed, null, 2)
              : result.paySh.output}
          </pre>
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
          style={{ background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)" }}
        >
          <span className="font-mono truncate" style={{ fontSize: 11.5, color: "#0A0A0A" }}>
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
