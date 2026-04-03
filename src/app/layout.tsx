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
    default: "KyvernLabs — The Business Layer for the x402 Economy",
    template: "%s | KyvernLabs",
  },
  description:
    "Revenue analytics, wallet-native auth, and on-chain verification for x402 service providers. One line of code turns any x402 endpoint into a real company. Built for the x402 Foundation ecosystem.",
  keywords: [
    "x402", "x402 analytics", "x402 dashboard", "x402 revenue",
    "x402 middleware", "x402 payments", "x402 protocol",
    "x402 foundation", "x402 infrastructure", "x402 business layer",
    "HTTP 402", "micropayments", "agent payments", "AI agent commerce",
    "agentic finance", "agentic economy", "agent-to-agent payments",
    "USDC payments", "Base blockchain", "blockchain analytics",
    "crypto payments dashboard", "web3 analytics", "DeFi analytics",
    "payment protocol", "API monetization", "API analytics",
    "KyvernLabs", "Pulse analytics", "withPulse middleware",
    "x402 service provider", "x402 endpoint analytics",
    "Coinbase x402", "Cloudflare x402", "Stripe x402",
    "on-chain verification", "SIWE authentication",
  ],
  authors: [{ name: "KyvernLabs", url: SITE_URL }],
  creator: "KyvernLabs",
  publisher: "KyvernLabs",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "KyvernLabs",
    title: "KyvernLabs — The Business Layer for x402",
    description:
      "Revenue analytics and on-chain verification for every x402 service provider. Wallet-native auth. One-line middleware. Built for the x402 Foundation ecosystem.",
    images: [
      {
        url: "/og-image.jpg",
        width: 512,
        height: 512,
        alt: "KyvernLabs — The Business Layer for x402",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KyvernLabs — The Business Layer for x402",
    description:
      "Revenue analytics and on-chain verification for every x402 service provider. Built for the x402 Foundation ecosystem.",
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
        {/* Structured data — Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "KyvernLabs",
              url: SITE_URL,
              logo: `${SITE_URL}/og-image.jpg`,
              description: "The business layer for the x402 economy. Revenue analytics, wallet-native auth, and on-chain verification for x402 service providers.",
              founder: { "@type": "Person", name: "Shariq Azeem" },
              sameAs: ["https://x.com/shariqshkt", "https://github.com/shariqazeem/kyvernlabs"],
            }),
          }}
        />
        {/* Structured data — SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Pulse by KyvernLabs",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: `${SITE_URL}/pulse`,
              description: "Real-time revenue intelligence for x402 service providers. One-line middleware integration with on-chain verification.",
              offers: [
                { "@type": "Offer", price: "0", priceCurrency: "USD", name: "Free" },
                { "@type": "Offer", price: "49", priceCurrency: "USD", name: "Pro" },
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
