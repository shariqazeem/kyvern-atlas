"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimeseriesResponse, TimeRange } from "@/types/pulse";
import { getTimeseries } from "@/lib/pulse-api";

export function useTimeseries(range: TimeRange) {
  const [data, setData] = useState<TimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const ts = await getTimeseries(range);
      setData(ts);
    } catch (err) {
      console.error("Failed to fetch timeseries:", err);
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
