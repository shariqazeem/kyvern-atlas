"use client";

/* ════════════════════════════════════════════════════════════════════
   KyvernLabs Hero — A Visa with a daily cap for every AI agent.
   Cinematic kill-switch demo. One signature moment.
   ════════════════════════════════════════════════════════════════════ */

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, Lock, Terminal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AtlasObservatory } from "./atlas-observatory";

const ease = [0.25, 0.1, 0.25, 1] as const;
const spring = [0.16, 1, 0.3, 1] as const;

/* ── Word-by-word headline reveal ── */
function WordReveal({
  text,
  className,
  delay = 0,
  weight = 600,
}: {
  text: string;
  className?: string;
  delay?: number;
  weight?: number;
}) {
  const words = text.split(" ");
  return (
    <motion.span
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08, delayChildren: delay } },
      }}
      className={className}
      style={{ fontWeight: weight }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={{
            hidden: { opacity: 0, y: 28, filter: "blur(14px)" },
            show: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.9, ease: spring },
            },
          }}
          className="inline-block mr-[0.28em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   The cinematic demo — a vault dashboard that shows an agent
   spending normally, then going rogue, then being killed. On repeat.
   ════════════════════════════════════════════════════════════════════ */

type AttemptStatus = "allowed" | "blocked" | "pending";
type Attempt = {
  id: number;
  merchant: string;
  amount: number;
  status: AttemptStatus;
  reason?: string;
  ts: string;
};

// Scripted timeline. Each step is an attempt; the component appends rows
// at a steady cadence and toggles the kill-switch state mid-sequence.
const TIMELINE: Attempt[] = [
  { id: 1, merchant: "weather-api.com",       amount: 0.40, status: "allowed", ts: "14:22:03" },
  { id: 2, merchant: "search.ai/v1",          amount: 1.20, status: "allowed", ts: "14:22:07" },
  { id: 3, merchant: "llm.anthropic.com",     amount: 3.80, status: "allowed", ts: "14:22:12" },
  { id: 4, merchant: "random-x.net",          amount: 4.80, status: "allowed", ts: "14:22:16" },
  { id: 5, merchant: "random-x.net",          amount: 4.80, status: "allowed", ts: "14:22:17" },
  { id: 6, merchant: "unknown-merchant.xyz",  amount: 49.99, status: "blocked", reason: "per-tx max $5.00", ts: "14:22:18" },
  { id: 7, merchant: "random-x.net",          amount: 4.99, status: "allowed", ts: "14:22:19" },
  { id: 8, merchant: "random-x.net",          amount: 4.99, status: "blocked", reason: "velocity cap (10/hr)", ts: "14:22:19" },
  { id: 9, merchant: "random-x.net",          amount: 4.99, status: "blocked", reason: "velocity cap (10/hr)", ts: "14:22:20" },
  { id: 10, merchant: "unknown-merchant.xyz", amount: 25.00, status: "blocked", reason: "per-tx max $5.00", ts: "14:22:20" },
];

// After TIMELINE completes, the owner "hits" the kill switch; all further
// attempts are blocked with a different reason.
const PAUSED_ATTEMPTS: Attempt[] = [
  { id: 11, merchant: "random-x.net",       amount: 4.99, status: "blocked", reason: "vault paused by owner", ts: "14:22:22" },
  { id: 12, merchant: "llm.anthropic.com",  amount: 0.40, status: "blocked", reason: "vault paused by owner", ts: "14:22:23" },
];

