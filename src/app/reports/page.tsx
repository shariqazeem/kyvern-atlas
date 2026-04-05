"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { BarChart3, TrendingUp, Globe, Users, ArrowUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface MarketData {
  market_stats: {
    total_transactions: number;
    total_volume: number;
    active_endpoints: number;
    unique_agents: number;
    providers: number;
  };
  top_by_volume: Array<{ endpoint: string; calls: number; revenue: number; avg_price: number }>;
  top_by_revenue: Array<{ endpoint: string; calls: number; revenue: number; avg_price: number }>;
  daily_volume: Array<{ date: string; transactions: number; volume: number }>;
  trending: Array<{ endpoint: string; calls: number; growth_pct: number }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pulse/leaderboard")
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-pulse-50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-pulse" />
              </div>
              <div>
                <h1 className="text-[24px] font-bold tracking-tight">State of the x402 Economy</h1>
                <p className="text-[13px] text-tertiary">{month} Report by KyvernLabs</p>
              </div>
            </div>
            <p className="text-[15px] text-secondary leading-relaxed mb-8">
              Monthly analysis of the x402 payment protocol ecosystem — transaction volumes, pricing trends,
              emerging categories, and growth patterns. Data sourced from KyvernLabs Pulse analytics network.
            </p>
          </motion.div>

          {loading ? (
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#F0F0F0] rounded-xl animate-pulse" />)}
            </div>
          ) : !data ? (
            <div className="text-center py-16 text-tertiary">Unable to load market data.</div>
          ) : (
            <div className="space-y-10">
              {/* Market Overview */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ease }}>
                <h2 className="text-[17px] font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pulse" /> Market Overview
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Total Volume", value: formatCurrency(data.market_stats.total_volume), icon: BarChart3 },
                    { label: "Transactions", value: data.market_stats.total_transactions.toLocaleString(), icon: TrendingUp },
                    { label: "Active Endpoints", value: String(data.market_stats.active_endpoints), icon: Globe },
                    { label: "Unique Agents", value: String(data.market_stats.unique_agents), icon: Users },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-premium">
                      <s.icon className="w-4 h-4 text-quaternary mb-2" />
                      <p className="text-[20px] font-semibold font-mono-numbers">{s.value}</p>
                      <p className="text-[11px] text-quaternary mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Daily Volume Chart (text-based for simplicity) */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease }}>
                <h2 className="text-[17px] font-semibold mb-4">Daily Transaction Volume</h2>
                <div className="rounded-xl border border-black/[0.06] bg-white p-5 shadow-premium">
                  <div className="flex items-end gap-1 h-32">
                    {data.daily_volume.map((d, i) => {
                      const maxTx = Math.max(...data.daily_volume.map((v) => v.transactions), 1);
                      const height = (d.transactions / maxTx) * 100;
                      return (
                        <div key={i} className="flex-1 group relative">
                          <div
                            className="bg-gradient-to-t from-pulse-500 to-pulse-300 rounded-t-sm transition-all hover:from-pulse-600 hover:to-pulse-400"
                            style={{ height: `${height}%` }}
                          />
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-foreground text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
                            {d.transactions} txns
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {data.daily_volume.map((d, i) => (
                      <div key={i} className="flex-1 text-center text-[8px] text-quaternary">
                        {new Date(d.date).getDate()}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Top Endpoints */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease }}>
                <h2 className="text-[17px] font-semibold mb-4">Top Endpoints by Revenue</h2>
                <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden shadow-premium">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/[0.04]">
                        <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">#</th>
                        <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Endpoint</th>
                        <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Revenue</th>
                        <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Calls</th>
                        <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_by_revenue.slice(0, 10).map((ep, i) => (
                        <tr key={ep.endpoint} className="border-b border-black/[0.03] last:border-0">
                          <td className="px-5 py-3 text-[12px] text-quaternary font-mono-numbers">{i + 1}</td>
                          <td className="px-5 py-3 font-mono text-[12px]">{ep.endpoint}</td>
                          <td className="px-5 py-3 text-right font-mono-numbers text-[12px] font-medium">{formatCurrency(ep.revenue)}</td>
                          <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{ep.calls}</td>
                          <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{formatCurrency(ep.avg_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Trending */}
              {data.trending.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, ease }}>
                  <h2 className="text-[17px] font-semibold mb-4">Fastest Growing Endpoints</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.trending.slice(0, 4).map((t) => (
                      <div key={t.endpoint} className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-premium flex items-center justify-between">
                        <div>
                          <p className="font-mono text-[12px] font-medium">{t.endpoint}</p>
                          <p className="text-[11px] text-quaternary mt-0.5">{t.calls} calls this week</p>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600">
                          <ArrowUp className="w-3 h-3" />
                          <span className="text-[14px] font-semibold font-mono-numbers">{t.growth_pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CTA */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease }}
                className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-6 text-center">
                <p className="text-[14px] font-semibold mb-1">Track your own x402 revenue</p>
                <p className="text-[12px] text-tertiary mb-4">
                  Install Pulse in 60 seconds. See every payment, benchmark your pricing, and grow your business.
                </p>
                <a href="/pulse" className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-foreground text-white text-[13px] font-medium hover:bg-foreground/90 transition-colors">
                  Get Started Free
                </a>
              </motion.div>

              {/* Footer note */}
              <div className="text-center">
                <p className="text-[11px] text-quaternary">
                  Data sourced from KyvernLabs Pulse analytics network. Updated automatically.
                  Published by KyvernLabs — the business layer for the x402 economy.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
