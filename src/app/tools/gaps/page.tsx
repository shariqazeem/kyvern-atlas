"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Search, Zap, Globe, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface Gap {
  endpoint: string;
  category: string;
  demand_calls: number;
  demand_agents: number;
  providers: number;
  avg_price: number;
  monthly_revenue: number;
  opportunity_score: number;
}

interface Category {
  category: string;
  total_calls: number;
  total_revenue: number;
  endpoint_count: number;
  unique_agents: number;
  avg_price: number;
  gap_score: number;
}

export default function MarketGapsPage() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pulse/gaps")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setGaps(d.gaps || []);
          setCategories(d.categories || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-pulse/20 bg-pulse-50 text-[11px] tracking-wide font-medium text-pulse-600 mb-4">
              <Search className="w-3 h-3" />
              Free Tool
            </div>
            <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-[-0.03em]">
              x402 Market Gap Finder
            </h1>
            <p className="text-[15px] text-secondary mt-2 max-w-xl">
              Find endpoint categories with high demand but few providers. Build where the opportunity is biggest.
            </p>
          </motion.div>

          {loading ? (
            <div className="space-y-4 mt-10">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#F0F0F0] rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-10 mt-10">
              {/* Category Overview */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease }}>
                <h2 className="text-[17px] font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-pulse" /> Categories by Opportunity
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.filter((c) => c.category !== "Other").map((cat, i) => (
                    <motion.div
                      key={cat.category}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i, ease }}
                      className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-premium"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-semibold">{cat.category}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                          Score: {cat.gap_score}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[14px] font-semibold font-mono-numbers">{cat.total_calls}</p>
                          <p className="text-[9px] text-quaternary">Calls</p>
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold font-mono-numbers">{cat.endpoint_count}</p>
                          <p className="text-[9px] text-quaternary">Endpoints</p>
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold font-mono-numbers">{formatCurrency(cat.avg_price)}</p>
                          <p className="text-[9px] text-quaternary">Avg Price</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Top Opportunities */}
              {gaps.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease }}>
                  <h2 className="text-[17px] font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Top Opportunities
                  </h2>
                  <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden shadow-premium">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-black/[0.04]">
                          <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Endpoint</th>
                          <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Category</th>
                          <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Demand</th>
                          <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Agents</th>
                          <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Avg Price</th>
                          <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gaps.map((g) => (
                          <tr key={g.endpoint} className="border-b border-black/[0.03] last:border-0">
                            <td className="px-5 py-3 font-mono text-[12px]">{g.endpoint}</td>
                            <td className="px-5 py-3">
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F0F0F0] text-tertiary">
                                {g.category}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">{g.demand_calls}</td>
                            <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">{g.demand_agents}</td>
                            <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">{formatCurrency(g.avg_price)}</td>
                            <td className="px-5 py-3 text-right">
                              <span className="font-mono-numbers text-[12px] font-semibold text-emerald-600">{g.opportunity_score}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease }}
                className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-6 text-center">
                <p className="text-[14px] font-semibold mb-1">Found an opportunity?</p>
                <p className="text-[12px] text-tertiary mb-4">
                  Build your x402 endpoint, install Pulse, and track every payment from day one.
                </p>
                <a href="/pulse" className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-foreground text-white text-[13px] font-medium hover:bg-foreground/90 transition-colors">
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
