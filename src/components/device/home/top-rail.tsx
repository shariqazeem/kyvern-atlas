"use client";

/**
 * TopRail — the device frame above the worker stage.
 *
 * One thin horizontal strip identifying the device:
 *   · KVN-XXXXXXXX serial
 *   · "N days live" (uptime since bornAt)
 *   · live USDC balance
 *   · "Secured by Squads" pill (the vault IS a Squads v4 multisig —
 *     we credit the on-chain primitive every demo, every screenshot)
 *
 * Subtle, never loud. The story is the workers below this rail; the
 * rail's job is to tell the judge "this is one device, this much money,
 * this long alive" without taking attention from the protagonists.
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

export function TopRail({ serial, bornAt, usdcBalance, network, paused }: Props) {
  const daysLive = useDaysLive(bornAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between rounded-[12px] px-3.5 py-2.5"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      {/* LEFT — live LED + serial */}
      <div className="flex items-center gap-2 min-w-0">
        <motion.span
          className="rounded-full flex-shrink-0"
          style={{
            width: 6,
            height: 6,
            background: paused ? "#F59E0B" : "#22C55E",
            boxShadow: paused
              ? "0 0 0 3px rgba(245,158,11,0.18), 0 0 8px rgba(245,158,11,0.7)"
              : "0 0 0 3px rgba(34,197,94,0.18), 0 0 8px rgba(34,197,94,0.7)",
          }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <span
          className="font-mono uppercase tracking-[0.18em] truncate"
          style={{
            fontSize: 10,
            color: "rgba(15,23,42,0.85)",
          }}
        >
          {serial ?? "KVN-________"}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            color: "rgba(15,23,42,0.30)",
          }}
        >
          ·
        </span>
        <span
          className="font-mono uppercase tracking-[0.16em] hidden sm:inline"
          style={{
            fontSize: 9.5,
            color: "rgba(15,23,42,0.55)",
          }}
        >
          {daysLive > 0
            ? `${daysLive} ${daysLive === 1 ? "day" : "days"} live`
            : "warming up"}
        </span>
      </div>

      {/* CENTER — vault USDC balance, the dollar in plain view */}
      <div className="flex items-center gap-1.5 mx-3 min-w-0">
        <span
          className="font-mono uppercase tracking-[0.14em] hidden sm:inline"
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
            fontSize: 13,
            fontVariantNumeric: "tabular-nums",
            color: "#0A0A0A",
            letterSpacing: "-0.01em",
          }}
        >
          ${usdcBalance.toFixed(2)}
        </span>
      </div>

      {/* RIGHT — Squads attribution. Quiet. */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <ShieldCheck
          className="w-3.5 h-3.5"
          strokeWidth={1.8}
          style={{ color: "rgba(15,23,42,0.55)" }}
        />
        <span
          className="font-mono uppercase tracking-[0.14em] hidden sm:inline"
          style={{
            fontSize: 9,
            color: "rgba(15,23,42,0.55)",
          }}
        >
          Squads · {network}
        </span>
        <span
          className="font-mono uppercase tracking-[0.14em] sm:hidden"
          style={{
            fontSize: 9,
            color: "rgba(15,23,42,0.55)",
          }}
        >
          Squads
        </span>
      </div>
    </motion.div>
  );
}

/** Days since the device was born. Re-evaluates client-side once per
 *  minute so the rail stays accurate during long demo sessions. */
function useDaysLive(iso: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(iv);
  }, []);
  if (!iso) return 0;
  const t = Date.parse(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / (24 * 60 * 60 * 1000)));
}
