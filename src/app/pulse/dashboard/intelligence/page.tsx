"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Activity, Globe, DollarSign, Zap, Star } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { ProGate } from "@/components/dashboard/pro-gate";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface EndpointData {
  endpoint: string;
  category: string;
  calls: number;
  revenue: number;
  avg_price: number;
  providers: number;
}

interface IntelData {
  market_overview: {
    total_volume: number;
    total_transactions: number;
    active_endpoints: number;
    avg_price: number;
    provider_count: number;
    has_enough_data: boolean;
  };
  top_by_volume: EndpointData[];
  top_by_revenue: EndpointData[];
  daily_growth: Array<{ date: string; transactions: number; revenue: number }>;
  categories: Array<{ category: string; calls: number; revenue: number; avg_price: number; endpoint_count: number }>;
  fastest_growing: Array<{ endpoint: string; current_calls: number; previous_calls: number; growth_pct: number }>;
  user_endpoints: string[];
}

function CompetitivePosition({ data, userEndpoints }: { data: IntelData; userEndpoints: string[] }) {
  const userInTop = data.top_by_revenue.filter((e) => userEndpoints.includes(e.endpoint));
  const marketAvg = data.market_overview.avg_price;

  if (userEndpoints.length === 0) {
    return (
      <div className="rounded-xl border border-black/[0.06] bg-gradient-to-br from-pulse-50 to-white dark:from-gray-900 dark:to-gray-900 p-5">
        <h3 className="text-[14px] font-semibold tracking-tight mb-2">Your Competitive Position</h3>
        <p className="text-[13px] text-secondary leading-relaxed">
          Start receiving payments to see how you compare to the market. Your endpoints will be highlighted across all charts.
        </p>
      </div>
    );
  }

  const userAvgPrice = userInTop.length > 0
    ? userInTop.reduce((s, e) => s + e.avg_price, 0) / userInTop.length
    : 0;

  const aboveMarket = userAvgPrice > marketAvg;
  const rank = data.top_by_revenue.findIndex((e) => userEndpoints.includes(e.endpoint));
  const percentile = rank >= 0 ? Math.round(((data.top_by_revenue.length - rank) / data.top_by_revenue.length) * 100) : null;

  return (
    <div className="rounded-xl border border-pulse/20 bg-gradient-to-br from-pulse-50 to-white dark:from-gray-900 dark:to-gray-900 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-pulse" />
        <h3 className="text-[14px] font-semibold tracking-tight">Your Competitive Position</h3>
      </div>
      <p className="text-[13px] text-secondary leading-relaxed">
        {aboveMarket
          ? "Your endpoints are priced above the market average. You're capturing premium value — the market supports your pricing."
          : "Your pricing is competitive and below market average. Consider testing higher prices — the data shows the market supports it."}
        {percentile !== null && (
          <> You rank in the <span className="font-semibold text-pulse">top {percentile}%</span> of providers by revenue.</>
        )}
      </p>
    </div>
  );
}

