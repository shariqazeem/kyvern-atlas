"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimeseriesResponse, TimeRange } from "@/types/pulse";
import { getTimeseries } from "@/lib/pulse-api";
import { useAuth } from "@/hooks/use-auth";

export function useTimeseries(range: TimeRange) {
  const [data, setData] = useState<TimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const ts = await getTimeseries(range);
      setData(ts);
    } catch (err) {
      console.error("Failed to fetch timeseries:", err);
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
