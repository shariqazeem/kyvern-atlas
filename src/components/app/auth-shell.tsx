"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * AuthShell — auth-aware wrapper around AppShell.
 *
 * Replaces the previous <AppShell><ConnectGate>{children}</ConnectGate></AppShell>
 * pattern, which rendered the sidebar + topbar even when the user was
 * unauthenticated. The sidebar's nav items were clickable but bounced
 * straight to another gate — felt like dead-ends on a first visit.
 *
 * Now, when unauthenticated, we skip AppShell entirely and render a
 * clean full-viewport "Welcome back" surface via ConnectGate.
 * When authenticated, the full AppShell mounts with all its chrome.
 *
 * This matches the focused /vault/new gate, which never rendered the
 * sidebar. Consistency across every gated route.
 * ════════════════════════════════════════════════════════════════════
 */

import { AppShell } from "./app-shell";
import { ConnectGate } from "@/components/dashboard/connect-gate";
import { useAuth } from "@/hooks/use-auth";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // While Privy + our session cookie are resolving, show a standalone
  // spinner centered in the viewport. Avoids a flash of sidebar.
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{
            borderColor: "var(--border)",
            borderTopColor: "var(--text-primary)",
          }}
        />
      </div>
    );
  }

  // Not authenticated → clean welcome-back surface, NO app chrome.
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "var(--background)" }}
      >
        <ConnectGate>{null}</ConnectGate>
      </div>
    );
  }

  // Authenticated → full shell with sidebar, topbar, and children.
  return <AppShell>{children}</AppShell>;
}
