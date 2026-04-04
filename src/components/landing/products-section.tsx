"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Shield,
  BarChart3,
  Bell,
  Webhook,
  Users,
  Wallet,
  Key,
  Terminal,
  LineChart,
  Sparkles,
} from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* How It Works — 4 steps */
const STEPS = [
  {
    title: "Connect Wallet",
    desc: "Sign in with Ethereum. No email, no password. Your wallet is your identity.",
    icon: Wallet,
  },
  {
    title: "Get your API key",
    desc: "Auto-generated kv_live_ key. Copy and paste into your config.",
    icon: Key,
  },
  {
    title: "Wrap your endpoint",
    desc: "One line: withPulse(withX402(handler, config)). That's the entire integration.",
    icon: Terminal,
  },
  {
    title: "Watch revenue flow",
    desc: "Every payment captured, verified on-chain, and analyzed in real-time.",
    icon: LineChart,
  },
];

/* Features grid — 6 cards, last 4 are Pro */
const FEATURES = [
  {
    icon: Activity,
    title: "Real-Time Analytics",
    desc: "See every payment as it happens. Revenue, calls, latency, errors — no refreshing.",
    pro: false,
  },
  {
    icon: Shield,
    title: "On-Chain Verified",
    desc: "Every transaction linked to a blockchain tx hash. Click through to BaseScan.",
    pro: false,
  },
  {
    icon: BarChart3,
    title: "Pricing Benchmarks",
    desc: "See how your pricing compares to the entire x402 market. Percentile rankings.",
    pro: true,
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Get notified when revenue spikes, drops, or a new high-value agent appears.",
    pro: true,
  },
  {
    icon: Webhook,
    title: "Webhooks & Integrations",
    desc: "Push payment events to Slack, Discord, or any endpoint. HMAC-SHA256 signed.",
    pro: true,
  },
  {
    icon: Users,
    title: "Agent Intelligence",
    desc: "Know your best customers, retention curves, cohort analysis, and growth trends.",
    pro: true,
  },
];

export function ProductsSection() {
  return (
    <>
      {/* How It Works */}
      <section id="products" className="py-28 lg:py-36 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-black/[0.04] to-transparent" />

        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-20"
          >
            <p className="text-[12px] uppercase tracking-[0.2em] font-medium text-quaternary mb-4">
              How it works
            </p>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.04em] leading-[0.95]">
              From zero to revenue dashboard
              <br />
              <span className="text-tertiary">in 47 seconds</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-[40px] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-black/[0.06] to-transparent z-0" />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                transition={{ duration: 0.6, delay: i * 0.1, ease }}
                className="relative z-10 flex flex-col items-center text-center group cursor-default"
              >
                <div className="w-[72px] h-[72px] rounded-2xl bg-white border border-black/[0.05] flex items-center justify-center mb-5 shadow-premium group-hover:shadow-premium-lg transition-shadow duration-300">
                  <step.icon className="w-7 h-7 text-primary group-hover:text-pulse transition-colors duration-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-[15px] font-semibold tracking-tight mb-2">{step.title}</h3>
                <p className="text-[13px] text-secondary leading-relaxed max-w-[240px]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-28 lg:py-36 px-6 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-16"
          >
            <p className="text-[12px] uppercase tracking-[0.2em] font-medium text-quaternary mb-4">
              Features
            </p>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.04em] leading-[0.95]">
              Everything to run a profitable
              <br />
              <span className="text-tertiary">x402 service</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                transition={{ duration: 0.5, delay: i * 0.06, ease }}
                className="bg-white rounded-2xl border border-black/[0.06] p-6 cursor-default hover:border-black/[0.12] hover:shadow-premium-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-secondary" />
                  </div>
                  {feature.pro && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-pulse-50 text-pulse-600 uppercase tracking-wider">
                      <Sparkles className="w-2.5 h-2.5" />
                      Pro
                    </span>
                  )}
                </div>
                <h3 className="text-[14px] font-semibold tracking-tight mb-1.5">{feature.title}</h3>
                <p className="text-[13px] text-tertiary leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
