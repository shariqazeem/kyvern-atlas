"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Target, Sparkles } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

function formatUSD(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function RevenueSimulator() {
  const [pricePerCall, setPricePerCall] = useState(0.01);
  const [dailyCalls, setDailyCalls] = useState(500);
  const [monthlyGrowth, setMonthlyGrowth] = useState(15);

  const projection = useMemo(() => {
    const months: { month: number; revenue: number; cumulative: number }[] = [];
    let cumulative = 0;
    for (let m = 1; m <= 12; m++) {
      const growthMultiplier = Math.pow(1 + monthlyGrowth / 100, m - 1);
      const monthlyRevenue = pricePerCall * dailyCalls * 30 * growthMultiplier;
      cumulative += monthlyRevenue;
      months.push({ month: m, revenue: monthlyRevenue, cumulative });
    }
    return months;
  }, [pricePerCall, dailyCalls, monthlyGrowth]);

  const month12Revenue = projection[11]?.revenue || 0;
  const totalYear = projection[11]?.cumulative || 0;
  const maxRevenue = Math.max(...projection.map((m) => m.revenue), 1);

  // Find milestones
  const first1k = projection.find((m) => m.revenue >= 1000);
  const first10k = projection.find((m) => m.revenue >= 10000);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease }}
      className="py-20 px-6"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-pulse/20 bg-pulse-50 text-[11px] tracking-wide font-medium text-pulse-600 mb-4">
            <Sparkles className="w-3 h-3" />
            Interactive
          </div>
          <h2 className="text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-[-0.03em]">
            Simulate your x402 revenue
          </h2>
          <p className="text-[15px] text-secondary mt-2 max-w-lg mx-auto">
            Adjust the sliders to see how much your x402 endpoints could earn. Pulse tracks every dollar.
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white p-6 lg:p-8 shadow-premium">
          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="flex items-center justify-between text-[12px] font-medium text-secondary mb-2">
                <span>Price per call</span>
                <span className="font-mono-numbers text-primary">${pricePerCall.toFixed(3)}</span>
              </label>
              <input
                type="range"
                min={0.001}
                max={1}
                step={0.001}
                value={pricePerCall}
                onChange={(e) => setPricePerCall(parseFloat(e.target.value))}
                className="w-full accent-pulse h-1.5 rounded-full appearance-none bg-[#F0F0F0] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-quaternary mt-1">
                <span>$0.001</span>
                <span>$1.00</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-[12px] font-medium text-secondary mb-2">
                <span>Daily calls</span>
                <span className="font-mono-numbers text-primary">{dailyCalls.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min={10}
                max={10000}
                step={10}
                value={dailyCalls}
                onChange={(e) => setDailyCalls(parseInt(e.target.value))}
                className="w-full accent-pulse h-1.5 rounded-full appearance-none bg-[#F0F0F0] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-quaternary mt-1">
                <span>10</span>
                <span>10,000</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-[12px] font-medium text-secondary mb-2">
                <span>Monthly growth</span>
                <span className="font-mono-numbers text-primary">{monthlyGrowth}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={monthlyGrowth}
                onChange={(e) => setMonthlyGrowth(parseInt(e.target.value))}
                className="w-full accent-pulse h-1.5 rounded-full appearance-none bg-[#F0F0F0] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-quaternary mt-1">
                <span>0%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* Chart — pure SVG bar chart */}
          <div className="mb-6">
            <div className="flex items-end gap-1 h-40">
              {projection.map((m, i) => {
                const height = (m.revenue / maxRevenue) * 100;
                return (
                  <motion.div
                    key={m.month}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.4, delay: i * 0.03, ease }}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-pulse-500 to-pulse-300 relative group cursor-pointer"
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] font-mono-numbers px-2 py-1 rounded whitespace-nowrap">
                      {formatUSD(m.revenue)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="flex gap-1 mt-1">
              {projection.map((m) => (
                <div key={m.month} className="flex-1 text-center text-[9px] text-quaternary">
                  M{m.month}
                </div>
              ))}
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-[#FAFAFA] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3 h-3 text-quaternary" />
                <span className="text-[10px] text-quaternary font-medium uppercase tracking-wider">Month 12</span>
              </div>
              <span className="text-[18px] font-semibold font-mono-numbers">{formatUSD(month12Revenue)}</span>
              <span className="text-[10px] text-quaternary ml-1">/mo</span>
            </div>
            <div className="rounded-lg bg-[#FAFAFA] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3 h-3 text-quaternary" />
                <span className="text-[10px] text-quaternary font-medium uppercase tracking-wider">Year total</span>
              </div>
              <span className="text-[18px] font-semibold font-mono-numbers">{formatUSD(totalYear)}</span>
            </div>
            <div className="rounded-lg bg-[#FAFAFA] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3 h-3 text-quaternary" />
                <span className="text-[10px] text-quaternary font-medium uppercase tracking-wider">$1K/mo</span>
              </div>
              <span className="text-[14px] font-semibold">
                {first1k ? `Month ${first1k.month}` : "—"}
              </span>
            </div>
            <div className="rounded-lg bg-[#FAFAFA] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] text-quaternary font-medium uppercase tracking-wider">$10K/mo</span>
              </div>
              <span className="text-[14px] font-semibold">
                {first10k ? `Month ${first10k.month}` : "—"}
              </span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 text-center">
            <p className="text-[13px] text-tertiary">
              Pulse tracks every dollar, optimizes pricing, and grows your x402 business.
            </p>
            <a
              href="/pulse/dashboard"
              className="inline-flex items-center gap-2 mt-3 h-10 px-5 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors duration-300"
            >
              Start for free
            </a>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
