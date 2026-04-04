"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Shield, Zap, Globe, ExternalLink, Check } from "lucide-react";
import { KYVERN_PAY_TO, truncateAddress, formatCurrency } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface ProofData {
  verified_payments: number;
  connected_endpoints: number;
  total_revenue: number;
}

interface LiveTx {
  endpoint: string;
  amount_usd: number;
  payer_address: string;
  timestamp: string;
  tx_hash?: string;
  source?: string;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SocialProof() {
  const [data, setData] = useState<ProofData | null>(null);
  const [txns, setTxns] = useState<LiveTx[]>([]);

  useEffect(() => {
    fetch("/api/pulse/proof").then((r) => r.json()).then(setData).catch(() => {});
    fetch("/api/pulse/recent?source=middleware&limit=5")
      .then((r) => r.json())
      .then((d) => setTxns(d.transactions || []))
      .catch(() => {});

    // Auto-refresh every 30s
    const interval = setInterval(() => {
      fetch("/api/pulse/proof").then((r) => r.json()).then(setData).catch(() => {});
      fetch("/api/pulse/recent?source=middleware&limit=5")
        .then((r) => r.json())
        .then((d) => setTxns(d.transactions || []))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
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
          {/* Header */}
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

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              { icon: Shield, value: data ? data.verified_payments.toString() : "0", label: "On-chain verified", detail: "Each with a BaseScan tx hash", color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: Globe, value: data ? data.connected_endpoints.toString() : "0", label: "Endpoints tracked", detail: "Via withPulse() middleware", color: "text-pulse-600", bg: "bg-pulse-50" },
              { icon: Zap, value: data ? `$${data.total_revenue.toFixed(2)}` : "$0.00", label: "USDC captured", detail: "Real micropayments on Base", color: "text-amber-600", bg: "bg-amber-50" },
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

          {/* Live Transaction Feed */}
          {txns.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4, ease }}
              className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden mb-8"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
            >
              <div className="px-5 py-3 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[12px] font-medium text-primary">Live Payments</span>
                </div>
                <span className="text-[10px] text-quaternary">Auto-refreshes every 30s</span>
              </div>
              {txns.map((tx, i) => (
                <motion.div
                  key={tx.timestamp + tx.payer_address}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
                  className="flex items-center gap-4 px-5 py-2.5 border-b border-black/[0.02] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                >
                  <span className="font-mono text-[11px] text-secondary w-28 truncate">{tx.endpoint}</span>
                  <span className="font-mono-numbers text-[11px] font-semibold w-16 text-right">{formatCurrency(tx.amount_usd)}</span>
                  <span className="font-mono text-[10px] text-quaternary w-24 truncate">{truncateAddress(tx.payer_address)}</span>
                  <span className="text-[10px] text-quaternary w-16 text-right">{timeAgo(tx.timestamp)}</span>
                  <span className="inline-flex items-center gap-1 text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase tracking-wider ml-auto shrink-0">
                    <Check className="w-2 h-2" />
                    Verified
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Verify + How It Works */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a
              href={`https://sepolia.basescan.org/address/${KYVERN_PAY_TO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-tertiary hover:text-primary transition-colors duration-300"
            >
              Verify all payments on BaseScan
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

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
