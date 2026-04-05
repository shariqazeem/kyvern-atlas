// KyvernLabs Design Token System
// Single source of truth for all design values
// Register in tailwind.config.ts as theme extensions

// Typography Scale (8 sizes)
export const fontSize = {
  xs: ["11px", { lineHeight: "16px" }],
  sm: ["13px", { lineHeight: "20px" }],
  base: ["15px", { lineHeight: "24px" }],
  lg: ["17px", { lineHeight: "26px" }],
  xl: ["20px", { lineHeight: "28px" }],
  "2xl": ["24px", { lineHeight: "32px" }],
  "3xl": ["30px", { lineHeight: "36px" }],
  "4xl": ["36px", { lineHeight: "40px" }],
} as const;

// Color Palette (semantic)
export const colors = {
  pulse: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
  },
  surface: {
    primary: "#ffffff",
    secondary: "#fafafa",
    tertiary: "#f5f5f5",
    elevated: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.4)",
  },
  text: {
    primary: "#111827",
    secondary: "#4b5563",
    tertiary: "#9ca3af",
    quaternary: "#d1d5db",
  },
  border: {
    subtle: "rgba(0, 0, 0, 0.04)",
    default: "rgba(0, 0, 0, 0.06)",
    strong: "rgba(0, 0, 0, 0.08)",
    focus: "rgba(59, 130, 246, 0.2)",
  },
  status: {
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  },
} as const;

// Shadow System (4 levels)
export const shadows = {
  sm: "0 1px 3px rgba(0, 0, 0, 0.02)",
  md: "0 2px 8px rgba(0, 0, 0, 0.03)",
  lg: "0 8px 25px rgba(0, 0, 0, 0.06)",
  xl: "0 20px 60px rgba(0, 0, 0, 0.08)",
} as const;

// Border Radius (5 values)
export const borderRadius = {
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

// Spacing Scale (8 steps)
export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px",
  12: "48px",
  16: "64px",
} as const;

// Chart Color Palette (6 series)
export const chartColors = {
  series1: "#3b82f6", // blue (primary)
  series2: "#10b981", // green
  series3: "#f59e0b", // amber
  series4: "#ef4444", // red
  series5: "#8b5cf6", // purple
  series6: "#06b6d4", // cyan
  grid: "#f1f5f9",
  tooltip: {
    bg: "#09090b",
    text: "#ffffff",
    border: "#27272a",
  },
} as const;

// Animation Timings (5 presets)
export const animation = {
  fast: "100ms",
  normal: "200ms",
  slow: "300ms",
  spring: "500ms",
  page: "150ms",
  ease: [0.25, 0.1, 0.25, 1] as const,
} as const;
