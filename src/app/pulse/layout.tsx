import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pulse — The earn side of Kyvern. On-chain agent payment analytics on Solana.",
  description:
    "Wrap your x402 endpoint on Solana with one line of middleware. Every Kyvern-protected agent payment shows up in your dashboard, linked to the same Solana signature the payer signed.",
  keywords: [
    "Pulse analytics", "x402 dashboard", "x402 analytics", "x402 solana",
    "agent payment analytics", "agent revenue dashboard",
    "withPulse middleware", "solana x402 analytics",
    "on-chain verified analytics", "Kyvern pulse", "Kyvern earn",
  ],
  openGraph: {
    title: "Pulse — The earn side of Kyvern. Agent payment analytics on Solana.",
    description:
      "Every Kyvern-protected agent payment, verified on-chain, in your dashboard seconds after it lands.",
    url: "https://kyvernlabs.com/pulse",
    images: ["/og-image.jpg"],
  },
  alternates: { canonical: "https://kyvernlabs.com/pulse" },
};

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
