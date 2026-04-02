"use client";

import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/hooks/use-dashboard-store";
import type { TimeRange } from "@/types/pulse";

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export function TimeRangeSelector() {
  const { timeRange, setTimeRange } = useDashboardStore();

  return (
    <div className="flex items-center bg-muted rounded-lg p-0.5">
      {RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => setTimeRange(range.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all ease-premium",
            timeRange === range.value
              ? "bg-white text-foreground shadow-premium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
