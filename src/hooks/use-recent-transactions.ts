"use client";

import { useState, useEffect, useCallback } from "react";
import type { RecentTransaction } from "@/types/pulse";
import { useAuth } from "@/hooks/use-auth";

export function useRecentTransactions(limit = 20, pollIntervalMs = 5000) {
  const [data, setData] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`/api/pulse/recent?limit=${limit}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json.transactions);
      }
    } catch (err) {
      console.error("Failed to fetch recent transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [limit, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
    const interval = setInterval(fetchData, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchData, pollIntervalMs, isAuthenticated]);

  return { data, loading };
}
