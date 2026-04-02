"use client";

import { DollarSign, Zap, Users, TrendingUp } from "lucide-react";
import { useDashboardStore } from "@/hooks/use-dashboard-store";
import { usePulseStats } from "@/hooks/use-pulse-stats";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { EndpointTable } from "@/components/dashboard/endpoint-table";
import { CustomerTable } from "@/components/dashboard/customer-table";
import { DemoTrigger } from "@/components/dashboard/demo-trigger";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function DashboardOverview() {
  const { timeRange } = useDashboardStore();
  const { data, loading } = usePulseStats(timeRange);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-border p-5 h-[120px] animate-pulse"
            >
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-6 w-28 bg-muted rounded" />
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
        <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Revenue intelligence for your x402 endpoints
        </p>
      </div>

      {/* Always show the demo trigger — this is how data gets generated */}
      <DemoTrigger />

      {hasData ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(data.revenue)}
              delta={data.deltas.revenue_pct}
              icon={DollarSign}
              index={0}
            />
            <StatCard
              title="Total Calls"
              value={formatNumber(data.calls)}
              delta={data.deltas.calls_pct}
              icon={Zap}
              index={1}
            />
            <StatCard
              title="Unique Agents"
              value={formatNumber(data.customers)}
              delta={data.deltas.customers_pct}
              icon={Users}
              index={2}
            />
            <StatCard
              title="Avg Price / Call"
              value={formatCurrency(data.avg_price)}
              delta={data.deltas.avg_price_pct}
              icon={TrendingUp}
              index={3}
            />
          </div>

          <RevenueChart />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EndpointTable limit={5} />
            <CustomerTable limit={5} />
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg border border-border p-8 shadow-premium text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Zap className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold mb-1">No transactions yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Click &quot;Make Live Payment&quot; above to trigger a real x402 payment on Base Sepolia.
            The transaction will appear here with a verified blockchain hash.
          </p>
        </div>
      )}

      <RecentTransactions limit={10} />
    </div>
  );
}
