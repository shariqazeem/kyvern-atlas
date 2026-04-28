"use client";

/**
 * InstallAnimation — light hardware install ritual.
 *
 * Replaces the old dark BirthAnimation. Shows a small chassis with an
 * empty cartridge slot. The picked module's emoji literally slides
 * down into the slot, the slot LED flashes amber → green, and a
 * 4-step status log streams alongside:
 *
 *   ○ Creating worker identity        (300ms)
 *   ○ Binding abilities               (300ms)
 *   ○ Setting on-chain budget         (500ms — shows per-tx / daily caps
 *                                       + the Kyvern policy program ID)
 *   ○ Activating intelligence         (300ms)
 *   ●  Intelligence online.
 *
 * Total ~1.4s + 0.7s hold then onComplete fires.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

const POLICY_PROGRAM_ID = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

const STEPS = [
  { label: "Creating worker identity", ms: 300 },
  { label: "Binding abilities", ms: 300 },
  { label: "Setting on-chain budget", ms: 500 },
  { label: "Activating intelligence", ms: 300 },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface InstallAnimationProps {
  name: string;
  emoji: string;
  serial: string;
  perTxMaxUsd: number;
  dailyLimitUsd: number;
  onComplete: () => void;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

export function InstallAnimation({
  name,
  emoji,
  serial,
  perTxMaxUsd,
  dailyLimitUsd,
  onComplete,
}: InstallAnimationProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((s, i) => {
      elapsed += s.ms;
      timers.push(
        setTimeout(() => {
          if (!cancelled) setStep(i + 1);
        }, elapsed),
      );
    });
    timers.push(
      setTimeout(() => {
        if (!cancelled) onComplete();
      }, elapsed + 700),
    );
    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [onComplete]);

  const allDone = step >= STEPS.length;

  // Module dock progress — moves from above (-30) into the slot (0) by the
  // end of phase 2 (after 600ms).
  const dockProgress = Math.min(1, step / 2); // 0→1 across phases 0..2
  const dockY = -28 * (1 - dockProgress);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{
        background: "rgba(248,248,250,0.86)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="relative w-full max-w-[400px] rounded-[24px] overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8FA 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "0 1px 2px rgba(15,23,42,0.04)",
            "0 12px 32px -10px rgba(15,23,42,0.12)",
            "0 32px 64px -20px rgba(15,23,42,0.18)",
          ].join(", "),
        }}
      >
        {/* Top edge highlight */}
        <div
          aria-hidden
          className="absolute top-0 left-8 right-8 pointer-events-none"
          style={{
            height: 1,
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,1), transparent)",
          }}
        />

        {/* LED strip — same look as device chassis */}
        <div
          className="relative flex items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <motion.span
              className="rounded-full"
              style={{ width: 7, height: 7 }}
              animate={{
                background: allDone ? "#22C55E" : "#F59E0B",
                boxShadow: allDone
                  ? "0 0 0 3px rgba(34,197,94,0.12), 0 0 8px rgba(34,197,94,0.55)"
                  : "0 0 0 3px rgba(245,158,11,0.12), 0 0 8px rgba(245,158,11,0.55)",
              }}
              transition={{ duration: 0.4, ease: EASE }}
            />
            <span
              className="font-mono text-[10px] uppercase"
              style={{
                color: allDone ? "#15803D" : "#B45309",
                letterSpacing: "0.14em",
              }}
            >
              {allDone ? "ONLINE" : "INSTALLING"}
            </span>
          </div>
          <span
            className="font-mono text-[11px] tracking-[0.08em]"
            style={{
              color: "#374151",
              textShadow: "0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            {serial}
          </span>
        </div>

        {/* Slot stage — empty cartridge slot, module slides into it */}
        <div className="relative flex flex-col items-center pt-7 pb-5 px-5">
          {/* The slot */}
          <div className="relative" style={{ width: 96, height: 96 }}>
            {/* Slot well (recessed) */}
            <div
              className="absolute inset-0 rounded-[24px]"
              style={{
                background:
                  "linear-gradient(180deg, #ECEDF0 0%, #F8F8FA 100%)",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow:
                  "inset 0 2px 4px rgba(15,23,42,0.10), inset 0 -1px 0 rgba(255,255,255,0.9)",
              }}
            />

            {/* Connector pins along the bottom of the slot */}
            <div
              aria-hidden
              className="absolute left-3 right-3 flex items-center justify-between px-2"
              style={{ bottom: 6 }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="rounded-sm"
                  style={{
                    width: 6,
                    height: 2,
                    background: "rgba(15,23,42,0.22)",
                  }}
                />
              ))}
            </div>

            {/* Activation glow (appears at phase 3+) */}
            {step >= 3 && (
              <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 rounded-[24px] pointer-events-none"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(34,197,94,0.18) 0%, rgba(34,197,94,0) 70%)",
                }}
              />
            )}

            {/* The docking module */}
            <motion.div
              className="absolute inset-2 rounded-[18px] flex items-center justify-center text-[34px]"
              animate={{
                y: dockY,
                scale: allDone ? [1, 1.06, 1] : 1,
              }}
              transition={
                allDone
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.45, ease: EASE }
              }
              style={{
                background:
                  "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
                border: allDone
                  ? "1px solid rgba(34,197,94,0.45)"
                  : "1px solid rgba(15,23,42,0.08)",
                boxShadow: allDone
                  ? "0 0 0 1px rgba(34,197,94,0.20), 0 0 24px rgba(34,197,94,0.18), 0 6px 14px -4px rgba(15,23,42,0.10)"
                  : "0 1px 2px rgba(15,23,42,0.06), 0 8px 18px -6px rgba(15,23,42,0.18)",
              }}
            >
              {emoji || "✨"}
            </motion.div>
          </div>

          {/* Name + status */}
          <div
            className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: allDone ? "#15803D" : "#9CA3AF" }}
          >
            {allDone ? "Intelligence online" : "Docking module"}
          </div>
          <div className="mt-1 text-[20px] font-semibold tracking-tight text-[#0A0A0A]">
            {name || "—"}
          </div>
          <AnimatePresence>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-1 text-center"
              >
                <div className="font-mono text-[12px] text-[#6B7280]">
                  First finding incoming…
                </div>
                <div className="font-mono text-[10.5px] text-[#9CA3AF] mt-1">
                  {name || "Worker"} will introduce themselves in a moment.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status log */}
        <div
          className="px-5 pt-3 pb-5"
          style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
        >
          <div className="space-y-1.5">
            {STEPS.map((s, i) => {
              const done = i < step;
              const inProgress = i === step && !allDone;
              const showBudgetDetail = s.label === "Setting on-chain budget";
              return (
                <div key={s.label}>
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{
                      opacity: done || inProgress ? 1 : 0.4,
                      x: 0,
                    }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-2.5 text-[12.5px]"
                  >
                    <span
                      className="rounded-full flex items-center justify-center shrink-0"
                      style={{
                        width: 16,
                        height: 16,
                        background: done
                          ? "rgba(34,197,94,0.14)"
                          : inProgress
                            ? "rgba(15,23,42,0.04)"
                            : "transparent",
                        border: done
                          ? "1px solid rgba(34,197,94,0.55)"
                          : inProgress
                            ? "1px solid rgba(15,23,42,0.20)"
                            : "1px solid rgba(15,23,42,0.10)",
                      }}
                    >
                      {done ? (
                        <Check
                          className="w-2.5 h-2.5"
                          strokeWidth={3}
                          style={{ color: "#15803D" }}
                        />
                      ) : inProgress ? (
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "#9CA3AF" }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.9, repeat: Infinity }}
                        />
                      ) : null}
                    </span>
                    <span
                      style={{
                        color:
                          done || inProgress ? "#0A0A0A" : "#9CA3AF",
                      }}
                    >
                      {s.label}
                    </span>
                  </motion.div>

                  {/* Budget detail callout — only under "Setting on-chain budget" */}
                  {showBudgetDetail && (done || inProgress) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="ml-[26px] mt-1 mb-1 overflow-hidden"
                    >
                      <div
                        className="rounded-[8px] px-2.5 py-1.5 font-mono text-[10.5px] flex items-center justify-between gap-2 flex-wrap"
                        style={{
                          background: "rgba(15,23,42,0.025)",
                          border: "1px solid rgba(15,23,42,0.05)",
                          color: "#374151",
                        }}
                      >
                        <span>
                          per_tx ≤ ${perTxMaxUsd.toFixed(2)} · daily ≤ $
                          {dailyLimitUsd.toFixed(2)}
                        </span>
                        <span style={{ color: "#9CA3AF" }}>
                          {shortAddr(POLICY_PROGRAM_ID)}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
