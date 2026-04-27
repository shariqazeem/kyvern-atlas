"use client";

/**
 * BalanceOrbit — the visual centrepiece of the device home.
 *
 * Center: the live USDC balance, scrambling on every change. Just below
 * it, a small mono PnL row with sparkline-coloured arrow. Around it: an
 * orbital ring of worker "modules" — round white tiles with the worker's
 * emoji, soft drop shadow, fine border. Active workers (`isThinking`)
 * have a rotating dashed accent ring plus an occasional thought bubble
 * that floats outward from the worker for ~3s before fading.
 *
 * The orbit is placed via cos/sin transforms — no DOM-level rotation —
 * so emojis stay upright. A faint dashed circle behind everything visually
 * threads the workers together like a circuit trace.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

interface OrbitWorker {
  id: string;
  name: string;
  emoji: string;
  isThinking: boolean;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const THOUGHT_SAMPLES = [
  "scanning…",
  "watching…",
  "earning…",
  "calculating…",
  "checking…",
  "listening…",
  "ranking…",
];

/* ── ScrambleNumber ─────────────────────────────────────────────────── */

function ScrambleNumber({
  value,
  prefix = "$",
  decimals = 2,
  className,
}: {
  value: number;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(`${prefix}${value.toFixed(decimals)}`);
  const targetRef = useRef(display);
  useEffect(() => {
    const next = `${prefix}${value.toFixed(decimals)}`;
    if (next === targetRef.current) return;
    targetRef.current = next;
    const start = performance.now();
    const duration = 650;
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
  }, [value, prefix, decimals]);
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
}

/* ── Worker tile ────────────────────────────────────────────────────── */

function WorkerTile({
  emoji,
  thinking,
  name,
}: {
  emoji: string;
  thinking: boolean;
  name: string;
}) {
  return (
    <div className="relative" title={name}>
      {/* always-on subtle outer ring — signals "plugged in" even at rest */}
      <div
        aria-hidden
        className="absolute inset-[-3px] rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(15,23,42,0.05)" }}
      />
      <motion.div
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.6 }}
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-[18px] sm:text-[22px] relative z-10"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F4F5F7 100%)",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: thinking
            ? "0 0 0 1.5px rgba(34,197,94,0.32), 0 0 14px rgba(34,197,94,0.18), 0 1px 2px rgba(15,23,42,0.05)"
            : "0 1px 2px rgba(15,23,42,0.04), 0 4px 10px -4px rgba(15,23,42,0.05)",
        }}
      >
        {emoji}
      </motion.div>
      {thinking && (
        <motion.div
          aria-hidden
          className="absolute inset-[-5px] rounded-full pointer-events-none"
          style={{ border: "1.25px dashed rgba(34,197,94,0.7)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}

/* ── Orbit ──────────────────────────────────────────────────────────── */

interface BalanceOrbitProps {
  usdcBalance: number;
  pnlNet: number;
  earningPerMinUsd: number;
  workers: OrbitWorker[];
  /** Path to navigate to when tapping a worker. */
  workerHref: (id: string) => string;
  /** Path for the "+" hire-a-worker tile. */
  hireHref: string;
}

export function BalanceOrbit({
  usdcBalance,
  pnlNet,
  earningPerMinUsd,
  workers,
  workerHref,
  hireHref,
}: BalanceOrbitProps) {
  const items = useMemo(() => {
    const list: Array<
      | { kind: "worker"; w: OrbitWorker }
      | { kind: "hire" }
      | { kind: "empty"; idx: number }
    > = workers.slice(0, 7).map((w) => ({ kind: "worker", w }));
    list.push({ kind: "hire" });
    // Always render at least 6 slots so the ring reads as a circle even with
    // 1–2 workers — empty slots become faint placeholder dots.
    while (list.length < 6) list.push({ kind: "empty", idx: list.length });
    return list;
  }, [workers]);

  // Cycle through the active workers, surfacing one thought bubble at a time
  const thinkers = useMemo(
    () => workers.filter((w) => w.isThinking),
    [workers],
  );
  const [bubbleIdx, setBubbleIdx] = useState(0);
  const [bubbleText, setBubbleText] = useState<string>(THOUGHT_SAMPLES[0]);
  const [bubbleVisible, setBubbleVisible] = useState(false);

  useEffect(() => {
    if (thinkers.length === 0) {
      setBubbleVisible(false);
      return;
    }
    let alive = true;
    const cycle = () => {
      if (!alive) return;
      setBubbleIdx((i) => (i + 1) % Math.max(1, thinkers.length));
      setBubbleText(
        THOUGHT_SAMPLES[Math.floor(Math.random() * THOUGHT_SAMPLES.length)],
      );
      setBubbleVisible(true);
      setTimeout(() => alive && setBubbleVisible(false), 2800);
    };
    // Wait a beat on mount, then fire every ~6s
    const t0 = setTimeout(cycle, 1200);
    const iv = setInterval(cycle, 6500);
    return () => {
      alive = false;
      clearTimeout(t0);
      clearInterval(iv);
    };
  }, [thinkers.length]);

  const netPositive = pnlNet >= 0;
  const netColor = netPositive ? "#15803D" : "#B91C1C";

  // Orbit geometry — square stage, radius scales with viewport via CSS
  // Mobile fallback radius 110, desktop 138 (set via inline style + media queries).
  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Stage holds the orbit. Square aspect via aspect-square. */}
      <div
        className="relative mx-auto"
        style={{
          width: "100%",
          maxWidth: 360,
          aspectRatio: "1 / 1",
        }}
      >
        {/* Faint dashed ring threading the workers */}
        <div
          aria-hidden
          className="absolute inset-[18%] rounded-full pointer-events-none"
          style={{ border: "1px dashed rgba(15,23,42,0.07)" }}
        />
        {/* Inner soft glow disc behind the balance */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "62%",
            height: "62%",
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(34,197,94,0.06) 0%, rgba(255,255,255,0) 70%)",
          }}
        />

        {/* Center — balance + PnL */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
        >
          <ScrambleNumber
            value={usdcBalance}
            prefix="$"
            decimals={2}
            className="font-mono text-[#0A0A0A] text-[34px] sm:text-[52px] leading-none tracking-tight font-light"
          />
          <div
            className="mt-2 font-mono text-[11px] sm:text-[12px] flex items-center gap-1.5"
            style={{ color: netColor, fontVariantNumeric: "tabular-nums" }}
          >
            <span>{netPositive ? "↑" : "↓"}</span>
            <span>
              {netPositive ? "+" : ""}
              {pnlNet.toFixed(2)} today
            </span>
            {earningPerMinUsd > 0 && (
              <>
                <span style={{ color: "#D1D5DB" }}>·</span>
                <span style={{ color: "#6B7280" }}>
                  {earningPerMinUsd.toFixed(3)}/min
                </span>
              </>
            )}
          </div>
        </div>

        {/* Workers placed on the ring */}
        {items.map((it, i) => {
          const angle = (-90 + (360 / items.length) * i) * (Math.PI / 180);
          // radius as % of half-width — sized so worker tiles clear the
          // hero balance text on a 300px-wide chassis (iPhone SE).
          const r = 0.46;
          const x = Math.cos(angle) * r * 100;
          const y = Math.sin(angle) * r * 100;
          const positionStyle: React.CSSProperties = {
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${x}%), calc(-50% + ${y}%))`,
          };

          if (it.kind === "worker") {
            const isBubbleHere =
              bubbleVisible &&
              thinkers[bubbleIdx % Math.max(1, thinkers.length)]?.id ===
                it.w.id;
            // Bubble flies outward (away from center). Use angle to place.
            const bubbleDx = Math.cos(angle) * 32;
            const bubbleDy = Math.sin(angle) * 32;
            return (
              <div key={`w-${it.w.id}`} style={positionStyle}>
                <Link
                  href={workerHref(it.w.id)}
                  className="block"
                  aria-label={`Open ${it.w.name}`}
                >
                  <WorkerTile
                    emoji={it.w.emoji}
                    thinking={it.w.isThinking}
                    name={it.w.name}
                  />
                </Link>
                <AnimatePresence>
                  {isBubbleHere && (
                    <motion.div
                      key="bubble"
                      initial={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: bubbleDx,
                        y: bubbleDy,
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{
                        duration: 0.32,
                        ease: EASE,
                      }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none whitespace-nowrap font-mono text-[10px] px-2 py-1 rounded-full"
                      style={{
                        background: "#FFFFFF",
                        color: "#374151",
                        border: "1px solid rgba(15,23,42,0.08)",
                        boxShadow:
                          "0 1px 2px rgba(15,23,42,0.05), 0 6px 14px -6px rgba(15,23,42,0.10)",
                      }}
                    >
                      {bubbleText}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          if (it.kind === "hire") {
            return (
              <div key="hire" style={positionStyle}>
                <Link
                  href={hireHref}
                  aria-label="Hire a worker"
                  className="block"
                >
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 22,
                      mass: 0.6,
                    }}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(15,23,42,0.02)",
                      border: "1px dashed rgba(15,23,42,0.18)",
                      color: "#6B7280",
                    }}
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.8} />
                  </motion.div>
                </Link>
              </div>
            );
          }

          // empty slot — barely visible placeholder
          return (
            <div key={`e-${it.idx}`} style={positionStyle} aria-hidden>
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "rgba(15,23,42,0.06)" }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
