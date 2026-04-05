"use client";

import { useState, useEffect } from "react";
import type { CustomerWithPersona } from "@/types/pulse";
import { getPersonas } from "@/lib/pulse-api";
import { useAuth } from "@/hooks/use-auth";

export function usePersonas(limit = 200) {
  const [data, setData] = useState<CustomerWithPersona[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    getPersonas(limit)
      .then((res) => {
        setData(res.customers);
        setDistribution(res.distribution);
      })
      .catch((err) => console.error("Failed to fetch personas:", err))
      .finally(() => setLoading(false));
  }, [limit, isAuthenticated]);

  return { data, distribution, loading };
}
