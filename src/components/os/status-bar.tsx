"use client";

/**
 * StatusBar — top system bar showing network + greeting.
 * Like the iOS status bar but for Kyvern.
 */

import { motion } from "framer-motion";

export function StatusBar({ network = "devnet" }: { network?: string }) {
  const h = new Date().getHours();
  const greeting =
    h < 5 ? "Night owl" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex items-center justify-between px-5 sm:px-8 h-11">
      <div className="flex items-center gap-2">
        <motion.span
          className="w-[6px] h-[6px] rounded-full"
          style={{ background: "#22C55E" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(0,0,0,0.04)",
            color: "#6B7280",
          }}
        >
          Solana {network}
        </span>
      </div>
      <span className="text-[12px] text-[#9CA3AF]">{greeting}</span>
    </div>
  );
}
