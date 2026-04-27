import type { Metadata } from "next";
import { KyvernOS } from "@/components/os/kyvern-os";

export const metadata: Metadata = {
  // Root layout already wraps titles with " · Kyvern", so the bare
  // "Your device" resolves to "Your device · Kyvern". The template
  // here only applies to descendants of /app — those get wrapped by
  // /app's template (e.g. "Inbox" → "Inbox · Kyvern") instead of the
  // root template, so the suffix is single, not doubled.
  title: {
    default: "Your device",
    template: "%s · Kyvern",
  },
  description: "The operating system for your AI agents on Solana.",
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <KyvernOS>{children}</KyvernOS>;
}
