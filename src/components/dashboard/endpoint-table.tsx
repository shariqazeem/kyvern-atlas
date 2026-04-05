"use client";

import { motion } from "framer-motion";
import { useEndpoints } from "@/hooks/use-endpoints";
import { formatCurrency } from "@/lib/utils";
import { ExportButton } from "./export-button";

interface EndpointTableProps {
  limit?: number;
}

export function EndpointTable({ limit }: EndpointTableProps) {
  const { data, loading } = useEndpoints();
  const endpoints = limit ? data.slice(0, limit) : data;

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
      transition={{ duration: 0.5, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white rounded-lg border border-border p-5 shadow-premium"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Top Endpoints</h3>
        <ExportButton type="endpoints" compact />
      </div>
      <div className="space-y-0">
        <div className="grid grid-cols-4 gap-4 text-xs min-w-[400px] text-muted-foreground font-medium pb-2 border-b border-border">
          <span>Endpoint</span>
          <span className="text-right">Calls</span>
          <span className="text-right">Revenue</span>
          <span className="text-right">Avg Latency</span>
        </div>
        {endpoints.map((ep, i) => (
          <motion.div
            key={ep.path}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
            className="grid grid-cols-4 gap-4 py-2.5 text-sm border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors -mx-2 px-2 rounded"
          >
            <span className="font-mono text-xs text-foreground truncate">
              {ep.path}
            </span>
            <span className="text-right font-mono-numbers text-muted-foreground">
              {ep.calls.toLocaleString()}
            </span>
            <span className="text-right font-mono-numbers font-medium">
              {formatCurrency(ep.revenue)}
            </span>
            <span className="text-right font-mono-numbers text-muted-foreground">
              {ep.avg_latency}ms
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
