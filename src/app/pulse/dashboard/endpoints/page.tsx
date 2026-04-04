"use client";

import { motion } from "framer-motion";
import { useEndpoints } from "@/hooks/use-endpoints";
import { formatCurrency } from "@/lib/utils";
import { Globe } from "lucide-react";
import { ExportButton } from "@/components/dashboard/export-button";

export default function EndpointsPage() {
  const { data, loading } = useEndpoints();

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

  const totalRevenue = data.reduce((sum, ep) => sum + ep.revenue, 0);
  const totalCalls = data.reduce((sum, ep) => sum + ep.calls, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Endpoints</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Performance breakdown for each x402 endpoint
            </p>
          </div>
          <ExportButton type="endpoints" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-lg border border-border p-4 shadow-premium"
        >
          <p className="text-xs text-muted-foreground font-medium">Active Endpoints</p>
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
            {formatCurrency(totalRevenue)}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-lg border border-border p-4 shadow-premium"
        >
          <p className="text-xs text-muted-foreground font-medium">Total Calls</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">
            {totalCalls.toLocaleString()}
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
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">
                Endpoint
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">
                Label
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                Calls
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                Revenue
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                Avg Latency
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                Error Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((ep, i) => (
              <motion.tr
                key={ep.path}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.04 }}
                className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono text-xs">{ep.path}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  {ep.label || "—"}
                </td>
                <td className="px-5 py-3 text-right font-mono-numbers text-sm">
                  {ep.calls.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right font-mono-numbers text-sm font-medium">
                  {formatCurrency(ep.revenue)}
                </td>
                <td className="px-5 py-3 text-right font-mono-numbers text-sm text-muted-foreground">
                  {ep.avg_latency}ms
                </td>
                <td className="px-5 py-3 text-right">
                  <span
                    className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
                      ep.error_rate < 2
                        ? "bg-emerald-50 text-emerald-600"
                        : ep.error_rate < 5
                        ? "bg-amber-50 text-amber-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {ep.error_rate}%
                  </span>
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
