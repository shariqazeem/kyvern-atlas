"use client";

import { useAuth } from "./use-auth";

export function useSubscription() {
  const { plan, proExpiresAt, wallet, isAuthenticated } = useAuth();

  return {
    plan: plan,
    isPro: plan === "pro",
    expiresAt: proExpiresAt,
    wallet: wallet,
    isConnected: isAuthenticated,
    loading: false,
  };
}
