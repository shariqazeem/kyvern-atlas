"use client";

import { motion } from "framer-motion";
import { BarChart3, Brain, Gauge, Shield, Sparkles } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

export function ProblemSection() {
  const items = [
    {
      icon: BarChart3,
      title: "Revenue dashboard",
      desc: "See every payment, every endpoint, every agent — in real time.",
    },
    {
      icon: Brain,
      title: "Pricing intelligence",
      desc: "Benchmark against the market. Know if you're undercharging.",
    },
    {
      icon: Sparkles,
      title: "Agent personas",
      desc: "Understand who pays you. Spending patterns, cohorts, LTV.",
    },
    {
      icon: Shield,
      title: "On-chain verified",
      desc: "Every transaction linked to a Solana tx signature on Solscan.",
    },
    {
      icon: Gauge,
      title: "400ms on Solana",
      desc: "Built Solana-native. SPL tokens, Phantom auth, real-time feeds.",
    },
  ];

  return (
    <section className="py-28 lg:py-36 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="text-center mb-20"
        >
          <p className="section-label mb-5">The problem</p>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold tracking-[-0.04em] leading-[0.95]">
            $24M flows through x402 monthly.
            <br />
            <span className="text-[var(--text-tertiary)]">Zero business infrastructure.</span>
          </h2>
          <p className="mt-5 text-[16px] text-[var(--text-tertiary)] max-w-lg mx-auto leading-relaxed">
            100+ AI agent APIs accept payments. Every provider is flying
            blind on revenue, customers, and pricing. We fix that.
          </p>
        </motion.div>

        <div className="space-y-4">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.06, ease }}
              className="card p-6 flex items-start gap-5"
            >
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ borderRadius: "var(--radius-sm)", background: "var(--surface-2)" }}
              >
                <item.icon className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <div>
                <p className="text-[15px] font-semibold tracking-tight">{item.title}</p>
                <p className="text-[14px] text-[var(--text-tertiary)] mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
