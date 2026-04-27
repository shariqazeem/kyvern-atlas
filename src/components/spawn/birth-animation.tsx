"use client";

/**
 * Birth animation — Section 2B end-piece.
 *
 * Plays a 4-step rite when the user hits Spawn, then resolves with the
 * worker's name + a "first thought in 0:47" line for ~600ms, then calls
 * onComplete (the page navigates to the agent detail view, where the
 * activation banner from Section 3C takes over the live countdown).
 *
 * Steps and timings come from the plan:
 *   ○ Creating worker identity…     (300ms)
 *   ○ Binding abilities…            (300ms)
 *   ○ Setting on-chain budget…      (400ms)
 *   ○ Activating intelligence…      (300ms)
 *   ●  {Name} is alive.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const STEPS = [
  { label: "Creating worker identity", ms: 300 },
  { label: "Binding abilities", ms: 300 },
  { label: "Setting on-chain budget", ms: 400 },
  { label: "Activating intelligence", ms: 300 },
];

export function BirthAnimation({
  name,
  emoji,
  onComplete,
}: {
  name: string;
  emoji: string;
  onComplete: () => void;
}) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((s, i) => {
      elapsed += s.ms;
      timers.push(
        setTimeout(() => {
          if (!cancelled) setActiveStep(i + 1);
        }, elapsed),
      );
    });
    // Sit on "alive" for 700ms, then call onComplete
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

  const allDone = activeStep >= STEPS.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(8,11,20,0.78)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[380px] rounded-[20px] overflow-hidden relative"
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

        <div className="px-6 pt-6 pb-5">
          {/* Identity block — emoji that pulses brighter as activation completes */}
          <div className="flex flex-col items-center text-center mb-5">
            <motion.div
              className="w-14 h-14 rounded-full flex items-center justify-center text-[28px] mb-3"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: allDone
                  ? "1px solid rgba(74,222,128,0.55)"
                  : "1px solid rgba(255,255,255,0.12)",
                boxShadow: allDone
                  ? "0 0 0 4px rgba(74,222,128,0.12), 0 0 24px rgba(74,222,128,0.25)"
                  : undefined,
              }}
              animate={
                allDone
                  ? { scale: [1, 1.08, 1] }
                  : { scale: [1, 1.03, 1] }
              }
              transition={{
                duration: allDone ? 1.6 : 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {emoji || "✨"}
            </motion.div>
            <div
              className="text-[10px] font-mono uppercase mb-1"
              style={{
                color: allDone ? "rgba(74,222,128,0.95)" : "rgba(255,255,255,0.55)",
                letterSpacing: "0.12em",
              }}
            >
              {allDone ? "Alive" : "Spawning"}
            </div>
            <div className="text-[20px] font-semibold text-white">{name || "—"}</div>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-1 font-mono text-[12px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                First finding incoming…
              </motion.div>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {STEPS.map((s, i) => {
              const done = i < activeStep;
              const inProgress = i === activeStep && !allDone;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{
                    opacity: done || inProgress ? 1 : 0.35,
                    x: 0,
                  }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2.5 text-[13px]"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: done
                        ? "rgba(74,222,128,0.18)"
                        : inProgress
                          ? "rgba(255,255,255,0.06)"
                          : "transparent",
                      border: done
                        ? "1px solid rgba(74,222,128,0.6)"
                        : inProgress
                          ? "1px solid rgba(255,255,255,0.25)"
                          : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    {done ? (
                      <Check className="w-2.5 h-2.5" style={{ color: "#4ADE80" }} strokeWidth={3} />
                    ) : inProgress ? (
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.6)" }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                      />
                    ) : null}
                  </span>
                  <span style={{ color: done || inProgress ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)" }}>
                    {s.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