function IntelligenceContent() {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"volume" | "revenue">("revenue");

  useEffect(() => {
    fetch("/api/pulse/intelligence", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 bg-[#F0F0F0] rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#F0F0F0] rounded-xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-[#F0F0F0] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-black/[0.06] bg-white p-8 text-center">
        <Globe className="w-10 h-10 text-quaternary mx-auto mb-3" />
        <p className="text-[14px] font-medium">Not enough market data yet</p>
        <p className="text-[12px] text-tertiary mt-1">Competitive intelligence requires data from multiple providers.</p>
      </div>
    );
  }

  const { market_overview, daily_growth, categories, user_endpoints } = data;
  const topEndpoints = tab === "volume" ? data.top_by_volume : data.top_by_revenue;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[18px] font-bold tracking-tight">Competitive Intelligence</h1>
        <p className="text-[13px] text-tertiary mt-1">
          Market-wide analytics aggregated from the x402 ecosystem. All data is anonymized.
        </p>
      </div>

      {/* Section A: Market Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "Market Volume", value: formatCurrency(market_overview.total_volume), sub: "Last 30 days" },
          { icon: Activity, label: "Transactions", value: market_overview.total_transactions.toLocaleString(), sub: "Last 30 days" },
          { icon: Globe, label: "Active Endpoints", value: market_overview.active_endpoints.toString(), sub: "Across ecosystem" },
          { icon: TrendingUp, label: "Avg Price/Call", value: formatCurrency(market_overview.avg_price), sub: "Market average" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06, ease }}
            className="rounded-xl border border-black/[0.06] bg-white p-5"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4 text-quaternary" />
              <span className="text-[10px] text-quaternary font-medium uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-[20px] font-bold font-mono-numbers tracking-tight">{card.value}</p>
            <p className="text-[10px] text-quaternary mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Section E: Competitive Position */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25, ease }}>
        <CompetitivePosition data={data} userEndpoints={user_endpoints} />
      </motion.div>

      {/* Section B: Market Growth */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-5"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <h3 className="text-[14px] font-semibold tracking-tight mb-1">Market Growth</h3>
        <p className="text-[11px] text-quaternary mb-4">Daily transaction volume across the x402 ecosystem</p>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily_growth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="intelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="transactions" stroke="#3b82f6" strokeWidth={2} fill="url(#intelGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Section C: Top Endpoints */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease }}
        className="rounded-xl border border-black/[0.06] bg-white overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
          <h3 className="text-[14px] font-semibold tracking-tight">Top Endpoints</h3>
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {(["revenue", "volume"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-3 py-1 text-[11px] font-medium rounded-md transition-all",
                  tab === t ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                )}>{t === "revenue" ? "By Revenue" : "By Volume"}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3 w-8">#</th>
                <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">Endpoint</th>
                <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">Category</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">{tab === "revenue" ? "Revenue" : "Calls"}</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">Avg Price</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Providers</th>
              </tr>
            </thead>
            <tbody>
              {topEndpoints.slice(0, 15).map((ep, i) => {
                const isUser = user_endpoints.includes(ep.endpoint);
                return (
                  <tr key={ep.endpoint} className={cn(
                    "border-b border-black/[0.03]/50 last:border-0 transition-colors",
                    isUser ? "bg-pulse-50/50 dark:bg-pulse-900/10" : "hover:bg-[#FAFAFA]"
                  )}>
                    <td className="px-5 py-2.5 text-[12px] text-quaternary font-mono">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px]">{ep.endpoint}</span>
                        {isUser && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-pulse-100 text-pulse-600 uppercase tracking-wider">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-tertiary">{ep.category}</td>
                    <td className="px-3 py-2.5 text-right font-mono-numbers text-[12px] font-medium">
                      {tab === "revenue" ? formatCurrency(ep.revenue) : ep.calls.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-numbers text-[12px] text-tertiary">{formatCurrency(ep.avg_price)}</td>
                    <td className="px-5 py-2.5 text-right font-mono-numbers text-[12px] text-tertiary">{ep.providers}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Section D: Category Pricing */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-5"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <h3 className="text-[14px] font-semibold tracking-tight mb-1">Category Pricing</h3>
        <p className="text-[11px] text-quaternary mb-4">Average price per call by endpoint category</p>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "8px", fontSize: "12px" }}
                formatter={(value: unknown) => formatCurrency(value as number)} />
              <Bar dataKey="avg_price" radius={[0, 4, 4, 0]}>
                {categories.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#3b82f6" : "#e2e8f0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Fastest Growing */}
      {data.fastest_growing.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease }}
          className="rounded-xl border border-black/[0.06] bg-white p-5"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-[14px] font-semibold tracking-tight">Fastest Growing Endpoints</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.fastest_growing.slice(0, 6).map((g) => {
              const isUser = user_endpoints.includes(g.endpoint);
              return (
                <div key={g.endpoint} className={cn(
                  "flex items-center justify-between p-3 rounded-lg border border-black/[0.04]",
                  isUser ? "bg-pulse-50/50 dark:bg-pulse-900/10" : "bg-[#FAFAFA]"
                )}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] truncate">{g.endpoint}</span>
                    {isUser && <span className="text-[8px] font-bold text-pulse shrink-0">YOU</span>}
                  </div>
                  <span className="text-[12px] font-semibold text-emerald-600 shrink-0 ml-2">
                    +{g.growth_pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <ProGate feature="Market-wide competitive intelligence. See how your x402 pricing and volume compare to the entire ecosystem.">
      <IntelligenceContent />
    </ProGate>
  );
}
