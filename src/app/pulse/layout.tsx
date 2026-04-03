import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pulse — Revenue Intelligence for x402 Service Providers",
  description:
    "Real-time x402 analytics dashboard. Track revenue, customers, and endpoints with one-line middleware. SIWE auth, kv_live_ API keys, on-chain verification. Free to start, Pro at $49 USDC/month.",
  keywords: [
    "Pulse analytics", "x402 dashboard", "x402 analytics",
    "x402 revenue tracking", "withPulse middleware",
    "x402 service provider tools", "API revenue dashboard",
    "blockchain verified analytics", "USDC micropayments analytics",
  ],
  openGraph: {
    title: "Pulse by KyvernLabs — x402 Revenue Intelligence",
    description:
      "Real-time revenue dashboard for x402 endpoints. One-line middleware, SIWE auth, on-chain verification. Free to start.",
    url: "https://kyvernlabs.com/pulse",
    images: ["/og-image.jpg"],
  },
  twitter: {
    title: "Pulse — Revenue Intelligence for x402",
    description: "Track every x402 payment. One line of code. Blockchain verified.",
    images: ["/og-image.jpg"],
  },
  alternates: { canonical: "https://kyvernlabs.com/pulse" },
};

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
