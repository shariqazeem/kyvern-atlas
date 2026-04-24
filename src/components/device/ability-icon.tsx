"use client";

/**
 * AbilityIcon — iOS home screen style icon for an installed ability.
 * Shows emoji, name, and status dot.
 */

import Link from "next/link";
import { motion } from "framer-motion";

interface AbilityIconProps {
  abilityId: string;
  emoji: string;
  name: string;
  status: "active" | "paused";
  index: number;
}

export function AbilityIcon({
  abilityId,
  emoji,
  name,
  status,
  index,
}: AbilityIconProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/app/ability/${abilityId}`}
        className="flex flex-col items-center gap-1.5 group"
      >
        <div
          className="relative w-[60px] h-[60px] rounded-[16px] flex items-center justify-center text-[26px] transition-transform group-active:scale-[0.9]"
          style={{
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {emoji}
          {/* Status dot */}
          <span
            className="absolute -top-0.5 -right-0.5 w-[8px] h-[8px] rounded-full border-2 border-[#FAFAFA]"
            style={{
              background: status === "active" ? "#22C55E" : "#9CA3AF",
            }}
          />
        </div>
        <span className="text-[10px] font-medium text-[#6B7280] text-center truncate w-[68px]">
          {name}
        </span>
      </Link>
    </motion.div>
  );
}
