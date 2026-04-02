"use client";

import { motion } from "framer-motion";
import { useRecentTransactions } from "@/hooks/use-recent-transactions";
import {
  formatCurrency,
  truncateAddress,
  truncateTxHash,
  getExplorerTxUrl,
} from "@/lib/utils";
import { ArrowUpRight, Check, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";

interface RecentTransactionsProps {
  limit?: number;
}

export function RecentTransactions({ limit = 10 }: RecentTransactionsProps) {
  const { data, loading } = useRecentTransactions(limit);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-border p-5 shadow-premium">
        <div className="h-4 w-40 bg-muted rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-border p-5 shadow-premium">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Recent Transactions
        </h3>
        <p className="text-sm text-muted-foreground">
          No transactions yet. Use the demo button above or integrate the Pulse middleware.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white rounded-lg border border-border p-5 shadow-premium"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Recent Transactions
        </h3>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="space-y-0">
        <div className="grid grid-cols-6 gap-3 text-[11px] text-quaternary font-medium pb-2 border-b border-black/[0.04]">
          <span>Time</span>
          <span>Endpoint</span>
          <span className="text-right">Amount</span>
          <span>Payer</span>
          <span>Tx Hash</span>
          <span className="text-right">Status</span>
        </div>
        {data.map((tx, i) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ backgroundColor: "rgba(0,0,0,0.015)", x: 2 }}
            transition={{ duration: 0.3, delay: 0.6 + i * 0.03 }}
            className="grid grid-cols-6 gap-3 py-2.5 text-sm border-b border-black/[0.03] last:border-0 -mx-2 px-2 rounded-md cursor-default"
          >
            <span className="text-xs text-muted-foreground">
              {format(parseISO(tx.timestamp), "HH:mm:ss")}
            </span>
            <span className="font-mono text-xs truncate">{tx.endpoint}</span>
            <span className="text-right font-mono-numbers text-xs font-medium">
              {formatCurrency(tx.amount_usd)}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {truncateAddress(tx.payer_address)}
            </span>
            <span>
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
            </span>
            <span className="text-right">
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
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
