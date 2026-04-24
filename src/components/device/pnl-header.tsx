"use client";

/**
 * PnL Header — shows device earnings, spending, and net profit.
 * The thing you check every morning.
 */

import { motion } from "framer-motion";
import { EASE_PREMIUM as ease } from "@/lib/motion";

interface PnLHeaderProps {
  earned: number;
  spent: number;
  net: number;
  deviceName: string;
  deviceEmoji: string;
}

export function PnLHeader({
  earned,
  spent,
  net,
  deviceName,
  deviceEmoji,
}: PnLHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="rounded-[20px] p-5"
      style={{
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      {/* Device identity */}
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px]"
          style={{ background: "#F3F4F6" }}
        >
          {deviceEmoji}
        </span>
        <div>
          <p className="text-[16px] font-semibold text-[#111]">{deviceName}</p>
          <p className="text-[11px] text-[#9CA3AF]">Your device</p>
        </div>
      </div>

      {/* PnL stats */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">
            Earned
          </p>
          <p className="text-[20px] font-semibold font-mono text-[#22C55E]">
            ${earned.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">
            Spent
          </p>
          <p className="text-[20px] font-semibold font-mono text-[#111]">
            ${spent.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">
            Net
          </p>
          <p
            className="text-[20px] font-semibold font-mono"
            style={{ color: net >= 0 ? "#22C55E" : "#EF4444" }}
          >
            {net >= 0 ? "+" : ""}${net.toFixed(2)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
