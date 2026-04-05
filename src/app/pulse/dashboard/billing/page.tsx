"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Check, ArrowRight, Sparkles, Zap, TrendingUp, BarChart3, Users, Activity } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

function ROISection() {
  const [stats, setStats] = useState<{ revenue: number; calls: number; customers: number } | null>(null);

  useEffect(() => {
    fetch("/api/pulse/stats?range=30d", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setStats({ revenue: d.revenue, calls: d.calls, customers: d.customers }))
      .catch(() => {});
  }, []);

  if (!stats || (stats.revenue === 0 && stats.calls === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-6"
    >
      <h3 className="text-[14px] font-semibold mb-1">Pulse ROI</h3>
      <p className="text-[12px] text-tertiary mb-4">What Pulse has tracked for you in the last 30 days</p>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[16px] font-semibold font-mono-numbers">{formatCurrency(stats.revenue)}</p>
            <p className="text-[10px] text-quaternary">Revenue tracked</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[16px] font-semibold font-mono-numbers">{stats.calls.toLocaleString()}</p>
            <p className="text-[10px] text-quaternary">Transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-[16px] font-semibold font-mono-numbers">{stats.customers}</p>
            <p className="text-[10px] text-quaternary">Unique agents</p>
          </div>
        </div>
      </div>
      {stats.revenue > 0 && (
        <p className="text-[11px] text-emerald-700 mt-4">
          Without Pulse, you would have no visibility into this revenue. That&apos;s worth more than $49/mo.
        </p>
      )}
    </motion.div>
  );
}

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    features: [
      "5,000 events/day",
      "$100/month revenue tracked",
      "14-day data retention",
      "1 API key",
      "3 basic alerts",
      "Overview dashboard",
      "Transactions, endpoints, customers",
      "On-chain verification",
      "Market intelligence",
    ],
  },
  {
    name: "Growth",
    price: "$19",
    period: "/month",
    highlight: true,
    features: [
      "50,000 events/day",
      "$5,000/month revenue tracked",
      "30-day data retention",
      "3 API keys",
      "10 alerts (all types)",
      "Pricing benchmarks",
      "CSV export",
      "Everything in Free",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month USDC",
    features: [
      "Unlimited events + revenue",
      "90-day data retention",
      "Up to 10 API keys",
      "Unlimited alerts + webhooks",
      "Cohort analysis",
      "Competitive intelligence",
      "Slack/Discord notifications",
      "A/B pricing experiments",
      "Historical data import",
      "Priority support",
      "Everything in Growth",
    ],
  },
];

export default function BillingPage() {
  const { plan, proExpiresAt } = useAuth();
  const isPaid = plan === "pro" || plan === "growth";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-[18px] font-semibold tracking-tight">Billing</h1>
        <p className="text-[13px] text-tertiary mt-0.5">
          Manage your Pulse subscription
        </p>
      </div>

      {/* Current plan */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="rounded-xl border border-black/[0.06] bg-white p-6 shadow-premium"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold">Current Plan</h3>
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                plan === "pro" ? "bg-pulse-50 text-pulse-600" :
                plan === "growth" ? "bg-amber-50 text-amber-600" :
                "bg-[#F0F0F0] text-tertiary"
              )}>
                {plan === "pro" && <Sparkles className="w-2.5 h-2.5" />}
                {plan === "growth" && <TrendingUp className="w-2.5 h-2.5" />}
                {plan === "pro" ? "Pro" : plan === "growth" ? "Growth" : "Free"}
              </span>
            </div>
            {isPaid && proExpiresAt && (
              <p className="text-[12px] text-tertiary mt-1">
                Active until {new Date(proExpiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
          {!isPaid && (
            <Link
              href="/pulse/upgrade"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors duration-300"
            >
              <Zap className="w-3.5 h-3.5" />
              Upgrade
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {TIERS.map((tier) => {
            const isCurrent = tier.name.toLowerCase() === plan;
            return (
              <div
                key={tier.name}
                className={cn(
                  "rounded-lg border p-4 transition-all",
                  isCurrent ? "border-pulse/20 bg-pulse-50/30 ring-1 ring-pulse/10" :
                  tier.highlight && !isPaid ? "border-amber-200 bg-amber-50/20" :
                  "border-black/[0.04] opacity-70"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] font-semibold">{tier.name}</span>
                  {isCurrent && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-pulse/10 text-pulse uppercase">Current</span>
                  )}
                </div>
                <div className="flex items-baseline gap-0.5 mb-3">
                  <span className="text-[22px] font-semibold font-mono-numbers">{tier.price}</span>
                  <span className="text-[11px] text-quaternary">{tier.period}</span>
                </div>
                <ul className="space-y-1.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[11px] text-secondary">
                      <Check className={cn("w-3 h-3 shrink-0 mt-0.5", isCurrent ? "text-pulse" : "text-tertiary")} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ROI Calculator */}
      <ROISection />

      {/* Payment method */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        className="rounded-xl border border-black/[0.06] bg-white p-6 shadow-premium"
      >
        <h3 className="text-[14px] font-semibold mb-2">Payment Methods</h3>
        <p className="text-[13px] text-tertiary leading-relaxed">
          Pay with <span className="font-medium text-primary">USDC on Base</span> via
          the x402 protocol — the same way your agents pay you.
          {" "}Save 15% by paying with USDC instead of credit card.
        </p>
        {plan === "pro" && (
          <p className="text-[12px] text-quaternary mt-2">
            Pay with USDC and get 15% off vs credit card pricing.
          </p>
        )}
        {!isPaid && (
          <Link
            href="/pulse/upgrade"
            className="inline-flex items-center gap-1.5 mt-4 text-[12px] font-medium text-pulse hover:underline"
          >
            Upgrade now
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </motion.div>
    </div>
  );
}
