"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { KYVERN_PAY_TO } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  BarChart3,
  Shield,
  ExternalLink,
  Zap,
  Globe,
  ArrowRight,
  Check,
  Copy,
} from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface ProofData {
  verified_payments: number;
  connected_endpoints: number;
  total_revenue: number;
  payments_last_hour: number;
}

const SERVICES = [
  {
    name: "Price Oracle",
    endpoint: "/api/x402/oracle",
    example: "/api/x402/oracle?token=ETH",
    price: "$0.001",
    icon: BarChart3,
    description: "Real-time crypto prices for AI agents. Returns price, 24h change, market cap, and volume for BTC, ETH, SOL, USDC, and 6+ more tokens.",
    params: [
      { name: "token", type: "string", desc: "Token symbol: BTC, ETH, SOL, USDC, MATIC, AVAX, ARB, OP, LINK" },
    ],
    response: {
      token: "ETH",
      price_usd: 3245.67,
      change_24h_pct: 2.14,
      market_cap_usd: 389000000000,
      volume_24h_usd: 12400000000,
      timestamp: "2026-04-03T...",
      powered_by: "x402",
    },
  },
  {
    name: "Agent Reputation",
    endpoint: "/api/x402/reputation",
    example: "/api/x402/reputation?address=0x914b67B249bdE528C61fEcC4FC84557BC7Eff33F",
    price: "$0.01",
    icon: Shield,
    description: "On-chain wallet reputation scoring. Checks transaction history, balances, and activity to determine if an agent wallet is trustworthy for x402 payments.",
    params: [
      { name: "address", type: "string", desc: "Wallet address to analyze (0x...)" },
    ],
    response: {
      address: "0x914b...f33F",
      reputation_score: 75,
      tier: "good",
      on_chain: { transaction_count: 42, eth_balance: 0.05, usdc_balance: 19.5 },
      analysis: { has_funds: true, is_active: true, can_pay_x402: true },
      powered_by: "x402",
    },
  },
];

export default function ServicesPage() {
  const [proof, setProof] = useState<ProofData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pulse/proof").then(r => r.json()).then(setProof).catch(() => {});
  }, []);

  function copyEndpoint(url: string, id: string) {
    navigator.clipboard.writeText(`https://kyvernlabs.com${url}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 pb-16 lg:pt-44 lg:pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.015) 1px, transparent 1px)",
          backgroundSize: "80px 80px"
        }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-black/[0.05] bg-white/90 text-[11px] font-medium text-secondary mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live on Base — paying real USDC
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[0.95] tracking-[-0.04em]"
          >
            x402 Services
            <br />
            <span className="text-tertiary">by KyvernLabs</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="mt-5 text-[16px] text-secondary max-w-lg mx-auto leading-relaxed"
          >
            Production APIs that agents pay for with USDC via x402.
            Every payment tracked through our own Pulse dashboard.
          </motion.p>

          {/* Live stats */}
          {proof && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease }}
              className="mt-10 flex items-center justify-center gap-8 lg:gap-12"
            >
              {[
                { icon: Check, value: proof.verified_payments.toString(), label: "Verified payments" },
                { icon: Globe, value: proof.connected_endpoints.toString(), label: "Endpoints" },
                { icon: Zap, value: `$${proof.total_revenue.toFixed(3)}`, label: "USDC captured" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-[24px] font-bold font-mono-numbers tracking-tight">{s.value}</p>
                  <p className="text-[11px] text-quaternary uppercase tracking-[0.15em] font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Services */}
      <section className="py-20 lg:py-24 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {SERVICES.map((service, i) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease }}
              className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
            >
              {/* Header */}
              <div className="p-6 lg:p-8 border-b border-black/[0.04]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] flex items-center justify-center">
                      <service.icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-bold tracking-tight">{service.name}</h2>
                      <p className="text-[12px] text-quaternary font-mono mt-0.5">{service.price} USDC per call</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>
                <p className="text-[14px] text-secondary leading-relaxed">{service.description}</p>
              </div>

              {/* Endpoint + Params */}
              <div className="p-6 lg:p-8 bg-[#FAFAFA]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-semibold text-quaternary uppercase tracking-wider">Endpoint</span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-black/[0.06] p-3 mb-4">
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">GET</span>
                  <code className="flex-1 text-[13px] font-mono text-primary truncate">
                    kyvernlabs.com{service.example}
                  </code>
                  <button
                    onClick={() => copyEndpoint(service.example, service.name)}
                    className="p-1.5 rounded-lg hover:bg-[#F0F0F0] transition-colors"
                  >
                    {copied === service.name ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-quaternary" />}
                  </button>
                </div>

                {/* Parameters */}
                <div className="mb-4">
                  <span className="text-[10px] font-semibold text-quaternary uppercase tracking-wider">Parameters</span>
                  <div className="mt-2 space-y-1">
                    {service.params.map((p) => (
                      <div key={p.name} className="flex items-baseline gap-3 text-[13px]">
                        <code className="font-mono text-pulse font-medium">{p.name}</code>
                        <span className="text-[11px] text-quaternary font-mono">{p.type}</span>
                        <span className="text-tertiary">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Example response */}
                <div>
                  <span className="text-[10px] font-semibold text-quaternary uppercase tracking-wider">Example Response</span>
                  <pre className="mt-2 bg-[#09090B] rounded-xl p-4 overflow-x-auto text-[12px] font-mono text-gray-300 leading-relaxed">
                    {JSON.stringify(service.response, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 lg:px-8 py-4 border-t border-black/[0.04] flex items-center justify-between">
                <span className="text-[11px] text-quaternary">
                  Tracked via <span className="font-medium text-pulse">withPulse()</span> middleware
                </span>
                <a
                  href={`https://basescan.org/address/${KYVERN_PAY_TO}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-tertiary hover:text-primary transition-colors"
                >
                  Verify on BaseScan
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#FAFAFA]">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.03em] mb-3">
            Build your own x402 service
          </h2>
          <p className="text-[14px] text-tertiary mb-6">
            Wrap any API with x402 payments + Pulse analytics in one line of code.
          </p>
          <a
            href="/pulse/dashboard/setup"
            className="group inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 transition-colors"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
