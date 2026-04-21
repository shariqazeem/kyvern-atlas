import type { Metadata } from "next";

/* Passthrough layout. Per-route pages own their full chrome — this prevents
   dashboard header from bleeding into the onboarding flow at /vault/new. */

export const metadata: Metadata = {
  title: "Vault",
  robots: { index: false, follow: false },
};

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
