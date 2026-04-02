"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { TimeRangeSelector } from "./time-range-selector";
import { MobileNav } from "./mobile-nav";
import { usePulseStats } from "@/hooks/use-pulse-stats";
import { useDashboardStore } from "@/hooks/use-dashboard-store";

export function DashboardHeader() {
  const { timeRange } = useDashboardStore();
  const { data } = usePulseStats(timeRange);
  const isLive = data?.has_real_data ?? false;

  return (
    <header className="h-[57px] border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <div className="flex items-center gap-4 md:gap-6">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background text-[10px] font-bold">K</span>
            </div>
            <span className="text-[13px] font-semibold tracking-tight hidden sm:inline">KyvernLabs</span>
          </Link>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1.5 text-[13px]">
            <Activity className="w-3.5 h-3.5 text-pulse" />
            <span className="font-medium text-primary">Pulse</span>
            {isLive && (
              <span className="relative flex h-2 w-2 ml-0.5">
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
