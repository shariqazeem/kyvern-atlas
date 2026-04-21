"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Terminal, X, DollarSign, Zap, Users, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ── Animated counter (EarnFlow-grade) ── */
function AnimatedNumber({ value, prefix = "", suffix = "", delay = 0 }: { value: number; prefix?: string; suffix?: string; delay?: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => {
    if (v >= 1000000) return `${prefix}${(v / 1000000).toFixed(0)}M${suffix}`;
    if (v >= 1000) return `${prefix}${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k${suffix}`;
    return `${prefix}${v.toFixed(v < 100 ? 2 : 0)}${suffix}`;
  });
  const [text, setText] = useState(`${prefix}0${suffix}`);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(mv, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [mv, value, delay]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setText(v));
    return unsubscribe;
  }, [display]);

  return <span className="font-mono-numbers">{text}</span>;
}

/* ── Word-by-word reveal (EarnFlow-grade) ── */
function WordReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <motion.span
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: delay } },
      }}
      className={className}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 20, filter: "blur(12px)" },
            show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease } },
          }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ── Logo carousel ── */
function LogoCarousel() {
  const logos = [
    "Coinbase", "Stripe", "Google", "Visa", "Solana",
    "Mastercard", "Amazon", "Microsoft", "Shopify", "Cloudflare",
  ];
  const doubled = [...logos, ...logos];

  return (
    <div className="relative overflow-hidden py-6">
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[var(--background)] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[var(--background)] to-transparent z-10" />
      <div className="flex items-center gap-16 whitespace-nowrap animate-scroll-x">
        {doubled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="text-[15px] font-semibold tracking-tight text-[var(--text-quaternary)] select-none flex-shrink-0"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Live dashboard preview ── */
function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto max-w-[1000px]"
    >
      {/* Browser frame */}
      <div className="relative card-elevated overflow-hidden">
        {/* Chrome bar */}
        <div className="flex items-center px-5 py-3.5 border-b border-[var(--border-subtle)]" style={{ background: "var(--surface-2)" }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
            <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-[10px] bg-[var(--surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-tertiary)] font-mono">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              kyvernlabs.com/pulse/dashboard
            </div>
          </div>
          <div className="w-[52px]" />
        </div>

        {/* Dashboard content */}
        <div className="p-6 lg:p-8" style={{ background: "var(--background)" }}>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Revenue", value: "$24,847", delta: "+23.1%", icon: DollarSign, positive: true },
              { label: "API Calls", value: "18,492", delta: "+31.8%", icon: Zap, positive: true },
              { label: "AI Agents", value: "142", delta: "+12", icon: Users, positive: true },
              { label: "Avg Price", value: "$1.34", delta: "+4.2%", icon: TrendingUp, positive: true },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.2 + i * 0.1, ease }}
                className="card p-4"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="section-label text-[9px]">{card.label}</span>
                  <card.icon className="w-3.5 h-3.5 text-[var(--text-quaternary)]" />
                </div>
                <p className="text-[20px] font-bold tracking-[-0.02em] font-mono-numbers">
                  {card.value}
                </p>
                <span className="text-[10px] font-semibold text-[var(--success)]">
                  {card.delta}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Revenue chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.8 }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="section-label text-[9px]">Revenue Over Time</span>
              <div className="flex items-center gap-1">
                {["24h", "7d", "30d"].map((r) => (
                  <span
                    key={r}
                    className={`text-[10px] px-2.5 py-1 rounded-[8px] font-medium transition-colors ${
                      r === "7d"
                        ? "bg-[var(--surface-2)] text-[var(--text-primary)]"
                        : "text-[var(--text-quaternary)]"
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 900 100" className="w-full h-auto">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,80 C60,75 100,60 160,55 C220,50 260,40 330,35 C400,30 440,45 500,30 C560,15 620,20 700,12 C760,8 820,5 900,2"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M0,80 C60,75 100,60 160,55 C220,50 260,40 330,35 C400,30 440,45 500,30 C560,15 620,20 700,12 C760,8 820,5 900,2 L900,100 L0,100 Z"
                fill="url(#chartGrad)"
              />
            </svg>
          </motion.div>

          {/* Live transactions feed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 2.2 }}
            className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {[
              { ep: "/api/search", agent: "0x914b...f33F", amount: "$0.15", chain: "Solana", time: "2s ago" },
              { ep: "/api/classify", agent: "0x7c2a...e91A", amount: "$0.08", chain: "Solana", time: "5s ago" },
              { ep: "/api/weather", agent: "0xd3f1...a7B2", amount: "$0.03", chain: "Solana", time: "12s ago" },
            ].map((tx, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 2.4 + i * 0.15, ease }}
                className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] bg-[var(--surface)]"
                style={{ border: "0.5px solid var(--border-subtle)" }}
              >
                <div>
                  <p className="text-[11px] font-mono font-semibold text-[var(--text-primary)]">{tx.ep}</p>
                  <p className="text-[9px] font-mono text-[var(--text-quaternary)]">{tx.agent}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-mono font-bold text-[var(--text-primary)]">{tx.amount}</p>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--solana)]" />
                    <span className="text-[8px] text-[var(--text-quaternary)]">{tx.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Integration demo modal ── */
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
    { delay: 6.5, text: "\u2192 402 Payment Required", cls: "text-yellow-400/80" },
    { delay: 7.2, text: "\u2192 Agent pays $0.01 USDC on Solana...", cls: "text-yellow-400/80" },
    { delay: 8.0, text: "\u2192 200 OK \u2022 tx: 4sGjM...xWp9K (Solscan)", cls: "text-emerald-400" },
    { delay: 8.8, text: "", cls: "" },
    { delay: 9.0, text: "\u2713 Payment captured in Pulse dashboard", cls: "text-emerald-400 font-semibold" },
    { delay: 9.5, text: "\u2713 Payer: 7nYk...3Fz2 \u2022 $0.01 USDC-SPL \u2022 Verified on-chain", cls: "text-emerald-400/80" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease }}
        className="relative w-full max-w-3xl bg-[#09090B] overflow-hidden z-10"
        style={{ borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors z-20"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-white/[0.06]">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          <span className="ml-3 text-[11px] text-white/20 font-mono">Integration Demo</span>
        </div>
        <div className="p-6 space-y-1 font-mono text-[13px] leading-[1.8] max-h-[70vh] overflow-y-auto">
          {steps.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: line.delay, duration: 0.3 }}
              className={line.cls || "h-4"}
            >
              {line.text}
            </motion.p>
          ))}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ delay: 10, duration: 0.8, repeat: Infinity }}
            className="inline-block w-2 h-4 bg-white/40 mt-2"
          />
        </div>
      </motion.div>
    </div>
  );
}

/* ── HERO SECTION ── */
export function Hero() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <section className="relative pt-28 lg:pt-36 px-6 overflow-hidden">
      {/* Subtle dot grid */}
      <div className="absolute inset-0 bg-dot-grid pointer-events-none opacity-40" />

      <div className="relative max-w-6xl mx-auto">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="flex justify-center mb-8"
        >
          <div className="relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[var(--surface)] shadow-premium text-[12px] font-medium text-[var(--text-secondary)] overflow-hidden">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--solana)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--solana)]" />
            </span>
            Built for the Solana Frontier Hackathon
            <span className="absolute inset-0 animate-shimmer-badge pointer-events-none" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(153,69,255,0.06) 50%, transparent 100%)" }} />
          </div>
        </motion.div>

        {/* Headline */}
        <h1 className="text-center text-[clamp(2.5rem,7.5vw,5.5rem)] font-bold leading-[0.92] tracking-[-0.04em]">
          <WordReveal text="The business OS" delay={0.15} />
          <br />
          <span className="text-[var(--text-tertiary)]">
            <WordReveal text="for x402" delay={0.55} />
          </span>
        </h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease }}
          className="mt-7 text-center text-[clamp(1rem,2vw,1.25rem)] leading-[1.6] text-[var(--text-secondary)] max-w-[560px] mx-auto"
        >
          Launch, manage, and scale AI agent APIs on Solana.
          One line of code. Real-time revenue intelligence.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1, ease }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link href="/pulse/dashboard" className="btn-primary">
            Start Free
            <ArrowRight className="w-[18px] h-[18px]" />
          </Link>
          <button onClick={() => setShowDemo(true)} className="btn-secondary">
            <Terminal className="w-[18px] h-[18px]" />
            See it in action
          </button>
        </motion.div>

        {/* Dashboard preview */}
        <div className="mt-16 lg:mt-20">
          <DashboardPreview />
        </div>

        {/* Logo carousel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2.8 }}
          className="mt-16"
        >
          <p className="text-center section-label mb-3">
            Built on x402 — a Linux Foundation protocol
          </p>
          <LogoCarousel />
          <p className="text-center text-[11px] text-[var(--text-quaternary)] mt-2 max-w-md mx-auto leading-relaxed">
            These organizations are founding members of the x402 Foundation &mdash; not partners or customers of KyvernLabs.
          </p>
        </motion.div>

        {/* Ecosystem numbers */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 3, ease }}
          className="mt-10 mb-8"
        >
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
            {[
              { value: 24, prefix: "$", suffix: "M+", label: "Monthly Volume" },
              { value: 75, prefix: "", suffix: "M+", label: "Transactions" },
              { value: 100, prefix: "", suffix: "+", label: "x402 Services" },
            ].map((stat, i) => (
              <div key={stat.label} className="text-center py-8">
                <p className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-[-0.03em] animate-counter-glow">
                  <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} delay={3.2 + i * 0.2} />
                </p>
                <p className="mt-2 section-label">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {showDemo && <IntegrationDemo onClose={() => setShowDemo(false)} />}
    </section>
  );
}
