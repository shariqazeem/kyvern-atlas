"use client";

/**
 * HeroDevice — the landing page's showstopper.
 *
 * A perspective-tilted device mockup floating at the center, with three
 * orbital worker tiles (Sentinel · Wren · Pulse) circling around it.
 * The device's "screen" shows live Atlas earnings and uptime; thought
 * bubbles periodically pop from each worker showing real trio action
 * labels.
 *
 * No interaction — this is the hero canvas. CTAs live below.
 *
 * Props are pure data — `os-landing.tsx` already polls /api/atlas/status
 * every 5s and passes the latest numbers in.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const GREEN = "#22C55E";

interface HeroDeviceProps {
  totalEarnedUsd: number;
  daysLive: number;
  serial: string; // "KVN-XXXXXXXX"
}

/** The exact action templates the trio runs in production. Cycled
 *  every ~4s in the bubble layer so the hero feels alive. */
const TRIO_ACTIONS: Array<{
  emoji: string;
  workerId: "sentinel" | "wren" | "pulse";
  label: string;
}> = [
  { emoji: "🎯", workerId: "sentinel", label: "Posted $0.15 task" },
  { emoji: "🐋", workerId: "wren", label: "Claimed a job" },
  { emoji: "🐋", workerId: "wren", label: "Completed +$0.15" },
  { emoji: "📈", workerId: "pulse", label: "Staked $0.02 on SOL" },
  { emoji: "🎯", workerId: "sentinel", label: "Surfaced $10k bounty" },
  { emoji: "📈", workerId: "pulse", label: "Validated · SOL @ $145" },
];

/** Three workers placed on the orbit ring at evenly-spaced angles. */
const WORKERS: Array<{ id: "sentinel" | "wren" | "pulse"; emoji: string; angleDeg: number }> = [
  { id: "sentinel", emoji: "🎯", angleDeg: -90 },   // top
  { id: "wren", emoji: "🐋", angleDeg: 30 },        // bottom-right
  { id: "pulse", emoji: "📈", angleDeg: 150 },      // bottom-left
];

