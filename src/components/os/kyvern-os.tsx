"use client";

/**
 * KyvernOS — the authenticated shell.
 *
 * The OS-level Unboxing overlay was retired 2026-05-09 — /unbox is
 * the canonical cinematic now and firing a second one over /app
 * created a duplicate-unboxing bug (separate paywall/abilities
 * card after the user already finished /unbox). Single source of
 * cinematic: /unbox → /app → no overlays.
 *
 * The bottom TabBar (Home/Findings/Settings) was also retired —
 * the alive console is self-contained and the legacy /app/inbox +
 * /app/settings routes had stale worker-era UIs. Kept the routes
 * alive for direct-link compatibility but no longer surfaced in
 * primary nav.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ConnectGate } from "@/components/dashboard/connect-gate";
import { StatusBar } from "./status-bar";

const GUEST_WALLET_KEY = "kyvern:dev-wallet";

export function KyvernOS({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname() ?? "";
  // Device-shell routes: every page that uses PageShell / IdentityStrip /
  // the new full-bleed layout.
  const isDeviceShell =
    pathname === "/app" ||
    pathname.startsWith("/app/agents/") ||
    pathname.startsWith("/app/inbox") ||
    pathname === "/app/settings";
  const [isGuest, setIsGuest] = useState(false);
  const [guestChecked, setGuestChecked] = useState(false);

  // Detect guest mode — /try plants a kyvern:dev-wallet in localStorage.
  // When present and the user is NOT Privy-authenticated, we treat the
  // session as a sandbox visitor: skip the ConnectGate redirect, render
  // the OS.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const guestWallet = window.localStorage.getItem(GUEST_WALLET_KEY);
    setIsGuest(!!guestWallet && !isAuthenticated);
    setGuestChecked(true);
  }, [isAuthenticated]);

  if (isLoading || !guestChecked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#FAFAFA" }}
      >
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{
            borderColor: "rgba(0,0,0,0.08)",
            borderTopColor: "#111",
          }}
        />
      </div>
    );
  }

  if (!isAuthenticated && !isGuest) {
    return (
      <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
        <ConnectGate>{null}</ConnectGate>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "#FAFAFA" }}
    >
      <StatusBar />
      <main
        className={
          isDeviceShell
            ? "pb-12 w-full"
            : "px-5 sm:px-8 pb-24 max-w-[680px] mx-auto w-full"
        }
      >
        {children}
      </main>
    </div>
  );
}
