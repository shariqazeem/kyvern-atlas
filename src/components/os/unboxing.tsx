"use client";

/**
 * Unboxing — cinematic first-boot experience.
 *
 * Sequence:
 *   1. "Your device is ready." text fades in
 *   2. Device slides up with spring animation (matte black hardware)
 *   3. Feature labels appear around the device
 *   4. Camera zooms INTO the device screen
 *   5. Screen expands to fill viewport → crossfade into the OS
 *
 * Plays once per user (localStorage flag). ~7 seconds total.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_SPRING as spring } from "@/lib/motion";

interface UnboxingProps {
  onComplete: () => void;
}

const FEATURES = [
  { label: "On-chain budgets", x: "-120%", y: "15%" },
  { label: "Kill switch", x: "120%", y: "25%" },
  { label: "Merchant allowlists", x: "-120%", y: "55%" },
  { label: "Real Solana transactions", x: "120%", y: "65%" },
];

export function Unboxing({ onComplete }: UnboxingProps) {
  const [phase, setPhase] = useState(0);
  // 0: text intro
  // 1: device appears
  // 2: features show
  // 3: zoom into screen
  // 4: done

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1200),   // device appears
      setTimeout(() => setPhase(2), 2400),   // features
      setTimeout(() => setPhase(3), 4400),   // zoom
      setTimeout(() => setPhase(4), 6000),   // complete
      setTimeout(() => onComplete(), 6400),  // unmount
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: "#FAFAFA" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Intro text */}
      <AnimatePresence>
        {phase === 0 && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6, ease: spring }}
            className="absolute text-center"
          >
            <p className="text-[14px] text-[#9CA3AF] mb-2">Welcome to</p>
            <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#111]">
              Kyvern
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Device + features + zoom */}
      {phase >= 1 && (
        <motion.div
          className="relative flex items-center justify-center"
          animate={
            phase >= 3
              ? { scale: 5.5, opacity: 0 }
              : { scale: 1, opacity: 1 }
          }
          transition={
            phase >= 3
              ? { duration: 1.4, ease: [0.32, 0, 0.67, 0] }
              : {}
          }
        >
          {/* The physical device */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: spring }}
            className="relative"
          >
            {/* Device body */}
            <div
              className="w-[240px] h-[380px] rounded-[28px] relative overflow-hidden"
              style={{
                background: "linear-gradient(165deg, #1a1a1a 0%, #0d0d0d 100%)",
                boxShadow: [
                  "0 0 0 1px rgba(255,255,255,0.06)",
                  "0 25px 60px rgba(0,0,0,0.25)",
                  "0 8px 24px rgba(0,0,0,0.15)",
                ].join(", "),
                padding: "12px",
              }}
            >
              {/* Screen */}
              <div
                className="w-full h-full rounded-[18px] flex flex-col items-center justify-center"
                style={{
                  background: "#FAFAFA",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
                }}
              >
                {/* Mini OS preview on the device screen */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="w-full h-full p-3 flex flex-col"
                >
                  {/* Mini status bar */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <span className="w-[4px] h-[4px] rounded-full bg-[#22C55E]" />
                      <span className="text-[6px] text-[#9CA3AF]">Solana</span>
                    </div>
                    <span className="text-[6px] text-[#D1D5DB]">Kyvern</span>
                  </div>

                  {/* Mini "Your devices" title */}
                  <p className="text-[8px] font-semibold text-[#111] mb-2">
                    Your devices
                  </p>

                  {/* Mini device cards */}
                  <div className="space-y-1.5">
                    <MiniCard emoji="🧭" name="My Forecaster" pct={75} />
                    <MiniCard emoji="🤖" name="Trade Bot" pct={30} />
                  </div>

                  {/* Mini tab bar */}
                  <div className="mt-auto flex items-center justify-around pt-2"
                    style={{ borderTop: "1px solid #F3F4F6" }}>
                    {["●", "+", "◆", "⚙"].map((c, i) => (
                      <span key={i} className="text-[7px]"
                        style={{ color: i === 0 ? "#111" : "#D1D5DB" }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Feature labels */}
            <AnimatePresence>
              {phase >= 2 && phase < 3 && FEATURES.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                  className="absolute whitespace-nowrap"
                  style={{
                    left: "50%",
                    top: f.y,
                    transform: `translateX(${f.x})`,
                  }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
                    style={{
                      background: "#fff",
                      color: "#111",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      border: "1px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    <span className="w-[5px] h-[5px] rounded-full bg-[#22C55E]" />
                    {f.label}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      {/* Skip button */}
      {phase < 3 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.4 }}
          onClick={() => { setPhase(4); onComplete(); }}
          className="absolute bottom-8 text-[12px] text-[#D1D5DB] hover:text-[#9CA3AF] transition-colors"
        >
          Skip →
        </motion.button>
      )}
    </motion.div>
  );
}

function MiniCard({ emoji, name, pct }: { emoji: string; name: string; pct: number }) {
  return (
    <div
      className="rounded-[6px] p-1.5"
      style={{ background: "#fff", border: "1px solid #F3F4F6" }}
    >
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[7px]">{emoji}</span>
        <span className="text-[6px] font-medium text-[#111]">{name}</span>
        <span className="ml-auto w-[4px] h-[4px] rounded-full bg-[#22C55E]" />
      </div>
      <div className="h-[2px] rounded-full bg-[#F3F4F6]">
        <div
          className="h-full rounded-full bg-[#22C55E]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
