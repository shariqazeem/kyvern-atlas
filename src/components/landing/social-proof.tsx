"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Globe, Users } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

export function SocialProof() {
  return (
    <section className="py-28 lg:py-36 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-[12px] uppercase tracking-[0.2em] font-medium text-quaternary mb-5">
              x402 Ecosystem
            </p>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.04em] leading-[0.95]">
              A protocol already at scale.
              <br />
              <span className="text-tertiary">Pulse brings the business layer.</span>
            </h2>
          </div>

          {/* Ecosystem Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { icon: Zap, value: "$24M+", label: "Monthly volume", detail: "Across the x402 ecosystem", color: "text-amber-600", bg: "bg-amber-50" },
              { icon: Globe, value: "75M+", label: "Transactions processed", detail: "On-chain verified payments", color: "text-pulse-600", bg: "bg-pulse-50" },
              { icon: Shield, value: "195+", label: "Active services", detail: "Live x402 endpoints", color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: Users, value: "20+", label: "Foundation members", detail: "Including Coinbase, Stripe, Visa", color: "text-indigo-600", bg: "bg-indigo-50" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease }}
                className="rounded-2xl border border-black/[0.06] bg-white p-6 text-center cursor-default"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
              >
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-4`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-[28px] font-bold font-mono-numbers tracking-tight">{stat.value}</p>
                <p className="text-[13px] font-medium text-primary mt-1">{stat.label}</p>
                <p className="text-[11px] text-quaternary mt-0.5">{stat.detail}</p>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-[11px] text-quaternary">
            Ecosystem data from the x402 Foundation leaderboard. These are protocol-wide metrics — not KyvernLabs metrics.
          </p>

          {/* How It Works mini */}
          <div className="mt-14">
            <p className="text-[11px] uppercase tracking-[0.2em] font-medium text-quaternary text-center mb-6">
              How it works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Install middleware", desc: "npm install @kyvernlabs/pulse and wrap your handler" },
                { step: "2", title: "Receive a payment", desc: "An agent pays your x402 endpoint — Pulse captures it" },
                { step: "3", title: "See your revenue", desc: "Dashboard shows revenue and tx hashes in real time" },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.1, ease }}
                  className="text-center p-5 rounded-2xl border border-black/[0.04] bg-[#FAFAFA]"
                >
                  <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-bold mx-auto mb-3">
                    {s.step}
                  </div>
                  <p className="text-[13px] font-semibold tracking-tight">{s.title}</p>
                  <p className="text-[11px] text-tertiary mt-1 leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
