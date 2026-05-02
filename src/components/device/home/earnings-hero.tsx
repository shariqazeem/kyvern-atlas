"use client";

/**
 * EarningsHero — the headline of the device home (Phase 5).
 *
 * "Your device earned $X.XX today" sits at the very top of the chassis
 * body. This is the screenshot judges remember.
 *
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │  Your device earned                                           │
 *   │  $0.45 today                                       ↑          │
 *   │  ──────────────────────────                                   │
 *   │  +$0.02/min · spent $0.32 · net +$0.13                        │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * Empty state (zero earned, no on-chain activity yet):
 *   "Workers are earning — first tasks complete soon."
 *
 * The component is presentational only; data comes from live-status.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function ScrambleAmount({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(`$${value.toFixed(2)}`);
  const targetRef = useRef(display);
  useEffect(() => {
    const next = `$${value.toFixed(2)}`;
    if (next === targetRef.current) return;
    targetRef.current = next;
    const start = performance.now();
    const duration = 540;
    const charset = "0123456789";
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / duration;
      if (t >= 1) {
        setDisplay(next);
        return;
      }
      const revealCount = Math.floor(next.length * t);
      let out = "";
      for (let i = 0; i < next.length; i++) {
        const c = next[i];
        if (i < revealCount || !/[0-9]/.test(c)) out += c;
        else out += charset[Math.floor(Math.random() * charset.length)];
      }
      setDisplay(out);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
}

interface EarningsHeroProps {
  earnedToday: number;
  spentToday: number;
  netToday: number;
  earningPerMinUsd: number;
  workersActive: number;
  onChainToday: number;
}

export function EarningsHero({
  earnedToday,
  spentToday,
  netToday,
  earningPerMinUsd,
  workersActive,
  onChainToday,
}: EarningsHeroProps) {
  const hasEarnings = earnedToday > 0;
  const hasActivity = onChainToday > 0;
  const positive = netToday >= 0;

  // Phase 4 — pulse on increment. When earnedToday ticks up, fire a
  // subtle 1.4s outer-glow + scale flash. The "ka-ching" moment is the
  // single most-rewarding micro-interaction on the demo, so it's worth
  // dedicating a Framer Motion ring to it.
  const prevEarnedRef = useRef(earnedToday);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (earnedToday > prevEarnedRef.current + 0.0001) {
      setPulseKey((k) => k + 1);
    }
    prevEarnedRef.current = earnedToday;
  }, [earnedToday]);

  // Empty state — workers running but no payments yet
  if (!hasEarnings && !hasActivity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative w-full rounded-[18px] overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAF9 100%)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "0 1px 2px rgba(15,23,42,0.04)",
            "0 6px 18px -8px rgba(15,23,42,0.06)",
          ].join(", "),
        }}
      >
        <div className="relative px-5 py-6 text-center">
          <p
            className="font-mono uppercase tracking-[0.14em] mb-2"
            style={{ color: "#9CA3AF", fontSize: 9.5 }}
          >
            Today
          </p>
          <p
            className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-[#0A0A0A] leading-snug"
          >
            Workers are earning.
          </p>
          <p
            className="mt-1.5 text-[13px] leading-[1.55]"
            style={{ color: "#6B7280" }}
          >
            {workersActive > 0
              ? `${workersActive} worker${workersActive === 1 ? "" : "s"} active — first tasks complete soon.`
              : "Hire a worker and they'll start earning on-chain."}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative w-full rounded-[18px] overflow-hidden"
      style={{
        background: hasEarnings
          ? "linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 65%)"
          : "linear-gradient(180deg, #FFFFFF 0%, #F8FAF9 100%)",
        border: hasEarnings
          ? "1px solid rgba(34,197,94,0.20)"
          : "1px solid rgba(15,23,42,0.06)",
        boxShadow: hasEarnings
          ? [
              "inset 0 1px 0 rgba(255,255,255,1)",
              "0 1px 2px rgba(15,23,42,0.04)",
              "0 8px 22px -10px rgba(34,197,94,0.18)",
              "0 0 0 4px rgba(34,197,94,0.05)",
            ].join(", ")
          : [
              "inset 0 1px 0 rgba(255,255,255,1)",
              "0 1px 2px rgba(15,23,42,0.04)",
              "0 6px 18px -8px rgba(15,23,42,0.08)",
            ].join(", "),
      }}
    >
      {/* Phase 4 — pulse-on-increment glow ring. Fires when earnedToday
          ticks up; AnimatePresence keys on pulseKey so each increment
          re-mounts a fresh fade-in/out cycle (1.4s total). */}
      <AnimatePresence>
        {pulseKey > 0 && (
          <motion.span
            key={pulseKey}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[18px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{
              boxShadow:
                "inset 0 0 0 2px rgba(34,197,94,0.45), inset 0 0 32px rgba(34,197,94,0.18), 0 0 0 6px rgba(34,197,94,0.10)",
            }}
          />
        )}
      </AnimatePresence>
      {/* eyebrow */}
      <div className="relative px-5 sm:px-6 pt-4 sm:pt-5 pb-1.5 flex items-center justify-between">
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ color: "#15803D", fontSize: 9.5, fontWeight: 600 }}
        >
          Your device earned today
        </span>
        {onChainToday > 0 && (
          <span
            className="font-mono uppercase tracking-[0.10em]"
            style={{ color: "#9CA3AF", fontSize: 9.5 }}
          >
            {onChainToday} on-chain
          </span>
        )}
      </div>

      {/* hero number */}
      <div className="relative px-5 sm:px-6 pb-3 flex items-baseline gap-2">
        <ScrambleAmount
          value={earnedToday}
          className="font-mono text-[44px] sm:text-[64px] tracking-[-0.02em] font-light text-[#0A0A0A] leading-none"
        />
        {hasEarnings && (
          <span
            className="text-[13px] font-mono inline-flex items-center gap-0.5"
            style={{
              color: positive ? "#15803D" : "#B91C1C",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {positive ? (
              <ArrowUpRight className="w-3 h-3" strokeWidth={2.4} />
            ) : (
              <ArrowDownRight className="w-3 h-3" strokeWidth={2.4} />
            )}
          </span>
        )}
      </div>

      {/* sub-row: rate · spent · net */}
      <div
        className="relative px-5 sm:px-6 pt-2 pb-4 flex items-center gap-2.5 flex-wrap"
        style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
      >
        {earningPerMinUsd > 0 && (
          <Pill tone="green">
            +${earningPerMinUsd.toFixed(3)}/min
          </Pill>
        )}
        <Pill>
          spent <span className="font-semibold" style={{ color: "#B45309" }}>${spentToday.toFixed(2)}</span>
        </Pill>
        <Pill tone={netToday >= 0 ? "green" : "red"}>
          net {netToday >= 0 ? "+" : "−"}${Math.abs(netToday).toFixed(2)}
        </Pill>
      </div>
    </motion.div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "green" | "red";
}) {
  const color =
    tone === "green" ? "#15803D" : tone === "red" ? "#B91C1C" : "#374151";
  const bg =
    tone === "green"
      ? "rgba(34,197,94,0.10)"
      : tone === "red"
        ? "rgba(239,68,68,0.10)"
        : "rgba(15,23,42,0.04)";
  return (
    <span
      className="font-mono text-[11px] inline-flex items-center px-2 py-0.5 rounded-full"
      style={{
        background: bg,
        color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </span>
  );
}
