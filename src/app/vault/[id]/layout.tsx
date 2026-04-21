import type { Metadata } from "next";
import { AuthShell } from "@/components/app/auth-shell";
import { PageTransition } from "@/components/app/page-transition";

export const metadata: Metadata = {
  title: "Vault · Kyvern",
  robots: { index: false, follow: false },
};

/**
 * /vault/[id] — AuthShell replaces the prior AppShell + ConnectGate
 * nesting. Pre-auth: clean welcome screen with no sidebar. Post-auth:
 * full app chrome with the vault dashboard.
 */
export default function VaultIdLayout({
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
