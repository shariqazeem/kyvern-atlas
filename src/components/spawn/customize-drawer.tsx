"use client";

/**
 * Customize drawer — Section 2B "depth lives here".
 *
 * Slides up from the bottom on mobile, modal on desktop. Four sections:
 *   1. Personality — two sliders (Logical↔Creative, Cautious↔Aggressive)
 *      that derive the personality prompt + show a live preview line.
 *   2. Abilities — all available tools grouped Observe / Earn / Act,
 *      each with a one-line "why it matters" hint, recommended badged.
 *   3. Work cadence — three named options that set frequencySeconds.
 *   4. On-chain budget — read-only display of the device's per-tx and
 *      daily caps, with the policy program callout that flips a judge
 *      from "consumer UI" to "wait, this is a smart contract."
 *
 * The drawer is fully controlled. State lives in the parent spawn page;
 * the drawer sends edits up through onChange callbacks.
 */

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Lock } from "lucide-react";

const POLICY_PROGRAM_ID = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

interface ToolMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  costsMoney: boolean;
}

interface CustomizeDrawerProps {
  open: boolean;
  onClose: () => void;

  // Personality sliders — each in [-100, 100]
  logicalCreative: number;
  setLogicalCreative: (v: number) => void;
  cautiousAggressive: number;
  setCautiousAggressive: (v: number) => void;

  // Abilities
  allTools: ToolMeta[];
  selectedTools: string[];
  setSelectedTools: (next: string[]) => void;
  recommendedTools: string[];

  // Cadence (in seconds)
  frequencySeconds: number;
  setFrequencySeconds: (v: number) => void;

  // Read-only budget from the device
  perTxMaxUsd: number;
  dailyLimitUsd: number;
  network: "devnet" | "mainnet";
}

const TOOL_HINT: Record<string, string> = {
  read_onchain: "Reads balances and recent transactions on Solana.",
  read_dex: "Looks up token prices via CoinGecko + DexScreener.",
  watch_wallet: "Scans a wallet's recent activity with type detection.",
  watch_wallet_swaps: "Detects Jupiter swaps for a wallet, valued in USD.",
  message_user: "Sends a chat message to your owner.",
  expose_paywall: "Stands up a paid feed; other workers pay to read it.",
  claim_task: "Atomically claims an open task and gets paid on completion.",
  subscribe_to_agent: "Pays another worker to subscribe to its feed.",
  post_task: "Posts a paid bounty for other workers to claim.",
};

const CATEGORY_GROUPS: Array<{
  label: string;
  match: (t: ToolMeta) => boolean;
}> = [
  { label: "Observe", match: (t) => t.category === "read" },
  { label: "Earn", match: (t) => t.category === "earn" || t.id === "message_user" },
  { label: "Act", match: (t) => t.category === "spend" },
];

const CADENCE_OPTIONS = [
  { id: "chill", label: "Chill", interval: "Every 10 minutes", seconds: 600, costPerDay: "$0.005" },
  { id: "balanced", label: "Balanced", interval: "Every 4 minutes", seconds: 240, costPerDay: "$0.012" },
  { id: "aggressive", label: "Aggressive", interval: "Every minute", seconds: 60, costPerDay: "$0.045" },
];

function logicalText(v: number): string {
  if (v < -33) return "You make unexpected connections. You trust patterns over evidence.";
  if (v > 33) return "You reason carefully and cite evidence. You don't act on hunches.";
  return "You balance careful reasoning with creative leaps.";
}
function cautionText(v: number): string {
  if (v < -33) return "You move fast. You take asymmetric bets without asking permission.";
  if (v > 33) return "You hesitate before spending. You verify before acting.";
  return "You weigh risk against reward and act when the odds favour you.";
}
function previewLine(lc: number, ca: number): string {
  const logical = lc > 33;
  const creative = lc < -33;
  const aggressive = ca < -33;
  const cautious = ca > 33;
  if (logical && cautious) return "Verified. SOL up 2.3%. Cross-checking one more source before reporting.";
  if (logical && aggressive) return "SOL up 2.3%. Posting alert now — pattern is statistically clear.";
  if (creative && cautious) return "SOL behaving unusually — feels like an opening. Verifying before moving.";
  if (creative && aggressive) return "Pattern looks like the breakout I've been watching. Going.";
  return "Tracking SOL movement. Will alert if anything breaks pattern.";
}

