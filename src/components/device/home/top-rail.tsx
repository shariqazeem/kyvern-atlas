"use client";

/**
 * TopRail — the device frame above the worker stage. Reads like a
 * real hardware header so a newbie immediately understands "this is
 * a device I own."
 *
 * Two-row layout on every viewport:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  ● ONLINE   KVN-XXXXXXXX   ·   Solana devnet   ·  UP 1H 33M │
 *   │  Vault  $0.00                              🛡 Squads secured │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * The pulsing green dot + ONLINE chip on the left says "live."
 * The full uptime tells the judge "alive and breathing."
 * "Squads secured" credits the on-chain primitive without saying
 * "multisig" (jargon).
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface Props {
  serial: string | null;
  bornAt: string | null;
  usdcBalance: number;
  network: "devnet" | "mainnet";
  paused: boolean;
}

export function TopRail({
  serial,
  bornAt,
  usdcBalance,
  network,
  paused,
}: Props) {
  const uptime = useUptime(bornAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-[14px] px-4 py-3"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 8px 22px -14px rgba(15,23,42,0.10)",
      }}
    >
      {/* ROW 1 — status + identity */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* ONLINE chip */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
          style={{
            background: paused
              ? "rgba(245,158,11,0.10)"
              : "rgba(34,197,94,0.10)",
            border: paused
              ? "1px solid rgba(245,158,11,0.30)"
              : "1px solid rgba(34,197,94,0.30)",
          }}
        >
          <motion.span
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: paused ? "#F59E0B" : "#22C55E",
              boxShadow: paused
                ? "0 0 0 2px rgba(245,158,11,0.20), 0 0 6px rgba(245,158,11,0.7)"
                : "0 0 0 2px rgba(34,197,94,0.18), 0 0 6px rgba(34,197,94,0.7)",
            }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span
            className="font-mono uppercase tracking-[0.16em]"
            style={{
              fontSize: 9,
              color: paused ? "#B45309" : "#15803D",
              fontWeight: 600,
            }}
          >
            {paused ? "Paused" : "Online"}
          </span>
        </span>

        {/* Serial */}
        <span
          className="font-mono uppercase tracking-[0.14em] truncate"
          style={{
            fontSize: 10.5,
            color: "rgba(15,23,42,0.85)",
            fontWeight: 500,
          }}
        >
          {serial ?? "KVN-________"}
        </span>

        {/* Spacer dot · Network */}
        <span
          className="font-mono"
          style={{ color: "rgba(15,23,42,0.20)", fontSize: 10 }}
        >
          ·
        </span>
        <span
          className="font-mono uppercase tracking-[0.14em] hidden sm:inline truncate"
          style={{
            fontSize: 9.5,
            color: "rgba(15,23,42,0.55)",
          }}
        >
          Solana {network}
        </span>

        {/* Pushed right: uptime */}
        <span
          className="font-mono uppercase tracking-[0.14em] ml-auto truncate"
          style={{
            fontSize: 9.5,
            color: "rgba(15,23,42,0.55)",
            flexShrink: 0,
          }}
        >
          Up {uptime}
        </span>
      </div>

      {/* ROW 2 — vault balance + Squads attribution */}
      <div
        className="flex items-baseline justify-between gap-3 mt-2 pt-2"
        style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
      >
        {/* Vault */}
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className="font-mono uppercase tracking-[0.16em]"
            style={{
              fontSize: 9.5,
              color: "rgba(15,23,42,0.45)",
            }}
          >
            Vault
          </span>
          <span
            className="font-mono tabular-nums truncate"
            style={{
              fontSize: 16,
              fontVariantNumeric: "tabular-nums",
              color: "#0A0A0A",
              letterSpacing: "-0.015em",
              fontWeight: 500,
            }}
          >
            ${usdcBalance.toFixed(2)}
          </span>
        </div>

        {/* Squads secured */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <ShieldCheck
            className="w-3.5 h-3.5"
            strokeWidth={1.8}
            style={{ color: "rgba(15,23,42,0.55)" }}
          />
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{
              fontSize: 9.5,
              color: "rgba(15,23,42,0.55)",
            }}
          >
            Squads secured
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/** Format uptime as compact "Xd Yh" / "Xh Ym" / "Xm" string. Reads
 *  more device-like than "N days live" — like "Up 1h 33m" on a
 *  real piece of hardware. Re-evaluates every 60s. */
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
