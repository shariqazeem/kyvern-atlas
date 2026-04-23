import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Device · Kyvern",
  robots: { index: false, follow: false },
};

/**
 * /vault/[id] — Full-screen device view. No sidebar, no SaaS chrome.
 * Auth is handled by the page component via useAuth hook.
 * Dark background matches the device aesthetic.
 */
export default function VaultDeviceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "#050505" }}>
      {children}
    </div>
  );
}
