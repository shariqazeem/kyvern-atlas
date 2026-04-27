"use client";

/**
 * HeroDeviceStage — wraps the existing dark KyvernDevice on the landing
 * hero with five small "worker satellites" that float at fixed points
 * around the device, gently breathing. Subtle ambient sway tilts the
 * whole stage when the user isn't hovering the device — when they hover,
 * the device's own mouse-tracked tilt takes over and the sway pauses.
 *
 * Pure CSS + Framer Motion. No new dependencies. The device itself is
 * untouched — this is purely orbital chrome.
 */

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

interface SatelliteSpec {
  emoji: string;
  /** Position relative to the centered device, in % of stage. */
  x: number;
  y: number;
  /** Breathe phase offset, seconds. */
  phase: number;
}

const SATELLITES: SatelliteSpec[] = [
  { emoji: "🔭", x: -38, y: -34, phase: 0 },
  { emoji: "🛡️", x: 36, y: -28, phase: 0.6 },
  { emoji: "👁️", x: -42, y: 18, phase: 1.2 },
  { emoji: "🪙", x: 40, y: 22, phase: 1.8 },
  { emoji: "📡", x: 0, y: -44, phase: 2.4 },
];

export function HeroDeviceStage({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ perspective: 1400, perspectiveOrigin: "50% 30%" }}
    >
      {/* Subtle floor glow under the device */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: "50%",
          bottom: -10,
          transform: "translateX(-50%)",
          width: "70%",
          height: 28,
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(15,23,42,0.10) 0%, rgba(15,23,42,0) 70%)",
          filter: "blur(2px)",
        }}
      />

      {/* Stage — gentle ambient sway when not hovered */}
      <motion.div
        className="relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={
          hovered
            ? { rotateY: 0, rotateX: 0 }
            : { rotateY: [-2, 2, -2], rotateX: [-1, 0.5, -1] }
        }
        transition={
          hovered
            ? { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
            : { duration: 18, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {/* The device */}
        <div className="relative z-[1]">{children}</div>

        {/* Worker satellites — floating round tiles plugged into the device */}
        {SATELLITES.map((s, i) => (
          <Satellite key={i} spec={s} />
        ))}
      </motion.div>
    </div>
  );
}

function Satellite({ spec }: { spec: SatelliteSpec }) {
  return (
    <motion.div
      className="absolute pointer-events-none z-[2]"
      style={{
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${spec.x}%), calc(-50% + ${spec.y}%))`,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: 0.7 + spec.phase * 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <motion.div
        className="rounded-full flex items-center justify-center text-[16px] sm:text-[18px]"
        style={{
          width: 36,
          height: 36,
          background: "linear-gradient(180deg, #FFFFFF 0%, #F2F3F5 100%)",
          border: "1px solid rgba(15,23,42,0.10)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "0 1px 2px rgba(15,23,42,0.06)",
            "0 8px 18px -8px rgba(15,23,42,0.18)",
          ].join(", "),
        }}
        animate={{ y: [0, -3, 0], scale: [1, 1.04, 1] }}
        transition={{
          duration: 4.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: spec.phase,
        }}
      >
        {spec.emoji}
      </motion.div>

      {/* Faint ring around each satellite — reads as "powered" */}
      <div
        aria-hidden
        className="absolute inset-[-3px] rounded-full pointer-events-none"
        style={{ border: "1px dashed rgba(15,23,42,0.08)" }}
      />
    </motion.div>
  );
}
