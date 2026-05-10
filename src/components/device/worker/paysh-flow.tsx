"use client";

/**
 * PayShFlow — minimalist circuit diagram on /app.
 *
 * Three nodes connected by a thin gray rail:
 *   [Your Code] ──── [Kyvern Vault] ──── [Pay.sh API]
 *
 * Two scenarios:
 *   - Over-cap: a red pulse leaves Your Code, hits Kyvern, stops there.
 *   - Settled: a green pulse flows all the way through Kyvern to the API.
 *
 * No dark backgrounds. No demo theatre. The whole panel matches the
 * Apple-light register of the rest of the worker card.
 */

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Code2,
  ExternalLink,
  Globe,
  Shield,
  ShieldX,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Phase = "idle" | "running" | "blocked" | "settled" | "error";

interface PayShResult {
  ok: boolean;
  scenario: string;
  signature: string | null;
  explorerUrl: string | null;
  expectedOutcome: "blocked" | "settled";
  expectedErrorCode: number | null;
  expectedErrorName: string | null;
  paySh: {
    url: string;
    output: string;
    parsed: unknown | null;
    durationMs: number;
  } | null;
  offChain: { decision: string; code: number | null; reason: string | null };
  chainDurationMs: number;
}

interface Props {
  vaultId: string | null;
  ownerWallet: string | null;
}

