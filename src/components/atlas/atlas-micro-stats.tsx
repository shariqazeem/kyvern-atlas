"use client";

/**
 * Smaller stat strip beneath the hero row on /atlas.
 *
 * Three reads: settlements · USDC earned · USDC spent.
 * Same NumberScramble component, smaller type, same dark register.
 */

import { motion } from "framer-motion";
import { NumberScramble } from "./number-scramble";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface MicroStatsProps {
  totalSettled: number;
  totalEarnedUsd: number;
  totalSpentUsd: number;
}

function Cell({
  label,
  children,
  delay,
}: {
  label: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className="flex items-baseline gap-2"
    >
      <span
        className="font-mono"
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: "18px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {children}
      </span>
      <span
        className="font-mono uppercase"
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: "11px",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

export function AtlasMicroStats({
  totalSettled,
  totalEarnedUsd,
  totalSpentUsd,
}: MicroStatsProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-2">
      <Cell label="settled" delay={0.0}>
        <NumberScramble value={totalSettled} format={(n) => n.toLocaleString()} />
      </Cell>
      <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
      <Cell label="earned" delay={0.04}>
        <span style={{ color: "#86EFAC" }}>
          <NumberScramble value={totalEarnedUsd} format={(n) => `$${n.toFixed(2)}`} />
        </span>
      </Cell>
      <span style={{ color: "rgba(255,255,255,0.18)" }}>·</span>
      <Cell label="spent" delay={0.08}>
        <NumberScramble value={totalSpentUsd} format={(n) => `$${n.toFixed(2)}`} />
      </Cell>
    </div>
  );
}
