"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Search, Shield, Check, Globe, ArrowUpDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface Service {
  endpoint: string;
  category: string;
  total_calls: number;
  total_revenue: number;
  avg_price: number;
  unique_agents: number;
  last_active: string;
  tracked_by_pulse: boolean;
  health: string;
}

interface CategorySummary {
  name: string;
  count: number;
  calls: number;
}

const HEALTH_COLORS: Record<string, string> = {
  excellent: "bg-emerald-50 text-emerald-600",
  good: "bg-blue-50 text-blue-600",
  fair: "bg-amber-50 text-amber-600",
  inactive: "bg-gray-100 text-gray-500",
};

export default function RegistryPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"total_calls" | "total_revenue" | "avg_price">("total_calls");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetch("/api/pulse/registry")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setServices(d.services || []);
          setCategories(d.categories || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = services;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.endpoint.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
    }
    if (selectedCat) {
      result = result.filter((s) => s.category === selectedCat);
    }
    result = [...result].sort((a, b) => {
      const va = a[sortBy] as number;
      const vb = b[sortBy] as number;
      return sortAsc ? va - vb : vb - va;
    });
    return result;
  }, [services, search, selectedCat, sortBy, sortAsc]);

  function toggleSort(key: typeof sortBy) {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-36 pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-pulse/20 bg-pulse-50 text-[11px] tracking-wide font-medium text-pulse-600 mb-4">
              <Globe className="w-3 h-3" />
              x402 Ecosystem
            </div>
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-[-0.03em]">
              x402 Service Registry
            </h1>
            <p className="text-[15px] text-secondary mt-2 max-w-xl">
              Every known x402 endpoint in the ecosystem. Search by name, filter by category, and discover services tracked by Pulse.
            </p>
          </motion.div>

          {/* Category chips */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease }}
            className="flex flex-wrap gap-2 mt-8">
            <button
              onClick={() => setSelectedCat(null)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                selectedCat === null ? "bg-foreground text-white border-foreground" : "bg-white text-secondary border-black/[0.06] hover:border-black/[0.12]"
              }`}
            >
              All ({services.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCat(selectedCat === cat.name ? null : cat.name)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                  selectedCat === cat.name ? "bg-foreground text-white border-foreground" : "bg-white text-secondary border-black/[0.06] hover:border-black/[0.12]"
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease }}
            className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quaternary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search endpoints..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-black/[0.08] bg-white text-[13px] placeholder:text-quaternary focus:outline-none focus:ring-2 focus:ring-pulse/20"
            />
          </motion.div>

          {/* Table */}
          {loading ? (
            <div className="mt-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-[#F0F0F0] rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease }}
              className="mt-6 rounded-xl border border-black/[0.06] bg-white overflow-hidden shadow-premium">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-black/[0.04]">
                      <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Endpoint</th>
                      <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Category</th>
                      <th className="text-center text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">Status</th>
                      <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">
                        <button onClick={() => toggleSort("total_calls")} className="inline-flex items-center gap-1 hover:text-primary">
                          Calls <ArrowUpDown className={`w-3 h-3 ${sortBy === "total_calls" ? "text-pulse" : ""}`} />
                        </button>
                      </th>
                      <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">
                        <button onClick={() => toggleSort("avg_price")} className="inline-flex items-center gap-1 hover:text-primary">
                          Price <ArrowUpDown className={`w-3 h-3 ${sortBy === "avg_price" ? "text-pulse" : ""}`} />
                        </button>
                      </th>
                      <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Agents</th>
                      <th className="text-center text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">Pulse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((svc) => (
                      <tr key={svc.endpoint} className="border-b border-black/[0.03] last:border-0 hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-5 py-3 font-mono text-[12px] font-medium">{svc.endpoint}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F0F0F0] text-tertiary">{svc.category}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${HEALTH_COLORS[svc.health] || HEALTH_COLORS.inactive}`}>
                            {svc.health}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">{svc.total_calls.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">{formatCurrency(svc.avg_price)}</td>
                        <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{svc.unique_agents}</td>
                        <td className="px-3 py-3 text-center">
                          {svc.tracked_by_pulse ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                              <Check className="w-3 h-3" /> Tracked
                            </span>
                          ) : (
                            <a href="/pulse" className="text-[10px] text-pulse hover:underline">Add Pulse</a>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-tertiary">No services found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease }}
            className="mt-10 rounded-xl bg-pulse-50/30 border border-pulse/10 p-6 text-center">
            <Shield className="w-8 h-8 text-pulse mx-auto mb-3" />
            <p className="text-[14px] font-semibold mb-1">Claim your x402 service</p>
            <p className="text-[12px] text-tertiary mb-4 max-w-md mx-auto">
              Install Pulse middleware to verify ownership of your endpoint. Get a
              &ldquo;Verified by Pulse&rdquo; badge and analytics for free.
            </p>
            <a href="/pulse/dashboard/setup" className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-foreground text-white text-[13px] font-medium hover:bg-foreground/90 transition-colors">
              Install Pulse — 60 seconds
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
