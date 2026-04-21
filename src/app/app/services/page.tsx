"use client";

/* ════════════════════════════════════════════════════════════════════
   /app/services — earn side inside the unified shell.

   Shows the Pulse overview without the legacy Pulse chrome (second
   sidebar, second header). Uses the same data hooks.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  DollarSign,
  Zap,
  Users,
  TrendingUp,
  Code2,
  Key,
  Globe,
  Loader2,
  Sparkles,
  Check,
} from "lucide-react";
import { usePulseStats } from "@/hooks/use-pulse-stats";

const EASE = [0.25, 0.1, 0.25, 1] as const;

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${(n || 0).toFixed(n < 10 ? 2 : 0)}`;
}

function fmtNum(n: number): string {
  return (n || 0).toLocaleString();
}

export default function AppServicesPage() {
  const { data, loading } = usePulseStats("7d");
  const hasData = !!data && data.calls > 0;

  return (
    <div className="space-y-7 pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-2"
      >
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
            style={{ color: "#0EA5E9" }}
          >
            Revenue
          </p>
          <h1
            className="tracking-[-0.035em] text-balance"
            style={{
              fontSize: "clamp(30px, 4.2vw, 42px)",
              lineHeight: 1.02,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Payments from agents.
          </h1>
          <p
            className="mt-2 text-[14.5px] leading-[1.55] max-w-[580px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            When other Kyvern agents pay your service, or when your own
            agents earn from x402 endpoints, everything lands here with
            verifiable on-chain identity — you see <em>who</em> paid, not just
            an anonymous address. Wrap any endpoint with{" "}
            <code className="code-inline">@kyvernlabs/pulse</code>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/pulse/dashboard/setup"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[11px] text-[13px] font-semibold transition-colors"
            style={{
              background: "var(--surface)",
              color: "var(--text-primary)",
              border: "0.5px solid var(--border)",
            }}
          >
            <Code2 className="w-3.5 h-3.5" />
            Setup guide
          </Link>
          <Link
            href="/pulse/dashboard/keys"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[11px] text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#0EA5E9", color: "white" }}
          >
            <Key className="w-3.5 h-3.5" />
            API keys
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* Stat tiles — always render, even with zeros */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <StatTile
          icon={DollarSign}
          label="Revenue (7d)"
          value={fmtUsd(data?.revenue || 0)}
          delta={data?.deltas?.revenue_pct}
          loading={loading}
        />
        <StatTile
          icon={Zap}
          label="Calls (7d)"
          value={fmtNum(data?.calls || 0)}
          delta={data?.deltas?.calls_pct}
          loading={loading}
        />
        <StatTile
          icon={Users}
          label="Unique agents"
          value={fmtNum(data?.customers || 0)}
          delta={data?.deltas?.customers_pct}
          loading={loading}
        />
        <StatTile
          icon={TrendingUp}
          label="Avg / call"
          value={fmtUsd(data?.avg_price || 0)}
          delta={data?.deltas?.avg_price_pct}
          loading={loading}
        />
      </motion.div>

      {/* Empty / onboarding state when no events */}
      {!loading && !hasData ? (
        <OnboardingBlock />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
          className="p-6 rounded-[18px]"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border-subtle)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p
                className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--text-quaternary)" }}
              >
                Full dashboard
              </p>
              <h3
                className="text-[16px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Transactions, customers, endpoints, cohorts
              </h3>
              <p
                className="mt-1 text-[12.5px] leading-[1.5] max-w-[420px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                The deeper Pulse views live in a dedicated dashboard. Open it
                to drill into on-chain-verified payments, per-agent analytics,
                A/B experiments, and revenue forecasting.
              </p>
            </div>
            <Link
              href="/pulse/dashboard"
              className="shrink-0 inline-flex items-center gap-1 h-9 px-3.5 rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--text-primary)" }}
            >
              Open dashboard
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  delta,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: number;
  loading?: boolean;
}) {
  return (
    <div
      className="p-4 rounded-[14px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
        </span>
        <Icon className="w-3 h-3" />
      </div>
      {loading ? (
        <div
          className="h-6 w-20 rounded-md animate-pulse"
          style={{ background: "var(--surface-2)" }}
        />
      ) : (
        <>
          <div
            className="text-[22px] font-semibold tracking-[-0.02em] font-mono-numbers"
            style={{ color: "var(--text-primary)" }}
          >
            {value}
          </div>
          {typeof delta === "number" && delta !== 0 && (
            <div
              className="mt-0.5 text-[11.5px] font-semibold"
              style={{
                color: delta > 0 ? "#047857" : "#B91C1C",
              }}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}% vs prior
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OnboardingBlock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="p-8 rounded-[22px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.03), 0 20px 60px -36px rgba(14,165,233,0.18)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-3">
        <Globe className="w-3.5 h-3.5" style={{ color: "#0EA5E9" }} />
        <p
          className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "#0EA5E9" }}
        >
          Two minutes. Three steps.
        </p>
      </div>
      <h2
        className="text-[22px] font-semibold tracking-[-0.02em]"
        style={{ color: "var(--text-primary)" }}
      >
        Start capturing every agent payment to your service.
      </h2>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            n: "1",
            title: "Mint an API key",
            body: "One-click in the keys panel. kv_live_… scoped to your wallet.",
            href: "/pulse/dashboard/keys",
          },
          {
            n: "2",
            title: "Install the middleware",
            body: "npm i @kyvernlabs/pulse — no extra infra to host.",
            href: "/pulse/dashboard/setup",
          },
          {
            n: "3",
            title: "Wrap your endpoint",
            body: "One line of code. Every payment shows up here with an Explorer link.",
            href: "/docs",
          },
        ].map((s) => (
          <Link
            key={s.n}
            href={s.href}
            className="group p-4 rounded-[14px] block transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border-subtle)",
            }}
          >
            <p
              className="font-mono-numbers text-[11px] font-semibold mb-2"
              style={{ color: "var(--text-quaternary)" }}
            >
              {s.n.padStart(2, "0")}
            </p>
            <p
              className="text-[14px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {s.title}
            </p>
            <p
              className="mt-1 text-[12px] leading-[1.5]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {s.body}
            </p>
            <div
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium transition-transform group-hover:translate-x-0.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Go
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>

      {/* Demo data simulator — lets the user FEEL Pulse before setup */}
      <div className="mt-6 pt-6" style={{ borderTop: "0.5px solid var(--border-subtle)" }}>
        <PulseSimulator />
      </div>
    </motion.div>
  );
}

