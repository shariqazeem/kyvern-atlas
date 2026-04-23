import type { Metadata } from "next";
import { KyvernOS } from "@/components/os/kyvern-os";

export const metadata: Metadata = {
  title: "Device · Kyvern",
  robots: { index: false, follow: false },
};

/** /vault/[id] renders inside the OS shell with tab bar. */
export default function VaultDeviceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <KyvernOS>{children}</KyvernOS>;
}
