// Unified Recharts theme — import into every chart component
// Ensures visual consistency across all charts

import { chartColors } from "./tokens";

export const CHART_THEME = {
  // Grid
  gridColor: chartColors.grid,
  gridStrokeDasharray: "3 3",

  // Tooltip
  tooltipStyle: {
    backgroundColor: chartColors.tooltip.bg,
    border: `1px solid ${chartColors.tooltip.border}`,
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "12px",
    fontFamily: "var(--font-mono), monospace",
    color: chartColors.tooltip.text,
    boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
  },

  // Axis
  axisStyle: {
    fontSize: 10,
    fontFamily: "var(--font-sans), system-ui, sans-serif",
    fill: "#9ca3af",
  },

  // Data series colors (use in order)
  seriesColors: [
    chartColors.series1,
    chartColors.series2,
    chartColors.series3,
    chartColors.series4,
    chartColors.series5,
    chartColors.series6,
  ],

  // Common area/line props
  areaProps: {
    strokeWidth: 2,
    dot: false,
    activeDot: { r: 4, strokeWidth: 2, fill: "#fff" },
  },

  // Common bar props
  barProps: {
    radius: [4, 4, 0, 0] as [number, number, number, number],
  },
} as const;
