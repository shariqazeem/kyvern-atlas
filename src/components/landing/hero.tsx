"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { DollarSign, Zap, Users, TrendingUp, ArrowRight, Terminal, X } from "lucide-react";
import { useState } from "react";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* Infinite scrolling logo carousel — like Helius/Stripe */
function LogoCarousel() {
  const logos = ["Coinbase", "Cloudflare", "Stripe", "Google", "Visa", "Solana", "Mastercard", "Amazon", "Microsoft", "Shopify"];
  const doubled = [...logos, ...logos]; // duplicate for seamless loop

  return (
    <div className="relative overflow-hidden py-8">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />

      <motion.div
        animate={{ x: [0, -1600] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex items-center gap-16 whitespace-nowrap"
      >
        {doubled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="text-[16px] font-semibold tracking-tight text-black/[0.1] select-none flex-shrink-0"
          >
            {name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* Live dashboard preview */
function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, delay: 0.6, ease }}
      className="relative mx-auto max-w-[1000px]"
    >
      {/* Glow layers */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-black/[0.04] via-transparent to-transparent" />
      <div className="absolute -inset-16 rounded-3xl bg-gradient-to-b from-pulse/[0.03] via-transparent to-transparent blur-2xl" />

      {/* Browser */}
      <div className="relative rounded-2xl border border-black/[0.08] bg-white overflow-hidden" style={{ boxShadow: "0 30px 100px -20px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)" }}>
        {/* Chrome */}
        <div className="flex items-center px-5 py-3.5 border-b border-black/[0.04] bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white border border-black/[0.05] text-[11px] text-quaternary font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              kyvernlabs.com/pulse/dashboard
            </div>
          </div>
          <div className="w-[52px]" />
        </div>

        {/* Dashboard */}
        <div className="p-8 lg:p-10 bg-[#F8F9FA]">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Revenue", value: "$12,847", delta: "+23.1%", icon: DollarSign, pulse: true },
              { label: "API Calls", value: "8,492", delta: "+12.8%", icon: Zap },
              { label: "Agents", value: "47", delta: "+5", icon: Users },
              { label: "Avg Price", value: "$1.51", delta: "-2.1%", icon: TrendingUp, neg: true },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 + i * 0.12, ease }}
                className="bg-white rounded-xl border border-black/[0.04] p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-quaternary font-medium uppercase tracking-[0.1em]">{card.label}</span>
                  <card.icon className="w-3.5 h-3.5 text-black/[0.1]" />
                </div>
                <motion.p
                  className="text-[22px] font-bold tracking-[-0.02em] font-mono"
                  animate={card.pulse ? { opacity: [1, 0.6, 1] } : {}}
                  transition={card.pulse ? { duration: 2, repeat: Infinity, repeatDelay: 6 } : {}}
                >
                  {card.value}
                </motion.p>
                <span className={`text-[10px] font-semibold ${card.neg ? "text-red-500" : "text-emerald-600"}`}>
                  {card.delta}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.6 }}
            className="bg-white rounded-xl border border-black/[0.04] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-quaternary font-medium uppercase tracking-[0.1em]">Revenue Over Time</span>
              <div className="flex items-center gap-1">
                {["24h", "7d", "30d"].map((r) => (
                  <span key={r} className={`text-[10px] px-2.5 py-1 rounded-lg font-medium ${r === "7d" ? "bg-[#F0F0F0] text-primary" : "text-quaternary"}`}>{r}</span>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 900 120" className="w-full h-auto">
              <defs>
                <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d="M0,95 C60,90 100,72 160,68 C220,64 260,52 330,46 C400,40 440,56 500,40 C560,24 620,30 700,18 C760,12 820,8 900,3"
                fill="none" stroke="#3b82f6" strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.5, delay: 1.8, ease: "easeOut" }}
              />
              <path d="M0,95 C60,90 100,72 160,68 C220,64 260,52 330,46 C400,40 440,56 500,40 C560,24 620,30 700,18 C760,12 820,8 900,3 L900,120 L0,120 Z" fill="url(#hGrad)" />
            </svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* Integration demo modal */
function IntegrationDemo({ onClose }: { onClose: () => void }) {
  const steps = [
    { delay: 0.3, text: "$ npm install @kyvernlabs/pulse", cls: "text-white/70" },
    { delay: 1.0, text: "added 1 package in 0.8s", cls: "text-emerald-400/70" },
    { delay: 1.8, text: "", cls: "" },
    { delay: 2.0, text: "// route.ts — wrap your x402 handler", cls: "text-gray-500" },
    { delay: 2.5, text: "import { withPulse } from '@kyvernlabs/pulse'", cls: "text-purple-300" },
    { delay: 3.0, text: "import { withX402 } from '@x402/next'", cls: "text-purple-300" },
    { delay: 3.5, text: "", cls: "" },
    { delay: 3.8, text: "export const GET = withPulse(", cls: "text-blue-300" },
    { delay: 4.2, text: "  withX402(handler, config, server),", cls: "text-gray-400" },
    { delay: 4.6, text: "  { apiKey: 'kv_live_a8Bx...' }", cls: "text-emerald-300" },
    { delay: 5.0, text: ")", cls: "text-blue-300" },
    { delay: 5.5, text: "", cls: "" },
    { delay: 5.8, text: "$ curl https://your-api.com/endpoint", cls: "text-white/70" },
    { delay: 6.5, text: "→ 402 Payment Required", cls: "text-yellow-400/80" },
    { delay: 7.2, text: "→ Agent pays $0.01 USDC on Base...", cls: "text-yellow-400/80" },
    { delay: 8.0, text: "→ 200 OK • tx: 0x39fee...ddc05e", cls: "text-emerald-400" },
    { delay: 8.8, text: "", cls: "" },
    { delay: 9.0, text: "✓ Payment captured in Pulse dashboard", cls: "text-emerald-400 font-semibold" },
    { delay: 9.5, text: "✓ Payer: 0x914b...f33F • $0.01 • Verified on BaseScan", cls: "text-emerald-400/80" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-3xl bg-[#09090B] rounded-2xl overflow-hidden shadow-2xl z-10 border border-white/[0.08]"
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors z-20">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-white/[0.06]">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          <span className="ml-3 text-[11px] text-white/20 font-mono">Integration Demo — Live</span>
        </div>
        <div className="p-6 space-y-1 font-mono text-[13px] leading-[1.8] max-h-[70vh] overflow-y-auto">
          {steps.map((line, i) => (
            <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: line.delay, duration: 0.3 }} className={line.cls || "h-4"}>
              {line.text}
            </motion.p>
          ))}
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ delay: 10, duration: 0.8, repeat: Infinity }} className="inline-block w-2 h-4 bg-white/40 mt-2" />
        </div>
      </motion.div>
    </div>
  );
}

