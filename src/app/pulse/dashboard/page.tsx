"use client";

import { DollarSign, Zap, Users, TrendingUp } from "lucide-react";
import { useDashboardStore } from "@/hooks/use-dashboard-store";
import { usePulseStats } from "@/hooks/use-pulse-stats";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { EndpointTable } from "@/components/dashboard/endpoint-table";
import { CustomerTable } from "@/components/dashboard/customer-table";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { MoneyMoments } from "@/components/dashboard/money-moments";
import { ConnectGate } from "@/components/dashboard/connect-gate";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { RevenueNarrator } from "@/components/dashboard/revenue-narrator";
import { formatCurrency, formatNumber } from "@/lib/utils";

function DashboardContent() {
  const { timeRange } = useDashboardStore();
  const effectiveRange = timeRange === "custom" ? "30d" : timeRange;
  const { data, loading } = usePulseStats(effectiveRange);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-[120px]" />
          ))}
        </div>
        <div className="skeleton h-[300px]" />
      </div>
    );
  }

  const hasData = data && data.calls > 0;

  return (
    <div className="space-y-8 pb-16">
      <div>
        <p
          className="text-[10.5px] font-semibold uppercase tracking-[0.08em] mb-1"
          style={{ color: "#0EA5E9" }}
        >
          Earn · overview
        </p>
        <h1
          className="tracking-[-0.025em]"
          style={{
            fontSize: "clamp(28px, 3.6vw, 36px)",
            lineHeight: 1.05,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Overview
        </h1>
        <p
          className="mt-1.5 text-[14px] leading-[1.55]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Revenue intelligence for your x402 endpoints on Solana. Every row
          links to a real Explorer transaction.
        </p>
      </div>

      {hasData && <RevenueNarrator />}

      <OnboardingChecklist hasEvents={!!hasData} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(data?.revenue || 0)}
          delta={data?.deltas.revenue_pct || 0}
          icon={DollarSign}
          index={0}
        />
        <StatCard
          title="Total Calls"
          value={formatNumber(data?.calls || 0)}
          delta={data?.deltas.calls_pct || 0}
          icon={Zap}
          index={1}
        />
        <StatCard
          title="Unique Agents"
          value={formatNumber(data?.customers || 0)}
          delta={data?.deltas.customers_pct || 0}
          icon={Users}
          index={2}
        />
        <StatCard
          title="Avg Price / Call"
          value={formatCurrency(data?.avg_price || 0)}
          delta={data?.deltas.avg_price_pct || 0}
          icon={TrendingUp}
          index={3}
        />
      </div>

      <RevenueChart />

      {hasData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EndpointTable limit={5} />
            <CustomerTable limit={5} />
          </div>

          <RecentTransactions limit={10} />

          <MoneyMoments limit={5} showViewAll />
        </>
      )}
    </div>
  );
}

export default function DashboardOverview() {
  return (
    <ConnectGate>
      <DashboardContent />
    </ConnectGate>
  );
}
