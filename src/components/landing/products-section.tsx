"use client";

import { motion } from "framer-motion";
import {
  Activity, Shield, BarChart3, Bell, Webhook, Users,
  Brain, Sparkles, Globe, Cpu,
} from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

const FEATURES = [
  {
    icon: Activity,
    title: "Real-Time Revenue",
    desc: "See every Solana payment as it happens. Revenue, calls, latency, errors — live updates via WebSocket.",
    tag: null,
  },
  {
    icon: Shield,
    title: "On-Chain Verified",
    desc: "Every transaction linked to a Solana tx signature. Click through to Solscan for proof.",
    tag: null,
  },
  {
    icon: BarChart3,
    title: "Pricing Intelligence",
    desc: "Benchmark your pricing against the entire x402 market. See your percentile rank in real-time.",
    tag: "Pro",
  },
  {
    icon: Brain,
    title: "AI Revenue Copilot",
    desc: "Get pricing recommendations, revenue forecasts, and market gap analysis powered by AI.",
    tag: "Pro",
  },
  {
    icon: Users,
    title: "Agent Personas",
    desc: "Understand your customers. See spending patterns, retention cohorts, and lifetime value per agent.",
    tag: "Pro",
  },
  {
    icon: Cpu,
    title: "17 MCP Tools",
    desc: "Give Claude, Cursor, or any AI agent full access to your revenue data via Model Context Protocol.",
    tag: "New",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    desc: "Revenue spikes, drops, new high-value agents, latency anomalies — delivered to Slack or Discord.",
    tag: "Pro",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    desc: "Push payment events to any endpoint. HMAC-SHA256 signed, retry on failure, full delivery log.",
    tag: "Pro",
  },
  {
    icon: Globe,
    title: "Multi-Chain Native",
    desc: "Solana (primary), Base, and Stellar — all from one dashboard. Track SPL tokens, ERC-20, and XLM.",
    tag: null,
  },
];

const TAG_STYLES: Record<string, string> = {
  Pro: "bg-[var(--accent-bg)] text-[var(--accent)]",
  New: "bg-[var(--solana-bg)] text-[var(--solana)]",
};

export function ProductsSection() {
  return (
    <section id="features" className="py-28 lg:py-36 px-6" style={{ background: "var(--surface-2)" }}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <p className="section-label mb-5">Features</p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.04em] leading-[0.95]">
            Everything to run a profitable
            <br />
            <span className="text-[var(--text-tertiary)]">x402 business on Solana</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.05, ease }}
              className="card-interactive p-6 cursor-default"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{ borderRadius: "var(--radius-sm)", background: "var(--surface-2)" }}
                >
                  <feature.icon className="w-5 h-5 text-[var(--text-secondary)]" />
                </div>
                {feature.tag && (
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${TAG_STYLES[feature.tag]}`}>
                    {feature.tag === "Pro" && <Sparkles className="w-2.5 h-2.5" />}
                    {feature.tag}
                  </span>
                )}
              </div>
              <h3 className="text-[14px] font-semibold tracking-tight mb-1.5">{feature.title}</h3>
              <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
