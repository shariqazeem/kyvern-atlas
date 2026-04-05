"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Activity, Sparkles, Sun, Moon, Monitor } from "lucide-react";
import { TimeRangeSelector } from "./time-range-selector";
import { MobileNav } from "./mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

export function DashboardHeader() {
  const { isAuthenticated, plan, wallet, email, signOut } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const [recentCount, setRecentCount] = useState<number | null>(null);

  useEffect(() => {
    function fetchRecent() {
      fetch("/api/pulse/proof")
        .then((r) => r.json())
        .then((d) => setRecentCount(d.payments_last_hour))
        .catch(() => {});
    }
    fetchRecent();
    const interval = setInterval(fetchRecent, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-[57px] border-b border-black/[0.04] bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <div className="flex items-center gap-4 md:gap-6">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2">
            <Image src="/og-image.jpg" alt="KyvernLabs" width={24} height={24} className="rounded-md" />
            <span className="text-[13px] font-semibold tracking-tight hidden sm:inline">KyvernLabs</span>
          </Link>
          <div className="h-5 w-px bg-black/[0.06] hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-[13px]">
            <Activity className="w-3.5 h-3.5 text-pulse" />
            <span className="font-medium text-primary">Pulse</span>
            {plan === "pro" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-pulse-50 text-pulse-600">
                <Sparkles className="w-2.5 h-2.5" />
                PRO
              </span>
            )}
            {recentCount !== null && recentCount > 0 && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] text-quaternary font-medium">
                  {recentCount} in last hour
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cycleTheme}
            className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            title={`Theme: ${theme}`}
          >
            {theme === "dark" ? <Moon className="w-4 h-4 text-tertiary" /> :
             theme === "system" ? <Monitor className="w-4 h-4 text-tertiary" /> :
             <Sun className="w-4 h-4 text-tertiary" />}
          </button>
          <TimeRangeSelector />
          {isAuthenticated && (
            <>
              <div className="h-5 w-px bg-black/[0.06] hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[11px] font-mono text-tertiary">
                  {email || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "")}
                </span>
                <button
                  onClick={signOut}
                  className="text-[11px] text-quaternary hover:text-primary transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
