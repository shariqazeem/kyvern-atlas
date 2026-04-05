"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { usePersonas } from "@/hooks/use-personas";
import { formatCurrency, truncateAddress } from "@/lib/utils";
import { Copy, ArrowUpDown } from "lucide-react";
import { AgentAvatar } from "@/components/x402/agent-avatar";
import { ExportButton } from "@/components/dashboard/export-button";
import { SearchBar, Pagination } from "@/components/dashboard/table-controls";
import { format, parseISO } from "date-fns";

const PAGE_SIZE = 20;
type SortKey = "total_spent" | "call_count" | "first_seen";

export default function CustomersPage() {
  const { data: raw, distribution, loading } = usePersonas(200);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("total_spent");
  const [sortAsc, setSortAsc] = useState(false);
  const [offset, setOffset] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [personaFilter, setPersonaFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let d = raw;
    if (search) d = d.filter((c) => c.address.toLowerCase().includes(search.toLowerCase()));
    if (personaFilter) d = d.filter((c) => c.persona.name === personaFilter);
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
  }, [raw, search, sortBy, sortAsc, personaFilter]);

  const paged = filtered.slice(offset, offset + PAGE_SIZE);
  const totalSpent = raw.reduce((sum, c) => sum + c.total_spent, 0);

  // Build persona filter options from distribution
  const personaOptions = useMemo(() => {
    return Object.entries(distribution)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => {
        const match = raw.find((c) => c.persona.name === name);
        return { name, count, emoji: match?.persona.emoji || "", color: match?.persona.color || "#78716c" };
      });
  }, [distribution, raw]);

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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Unique Agents</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{raw.length}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{formatCurrency(totalSpent)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-lg border border-border p-4 shadow-premium">
          <p className="text-xs text-muted-foreground font-medium">Avg Revenue / Agent</p>
          <p className="text-xl font-semibold font-mono-numbers mt-1">{formatCurrency(raw.length > 0 ? totalSpent / raw.length : 0)}</p>
        </motion.div>
      </div>

      {/* Persona Distribution Chips */}
      {personaOptions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="flex flex-wrap gap-2">
          <button
            onClick={() => { setPersonaFilter(null); setOffset(0); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              personaFilter === null
                ? "bg-foreground text-white border-foreground"
                : "bg-white text-muted-foreground border-border hover:border-foreground/20"
            }`}
          >
            All
            <span className="font-mono-numbers">{raw.length}</span>
          </button>
          {personaOptions.map((p) => (
            <button
              key={p.name}
              onClick={() => { setPersonaFilter(personaFilter === p.name ? null : p.name); setOffset(0); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                personaFilter === p.name
                  ? "text-white border-transparent"
                  : "bg-white text-muted-foreground border-border hover:border-foreground/20"
              }`}
              style={personaFilter === p.name ? { backgroundColor: p.color, borderColor: p.color } : undefined}
            >
              <span>{p.emoji}</span>
              {p.name}
              <span className="font-mono-numbers">{p.count}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Churn Risk Panel */}
      {(() => {
        const atRisk = raw.filter((c) => c.persona.name === "The Ghost");
        const revenueAtRisk = atRisk.reduce((s, c) => s + c.total_spent, 0);
        if (atRisk.length === 0) return null;
        return (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px]">⚠️</span>
              <h3 className="text-[13px] font-semibold text-amber-800">Churn Risk</h3>
              <span className="text-[11px] text-amber-600">{atRisk.length} agent{atRisk.length > 1 ? "s" : ""} at risk</span>
            </div>
            <p className="text-[12px] text-amber-700 mb-3">
              These agents were active but haven&apos;t been seen in 7+ days. Estimated revenue at risk: <strong className="font-mono-numbers">{formatCurrency(revenueAtRisk)}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {atRisk.slice(0, 5).map((c) => (
                <span key={c.address} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-amber-200 text-[11px]">
                  <span>👻</span>
                  <span className="font-mono">{truncateAddress(c.address)}</span>
                  <span className="text-amber-600 font-medium">{formatCurrency(c.total_spent)}</span>
                </span>
              ))}
            </div>
          </motion.div>
        );
      })()}

      <SearchBar value={search} onChange={(v) => { setSearch(v); setOffset(0); }} placeholder="Search wallet addresses..." />

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg border border-border shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Agent</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Persona</th>
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
                <tr key={customer.address} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <button onClick={() => copyAddress(customer.address)} className="flex items-center gap-2 group">
                      <AgentAvatar address={customer.address} size={22} />
                      <span className="font-mono text-xs">{truncateAddress(customer.address)}</span>
                      <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      {copiedAddress === customer.address && <span className="text-[10px] text-pulse">Copied</span>}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                      style={{ backgroundColor: customer.persona.color }}
                      title={customer.persona.description}
                    >
                      {customer.persona.emoji} {customer.persona.name}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-sm font-medium">{formatCurrency(customer.total_spent)}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-sm text-muted-foreground">{customer.call_count.toLocaleString()}</td>
                  <td className="px-5 py-3"><span className="font-mono text-xs text-muted-foreground">{customer.favorite_endpoint}</span></td>
                  <td className="px-5 py-3 text-right text-xs text-muted-foreground">{format(parseISO(customer.first_seen), "MMM d")}</td>
                  <td className="px-5 py-3 text-right text-xs text-muted-foreground">{format(parseISO(customer.last_seen), "MMM d")}</td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-tertiary">No customers found</td></tr>}
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
