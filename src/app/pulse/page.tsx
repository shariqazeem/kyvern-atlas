"use client";

import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { SocialProof } from "@/components/landing/social-proof";
import { RevenueSimulator } from "@/components/landing/revenue-simulator";
import {
  ArrowRight,
  Activity,
  BarChart3,
  Users,
  Shield,
  Code2,
  Check,
  Key,
  Wallet,
  Sparkles,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

// Animated counter that counts up when in view
function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let current = 0;
    const increment = value / 40;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, 30);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// Floating animated dashboard mockup
function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.5, ease }}
      className="relative mx-auto max-w-[800px] mt-12"
    >
      <div className="absolute -inset-8 rounded-3xl bg-gradient-to-b from-pulse/[0.04] via-transparent to-transparent blur-2xl" />
      <div className="relative rounded-xl border border-black/[0.08] bg-white shadow-premium-xl overflow-hidden">
        {/* Browser bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-black/[0.04] bg-[#FAFAFA]">
          <div className="w-2.5 h-2.5 rounded-full bg-black/[0.06]" />
          <div className="w-2.5 h-2.5 rounded-full bg-black/[0.06]" />
          <div className="w-2.5 h-2.5 rounded-full bg-black/[0.06]" />
          <div className="ml-3 flex-1 h-5 rounded bg-black/[0.03] flex items-center px-2">
            <span className="text-[9px] text-quaternary font-mono">kyvernlabs.com/pulse/dashboard</span>
          </div>
        </div>
        {/* Dashboard content */}
        <div className="p-4 space-y-3">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Revenue", value: "$2.44", delta: "+23%" },
              { label: "Transactions", value: "248", delta: "+18%" },
              { label: "Agents", value: "39", delta: "+7" },
              { label: "Avg Price", value: "$0.01", delta: "" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.4, ease }}
                className="rounded-lg border border-black/[0.04] p-2.5"
              >
                <p className="text-[8px] text-quaternary">{stat.label}</p>
                <p className="text-[14px] font-semibold font-mono-numbers mt-0.5">{stat.value}</p>
                {stat.delta && <p className="text-[8px] text-emerald-500 font-medium">{stat.delta}</p>}
              </motion.div>
            ))}
          </div>
          {/* Chart placeholder */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="h-24 rounded-lg bg-gradient-to-t from-pulse-50 to-transparent border border-black/[0.03] flex items-end px-2 pb-1 gap-[3px]"
          >
            {[30, 45, 38, 52, 48, 65, 58, 72, 68, 80, 75, 88, 82, 95].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 1.3 + i * 0.04, duration: 0.4, ease }}
                className="flex-1 bg-pulse-400 rounded-t-sm opacity-60"
              />
            ))}
          </motion.div>
          {/* Transaction rows */}
          <div className="space-y-1">
            {[
              { ep: "/api/stellar/price-oracle", amt: "$0.03", chain: "Stellar", color: "bg-slate-800 text-white" },
              { ep: "/v1/translate", amt: "$0.003", chain: "Base", color: "bg-blue-50 text-blue-600" },
              { ep: "/api/stellar/market-data", amt: "$0.05", chain: "Stellar", color: "bg-slate-800 text-white" },
            ].map((tx, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.6 + i * 0.15, duration: 0.3, ease }}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-slate-50 text-[9px]"
              >
                <span className="font-mono text-secondary">{tx.ep}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-medium ${tx.color}`}>{tx.chain}</span>
                  <span className="font-mono-numbers font-medium">{tx.amt}</span>
                  <span className="text-[7px] text-emerald-500 font-medium px-1 py-0.5 rounded bg-emerald-50">Verified</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const FEATURES = [
  {
    icon: Globe,
    title: "Multi-Chain",
    desc: "Base and Stellar in one dashboard. Every chain x402 supports. One middleware, every network.",
  },
  {
    icon: Shield,
    title: "On-Chain Verified",
    desc: "Every payment has a blockchain tx hash. Click through to BaseScan or StellarChain.io. Not analytics — proof.",
  },
  {
    icon: Sparkles,
    title: "AI Copilot",
    desc: "Ask 'What's my Stellar revenue?' in plain English. Cross-chain queries. Agent workflow analysis.",
  },
  {
    icon: Users,
    title: "Agent Intelligence",
    desc: "See which agents pay you. Personas: Whale, Loyalist, At Risk. Churn prediction. Behavior patterns.",
  },
  {
    icon: BarChart3,
    title: "Revenue Forecast",
    desc: "7-day projection with confidence bands. Know where your revenue is heading before it gets there.",
  },
  {
    icon: Code2,
    title: "One-Line Middleware",
    desc: "npm install @kyvernlabs/pulse. Wrap your handler. Every payment flows into your dashboard. 30 seconds.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Start building. No credit card.",
    features: [
      "5,000 events/day",
      "$100/month revenue tracked",
      "14-day data retention",
      "Full dashboard + intelligence",
      "On-chain verification",
      "3 basic alerts",
    ],
    cta: "Get Started Free",
    href: "/pulse/dashboard",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$19",
    period: "/month",
    desc: "For growing x402 services",
    features: [
      "50,000 events/day",
      "30-day retention",
      "Pricing benchmarks",
      "10 alerts (all types)",
      "CSV export",
      "3 API keys",
    ],
    cta: "Start Growth",
    href: "/pulse/upgrade",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month USDC",
    desc: "For serious x402 providers",
    features: [
      "Unlimited everything",
      "90-day retention",
      "AI Copilot",
      "Webhooks + Slack/Discord",
      "A/B experiments",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    href: "/pulse/upgrade",
    highlight: true,
  },
];

export default function PulseLanding() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero — Big, bold, stops you scrolling */}
      <section className="relative pt-32 pb-4 lg:pt-40 lg:pb-8 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-fine-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-pulse-100/40 via-transparent to-transparent rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-pulse/20 bg-pulse-50 text-[11px] tracking-wide font-medium text-pulse-600 mb-6"
          >
            <Activity className="w-3 h-3" />
            Multi-chain: Base + Stellar — Real-time, on-chain verified
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.04em]"
          >
            Every x402 payment.
            <br />
            <span className="bg-gradient-to-r from-pulse-500 to-indigo-500 bg-clip-text text-transparent">
              Tracked. Verified. Analyzed.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="mt-5 text-[17px] leading-[1.6] text-secondary max-w-xl mx-auto"
          >
            Revenue intelligence for AI agents on Stellar and Base.
            One line of middleware. Blockchain-verified. AI-powered insights.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/pulse/dashboard"
              className="group inline-flex items-center gap-2 h-12 px-7 rounded-xl bg-foreground text-background text-[14px] font-medium hover:bg-foreground/90 transition-colors duration-300 btn-press"
            >
              Start Free — No Email Required
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-xl border border-black/[0.08] text-[14px] font-medium text-secondary hover:bg-slate-50 transition-colors duration-300"
            >
              See How It Works
            </Link>
          </motion.div>

          {/* Social proof line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5 text-[12px] text-quaternary"
          >
            Open source. MIT licensed. 17 MCP tools for AI agents. Published on npm.
          </motion.p>

          {/* Animated dashboard preview */}
          <DashboardMockup />
        </div>
      </section>

      {/* Live ecosystem stats */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              { value: 195, suffix: "+", label: "x402 Services" },
              { value: 24, prefix: "$", suffix: "M+", label: "Monthly Volume" },
              { value: 17, label: "MCP Tools" },
              { value: 2, label: "Chains Supported" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, ease }}
                className="text-center py-4"
              >
                <p className="text-[clamp(1.5rem,4vw,2.25rem)] font-semibold font-mono-numbers tracking-tight">
                  <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="text-[12px] text-quaternary mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 lg:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-14"
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-3">
              How it works
            </p>
            <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-[-0.03em] leading-[1.1]">
              From zero to revenue dashboard
              <br />
              <span className="text-pulse">in 30 seconds</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Sign In", desc: "Email, Google, or wallet. No passwords. 12 seconds.", icon: Wallet },
              { step: "2", title: "Get API Key", desc: "kv_live_ key auto-generated. SHA-256 hashed.", icon: Key },
              { step: "3", title: "Wrap Endpoint", desc: "npm install + one line. That's the integration.", icon: Code2 },
              { step: "4", title: "See Revenue", desc: "Real-time. On-chain verified. Multi-chain.", icon: BarChart3 },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className="text-center p-5 rounded-xl border border-black/[0.06] bg-white card-hover"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-[18px] h-[18px] text-secondary" />
                </div>
                <div className="text-[10px] font-bold text-pulse uppercase tracking-wider mb-1">
                  Step {item.step}
                </div>
                <h3 className="text-[14px] font-semibold tracking-tight mb-1">{item.title}</h3>
                <p className="text-[12px] text-tertiary">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Code block */}
      <section className="py-20 lg:py-24 px-4 sm:px-6 bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-10"
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-3">
              Integration
            </p>
            <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-[-0.03em] leading-[1.1]">
              One line. That&apos;s it.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
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
                  <span className="text-blue-400">withPulse</span>
                  <span className="text-gray-300">{" } "}</span>
                  <span className="text-purple-400">from</span>
                  <span className="text-emerald-400">{" '@kyvernlabs/pulse'"}</span>
                  {"\n\n"}
                  <span className="text-gray-500">{"// Every x402 payment → your dashboard"}</span>
                  {"\n"}
                  <span className="text-gray-500">{"// Works on Stellar, Base, and every x402 chain"}</span>
                  {"\n"}
                  <span className="text-purple-400">export default</span>
                  <span className="text-gray-300">{" "}</span>
                  <span className="text-blue-400">withPulse</span>
                  <span className="text-gray-400">{"(handler, { "}</span>
                  <span className="text-orange-300">apiKey</span>
                  <span className="text-gray-400">{": "}</span>
                  <span className="text-emerald-400">{"'kv_live_...'"}</span>
                  <span className="text-gray-400">{" })"}</span>
                </code>
              </pre>
            </div>
          </motion.div>
          <p className="mt-4 text-center text-[12px] text-quaternary">
            Works with Next.js, Express, Hono, Cloudflare Workers — any framework. Your key auto-populates in the setup guide.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 lg:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-14"
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-3">
              Features
            </p>
            <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-[-0.03em] leading-[1.1]">
              Built for the agent economy.
              <br />
              Not retrofitted.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease }}
                className="bg-white rounded-xl border border-black/[0.06] p-6 card-hover"
              >
                <div className="w-9 h-9 rounded-lg bg-[#FAFAFA] flex items-center justify-center mb-4">
                  <feature.icon className="w-[18px] h-[18px] text-secondary" />
                </div>
                <h3 className="text-[14px] font-semibold tracking-tight mb-1.5">{feature.title}</h3>
                <p className="text-[13px] text-tertiary leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SocialProof />

      <RevenueSimulator />

      {/* Pricing */}
      <section id="pricing" className="py-24 lg:py-28 px-4 sm:px-6 bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-14"
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-3">
              Pricing
            </p>
            <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-[-0.03em] leading-[1.1]">
              Start free. Scale with your revenue.
            </h2>
            <p className="mt-3 text-[14px] text-tertiary">
              Pay with USDC on Base — from your connected wallet or any external one.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.06, ease }}
                className={cn(
                  "rounded-xl border p-6 lg:p-7 transition-all duration-300",
                  plan.highlight
                    ? "border-foreground bg-foreground text-background shadow-premium-xl"
                    : "border-black/[0.06] bg-white card-hover"
                )}
              >
                <p className={cn(
                  "text-[11px] uppercase tracking-[0.15em] font-medium mb-4",
                  plan.highlight ? "text-white/50" : "text-quaternary"
                )}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[32px] font-semibold tracking-[-0.03em] font-mono-numbers">
                    {plan.price}
                  </span>
                  <span className={cn("text-[13px]", plan.highlight ? "text-white/40" : "text-quaternary")}>
                    {plan.period}
                  </span>
                </div>
                <p className={cn("text-[13px] mb-6", plan.highlight ? "text-white/60" : "text-tertiary")}>
                  {plan.desc}
                </p>
                <Link
                  href={plan.href}
                  className={cn(
                    "w-full inline-flex items-center justify-center h-10 rounded-lg text-[13px] font-medium transition-all duration-300 btn-press",
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
                      <Check className={cn("w-3.5 h-3.5 shrink-0", plan.highlight ? "text-white/50" : "text-pulse")} />
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
      <section className="py-24 lg:py-28 px-4 sm:px-6">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
          >
            <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-[-0.03em] leading-[1.1] mb-4">
              Your agents are earning.
              <br />
              <span className="text-pulse">Start tracking.</span>
            </h2>
            <p className="text-[15px] text-tertiary mb-8">
              One middleware. Every chain. Every payment.
            </p>
            <Link
              href="/pulse/dashboard"
              className="group inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-foreground text-background text-[14px] font-medium hover:bg-foreground/90 transition-colors duration-300 btn-press"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <p className="mt-4 text-[12px] text-quaternary">
              No email required. No credit card. Start in 30 seconds.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
