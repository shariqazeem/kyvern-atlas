"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Globe,
  Users,
  ArrowLeftRight,
  Code2,
  Sparkles,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/pulse/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/pulse/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/pulse/dashboard/endpoints", label: "Endpoints", icon: Globe },
  { href: "/pulse/dashboard/customers", label: "Customers", icon: Users },
  { href: "/pulse/dashboard/setup", label: "Setup", icon: Code2 },
  { href: "/pulse/upgrade", label: "Upgrade to Pro", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] shrink-0 border-r border-border bg-white h-[calc(100vh-57px)] sticky top-[57px]">
      <nav className="p-3 space-y-1">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            Pulse
          </div>
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/pulse/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ease-premium",
                isActive
                  ? "bg-pulse-50 text-pulse-600 border-l-2 border-pulse-500 -ml-px"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