/**
 * PulseSimulator — one-click button that hits /api/pulse/simulate to
 * insert a burst of realistic x402 events into the user's Pulse
 * dashboard. The earn-side equivalent of the Vault playground's "test
 * payment" panel: lets first-time users SEE the product populated with
 * live data without standing up a real x402 endpoint first.
 *
 * On success, reloads the page so every stat tile repaints.
 */
function PulseSimulator() {
  const [state, setState] = useState<
    { status: "idle" } | { status: "running" } | { status: "done"; inserted: number } | { status: "error"; message: string }
  >({ status: "idle" });

  const run = async () => {
    setState({ status: "running" });
    try {
      const r = await fetch("/api/pulse/simulate", {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json()) as { success?: boolean; inserted?: number; message?: string; error?: string };
      if (!r.ok || !j.success) {
        setState({
          status: "error",
          message: j.message || j.error || `HTTP ${r.status}`,
        });
        return;
      }
      setState({ status: "done", inserted: j.inserted ?? 0 });
      // Reload so stat tiles pick up the new events.
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "network error",
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div
        className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
        style={{ background: "rgba(14,165,233,0.08)" }}
      >
        <Sparkles className="w-4.5 h-4.5" style={{ color: "#0EA5E9" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "#0EA5E9" }}
        >
          Prefer to see it first?
        </p>
        <h4
          className="text-[14.5px] font-semibold tracking-[-0.015em]"
          style={{ color: "var(--text-primary)" }}
        >
          Spin up a demo endpoint — 3 seconds.
        </h4>
        <p
          className="mt-0.5 text-[12px] leading-[1.5]"
          style={{ color: "var(--text-tertiary)" }}
        >
          We&rsquo;ll drop 8 realistic x402 payments into your dashboard so you
          can explore transactions, customers, and cohorts with real data
          before writing any code.
        </p>
        {state.status === "error" && (
          <p
            className="mt-1.5 text-[11.5px] font-medium"
            style={{ color: "#DC2626" }}
          >
            {state.message}
          </p>
        )}
      </div>
      <button
        onClick={run}
        disabled={state.status === "running" || state.status === "done"}
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[12px] text-[13px] font-semibold transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
        style={{
          background: "#0EA5E9",
          color: "white",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 10px 28px rgba(14,165,233,0.25)",
        }}
      >
        {state.status === "running" ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Seeding
          </>
        ) : state.status === "done" ? (
          <>
            <Check className="w-3.5 h-3.5" />
            {state.inserted} events seeded
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Run simulator
          </>
        )}
      </button>
    </div>
  );
}
