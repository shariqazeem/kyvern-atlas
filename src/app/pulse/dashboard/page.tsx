"use client";

import { DollarSign, Zap, Users, TrendingUp } from "lucide-react";
import { useDashboardStore } from "@/hooks/use-dashboard-store";
import { usePulseStats } from "@/hooks/use-pulse-stats";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { EndpointTable } from "@/components/dashboard/endpoint-table";
import { CustomerTable } from "@/components/dashboard/customer-table";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { ConnectGate } from "@/components/dashboard/connect-gate";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
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
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-black/[0.06] dark:border-gray-800 p-5 h-[120px] animate-pulse">
              <div className="h-3 w-20 bg-[#F0F0F0] dark:bg-gray-700 rounded mb-3" />
              <div className="h-6 w-28 bg-[#F0F0F0] dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasData = data && data.calls > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight">Overview</h1>
        <p className="text-[13px] text-tertiary mt-0.5">
          Revenue intelligence for your x402 endpoints
        </p>
      </div>

      {/* Onboarding checklist — shows until first event */}
      <OnboardingChecklist hasEvents={!!hasData} />

      {/* Stat cards — always show, with zeros if no data */}
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

      {/* Revenue chart — shows skeleton when empty */}
      <RevenueChart />

      {hasData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EndpointTable limit={5} />
            <CustomerTable limit={5} />
          </div>

          <RecentTransactions limit={10} />
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
