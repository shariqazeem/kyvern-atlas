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
  Shield,
  Code2,
  Check,
  Key,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Wallet,
    title: "Wallet-Native Auth",
    desc: "SIWE (Sign-In With Ethereum) — no emails, no passwords. Your wallet is your identity. Cryptographically verified.",
  },
  {
    icon: Key,
    title: "Auto API Keys",
    desc: "Connect wallet → get your kv_live_ API key instantly. SHA-256 hashed, shown once. Like Stripe's sk_live_ pattern.",
  },
  {
    icon: BarChart3,
    title: "Revenue Dashboard",
    desc: "Real-time revenue, calls, latency, error rates per endpoint. Your data only — multi-tenant isolation.",
  },
  {
    icon: Users,
    title: "Customer Analytics",
    desc: "See which agent wallets pay you the most, which endpoints they use, first/last seen. On-chain verified.",
  },
  {
    icon: Shield,
    title: "On-Chain Verification",
    desc: "Every payment tracked with blockchain tx hash. Click through to BaseScan. Not analytics — proof.",
  },
  {
    icon: Code2,
    title: "One-Line Middleware",
    desc: "npm install @kyvernlabs/pulse → wrap your handler with withPulse(). Non-blocking, fire-and-forget.",
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
      "1 API key",
      "Full dashboard + intelligence",
      "On-chain verification",
      "3 basic alerts",
    ],
    cta: "Connect Wallet & Start",
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
      "$5,000/month revenue",
      "30-day retention",
      "3 API keys",
      "Pricing benchmarks",
      "10 alerts (all types)",
      "CSV export",
      "Everything in Free",
    ],
    cta: "Start Growth — $19/mo",
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
      "90-day data retention",
      "Up to 10 API keys",
      "Webhooks + Slack/Discord",
      "Cohort analysis",
      "A/B pricing experiments",
      "Historical data import",
      "Priority support",
    ],
    cta: "Upgrade to Pro — $49 USDC",
    href: "/pulse/upgrade",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "High-volume x402 infrastructure",
    features: [
      "Everything in Pro",
      "Unlimited retention",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Contact Us",
    href: "#",
    highlight: false,
  },
];

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
            Pulse v2 — Wallet-native, SIWE-secured, Pro-gated
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
            Connect wallet. Get your API key. Wrap your endpoint.
            See every payment — blockchain-verified, real-time, yours only.
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
              <Wallet className="w-4 h-4" />
              Connect Wallet & Get Your Key
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-[12px] text-quaternary"
          >
            Free tier included. No email required. 12 seconds to your first API key.
          </motion.p>
        </div>
      </section>

      {/* How it works — 4 step visual */}
      <section className="py-24 lg:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-14"
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
              How it works
            </p>
            <h2 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold tracking-[-0.03em] leading-[1.15]">
              From zero to revenue dashboard in{" "}
              <span className="text-pulse">47 seconds</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Connect Wallet", desc: "SIWE sign-in. Your wallet is your account.", icon: Wallet },
              { step: "2", title: "Get API Key", desc: "kv_live_ key auto-generated. Shown once.", icon: Key },
              { step: "3", title: "Wrap Endpoint", desc: "npm install + one line of code.", icon: Code2 },
              { step: "4", title: "See Revenue", desc: "Real-time, on-chain verified, yours only.", icon: BarChart3 },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-center p-5 rounded-xl border border-black/[0.06] bg-white hover:border-black/[0.12] hover:shadow-premium-lg transition-all duration-300"
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
      <section className="py-20 lg:py-24 px-6 bg-[#FAFAFA]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-10"
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
              Integration
            </p>
            <h2 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold tracking-[-0.03em] leading-[1.15]">
              One line. That&apos;s the integration.
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
                  {"\n"}
                  <span className="text-purple-400">import</span>
                  <span className="text-gray-300">{" { "}</span>
                  <span className="text-blue-400">withX402</span>
                  <span className="text-gray-300">{" } "}</span>
                  <span className="text-purple-400">from</span>
                  <span className="text-emerald-400">{" '@x402/next'"}</span>
                  {"\n\n"}
                  <span className="text-gray-500">{"// Every payment → your dashboard. Blockchain-verified."}</span>
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
                  <span className="text-emerald-400">{"'kv_live_your_key_here'"}</span>
                  <span className="text-gray-400">{" }"}</span>
                  {"\n"}
                  <span className="text-gray-400">{")"}</span>
                </code>
              </pre>
            </div>
          </motion.div>
          <p className="mt-4 text-center text-[12px] text-quaternary">
            Works with Next.js, Express, Hono. Your real key auto-populates in the dashboard setup guide.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 lg:py-28 px-6">
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
              Built for x402. Not retrofitted.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
                className="bg-white rounded-xl border border-black/[0.06] p-6 hover:border-black/[0.12] hover:shadow-premium-lg transition-all duration-300"
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

      {/* Pricing */}
      <section id="pricing" className="py-24 lg:py-28 px-6 bg-[#FAFAFA]">
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
              Start free. Pay with x402 when you grow.
            </h2>
            <p className="mt-3 text-[14px] text-tertiary">
              Pro is paid with USDC on Base — the same way your agents pay you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
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
      <section className="py-24 lg:py-28 px-6">
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
              Connect your wallet. Get your key. See every payment.
            </p>
            <WaitlistForm />
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
