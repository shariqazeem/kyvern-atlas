"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTimeseries } from "@/hooks/use-timeseries";
import { useDashboardStore } from "@/hooks/use-dashboard-store";
import { format, parseISO } from "date-fns";

function formatTick(timestamp: string, granularity: "hour" | "day") {
  const date = parseISO(timestamp);
  if (granularity === "day") return format(date, "MMM d");
  return format(date, "MMM d HH:mm");
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  const date = parseISO(label);

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-premium-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {format(date, "MMM d, yyyy HH:mm")}
      </p>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">
          <span className="text-pulse">$</span>
          <span className="font-mono-numbers">{payload[0].value.toFixed(2)}</span>
          <span className="text-muted-foreground text-xs ml-1">revenue</span>
        </p>
        {payload[1] && (
          <p className="text-sm font-medium">
            <span className="font-mono-numbers">{payload[1].value}</span>
            <span className="text-muted-foreground text-xs ml-1">calls</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function RevenueChart() {
  const { timeRange } = useDashboardStore();
  const effectiveRange = timeRange === "custom" ? "30d" : timeRange;
  const { data, loading } = useTimeseries(effectiveRange);

  if (loading || !data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-5 shadow-premium h-[360px] animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-6" />
        <div className="h-full bg-muted/50 rounded" />
      </div>
    );
  }

  if (data.data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/[0.06] dark:border-gray-800 p-5 shadow-premium">
        <h3 className="text-[12px] font-medium text-quaternary mb-4">Revenue Over Time</h3>
        <div className="h-[200px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 20 20" className="w-5 h-5 text-quaternary">
                <path d="M2 15 L5 10 L9 12 L14 5 L18 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
              </svg>
            </div>
            <p className="text-[12px] text-tertiary">Revenue data appears after your first event</p>
            <a href="/pulse/dashboard/setup" className="text-[11px] text-pulse hover:underline mt-1 inline-block">
              View setup guide →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white dark:bg-gray-900 rounded-lg border border-border p-5 shadow-premium"
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Revenue Over Time
      </h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => formatTick(v, data.granularity)}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              dx={-4}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
