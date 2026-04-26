"use client";

/**
 * Three-stat hero row for /atlas.
 *
 *   ┌──────────┐  ┌──────────┐  ┌──────────┐
 *   │ 6d 14h   │  │  $0.00   │  │  1,014   │
 *   │ uptime   │  │ funds    │  │ attacks  │
 *   │          │  │ lost     │  │ blocked  │
 *   └──────────┘  └──────────┘  └──────────┘
 *
 * Numbers are JetBrains Mono, ~72px desktop / ~44px mobile, ticking
 * live. Uptime is computed live from firstIgnitionAt by <LiveTimer/>;
 * funds lost is hardcoded $0 (the policy program guarantees this);
 * attacks blocked uses NumberScramble on update.
 */

import { motion } from "framer-motion";
import { LiveTimer } from "./live-timer";
import { NumberScramble } from "./number-scramble";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface HeroStatsProps {
  firstIgnitionAt: string | null;
  attacksBlocked: number;
}

function StatCell({
  label,
  children,
  accent,
  delay = 0,
}: {
  label: string;
  children: React.ReactNode;
  accent?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className="flex flex-col"
    >
      <div
        className="font-mono leading-none tracking-tight"
        style={{
          color: accent ?? "rgba(255,255,255,0.96)",
          fontSize: "clamp(40px, 8.5vw, 72px)",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 300,
        }}
      >
        {children}
      </div>
      <div
        className="font-mono mt-3 uppercase"
        style={{
          color: "rgba(255,255,255,0.42)",
          fontSize: "11px",
          letterSpacing: "0.14em",
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}

export function AtlasHeroStats({ firstIgnitionAt, attacksBlocked }: HeroStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-8 mb-10">
      <StatCell label="alive" delay={0.05}>
        {firstIgnitionAt ? (
          <LiveTimer since={firstIgnitionAt} />
        ) : (
          <span style={{ color: "rgba(255,255,255,0.45)" }}>—</span>
        )}
      </StatCell>
      <StatCell label="funds lost" accent="#86EFAC" delay={0.12}>
        $0.00
      </StatCell>
      <StatCell label="attacks blocked" delay={0.19}>
        <NumberScramble
          value={attacksBlocked}
          format={(n) => n.toLocaleString()}
          duration={620}
        />
      </StatCell>
    </div>
  );
}
