"use client";

import { useState, useEffect, useCallback } from "react";
import type { StatsResponse, TimeRange } from "@/types/pulse";
import { getStats } from "@/lib/pulse-api";
import { useAuth } from "@/hooks/use-auth";

export function usePulseStats(range: TimeRange) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const stats = await getStats(range);
      setData(stats);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, [range, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetchData();
  }, [fetchData, isAuthenticated]);

  return { data, loading };
}
