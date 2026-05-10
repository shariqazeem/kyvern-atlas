"use client";

/**
 * PayShFlow — Network Activity card on /app.
 *
 * Visualizes a paid API call routing through Kyvern's policy program
 * before Pay.sh ever sees it. Two buttons: Over-cap (refused on-chain)
 * and Settled ($0.001 USDC settles + Pay.sh executes the 402-paywalled
 * call).
 *
 * Sequence on click:
 *   1. Animate dot Agent → KyvernPolicy node (line 1 fills)
 *   2. Kyvern node lights — green for allow, red for refuse
 *   3. If refused: line 1 flashes red, X stamp; flow stops
 *   4. If allowed: line 2 fills, Pay.sh node lights, line 3 fills,
 *      External API node lights, response panel reveals
 *
 * Data: POST /api/atlas/probe-paysh with x-owner-wallet + vaultId.
 */

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  Globe,
  Shield,
  ShieldX,
  Zap,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type FlowPhase =
  | "idle"
  | "leg1" // dot from agent → kyvern
  | "kyvern-eval"
  | "blocked" // refused at kyvern
  | "leg2" // kyvern → pay.sh
  | "leg3" // pay.sh → api
  | "settled"
  | "error";

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
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [result, setResult] = useState<PayShResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<"over_cap" | "settled" | null>(null);

  const fire = useCallback(
    async (scenario: "paysh_over_cap" | "paysh_settled") => {
      if (!vaultId || !ownerWallet || running) return;
      setRunning(scenario === "paysh_over_cap" ? "over_cap" : "settled");
      setError(null);
      setResult(null);
      setPhase("leg1");

      // Fire API in the background. The visual sequence below runs on
      // a deterministic timer regardless — when result lands, the
      // animation flips to the appropriate end state.
      const apiPromise = fetch("/api/atlas/probe-paysh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({ scenario, vaultId }),
      })
        .then((r) => r.json() as Promise<PayShResult & { error?: string; message?: string }>)
        .catch((e) => ({
          ok: false,
          error: e instanceof Error ? e.message : "request failed",
        }));

      // Step the visual through the early stages while we wait
      await wait(700); // leg1 animates
      setPhase("kyvern-eval");
      await wait(450);

      const d = await apiPromise;

      if ("error" in d && d.error) {
        setError((d as { message?: string; error?: string }).message ?? d.error ?? "request failed");
        setPhase("error");
        setRunning(null);
        return;
      }

      const settled = (d as PayShResult).expectedOutcome === "settled";

      if (!settled) {
        setPhase("blocked");
        setResult(d as PayShResult);
        setRunning(null);
        return;
      }

      setPhase("leg2");
      await wait(550);
      setPhase("leg3");
      await wait(550);
      setPhase("settled");
      setResult(d as PayShResult);
      setRunning(null);
    },
    [vaultId, ownerWallet, running],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setError(null);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
      className="rounded-[18px] overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 16px 40px -20px rgba(15,23,42,0.12)",
      }}
    >
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 pb-3 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div
            className="font-mono uppercase tracking-[0.18em] mb-1"
            style={{ color: "rgba(15,23,42,0.45)", fontSize: 10 }}
          >
            Network activity · Pay.sh interception
          </div>
          <h3
            className="text-[16px] font-semibold tracking-[-0.005em]"
            style={{ color: "#0A0A0A" }}
          >
            Every paid API call passes through your policy program first.
          </h3>
        </div>
        <span
          className="font-mono uppercase tracking-[0.14em] flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{
            fontSize: 9.5,
            color: "#15803D",
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.18)",
          }}
        >
          <Zap className="w-2.5 h-2.5" strokeWidth={2.4} />
          Solana × x402
        </span>
      </div>

      {/* Flow viz panel */}
      <div className="px-5 sm:px-6 pb-3">
        <div
          className="relative rounded-[14px] overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, #0A0E1A 0%, #0F1426 100%)",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 24px -8px rgba(34,197,94,0.18)",
          }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{
              background:
                phase === "blocked"
                  ? "linear-gradient(90deg, transparent, rgba(248,113,113,0.6), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(134,239,172,0.5), transparent)",
            }}
          />

          <div className="px-4 sm:px-5 py-5">
            <div
              className="grid items-center gap-2"
              style={{
                gridTemplateColumns:
                  "minmax(56px,1fr) minmax(28px,2fr) minmax(56px,1fr) minmax(28px,2fr) minmax(56px,1fr) minmax(28px,2fr) minmax(56px,1fr)",
              }}
            >
              <FlowNode
                label="Agent"
                sub="your code"
                icon={<Bot className="w-3.5 h-3.5" strokeWidth={2.2} />}
                state="active"
              />
              <FlowLine
                active={
                  phase === "leg1" ||
                  phase === "kyvern-eval" ||
                  phase === "leg2" ||
                  phase === "leg3" ||
                  phase === "settled"
                }
                tone={phase === "blocked" ? "red" : "green"}
                blocked={phase === "blocked"}
              />
              <FlowNode
                label="Kyvern"
                sub="policy gate"
                icon={
                  phase === "blocked" ? (
                    <ShieldX className="w-3.5 h-3.5" strokeWidth={2.2} />
                  ) : (
                    <Shield className="w-3.5 h-3.5" strokeWidth={2.2} />
                  )
                }
                state={
                  phase === "idle"
                    ? "idle"
                    : phase === "blocked"
                      ? "blocked"
                      : phase === "leg1"
                        ? "active"
                        : phase === "kyvern-eval"
                          ? "evaluating"
                          : "passed"
                }
              />
              <FlowLine
                active={
                  phase === "leg2" || phase === "leg3" || phase === "settled"
                }
                tone="green"
              />
              <FlowNode
                label="Pay.sh"
                sub="x402 rail"
                icon={<Zap className="w-3.5 h-3.5" strokeWidth={2.2} />}
                state={
                  phase === "leg2"
                    ? "active"
                    : phase === "leg3" || phase === "settled"
                      ? "passed"
                      : phase === "blocked"
                        ? "skipped"
                        : "idle"
                }
              />
              <FlowLine
                active={phase === "leg3" || phase === "settled"}
                tone="green"
              />
              <FlowNode
                label="API"
                sub="merchant"
                icon={<Globe className="w-3.5 h-3.5" strokeWidth={2.2} />}
                state={
                  phase === "leg3"
                    ? "active"
                    : phase === "settled"
                      ? "passed"
                      : phase === "blocked"
                        ? "skipped"
                        : "idle"
                }
              />
            </div>

            {/* Hint line under the diagram */}
            <div className="mt-3 flex items-center justify-center">
              <FlowHint phase={phase} />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="px-5 sm:px-6 pb-4 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => fire("paysh_over_cap")}
          disabled={!vaultId || !ownerWallet || running !== null}
          className="group inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-[10px] text-[12.5px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "rgba(245,158,11,0.06)",
            color: "#B45309",
            border: "1px solid rgba(245,158,11,0.30)",
          }}
        >
          {running === "over_cap" ? (
            <Spinner />
          ) : (
            <ShieldX className="w-3.5 h-3.5" strokeWidth={2.2} />
          )}
          Try $5 over-cap
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.2}
          />
        </button>
        <button
          type="button"
          onClick={() => fire("paysh_settled")}
          disabled={!vaultId || !ownerWallet || running !== null}
          className="group inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-[10px] text-[12.5px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(180deg, #15803D 0%, #166534 100%)",
            color: "#FFFFFF",
            boxShadow:
              "0 1px 2px rgba(21,128,61,0.25), 0 6px 18px -10px rgba(21,128,61,0.40)",
          }}
        >
          {running === "settled" ? <Spinner light /> : <Zap className="w-3.5 h-3.5" strokeWidth={2.2} />}
          Try $0.001 settled call
          <ArrowRight
            className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.2}
          />
        </button>
        {(phase === "settled" || phase === "blocked" || phase === "error") && (
          <button
            type="button"
            onClick={reset}
            className="text-[11.5px] font-mono uppercase tracking-[0.14em] px-2.5 py-1 rounded-md transition-all hover:bg-[rgba(15,23,42,0.04)]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Result panel */}
      <AnimatePresence>
        {(phase === "blocked" || phase === "settled") && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="border-t"
            style={{ borderColor: "rgba(15,23,42,0.05)" }}
          >
            <div className="px-5 sm:px-6 py-4 flex flex-col gap-2.5">
              {phase === "blocked" ? (
                <div className="flex items-start gap-2.5">
                  <ShieldX
                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                    strokeWidth={2.2}
                    style={{ color: "#B45309" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-mono uppercase tracking-[0.14em]"
                      style={{ fontSize: 9.5, color: "#B45309" }}
                    >
                      Refused on-chain · Pay.sh never invoked
                    </div>
                    <p
                      className="font-mono leading-[1.5] mt-1"
                      style={{
                        fontSize: 12.5,
                        color: "rgba(15,23,42,0.85)",
                      }}
                    >
                      <span style={{ color: "#15803D" }}>KyvernPolicy</span>::
                      <span style={{ color: "#B45309" }}>
                        {result.expectedErrorName ?? "AmountExceedsPerTxMax"}
                      </span>{" "}
                      stopped the spend before the x402 facilitator saw it.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                    strokeWidth={2.2}
                    style={{ color: "#15803D" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-mono uppercase tracking-[0.14em]"
                      style={{ fontSize: 9.5, color: "#15803D" }}
                    >
                      Settled · pay.sh executed · API responded
                    </div>
                    <p
                      className="text-[12.5px] leading-[1.5] mt-1"
                      style={{ color: "rgba(15,23,42,0.85)" }}
                    >
                      Kyvern allowed the spend, settled $0.001 USDC on-chain,
                      then Pay.sh resolved the 402 challenge and called the
                      external API. Both layers are real.
                    </p>
                    {result.paySh?.parsed != null && (
                      <pre
                        className="mt-2 font-mono p-2.5 rounded-md overflow-x-auto"
                        style={{
                          fontSize: 10.5,
                          lineHeight: 1.55,
                          background: "rgba(15,23,42,0.04)",
                          border: "1px solid rgba(15,23,42,0.06)",
                          color: "rgba(15,23,42,0.75)",
                          maxHeight: 160,
                          margin: 0,
                        }}
                      >
                        {previewJson(result.paySh.parsed)}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                {result.expectedErrorCode && (
                  <span
                    className="font-mono uppercase tracking-[0.10em]"
                    style={{ fontSize: 10, color: "rgba(15,23,42,0.55)" }}
                  >
                    code {result.expectedErrorCode}
                  </span>
                )}
                <span
                  className="font-mono"
                  style={{ fontSize: 10, color: "rgba(15,23,42,0.55)" }}
                >
                  chain {result.chainDurationMs}ms
                </span>
                {result.paySh?.durationMs != null && (
                  <span
                    className="font-mono"
                    style={{ fontSize: 10, color: "rgba(15,23,42,0.55)" }}
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
            className="border-t px-5 sm:px-6 py-3 text-[12px]"
            style={{
              borderColor: "rgba(245,158,11,0.20)",
              background: "rgba(245,158,11,0.04)",
              color: "#B45309",
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer hint */}
      <div
        className="px-5 sm:px-6 py-3 border-t flex items-center justify-between gap-2 flex-wrap"
        style={{
          borderColor: "rgba(15,23,42,0.05)",
          background: "rgba(15,23,42,0.015)",
        }}
      >
        <span
          className="text-[10.5px]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          Pay.sh is the Solana × Google Cloud agent commerce rail. Kyvern
          authorizes spend before any 402 challenge resolves.
        </span>
      </div>
    </motion.section>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────── */

function FlowNode({
  label,
  sub,
  icon,
  state,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  state: "idle" | "active" | "evaluating" | "passed" | "blocked" | "skipped";
}) {
  const tone =
    state === "passed"
      ? "green"
      : state === "blocked"
        ? "red"
        : state === "active" || state === "evaluating"
          ? "amber-active"
          : state === "skipped"
            ? "muted"
            : "idle";

  const bg =
    tone === "green"
      ? "linear-gradient(135deg, #15803D 0%, #22C55E 100%)"
      : tone === "red"
        ? "linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)"
        : tone === "amber-active"
          ? "linear-gradient(135deg, #2A4A28 0%, #4D7C0F 100%)"
          : tone === "muted"
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.06)";

  const ring =
    tone === "green"
      ? "0 0 0 1px rgba(34,197,94,0.30), 0 0 12px rgba(34,197,94,0.30)"
      : tone === "red"
        ? "0 0 0 1px rgba(248,113,113,0.45), 0 0 14px rgba(248,113,113,0.40)"
        : tone === "amber-active"
          ? "0 0 0 1px rgba(134,239,172,0.30), 0 0 10px rgba(134,239,172,0.25)"
          : "0 0 0 1px rgba(255,255,255,0.06)";

  const iconColor =
    tone === "green" || tone === "red" || tone === "amber-active"
      ? "#FFFFFF"
      : tone === "muted"
        ? "rgba(255,255,255,0.25)"
        : "rgba(229,231,235,0.65)";

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5 col-span-1"
      animate={{ opacity: tone === "muted" ? 0.4 : 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="rounded-[10px] flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          background: bg,
          boxShadow: ring,
          color: iconColor,
        }}
        animate={
          state === "evaluating"
            ? {
                boxShadow: [
                  "0 0 0 1px rgba(134,239,172,0.30), 0 0 8px rgba(134,239,172,0.25)",
                  "0 0 0 1px rgba(134,239,172,0.55), 0 0 18px rgba(134,239,172,0.50)",
                  "0 0 0 1px rgba(134,239,172,0.30), 0 0 8px rgba(134,239,172,0.25)",
                ],
              }
            : {}
        }
        transition={{ duration: 1.0, repeat: state === "evaluating" ? Infinity : 0 }}
      >
        {icon}
      </motion.div>
      <div className="flex flex-col items-center">
        <span
          className="font-mono uppercase tracking-[0.10em] whitespace-nowrap"
          style={{
            fontSize: 9.5,
            color:
              tone === "muted"
                ? "rgba(229,231,235,0.30)"
                : "rgba(229,231,235,0.85)",
          }}
        >
          {label}
        </span>
        <span
          className="font-mono whitespace-nowrap"
          style={{
            fontSize: 9,
            color:
              tone === "muted"
                ? "rgba(229,231,235,0.18)"
                : "rgba(229,231,235,0.45)",
          }}
        >
          {sub}
        </span>
      </div>
    </motion.div>
  );
}

function FlowLine({
  active,
  tone,
  blocked,
}: {
  active: boolean;
  tone: "green" | "red";
  blocked?: boolean;
}) {
  const fillColor =
    blocked || tone === "red"
      ? "rgba(248,113,113,0.65)"
      : "rgba(134,239,172,0.65)";
  return (
    <div
      className="relative h-px col-span-1"
      style={{
        background: "rgba(255,255,255,0.08)",
      }}
    >
      <motion.div
        className="absolute inset-y-0 left-0"
        initial={{ width: "0%" }}
        animate={{ width: active ? "100%" : "0%" }}
        transition={{ duration: 0.55, ease: EASE }}
        style={{
          background: fillColor,
          boxShadow: blocked
            ? "0 0 6px rgba(248,113,113,0.55)"
            : active
              ? "0 0 6px rgba(134,239,172,0.55)"
              : undefined,
        }}
      />
    </div>
  );
}

function FlowHint({ phase }: { phase: FlowPhase }) {
  let text = "";
  let tone = "muted";
  switch (phase) {
    case "idle":
      text = "Click a button below — real Solana tx, real x402 facilitator";
      break;
    case "leg1":
      text = "Agent submitting payment intent…";
      break;
    case "kyvern-eval":
      text = "Policy program evaluating on-chain…";
      tone = "active";
      break;
    case "blocked":
      text = "Refused on-chain · Pay.sh never invoked";
      tone = "red";
      break;
    case "leg2":
      text = "Authorized · forwarding to Pay.sh facilitator";
      tone = "green";
      break;
    case "leg3":
      text = "Pay.sh resolving x402 challenge · calling external API";
      tone = "green";
      break;
    case "settled":
      text = "Settled on-chain · API responded";
      tone = "green";
      break;
    case "error":
      text = "Request failed";
      tone = "red";
      break;
  }
  const color =
    tone === "green"
      ? "rgba(134,239,172,0.85)"
      : tone === "red"
        ? "rgba(252,165,165,0.85)"
        : tone === "active"
          ? "rgba(229,231,235,0.85)"
          : "rgba(229,231,235,0.45)";
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="font-mono"
        style={{ fontSize: 10.5, color }}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className="w-3.5 h-3.5 border-2 rounded-full animate-spin flex-shrink-0"
      style={{
        borderColor: light
          ? "rgba(255,255,255,0.30)"
          : "rgba(180,83,9,0.25)",
        borderTopColor: light ? "#FFFFFF" : "#B45309",
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
