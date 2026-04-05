"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  TrendingUp,
  BarChart3,
  Users,
  ArrowUpRight,
  DollarSign,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

type Tab = "volume" | "revenue" | "trending";

interface EndpointRow {
  endpoint: string;
  calls: number;
  revenue: number;
  avg_price: number;
  unique_payers: number;
}

interface TrendingRow {
  endpoint: string;
  calls: number;
  growth_pct: number;
}

interface DailyVolume {
  date: string;
  transactions: number;
  volume: number;
}

interface MarketStats {
  total_transactions: number;
  total_volume: number;
  active_endpoints: number;
  unique_agents: number;
  providers: number;
}

interface LeaderboardData {
  market_stats: MarketStats;
  top_by_volume: EndpointRow[];
  top_by_revenue: EndpointRow[];
  daily_volume: DailyVolume[];
  trending: TrendingRow[];
  updated_at: string;
}

/* Mini sparkline SVG from daily volume data */
function Sparkline({ data }: { data: DailyVolume[] }) {
  if (!data || data.length < 2) return null;

  const values = data.map((d) => d.volume);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const w = 280;
  const h = 48;
  const padY = 4;

  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: padY + ((max - v) / range) * (h - padY * 2),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaD = `${pathD} L ${w},${h} L 0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="#3b82f6" opacity={i === points.length - 1 ? 1 : 0.4} />
      ))}
    </svg>
  );
}

/* Loading skeleton */
function Skeleton() {
  return (
    <section className="py-28 lg:py-36 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="h-3 w-32 bg-black/[0.04] rounded-full mx-auto mb-5" />
          <div className="h-8 w-96 max-w-full bg-black/[0.04] rounded-xl mx-auto mb-2" />
          <div className="h-8 w-64 bg-black/[0.04] rounded-xl mx-auto" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-black/[0.06] bg-white p-6 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-black/[0.03] mx-auto mb-4" />
              <div className="h-7 w-20 bg-black/[0.04] rounded-lg mx-auto mb-2" />
              <div className="h-3 w-24 bg-black/[0.03] rounded-full mx-auto" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 animate-pulse">
          <div className="h-4 w-48 bg-black/[0.04] rounded-lg mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-black/[0.02] rounded-lg mb-2" />
          ))}
        </div>
      </div>
    </section>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function Leaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [tab, setTab] = useState<Tab>("volume");

  useEffect(() => {
    fetch("/api/pulse/leaderboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <Skeleton />;

  const stats = data.market_stats;
  const rows: EndpointRow[] = tab === "volume" ? data.top_by_volume : tab === "revenue" ? data.top_by_revenue : [];
  const trendingRows = data.trending;

  const statCards = [
    {
      icon: DollarSign,
      value: formatCurrency(stats.total_volume || 0),
      label: "Total Volume",
      detail: "Last 30 days",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: Activity,
      value: formatNumber(stats.total_transactions || 0),
      label: "Transactions",
      detail: "Last 30 days",
      color: "text-pulse-600",
      bg: "bg-pulse-50",
    },
    {
      icon: BarChart3,
      value: formatNumber(stats.active_endpoints || 0),
      label: "Active Endpoints",
      detail: "Unique services",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: Users,
      value: formatNumber(stats.unique_agents || 0),
      label: "Unique Agents",
      detail: "Distinct payers",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "volume", label: "Top by Volume" },
    { key: "revenue", label: "Top by Revenue" },
    { key: "trending", label: "Trending" },
  ];

  return (
    <section className="py-28 lg:py-36 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-[12px] uppercase tracking-[0.2em] font-medium text-quaternary mb-5">
              x402 Market
            </p>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.04em] leading-[0.95]">
              Live x402 leaderboard
              <br />
              <span className="text-tertiary">See what the market is building.</span>
            </h2>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease }}
                className="rounded-2xl border border-black/[0.06] bg-white p-6 text-center cursor-default"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
              >
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-4`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-[28px] font-bold font-mono-numbers tracking-tight">{stat.value}</p>
                <p className="text-[13px] font-medium text-primary mt-1">{stat.label}</p>
                <p className="text-[11px] text-quaternary mt-0.5">{stat.detail}</p>
              </motion.div>
            ))}
          </div>

          {/* Daily Volume Sparkline */}
          {data.daily_volume.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.35, ease }}
              className="rounded-2xl border border-black/[0.06] bg-white p-5 mb-6"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-primary">Daily Volume (14 days)</span>
                <span className="text-[10px] text-quaternary font-mono-numbers">
                  {data.daily_volume.length} data points
                </span>
              </div>
              <Sparkline data={data.daily_volume} />
            </motion.div>
          )}

          {/* Tab Switcher + Table */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4, ease }}
            className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
          >
            {/* Tabs */}
            <div className="flex items-center gap-1 px-5 py-3 border-b border-black/[0.04]">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`text-[12px] font-medium px-3.5 py-1.5 rounded-lg transition-all duration-200 ${
                    tab === t.key
                      ? "bg-[#F0F0F0] text-primary"
                      : "text-quaternary hover:text-secondary hover:bg-[#FAFAFA]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Table content */}
            {tab !== "trending" ? (
              <div className="overflow-x-auto">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_80px_100px_90px_80px] gap-2 px-5 min-w-[500px] py-2.5 border-b border-black/[0.03] text-[10px] uppercase tracking-[0.12em] font-medium text-quaternary">
                  <span>Endpoint</span>
                  <span className="text-right">Calls</span>
                  <span className="text-right">Revenue</span>
                  <span className="text-right">Avg Price</span>
                  <span className="text-right">Agents</span>
                </div>

                {rows.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[13px] text-quaternary">
                    No data yet. Be the first to connect Pulse.
                  </div>
                ) : (
                  rows.map((row, i) => (
                    <motion.div
                      key={row.endpoint}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.45 + i * 0.04 }}
                      className="grid grid-cols-[1fr_80px_100px_90px_80px] gap-2 px-5 min-w-[500px] py-3 border-b border-black/[0.02] last:border-0 hover:bg-[#FAFAFA] transition-colors duration-150"
                    >
                      <span className="font-mono text-[12px] text-secondary truncate">{row.endpoint}</span>
                      <span className="font-mono-numbers text-[12px] text-primary text-right font-medium">
                        {formatNumber(row.calls)}
                      </span>
                      <span className="font-mono-numbers text-[12px] text-primary text-right font-semibold">
                        {formatCurrency(row.revenue)}
                      </span>
                      <span className="font-mono-numbers text-[11px] text-tertiary text-right">
                        {formatCurrency(row.avg_price)}
                      </span>
                      <span className="font-mono-numbers text-[11px] text-tertiary text-right">
                        {formatNumber(row.unique_payers)}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              /* Trending tab */
              <div>
                {trendingRows.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[13px] text-quaternary">
                    Not enough data to show trends yet.
                  </div>
                ) : (
                  trendingRows.map((row, i) => (
                    <motion.div
                      key={row.endpoint}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.45 + i * 0.06 }}
                      className="flex items-center gap-4 px-5 py-3.5 border-b border-black/[0.02] last:border-0 hover:bg-[#FAFAFA] transition-colors duration-150"
                    >
                      <span className="font-mono text-[12px] text-secondary truncate flex-1">{row.endpoint}</span>
                      <span className="font-mono-numbers text-[12px] text-tertiary w-20 text-right">
                        {formatNumber(row.calls)} calls
                      </span>
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600 w-20 justify-end">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        +{row.growth_pct}%
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-3">
            <span className="text-[11px] text-quaternary">
              Updated {timeAgo(data.updated_at)}
            </span>
            <Link
              href="/pulse"
              className="inline-flex items-center gap-2 text-[12px] font-semibold text-pulse-600 hover:text-pulse-700 transition-colors duration-200"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Powered by Pulse
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
