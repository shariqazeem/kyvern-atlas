"use client";

/**
 * Unboxing — cinematic first-boot experience.
 *
 * Sequence:
 *   0. Blank → "Your device has arrived."
 *   1. Box drops from above with slight bounce
 *   2. Lid tilts open (3D perspective)
 *   3. Device rises out of box, tilted, then straightens
 *   4. Box falls away
 *   5. Device screen glows alive, features flash
 *   6. Zoom INTO the screen → you're in the OS
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UnboxingProps {
  onComplete: () => void;
}

const spring = [0.16, 1, 0.3, 1] as const;
const smooth = [0.25, 0.1, 0.25, 1] as const;

export function Unboxing({ onComplete }: UnboxingProps) {
  const [phase, setPhase] = useState(0);

  const skip = useCallback(() => {
    setPhase(8);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 1000),    // box drops
      setTimeout(() => setPhase(2), 2200),    // lid opens
      setTimeout(() => setPhase(3), 3200),    // device rises
      setTimeout(() => setPhase(4), 4400),    // box falls away
      setTimeout(() => setPhase(5), 5000),    // screen lights + features
      setTimeout(() => setPhase(6), 6800),    // zoom into screen
      setTimeout(() => setPhase(7), 8200),    // complete
      setTimeout(() => onComplete(), 8600),
    ];
    return () => t.forEach(clearTimeout);
  }, [onComplete]);

  if (phase >= 8) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: "#FAFAFA" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Phase 0: Intro text */}
      <AnimatePresence>
        {phase === 0 && (
          <motion.div
            key="text"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.5, ease: spring }}
            className="absolute text-center z-10"
          >
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-[13px] text-[#9CA3AF] mb-2"
            >
              Welcome to
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6, ease: spring }}
              className="text-[36px] font-semibold tracking-[-0.03em] text-[#111]"
            >
              Kyvern
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 1+: The box + device */}
      {phase >= 1 && phase < 7 && (
        <div className="relative" style={{ perspective: 800 }}>
          {/* === BOX === */}
          <AnimatePresence>
            {phase < 4 && (
              <motion.div
                key="box"
                className="absolute left-1/2 top-1/2"
                style={{ transformStyle: "preserve-3d" }}
                initial={{ x: "-50%", y: "-150%", opacity: 0, rotateX: -8 }}
                animate={
                  phase >= 1
                    ? { x: "-50%", y: "-50%", opacity: 1, rotateX: 0 }
                    : {}
                }
                exit={{
                  y: "80%",
                  opacity: 0,
                  scale: 0.8,
                  rotateX: 12,
                }}
                transition={
                  phase < 4
                    ? { type: "spring", damping: 18, stiffness: 120, mass: 1 }
                    : { duration: 0.5, ease: smooth }
                }
              >
                {/* Box body */}
                <div
                  className="w-[200px] h-[100px] rounded-[14px] relative"
                  style={{
                    background: "linear-gradient(180deg, #F5F5F5 0%, #E8E8E8 100%)",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {/* KYVERN emboss on box */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="text-[11px] font-semibold tracking-[0.25em]"
                      style={{ color: "rgba(0,0,0,0.08)" }}
                    >
                      KYVERN
                    </span>
                  </div>
                </div>

                {/* Box lid — tilts open in phase 2 */}
                <motion.div
                  className="absolute -top-1 left-0 w-[200px] h-[52px] rounded-t-[14px]"
                  style={{
                    background: "linear-gradient(180deg, #FAFAFA 0%, #F0F0F0 100%)",
                    boxShadow: "0 -2px 8px rgba(0,0,0,0.03)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderBottom: "none",
                    transformOrigin: "top center",
                    transformStyle: "preserve-3d",
                  }}
                  animate={
                    phase >= 2
                      ? { rotateX: -110, y: -4, opacity: 0.6 }
                      : { rotateX: 0, y: 0, opacity: 1 }
                  }
                  transition={{ duration: 0.7, ease: spring }}
                >
                  <div className="absolute inset-0 flex items-end justify-center pb-2">
                    <span
                      className="text-[8px] font-medium tracking-[0.15em]"
                      style={{ color: "rgba(0,0,0,0.06)" }}
                    >
                      KYVERN
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* === DEVICE === */}
          {phase >= 3 && (
            <motion.div
              className="relative z-10"
              initial={{
                y: 40,
                rotateX: 25,
                rotateY: -8,
                scale: 0.85,
                opacity: 0,
              }}
              animate={
                phase >= 6
                  ? {
                      scale: 6,
                      opacity: 0,
                      y: 0,
                      rotateX: 0,
                      rotateY: 0,
                    }
                  : phase >= 4
                    ? {
                        y: 0,
                        rotateX: 0,
                        rotateY: 0,
                        scale: 1,
                        opacity: 1,
                      }
                    : {
                        y: -20,
                        rotateX: 12,
                        rotateY: -4,
                        scale: 0.95,
                        opacity: 1,
                      }
              }
              transition={
                phase >= 6
                  ? { duration: 1.2, ease: [0.32, 0, 0.67, 0] }
                  : { type: "spring", damping: 20, stiffness: 100 }
              }
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Device body */}
              <div
                className="w-[220px] h-[360px] rounded-[26px] p-[10px] relative"
                style={{
                  background: "linear-gradient(165deg, #1a1a1a 0%, #0d0d0d 100%)",
                  boxShadow: [
                    "0 0 0 1px rgba(255,255,255,0.06)",
                    "0 1px 0 rgba(255,255,255,0.03) inset",
                    "0 30px 60px rgba(0,0,0,0.2)",
                    "0 10px 20px rgba(0,0,0,0.1)",
                  ].join(", "),
                }}
              >
                {/* Screen */}
                <motion.div
                  className="w-full h-full rounded-[18px] overflow-hidden relative"
                  style={{ background: "#FAFAFA" }}
                  animate={
                    phase >= 5
                      ? {
                          boxShadow: [
                            "0 0 0px rgba(34,197,94,0)",
                            "0 0 30px rgba(34,197,94,0.15)",
                            "0 0 0px rgba(34,197,94,0)",
                          ],
                        }
                      : {}
                  }
                  transition={
                    phase >= 5
                      ? { duration: 1.5, repeat: 1, ease: "easeInOut" }
                      : {}
                  }
                >
                  {/* Screen content appears in phase 5 */}
                  <AnimatePresence>
                    {phase >= 5 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 p-3 flex flex-col"
                      >
                        {/* Mini status bar */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-1">
                            <motion.span
                              className="w-[4px] h-[4px] rounded-full bg-[#22C55E]"
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <span className="text-[5.5px] text-[#9CA3AF] font-medium">
                              Solana devnet
                            </span>
                          </div>
                          <span className="text-[5.5px] text-[#D1D5DB]">
                            Kyvern
                          </span>
                        </div>

                        {/* Mini title */}
                        <p className="text-[7.5px] font-semibold text-[#111] mb-2">
                          Your devices
                        </p>

                        {/* Mini device cards */}
                        <div className="space-y-1.5 flex-1">
                          <MiniCard emoji="🧭" name="My Forecaster" pct={82} active />
                          <MiniCard emoji="🤖" name="Trade Bot" pct={35} active />
                          <MiniCard emoji="📊" name="Data Agent" pct={12} active={false} />
                        </div>

                        {/* Mini today strip */}
                        <div
                          className="rounded-[5px] p-1.5 mb-1.5"
                          style={{ background: "#fff", border: "1px solid #F3F4F6" }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[5px] text-[#9CA3AF]">Today</span>
                            <span className="text-[6.5px] font-semibold font-mono text-[#111]">
                              $4.50
                            </span>
                          </div>
                        </div>

                        {/* Mini tab bar */}
                        <div
                          className="flex items-center justify-around pt-1.5"
                          style={{ borderTop: "1px solid #F3F4F6" }}
                        >
                          {["⌂", "+", "◇", "⚙"].map((c, i) => (
                            <span
                              key={i}
                              className="text-[7px]"
                              style={{ color: i === 0 ? "#111" : "#D1D5DB" }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Feature labels — phase 5 only */}
              <AnimatePresence>
                {phase >= 5 && phase < 6 && (
                  <>
                    <FeatureLabel
                      text="On-chain budgets"
                      side="left"
                      y="18%"
                      delay={0}
                    />
                    <FeatureLabel
                      text="Kill switch"
                      side="right"
                      y="30%"
                      delay={0.12}
                    />
                    <FeatureLabel
                      text="Merchant allowlists"
                      side="left"
                      y="50%"
                      delay={0.24}
                    />
                    <FeatureLabel
                      text="Solana enforcement"
                      side="right"
                      y="62%"
                      delay={0.36}
                    />
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      )}

      {/* Skip */}
      {phase >= 1 && phase < 6 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
          onClick={skip}
          className="absolute bottom-8 text-[12px] text-[#D1D5DB] hover:text-[#9CA3AF] transition-colors z-20"
        >
          Skip →
        </motion.button>
      )}
    </motion.div>
  );
}

/* ── Sub-components ── */

function FeatureLabel({
  text,
  side,
  y,
  delay,
}: {
  text: string;
  side: "left" | "right";
  y: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: side === "left" ? 20 : -20,
      }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="absolute whitespace-nowrap"
      style={{
        [side === "left" ? "right" : "left"]: "calc(100% + 16px)",
        top: y,
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
        style={{
          background: "#fff",
          color: "#111",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <span className="w-[4px] h-[4px] rounded-full bg-[#22C55E]" />
        {text}
      </span>
      {/* Connector line */}
      <span
        className="absolute top-1/2 -translate-y-1/2 h-px w-3"
        style={{
          background: "rgba(0,0,0,0.06)",
          [side === "left" ? "left" : "right"]: "100%",
        }}
      />
    </motion.div>
  );
}

function MiniCard({
  emoji,
  name,
  pct,
  active,
}: {
  emoji: string;
  name: string;
  pct: number;
  active: boolean;
}) {
  return (
    <div
      className="rounded-[6px] p-1.5"
      style={{ background: "#fff", border: "1px solid #F3F4F6" }}
    >
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[6px]">{emoji}</span>
        <span className="text-[5.5px] font-semibold text-[#111] truncate">
          {name}
        </span>
        <span
          className="ml-auto w-[3px] h-[3px] rounded-full"
          style={{ background: active ? "#22C55E" : "#EF4444" }}
        />
      </div>
      <div className="h-[1.5px] rounded-full bg-[#F3F4F6]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct > 80 ? "#F59E0B" : "#22C55E",
          }}
        />
      </div>
    </div>
  );
}
