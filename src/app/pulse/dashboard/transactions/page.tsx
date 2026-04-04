"use client";

import { motion } from "framer-motion";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";
import {
  formatCurrency,
  truncateAddress,
  truncateTxHash,
  getExplorerTxUrl,
  getNetworkName,
} from "@/lib/utils";
import { ExternalLink, Check } from "lucide-react";
import { ExportButton } from "@/components/dashboard/export-button";
import { format, parseISO } from "date-fns";

export default function TransactionsPage() {
  const { data, loading } = useRecentTransactions(50, 5000);

  const verifiedCount = data.filter((tx) => tx.source === "middleware").length;
  const totalRevenue = data.reduce((sum, tx) => sum + tx.amount_usd, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="bg-white rounded-lg border border-border p-5">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Individual x402 payment events with blockchain verification
          </p>
        </div>
        <ExportButton type="transactions" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-lg border border-border p-4 shadow-premium"
        >
          <p className="text-xs text-muted-foreground font-medium">Total Events</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{data.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-lg border border-border p-4 shadow-premium"
        >
          <p className="text-xs text-muted-foreground font-medium">On-Chain Verified</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{verifiedCount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-lg border border-border p-4 shadow-premium"
        >
          <p className="text-xs text-muted-foreground font-medium">Revenue (shown)</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">
            {formatCurrency(totalRevenue)}
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
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Time</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Endpoint</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Payer</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Network</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Tx Hash</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Latency</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {data.map((tx, i) => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.02 }}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {format(parseISO(tx.timestamp), "MMM d HH:mm:ss")}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs">{tx.endpoint}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-xs font-medium">
                    {formatCurrency(tx.amount_usd)}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {truncateAddress(tx.payer_address)}
                  </td>
                  <td className="px-5 py-3">
                    {tx.network ? (
                      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        {getNetworkName(tx.network)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {tx.tx_hash ? (
                      <a
                        href={getExplorerTxUrl(tx.tx_hash, tx.network)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-pulse hover:underline"
                      >
                        {truncateTxHash(tx.tx_hash)}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-xs text-muted-foreground">
                    {tx.latency_ms}ms
                  </td>
                  <td className="px-5 py-3 text-right">
                    {tx.source === "middleware" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                        <Check className="w-2.5 h-2.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Demo
                      </span>
                    )}
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
