"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
// Privy 3.x split wallet APIs per-chain. `useWallets` from the root package
// returns EVM (ConnectedWallet) — Solana wallets live behind the /solana
// subpath (ConnectedSolanaWallet). A Kyvern user can have BOTH (EVM embedded
// + Solana embedded + Solana external like Phantom), so we read both and
// pick the Solana one for vault operations.
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";

interface AuthState {
  wallet: string | null;
  email: string | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewUser: boolean;
  apiKey: string | null;
  apiKeyPrefix: string | null;
  apiKeyId: string | null;
  plan: "free" | "growth" | "pro";
  proExpiresAt: string | null;
  onboardingCompleted: boolean;
  loginMethod: string | null;
}

export function useAuth() {
  const { ready, authenticated, user, login, logout: privyLogout } = usePrivy();
  const { wallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();

  const [state, setState] = useState<AuthState>({
    wallet: null,
    email: null,
    isConnected: false,
    isAuthenticated: false,
    isLoading: true,
    isNewUser: false,
    apiKey: null,
    apiKeyPrefix: null,
    apiKeyId: null,
    plan: "free",
    proExpiresAt: null,
    onboardingCompleted: false,
    loginMethod: null,
  });

  // Get the user's Solana wallet address.
  //
  // Kyvern is Solana-native (vaults, spending limits, Pulse events). Privy
  // can create multiple wallets for the same user — an EVM embedded wallet,
  // a Solana embedded wallet, plus any external wallets the user links (e.g.
  // Phantom Solana). Previously we just returned `wallets[0].address`, which
  // gave us whichever wallet Privy happened to emit first — often the EVM
  // embedded wallet, with a 0x… address. That 0x address would then be
  // shipped to /api/vault/create, Squads v4 couldn't decode it as a Solana
  // pubkey, and the whole create flow 500'd with an obscure error.
  //
  // We now prefer Solana wallets explicitly, in this order:
  //   1. A linked external Solana wallet (Phantom, Solflare, Backpack)
  //   2. A Solana embedded wallet created by Privy on first login
  //   3. `user.wallet` if it happens to be Solana (legacy shape)
  //   4. As an absolute last resort, `wallets[0].address` (might be EVM) —
  //      this only matters for flows like /pulse/upgrade that specifically
  //      need an EVM wallet, and they call this via a separate helper.
  const getWalletAddress = useCallback((): string | null => {
    if (!user) return null;

    // 1. Solana wallets from the dedicated `useSolanaWallets()` hook.
    //    These are wrappers over the Solana Wallet Standard — external
    //    wallets like Phantom/Solflare/Backpack AND Privy's own embedded
    //    Solana wallet (which we force-create via `createOnLogin: "all-users"`
    //    in providers.tsx) all show up here with a base58 `.address`.
    if (solanaWallets && solanaWallets.length > 0) {
      return solanaWallets[0].address;
    }

    // 2. Legacy shape: `user.wallet` on the Privy user object — take it
    //    only if it's NOT an EVM address. Kyvern flows need Solana.
    if (user.wallet) {
      const addr = user.wallet.address;
      if (addr && !addr.startsWith("0x")) return addr;
    }

    // We intentionally DO NOT fall back to EVM wallets (`0x…`). Our vault
    // flow requires a Solana pubkey, and sending an EVM address silently
    // used to surface as a mysterious 500 deep in Squads v4. If the user
    // has only an EVM wallet, returning `null` lets the ConnectGate /
    // wizard show a clear "reconnect with Solana" message instead.
    return null;
  }, [user, solanaWallets]);

  // Try to load session from cookie first (instant, no Privy needed)
  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.authenticated) {
          setState({
            wallet: data.wallet,
            email: null,
            isConnected: true,
            isAuthenticated: true,
            isLoading: false,
            isNewUser: false,
            apiKey: null,
            apiKeyPrefix: data.apiKeyPrefix || null,
            apiKeyId: data.apiKeyId || null,
            plan: data.plan || "free",
            proExpiresAt: data.proExpiresAt || null,
            onboardingCompleted: data.onboardingCompleted || false,
            loginMethod: null,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Sync with Privy when it becomes ready (handles first login, new sessions)
  useEffect(() => {
    if (!ready) return;

    if (!authenticated || !user) {
      setState((prev) => {
        // Don't override if we already loaded from session cookie
        if (prev.isAuthenticated) return prev;
        return {
          ...prev,
          isLoading: false,
          isAuthenticated: false,
          isConnected: false,
          wallet: null,
          email: null,
        };
      });
      return;
    }

    const walletAddress = getWalletAddress();
    const email = user.email?.address || null;
    const loginMethod = user.email ? "email" : user.google ? "google" : "wallet";

    if (walletAddress) {
      syncWithBackend(walletAddress, email, loginMethod);
    } else {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        email,
        loginMethod,
      }));
    }
  }, [ready, authenticated, user, wallets, solanaWallets, getWalletAddress]);

  async function syncWithBackend(walletAddress: string, email: string | null, loginMethod: string) {
    try {
      // Try to verify/create account via our backend
      const res = await fetch("/api/auth/privy-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ wallet_address: walletAddress, email }),
      });

      const data = await res.json();

      if (data.success) {
        setState({
          wallet: walletAddress,
          email,
          isConnected: true,
          isAuthenticated: true,
          isLoading: false,
          isNewUser: data.isNew || false,
          apiKey: data.apiKey || null,
          apiKeyPrefix: data.apiKeyPrefix || null,
          apiKeyId: data.apiKeyId || null,
          plan: data.plan || "free",
          proExpiresAt: data.proExpiresAt || null,
          onboardingCompleted: data.onboardingCompleted || false,
          loginMethod,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
        }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }

  const signIn = useCallback(() => {
    login();
  }, [login]);

  const signOut = useCallback(async () => {
    // Best-effort: clear our backend session cookie. If this fails the
    // user might still have a stale cookie, but the hard redirect below
    // will land them on a public page where that doesn't matter.
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }

    // Best-effort: ask Privy to sign out. Can throw when storage was
    // cleared manually — Privy's in-memory state vs localStorage get
    // out of sync and `logout()` complains. We still want to finish.
    try {
      await privyLogout();
    } catch {
      /* ignore */
    }

    // Clear local hook state. Not strictly needed since we hard-redirect
    // in a moment, but it stops any in-flight render from briefly
    // flashing "authenticated" before the page reload.
    setState({
      wallet: null,
      email: null,
      isConnected: false,
      isAuthenticated: false,
      isLoading: false,
      isNewUser: false,
      apiKey: null,
      apiKeyPrefix: null,
      apiKeyId: null,
      plan: "free",
      proExpiresAt: null,
      onboardingCompleted: false,
      loginMethod: null,
    });

    // HARD redirect (full page load) to the landing page. Necessary
    // because Privy caches a lot of session state in provider context
    // that survives soft navigation — the symptom was: Sign Out "worked"
    // but the user stayed on /app/settings and had to navigate away by
    // hand before they saw they were logged out. A hard reload drops all
    // React state + Privy caches at once.
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [privyLogout]);

  const clearApiKey = useCallback(() => {
    setState((prev) => ({ ...prev, apiKey: null, isNewUser: false }));
  }, []);

  const refreshSession = useCallback(async () => {
    const walletAddress = getWalletAddress();
    if (walletAddress) {
      await syncWithBackend(walletAddress, state.email, state.loginMethod || "wallet");
    }
  }, [getWalletAddress, state.email, state.loginMethod]);

  return {
    ...state,
    signIn,
    signOut,
    clearApiKey,
    refreshSession,
  };
}