// Legacy cinematic demo — no longer rendered; <AtlasObservatory /> is
// the hero now. Preserved for reference in case the old visual language
// is needed for a separate page (e.g. a "marketing microsite").
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function VaultDemo() {
  const [, setStep] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [killFlash, setKillFlash] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Advance the scripted timeline.
  useEffect(() => {
    const tick = setInterval(() => {
      setStep((s) => {
        const totalSteps = TIMELINE.length + PAUSED_ATTEMPTS.length + 2;
        const next = (s + 1) % (totalSteps + 3); // +3 for pause + reset

        if (next === 0) {
          // Full reset at loop
          setAttempts([]);
          setIsPaused(false);
          setKillFlash(false);
          return next;
        }

        if (next <= TIMELINE.length) {
          const a = TIMELINE[next - 1];
          setAttempts((prev) => [a, ...prev].slice(0, 5));
        } else if (next === TIMELINE.length + 1) {
          // KILL SWITCH moment
          setKillFlash(true);
          setIsPaused(true);
          setTimeout(() => setKillFlash(false), 700);
        } else if (
          next > TIMELINE.length + 1 &&
          next <= TIMELINE.length + 1 + PAUSED_ATTEMPTS.length
        ) {
          const idx = next - TIMELINE.length - 2;
          setAttempts((prev) => [PAUSED_ATTEMPTS[idx], ...prev].slice(0, 5));
        }
        return next;
      });
    }, 750);
    return () => clearInterval(tick);
  }, []);

  const dailySpent = useMemo(
    () =>
      attempts
        .filter((a) => a.status === "allowed")
        .reduce((sum, a) => sum + a.amount, 0),
    [attempts]
  );

  const dailyLimit = 50;
  const progress = Math.min(100, (dailySpent / dailyLimit) * 100);
  const balance = 100 - dailySpent;

  const allowedCount = attempts.filter((a) => a.status === "allowed").length;
  const blockedCount = attempts.filter((a) => a.status === "blocked").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.2, delay: 0.9, ease: spring }}
      className="relative mx-auto w-full max-w-[1100px]"
    >
      {/* Ambient soft glow to anchor the demo */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl opacity-[0.18]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(0,0,0,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Kill-flash overlay — a single frame of red when the switch trips */}
      <AnimatePresence>
        {killFlash && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.22 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="pointer-events-none absolute inset-0 rounded-[28px]"
            style={{ background: "var(--destructive)" }}
          />
        )}
      </AnimatePresence>

      <div className="relative card-elevated overflow-hidden">
        {/* Browser chrome */}
        <div
          className="flex items-center px-5 py-3.5 border-b"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-[10px] text-[11px] font-mono-numbers"
              style={{
                background: "var(--surface)",
                border: "0.5px solid var(--border-subtle)",
                color: "var(--text-tertiary)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: isPaused
                    ? "var(--destructive)"
                    : "var(--success)",
                }}
              />
              kyvern.co/vault/research-agent
            </div>
          </div>
          <div className="w-[52px]" />
        </div>

        {/* Dashboard body */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]"
          style={{ background: "var(--surface)" }}
        >
          {/* LEFT: vault summary + activity feed */}
          <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {/* Header row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="section-label mb-1.5">Vault</div>
                <h3 className="text-[17px] font-semibold tracking-[-0.02em]">
                  Research Agent
                </h3>
              </div>

              {/* KILL SWITCH */}
              <motion.button
                aria-label="Kill switch"
                animate={
                  isPaused
                    ? { scale: [1, 0.96, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.4, ease }}
                className={`relative inline-flex items-center gap-2 h-9 px-3.5 rounded-[12px] text-[12px] font-semibold tracking-[-0.01em] transition-all duration-300`}
                style={{
                  background: isPaused
                    ? "var(--destructive)"
                    : "var(--surface-2)",
                  color: isPaused ? "white" : "var(--text-primary)",
                  boxShadow: isPaused
                    ? "0 8px 24px rgba(239,68,68,0.28), 0 0 0 0.5px rgba(239,68,68,0.4)"
                    : "0 0 0 0.5px rgba(0,0,0,0.04)",
                }}
              >
                <Lock className="w-3.5 h-3.5" />
                {isPaused ? "VAULT PAUSED" : "Kill Switch"}
              </motion.button>
            </div>

            {/* Balance + budget */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="hero-number font-mono-numbers" style={{ fontSize: "44px", fontWeight: 300, letterSpacing: "-0.04em" }}>
                  ${balance.toFixed(2)}
                </span>
                <span className="text-[13px] text-tertiary font-mono-numbers">USDC</span>
              </div>
              <div className="text-[12px] text-tertiary mb-3">
                of $100.00 funded · Solana devnet
              </div>

              {/* Budget progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="section-label text-[10px]">Daily budget</span>
                  <span className="font-mono-numbers text-tertiary">
                    ${dailySpent.toFixed(2)} / ${dailyLimit.toFixed(2)}
                  </span>
                </div>
                <div
                  className="h-[6px] rounded-full overflow-hidden"
                  style={{ background: "var(--surface-3)" }}
                >
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease }}
                    className="h-full rounded-full"
                    style={{
                      background:
                        progress > 90
                          ? "var(--destructive)"
                          : progress > 70
                          ? "var(--warning)"
                          : "var(--text-primary)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Activity feed */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="section-label">Live activity</div>
                <div className="flex items-center gap-3 text-[11px] text-tertiary font-mono-numbers">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
                    {allowedCount} allowed
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--destructive)" }} />
                    {blockedCount} blocked
                  </span>
                </div>
              </div>

              <div
                ref={listRef}
                className="relative overflow-hidden"
                style={{
                  height: 260,
                  // Soft fade at the bottom so items gracefully exit the viewport
                  maskImage:
                    "linear-gradient(to bottom, black 0%, black 82%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 0%, black 82%, transparent 100%)",
                }}
              >
                <div className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {attempts.map((a) => (
                      <motion.div
                        key={a.id}
                        layout
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.35, ease: spring }}
                        className="flex items-center gap-3 px-3 py-2 rounded-[12px]"
                        style={{
                          background:
                            a.status === "allowed"
                              ? "var(--success-bg)"
                              : "var(--destructive-bg)",
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background:
                              a.status === "allowed"
                                ? "var(--success)"
                                : "var(--destructive)",
                          }}
                        >
                          {a.status === "allowed" ? (
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          ) : (
                            <X className="w-3 h-3 text-white" strokeWidth={3} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium truncate">
                            {a.merchant}
                          </div>
                          {a.reason && (
                            <div
                              className="text-[10.5px] font-medium mt-0.5"
                              style={{ color: "var(--destructive)" }}
                            >
                              BLOCKED · {a.reason}
                            </div>
                          )}
                        </div>
                        <div className="font-mono-numbers text-[12px] tabular-nums text-right flex-shrink-0">
                          ${a.amount.toFixed(2)}
                        </div>
                        <div className="font-mono-numbers text-[10px] text-quaternary text-right w-[58px] flex-shrink-0">
                          {a.ts}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: agent terminal */}
          <div
            className="p-6 lg:p-7 flex flex-col"
            style={{ background: "#0B0B0C" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[11px] font-mono-numbers" style={{ color: "#9A9AA0" }}>
                <Terminal className="w-3.5 h-3.5" />
                research-agent · node
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#27C93F" }} />
                <span className="text-[10px] font-mono-numbers" style={{ color: "#9A9AA0" }}>running</span>
              </div>
            </div>

            <pre
              className="text-[12px] leading-[1.75] font-mono-numbers flex-1"
              style={{ color: "#E4E4E7" }}
            >
              <span style={{ color: "#6E7681" }}>{"// research-agent.ts"}</span>{"\n"}
              <span style={{ color: "#C586C0" }}>import</span>{" "}
              <span style={{ color: "#9CDCFE" }}>{"{ Vault }"}</span>{" "}
              <span style={{ color: "#C586C0" }}>from</span>{" "}
              <span style={{ color: "#CE9178" }}>{"\"@kyvernlabs/sdk\""}</span>{"\n\n"}
              <span style={{ color: "#C586C0" }}>const</span>{" "}
              <span style={{ color: "#9CDCFE" }}>kv</span> ={" "}
              <span style={{ color: "#C586C0" }}>new</span>{" "}
              <span style={{ color: "#4EC9B0" }}>Vault</span>(
              <span style={{ color: "#9CDCFE" }}>{"{ agentKey }"}</span>){"\n\n"}
              <span style={{ color: "#6E7681" }}>{"// agent pays for services as needed"}</span>{"\n"}
              <span style={{ color: "#C586C0" }}>await</span>{" "}
              <span style={{ color: "#9CDCFE" }}>kv</span>.
              <span style={{ color: "#DCDCAA" }}>pay</span>({"{\n  "}
              <span style={{ color: "#9CDCFE" }}>merchant</span>:{" "}
              <span style={{ color: "#CE9178" }}>{"\"weather-api.com\""}</span>,{"\n  "}
              <span style={{ color: "#9CDCFE" }}>amount</span>:{" "}
              <span style={{ color: "#B5CEA8" }}>0.40</span>,{"\n  "}
              <span style={{ color: "#9CDCFE" }}>memo</span>:{" "}
              <span style={{ color: "#CE9178" }}>{"\"fetch forecast\""}</span>{"\n}"})
              {"\n\n"}
              <span style={{ color: "#6E7681" }}>{"// KyvernLabs enforces policy before signing"}</span>{"\n"}
              <span style={{ color: "#6E7681" }}>{"// if denied, agent can't pay. period."}</span>
            </pre>

            {/* Status footer */}
            <div
              className="mt-5 pt-4 border-t flex items-center justify-between text-[11px] font-mono-numbers"
              style={{ borderColor: "rgba(255,255,255,0.06)", color: "#9A9AA0" }}
            >
              <span>policy: daily $50 · per-tx $5 · 10/hr</span>
              <motion.span
                animate={{ opacity: isPaused ? 1 : [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ color: isPaused ? "#ef4444" : "#22c55e" }}
              >
                {isPaused ? "● frozen" : "● live"}
              </motion.span>
            </div>
          </div>
        </div>
      </div>

      {/* Credibility strip under the demo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.8, ease }}
        className="mt-8 flex flex-col items-center gap-4"
      >
        {/* Row 1 — the moat: our live program ID + Squads program ID,
            both clickable to Solana Explorer. This is the shot a judge
            clicks first. No vibes. */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href="https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-all hover:-translate-y-px"
            style={{
              background: "linear-gradient(180deg, #F8F9FF 0%, #FFFFFF 100%)",
              border: "0.5px solid rgba(79,70,229,0.3)",
              color: "#4F46E5",
              boxShadow:
                "0 1px 2px rgba(79,70,229,0.06), 0 4px 16px rgba(79,70,229,0.04)",
            }}
          >
            <span className="inline-flex h-1.5 w-1.5 items-center justify-center rounded-full bg-[#4F46E5]" />
            Kyvern program
            <span className="font-mono text-[10px] tracking-tight opacity-75 group-hover:opacity-100">
              PpmZEr…MSqc
            </span>
          </a>
          <span
            className="text-[11px]"
            style={{ color: "var(--text-quaternary)" }}
          >
            CPI
          </span>
          <a
            href="https://explorer.solana.com/address/SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium transition-all hover:-translate-y-px"
            style={{
              background: "var(--surface-2)",
              border: "0.5px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <span className="inline-flex h-1.5 w-1.5 items-center justify-center rounded-full bg-current opacity-60" />
            Squads v4
            <span className="font-mono text-[10px] tracking-tight opacity-75 group-hover:opacity-100">
              SQDS4e…2pCf
            </span>
          </a>
        </div>

        {/* Row 2 — honest context */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11.5px] text-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-current opacity-60" />
            Live on Solana devnet
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-current opacity-60" />
            Squads v4 secures $10B+ on Solana
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-current opacity-60" />
            Squads audited 3× (Trail of Bits · OtterSec · Neodyme)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-current opacity-60" />
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase"
              style={{
                background: "#FEF3C7",
                color: "#92400E",
              }}
            >
              Pre-alpha
            </span>
            Kyvern program unaudited — devnet only
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HeroCodeSnippet — the 3-line pitch shown directly under the headline.
   ════════════════════════════════════════════════════════════════════ */

// Retained for potential future use — the static 3-line code snippet
// the hero used before Atlas. Currently unused; the hero now renders
// <AtlasObservatory />.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HeroCodeSnippet() {
  const [copied, setCopied] = useState(false);

  const snippet = `// pay side — the agent
import { OnChainVault } from "@kyvernlabs/sdk";
const vault = new OnChainVault({ cluster, connection, multisig, spendingLimit });
const res = await vault.pay({ agent, recipient, amount: 0.12, merchant: "api.openai.com" });

// earn side — the service (one line)
export const GET = withPulse(withX402(handler, price), { apiKey: "kv_live_..." });`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.25, ease }}
      className="relative mx-auto mb-9 w-full max-w-[720px]"
    >
      <div
        className="relative overflow-hidden rounded-[16px] border"
        style={{
          background: "#0B0B0F",
          borderColor: "rgba(255,255,255,0.06)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.04), 0 24px 48px -24px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-2.5"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <span
              className="ml-3 text-[11px] font-medium font-mono-numbers"
              style={{ color: "#9A9AA0" }}
            >
              agent.ts
            </span>
          </div>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: copied ? "#86EFAC" : "#D4D4D8",
            }}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" /> Copied
              </>
            ) : (
              "Copy"
            )}
          </button>
        </div>
        <pre
          className="px-5 py-4 text-[12.5px] leading-[1.75] font-mono-numbers overflow-x-auto"
          style={{ color: "#E4E4E7" }}
        >
          <span style={{ color: "#6E7681" }}>{"// pay side — the agent"}</span>{"\n"}
          <span style={{ color: "#C586C0" }}>import</span>{" "}
          <span style={{ color: "#9CDCFE" }}>{"{ OnChainVault }"}</span>{" "}
          <span style={{ color: "#C586C0" }}>from</span>{" "}
          <span style={{ color: "#CE9178" }}>{'"@kyvernlabs/sdk"'}</span>;{"\n"}
          <span style={{ color: "#C586C0" }}>const</span>{" "}
          <span style={{ color: "#9CDCFE" }}>vault</span> ={" "}
          <span style={{ color: "#C586C0" }}>new</span>{" "}
          <span style={{ color: "#4EC9B0" }}>OnChainVault</span>(
          <span style={{ color: "#9CDCFE" }}>{"{ cluster, connection, multisig, spendingLimit }"}</span>);{"\n"}
          <span style={{ color: "#C586C0" }}>const</span>{" "}
          <span style={{ color: "#9CDCFE" }}>res</span> ={" "}
          <span style={{ color: "#C586C0" }}>await</span>{" "}
          <span style={{ color: "#9CDCFE" }}>vault</span>.
          <span style={{ color: "#DCDCAA" }}>pay</span>({"{ "}
          <span style={{ color: "#9CDCFE" }}>agent</span>,{" "}
          <span style={{ color: "#9CDCFE" }}>recipient</span>,{" "}
          <span style={{ color: "#9CDCFE" }}>amount</span>:{" "}
          <span style={{ color: "#B5CEA8" }}>0.12</span>,{" "}
          <span style={{ color: "#9CDCFE" }}>merchant</span>:{" "}
          <span style={{ color: "#CE9178" }}>{'"api.openai.com"'}</span>
          {" });"}
          {"\n\n"}
          <span style={{ color: "#6E7681" }}>{"// earn side — the service (one line)"}</span>{"\n"}
          <span style={{ color: "#C586C0" }}>export</span>{" "}
          <span style={{ color: "#C586C0" }}>const</span>{" "}
          <span style={{ color: "#9CDCFE" }}>GET</span> ={" "}
          <span style={{ color: "#DCDCAA" }}>withPulse</span>(
          <span style={{ color: "#DCDCAA" }}>withX402</span>(
          <span style={{ color: "#9CDCFE" }}>handler</span>,{" "}
          <span style={{ color: "#9CDCFE" }}>price</span>),{" "}
          <span style={{ color: "#9CDCFE" }}>{'{ apiKey }'}</span>);
        </pre>
      </div>
      <p
        className="mt-3 text-center text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        One SDK family. Pay side fails on-chain if rules fire; earn side captures
        every payment seconds after it lands.
      </p>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   The Hero
   ════════════════════════════════════════════════════════════════════ */

export function Hero() {
  return (
    <section className="relative pt-32 md:pt-40 pb-16 md:pb-24 overflow-hidden">
      {/* Background — fine dot grid for texture, no gradients */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-dot-grid opacity-60"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Small status badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="flex justify-center mb-10"
        >
          <div
            className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full text-[12px] font-medium"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              color: "var(--text-secondary)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
            Live on Solana devnet
            <span style={{ color: "var(--text-quaternary)" }}>·</span>
            <span style={{ color: "var(--text-tertiary)" }}>
              Built on Squads v4
            </span>
          </div>
        </motion.div>

        {/* Headline — the thesis, not a tagline.
            "Autonomy" is the superpower; "run free" is the outcome the
            dev wakes up wanting. */}
        <div className="text-center mb-7">
          <h1
            className="text-balance"
            style={{
              fontSize: "clamp(44px, 8.5vw, 96px)",
              lineHeight: 0.98,
              letterSpacing: "-0.045em",
            }}
          >
            <WordReveal
              text="Let your AI agents"
              className="block"
              weight={300}
              delay={0.1}
            />
            <WordReveal
              text="run free."
              className="block mt-1"
              weight={600}
              delay={0.55}
            />
          </h1>
        </div>

        {/* Subhead — the fear Kyvern ends, in the founder's own voice.
            No marketing abstractions. Concrete, physical, honest. */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1, ease }}
          className="mx-auto max-w-[720px] text-center text-[17px] md:text-[19px] leading-[1.5] text-balance mb-10"
          style={{ color: "var(--text-secondary)" }}
        >
          Every AI agent today runs on private keys — one bad prompt, one leak,
          one exploit, and the treasury is gone.{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            Kyvern replaces the key with a budget enforced by Solana itself.
            Deploy an agent. Set the rules. Let it run for days. If it tries
            anything outside the policy, the chain refuses — before the tx ever
            lands.
          </span>
        </motion.p>

        {/* Live observatory — replaces the old static code snippet.
            Polls /api/atlas/status every 3s; every number is real,
            sourced from a running agent on Solana devnet. This is the
            hero proof: not "here's what we're building," but "here's
            what's already running." */}
        <AtlasObservatory />

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.25, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 md:mb-20"
        >
          <Link href="/vault/new" className="btn-primary group">
            Deploy your first agent
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 h-[52px] px-6 rounded-[18px] text-[15px] font-semibold tracking-[-0.01em] transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "var(--surface-2)" }}
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 ml-[1px]" fill="currentColor" style={{ color: "var(--text-primary)" }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            Watch it live · Solana devnet
          </Link>
        </motion.div>

        {/*
         * The old cinematic research-agent/kill-switch demo used to live
         * here (<VaultDemo />). It was designed for the previous narrative
         * where the hero showed "what Kyvern could do in principle."
         * Atlas replaces that entirely — the hero now shows what Kyvern
         * IS doing right now on devnet. Scripted demo → real agent.
         * VaultDemo is preserved for reference but intentionally NOT
         * mounted.
         */}
      </div>
    </section>
  );
}
