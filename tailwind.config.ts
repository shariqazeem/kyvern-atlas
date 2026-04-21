import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--text-primary)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          bg: "var(--accent-bg)",
        },
        solana: {
          DEFAULT: "var(--solana)",
          bg: "var(--solana-bg)",
          green: "var(--solana-green)",
        },
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          bg: "var(--destructive-bg)",
        },
        border: {
          DEFAULT: "var(--border)",
          2: "var(--border-2)",
          subtle: "var(--border-subtle)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          quaternary: "var(--text-quaternary)",
        },
        /* Legacy pulse colors — keep for existing component compatibility */
        pulse: {
          DEFAULT: "#3b82f6",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "SF Mono",
          "monospace",
        ],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      boxShadow: {
        premium:
          "0 0 0 0.5px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.03)",
        "premium-lg":
          "0 0 0 0.5px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.06)",
        "premium-xl":
          "0 0 0 0.5px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.08), 0 32px 64px rgba(0,0,0,0.08)",
        "accent-glow":
          "0 6px 24px rgba(59,130,246,0.15), 0 12px 48px rgba(59,130,246,0.1)",
        "solana-glow":
          "0 6px 24px rgba(153,69,255,0.15), 0 12px 48px rgba(153,69,255,0.1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
