import { create } from "zustand";
import type { TimeRange } from "@/types/pulse";

interface DashboardState {
  timeRange: TimeRange | "custom";
  customStart?: string;
  customEnd?: string;
  setTimeRange: (range: TimeRange | "custom") => void;
  setCustomRange: (start: string, end: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  timeRange: "7d",
  setTimeRange: (range) => set({ timeRange: range }),
  setCustomRange: (start, end) => set({ timeRange: "custom", customStart: start, customEnd: end }),
}));
