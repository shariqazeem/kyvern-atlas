import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { FloatingLiveBadge } from "@/components/atlas/floating-live-badge";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

/**
 * Display font — Bricolage Grotesque (variable, optical-sized).
 * Phase 9 (2026-05-08) — replaces Inter on landing headlines / hero
 * h1 / section titles to give the page a distinct visual character
 * without breaking the cold "precision instrument" identity. Inter
 * still owns body + UI text; mono still owns numbers / addresses.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = "https://kyvernlabs.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kyvern — Your device hires AI workers that earn real USDC.",
    template: "%s · Kyvern",
  },
  description:
    "Kyvern is the device where AI workers earn real USDC for you under an on-chain Solana policy program. Your device hires workers. They earn real money. You control every dollar. Live on Solana devnet.",
  keywords: [
    "autonomous AI agent", "agent autonomy", "AI agent wallet",
    "on-chain authorization", "agent authorization layer",
    "agent policy program", "Solana agent infrastructure",
    "Squads Protocol", "Squads v4", "Squads spending limits",
    "Solana smart account", "Solana multisig", "agent commerce on Solana",
    "x402 Solana", "x402 payments", "USDC Solana",
    "Kyvern", "KyvernLabs", "Atlas autonomous agent",
    "Shariq Shaukat",
  ],
  authors: [{ name: "KyvernLabs", url: SITE_URL }],
  creator: "KyvernLabs",
  publisher: "KyvernLabs",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Kyvern",
    title: "Kyvern — Your device hires AI workers that earn real USDC.",
    description:
      "Your device hires workers. They earn real money. You control every dollar. AI workers under an on-chain Solana policy program. Live on devnet.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Kyvern — Your device hires AI workers that earn real USDC.",
      },
      {
        url: "/kyvernlabs_logo.jpg",
        width: 512,
        height: 512,
        alt: "Kyvern",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kyvern — Your device hires AI workers that earn real USDC.",
    description:
      "Your device hires workers. They earn real money. You control every dollar. Atlas, our reference agent, is operating live on Solana devnet right now.",
    images: ["/og-image.jpg"],
    creator: "@shariqshkt",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  // icons: omitted on purpose — Next.js auto-detects src/app/icon.jpg
  // and src/app/apple-icon.jpg for favicon + Apple touch icon.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${bricolage.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Kyvern",
              url: SITE_URL,
              logo: `${SITE_URL}/kyvernlabs_logo.jpg`,
              description:
                "Kyvern is the device where AI workers earn real USDC for you under an on-chain Solana policy program. Your device hires workers. They earn real money. You control every dollar. Atlas, our reference agent, has been operating autonomously on Solana devnet since April 2026.",
              founder: { "@type": "Person", name: "Shariq Shaukat" },
              sameAs: [
                "https://x.com/shariqshkt",
                "https://github.com/shariqazeem/kyvernlabs",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Kyvern",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              url: `${SITE_URL}/vault`,
              description:
                "Per-agent smart wallets on Solana with hard budgets, merchant allowlists, velocity caps, and a one-click kill switch. Built on Squads Protocol.",
              offers: [
                { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" },
                { "@type": "Offer", price: "99", priceCurrency: "USD", name: "Team" },
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          {/* Global floating "Atlas is live" badge — bottom-right FAB.
              Self-hides on /atlas, /tour, /embed, /vault, /app, /pulse,
              /login where it would be redundant or in the way. Renders
              everywhere else (landing, marketing pages) as a persistent
              "the reference agent is alive" cue. */}
          <FloatingLiveBadge />
        </Providers>
      </body>
    </html>
  );
}
