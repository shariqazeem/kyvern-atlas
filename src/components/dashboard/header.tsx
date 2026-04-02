"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { TimeRangeSelector } from "./time-range-selector";
import { usePulseStats } from "@/hooks/use-pulse-stats";
import { useDashboardStore } from "@/hooks/use-dashboard-store";

export function DashboardHeader() {
  const { timeRange } = useDashboardStore();
  const { data } = usePulseStats(timeRange);
  const isLive = data?.has_real_data ?? false;

  return (
    <header className="h-[57px] border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">K</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">KyvernLabs</span>
          </Link>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Activity className="w-3.5 h-3.5 text-pulse" />
            <span className="font-medium text-foreground">Pulse</span>
            {isLive && (
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </div>
        </div>
        <TimeRangeSelector />
      </div>
    </header>
  );
}
