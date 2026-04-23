"use client";

/**
 * KyvernOS — the authenticated shell.
 *
 * First visit: plays the unboxing cinematic, then reveals the OS.
 * Returning visits: straight into the OS.
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { ConnectGate } from "@/components/dashboard/connect-gate";
import { TabBar } from "./tab-bar";
import { StatusBar } from "./status-bar";
import { Unboxing } from "./unboxing";

const UNBOX_KEY = "kyvern:unboxed";

export function KyvernOS({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [showUnboxing, setShowUnboxing] = useState(false);
  const [unboxChecked, setUnboxChecked] = useState(false);

  // Check if user has seen the unboxing
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

  if (isLoading) {
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
        <ConnectGate>{null}</ConnectGate>
      </div>
    );
  }

  // Wait until we've checked localStorage before rendering
  if (!unboxChecked) return null;

  return (
    <>
      {/* Unboxing overlay */}
      <AnimatePresence>
        {showUnboxing && (
          <Unboxing onComplete={handleUnboxComplete} />
        )}
      </AnimatePresence>

      {/* The OS */}
      <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
        <StatusBar />
        <main className="px-5 sm:px-8 pb-24 max-w-[680px] mx-auto w-full">
          {children}
        </main>
        <TabBar />
      </div>
    </>
  );
}
