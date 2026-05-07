"use client";

/**
 * KyvernOS — the authenticated shell.
 *
 * First visit: plays the unboxing cinematic, then reveals the OS.
 * Returning visits: straight into the OS.
 *
 * Device-shell exception: on `/app` (exact path) the inner `<main>`
 * drops its 680px max-width + padding so the new full-bleed device
 * shell can fill the viewport. Other /app/* routes (worker detail,
 * inbox, settings) keep the constrained main.
 */

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { ConnectGate } from "@/components/dashboard/connect-gate";
import { TabBar } from "./tab-bar";
import { StatusBar } from "./status-bar";
import { Unboxing } from "./unboxing";

const UNBOX_KEY = "kyvern:unboxed";
const GUEST_WALLET_KEY = "kyvern:dev-wallet";

export function KyvernOS({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname() ?? "";
  // Device-shell routes: every page that uses PageShell / IdentityStrip /
  // the new full-bleed layout. The legacy 680px-capped main only covers
  // /app/tasks (un-redesigned) + miscellaneous nested routes.
  const isDeviceShell =
    pathname === "/app" ||
    pathname.startsWith("/app/agents/") ||
    pathname.startsWith("/app/inbox") ||
    pathname === "/app/settings";
  const [showUnboxing, setShowUnboxing] = useState(false);
  const [unboxChecked, setUnboxChecked] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [guestChecked, setGuestChecked] = useState(false);

  // Detect guest mode — /try plants a kyvern:dev-wallet in localStorage.
  // When present and the user is NOT Privy-authenticated, we treat the
  // session as a sandbox visitor: skip the ConnectGate redirect, render
  // the OS, but never trigger the unbox cinematic.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const guestWallet = window.localStorage.getItem(GUEST_WALLET_KEY);
    setIsGuest(!!guestWallet && !isAuthenticated);
    setGuestChecked(true);
  }, [isAuthenticated]);

  // Check if user has seen the unboxing — only relevant for real
  // authenticated users; guests already saw /try's cinematic.
  useEffect(() => {
    if (!isAuthenticated) return;
    const seen = window.localStorage.getItem(UNBOX_KEY);
    if (!seen) {
      setShowUnboxing(true);
    }
    setUnboxChecked(true);
  }, [isAuthenticated]);

  const handleUnboxComplete = useCallback(() => {
    window.localStorage.setItem(UNBOX_KEY, "1");
    setShowUnboxing(false);
  }, []);

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

  // Wait until we've checked localStorage before rendering. Guests
  // skip the unbox cinematic check entirely (they came in via /try).
  if (isAuthenticated && !unboxChecked) return null;

  return (
    <>
      {/* Unboxing overlay */}
      <AnimatePresence>
        {showUnboxing && (
          <Unboxing onComplete={handleUnboxComplete} />
        )}
      </AnimatePresence>

      {/* The OS */}
      <div
        className="min-h-screen overflow-x-hidden"
        style={{ background: "#FAFAFA" }}
      >
        <StatusBar />
        <main
          className={
            isDeviceShell
              ? "pb-[88px] w-full"
              : "px-5 sm:px-8 pb-24 max-w-[680px] mx-auto w-full"
          }
        >
          {children}
        </main>
        <TabBar />
      </div>
    </>
  );
}
