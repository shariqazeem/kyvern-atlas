"use client";

import { motion } from "framer-motion";
import { useCustomers } from "@/hooks/use-customers";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { Users, Copy } from "lucide-react";
import { ExportButton } from "@/components/dashboard/export-button";
import { useState } from "react";
import { format, parseISO } from "date-fns";

export default function CustomersPage() {
  const { data, loading } = useCustomers(20);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  function copyAddress(address: string) {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="bg-white rounded-lg border border-border p-5">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalSpent = data.reduce((sum, c) => sum + c.total_spent, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Customers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Agent addresses paying for your x402 endpoints
            </p>
          </div>
          <ExportButton type="customers" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-lg border border-border p-4 shadow-premium"
        >
          <p className="text-xs text-muted-foreground font-medium">Unique Agents</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{data.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-lg border border-border p-4 shadow-premium"
        >
          <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">
            {formatCurrency(totalSpent)}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-lg border border-border p-4 shadow-premium"
        >
          <p className="text-xs text-muted-foreground font-medium">Avg Revenue / Agent</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">
            {formatCurrency(data.length > 0 ? totalSpent / data.length : 0)}
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-white rounded-lg border border-border shadow-premium overflow-hidden"
      >
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">
                Agent Address
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                Total Spent
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                Calls
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">
                Top Endpoint
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                First Seen
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                Last Seen
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((customer, i) => (
              <motion.tr
                key={customer.address}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.03 }}
                className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-3">
                  <button
                    onClick={() => copyAddress(customer.address)}
                    className="flex items-center gap-2 group"
                  >
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono text-xs">
                      {truncateAddress(customer.address)}
                    </span>
                    <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    {copiedAddress === customer.address && (
                      <span className="text-[10px] text-pulse">Copied</span>
                    )}
                  </button>
                </td>
                <td className="px-5 py-3 text-right font-mono-numbers text-sm font-medium">
                  {formatCurrency(customer.total_spent)}
                </td>
                <td className="px-5 py-3 text-right font-mono-numbers text-sm text-muted-foreground">
                  {customer.call_count.toLocaleString()}
                </td>
                <td className="px-5 py-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {customer.top_endpoint}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                  {format(parseISO(customer.first_seen), "MMM d")}
                </td>
                <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                  {format(parseISO(customer.last_seen), "MMM d")}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        </div>
      </motion.div>
    </div>
  );
}
