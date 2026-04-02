"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { DollarSign, Zap, Users, TrendingUp } from "lucide-react";
import { WaitlistForm } from "./waitlist-form";

const STATS = [
  { value: "195+", label: "x402 Services" },
  { value: "$600M+", label: "Annualized Volume" },
  { value: "119M+", label: "Transactions" },
];

function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative mt-16 lg:mt-20 mx-auto max-w-4xl"
    >
      {/* Glow behind the preview */}
      <div className="absolute -inset-4 bg-gradient-to-b from-pulse-100/60 via-pulse-50/30 to-transparent rounded-3xl blur-2xl" />

      {/* Browser chrome */}
      <div className="relative rounded-xl border border-black/[0.08] bg-white shadow-premium-xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-black/[0.05] bg-[#FAFAFA]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-black/[0.08]" />
            <div className="w-2.5 h-2.5 rounded-full bg-black/[0.08]" />
            <div className="w-2.5 h-2.5 rounded-full bg-black/[0.08]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-black/[0.06] text-[11px] text-quaternary font-mono">
              <svg className="w-2.5 h-2.5 text-emerald-500" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
              kyvernlabs.com/pulse/dashboard
            </div>
          </div>
        </div>

        {/* Dashboard content preview */}
        <div className="p-5 lg:p-6 bg-[#F8F8FA]">
          {/* Stat cards row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Revenue", value: "$12,847", delta: "+23.1%", icon: DollarSign, positive: true },
              { label: "API Calls", value: "8,492", delta: "+12.8%", icon: Zap, positive: true },
              { label: "Agents", value: "47", delta: "+5", icon: Users, positive: true },
              { label: "Avg Price", value: "$1.51", delta: "-2.1%", icon: TrendingUp, positive: false },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 + i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                className="bg-white rounded-lg border border-black/[0.05] p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-quaternary font-medium">{card.label}</span>
                  <card.icon className="w-3 h-3 text-quaternary" />
                </div>
                <p className="text-[15px] font-semibold tracking-tight font-mono">{card.value}</p>
                <span className={`text-[10px] font-medium ${card.positive ? "text-emerald-600" : "text-red-500"}`}>
                  {card.delta}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Chart area */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="bg-white rounded-lg border border-black/[0.05] p-4 mb-4"
          >
            <p className="text-[10px] text-quaternary font-medium mb-3">Revenue Over Time</p>
            <svg viewBox="0 0 600 120" className="w-full h-auto">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              <path
                d="M0,90 C50,85 80,70 120,65 C160,60 200,50 240,45 C280,40 320,55 360,40 C400,25 440,30 480,20 C520,15 560,10 600,5"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
              <path
                d="M0,90 C50,85 80,70 120,65 C160,60 200,50 240,45 C280,40 320,55 360,40 C400,25 440,30 480,20 C520,15 560,10 600,5 L600,120 L0,120 Z"
                fill="url(#chartGrad)"
              />
            </svg>
          </motion.div>

          {/* Transaction rows */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.6 }}
            className="bg-white rounded-lg border border-black/[0.05] p-3"
          >
            <p className="text-[10px] text-quaternary font-medium mb-2">Recent Transactions</p>
            {[
              { endpoint: "/api/search", amount: "$0.15", payer: "0x914b...f33F", verified: true },
              { endpoint: "/api/summarize", amount: "$0.25", payer: "0x7a3b...e4f2", verified: true },
              { endpoint: "/api/weather", amount: "$0.05", payer: "0x55c3...592E", verified: true },
            ].map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-black/[0.03] last:border-0">
                <span className="text-[10px] font-mono text-secondary">{tx.endpoint}</span>
                <span className="text-[10px] font-mono font-medium">{tx.amount}</span>
                <span className="text-[10px] font-mono text-quaternary">{tx.payer}</span>
                <span className="inline-flex items-center gap-0.5 text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                  Verified
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative pt-32 pb-12 lg:pt-40 lg:pb-16 px-6 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-fine-grid" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-pulse-100/40 via-transparent to-transparent rounded-full blur-[80px]" />

      <div className="relative max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.06] bg-white text-[11px] tracking-wide font-medium text-tertiary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            Live on Base Sepolia — Real x402 Payments
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-balance"
        >
          The missing business layer
          <br />
          for{" "}
          <span className="bg-gradient-to-r from-blue-600 via-pulse to-indigo-500 bg-clip-text text-transparent">
            x402
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-5 text-center text-[17px] leading-[1.6] text-secondary max-w-xl mx-auto"
        >
          One line of code. Real-time revenue.
          Blockchain-verified. Built for every x402 service provider.
        </motion.p>

        {/* Waitlist CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-8"
        >
          <WaitlistForm />
          <div className="mt-4 flex items-center justify-center gap-5">
            <Link
              href="/pulse/dashboard"
              className="text-[12px] font-medium text-tertiary hover:text-primary transition-colors duration-300"
            >
              View live dashboard →
            </Link>
            <Link
              href="/pulse/dashboard/setup"
              className="text-[12px] font-medium text-tertiary hover:text-primary transition-colors duration-300"
            >
              Setup guide →
            </Link>
          </div>
        </motion.div>

        {/* Live dashboard preview — the "holy shit" factor */}
        <DashboardPreview />

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="mt-12 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-quaternary mb-3">
            Built for the x402 Foundation ecosystem
          </p>
          <div className="flex items-center justify-center gap-8 lg:gap-12 text-quaternary">
            {["Coinbase", "Cloudflare", "Stripe", "Solana", "Google", "Visa"].map((name) => (
              <span key={name} className="text-[13px] font-medium tracking-tight opacity-40 hover:opacity-60 transition-opacity duration-300">
                {name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 2, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-16 flex items-center justify-center gap-12 lg:gap-20"
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl lg:text-3xl font-semibold tracking-tight font-mono-numbers">
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] text-quaternary uppercase tracking-[0.15em] font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
