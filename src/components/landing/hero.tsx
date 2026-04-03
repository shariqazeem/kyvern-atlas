"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { DollarSign, Zap, Users, TrendingUp, Wallet, ArrowRight } from "lucide-react";
import { WaitlistForm } from "./waitlist-form";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* Ambient background — barely visible but creates depth */
function AmbientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary radial glow */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[1100px] h-[800px] rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.04) 40%, transparent 70%)" }}
      />
      {/* Secondary accent */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], x: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[5%] right-[10%] w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
      />
      {/* Fine grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(0,0,0,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.018) 1px, transparent 1px)",
        backgroundSize: "80px 80px"
      }} />
    </div>
  );
}

/* Live dashboard preview — the centerpiece */
function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.4, delay: 0.7, ease }}
      className="relative mt-20 lg:mt-24 mx-auto max-w-[960px]"
    >
      {/* Outer glow */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-pulse/[0.12] via-transparent to-transparent" />
      <div className="absolute -inset-12 rounded-3xl bg-gradient-to-b from-pulse/[0.04] via-transparent to-transparent blur-2xl" />

      {/* Browser chrome */}
      <div className="relative rounded-2xl border border-black/[0.08] bg-white overflow-hidden" style={{ boxShadow: "0 25px 80px -12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02)" }}>
        {/* Top bar */}
        <div className="flex items-center px-4 py-3 border-b border-black/[0.04] bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-1 rounded-lg bg-white border border-black/[0.05] text-[11px] text-quaternary font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              kyvernlabs.com/pulse/dashboard
            </div>
          </div>
          <div className="w-[52px]" /> {/* Spacer for symmetry */}
        </div>

        {/* Dashboard body */}
        <div className="p-6 lg:p-8 bg-[#F8F9FA]">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: "Revenue", value: "$12,847", delta: "+23.1%", icon: DollarSign },
              { label: "API Calls", value: "8,492", delta: "+12.8%", icon: Zap },
              { label: "Agents", value: "47", delta: "+5", icon: Users },
              { label: "Avg Price", value: "$1.51", delta: "-2.1%", icon: TrendingUp, negative: true },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 + i * 0.12, ease }}
                className="bg-white rounded-xl border border-black/[0.04] p-4"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-quaternary font-medium uppercase tracking-wider">{card.label}</span>
                  <card.icon className="w-3.5 h-3.5 text-black/[0.12]" />
                </div>
                <motion.p
                  className="text-[20px] font-bold tracking-[-0.02em] font-mono"
                  animate={card.label === "Revenue" ? { opacity: [1, 0.7, 1] } : {}}
                  transition={card.label === "Revenue" ? { duration: 3, repeat: Infinity, repeatDelay: 5 } : {}}
                >
                  {card.value}
                </motion.p>
                <span className={`text-[10px] font-semibold ${card.negative ? "text-red-500" : "text-emerald-600"}`}>
                  {card.delta}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Revenue chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.8 }}
            className="bg-white rounded-xl border border-black/[0.04] p-5"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-quaternary font-medium uppercase tracking-wider">Revenue Over Time</span>
              <div className="flex items-center gap-1">
                {["24h", "7d", "30d"].map((r) => (
                  <span key={r} className={`text-[10px] px-2.5 py-1 rounded-md font-medium ${r === "7d" ? "bg-[#F0F0F0] text-primary" : "text-quaternary"}`}>{r}</span>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 800 130" className="w-full h-auto">
              <defs>
                <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d="M0,100 C50,95 90,75 140,70 C190,65 230,55 290,48 C350,41 390,58 440,42 C490,26 540,32 610,22 C660,16 720,11 800,5"
                fill="none" stroke="#3b82f6" strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, delay: 2, ease: "easeOut" }}
              />
              <path
                d="M0,100 C50,95 90,75 140,70 C190,65 230,55 290,48 C350,41 390,58 440,42 C490,26 540,32 610,22 C660,16 720,11 800,5 L800,130 L0,130 Z"
                fill="url(#heroGrad)"
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
    <section className="relative pt-28 pb-12 lg:pt-36 lg:pb-16 px-6 overflow-hidden">
      <AmbientBackground />

      <div className="relative max-w-6xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-black/[0.06] bg-white/90 backdrop-blur-sm text-[11px] font-medium text-secondary shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Pulse v2 &middot; Live &middot; SIWE + kv_live_ keys &middot; First 50 get Pro free
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease }}
          className="text-center text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.05em]"
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
          transition={{ duration: 0.8, delay: 0.25, ease }}
          className="mt-7 text-center text-[clamp(1rem,2vw,1.25rem)] leading-[1.6] text-secondary max-w-[640px] mx-auto font-normal"
        >
          Wallet-native analytics. Real-time revenue. On-chain verified.
          One line of code turns any x402 endpoint into a real company.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="/pulse/dashboard"
            className="group relative inline-flex items-center gap-2.5 h-12 px-7 rounded-xl bg-foreground text-background text-[14px] font-semibold hover:bg-foreground/90 transition-all duration-300"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.08)" }}
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet & Get Your Key
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/pulse"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-xl border border-black/[0.08] text-[14px] font-medium text-secondary hover:text-primary hover:border-black/[0.16] transition-all duration-300"
          >
            See how Pulse works
          </Link>
        </motion.div>

        {/* Waitlist below CTAs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-6"
        >
          <WaitlistForm />
        </motion.div>

        {/* Dashboard preview */}
        <DashboardPreview />

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.4 }}
          className="mt-20 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] font-medium text-quaternary mb-5">
            Trusted by the companies that launched x402
          </p>
          <div className="flex items-center justify-center flex-wrap gap-x-10 gap-y-3 lg:gap-x-14">
            {["Coinbase", "Cloudflare", "Stripe", "Google", "Visa", "Solana", "Mastercard", "Amazon"].map((name) => (
              <motion.span
                key={name}
                whileHover={{ opacity: 0.4 }}
                className="text-[15px] font-semibold tracking-tight text-black/[0.12] transition-opacity duration-500 cursor-default"
              >
                {name}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.6, ease }}
          className="mt-20 pb-4"
        >
          <div className="flex items-center justify-center gap-1">
            {[
              { value: "195+", label: "x402 Services" },
              { value: "$600M+", label: "Annualized Volume" },
              { value: "119M+", label: "Transactions" },
            ].map((stat, i) => (
              <div key={i} className="flex-1 max-w-[220px] text-center py-6">
                <p className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold tracking-[-0.03em] font-mono-numbers">
                  {stat.value}
                </p>
                <p className="mt-2 text-[11px] text-quaternary uppercase tracking-[0.2em] font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
