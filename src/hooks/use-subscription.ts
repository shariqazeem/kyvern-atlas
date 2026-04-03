"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

interface Subscription {
  plan: "free" | "pro";
  expires_at?: string;
  wallet?: string;
}

export function useSubscription() {
  const { address, isConnected } = useAccount();
  const [sub, setSub] = useState<Subscription>({ plan: "free" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setSub({ plan: "free" });
      return;
    }

    setLoading(true);
    fetch(`/api/subscription?wallet=${address}`)
      .then((r) => r.json())
      .then((data) => setSub(data))
      .catch(() => setSub({ plan: "free" }))
      .finally(() => setLoading(false));
  }, [address, isConnected]);

  return {
    plan: sub.plan,
    isPro: sub.plan === "pro",
    expiresAt: sub.expires_at,
    wallet: address,
    isConnected,
    loading,
  };
}
