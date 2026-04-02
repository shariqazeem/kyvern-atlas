import { create } from "zustand";
import type { TimeRange } from "@/types/pulse";

interface DashboardState {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  timeRange: "7d",
  setTimeRange: (range) => set({ timeRange: range }),
}));