export function PayShFlow({ vaultId, ownerWallet }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<PayShResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<"over_cap" | "settled" | null>(null);

  const fire = useCallback(
    async (scenario: "paysh_over_cap" | "paysh_settled") => {
      if (!vaultId || !ownerWallet || running) return;
      setRunning(scenario === "paysh_over_cap" ? "over_cap" : "settled");
      setError(null);
      setResult(null);
      setPhase("running");

      try {
        const r = await fetch("/api/atlas/probe-paysh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-owner-wallet": ownerWallet,
          },
          body: JSON.stringify({ scenario, vaultId }),
        });
        const d = (await r.json()) as PayShResult & {
          error?: string;
          message?: string;
        };
        if (!r.ok || d?.error) {
          setError(d?.message ?? d?.error ?? "request failed");
          setPhase("error");
          setRunning(null);
          return;
        }
        const settled = d.expectedOutcome === "settled";
        // Let the pulse finish before flipping phase to its end state.
        // Pulse takes ~1.4s for settled (full traverse) or ~700ms for
        // blocked (stops at Kyvern).
        const totalDuration = settled ? 1400 : 700;
        await new Promise((res) => setTimeout(res, totalDuration));
        setResult(d);
        setPhase(settled ? "settled" : "blocked");
        setRunning(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "request failed");
        setPhase("error");
        setRunning(null);
      }
    },
    [vaultId, ownerWallet, running],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setError(null);
  }, []);

  // For the pulse rendering: when running, we know which scenario. When
  // settled/blocked we still want the final node states reflected.
  const pulseTone: "green" | "red" | null =
    phase === "running"
      ? running === "over_cap"
        ? "red"
        : "green"
      : phase === "blocked"
        ? "red"
        : phase === "settled"
          ? "green"
          : null;
  const pulseStops: "kyvern" | "api" | null =
    phase === "running"
      ? running === "over_cap"
        ? "kyvern"
        : "api"
      : phase === "blocked"
        ? "kyvern"
        : phase === "settled"
          ? "api"
          : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex flex-col gap-3"
    >
      {/* Header */}
      <div>
        <div
          className="font-mono uppercase tracking-[0.18em] mb-1"
          style={{ color: "rgba(15,23,42,0.45)", fontSize: 10 }}
        >
          Pay.sh interception
        </div>
        <h3
          className="text-[14.5px] font-semibold tracking-[-0.01em]"
          style={{ color: "#0A0A0A" }}
        >
          Every paid API call routes through your policy program first.
        </h3>
      </div>

      {/* Circuit diagram */}
      <div className="py-3">
        <div
          className="relative"
          style={{ height: 92 }}
        >
          {/* Background gray rail */}
          <div
            aria-hidden
            className="absolute"
            style={{
              left: "16.5%",
              right: "16.5%",
              top: 22,
              height: 1,
              background: "rgba(15,23,42,0.10)",
            }}
          />

          {/* Animated colored rail (fills as the pulse traverses) */}
          {pulseTone && pulseStops && (
            <motion.div
              key={`rail-${phase}-${pulseTone}-${pulseStops}`}
              aria-hidden
              className="absolute"
              style={{
                left: "16.5%",
                top: 22,
                height: 1,
                background:
                  pulseTone === "green" ? "#22C55E" : "#F87171",
              }}
              initial={{ width: "0%" }}
              animate={{
                width: pulseStops === "kyvern" ? "33%" : "67%",
              }}
              transition={{
                duration: pulseStops === "kyvern" ? 0.6 : 1.3,
                ease: EASE,
              }}
            />
          )}

          {/* Traveling pulse dot */}
          {pulseTone && pulseStops && (
            <motion.div
              key={`pulse-${phase}-${pulseTone}-${pulseStops}`}
              aria-hidden
              className="absolute rounded-full"
              style={{
                top: 17,
                width: 11,
                height: 11,
                background:
                  pulseTone === "green" ? "#22C55E" : "#F87171",
                boxShadow:
                  pulseTone === "green"
                    ? "0 0 14px rgba(34,197,94,0.65), 0 0 0 4px rgba(34,197,94,0.18)"
                    : "0 0 14px rgba(248,113,113,0.65), 0 0 0 4px rgba(248,113,113,0.18)",
              }}
              initial={{ left: "16.5%", opacity: 0 }}
              animate={{
                left: pulseStops === "kyvern" ? "50%" : "83.5%",
                opacity: [0, 1, 1, pulseStops === "kyvern" ? 0 : 0],
              }}
              transition={{
                duration: pulseStops === "kyvern" ? 0.7 : 1.4,
                ease: EASE,
                opacity: {
                  times: [0, 0.15, 0.85, 1],
                  duration: pulseStops === "kyvern" ? 0.7 : 1.4,
                  ease: "easeInOut",
                },
              }}
            />
          )}

          {/* Three nodes — positioned at fixed percentages */}
          <Node
            leftPct={16.5}
            label="Your Code"
            sub="agent / sdk"
            icon={<Code2 className="w-3.5 h-3.5" strokeWidth={2.2} />}
            tone="active"
          />
          <Node
            leftPct={50}
            label="Kyvern Vault"
            sub="policy gate"
            icon={
              phase === "blocked" ? (
                <ShieldX className="w-3.5 h-3.5" strokeWidth={2.2} />
              ) : (
                <Shield className="w-3.5 h-3.5" strokeWidth={2.2} />
              )
            }
            tone={
              phase === "blocked"
                ? "blocked"
                : phase === "settled"
                  ? "passed"
                  : phase === "running"
                    ? "evaluating"
                    : "neutral"
            }
          />
          <Node
            leftPct={83.5}
            label="Pay.sh API"
            sub="x402 rail"
            icon={<Globe className="w-3.5 h-3.5" strokeWidth={2.2} />}
            tone={
              phase === "settled"
                ? "passed"
                : phase === "blocked"
                  ? "muted"
                  : "neutral"
            }
          />
        </div>

        {/* Status hint */}
        <div className="flex items-center justify-center mt-2">
          <FlowHint phase={phase} running={running} />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => fire("paysh_over_cap")}
          disabled={!vaultId || !ownerWallet || running !== null}
          className="group inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-[10px] text-[12.5px] font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "transparent",
            color: "#0A0A0A",
            border: "1px solid rgba(15,23,42,0.14)",
          }}
        >
          {running === "over_cap" ? <Spinner /> : null}
          Try $5 over-cap
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          onClick={() => fire("paysh_settled")}
          disabled={!vaultId || !ownerWallet || running !== null}
          className="group inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-[10px] text-[12.5px] font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "transparent",
            color: "#0A0A0A",
            border: "1px solid rgba(15,23,42,0.14)",
          }}
        >
          {running === "settled" ? <Spinner /> : null}
          Try $0.001 settled call
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </button>
        {(phase === "settled" || phase === "blocked" || phase === "error") && (
          <button
            type="button"
            onClick={reset}
            className="text-[11.5px] font-mono uppercase tracking-[0.14em] px-2.5 py-1 rounded-md transition-all hover:bg-[rgba(15,23,42,0.04)]"
            style={{ color: "rgba(15,23,42,0.45)" }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Result */}
      <AnimatePresence>
        {(phase === "blocked" || phase === "settled") && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div className="py-2 flex flex-col gap-2.5">
              {phase === "blocked" ? (
                <div className="flex flex-col gap-1">
                  <p
                    className="text-[12.5px] leading-[1.5]"
                    style={{ color: "rgba(15,23,42,0.85)" }}
                  >
                    <span style={{ color: "#15803D", fontWeight: 600 }}>
                      KyvernPolicy
                    </span>
                    ::
                    <span style={{ color: "#B45309", fontWeight: 600 }}>
                      {result.expectedErrorName ?? "AmountExceedsPerTxMax"}
                    </span>{" "}
                    refused the spend before the x402 facilitator was
                    invoked.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <p
                    className="text-[12.5px] leading-[1.5]"
                    style={{ color: "rgba(15,23,42,0.85)" }}
                  >
                    Kyvern allowed the spend, settled the USDC on-chain,
                    and Pay.sh resolved the 402 challenge against the
                    external API.
                  </p>
                  {result.paySh?.parsed != null && (
                    <pre
                      className="mt-1.5 font-mono p-2.5 rounded-md overflow-x-auto"
                      style={{
                        fontSize: 10.5,
                        lineHeight: 1.55,
                        background: "#F5F5F7",
                        border: "1px solid rgba(15,23,42,0.05)",
                        color: "rgba(15,23,42,0.75)",
                        maxHeight: 140,
                        margin: 0,
                      }}
                    >
                      {previewJson(result.paySh.parsed)}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {result.expectedErrorCode && (
                  <span
                    className="font-mono uppercase tracking-[0.10em]"
                    style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
                  >
                    code {result.expectedErrorCode}
                  </span>
                )}
                <span
                  className="font-mono"
                  style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
                >
                  chain {result.chainDurationMs}ms
                </span>
                {result.paySh?.durationMs != null && (
                  <span
                    className="font-mono"
                    style={{ fontSize: 10, color: "rgba(15,23,42,0.45)" }}
                  >
                    pay.sh {result.paySh.durationMs}ms
                  </span>
                )}
                {result.explorerUrl && (
                  <a
                    href={result.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1.5 font-mono hover:underline"
                    style={{ fontSize: 11, color: "#0A0A0A" }}
                  >
                    <span className="truncate max-w-[200px]">
                      Sig {(result.signature ?? "").slice(0, 6)}…
                      {(result.signature ?? "").slice(-6)}
                    </span>
                    <ExternalLink className="w-3 h-3" strokeWidth={2} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="py-2 text-[12px]"
            style={{ color: "#B45309" }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

type NodeTone = "neutral" | "active" | "evaluating" | "passed" | "blocked" | "muted";

function Node({
  leftPct,
  label,
  sub,
  icon,
  tone,
}: {
  leftPct: number;
  label: string;
  sub: string;
  icon: React.ReactNode;
  tone: NodeTone;
}) {
  const palette = nodePalette(tone);

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${leftPct}%`,
        top: 0,
        transform: "translateX(-50%)",
        width: 92,
      }}
    >
      <motion.div
        className="rounded-[10px] flex items-center justify-center"
        style={{
          width: 44,
          height: 44,
          background: palette.bg,
          color: palette.icon,
          boxShadow: palette.shadow,
        }}
        animate={
          tone === "evaluating"
            ? {
                boxShadow: [
                  "0 0 0 1px rgba(15,23,42,0.10), 0 0 0 0px rgba(34,197,94,0)",
                  "0 0 0 1px rgba(34,197,94,0.40), 0 0 0 6px rgba(34,197,94,0.10)",
                  "0 0 0 1px rgba(15,23,42,0.10), 0 0 0 0px rgba(34,197,94,0)",
                ],
              }
            : {}
        }
        transition={{
          duration: 1.0,
          repeat: tone === "evaluating" ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        {icon}
      </motion.div>
      <span
        className="mt-1.5 text-[11px] font-medium tracking-[-0.005em]"
        style={{ color: palette.label }}
      >
        {label}
      </span>
      <span
        className="font-mono uppercase tracking-[0.10em] mt-0.5"
        style={{ fontSize: 9, color: palette.sub }}
      >
        {sub}
      </span>
    </div>
  );
}

function nodePalette(tone: NodeTone): {
  bg: string;
  icon: string;
  shadow: string;
  label: string;
  sub: string;
} {
  switch (tone) {
    case "active":
      return {
        bg: "#FFFFFF",
        icon: "#0A0A0A",
        shadow:
          "0 0 0 1px rgba(15,23,42,0.10), 0 4px 12px -4px rgba(15,23,42,0.10)",
        label: "#0A0A0A",
        sub: "rgba(15,23,42,0.45)",
      };
    case "evaluating":
      return {
        bg: "#FFFFFF",
        icon: "#0A0A0A",
        shadow:
          "0 0 0 1px rgba(15,23,42,0.10), 0 4px 12px -4px rgba(15,23,42,0.08)",
        label: "#0A0A0A",
        sub: "rgba(15,23,42,0.45)",
      };
    case "passed":
      return {
        bg: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
        icon: "#FFFFFF",
        shadow:
          "0 0 0 1px rgba(34,197,94,0.30), 0 6px 16px -4px rgba(34,197,94,0.35)",
        label: "#0A0A0A",
        sub: "#15803D",
      };
    case "blocked":
      return {
        bg: "linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)",
        icon: "#FFFFFF",
        shadow:
          "0 0 0 1px rgba(248,113,113,0.30), 0 6px 16px -4px rgba(220,38,38,0.40)",
        label: "#0A0A0A",
        sub: "#B91C1C",
      };
    case "muted":
      return {
        bg: "rgba(15,23,42,0.03)",
        icon: "rgba(15,23,42,0.30)",
        shadow: "0 0 0 1px rgba(15,23,42,0.06)",
        label: "rgba(15,23,42,0.40)",
        sub: "rgba(15,23,42,0.30)",
      };
    case "neutral":
    default:
      return {
        bg: "#FFFFFF",
        icon: "rgba(15,23,42,0.55)",
        shadow:
          "0 0 0 1px rgba(15,23,42,0.10), 0 2px 6px -2px rgba(15,23,42,0.06)",
        label: "rgba(15,23,42,0.85)",
        sub: "rgba(15,23,42,0.45)",
      };
  }
}

function FlowHint({
  phase,
  running,
}: {
  phase: Phase;
  running: "over_cap" | "settled" | null;
}) {
  let text = "";
  let color = "rgba(15,23,42,0.45)";
  if (phase === "idle") {
    text = "Choose a scenario — real Solana tx, real x402 facilitator";
  } else if (phase === "running") {
    text =
      running === "over_cap"
        ? "Submitting · policy program evaluating on-chain"
        : "Submitting · policy program evaluating on-chain";
    color = "rgba(15,23,42,0.65)";
  } else if (phase === "blocked") {
    text = "Refused on-chain · Pay.sh never invoked";
    color = "#B45309";
  } else if (phase === "settled") {
    text = "Allowed on-chain · API responded";
    color = "#15803D";
  } else if (phase === "error") {
    text = "Request failed";
    color = "#B45309";
  }
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={`${phase}-${running}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="font-mono"
        style={{ fontSize: 11, color }}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}

function Spinner() {
  return (
    <span
      className="w-3 h-3 border-2 rounded-full animate-spin flex-shrink-0"
      style={{
        borderColor: "rgba(15,23,42,0.15)",
        borderTopColor: "rgba(15,23,42,0.55)",
      }}
    />
  );
}

function previewJson(value: unknown): string {
  try {
    const s = JSON.stringify(value, null, 2);
    if (s.length <= 600) return s;
    return s.slice(0, 600) + "\n…";
  } catch {
    return String(value).slice(0, 600);
  }
}

