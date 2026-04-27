"use client";

/**
 * TabBar — iOS-style bottom navigation. Fixed at viewport bottom.
 * Four tabs: Home · Inbox · Tasks · Settings.
 *
 * The Inbox tab carries an unread badge dot. The badge polls the
 * primary device's /api/devices/[id]/inbox endpoint every 8s while
 * the user is NOT already on /app/inbox (no need to ping when the
 * Inbox page itself is already polling on screen).
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Inbox, Briefcase, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const TABS = [
  { href: "/app", label: "Home", icon: Home, exact: true, key: "home" as const },
  { href: "/app/inbox", label: "Inbox", icon: Inbox, exact: false, key: "inbox" as const },
  { href: "/app/tasks", label: "Tasks", icon: Briefcase, exact: false, key: "tasks" as const },
  { href: "/app/settings", label: "Settings", icon: Settings, exact: false, key: "settings" as const },
] as const;

interface VaultBrief {
  vault: { id: string };
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

export function TabBar() {
  const pathname = usePathname() ?? "";
  const { wallet, isLoading } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Resolve the primary device once
  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) return;
    let cancelled = false;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        if (cancelled) return;
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) setDeviceId(vaults[0].vault.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoading, wallet]);

  // Poll inbox count — only when not already on /app/inbox
  useEffect(() => {
    if (!deviceId) return;
    if (pathname.startsWith("/app/inbox")) {
      // Page itself is showing the count; we'll let it set unread to 0 on mark-read
      return;
    }
    let cancelled = false;
    const fetchCount = () => {
      fetch(`/api/devices/${deviceId}/inbox?status=unread&limit=1`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!cancelled && d) setUnreadCount(d.unreadCount ?? 0);
        })
        .catch(() => {});
    };
    fetchCount();
    const iv = setInterval(fetchCount, 8_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [deviceId, pathname]);

  // When user navigates to /app/inbox, optimistically clear the badge
  useEffect(() => {
    if (pathname.startsWith("/app/inbox")) {
      setUnreadCount(0);
    }
  }, [pathname]);

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
        const showBadge = tab.key === "inbox" && unreadCount > 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors relative"
          >
            <div className="relative">
              <tab.icon
                className="w-[22px] h-[22px]"
                strokeWidth={active ? 2.2 : 1.6}
                style={{ color: active ? "#111" : "#9CA3AF" }}
              />
              {showBadge && (
                <motion.span
                  className="absolute -top-1 -right-1 rounded-full"
                  style={{
                    background: "#22C55E",
                    width: 8,
                    height: 8,
                    boxShadow: "0 0 0 2px rgba(255,255,255,0.95)",
                  }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  aria-label={`${unreadCount} unread`}
                />
              )}
            </div>
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
