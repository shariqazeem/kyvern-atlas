"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { SocialProof } from "@/components/landing/social-proof";
import {
  ArrowRight,
  Activity,
  BarChart3,
  Users,
  Zap,
  Bell,
  Code2,
  Check,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Revenue Dashboard",
    desc: "Real-time revenue, calls, and trends across all your x402 endpoints. See exactly what you're earning.",
  },
  {
    icon: Users,
    title: "Customer Analytics",
    desc: "Which agents pay the most? How often? Which endpoints do they prefer? Know your customers by wallet.",
  },
  {
    icon: Zap,
    title: "Performance Monitoring",
    desc: "Track latency, error rates, and uptime per endpoint. Catch issues before your agents do.",
  },
  {
    icon: Code2,
    title: "One-Line Integration",
    desc: "Wrap your handler with withPulse() — analytics flows immediately. Zero config. Non-blocking.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Revenue spike? Drop? New whale agent? Get notified instantly. Never miss a business signal.",
  },
  {
    icon: Activity,
    title: "Blockchain Verified",
    desc: "Every payment tracked with on-chain tx hash. Click through to block explorer. Real, not demo.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For side projects and exploration",
    features: ["1 endpoint", "7-day history", "Basic dashboard", "100 events/day"],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    desc: "For serious x402 service providers",
    features: [
      "Unlimited endpoints",
      "90-day history",
      "Full analytics suite",
      "Unlimited events",
      "Pricing benchmarks",
      "Webhooks + email alerts",
      "CSV export + tax reports",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For high-volume x402 infrastructure",
    features: [
      "Everything in Pro",
      "Unlimited history",
      "Custom integrations",
      "Public API access",
      "Dedicated support",
      "SLA guarantee",
      "Volume discounts",
    ],
    cta: "Contact Us",
    highlight: false,
  },
];

function MiniDashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative mt-14 mx-auto max-w-3xl"
    >
      <div className="absolute -inset-3 bg-gradient-to-b from-pulse-100/50 via-pulse-50/20 to-transparent rounded-2xl blur-xl" />
      <div className="relative rounded-xl border border-black/[0.08] bg-white shadow-premium-xl overflow-hidden">
        {/* Browser bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-black/[0.04] bg-[#FAFAFA]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-black/[0.07]" />
            <div className="w-2 h-2 rounded-full bg-black/[0.07]" />
            <div className="w-2 h-2 rounded-full bg-black/[0.07]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-white border border-black/[0.05] text-[10px] text-quaternary font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              kyvernlabs.com/pulse/dashboard
            </div>
          </div>
        </div>
        {/* Content */}
        <div className="p-4 bg-[#F8F8FA]">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { icon: DollarSign, label: "Revenue", val: "$12,847", d: "+23%" },
              { icon: Zap, label: "Calls", val: "8,492", d: "+13%" },
              { icon: Users, label: "Agents", val: "47", d: "+5" },
              { icon: TrendingUp, label: "Avg", val: "$1.51", d: "-2%" },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-lg border border-black/[0.04] p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-quaternary font-medium">{c.label}</span>
                  <c.icon className="w-2.5 h-2.5 text-quaternary" />
                </div>
                <p className="text-[13px] font-semibold font-mono tracking-tight">{c.val}</p>
                <span className="text-[9px] font-medium text-emerald-600">{c.d}</span>
              </div>
            ))}
          </div>
          {/* Chart */}
          <div className="bg-white rounded-lg border border-black/[0.04] p-3">
            <svg viewBox="0 0 500 80" className="w-full h-auto">
              <defs>
                <linearGradient id="pulseChartG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,60 C40,55 70,40 100,42 C130,44 160,30 200,25 C240,20 280,35 320,22 C360,10 400,15 440,8 L500,3" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
              <path d="M0,60 C40,55 70,40 100,42 C130,44 160,30 200,25 C240,20 280,35 320,22 C360,10 400,15 440,8 L500,3 L500,80 L0,80 Z" fill="url(#pulseChartG)" />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function PulseLanding() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-8 lg:pt-44 lg:pb-12 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-fine-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-radial from-pulse-100/50 via-transparent to-transparent rounded-full blur-[80px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-pulse/20 bg-pulse-50 text-[11px] tracking-wide font-medium text-pulse-600 mb-8"
          >
            <Activity className="w-3 h-3" />
            Pulse by KyvernLabs
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.08] tracking-[-0.04em]"
          >
            Revenue intelligence
            <br />
            for{" "}
            <span className="bg-gradient-to-r from-pulse-500 to-indigo-500 bg-clip-text text-transparent">
              x402 service providers
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-5 text-[16px] leading-[1.65] text-secondary max-w-lg mx-auto"
          >
            See every payment, every customer, every trend.
            One line of code. Blockchain-verified. Real-time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <Link
              href="/pulse/dashboard"
              className="group inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors duration-300"
            >
              View Live Dashboard
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pulse/dashboard/setup"
              className="inline-flex items-center h-11 px-6 rounded-lg border border-black/[0.08] text-[13px] font-medium text-secondary hover:text-primary hover:border-black/[0.15] transition-all duration-300"
            >
              Setup in 47 seconds
            </Link>
          </motion.div>

          <MiniDashboardPreview />
        </div>
      </section>

      {/* Integration code — the "aha" moment */}
      <section className="py-24 lg:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-10"
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
              Integration
            </p>
            <h2 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold tracking-[-0.03em] leading-[1.15]">
              Add Pulse to your endpoint in{" "}
              <span className="text-pulse">one line</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="bg-[#0A0A0A] rounded-xl border border-white/[0.06] overflow-hidden shadow-premium-xl"
          >
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06]">
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <span className="ml-3 text-[10px] text-white/20 font-mono">your-api/route.ts</span>
            </div>
            <div className="p-5 lg:p-6">
              <pre className="text-[13px] font-mono leading-[1.8] overflow-x-auto">
                <code>
                  <span className="text-purple-400">import</span>
                  <span className="text-gray-300">{" { "}</span>
                  <span className="text-blue-400">withX402</span>
                  <span className="text-gray-300">{" } "}</span>
                  <span className="text-purple-400">from</span>
                  <span className="text-emerald-400">{" '@x402/next'"}</span>
                  {"\n"}
                  <span className="text-purple-400">import</span>
                  <span className="text-gray-300">{" { "}</span>
                  <span className="text-blue-400">withPulse</span>
                  <span className="text-gray-300">{" } "}</span>
                  <span className="text-purple-400">from</span>
                  <span className="text-emerald-400">{" '@kyvernlabs/pulse'"}</span>
                  {"\n\n"}
                  <span className="text-gray-500">{"// That's it. Every payment → your Pulse dashboard."}</span>
                  {"\n"}
                  <span className="text-purple-400">export const</span>
                  <span className="text-gray-300">{" GET = "}</span>
                  <span className="text-blue-400">withPulse</span>
                  <span className="text-gray-400">{"("}</span>
                  {"\n  "}
                  <span className="text-blue-400">withX402</span>
                  <span className="text-gray-400">{"(handler, config, server),"}</span>
                  {"\n  "}
                  <span className="text-gray-400">{"{ "}</span>
                  <span className="text-orange-300">apiKey</span>
                  <span className="text-gray-400">{": "}</span>
                  <span className="text-emerald-400">{"'kv_...'"}</span>
                  <span className="text-gray-400">{" }"}</span>
                  {"\n"}
                  <span className="text-gray-400">{")"}</span>
                </code>
              </pre>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-4 text-center text-[12px] text-quaternary"
          >
            Works with Next.js, Express, Hono — any x402-compatible framework
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 lg:py-32 px-6 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-14"
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
              Features
            </p>
            <h2 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold tracking-[-0.03em] leading-[1.15]">
              Everything to run a profitable x402 service
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.05,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="bg-white rounded-xl border border-black/[0.06] p-6 hover:border-black/[0.12] hover:shadow-premium-lg transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-lg bg-[#FAFAFA] flex items-center justify-center mb-4">
                  <feature.icon className="w-[18px] h-[18px] text-secondary" />
                </div>
                <h3 className="text-[14px] font-semibold tracking-tight mb-1.5">{feature.title}</h3>
                <p className="text-[13px] text-tertiary leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SocialProof />

      {/* Pricing */}
      <section id="pricing" className="py-24 lg:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-14"
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
              Pricing
            </p>
            <h2 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold tracking-[-0.03em] leading-[1.15]">
              Simple, transparent, scales with you
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.06,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className={cn(
                  "rounded-xl border p-6 lg:p-7 transition-all duration-300",
                  plan.highlight
                    ? "border-foreground bg-foreground text-background shadow-premium-xl"
                    : "border-black/[0.06] bg-white hover:border-black/[0.12]"
                )}
              >
                <p className={cn(
                  "text-[11px] uppercase tracking-[0.15em] font-medium mb-4",
                  plan.highlight ? "text-white/50" : "text-quaternary"
                )}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[32px] font-semibold tracking-[-0.03em] font-mono-numbers">
                    {plan.price}
                  </span>
                  <span className={cn(
                    "text-[13px]",
                    plan.highlight ? "text-white/40" : "text-quaternary"
                  )}>{plan.period}</span>
                </div>
                <p className={cn(
                  "text-[13px] mb-6",
                  plan.highlight ? "text-white/60" : "text-tertiary"
                )}>{plan.desc}</p>
                <Link
                  href="/pulse/dashboard"
                  className={cn(
                    "w-full inline-flex items-center justify-center h-10 rounded-lg text-[13px] font-medium transition-all duration-300",
                    plan.highlight
                      ? "bg-white text-foreground hover:bg-white/90"
                      : "bg-foreground text-background hover:bg-foreground/90"
                  )}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className={cn(
                      "flex items-center gap-2.5 text-[13px]",
                      plan.highlight ? "text-white/70" : "text-secondary"
                    )}>
                      <Check className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        plan.highlight ? "text-white/50" : "text-pulse"
                      )} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 lg:py-32 px-6 bg-[#FAFAFA]">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <h2 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold tracking-[-0.03em] leading-[1.15] mb-4">
              Ready to see your x402 revenue?
            </h2>
            <p className="text-[15px] text-tertiary mb-8">
              Join the first x402 service providers who actually know what they&apos;re earning.
            </p>
            <WaitlistForm />
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
