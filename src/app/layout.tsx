import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
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
    siteName: "KyvernLabs",
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
  icons: {
    icon: "/favicon.ico",
    apple: "/og-image.jpg",
  },
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
              name: "KyvernLabs",
              url: SITE_URL,
              logo: `${SITE_URL}/og-image.jpg`,
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
              name: "KyvernLabs Vault",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
