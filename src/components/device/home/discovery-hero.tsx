"use client";

/**
 * DiscoveryHero — the Phase 6 reframe of the device home.
 *
 * Replaces the old EarningsHero. Leads with the **discovery** the user
 * cares about ("your workers found N opportunities today") instead of
 * the closed-circuit `$0.00 earned today` headline. The economic loop
 * is still proven by the ActionFeed below + the small "Economy" pill
 * at the bottom of this card.
 *
 * Why: the trio (Sentinel, Wren, Pulse) shuffles dollars between
 * themselves via Atlas treasury. Net to the user is ~$0. The actual
 * value is *what they discovered* — real Superteam bounties, real
 * whale moves, real band breaches. That's what /app should headline.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  YOUR WORKERS FOUND TODAY                                    │
 *   │                                                              │
 *   │  3 opportunities                                  ↑          │
 *   │                                                              │
 *   │  $58k surfaced · 2 validated · 1 actionable                  │
 *   │  ──────────────────────────────────────────────              │
 *   │  Economy · $0.30 earned by workers · 12 events  →            │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Pulse-on-increment glow ring fires every time `opportunitiesToday`
 * ticks up (mirrors the EarningsHero pattern). Empty state asks the
 * user to wait — "Workers are watching, first finds land soon."
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Small integer scrambler — same pattern as ScrambleAmount in the
 *  old EarningsHero, but for whole numbers (the count of opportunities
 *  doesn't need cents). */
