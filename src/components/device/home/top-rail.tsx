"use client";

/**
 * TopRail — vault balance + Squads attribution. The chassis bezel
 * already owns identity (ONLINE chip, serial, network, uptime), so
 * this rail focuses on the dollar noun:
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Vault  $0.00                              🛡 Squads secured │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * "Squads secured" credits the on-chain primitive without saying
 * "multisig" (jargon).
 */

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

interface Props {
  usdcBalance: number;
}

export function TopRail({ usdcBalance }: Props) {
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
      <div className="flex items-baseline justify-between gap-3">
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
