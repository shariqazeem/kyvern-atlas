import type { Metadata } from "next";
import { KyvernOS } from "@/components/os/kyvern-os";

export const metadata: Metadata = {
  title: {
    default: "Your device · Kyvern",
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
