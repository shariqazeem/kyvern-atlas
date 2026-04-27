"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * Providers — PrivyProvider with Solana + Base (EVM) support.
 *
 * Kyvern is Solana-native (Vault + Pulse). We still support Base because
 * the /pulse/upgrade flow accepts USDC-on-Base for plan upgrades (x402
 * pay-with-EVM).
 *
 * Two mitigations live here that exist to paper over real browser-
 * extension edge cases we keep running into in production:
 *
 * 1. `toSolanaWalletConnectors()` — tells Privy to treat wallets that
 *    advertise themselves via the Solana Wallet Standard as Solana
 *    wallets rather than trying to attach EIP-1193 `.on()` listeners.
 *
 * 2. `polyfillInjectedProviders()` — run BEFORE Privy initializes. It
 *    walks every injected provider (including those discovered via
 *    EIP-6963) and stubs any missing EIP-1193 methods (`on`, `removeListener`,
 *    `addListener`) with no-ops. This unblocks Privy 3.22's wallet-
 *    discovery loop when a Solana-only extension (Phantom in SOL mode,
 *    Backpack, Solflare) registers itself without implementing the full
 *    EIP-1193 surface — which otherwise crashes with
 *    `this.walletProvider?.on is not a function`.
 *
 *    Harmless if the methods already exist. Runs once per tab.
 * ════════════════════════════════════════════════════════════════════
 */

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { base } from "viem/chains";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

// Cached Solana connector list — keeps the `shouldAutoConnect` hook honest
// and avoids re-instantiating the adapter on every render.
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

/**
 * Walks every injected EVM provider (legacy `window.ethereum` + every
 * provider announced via the EIP-6963 discovery event) and stubs any
 * missing event-emitter methods with a no-op. Privy's wallet-discovery
 * loop calls `provider.on("accountsChanged", …)` unconditionally on
 * every discovered provider — and Solana-first wallets like Phantom,
 * when running without their EVM shim enabled, are announced as
 * injected providers without a working `.on()` method.
 *
 * Without this, one misbehaving extension poisons the whole Privy init
 * and users see an opaque red TypeError in console and can't sign in.
 *
 * The polyfill is intentionally minimal: if `.on` is missing we add a
 * no-op. If it exists, we leave it alone. Same for `removeListener`
 * and `addListener`. We do NOT mutate providers that are already
 * fully-formed EIP-1193, so MetaMask/Coinbase/Rainbow flows are
 * completely unaffected.
 */
function polyfillInjectedProviders() {
  if (typeof window === "undefined") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub = (p: any) => {
    if (!p || typeof p !== "object") return;
    if (typeof p.on !== "function") p.on = () => p;
    if (typeof p.removeListener !== "function") p.removeListener = () => p;
    if (typeof p.addListener !== "function") p.addListener = () => p;
    if (typeof p.removeAllListeners !== "function")
      p.removeAllListeners = () => p;
  };

  // 1) Legacy window.ethereum (and its .providers array on multi-wallet setups)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as any).ethereum;
    stub(eth);
    if (eth && Array.isArray(eth.providers)) eth.providers.forEach(stub);
  } catch {
    /* browsers sometimes make window.ethereum non-configurable */
  }

  // 2) EIP-6963 — any provider announced via the standard discovery event
  try {
    const handler = (e: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any).detail;
      if (detail?.provider) stub(detail.provider);
    };
    window.addEventListener(
      "eip6963:announceProvider" as keyof WindowEventMap,
      handler as EventListener,
    );
    // Kick providers already loaded to announce themselves so we catch them.
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {
    /* no-op */
  }
}

// IMPORTANT: run the polyfill at module load, BEFORE PrivyProvider mounts.
// useEffect runs AFTER children render, which is too late — Privy would
// already have iterated injected wallets and crashed. This runs once per
// JS chunk load (so once per tab).
polyfillInjectedProviders();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#3b82f6",
          logo: "/kyvernlabs_logo.jpg",
          landingHeader: "Sign in to Kyvern",
          showWalletLoginFirst: false,
          walletChainType: "ethereum-and-solana",
        },
        loginMethods: ["email", "google", "wallet"],
        // Default chain stays Base so the legacy /pulse/upgrade flow keeps
        // working. Solana clusters are declared separately below.
        defaultChain: base,
        supportedChains: [base],
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
        embeddedWallets: {
          ethereum: {
            // EVM is only needed for the legacy /pulse/upgrade USDC-on-Base
            // flow. Don't create an EVM embedded wallet unless the user
            // literally signs in with no wallet at all — this reduces the
            // "which wallet is my primary?" confusion.
            createOnLogin: "users-without-wallets",
          },
          solana: {
            // Solana is the chain Kyvern vaults run on. Create an embedded
            // Solana wallet for EVERY user on first login, including users
            // who sign in with an external EVM wallet (Phantom's EVM mode,
            // MetaMask). Without this, a user who connects Phantom-EVM gets
            // only an 0x address from Privy and vault creation fails with
            // "ownerWallet looks like an Ethereum address." Forcing Solana
            // creation guarantees every signed-in user has a usable Solana
            // pubkey for Squads v4.
            createOnLogin: "all-users",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
