"use client";

/**
 * DeviceChassis — the white "physical slab" that wraps the entire /app
 * home page. Thick rounded bezel, layered drop shadows, a fine paper-grain
 * noise overlay, and a top status LED strip showing online dot, engraved
 * KVN-XXXXXXXX serial and live uptime.
 *
 * Light premium register — no dark gradients. Hardware feeling comes from
 * shadow stack, inner highlight, fine noise, and tabular-nums type.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function fmtUptime(bornIso: string | null): string {
  if (!bornIso) return "—";
  const ms = Date.parse(bornIso.replace(" ", "T") + (bornIso.includes("Z") ? "" : "Z"));
  if (isNaN(ms)) return "—";
  let diff = Math.max(0, Date.now() - ms) / 1000;
  const d = Math.floor(diff / 86400);
  diff -= d * 86400;
  const h = Math.floor(diff / 3600);
  diff -= h * 3600;
  const m = Math.floor(diff / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function DeviceChassis({
  serial,
  bornAt,
  paused,
  network,
  children,
}: {
  serial: string | null;
  bornAt: string | null;
  paused: boolean;
  network: "devnet" | "mainnet";
  children: React.ReactNode;
}) {
  // Re-render every 30s so uptime stays live without thrashing
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative w-full"
      style={{
        borderRadius: 28,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8F8FA 100%)",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,1)",
          "inset 0 0 0 1px rgba(255,255,255,0.6)",
          "0 1px 2px rgba(15,23,42,0.04)",
          "0 8px 24px -8px rgba(15,23,42,0.06)",
          "0 24px 56px -20px rgba(15,23,42,0.10)",
        ].join(", "),
      }}
    >
      {/* Fine paper-grain noise overlay (cheap CSS, no asset) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 28,
          background:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' /></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.55'/></svg>\")",
          opacity: 0.018,
          mixBlendMode: "multiply",
        }}
      />

      {/* Top inner highlight — adds the "light catching the bezel edge" cue */}
      <div
        aria-hidden
        className="absolute top-0 left-8 right-8 pointer-events-none"
        style={{
          height: 1,
          background:
            "linear-gradient(to right, transparent, rgba(255,255,255,1), transparent)",
        }}
      />

      {/* LED strip — online dot · KVN-XXXX · uptime */}
      <div
        className="relative flex items-center justify-between px-5 sm:px-6 pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <motion.span
            className="rounded-full"
            style={{
              width: 7,
              height: 7,
              background: paused ? "#EF4444" : "#22C55E",
              boxShadow: paused
                ? "0 0 0 3px rgba(239,68,68,0.12), 0 0 8px rgba(239,68,68,0.55)"
                : "0 0 0 3px rgba(34,197,94,0.12), 0 0 8px rgba(34,197,94,0.55)",
            }}
            animate={paused ? {} : { opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="font-mono text-[10px] uppercase"
            style={{
              color: paused ? "#B91C1C" : "#15803D",
              letterSpacing: "0.14em",
            }}
          >
            {paused ? "PAUSED" : "ONLINE"}
          </span>
          <span
            className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono uppercase"
            style={{
              color: "#6B7280",
              background: "rgba(15,23,42,0.04)",
              letterSpacing: "0.12em",
            }}
          >
            Solana {network}
          </span>
        </div>

        {/* Engraved serial — center on desktop, slot below on tight mobile */}
        <span
          className="font-mono text-[11px] sm:text-[12px] tracking-[0.08em]"
          style={{
            color: "#374151",
            textShadow: "0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          {serial ?? "KVN-————————"}
        </span>

        <span
          className="font-mono text-[10px] uppercase"
          style={{ color: "#9CA3AF", letterSpacing: "0.12em" }}
        >
          Up {fmtUptime(bornAt)}
        </span>
      </div>

      {/* Screen body */}
      <div className="relative px-5 sm:px-7 pt-6 pb-6">{children}</div>

      {/* Bottom engraved foot — almost invisible, but reads as hardware on close inspection */}
      <div
        className="relative flex items-center justify-center pb-3"
        style={{ borderTop: "1px solid rgba(15,23,42,0.04)" }}
      >
        <span
          className="font-mono text-[8px] uppercase tracking-[0.28em] pt-2"
          style={{ color: "#C9CDD3" }}
        >
          KYVERN · MADE FOR AGENTS
        </span>
      </div>
    </motion.div>
  );
}
