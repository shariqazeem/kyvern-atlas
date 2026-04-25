"use client";

/**
 * TabBar — iOS-style bottom navigation. Fixed at viewport bottom.
 * Four tabs: Home, Create, Activity, Settings.
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Briefcase, Activity, Settings } from "lucide-react";

const TABS = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/tasks", label: "Tasks", icon: Briefcase, exact: false },
  { href: "/app/payments", label: "Activity", icon: Activity, exact: false },
  { href: "/app/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function TabBar() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-around h-[72px] pb-[env(safe-area-inset-bottom)]"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
          >
            <tab.icon
              className="w-[22px] h-[22px]"
              strokeWidth={active ? 2.2 : 1.6}
              style={{ color: active ? "#111" : "#9CA3AF" }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? "#111" : "#9CA3AF" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
