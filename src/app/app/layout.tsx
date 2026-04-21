import type { Metadata } from "next";
import { AuthShell } from "@/components/app/auth-shell";
import { PageTransition } from "@/components/app/page-transition";

export const metadata: Metadata = {
  title: "Kyvern · Agent commerce on Solana",
  description:
    "Your unified Kyvern workspace. Vaults, services, payments, and policies — all in one place.",
  robots: { index: false, follow: false },
};

/**
 * /app layout — uses AuthShell instead of <AppShell><ConnectGate>…</ConnectGate></AppShell>.
 *
 * The old pattern rendered sidebar + topbar even before the user had
 * authenticated, which made the first-visit welcome-back screen feel
 * cluttered and introduced dead-end clicks on the disabled nav items.
 * AuthShell presents a clean full-viewport welcome first; once the
 * user is authenticated the full shell comes in.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthShell>
      <PageTransition>{children}</PageTransition>
    </AuthShell>
  );
}
