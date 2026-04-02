"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  delta: number; // percentage
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
      className="bg-white rounded-lg border border-border p-5 shadow-premium hover:shadow-premium-lg transition-shadow ease-premium"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-semibold tracking-tight font-mono-numbers">
            {value}
          </p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-muted-foreground" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded",
            isPositive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          )}
        >
          {isPositive ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">vs previous period</span>
      </div>
    </motion.div>
  );
}
