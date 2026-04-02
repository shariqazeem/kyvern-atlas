"use client";

import { useState, useEffect, useCallback } from "react";
import type { StatsResponse, TimeRange } from "@/types/pulse";
import { getStats } from "@/lib/pulse-api";

export function usePulseStats(range: TimeRange) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const stats = await getStats(range);
      setData(stats);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return { data, loading };
}
