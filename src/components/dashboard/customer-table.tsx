"use client";

import { motion } from "framer-motion";
import { useCustomers } from "@/hooks/use-customers";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { Users } from "lucide-react";

interface CustomerTableProps {
  limit?: number;
}

export function CustomerTable({ limit }: CustomerTableProps) {
  const { data, loading } = useCustomers(limit || 20);
  const customers = limit ? data.slice(0, limit) : data;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-border p-5 shadow-premium">
        <div className="h-4 w-32 bg-muted rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white rounded-lg border border-border p-5 shadow-premium"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Top Customers</h3>
        <Users className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="space-y-0">
        <div className="grid grid-cols-4 gap-4 text-xs text-muted-foreground font-medium pb-2 border-b border-border">
          <span>Agent Address</span>
          <span className="text-right">Total Spent</span>
          <span className="text-right">Calls</span>
          <span className="text-right">Top Endpoint</span>
        </div>
        {customers.map((customer, i) => (
          <motion.div
            key={customer.address}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.55 + i * 0.05 }}
            className="grid grid-cols-4 gap-4 py-2.5 text-sm border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors -mx-2 px-2 rounded"
          >
            <span className="font-mono text-xs text-foreground">
              {truncateAddress(customer.address)}
            </span>
            <span className="text-right font-mono-numbers font-medium">
              {formatCurrency(customer.total_spent)}
            </span>
            <span className="text-right font-mono-numbers text-muted-foreground">
              {customer.call_count.toLocaleString()}
            </span>
            <span className="text-right font-mono text-xs text-muted-foreground truncate">
              {customer.top_endpoint}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
