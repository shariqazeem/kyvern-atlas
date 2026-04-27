"use client";

/**
 * AtlasDevicePlinth — the museum centrepiece for /atlas.
 *
 * A rendered Atlas device sitting on a trapezoidal pedestal, lit from
 * above by a soft radial spotlight. The device tilts back-and-forth on
 * a ~14s cycle and breathes (~6s scale loop). The screen shows live
 * uptime + the canonical KVN-0000 serial. A tiny brass-style plaque on
 * the stand reads "EXHIBIT NO. 001 · KVN-0000".
 *
 * Stays in dark hardware register (the locked Atlas exception). Pure
 * CSS + Framer Motion — no Three.js, no images.
 */

import { motion } from "framer-motion";
import { LiveTimer } from "./live-timer";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface AtlasDevicePlinthProps {
  firstIgnitionAt: string | null;
  totalCycles: number;
  totalAttacksBlocked: number;
}

export function AtlasDevicePlinth({
  firstIgnitionAt,
  totalCycles,
  totalAttacksBlocked,
}: AtlasDevicePlinthProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative mx-auto mb-12"
      style={{
        maxWidth: 540,
        perspective: 1200,
        perspectiveOrigin: "50% 30%",
      }}
    >
      {/* Soft spotlight from above */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: "50%",
          top: "-4%",
          transform: "translateX(-50%)",
          width: "70%",
          height: "60%",
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 70%)",
          filter: "blur(4px)",
          zIndex: 0,
        }}
      />

      {/* Floor shadow under the plinth */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: "50%",
          bottom: -12,
          transform: "translateX(-50%)",
          width: "55%",
          height: 28,
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(2px)",
          zIndex: 0,
        }}
      />

      {/* Stage that holds device + plinth — tilts together */}
      <motion.div
        className="relative"
        style={{ transformStyle: "preserve-3d", zIndex: 1 }}
        animate={{ rotateY: [-3.2, 3.2, -3.2], rotateX: [-1.5, 1, -1.5] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Device — breathing scale on top of the parent's tilt */}
        <motion.div
          className="relative mx-auto rounded-[26px] overflow-hidden"
          style={{
            width: "92%",
            background:
              "radial-gradient(120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: [
              "inset 0 1px 0 rgba(255,255,255,0.10)",
              "0 1px 2px rgba(0,0,0,0.40)",
              "0 24px 48px -16px rgba(0,0,0,0.55)",
              "0 36px 72px -28px rgba(0,0,0,0.60)",
            ].join(", "),
          }}
          animate={{ scale: [1, 1.012, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Top edge highlight */}
          <div
            aria-hidden
            className="absolute top-0 left-8 right-8 pointer-events-none"
            style={{
              height: 1,
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.22), transparent)",
            }}
          />

          {/* Fine noise overlay */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' /></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.5'/></svg>\")",
              opacity: 0.04,
              mixBlendMode: "overlay",
            }}
          />

          {/* LED strip */}
          <div
            className="relative flex items-center justify-between px-5 pt-3.5 pb-2.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <motion.span
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: "#22C55E",
                  boxShadow:
                    "0 0 0 3px rgba(34,197,94,0.16), 0 0 10px rgba(34,197,94,0.65)",
                }}
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span
                className="font-mono text-[10px] uppercase"
                style={{
                  color: "rgba(134,239,172,0.95)",
                  letterSpacing: "0.14em",
                }}
              >
                ONLINE · DEVNET
              </span>
            </div>
            <span
              className="font-mono text-[11px] tracking-[0.10em]"
              style={{ color: "rgba(255,255,255,0.78)" }}
            >
              KVN-0000
            </span>
          </div>

          {/* Screen body — live uptime hero */}
          <div className="relative px-5 pt-7 pb-6 text-center">
            <div
              className="font-mono uppercase"
              style={{
                color: "rgba(255,255,255,0.42)",
                fontSize: 10,
                letterSpacing: "0.16em",
              }}
            >
              Continuous uptime
            </div>
            <div
              className="font-mono mt-2 leading-none tracking-tight"
              style={{
                color: "rgba(255,255,255,0.96)",
                fontSize: "clamp(42px, 7vw, 64px)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 300,
              }}
            >
              {firstIgnitionAt ? (
                <LiveTimer since={firstIgnitionAt} />
              ) : (
                <span style={{ color: "rgba(255,255,255,0.45)" }}>—</span>
              )}
            </div>

            {/* Sub-stats row */}
            <div
              className="grid grid-cols-3 gap-0 mt-6 rounded-[12px] overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <SubStat
                label="cycles"
                value={totalCycles.toLocaleString()}
              />
              <SubStat
                label="attacks blocked"
                value={totalAttacksBlocked.toLocaleString()}
                divider
              />
              <SubStat label="funds lost" value="$0.00" divider tone="#86EFAC" />
            </div>
          </div>

          {/* Bottom engraving */}
          <div
            className="relative flex items-center justify-center pb-2.5 pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span
              className="font-mono uppercase"
              style={{
                color: "rgba(255,255,255,0.30)",
                fontSize: 8,
                letterSpacing: "0.32em",
              }}
            >
              ATLAS · MADE FOR AGENTS
            </span>
          </div>
        </motion.div>

        {/* Plinth — trapezoidal pedestal under the device */}
        <div
          aria-hidden
          className="relative mx-auto"
          style={{
            width: "78%",
            height: 28,
            marginTop: -2,
            background:
              "linear-gradient(180deg, #1B2230 0%, #080B14 100%)",
            clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 14px -6px rgba(0,0,0,0.6)",
          }}
        />

        {/* Brass plaque on the plinth */}
        <div
          className="relative mx-auto -mt-[18px] z-[2] flex items-center justify-center"
          style={{ width: "fit-content" }}
        >
          <div
            className="font-mono px-2.5 py-1 rounded-[3px]"
            style={{
              background:
                "linear-gradient(180deg, #2A2418 0%, #1A1610 100%)",
              border: "1px solid rgba(207,170,90,0.35)",
              color: "rgba(225,194,130,0.85)",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              boxShadow:
                "inset 0 1px 0 rgba(255,224,155,0.18), 0 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            Exhibit No. 001 · Atlas
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SubStat({
  label,
  value,
  divider,
  tone,
}: {
  label: string;
  value: string;
  divider?: boolean;
  tone?: string;
}) {
  return (
    <div
      className="px-2 py-2 flex flex-col items-center text-center"
      style={
        divider
          ? { borderLeft: "1px solid rgba(255,255,255,0.06)" }
          : undefined
      }
    >
      <span
        className="font-mono"
        style={{
          color: tone ?? "rgba(255,255,255,0.92)",
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase mt-0.5"
        style={{
          color: "rgba(255,255,255,0.40)",
          fontSize: 8.5,
          letterSpacing: "0.14em",
        }}
      >
        {label}
      </span>
    </div>
  );
}
