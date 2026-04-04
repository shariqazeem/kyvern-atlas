"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useEndpoints } from "@/hooks/use-endpoints";
import { formatCurrency } from "@/lib/utils";
import { Globe, ArrowUpDown } from "lucide-react";
import { ExportButton } from "@/components/dashboard/export-button";
import { SearchBar, Pagination } from "@/components/dashboard/table-controls";

const PAGE_SIZE = 20;

type SortKey = "calls" | "revenue" | "avg_latency" | "error_rate";

export default function EndpointsPage() {
  const { data: raw, loading } = useEndpoints();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("revenue");
  const [sortAsc, setSortAsc] = useState(false);
  const [offset, setOffset] = useState(0);

  const filtered = useMemo(() => {
    let d = raw;
    if (search) d = d.filter((e) => e.path.toLowerCase().includes(search.toLowerCase()));
    d = [...d].sort((a, b) => {
      const va = a[sortBy] as number;
      const vb = b[sortBy] as number;
      return sortAsc ? va - vb : vb - va;
    });
    return d;
  }, [raw, search, sortBy, sortAsc]);

  const paged = filtered.slice(offset, offset + PAGE_SIZE);
  const totalRevenue = raw.reduce((sum, ep) => sum + ep.revenue, 0);
  const totalCalls = raw.reduce((sum, ep) => sum + ep.calls, 0);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
    setOffset(0);
  }

  if (loading) {
    return <div className="space-y-6"><div className="h-6 w-40 bg-muted rounded animate-pulse" /><div className="h-64 bg-muted/50 rounded-xl animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Endpoints</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Performance breakdown for each x402 endpoint</p>
        </div>
        <ExportButton type="endpoints" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Active Endpoints</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{raw.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{formatCurrency(totalRevenue)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Total Calls</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{totalCalls.toLocaleString()}</p>
        </motion.div>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setOffset(0); }} placeholder="Search endpoints..." />

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Endpoint</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Label</th>
                {(["calls", "revenue", "avg_latency", "error_rate"] as SortKey[]).map((key) => (
                  <th key={key} className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                    <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      {key === "calls" ? "Calls" : key === "revenue" ? "Revenue" : key === "avg_latency" ? "Latency" : "Error Rate"}
                      <ArrowUpDown className={`w-3 h-3 ${sortBy === key ? "text-pulse" : ""}`} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((ep) => (
                <tr key={ep.path} className="border-b border-border/50 last:border-0 hover:bg-muted/30 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-5 py-3"><div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-muted-foreground" /><span className="font-mono text-xs">{ep.path}</span></div></td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{ep.label || "—"}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-sm">{ep.calls.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-sm font-medium">{formatCurrency(ep.revenue)}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-sm text-muted-foreground">{ep.avg_latency}ms</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
                      ep.error_rate < 2 ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600" :
                      ep.error_rate < 5 ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600" : "bg-red-50 dark:bg-red-900/30 text-red-600"
                    }`}>{ep.error_rate}%</span>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-tertiary">No endpoints found</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-3">
          <Pagination offset={offset} limit={PAGE_SIZE} total={filtered.length}
            onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            onNext={() => setOffset(offset + PAGE_SIZE)} />
        </div>
      </motion.div>
    </div>
  );
}
