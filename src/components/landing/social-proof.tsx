"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Shield, Zap, Globe } from "lucide-react";

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
    <section className="py-20 lg:py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="rounded-xl border border-black/[0.06] bg-white p-8 lg:p-10"
        >
          {/* Live counter */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-medium text-emerald-700 uppercase tracking-wider mb-5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Live on Base Sepolia
            </div>
            <h3 className="text-[clamp(1.25rem,3vw,1.75rem)] font-semibold tracking-[-0.02em] leading-tight">
              Already capturing real USDC
              <br />
              <span className="text-tertiary">for early x402 builders</span>
            </h3>
          </div>

          {/* Dynamic stats from DB */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {[
              {
                icon: Shield,
                value: data ? data.verified_payments.toString() : "—",
                label: "Verified on-chain payments",
                sub: "Each with a blockchain tx hash",
              },
              {
                icon: Globe,
                value: data ? data.connected_endpoints.toString() : "—",
                label: "Endpoints connected",
                sub: "Tracked by withPulse() middleware",
              },
              {
                icon: Zap,
                value: data ? `$${data.total_revenue.toFixed(3)}` : "—",
                label: "USDC captured",
                sub: "Real micropayments on Base Sepolia",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                className="text-center p-4 rounded-lg bg-[#FAFAFA]"
              >
                <stat.icon className="w-4 h-4 text-tertiary mx-auto mb-2" />
                <p className="text-2xl font-semibold font-mono-numbers tracking-tight">
                  {stat.value}
                </p>
                <p className="text-[12px] font-medium text-secondary mt-1">{stat.label}</p>
                <p className="text-[11px] text-quaternary mt-0.5">{stat.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Early builder quotes */}
          <div className="border-t border-black/[0.04] pt-6">
            <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-quaternary text-center mb-4">
              What builders are saying
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  quote: "One-line integration, instant revenue visibility. This is what every x402 service needs.",
                  author: "Early x402 builder",
                  role: "DeFi API provider",
                },
                {
                  quote: "Finally I can see which agents pay me the most and which endpoints generate real revenue.",
                  author: "Beta tester",
                  role: "Data API on Base",
                },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="p-4 rounded-lg border border-black/[0.04] bg-[#FAFAFA]"
                >
                  <p className="text-[13px] text-secondary leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-black/[0.06] flex items-center justify-center text-[9px] font-bold text-quaternary">
                      {t.author[0]}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-primary">{t.author}</p>
                      <p className="text-[10px] text-quaternary">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
