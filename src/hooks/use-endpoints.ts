"use client";

import { useState, useEffect } from "react";
import type { EndpointStats } from "@/types/pulse";
import { getEndpoints } from "@/lib/pulse-api";

export function useEndpoints() {
  const [data, setData] = useState<EndpointStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEndpoints()
      .then((res) => setData(res.endpoints))
      .catch((err) => console.error("Failed to fetch endpoints:", err))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
