"use client";

import { useState, useEffect } from "react";
import type { EndpointStats } from "@/types/pulse";
import { getEndpoints } from "@/lib/pulse-api";
import { useAuth } from "@/hooks/use-auth";

export function useEndpoints() {
  const [data, setData] = useState<EndpointStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    getEndpoints()
      .then((res) => setData(res.endpoints))
      .catch((err) => console.error("Failed to fetch endpoints:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return { data, loading };
}
