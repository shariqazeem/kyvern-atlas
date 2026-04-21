"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Activity, Sparkles, Search, Settings } from "lucide-react";
import { TimeRangeSelector } from "./time-range-selector";
import { MobileNav } from "./mobile-nav";
import { LiveIndicator } from "./live-indicator";
import { useAuth } from "@/hooks/use-auth";

export function DashboardHeader() {
  const { isAuthenticated, plan, wallet, email, signOut } = useAuth();
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
    <header
      className="h-[57px] sticky top-0 z-50 glass-subtle"
      style={{ borderBottom: "0.5px solid var(--border)" }}
    >
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <div className="flex items-center gap-4 md:gap-6">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2">
            <Image src="/og-image.jpg" alt="KyvernLabs" width={24} height={24} className="rounded-lg" />
            <span className="text-[13px] font-semibold tracking-tight hidden sm:inline">KyvernLabs</span>
          </Link>
          <div className="h-5 w-px hidden sm:block" style={{ background: "var(--border)" }} />
          <div className="hidden sm:flex items-center gap-2 text-[13px]">
            <Activity className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="font-medium">Pulse</span>
            {plan === "pro" && (
              <span className="badge badge-accent text-[9px] py-0.5 px-2">
                <Sparkles className="w-2.5 h-2.5" />
                PRO
              </span>
            )}
            {recentCount !== null && recentCount > 0 && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--success)" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--success)" }} />
                </span>
                <span className="text-[11px] text-[var(--text-quaternary)] font-medium">
                  {recentCount} in last hour
                </span>
              </>
            )}
            <div className="h-4 w-px" style={{ background: "var(--border)" }} />
            <LiveIndicator />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
            }}
            className="hidden sm:inline-flex items-center gap-2 h-8 px-2.5 transition-all duration-200 cursor-pointer"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "0.5px solid var(--border)",
              background: "var(--surface)",
            }}
            title="Search (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-[var(--text-quaternary)]" />
            <span className="text-[12px] text-[var(--text-quaternary)]">Search...</span>
            <kbd className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--text-quaternary)] rounded px-1.5 py-0.5 font-mono ml-2" style={{ background: "var(--surface-2)", border: "0.5px solid var(--border)" }}>
              <span className="text-[11px]">&#8984;</span>K
            </kbd>
          </button>
          <TimeRangeSelector />
          <Link
            href="/pulse/dashboard/settings"
            className="p-1.5 transition-colors hover:opacity-70"
            style={{ borderRadius: "var(--radius-sm)" }}
            title="Settings"
          >
            <Settings className="w-4 h-4 text-[var(--text-tertiary)]" />
          </Link>
          {isAuthenticated && (
            <>
              <div className="h-5 w-px hidden sm:block" style={{ background: "var(--border)" }} />
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                  {email || (wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "")}
                </span>
                <button
                  onClick={signOut}
                  className="text-[11px] text-[var(--text-quaternary)] hover:text-[var(--text-primary)] transition-colors"
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