function Slider({
  label1,
  label2,
  value,
  onChange,
}: {
  label1: string;
  label2: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
        <span>{label1}</span>
        <span>{label2}</span>
      </div>
      <input
        type="range"
        min={-100}
        max={100}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full"
        style={{ accentColor: "#4ADE80" }}
      />
    </div>
  );
}

function SectionHeader({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span
        className="font-mono text-[10px] w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {index}
      </span>
      <h3 className="text-[13px] font-semibold text-white">{title}</h3>
    </div>
  );
}

export function CustomizeDrawer({
  open,
  onClose,
  logicalCreative,
  setLogicalCreative,
  cautiousAggressive,
  setCautiousAggressive,
  allTools,
  selectedTools,
  setSelectedTools,
  recommendedTools,
  frequencySeconds,
  setFrequencySeconds,
  perTxMaxUsd,
  dailyLimitUsd,
  network,
}: CustomizeDrawerProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const cluster = network === "mainnet" ? "" : "?cluster=devnet";
  const explorerHref = `https://explorer.solana.com/address/${POLICY_PROGRAM_ID}${cluster}`;

  const sample = useMemo(() => previewLine(logicalCreative, cautiousAggressive), [
    logicalCreative,
    cautiousAggressive,
  ]);

  const groups = useMemo(() => {
    return CATEGORY_GROUPS.map((g) => ({
      label: g.label,
      tools: allTools.filter(g.match),
    })).filter((g) => g.tools.length > 0);
  }, [allTools]);

  const toggleTool = (id: string) => {
    if (selectedTools.includes(id)) {
      setSelectedTools(selectedTools.filter((x) => x !== id));
    } else {
      setSelectedTools([...selectedTools, id]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(8,11,20,0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:px-4"
          >
            <div
              className="mx-auto w-full max-w-[520px] max-h-[90vh] flex flex-col rounded-t-[20px] sm:rounded-[20px] overflow-hidden relative"
              style={{
                background:
                  "radial-gradient(120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 48px -12px rgba(0,0,0,0.55)",
              }}
            >
              <div
                className="absolute top-0 left-6 right-6 pointer-events-none"
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)",
                }}
              />
              <div className="pt-2 pb-0 flex justify-center sm:hidden">
                <span className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-3 pb-3 shrink-0">
                <div>
                  <div
                    className="text-[10px] uppercase mb-0.5"
                    style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em" }}
                  >
                    Customize
                  </div>
                  <h2 className="text-[17px] font-semibold text-white">Personality, abilities, budget</h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
                </button>
              </div>

              {/* Scroll body */}
              <div className="overflow-y-auto px-5 pb-4 flex-1">
                {/* 1. Personality */}
                <section className="mb-5">
                  <SectionHeader index={1} title="Personality" />
                  <div className="space-y-4 mb-3">
                    <Slider
                      label1="Logical"
                      label2="Creative"
                      value={logicalCreative}
                      onChange={setLogicalCreative}
                    />
                    <Slider
                      label1="Cautious"
                      label2="Aggressive"
                      value={cautiousAggressive}
                      onChange={setCautiousAggressive}
                    />
                  </div>
                  <div
                    className="rounded-[10px] px-3 py-2.5 text-[12px] italic leading-[1.5]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    &ldquo;{sample}&rdquo;
                  </div>
                </section>

                {/* 2. Abilities */}
                <section className="mb-5">
                  <SectionHeader index={2} title="Abilities" />
                  {groups.map((g) => (
                    <div key={g.label} className="mb-3 last:mb-0">
                      <div
                        className="text-[10px] uppercase mb-1.5"
                        style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}
                      >
                        {g.label}
                      </div>
                      <div className="space-y-1.5">
                        {g.tools.map((t) => {
                          const active = selectedTools.includes(t.id);
                          const recommended = recommendedTools.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleTool(t.id)}
                              className="w-full text-left rounded-[10px] px-3 py-2 transition active:scale-[0.99]"
                              style={{
                                background: active ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.03)",
                                border: active
                                  ? "1px solid rgba(74,222,128,0.45)"
                                  : "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              <div className="flex items-start gap-2.5">
                                <span
                                  className="w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center"
                                  style={{
                                    background: active ? "#4ADE80" : "transparent",
                                    border: active
                                      ? "none"
                                      : "1px solid rgba(255,255,255,0.18)",
                                  }}
                                >
                                  {active && (
                                    <span
                                      className="block w-1.5 h-1.5 rounded-full"
                                      style={{ background: "#0E1320" }}
                                    />
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[12.5px] font-medium text-white">{t.name}</span>
                                    {recommended && (
                                      <span
                                        className="text-[8.5px] font-medium px-1.5 py-0.5 rounded"
                                        style={{
                                          background: "rgba(74,222,128,0.12)",
                                          color: "#86EFAC",
                                        }}
                                      >
                                        RECOMMENDED
                                      </span>
                                    )}
                                    {t.costsMoney && (
                                      <span
                                        className="text-[8.5px] font-mono px-1.5 py-0.5 rounded"
                                        style={{ background: "rgba(245,158,11,0.12)", color: "#FCD34D" }}
                                      >
                                        COSTS USDC
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className="text-[11px] mt-0.5 leading-[1.4]"
                                    style={{ color: "rgba(255,255,255,0.55)" }}
                                  >
                                    {TOOL_HINT[t.id] ?? t.description.slice(0, 90)}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>

                {/* 3. Work cadence */}
                <section className="mb-5">
                  <SectionHeader index={3} title="Work cadence" />
                  <div className="grid grid-cols-1 gap-2">
                    {CADENCE_OPTIONS.map((c) => {
                      const active = frequencySeconds === c.seconds;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setFrequencySeconds(c.seconds)}
                          className="text-left rounded-[10px] px-3 py-2.5 transition active:scale-[0.99]"
                          style={{
                            background: active ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.03)",
                            border: active
                              ? "1px solid rgba(74,222,128,0.45)"
                              : "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[13px] font-semibold text-white">{c.label}</div>
                              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                                {c.interval}
                              </div>
                            </div>
                            <div className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                              ~{c.costPerDay}/day
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* 4. On-chain budget */}
                <section className="mb-2">
                  <SectionHeader index={4} title="On-chain budget" />
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div
                      className="rounded-[10px] px-3 py-2.5"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="text-[10px] uppercase mb-0.5"
                        style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}
                      >
                        Per-action cap
                      </div>
                      <div className="font-mono text-[15px] text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                        ${perTxMaxUsd.toFixed(3)}
                      </div>
                    </div>
                    <div
                      className="rounded-[10px] px-3 py-2.5"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="text-[10px] uppercase mb-0.5"
                        style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}
                      >
                        Daily limit
                      </div>
                      <div className="font-mono text-[15px] text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                        ${dailyLimitUsd.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-[10px] px-3 py-2.5 text-[11px] leading-[1.55] flex items-start gap-2"
                    style={{
                      background: "rgba(0,0,0,0.45)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    <Lock className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#86EFAC" }} />
                    <div className="flex-1 min-w-0">
                      These limits are enforced by your policy program at{" "}
                      <span className="font-mono text-white">PpmZ…MSqc</span> on Solana. No worker can exceed
                      them. Verified on-chain.{" "}
                      <a
                        href={explorerHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 underline"
                        style={{ color: "#86EFAC" }}
                      >
                        Open Explorer
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  <div
                    className="mt-2 text-[10px] leading-[1.5]"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Caps are inherited from your device. To change them, edit the device in Settings.
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div
                className="px-5 py-3 flex items-center justify-end shrink-0"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-[10px] text-[13px] font-medium transition active:scale-[0.97]"
                  style={{ background: "white", color: "#0A0A0A" }}
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── helpers exported for the spawn page ─── */

export function derivePersonalityPrompt(
  name: string,
  logicalCreative: number,
  cautiousAggressive: number,
): string {
  return `You are ${name || "a worker"} — an autonomous worker on Solana. ${logicalText(logicalCreative)} ${cautionText(cautiousAggressive)} You speak in short, direct sentences and stay in character.`;
}
