"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import {
  ArrowRight,
  Activity,
  BarChart3,
  Users,
  Zap,
  Bell,
  Code2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Revenue Dashboard",
    desc: "Real-time revenue, calls, and trends across all your x402 endpoints.",
  },
  {
    icon: Users,
    title: "Customer Analytics",
    desc: "See which agents pay the most, how often, and what they use.",
  },
  {
    icon: Zap,
    title: "Performance Monitoring",
    desc: "Track latency, error rates, and uptime per endpoint.",
  },
  {
    icon: Code2,
    title: "One-Line Integration",
    desc: "Wrap your handler with withPulse() — analytics starts flowing immediately.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Get notified on revenue spikes, drops, or new high-value customers.",
  },
  {
    icon: Activity,
    title: "Pricing Intelligence",
    desc: "Benchmark your pricing against competing x402 services.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For side projects and early exploration",
    features: ["1 endpoint", "7-day history", "Basic dashboard", "100 events/day"],
    cta: "Get Started",
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
      "Email alerts",
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
      "Dedicated support",
      "SLA guarantee",
      "Volume discounts",
    ],
    cta: "Contact Us",
    highlight: false,
  },
];

export default function PulseLanding() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-dot-grid" />
        <div className="absolute top-20 left-1/3 w-96 h-96 bg-pulse-200/30 rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pulse-200 bg-pulse-50 text-xs text-pulse-600 font-medium mb-6"
          >
            <Activity className="w-3 h-3" />
            Pulse by KyvernLabs
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.1]"
          >
            Real-time revenue
            <br />
            intelligence for{" "}
            <span className="bg-gradient-to-r from-pulse-500 to-pulse-700 bg-clip-text text-transparent">
              x402
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            The Stripe Dashboard for x402. See every payment, every customer,
            every trend — with one line of code.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-8 flex items-center justify-center gap-4"
          >
            <Link
              href="/pulse/dashboard"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-pulse text-white text-sm font-medium hover:bg-pulse-600 ease-premium transition-colors"
            >
              View Live Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pulse/dashboard/setup"
              className="inline-flex items-center h-11 px-6 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 ease-premium transition-colors"
            >
              Setup Guide
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-semibold tracking-tight">
              Everything you need to monetize x402
            </h2>
            <p className="mt-3 text-muted-foreground">
              Comprehensive analytics built specifically for the x402 payment protocol.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.06,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="bg-white rounded-lg border border-border p-5 shadow-premium"
              >
                <feature.icon className="w-5 h-5 text-pulse mb-3" />
                <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-semibold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start free. Upgrade when you need more.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className={cn(
                  "rounded-lg border p-6",
                  plan.highlight
                    ? "border-pulse bg-pulse-50/30 shadow-premium-lg ring-1 ring-pulse/20"
                    : "border-border bg-white shadow-premium"
                )}
              >
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight font-mono-numbers">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                <Link
                  href="/pulse/dashboard"
                  className={cn(
                    "mt-5 w-full inline-flex items-center justify-center h-9 rounded-lg text-sm font-medium transition-colors ease-premium",
                    plan.highlight
                      ? "bg-pulse text-white hover:bg-pulse-600"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-pulse shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
