"use client";

import { motion } from "framer-motion";
import {
  BarChart3, Brain, Layers, Wallet, Store,
  Zap, Clock, DollarSign, Cpu,
} from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

/* ── Platform Layer Card ── */
function LayerCard({
  layer,
  title,
  tagline,
  features,
  delay,
}: {
  layer: string;
  title: string;
  tagline: string;
  features: { icon: React.ElementType; text: string }[];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease }}
      className="card-interactive p-7"
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[12px] font-bold bg-[var(--text-primary)] text-white">
          {layer}
        </span>
        <div>
          <p className="text-[15px] font-semibold tracking-tight">{title}</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">{tagline}</p>
        </div>
      </div>
      <div className="space-y-3">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-2.5 text-[13px] text-[var(--text-secondary)]">
            <f.icon className="w-4 h-4 text-[var(--text-quaternary)] flex-shrink-0" />
            {f.text}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Why Solana ── */
function SolanaComparison() {
  const rows = [
    { metric: "Finality", solana: "400ms", other: "12s", icon: Clock },
    { metric: "Cost / tx", solana: "$0.00025", other: "$0.50+", icon: DollarSign },
    { metric: "Throughput", solana: "65K TPS", other: "~1K TPS", icon: Zap },
    { metric: "Wallet UX", solana: "Phantom", other: "MetaMask", icon: Wallet },
  ];

  return (
    <div className="card p-6">
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div />
        <p className="text-center text-[12px] font-semibold text-[var(--text-primary)]">Solana</p>
        <p className="text-center text-[12px] text-[var(--text-quaternary)]">Other chains</p>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.metric}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.06, ease }}
          className="grid grid-cols-3 gap-4 py-3.5 border-t border-[var(--border-subtle)]"
        >
          <div className="flex items-center gap-2.5 text-[13px] text-[var(--text-secondary)]">
            <row.icon className="w-3.5 h-3.5 text-[var(--text-quaternary)]" />
            {row.metric}
          </div>
          <p className="text-center text-[14px] font-semibold font-mono-numbers text-[var(--text-primary)]">
            {row.solana}
          </p>
          <p className="text-center text-[14px] font-mono-numbers text-[var(--text-quaternary)]">
            {row.other}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

export function SocialProof() {
  return (
    <section id="platform" className="py-28 lg:py-36 px-6" style={{ background: "var(--surface-2)" }}>
      <div className="max-w-5xl mx-auto">
        {/* Platform Vision */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-16"
        >
          <p className="section-label mb-5">The platform</p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.04em] leading-[0.95]">
            Not just analytics.
            <br />
            <span className="text-[var(--text-tertiary)]">A complete business OS.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-28">
          <LayerCard
            layer="1"
            title="The Wedge"
            tagline="npm install & see revenue"
            delay={0}
            features={[
              { icon: BarChart3, text: "Revenue dashboard & trends" },
              { icon: Cpu, text: "One-line middleware integration" },
              { icon: Zap, text: "Real-time payment capture" },
            ]}
          />
          <LayerCard
            layer="2"
            title="The Platform"
            tagline="Launch APIs in 60 seconds"
            delay={0.08}
            features={[
              { icon: Wallet, text: "Managed Solana wallets" },
              { icon: Store, text: "x402 service marketplace" },
              { icon: Layers, text: "Shareable payment links" },
            ]}
          />
          <LayerCard
            layer="3"
            title="The Intelligence"
            tagline="Your AI-powered CFO"
            delay={0.16}
            features={[
              { icon: Brain, text: "AI pricing copilot" },
              { icon: Layers, text: "Agent personas & cohorts" },
              { icon: BarChart3, text: "Market gap analysis" },
            ]}
          />
        </div>

        {/* Why Solana */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-12"
        >
          <p className="section-label mb-5">Why Solana</p>
          <h2 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold tracking-[-0.04em] leading-[0.95]">
            x402 was born on EVM.
            <br />
            <span className="text-[var(--text-tertiary)]">It scales on Solana.</span>
          </h2>
        </motion.div>

        <div className="max-w-xl mx-auto">
          <SolanaComparison />
        </div>
      </div>
    </section>
  );
}
