"use client";

import { useState, useEffect } from "react";
import type { CustomerStats } from "@/types/pulse";
import { getCustomers } from "@/lib/pulse-api";

export function useCustomers(limit = 20) {
  const [data, setData] = useState<CustomerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomers(limit)
      .then((res) => setData(res.customers))
      .catch((err) => console.error("Failed to fetch customers:", err))
      .finally(() => setLoading(false));
  }, [limit]);

  return { data, loading };
}
