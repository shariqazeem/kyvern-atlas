"use client";

import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/hooks/use-dashboard-store";
import type { TimeRange } from "@/types/pulse";

const RANGES: { value: TimeRange | "custom"; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "custom", label: "Custom" },
];

export function TimeRangeSelector() {
  const { timeRange, customStart, customEnd, setTimeRange, setCustomRange } = useDashboardStore();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-muted dark:bg-gray-800 rounded-lg p-0.5">
        {RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => setTimeRange(range.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all ease-premium",
              timeRange === range.value
                ? "bg-white dark:bg-gray-700 text-foreground shadow-premium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {range.label}
          </button>
        ))}
      </div>
      {timeRange === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customStart || ""}
            onChange={(e) => setCustomRange(e.target.value, customEnd || new Date().toISOString().split("T")[0])}
            className="h-7 px-2 rounded-md border border-black/[0.08] dark:border-gray-700 dark:bg-gray-800 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-pulse/30"
          />
          <span className="text-[10px] text-quaternary">to</span>
          <input
            type="date"
            value={customEnd || ""}
            onChange={(e) => setCustomRange(customStart || "2026-01-01", e.target.value)}
            className="h-7 px-2 rounded-md border border-black/[0.08] dark:border-gray-700 dark:bg-gray-800 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-pulse/30"
          />
        </div>
      )}
    </div>
  );
}
