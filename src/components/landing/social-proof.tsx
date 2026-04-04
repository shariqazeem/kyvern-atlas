"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Shield, Zap, Globe, ExternalLink } from "lucide-react";
import { KYVERN_PAY_TO } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface ProofData {
  verified_payments: number;
  connected_endpoints: number;
  total_revenue: number;
}

export function SocialProof() {
  const [data, setData] = useState<ProofData | null>(null);

  useEffect(() => {
    fetch("/api/pulse/proof")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <section className="py-28 lg:py-36 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          {/* Section header */}
          <div className="text-center mb-14">
            <p className="text-[12px] uppercase tracking-[0.2em] font-medium text-quaternary mb-5">
              Live proof
            </p>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.04em] leading-[0.95]">
              Real payments. Real blockchain.
              <br />
              <span className="text-tertiary">Not a simulation.</span>
            </h2>
          </div>

          {/* Stats grid — clean, no fake avatars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              {
                icon: Shield,
                value: data ? data.verified_payments.toString() : "0",
                label: "On-chain verified payments",
                detail: "Each with a BaseScan tx hash",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                icon: Globe,
                value: data ? data.connected_endpoints.toString() : "0",
                label: "Endpoints tracked",
                detail: "Via withPulse() middleware",
                color: "text-pulse-600",
                bg: "bg-pulse-50",
              },
              {
                icon: Zap,
                value: data ? `$${data.total_revenue.toFixed(2)}` : "$0.00",
                label: "USDC captured",
                detail: "Real micropayments on Base",
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
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
                <p className="text-[28px] font-bold font-mono-numbers tracking-tight">
                  {stat.value}
                </p>
                <p className="text-[13px] font-medium text-primary mt-1">{stat.label}</p>
                <p className="text-[11px] text-quaternary mt-0.5">{stat.detail}</p>
              </motion.div>
            ))}
          </div>

          {/* Verification CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center"
          >
            <a
              href={`https://sepolia.basescan.org/address/${KYVERN_PAY_TO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-tertiary hover:text-primary transition-colors duration-300"
            >
              Verify all payments on BaseScan
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </motion.div>

          {/* How It Works — replaces fake testimonials */}
          <div className="mt-14">
            <p className="text-[11px] uppercase tracking-[0.2em] font-medium text-quaternary text-center mb-6">
              How it works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Install middleware", desc: "npm install @kyvernlabs/pulse and wrap your handler with withPulse()" },
                { step: "2", title: "Receive a payment", desc: "An agent pays your x402 endpoint — Pulse captures it automatically" },
                { step: "3", title: "See your revenue", desc: "Dashboard shows revenue, customers, and tx hashes in real time" },
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
