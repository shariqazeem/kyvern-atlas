"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  delta: number;
  icon: LucideIcon;
  index?: number;
}

export function StatCard({ title, value, delta, icon: Icon, index = 0 }: StatCardProps) {
  const isPositive = delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="bg-white dark:bg-gray-900 rounded-xl border border-black/[0.06] dark:border-gray-800 p-5 shadow-premium hover:shadow-premium-lg hover:border-black/[0.1] transition-all duration-300 cursor-default"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[12px] text-tertiary font-medium">{title}</p>
          <p className="text-[22px] font-semibold tracking-[-0.02em] font-mono-numbers">
            {value}
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[#FAFAFA] dark:bg-gray-800 flex items-center justify-center">
          <Icon className="w-4 h-4 text-quaternary" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded",
            isPositive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          )}
        >
          {isPositive ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
        <span className="text-[11px] text-quaternary">vs previous period</span>
      </div>
    </motion.div>
  );
}