export function Hero() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <section className="relative pt-24 lg:pt-32 px-6 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.45, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[1100px] h-[800px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, rgba(99,102,241,0.03) 40%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-black/[0.05] bg-white/90 backdrop-blur text-[11px] font-medium text-secondary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Pulse v2 is live — SIWE auth, kv_live_ keys, on-chain verified
          </div>
        </motion.div>

        {/* Headline — massive, confident */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.08, ease }}
          className="text-center text-[clamp(3rem,8vw,6rem)] font-bold leading-[0.9] tracking-[-0.05em]"
        >
          The business layer
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-pulse to-indigo-500 bg-clip-text text-transparent">
            for x402
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease }}
          className="mt-8 text-center text-[clamp(1.05rem,2vw,1.3rem)] leading-[1.55] text-secondary max-w-[580px] mx-auto"
        >
          Wallet-native analytics. Real-time revenue. On-chain verified.
          One line of code turns any x402 endpoint into a real company.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="/pulse/dashboard"
            className="group inline-flex items-center gap-2.5 h-[52px] px-8 rounded-xl bg-foreground text-background text-[15px] font-semibold hover:bg-foreground/90 transition-all duration-300"
            style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)" }}
          >
            Start Free
            <ArrowRight className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <button
            onClick={() => setShowDemo(true)}
            className="group inline-flex items-center gap-2 h-[52px] px-8 rounded-xl border border-black/[0.08] text-[15px] font-medium text-secondary hover:text-primary hover:border-black/[0.16] transition-all duration-300 bg-white"
          >
            <Terminal className="w-[18px] h-[18px]" />
            See the integration live
          </button>
        </motion.div>

        {/* Dashboard preview — the centerpiece */}
        <div className="mt-20 lg:mt-24">
          <DashboardPreview />
        </div>

        {/* Logo carousel — auto-scrolling like Helius */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.2 }}
          className="mt-20"
        >
          <p className="text-center text-[11px] uppercase tracking-[0.25em] font-medium text-quaternary mb-2">
            Built for the x402 Foundation ecosystem
          </p>
          <LogoCarousel />
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.4, ease }}
          className="mt-8 mb-8"
        >
          <div className="max-w-3xl mx-auto grid grid-cols-3 divide-x divide-black/[0.06]">
            {[
              { value: "195+", label: "x402 Services" },
              { value: "$600M+", label: "Annualized Volume" },
              { value: "119M+", label: "Transactions" },
            ].map((stat) => (
              <div key={stat.label} className="text-center py-8">
                <p className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em] font-mono-numbers">
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

      {/* Integration demo modal */}
      {showDemo && <IntegrationDemo onClose={() => setShowDemo(false)} />}
    </section>
  );
}
