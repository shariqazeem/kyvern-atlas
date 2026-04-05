"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { StatsResponse, TimeRange } from "@/types/pulse";
import { getStats } from "@/lib/pulse-api";

export function usePulseStats(range: TimeRange) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const stats = await getStats(range);
      setData(stats);
      hasFetched.current = true;
    } catch {
      // Session might not be ready yet — will retry
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Fetch immediately on mount — session cookie persists across navigation
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return { data, loading };
}
