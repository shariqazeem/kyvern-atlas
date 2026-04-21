"use client";

import { motion } from "framer-motion";
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
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="card p-5 card-hover cursor-default"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[12px] text-[var(--text-tertiary)] font-medium">{title}</p>
          <p className="text-[22px] font-semibold tracking-[-0.02em] font-mono-numbers">
            {value}
          </p>
        </div>
        <div
          className="w-8 h-8 flex items-center justify-center"
          style={{ borderRadius: "var(--radius-sm)", background: "var(--surface-2)" }}
        >
          <Icon className="w-4 h-4 text-[var(--text-quaternary)]" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span
          className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: isPositive ? "var(--success-bg)" : "var(--destructive-bg)",
            color: isPositive ? "var(--success)" : "var(--destructive)",
          }}
        >
          {isPositive ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
        <span className="text-[11px] text-[var(--text-quaternary)]">vs previous</span>
      </div>
    </motion.div>
  );
}
