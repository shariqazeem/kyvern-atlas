"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Globe,
  Users,
  ArrowLeftRight,
  BarChart3,
  Key,
  Code2,
  CreditCard,
  Webhook,
  Bell,
  TrendingUp,
  Wallet,
  Activity,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Analytics",
    items: [
      { href: "/pulse/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/pulse/dashboard/benchmarks", label: "Benchmarks", icon: BarChart3 },
      { href: "/pulse/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/pulse/dashboard/endpoints", label: "Endpoints", icon: Globe },
      { href: "/pulse/dashboard/customers", label: "Customers", icon: Users },
      { href: "/pulse/dashboard/cohorts", label: "Cohorts", icon: Users },
      { href: "/pulse/dashboard/intelligence", label: "Intelligence", icon: TrendingUp },
    ],
  },
  {
    label: "Developer",
    items: [
      { href: "/pulse/dashboard/keys", label: "API Keys", icon: Key },
      { href: "/pulse/dashboard/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/pulse/dashboard/alerts", label: "Alerts", icon: Bell },
      { href: "/pulse/dashboard/setup", label: "Setup Guide", icon: Code2 },
    ],
  },
  {
    label: "Products",
    items: [
      { href: "/vault", label: "Vault", icon: Wallet },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/pulse/dashboard/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

function UsageMeter() {
  const [usage, setUsage] = useState<{
    events_used: number;
    events_limit: number;
    revenue_used: number;
    revenue_limit: number;
    tier: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/pulse/usage", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then(setUsage)
      .catch(() => {});
  }, []);

  if (!usage || usage.tier === "pro") return null;

  const eventPct = Math.min(100, (usage.events_used / usage.events_limit) * 100);
  const revPct = Math.min(100, (usage.revenue_used / usage.revenue_limit) * 100);
  const pct = Math.max(eventPct, revPct);
  const isNearLimit = pct > 80;

  return (
    <div className="px-4 py-3 border-t border-black/[0.04]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium text-quaternary uppercase tracking-wider">Usage today</span>
        <span className="text-[10px] text-quaternary">{usage.events_used.toLocaleString()} / {usage.events_limit.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isNearLimit ? "bg-amber-500" : "bg-pulse"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-quaternary mt-1">
        ${usage.revenue_used.toFixed(2)} / ${usage.revenue_limit.toFixed(2)} revenue
      </p>
      {isNearLimit && (
        <Link href="/pulse/upgrade" className="text-[10px] font-medium text-pulse hover:underline mt-1 inline-block">
          Upgrade for unlimited →
        </Link>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] shrink-0 border-r border-black/[0.04] bg-white h-[calc(100vh-57px)] sticky top-[57px] flex flex-col">
      <nav className="flex-1 p-3 space-y-1">
        <div className="px-3 py-2 mb-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-quaternary uppercase tracking-[0.12em]">
            <Activity className="w-3 h-3" />
            Pulse
          </div>
        </div>

        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && (
              <>
                <div className="my-2 mx-3 border-t border-black/[0.04]" />
                <p className="px-3 py-1.5 text-[10px] font-medium text-quaternary uppercase tracking-[0.12em]">
                  {group.label}
                </p>
              </>
            )}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/pulse/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#F0F0F0] text-primary"
                      : "text-tertiary hover:text-primary hover:bg-[#FAFAFA]"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <UsageMeter />
    </aside>
  );
}
