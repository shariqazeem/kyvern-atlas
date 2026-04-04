"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  formatCurrency,
  truncateAddress,
  truncateTxHash,
  getExplorerTxUrl,
  getNetworkName,
} from "@/lib/utils";
import { ExternalLink, Check } from "lucide-react";
import { ExportButton } from "@/components/dashboard/export-button";
import { SearchBar, FilterDropdown, Pagination } from "@/components/dashboard/table-controls";
import { format, parseISO } from "date-fns";
import type { RecentTransaction } from "@/types/pulse";

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [data, setData] = useState<RecentTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offset, setOffset] = useState(0);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (search) params.set("search", search);
    if (sourceFilter) params.set("source", sourceFilter);
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/pulse/recent?${params}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setData(json.transactions || []);
        setTotal(json.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, statusFilter, offset]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchData, search ? 300 : 0); // debounce search
    return () => clearTimeout(timer);
  }, [fetchData, search]);

  // Reset offset when filters change
  useEffect(() => { setOffset(0); }, [search, sourceFilter, statusFilter]);

  const verifiedCount = data.filter((tx) => tx.source === "middleware").length;
  const totalRevenue = data.reduce((sum, tx) => sum + tx.amount_usd, 0);

  if (loading && data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Total Events</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{total}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">On-Chain Verified</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{verifiedCount}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Revenue (shown)</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{formatCurrency(totalRevenue)}</p>
        </motion.div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search endpoints, addresses, tx hashes..." />
        </div>
        <FilterDropdown label="Source" value={sourceFilter} onChange={setSourceFilter} options={[
          { value: "", label: "All sources" },
          { value: "middleware", label: "Verified" },
          { value: "seed", label: "Demo" },
        ]} />
        <FilterDropdown label="Status" value={statusFilter} onChange={setStatusFilter} options={[
          { value: "", label: "All statuses" },
          { value: "success", label: "Success" },
          { value: "error", label: "Error" },
        ]} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="bg-white dark:bg-gray-900 rounded-lg border border-border shadow-premium overflow-hidden"
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
              {data.map((tx) => (
                <tr key={tx.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {format(parseISO(tx.timestamp), "MMM d HH:mm:ss")}
                  </td>
                  <td className="px-5 py-3"><span className="font-mono text-xs">{tx.endpoint}</span></td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-xs font-medium">{formatCurrency(tx.amount_usd)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{truncateAddress(tx.payer_address)}</td>
                  <td className="px-5 py-3">
                    {tx.network ? (
                      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        {getNetworkName(tx.network)}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {tx.tx_hash ? (
                      <a href={getExplorerTxUrl(tx.tx_hash, tx.network)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-pulse hover:underline">
                        {truncateTxHash(tx.tx_hash)}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-xs text-muted-foreground">{tx.latency_ms}ms</td>
                  <td className="px-5 py-3 text-right">
                    {tx.source === "middleware" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <Check className="w-2.5 h-2.5" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">Demo</span>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-[13px] text-tertiary">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-3">
          <Pagination offset={offset} limit={PAGE_SIZE} total={total}
            onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            onNext={() => setOffset(offset + PAGE_SIZE)} />
        </div>
      </motion.div>
    </div>
  );
}
