"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Check, ArrowRight, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const FREE_FEATURES = [
  "1,000 events/day or $10 revenue",
  "7-day data retention",
  "1 API key",
  "Basic dashboard",
  "On-chain verification",
];

const PRO_FEATURES = [
  "Unlimited events",
  "90-day data retention",
  "Up to 10 API keys",
  "Full analytics suite",
  "Pricing benchmarks",
  "Webhooks + alerts",
  "CSV export + tax reports",
  "Priority support",
];

export default function BillingPage() {
  const { plan, proExpiresAt } = useAuth();
  const isPro = plan === "pro";

  return (
    <div className="space-y-6 max-w-2xl">
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
                isPro ? "bg-pulse-50 text-pulse-600" : "bg-[#F0F0F0] text-tertiary"
              )}>
                {isPro && <Sparkles className="w-2.5 h-2.5" />}
                {isPro ? "Pro" : "Free"}
              </span>
            </div>
            {isPro && proExpiresAt && (
              <p className="text-[12px] text-tertiary mt-1">
                Active until {new Date(proExpiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
          {!isPro && (
            <Link
              href="/pulse/upgrade"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 transition-colors duration-300"
            >
              <Zap className="w-3.5 h-3.5" />
              Upgrade to Pro
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {/* Free tier */}
          <div className={cn(
            "rounded-lg border p-4",
            !isPro ? "border-black/[0.08] bg-[#FAFAFA]" : "border-black/[0.04] opacity-60"
          )}>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-[20px] font-semibold font-mono-numbers">$0</span>
              <span className="text-[12px] text-quaternary">/month</span>
            </div>
            <ul className="space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12px] text-secondary">
                  <Check className="w-3 h-3 text-tertiary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro tier */}
          <div className={cn(
            "rounded-lg border p-4",
            isPro ? "border-pulse/20 bg-pulse-50/30" : "border-black/[0.08]"
          )}>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-[20px] font-semibold font-mono-numbers">$49</span>
              <span className="text-[12px] text-quaternary">/month USDC</span>
            </div>
            <ul className="space-y-2">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[12px] text-secondary">
                  <Check className="w-3 h-3 text-pulse shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Payment method */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        className="rounded-xl border border-black/[0.06] bg-white p-6 shadow-premium"
      >
        <h3 className="text-[14px] font-semibold mb-2">Payment Method</h3>
        <p className="text-[13px] text-tertiary leading-relaxed">
          Pulse Pro is paid with <span className="font-medium text-primary">USDC on Base</span> via
          the x402 protocol. Send $49 USDC to upgrade — the same way your agents pay you.
        </p>
        {!isPro && (
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
