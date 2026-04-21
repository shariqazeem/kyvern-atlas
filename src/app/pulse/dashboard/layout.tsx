import type { Metadata } from "next";
import { AuthShell } from "@/components/app/auth-shell";
// CommandPalette is mounted inside AppShell itself — no need to remount
// here. Doing so previously caused two palette instances to compete for
// Cmd+K.
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageTransition } from "@/components/app/page-transition";

export const metadata: Metadata = {
  title: "Pulse Dashboard — Kyvern",
  description:
    "The earn side of Kyvern. Real-time agent-payment analytics on Solana. Connect wallet to get started.",
  robots: { index: false, follow: false },
};

/**
 * Pulse dashboard renders inside the unified `/app` chrome + the same
 * PageTransition fades so navigating from /app → /pulse/dashboard feels
 * like one application, not two.
 *
 * DashboardShell (the inner wrapper — time-range selector, live feed
 * provider, etc.) stays wrapping page children. It carries the
 * Pulse-specific data context without affecting layout.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthShell>
      <DashboardShell>
        <PageTransition>{children}</PageTransition>
      </DashboardShell>
    </AuthShell>
  );
}
