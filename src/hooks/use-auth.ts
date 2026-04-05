"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

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

  // Get the user's wallet address (from connected wallet or Privy embedded wallet)
  const getWalletAddress = useCallback((): string | null => {
    if (!user) return null;

    // Check linked wallets first
    if (wallets && wallets.length > 0) {
      return wallets[0].address;
    }

    // Check Privy user's wallet
    if (user.wallet) {
      return user.wallet.address;
    }

    return null;
  }, [user, wallets]);

  // Sync with our backend when Privy auth state changes
  useEffect(() => {
    if (!ready) return;

    if (!authenticated || !user) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        isConnected: false,
        wallet: null,
        email: null,
      }));
      return;
    }

    const walletAddress = getWalletAddress();
    const email = user.email?.address || null;
    const loginMethod = user.email ? "email" : user.google ? "google" : "wallet";

    // If we have a wallet, sync with our backend
    if (walletAddress) {
      syncWithBackend(walletAddress, email, loginMethod);
    } else {
      // User logged in with email but embedded wallet not ready yet — wait
      setState((prev) => ({
        ...prev,
        isLoading: true,
        email,
        loginMethod,
      }));
    }
  }, [ready, authenticated, user, wallets, getWalletAddress]);

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
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    await privyLogout();
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