function ScrambleCount({
  value,
  className,
  style,
}: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(String(value));
  const targetRef = useRef(display);
  useEffect(() => {
    const next = String(value);
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
    <span
      className={className}
      style={{ fontVariantNumeric: "tabular-nums", ...style }}
    >
      {display}
    </span>
  );
}

/** Format a USD figure with k/M suffixes for big values. */
function fmtSurfaced(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  if (n >= 1) return `$${Math.round(n)}`;
  if (n > 0) return `$${n.toFixed(2)}`;
  return "$0";
}

interface DiscoveryHeroProps {
  /** Phase 6 — count of high-value findings today (opportunity +
   *  market_intel + legacy bounty/wallet_move/announcement/release). */
  opportunitiesToday: number;
  /** Sum of largest dollar amounts parsed from those signals' subject
   *  + evidence. Approximation — finds with no $ amount contribute 0. */
  surfacedValueUsd: number;
  /** Completed validation/research tasks today on this device. */
  validatedToday: number;
  /** Unread signals with a sourceUrl the user can click to act. */
  actionableToday: number;
  /** The closed-loop economy as a small proof pill, not the headline.
   *  Sum of all earnings logged on the device today. */
  earnedToday: number;
  /** On-chain settlements logged today (drives the "12 events" copy). */
  onChainToday: number;
  /** Number of workers currently alive (drives the empty-state copy). */
  workersActive: number;
}

export function DiscoveryHero({
  opportunitiesToday,
  surfacedValueUsd,
  validatedToday,
  actionableToday,
  earnedToday,
  onChainToday,
  workersActive,
}: DiscoveryHeroProps) {
  const hasFinds = opportunitiesToday > 0;

  // Phase 4-style pulse on increment. When opportunitiesToday ticks up,
  // fire a 1.4s green-glow ring overlay. AnimatePresence keys on a
  // counter so re-mounts trigger fresh fade cycles.
  const prevOppRef = useRef(opportunitiesToday);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (opportunitiesToday > prevOppRef.current) {
      setPulseKey((k) => k + 1);
    }
    prevOppRef.current = opportunitiesToday;
  }, [opportunitiesToday]);

  // Empty state — workers running but no qualifying finds yet
  if (!hasFinds) {
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
            Your workers found today
          </p>
          <p className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-[#0A0A0A] leading-snug">
            Workers are watching.
          </p>
          <p
            className="mt-1.5 text-[13px] leading-[1.55]"
            style={{ color: "#6B7280" }}
          >
            {workersActive > 0
              ? `${workersActive} worker${workersActive === 1 ? "" : "s"} scanning real sources — first finds land soon.`
              : "Hire a worker to start scanning bounty boards, wallets, and feeds."}
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
        background: "linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 65%)",
        border: "1px solid rgba(34,197,94,0.20)",
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,1)",
          "0 1px 2px rgba(15,23,42,0.04)",
          "0 8px 22px -10px rgba(34,197,94,0.18)",
          "0 0 0 4px rgba(34,197,94,0.05)",
        ].join(", "),
      }}
    >
      {/* Pulse-on-increment glow ring (Phase 4 pattern) — fires every
          time opportunitiesToday ticks up. */}
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

      {/* Eyebrow */}
      <div className="relative px-5 sm:px-6 pt-4 sm:pt-5 pb-1.5 flex items-center justify-between">
        <span
          className="font-mono uppercase tracking-[0.14em] inline-flex items-center gap-1.5"
          style={{ color: "#15803D", fontSize: 9.5, fontWeight: 600 }}
        >
          <Sparkles className="w-3 h-3" strokeWidth={2.4} />
          Your workers found today
        </span>
        {actionableToday > 0 && (
          <span
            className="font-mono uppercase tracking-[0.10em]"
            style={{ color: "#9CA3AF", fontSize: 9.5 }}
          >
            {actionableToday} actionable
          </span>
        )}
      </div>

      {/* Hero count + arrow */}
      <div className="relative px-5 sm:px-6 pb-3 flex items-baseline gap-2">
        <ScrambleCount
          value={opportunitiesToday}
          className="font-mono text-[44px] sm:text-[64px] tracking-[-0.02em] font-light text-[#0A0A0A] leading-none"
        />
        <span
          className="text-[15px] sm:text-[17px] tracking-tight font-medium"
          style={{ color: "#0A0A0A" }}
        >
          {opportunitiesToday === 1 ? "opportunity" : "opportunities"}
        </span>
        <span
          className="text-[13px] font-mono inline-flex items-center gap-0.5"
          style={{
            color: "#15803D",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <ArrowUpRight className="w-3 h-3" strokeWidth={2.4} />
        </span>
      </div>

      {/* Sub-row pills */}
      <div
        className="relative px-5 sm:px-6 pt-2 pb-3 flex items-center gap-2.5 flex-wrap"
        style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
      >
        {surfacedValueUsd > 0 && (
          <Pill tone="green">
            {fmtSurfaced(surfacedValueUsd)} surfaced
          </Pill>
        )}
        <Pill>
          <span style={{ color: "#374151" }}>{validatedToday}</span>
          <span style={{ color: "#9CA3AF", marginLeft: 4 }}>validated</span>
        </Pill>
        {actionableToday > 0 && (
          <Pill tone="amber">
            {actionableToday} actionable
          </Pill>
        )}
      </div>

      {/* Economy proof bar — closed-loop economic loop demoted to a
          small footer pill. The discovery is the headline; the on-chain
          economic loop is the proof. */}
      <Link
        href="/app/tasks"
        className="relative block px-5 sm:px-6 py-2.5 hover:bg-[rgba(15,23,42,0.02)] transition group"
        style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span
            className="font-mono inline-flex items-center gap-1.5"
            style={{
              color: "#6B7280",
              fontSize: 11,
              letterSpacing: "0.02em",
            }}
          >
            <span
              className="rounded-full"
              style={{
                width: 5,
                height: 5,
                background: earnedToday > 0 ? "#15803D" : "#9CA3AF",
                boxShadow:
                  earnedToday > 0
                    ? "0 0 0 2px rgba(34,197,94,0.18)"
                    : undefined,
              }}
            />
            <span style={{ color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.10em", fontSize: 9.5 }}>
              Economy
            </span>
            <span
              style={{
                color: "#0A0A0A",
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ${earnedToday.toFixed(2)} earned by workers
            </span>
            {onChainToday > 0 && (
              <>
                <span style={{ color: "#D1D5DB" }}>·</span>
                <span style={{ color: "#374151", fontVariantNumeric: "tabular-nums" }}>
                  {onChainToday} on-chain {onChainToday === 1 ? "event" : "events"}
                </span>
              </>
            )}
          </span>
          <span
            className="font-mono uppercase tracking-[0.14em] inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
            style={{ color: "#6B7280", fontSize: 9.5 }}
          >
            View loop →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "green" | "amber";
}) {
  const color =
    tone === "green" ? "#15803D" : tone === "amber" ? "#B45309" : "#374151";
  const bg =
    tone === "green"
      ? "rgba(34,197,94,0.10)"
      : tone === "amber"
        ? "rgba(245,158,11,0.10)"
        : "rgba(15,23,42,0.04)";
  return (
    <span
      className="font-mono text-[11px] inline-flex items-center px-2 py-0.5 rounded-full"
      style={{
        background: bg,
        color,
        fontVariantNumeric: "tabular-nums",
        fontWeight: tone ? 600 : 400,
      }}
    >
      {children}
    </span>
  );
}
