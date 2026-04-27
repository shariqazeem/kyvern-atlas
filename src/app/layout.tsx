import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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

const SITE_URL = "https://kyvernlabs.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kyvern — Let your AI agents run free.",
    template: "%s · Kyvern",
  },
  description:
    "Kyvern is the Solana program that replaces private keys with budgets enforced by consensus. Deploy an AI agent, set the rules on-chain, let it run. Atlas — our reference agent — is live on devnet now.",
  keywords: [
    "autonomous AI agent", "agent autonomy", "AI agent wallet",
    "on-chain authorization", "agent authorization layer",
    "agent policy program", "Solana agent infrastructure",
    "Squads Protocol", "Squads v4", "Squads spending limits",
    "Solana smart account", "Solana multisig", "agent commerce on Solana",
    "x402 Solana", "x402 payments", "USDC Solana",
    "Kyvern", "KyvernLabs", "Atlas autonomous agent",
    "Shariq Azeem",
  ],
  authors: [{ name: "KyvernLabs", url: SITE_URL }],
  creator: "KyvernLabs",
  publisher: "KyvernLabs",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Kyvern",
    title: "Kyvern — Let your AI agents run free.",
    description:
      "The Solana program that lets AI agents operate real money autonomously. Budgets enforced by consensus. Watch Atlas run live on devnet.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Kyvern — Let your AI agents run free.",
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
    title: "Kyvern — Let your AI agents run free.",
    description:
      "Solana-native authorization for autonomous AI agents. Atlas — our reference agent — is operating real money on devnet right now.",
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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
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
                "Kyvern is the Solana program that gives AI agents real economic autonomy. Replaces private keys with budgets, allowlists, and velocity caps enforced by consensus. Atlas — our reference agent — operates autonomously on devnet.",
              founder: { "@type": "Person", name: "Shariq Azeem" },
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
