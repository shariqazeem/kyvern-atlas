"use client";

/**
 * KyvernOS — the authenticated shell.
 *
 * Handles auth state (loading, unauthenticated, authenticated).
 * When authenticated: renders the OS layout with status bar + tab bar.
 * When not: renders a clean login prompt.
 */

import { useAuth } from "@/hooks/use-auth";
import { ConnectGate } from "@/components/dashboard/connect-gate";
import { TabBar } from "./tab-bar";
import { StatusBar } from "./status-bar";

export function KyvernOS({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#FAFAFA" }}
      >
        <div className="text-center">
          <div
            className="w-5 h-5 border-2 rounded-full animate-spin mx-auto"
            style={{
              borderColor: "rgba(0,0,0,0.08)",
              borderTopColor: "#111",
            }}
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
        <ConnectGate>{null}</ConnectGate>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
      <StatusBar />
      <main className="px-5 sm:px-8 pb-24 max-w-[680px] mx-auto w-full">
        {children}
      </main>
      <TabBar />
    </div>
  );
}
