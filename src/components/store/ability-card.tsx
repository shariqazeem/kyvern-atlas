"use client";

/**
 * AbilityCard — store browse card for an ability.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import type { AbilityDef } from "@/lib/abilities/types";

interface AbilityCardProps {
  ability: AbilityDef;
  installed: boolean;
  index: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  earn: "#22C55E",
  protect: "#EF4444",
  monitor: "#3B82F6",
};

export function AbilityCard({ ability, installed, index }: AbilityCardProps) {
  const catColor = CATEGORY_COLORS[ability.category] ?? "#9CA3AF";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/app/store/${ability.id}`}
        className="block group"
      >
        <div
          className="rounded-[20px] p-4 transition-all group-hover:shadow-md group-active:scale-[0.98]"
          style={{
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          {/* Icon + Publisher */}
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[24px]"
              style={{ background: "#F3F4F6" }}
            >
              {ability.emoji}
            </div>
            <span
              className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: `${catColor}10`,
                color: catColor,
              }}
            >
              {ability.category}
            </span>
          </div>

          {/* Name + Description */}
          <h3 className="text-[15px] font-semibold text-[#111] mb-1">
            {ability.name}
          </h3>
          <p className="text-[12px] text-[#6B7280] leading-[1.5] line-clamp-2">
            {ability.shortDescription}
          </p>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-[#9CA3AF]">
              by {ability.publisher}
            </span>
            {installed ? (
              <span
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: "#F3F4F6", color: "#9CA3AF" }}
              >
                Installed
              </span>
            ) : (
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors"
                style={{ background: "#111", color: "#fff" }}
              >
                Install
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
