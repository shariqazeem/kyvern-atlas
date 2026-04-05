"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, TrendingUp, Award } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ProGate } from "@/components/dashboard/pro-gate";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const ease = [0.25, 0.1, 0.25, 1] as const;

const COHORT_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48",
];

interface CohortData {
  cohort_label: string;
  cohort_week: string;
  cohort_size: number;
  retention: number[];
}

interface CohortResponse {
  cohorts: CohortData[];
  summary: {
    avg_week1_retention: number;
    avg_week4_retention: number;
    best_cohort: string | null;
    total_agents: number;
  };
}

function RetentionCell({ value }: { value: number | undefined }) {
  if (value === undefined) return <td className="px-3 py-2.5 text-center text-[11px] text-quaternary">—</td>;
  return (
    <td className="px-3 py-2.5 text-center">
      <span className={cn(
        "text-[11px] font-semibold font-mono-numbers px-2 py-0.5 rounded",
        value >= 60 ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600" :
        value >= 30 ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600" :
        "bg-red-50 dark:bg-red-900/30 text-red-600"
      )}>
        {value}%
      </span>
    </td>
  );
}

function CohortChart({ cohorts }: { cohorts: CohortData[] }) {
  // Build chart data: one object per week period with keys for each cohort
  const maxPeriods = Math.max(...cohorts.map((c) => c.retention.length), 0);

  const chartData = useMemo(() => {
    return Array.from({ length: maxPeriods }, (_, weekIdx) => {
      const point: Record<string, number | string> = { name: `W${weekIdx}` };

      let sum = 0;
      let count = 0;
      cohorts.forEach((c) => {
        if (c.retention[weekIdx] !== undefined) {
          point[c.cohort_label] = c.retention[weekIdx];
          sum += c.retention[weekIdx];
          count++;
        }
      });

      if (count > 0) {
        point["Average"] = Math.round(sum / count);
      }

      return point;
    });
  }, [cohorts, maxPeriods]);

  if (cohorts.length < 2) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center">
          <Users className="w-8 h-8 text-quaternary mx-auto mb-3" />
          <p className="text-[13px] text-secondary font-medium">Need more data</p>
          <p className="text-[12px] text-tertiary mt-1">At least 2 cohorts required for retention curves. Keep receiving payments!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-black/[0.04] dark:text-white/[0.06]" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--tooltip-bg, white)",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: "8px",
              fontSize: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
            formatter={(value: unknown) => `${value}%`}
          />
          <Legend
            wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
          />

          {/* Average line — bold and prominent */}
          <Line
            type="monotone"
            dataKey="Average"
            stroke="#0f172a"
            strokeWidth={3}
            dot={false}
            strokeDasharray="6 3"
          />

          {/* Individual cohort lines */}
          {cohorts.map((c, i) => (
            <Line
              key={c.cohort_label}
              type="monotone"
              dataKey={c.cohort_label}
              stroke={COHORT_COLORS[i % COHORT_COLORS.length]}
              strokeWidth={1.5}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CohortsContent() {
  const [data, setData] = useState<CohortResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/pulse/cohorts?periods=8", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-40 bg-[#F0F0F0] rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#F0F0F0] rounded-xl animate-pulse" />)}
        </div>
        <div className="h-80 bg-[#F0F0F0] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data || data.cohorts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight">Cohort Analysis</h1>
          <p className="text-[13px] text-tertiary mt-1">Agent retention curves by first-seen week</p>
        </div>
        <div className="rounded-xl border border-black/[0.06] bg-white p-8 text-center">
          <Users className="w-10 h-10 text-quaternary mx-auto mb-3" />
          <p className="text-[14px] font-medium">No cohort data yet</p>
          <p className="text-[12px] text-tertiary mt-1">Start receiving payments from agent wallets to see retention curves.</p>
        </div>
      </div>
    );
  }

  const { summary, cohorts } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[18px] font-bold tracking-tight">Cohort Analysis</h1>
        <p className="text-[13px] text-tertiary mt-1">
          Agent retention curves — how many agents return after their first payment
        </p>
      </div>

      {/* Section A: Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, label: "Week 1 Retention", value: `${summary.avg_week1_retention}%`, sub: "Agents returning after 1 week" },
          { icon: Award, label: "Week 4 Retention", value: `${summary.avg_week4_retention}%`, sub: "Still active after 1 month" },
          { icon: Users, label: "Total Agents", value: summary.total_agents.toString(), sub: summary.best_cohort ? `Best cohort: ${summary.best_cohort}` : "Unique payer wallets" },
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
            <p className="text-[11px] text-quaternary mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Section B: Retention Curve Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-5"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <div className="mb-4">
          <h3 className="text-[14px] font-semibold tracking-tight">Retention Curves</h3>
          <p className="text-[11px] text-quaternary mt-0.5">
            Each line = one cohort of agents grouped by first payment week.
            <span className="font-medium text-primary"> Bold dashed = average.</span>
          </p>
        </div>
        <CohortChart cohorts={cohorts} />
      </motion.div>

      {/* Section C: Cohort Details Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease }}
        className="rounded-xl border border-black/[0.06] bg-white overflow-hidden"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <div className="px-5 py-4 border-b border-black/[0.04]">
          <h3 className="text-[14px] font-semibold tracking-tight">Cohort Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="text-left text-[10px] font-medium text-quaternary uppercase tracking-wider px-5 py-3">Cohort</th>
                <th className="text-right text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">Size</th>
                <th className="text-center text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">W0</th>
                <th className="text-center text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">W1</th>
                <th className="text-center text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">W2</th>
                <th className="text-center text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">W4</th>
                <th className="text-center text-[10px] font-medium text-quaternary uppercase tracking-wider px-3 py-3">W8</th>
              </tr>
            </thead>
            <tbody>
              {[...cohorts].reverse().map((c) => (
                <tr key={c.cohort_week} className="border-b border-black/[0.03]/50 last:border-0 hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-2.5 text-[12px] font-medium">{c.cohort_label}</td>
                  <td className="px-3 py-2.5 text-right font-mono-numbers text-[12px] text-tertiary">{c.cohort_size}</td>
                  <RetentionCell value={c.retention[0]} />
                  <RetentionCell value={c.retention[1]} />
                  <RetentionCell value={c.retention[2]} />
                  <RetentionCell value={c.retention[4]} />
                  <RetentionCell value={c.retention[8]} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default function CohortsPage() {
  return (
    <ProGate feature="Cohort analysis showing agent retention curves. See which cohorts of agents return week after week.">
      <CohortsContent />
    </ProGate>
  );
}
