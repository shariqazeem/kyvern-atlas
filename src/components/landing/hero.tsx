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

/* Animated network visualization — represents x402 payment flows */
function NetworkVisualization() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large gradient orb — the focal point */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full"
        style={{
          background: "radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)",
        }}
      />

      {/* Secondary orb */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.35, 0.2],
          x: [0, 30, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] right-[15%] w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Animated horizontal lines — representing payment flows */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <defs>
          <linearGradient id="flowLine1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(59,130,246,0)" />
            <stop offset="50%" stopColor="rgba(59,130,246,0.15)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </linearGradient>
          <linearGradient id="flowLine2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(99,102,241,0)" />
            <stop offset="50%" stopColor="rgba(99,102,241,0.1)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </linearGradient>
        </defs>
        {/* Horizontal flow lines */}
        {[150, 300, 450, 550, 650].map((y, i) => (
          <motion.line
            key={i}
            x1="0" y1={y} x2="1200" y2={y + (i % 2 === 0 ? 20 : -20)}
            stroke={`url(#flowLine${(i % 2) + 1})`}
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2 + i * 0.5, delay: i * 0.3, ease: "easeOut" }}
          />
        ))}
        {/* Subtle grid dots */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.circle
            key={`dot-${i}`}
            cx={80 + (i % 5) * 260}
            cy={200 + Math.floor(i / 5) * 200}
            r="1.5"
            fill="rgba(59,130,246,0.2)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0, 1, 0] }}
            transition={{
              duration: 3,
              delay: i * 0.4,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
        ))}
      </svg>

      {/* Fine grid overlay */}
      <div className="absolute inset-0 bg-fine-grid opacity-60" />
    </div>
  );
}

function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.2, delay: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative mt-16 lg:mt-20 mx-auto max-w-4xl"
    >
      {/* Strong glow */}
      <div className="absolute -inset-8 bg-gradient-to-b from-pulse/[0.08] via-pulse/[0.04] to-transparent rounded-3xl blur-3xl" />
      <div className="absolute -inset-4 bg-gradient-to-b from-white/80 via-transparent to-transparent rounded-3xl" />

      {/* Browser chrome */}
      <div className="relative rounded-2xl border border-black/[0.1] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.05] bg-[#FAFAFA]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-white border border-black/[0.06] text-[11px] text-quaternary font-mono">
              <svg className="w-2.5 h-2.5 text-emerald-500" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="5"/></svg>
              kyvernlabs.com/pulse/dashboard
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-6 lg:p-8 bg-[#F8F9FA]">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: "Revenue", value: "$12,847", delta: "+23.1%", icon: DollarSign },
              { label: "API Calls", value: "8,492", delta: "+12.8%", icon: Zap },
              { label: "Agents", value: "47", delta: "+5", icon: Users },
              { label: "Avg Price", value: "$1.51", delta: "-2.1%", icon: TrendingUp },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.2 + i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                className="bg-white rounded-xl border border-black/[0.05] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-quaternary font-medium">{card.label}</span>
                  <card.icon className="w-3.5 h-3.5 text-quaternary" />
                </div>
                <p className="text-[18px] font-semibold tracking-tight font-mono">{card.value}</p>
                <span className="text-[11px] font-medium text-emerald-600">{card.delta}</span>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.6 }}
            className="bg-white rounded-xl border border-black/[0.05] p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-quaternary font-medium">Revenue Over Time</span>
              <div className="flex items-center gap-1">
                {["24h", "7d", "30d"].map((r) => (
                  <span key={r} className={`text-[10px] px-2 py-0.5 rounded ${r === "7d" ? "bg-[#F0F0F0] text-primary font-medium" : "text-quaternary"}`}>{r}</span>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 700 120" className="w-full h-auto">
              <defs>
                <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              <motion.path
                d="M0,90 C40,85 80,70 120,65 C160,60 200,50 250,45 C300,40 340,55 380,40 C420,25 460,30 520,20 C560,15 620,10 700,5"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1.8, ease: "easeOut" }}
              />
              <path
                d="M0,90 C40,85 80,70 120,65 C160,60 200,50 250,45 C300,40 340,55 380,40 C420,25 460,30 520,20 C560,15 620,10 700,5 L700,120 L0,120 Z"
                fill="url(#heroChartGrad)"
              />
            </svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative pt-28 pb-8 lg:pt-36 lg:pb-12 px-6 overflow-hidden min-h-[90vh] flex flex-col justify-center">
      <NetworkVisualization />

      <div className="relative max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-black/[0.06] bg-white/80 backdrop-blur-sm text-[11px] tracking-wide font-medium text-tertiary shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live on Base — Real x402 Payments Captured
          </div>
        </motion.div>

        {/* Headline — massive, confident */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center text-[clamp(3rem,7vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.045em] text-balance"
        >
          The business layer
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-pulse to-indigo-500 bg-clip-text text-transparent">
            for x402
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-6 text-center text-[18px] leading-[1.6] text-secondary max-w-2xl mx-auto"
        >
          Revenue analytics, wallet-native auth, and on-chain verification
          for every x402 service provider. Connect wallet. Get your key.
          See every payment.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-10"
        >
          <WaitlistForm />
          <div className="mt-4 flex items-center justify-center gap-6">
            <Link
              href="/pulse/dashboard"
              className="text-[13px] font-medium text-tertiary hover:text-primary transition-colors duration-300 underline underline-offset-4 decoration-black/[0.1] hover:decoration-black/[0.3]"
            >
              Connect wallet & get your key
            </Link>
            <Link
              href="/pulse"
              className="text-[13px] font-medium text-tertiary hover:text-primary transition-colors duration-300 underline underline-offset-4 decoration-black/[0.1] hover:decoration-black/[0.3]"
            >
              See how Pulse works
            </Link>
          </div>
        </motion.div>

        {/* Dashboard preview */}
        <DashboardPreview />

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2 }}
          className="mt-16 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] font-medium text-quaternary mb-4">
            Built for the x402 Foundation ecosystem
          </p>
          <div className="flex items-center justify-center flex-wrap gap-x-10 gap-y-2 lg:gap-x-14">
            {["Coinbase", "Cloudflare", "Stripe", "Google", "Visa", "Solana", "Mastercard"].map((name) => (
              <span key={name} className="text-[14px] font-semibold tracking-tight text-black/[0.15] hover:text-black/[0.3] transition-colors duration-500">
                {name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 2.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-16 pb-8 flex items-center justify-center gap-16 lg:gap-24"
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl lg:text-4xl font-bold tracking-[-0.03em] font-mono-numbers">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[11px] text-quaternary uppercase tracking-[0.2em] font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