export function HeroDevice({
  totalEarnedUsd,
  daysLive,
  serial,
}: HeroDeviceProps) {
  // Cycle through the trio's action labels every 4s. The current action
  // is rendered as a bubble flying outward from its worker.
  const [actionIdx, setActionIdx] = useState(0);
  useEffect(() => {
    // Stagger the first appearance so the hero settles before bubbles fire.
    const t0 = setTimeout(() => setActionIdx((i) => (i + 1) % TRIO_ACTIONS.length), 1500);
    const iv = setInterval(
      () => setActionIdx((i) => (i + 1) % TRIO_ACTIONS.length),
      4_000,
    );
    return () => {
      clearTimeout(t0);
      clearInterval(iv);
    };
  }, []);

  const activeAction = TRIO_ACTIONS[actionIdx];
  const activeWorker = WORKERS.find((w) => w.id === activeAction.workerId)!;

  return (
    <div
      className="relative mx-auto w-full"
      style={{
        maxWidth: 460,
        aspectRatio: "1 / 1",
        perspective: "1400px",
      }}
    >
      {/* Faint outer dashed ring threading the workers */}
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-full"
        style={{
          inset: "12%",
          border: "1px dashed rgba(134,239,172,0.18)",
        }}
      />

      {/* Inner glow disc behind the device */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "70%",
          height: "70%",
          borderRadius: "50%",
          background:
            "radial-gradient(closest-side, rgba(134,239,172,0.20) 0%, rgba(34,197,94,0.06) 40%, rgba(0,0,0,0) 78%)",
          filter: "blur(2px)",
        }}
      />

      {/* The device chassis — gentle perspective tilt + slow pendulum */}
      <motion.div
        className="absolute"
        style={{
          top: "50%",
          left: "50%",
          width: "62%",
          aspectRatio: "1 / 1.18",
          transformStyle: "preserve-3d",
          x: "-50%",
          y: "-50%",
        }}
        initial={{ rotateY: -8, rotateX: 6 }}
        animate={{
          rotateY: [-8, 8, -8],
          rotateX: [6, -2, 6],
          y: ["calc(-50% + 0px)", "calc(-50% - 6px)", "calc(-50% + 0px)"],
        }}
        transition={{
          duration: 12,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        <div
          className="relative w-full h-full rounded-[28px] overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 55%, #F1F5F9 100%)",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: [
              "inset 0 1px 0 rgba(255,255,255,0.8)",
              "0 18px 42px -12px rgba(0,0,0,0.12)",
              "0 36px 72px -28px rgba(0,0,0,0.08)",
              "0 0 0 1px rgba(34,197,94,0.08)",
            ].join(", "),
          }}
        >
          {/* Top edge highlight */}
          <div
            aria-hidden
            className="absolute top-0 left-6 right-6"
            style={{
              height: 1,
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)",
            }}
          />

          {/* Status LED + serial */}
          <div className="relative flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-1.5">
              <motion.span
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: GREEN,
                  boxShadow: `0 0 0 3px rgba(34,197,94,0.18), 0 0 8px ${GREEN}`,
                }}
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <span
                className="font-mono uppercase"
                style={{
                  color: "rgba(15,23,42,0.55)",
                  fontSize: 8.5,
                  letterSpacing: "0.18em",
                }}
              >
                Atlas · live
              </span>
            </div>
            <span
              className="font-mono"
              style={{
                color: "rgba(15,23,42,0.38)",
                fontSize: 8.5,
                letterSpacing: "0.10em",
              }}
            >
              {serial}
            </span>
          </div>

          {/* "Screen" — the live earnings face */}
          <div
            className="relative mx-3 my-2 rounded-[18px] overflow-hidden"
            style={{
              background:
                "radial-gradient(140% 100% at 50% 0%, rgba(34,197,94,0.05) 0%, rgba(0,0,0,0) 70%), linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow:
                "inset 0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            {/* Faint scan-line texture for screen feel */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)",
                opacity: 0.5,
              }}
            />

            <div className="relative flex flex-col items-center justify-center px-4 py-5 sm:py-7">
              <span
                className="font-mono uppercase"
                style={{
                  color: "#15803D",
                  fontSize: 9,
                  letterSpacing: "0.20em",
                  fontWeight: 600,
                }}
              >
                Atlas earned
              </span>
              <span
                className="font-mono mt-1.5"
                style={{
                  color: "#0A0A0A",
                  fontSize: "clamp(28px, 5.6vw, 44px)",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 400,
                  letterSpacing: "-0.04em",
                  lineHeight: 1.0,
                }}
              >
                ${totalEarnedUsd.toFixed(2)}
              </span>
              <span
                className="font-mono mt-1.5"
                style={{
                  color: "rgba(15,23,42,0.45)",
                  fontSize: 9.5,
                  letterSpacing: "0.14em",
                  fontWeight: 500,
                }}
              >
                {daysLive} {daysLive === 1 ? "DAY" : "DAYS"} · DEVNET
              </span>
            </div>
          </div>

          {/* Faux connector pins along the bottom */}
          <div
            aria-hidden
            className="absolute bottom-2.5 left-5 right-5 flex justify-between"
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="rounded-sm"
                style={{
                  width: 4,
                  height: 1.5,
                  background: "rgba(231,233,238,0.18)",
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Workers on the orbit ring */}
      {WORKERS.map((w) => {
        const angle = w.angleDeg * (Math.PI / 180);
        const r = 0.46;
        const x = Math.cos(angle) * r * 100;
        const y = Math.sin(angle) * r * 100;
        const isActive = w.id === activeWorker.id;
        // Bubble flies outward from the worker (along the angle)
        const bubbleDx = Math.cos(angle) * 60;
        const bubbleDy = Math.sin(angle) * 60;

        return (
          <div
            key={w.id}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${x}%), calc(-50% + ${y}%))`,
            }}
          >
            <WorkerTile emoji={w.emoji} active={isActive} />
            <AnimatePresence>
              {isActive && (
                <motion.div
                  key={`${w.id}-${actionIdx}`}
                  className="absolute pointer-events-none whitespace-nowrap font-mono"
                  initial={{
                    opacity: 0,
                    x: 0,
                    y: 0,
                    scale: 0.7,
                  }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    x: bubbleDx,
                    y: bubbleDy,
                    scale: 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 3.5,
                    times: [0, 0.15, 0.75, 1],
                    ease: "easeOut",
                  }}
                  style={{
                    top: "50%",
                    left: "50%",
                    fontSize: 10.5,
                    fontWeight: 500,
                    color: "#0A0A0A",
                    background:
                      "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(15,23,42,0.08)",
                    borderRadius: 10,
                    padding: "6px 12px",
                    boxShadow:
                      "0 8px 22px rgba(0,0,0,0.08), 0 0 0 4px rgba(255,255,255,0.4)",
                    transformOrigin: "center",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {activeAction.label}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   WorkerTile — round chip with emoji + always-on outer ring + optional
   rotating dashed accent when "active" (the current bubble worker).
   ──────────────────────────────────────────────────────────────────── */

function WorkerTile({ emoji, active }: { emoji: string; active: boolean }) {
  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-[22px] sm:text-[26px]"
        style={{
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: active
            ? `0 0 0 2px rgba(34,197,94,0.4), 0 8px 24px rgba(34,197,94,0.15), inset 0 1px 0 rgba(255,255,255,0.8)`
            : "0 6px 14px -4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        {emoji}
      </motion.div>
      {active && (
        <motion.div
          aria-hidden
          className="absolute inset-[-6px] rounded-full pointer-events-none"
          style={{ border: "1.25px dashed rgba(34,197,94,0.4)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Helper to derive a stable serial from Atlas's first-ignition string.
   Re-exported so /atlas-landing-page can pass the same value here.
   ──────────────────────────────────────────────────────────────────── */

export function deriveAtlasSerial(firstIgnitionAt: string | null): string {
  if (!firstIgnitionAt) return "KVN-________";
  // Hash the ISO string into a stable 8-char base58-ish slug
  const digits = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let h = 0;
  for (let i = 0; i < firstIgnitionAt.length; i++) {
    h = (h * 31 + firstIgnitionAt.charCodeAt(i)) >>> 0;
  }
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += digits[h % digits.length];
    h = Math.floor(h / digits.length) || (h * 17) >>> 0;
  }
  return `KVN-${s}`;
}

export function useDaysSince(iso: string | null): number {
  return useMemo(() => {
    if (!iso) return 0;
    const t = Date.parse(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
    if (isNaN(t)) return 0;
    return Math.max(1, Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000)));
  }, [iso]);
}
