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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  return { data, loading };
}
