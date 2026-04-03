"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { SiweMessage } from "siwe";

interface AuthState {
  wallet: string | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewUser: boolean;
  apiKey: string | null; // full key, shown once for new users
  apiKeyPrefix: string | null;
  apiKeyId: string | null;
  plan: "free" | "pro";
  proExpiresAt: string | null;
  onboardingCompleted: boolean;
}

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const [state, setState] = useState<AuthState>({
    wallet: null,
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
  });

  // Check existing session on mount
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setState((prev) => ({
            ...prev,
            wallet: data.wallet,
            isConnected: true,
            isAuthenticated: true,
            isLoading: false,
            apiKeyPrefix: data.apiKeyPrefix,
            apiKeyId: data.apiKeyId,
            plan: data.plan,
            proExpiresAt: data.proExpiresAt,
            onboardingCompleted: data.onboardingCompleted,
          }));
          return;
        }
      }
    } catch {
      // Session check failed, not authenticated
    }
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Update connection state from wagmi
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isConnected,
      wallet: address || null,
    }));
  }, [isConnected, address]);

  // Sign in with SIWE
  const signIn = useCallback(async () => {
    if (!address) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Get nonce from server
      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = await nonceRes.json();

      // Construct SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to KyvernLabs Pulse",
        uri: window.location.origin,
        version: "1",
        chainId: 84532, // Base Sepolia
        nonce,
      });

      const messageStr = message.prepareMessage();

      // Prompt wallet to sign
      const signature = await signMessageAsync({ message: messageStr });

      // Verify on server
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: messageStr, signature }),
      });

      const data = await verifyRes.json();

      if (data.success) {
        setState((prev) => ({
          ...prev,
          wallet: data.wallet,
          isAuthenticated: true,
          isLoading: false,
          isNewUser: data.isNew,
          apiKey: data.apiKey || null, // only set for new users
          apiKeyPrefix: data.apiKeyPrefix,
          plan: "free",
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      console.error("SIWE sign-in failed:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [address, signMessageAsync]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    wagmiDisconnect();
    setState({
      wallet: null,
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
    });
  }, [wagmiDisconnect]);

  // Clear the one-time API key after it's been shown
  const clearApiKey = useCallback(() => {
    setState((prev) => ({ ...prev, apiKey: null, isNewUser: false }));
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    clearApiKey,
    refreshSession: checkSession,
  };
}
