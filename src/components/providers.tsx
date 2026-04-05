"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base, baseSepolia } from "viem/chains";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#3b82f6",
          logo: "/og-image.jpg",
          landingHeader: "Sign in to KyvernLabs",
          showWalletLoginFirst: false,
        },
        loginMethods: ["email", "google", "wallet"],
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia, base],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
