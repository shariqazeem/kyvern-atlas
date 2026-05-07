"use client";

/**
 * IdentityStrip — Phase 1 (Device Shell Redesign).
 *
 * One full-width line at the top of /app. Three left-aligned items +
 * two right-aligned items, separated by middle dots:
 *
 *   ●  KVN-1LQOFFOU  ·  Solana devnet  ·  Up 8h 7m       VAULT $0.89  ·  🛡 Squads
 *
 * Replaces the legacy two-row TopRail + the chassis bezel's LED strip.
 * Vault balance lives ONCE on the page now (here). The canvas's slim
 * vault no longer renders the dollar amount.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface Props {
  serial: string | null;
  bornAt: string | null;
  network: "devnet" | "mainnet";
  paused: boolean;
  usdcBalance: number;
  className?: string;
}

export function IdentityStrip({
  serial,
  bornAt,
  network,
  paused,
  usdcBalance,
  className,
}: Props) {
  const uptime = useUptime(bornAt);

  return (
    <header
      className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 ${className ?? ""}`}
      style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}
    >
      {/* Online LED — pulsing green / amber if paused */}
      <motion.span
        className="rounded-full flex-shrink-0"
        style={{
          width: 7,
          height: 7,
          background: paused ? "#F59E0B" : "#22C55E",
          boxShadow: paused
            ? "0 0 0 3px rgba(245,158,11,0.12), 0 0 8px rgba(245,158,11,0.55)"
            : "0 0 0 3px rgba(34,197,94,0.12), 0 0 8px rgba(34,197,94,0.55)",
        }}
        animate={paused ? {} : { opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        aria-label={paused ? "paused" : "online"}
      />

      {/* Serial — engraved typography */}
      <span
        className="font-mono text-[12px] sm:text-[13px] font-medium tracking-[0.04em] truncate flex-shrink-0"
        style={{ color: "#0A0A0A" }}
      >
        {serial ?? "KVN-————————"}
      </span>

      {/* Separator + meta — hide network on very narrow viewports */}
      <Sep />
      <span
        className="text-[12.5px] hidden sm:inline truncate"
        style={{ color: "#6B7280" }}
      >
        Solana {network}
      </span>
      <Sep className="hidden sm:inline" />
      <span
        className="text-[12.5px] truncate"
        style={{ color: "#6B7280" }}
      >
        Up {uptime}
      </span>

      {/* Spacer pushes the right group to the edge */}
      <div className="flex-1" />

      {/* Vault balance — primary right-aligned identity item */}
      <span
        className="font-mono text-[14px] sm:text-[15px] font-semibold tabular-nums flex-shrink-0"
        style={{ color: "#0A0A0A", letterSpacing: "-0.005em" }}
      >
        VAULT ${usdcBalance.toFixed(2)}
      </span>

      {/* Squads pill — small attribution */}
      <Sep />
      <span
        className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] flex-shrink-0"
        style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
      >
        <ShieldCheck className="w-3 h-3" strokeWidth={2} />
        <span className="hidden sm:inline">Squads</span>
      </span>
    </header>
  );
}

function Sep({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex-shrink-0 ${className ?? ""}`}
      style={{ color: "rgba(15,23,42,0.20)", fontSize: 12 }}
    >
      ·
    </span>
  );
}

/** Uptime in compact "Xd Yh" / "Xh Ym" / "Xm" format. Re-evaluates
 *  every 60s so the strip stays live without thrash. */
function useUptime(iso: string | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(iv);
  }, []);
  if (!iso) return "0m";
  const t = Date.parse(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  if (isNaN(t)) return "0m";
  let secs = Math.max(0, Math.floor((now - t) / 1000));
  const d = Math.floor(secs / 86400);
  secs -= d * 86400;
  const h = Math.floor(secs / 3600);
  secs -= h * 3600;
  const m = Math.floor(secs / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
