"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Globe, Database } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ProGate } from "@/components/dashboard/pro-gate";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface Benchmark {
  endpoint: string;
  avg_price: number;
  median_price: number;
  p25_price: number;
  p75_price: number;
  total_calls: number;
  provider_count: number;
  avg_latency: number;
}

interface UserComparison {
  endpoint: string;
  user_price: number;
  market_avg: number;
  market_median: number;
  percentile_rank: number;
  status: "competitive" | "above_market" | "below_market";
}

interface BenchmarkData {
  benchmarks: Benchmark[];
  user_comparison: UserComparison[];
  market_stats: {
    total_endpoints: number;
    total_providers: number;
    avg_price: number;
    data_points: number;
  };
}

const STATUS_CONFIG = {
  competitive: { label: "Competitive", color: "bg-emerald-50 text-emerald-600" },
  above_market: { label: "Above Market", color: "bg-amber-50 text-amber-600" },
  below_market: { label: "Below Market", color: "bg-blue-50 text-blue-600" },
};

function PriceBucketChart({ benchmarks, userEndpoints }: { benchmarks: Benchmark[]; userEndpoints: string[] }) {
  const buckets = [
    { label: "$0-0.001", min: 0, max: 0.001 },
    { label: "$0.001-0.005", min: 0.001, max: 0.005 },
    { label: "$0.005-0.01", min: 0.005, max: 0.01 },
    { label: "$0.01-0.05", min: 0.01, max: 0.05 },
    { label: "$0.05-0.10", min: 0.05, max: 0.10 },
    { label: "$0.10+", min: 0.10, max: Infinity },
  ];

  const data = buckets.map((bucket) => {
    const inBucket = benchmarks.filter(
      (b) => b.avg_price >= bucket.min && b.avg_price < bucket.max
    );
    const userInBucket = inBucket.filter((b) => userEndpoints.includes(b.endpoint));

    return {
      name: bucket.label,
      market: inBucket.length,
      yours: userInBucket.length,
    };
  });

  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: "8px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
            }}
          />
          <Bar dataKey="market" name="Market endpoints" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.yours > 0 ? "#3b82f6" : "#e2e8f0"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BenchmarksContent() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/pulse/benchmarks", { credentials: "include" })
      .then((r) => {
        if (r.status === 403) throw new Error("pro_required");
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-[#F0F0F0] rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-[#F0F0F0] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-[#F0F0F0] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error === "pro_required" || !data) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-10 h-10 text-quaternary mx-auto mb-4" />
        <h3 className="text-[15px] font-semibold mb-1">Pricing Benchmarks</h3>
        <p className="text-[13px] text-tertiary">
          Start receiving payments to see how your pricing compares to the market.
        </p>
      </div>
    );
  }

  const userEndpoints = data.user_comparison.map((u) => u.endpoint);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[18px] font-bold tracking-tight">Pricing Benchmarks</h1>
        <p className="text-[13px] text-tertiary mt-1">
          See how your x402 pricing compares to the entire market.
        </p>
      </div>

      {/* Section B: Market Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, label: "Avg x402 Price", value: formatCurrency(data.market_stats.avg_price) },
          { icon: Globe, label: "Market Endpoints", value: data.market_stats.total_endpoints.toString() },
          { icon: Database, label: "Data Points", value: data.market_stats.data_points.toLocaleString() },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08, ease }}
            className="rounded-xl border border-black/[0.06] bg-white p-5"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4 text-quaternary" />
              <span className="text-[11px] text-quaternary font-medium uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-[22px] font-bold font-mono-numbers tracking-tight">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Section A: Your Pricing vs Market */}
      {data.user_comparison.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
          className="rounded-xl border border-black/[0.06] bg-white overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
        >
          <div className="px-5 py-4 border-b border-black/[0.04]">
            <h3 className="text-[14px] font-semibold tracking-tight">Your Pricing vs Market</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-black/[0.04]">
                  <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Endpoint</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Your Price</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Market Avg</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Market Median</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Percentile</th>
                  <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.user_comparison.map((uc) => {
                  const cfg = STATUS_CONFIG[uc.status];
                  return (
                    <tr key={uc.endpoint} className="border-b border-black/[0.03]/50 last:border-0 hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-5 py-3 font-mono text-[12px]">{uc.endpoint}</td>
                      <td className="px-5 py-3 text-right font-mono-numbers text-[12px] font-semibold">{formatCurrency(uc.user_price)}</td>
                      <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{formatCurrency(uc.market_avg)}</td>
                      <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{formatCurrency(uc.market_median)}</td>
                      <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">
                        <span className="text-secondary">P{uc.percentile_rank}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider", cfg.color)}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {data.user_comparison.length === 0 && (
        <div className="rounded-xl border border-black/[0.06] bg-white p-8 text-center">
          <BarChart3 className="w-8 h-8 text-quaternary mx-auto mb-3" />
          <p className="text-[13px] text-secondary font-medium">No endpoint data yet</p>
          <p className="text-[12px] text-tertiary mt-1">Start receiving payments to see how your pricing compares.</p>
        </div>
      )}

      {/* Section C: Pricing Distribution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-5"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight">Pricing Distribution</h3>
            <p className="text-[11px] text-quaternary mt-0.5">
              Endpoints by price range • <span className="text-pulse font-medium">Blue = your endpoints</span>
            </p>
          </div>
        </div>
        <PriceBucketChart benchmarks={data.benchmarks} userEndpoints={userEndpoints} />
      </motion.div>

      {/* Full market benchmarks table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease }}
        className="rounded-xl border border-black/[0.06] bg-white overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <div className="px-5 py-4 border-b border-black/[0.04]">
          <h3 className="text-[14px] font-semibold tracking-tight">Market Endpoints</h3>
          <p className="text-[11px] text-quaternary mt-0.5">All x402 endpoints tracked across the ecosystem</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Endpoint</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Avg Price</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Median</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">P25</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">P75</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Calls</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Providers</th>
              </tr>
            </thead>
            <tbody>
              {data.benchmarks.map((b) => (
                <tr key={b.endpoint} className="border-b border-black/[0.03]/50 last:border-0 hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-3 font-mono text-[12px]">{b.endpoint}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-[12px] font-medium">{formatCurrency(b.avg_price)}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{formatCurrency(b.median_price)}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{formatCurrency(b.p25_price)}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{formatCurrency(b.p75_price)}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-[12px]">{b.total_calls.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono-numbers text-[12px] text-tertiary">{b.provider_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default function BenchmarksPage() {
  return (
    <ProGate feature="Compare your x402 pricing against the entire market. See if you're charging too much, too little, or just right.">
      <BenchmarksContent />
    </ProGate>
  );
}
