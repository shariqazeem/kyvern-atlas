"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Globe,
  Users,
  ArrowLeftRight,
  Key,
  Code2,
  CreditCard,
  Activity,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Analytics",
    items: [
      { href: "/pulse/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/pulse/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/pulse/dashboard/endpoints", label: "Endpoints", icon: Globe },
      { href: "/pulse/dashboard/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Developer",
    items: [
      { href: "/pulse/dashboard/keys", label: "API Keys", icon: Key },
      { href: "/pulse/dashboard/setup", label: "Setup Guide", icon: Code2 },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/pulse/dashboard/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

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
    </aside>
  );
}
