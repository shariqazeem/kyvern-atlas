"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";

interface ForecastPoint {
  date: string;
  expected: number;
  optimistic: number;
  conservative: number;
}

interface ForecastResponse {
  historical: Array<{ date: string; revenue: number }>;
  forecast: ForecastPoint[];
  insufficient_data?: boolean;
  trend?: { slope: number; direction: "up" | "down" | "flat" };
}

interface ChartDataPoint {
  timestamp: string;
  revenue: number | null;
  calls?: number;
  forecast?: number | null;
  forecastUpper?: number | null;
  forecastLower?: number | null;
}

function formatTick(timestamp: string, granularity: "hour" | "day") {
  const date = parseISO(timestamp);
  if (granularity === "day") return format(date, "MMM d");
  return format(date, "MMM d HH:mm");
}

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  const date = parseISO(label);
  const revenueEntry = payload.find((p) => p.dataKey === "revenue");
  const forecastEntry = payload.find((p) => p.dataKey === "forecast");
  const upperEntry = payload.find((p) => p.dataKey === "forecastUpper");
  const lowerEntry = payload.find((p) => p.dataKey === "forecastLower");

  const isForecast = forecastEntry?.value != null && revenueEntry?.value == null;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-premium-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {format(date, "MMM d, yyyy")}
        {isForecast && (
          <span className="ml-1.5 text-[10px] font-medium text-violet-500 bg-violet-50 px-1 py-0.5 rounded">
            Projected
          </span>
        )}
      </p>
      <div className="space-y-0.5">
        {revenueEntry?.value != null && (
          <p className="text-sm font-medium">
            <span className="text-pulse">$</span>
            <span className="font-mono-numbers">{revenueEntry.value.toFixed(2)}</span>
            <span className="text-muted-foreground text-xs ml-1">revenue</span>
          </p>
        )}
        {isForecast && forecastEntry?.value != null && (
          <>
            <p className="text-sm font-medium">
              <span className="text-violet-500">$</span>
              <span className="font-mono-numbers">{forecastEntry.value.toFixed(2)}</span>
              <span className="text-muted-foreground text-xs ml-1">expected</span>
            </p>
            {upperEntry?.value != null && lowerEntry?.value != null && (
              <p className="text-[11px] text-quaternary">
                Range: ${lowerEntry.value.toFixed(2)} - ${upperEntry.value.toFixed(2)}
              </p>
            )}
          </>
        )}
        {!isForecast && payload.find((p) => p.dataKey === "calls")?.value != null && (
          <p className="text-sm font-medium">
            <span className="font-mono-numbers">{payload.find((p) => p.dataKey === "calls")!.value}</span>
            <span className="text-muted-foreground text-xs ml-1">calls</span>
          </p>
        )}
      </div>
    </div>
  );
}

function useForecast() {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const fetchForecast = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/pulse/forecast", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setForecast(json);
      }
    } catch (err) {
      console.error("Failed to fetch forecast:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchForecast();
  }, [fetchForecast, isAuthenticated]);

  return { forecast, loading };
}

export function RevenueChart() {
  const { timeRange } = useDashboardStore();
  const effectiveRange = timeRange === "custom" ? "30d" : timeRange;
  const { data, loading } = useTimeseries(effectiveRange);
  const { forecast } = useForecast();

  if (loading || !data) {
    return (
      <div className="bg-white rounded-lg border border-border p-5 shadow-premium h-[360px] animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-6" />
        <div className="h-full bg-muted/50 rounded" />
      </div>
    );
  }

  if (data.data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-black/[0.06] p-5 shadow-premium">
        <h3 className="text-[12px] font-medium text-quaternary mb-4">Revenue Over Time</h3>
        <div className="h-[200px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 20 20" className="w-5 h-5 text-quaternary">
                <path d="M2 15 L5 10 L9 12 L14 5 L18 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
              </svg>
            </div>
            <p className="text-[12px] text-tertiary">Revenue data appears after your first event</p>
            <a href="/pulse/dashboard/setup" className="text-[11px] text-pulse hover:underline mt-1 inline-block">
              View setup guide &rarr;
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Build merged chart data: historical + forecast
  const hasForecast = forecast && forecast.forecast.length > 0 && !forecast.insufficient_data;

  const chartData: ChartDataPoint[] = data.data.map((point) => ({
    timestamp: point.timestamp,
    revenue: point.revenue,
    calls: point.calls,
    forecast: null,
    forecastUpper: null,
    forecastLower: null,
  }));

  if (hasForecast) {
    // Add a bridge point: last historical point becomes first forecast point
    const lastHistorical = chartData[chartData.length - 1];
    if (lastHistorical) {
      lastHistorical.forecast = lastHistorical.revenue;
      lastHistorical.forecastUpper = lastHistorical.revenue;
      lastHistorical.forecastLower = lastHistorical.revenue;
    }

    // Append forecast points
    for (const fp of forecast!.forecast) {
      chartData.push({
        timestamp: `${fp.date}T00:00:00`,
        revenue: null,
        forecast: fp.expected,
        forecastUpper: fp.optimistic,
        forecastLower: fp.conservative,
      });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white rounded-lg border border-border p-5 shadow-premium"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Revenue Over Time
        </h3>
        {hasForecast && forecast?.trend && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-quaternary uppercase tracking-wider">
              7-day forecast
            </span>
            <span
              className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                forecast.trend.direction === "up"
                  ? "bg-emerald-50 text-emerald-600"
                  : forecast.trend.direction === "down"
                  ? "bg-red-50 text-red-500"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {forecast.trend.direction === "up"
                ? "Trending up"
                : forecast.trend.direction === "down"
                ? "Trending down"
                : "Flat"}
            </span>
          </div>
        )}
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="forecastBandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
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
            <Tooltip content={<ForecastTooltip />} />

            {/* Forecast confidence band (optimistic - conservative) */}
            {hasForecast && (
              <>
                <Area
                  type="monotone"
                  dataKey="forecastUpper"
                  stroke="none"
                  fill="url(#forecastBandGradient)"
                  animationDuration={1200}
                  animationEasing="ease-out"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="forecastLower"
                  stroke="none"
                  fill="#ffffff"
                  animationDuration={1200}
                  animationEasing="ease-out"
                  connectNulls={false}
                />
              </>
            )}

            {/* Forecast expected line (dashed) */}
            {hasForecast && (
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#forecastGradient)"
                animationDuration={1200}
                animationEasing="ease-out"
                connectNulls={false}
              />
            )}

            {/* Historical revenue (solid) */}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              animationDuration={1200}
              animationEasing="ease-out"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {hasForecast && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-black/[0.04]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#3b82f6] rounded-full" />
            <span className="text-[10px] text-quaternary">Historical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[#8b5cf6] rounded-full" style={{ borderBottom: "1px dashed #8b5cf6" }} />
            <span className="text-[10px] text-quaternary">Projected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-violet-100 rounded-sm" />
            <span className="text-[10px] text-quaternary">Confidence band</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
