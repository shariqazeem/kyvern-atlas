"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useCustomers } from "@/hooks/use-customers";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { Copy, ArrowUpDown } from "lucide-react";
import { ExportButton } from "@/components/dashboard/export-button";
import { SearchBar, Pagination } from "@/components/dashboard/table-controls";
import { format, parseISO } from "date-fns";

const PAGE_SIZE = 20;
type SortKey = "total_spent" | "call_count" | "first_seen";

export default function CustomersPage() {
  const { data: raw, loading } = useCustomers(200);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("total_spent");
  const [sortAsc, setSortAsc] = useState(false);
  const [offset, setOffset] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let d = raw;
    if (search) d = d.filter((c) => c.address.toLowerCase().includes(search.toLowerCase()));
    d = [...d].sort((a, b) => {
      if (sortBy === "first_seen") {
        return sortAsc
          ? new Date(a.first_seen).getTime() - new Date(b.first_seen).getTime()
          : new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime();
      }
      const va = a[sortBy] as number;
      const vb = b[sortBy] as number;
      return sortAsc ? va - vb : vb - va;
    });
    return d;
  }, [raw, search, sortBy, sortAsc]);

  const paged = filtered.slice(offset, offset + PAGE_SIZE);
  const totalSpent = raw.reduce((sum, c) => sum + c.total_spent, 0);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
    setOffset(0);
  }

  function copyAddress(address: string) {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  }

  if (loading) {
    return <div className="space-y-6"><div className="h-6 w-40 bg-muted rounded animate-pulse" /><div className="h-64 bg-muted/50 rounded-xl animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Agent addresses paying for your x402 endpoints</p>
        </div>
        <ExportButton type="customers" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Unique Agents</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{raw.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{formatCurrency(totalSpent)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Avg Revenue / Agent</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{formatCurrency(raw.length > 0 ? totalSpent / raw.length : 0)}</p>
        </motion.div>
      </div>

      <SearchBar value={search} onChange={(v) => { setSearch(v); setOffset(0); }} placeholder="Search wallet addresses..." />

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-lg border border-border shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Agent Address</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                  <button onClick={() => toggleSort("total_spent")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Total Spent <ArrowUpDown className={`w-3 h-3 ${sortBy === "total_spent" ? "text-pulse" : ""}`} />
                  </button>
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                  <button onClick={() => toggleSort("call_count")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Calls <ArrowUpDown className={`w-3 h-3 ${sortBy === "call_count" ? "text-pulse" : ""}`} />
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Top Endpoint</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">
                  <button onClick={() => toggleSort("first_seen")} className="inline-flex items-center gap-1 hover:text-foreground">
                    First Seen <ArrowUpDown className={`w-3 h-3 ${sortBy === "first_seen" ? "text-pulse" : ""}`} />
                  </button>
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((customer) => (
                <tr key={customer.address} className="border-b border-border/50 last:border-0 hover:bg-muted/30 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-5 py-3">
                    <button onClick={() => copyAddress(customer.address)} className="flex items-center gap-2 group">
                      <span className="font-mono text-xs">{truncateAddress(customer.address)}</span>
                      <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      {copiedAddress === customer.address && <span className="text-[10px] text-pulse">Copied</span>}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-sm font-medium">{formatCurrency(customer.total_spent)}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-sm text-muted-foreground">{customer.call_count.toLocaleString()}</td>
                  <td className="px-5 py-3"><span className="font-mono text-xs text-muted-foreground">{customer.top_endpoint}</span></td>
                  <td className="px-5 py-3 text-right text-xs text-muted-foreground">{format(parseISO(customer.first_seen), "MMM d")}</td>
                  <td className="px-5 py-3 text-right text-xs text-muted-foreground">{format(parseISO(customer.last_seen), "MMM d")}</td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-[13px] text-tertiary">No customers found</td></tr>}
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
