"use client";

import { motion } from "framer-motion";

function TerminalChaos() {
  const lines = [
    { text: "$ curl -s /api/analytics | jq", cls: "text-gray-500" },
    { text: 'error: no analytics endpoint found', cls: "text-red-400" },
    { text: "$ grep 'payment' server.log | wc -l", cls: "text-gray-500" },
    { text: "47291", cls: "text-gray-300" },
    { text: "$ # who paid? how much? which endpoint?", cls: "text-gray-600" },
    { text: "$ # ¯\\_(ツ)_/¯", cls: "text-gray-600" },
    { text: '$ echo "total revenue this month?"', cls: "text-gray-500" },
    { text: "# manually parse 47k log lines...", cls: "text-gray-600" },
    { text: "$ awk '{sum+=$5} END {print sum}'", cls: "text-gray-500" },
    { text: "ERROR: field 5 not found", cls: "text-red-400" },
  ];

  return (
    <div className="bg-[#0A0A0A] rounded-xl border border-white/[0.06] overflow-hidden h-full">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06]">
        <div className="w-2 h-2 rounded-full bg-red-400/60" />
        <div className="w-2 h-2 rounded-full bg-yellow-400/60" />
        <div className="w-2 h-2 rounded-full bg-green-400/60" />
        <span className="ml-3 text-[10px] text-white/20 font-mono">your-server — ssh</span>
      </div>
      <div className="p-4 space-y-1">
        {lines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -5 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
            className={`text-[11px] font-mono leading-relaxed ${line.cls}`}
          >
            {line.text}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

function PulseDashboardMini() {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden h-full shadow-premium-lg">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-black/[0.04] bg-[#FAFAFA]">
        <div className="w-2 h-2 rounded-full bg-black/[0.06]" />
        <div className="w-2 h-2 rounded-full bg-black/[0.06]" />
        <div className="w-2 h-2 rounded-full bg-black/[0.06]" />
        <span className="ml-3 text-[10px] text-quaternary font-mono">Pulse Dashboard</span>
        <span className="ml-auto relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
      </div>
      <div className="p-4 space-y-3">
        {/* Mini stat cards */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Revenue", value: "$12,847", delta: "+23%" },
            { label: "API Calls", value: "8,492", delta: "+13%" },
          ].map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="bg-[#FAFAFA] rounded-lg p-2.5"
            >
              <p className="text-[9px] text-quaternary font-medium">{card.label}</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[14px] font-semibold font-mono tracking-tight">{card.value}</span>
                <span className="text-[9px] font-medium text-emerald-600">{card.delta}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mini chart */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-[#FAFAFA] rounded-lg p-2.5"
        >
          <svg viewBox="0 0 200 40" className="w-full h-auto">
            <defs>
              <linearGradient id="miniChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,30 C20,28 40,20 60,22 C80,24 100,15 120,12 C140,9 160,10 180,6 L200,3" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M0,30 C20,28 40,20 60,22 C80,24 100,15 120,12 C140,9 160,10 180,6 L200,3 L200,40 L0,40 Z" fill="url(#miniChartGrad)" />
          </svg>
        </motion.div>

        {/* Mini transactions */}
        {[
          { ep: "/api/search", amt: "$0.15", status: "Verified" },
          { ep: "/api/summarize", amt: "$0.25", status: "Verified" },
          { ep: "/api/weather", amt: "$0.05", status: "Verified" },
        ].map((tx, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 5 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 1 + i * 0.1 }}
            className="flex items-center justify-between py-1 border-b border-black/[0.03] last:border-0"
          >
            <span className="text-[10px] font-mono text-secondary">{tx.ep}</span>
            <span className="text-[10px] font-mono font-medium">{tx.amt}</span>
            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              {tx.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ProblemSection() {
  return (
    <section className="py-28 lg:py-36 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-16"
        >
          <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
            The problem
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.03em] leading-[1.1]">
            195+ x402 services.
            <br />
            <span className="text-tertiary">Zero revenue visibility.</span>
          </h2>
          <p className="mt-4 text-[15px] text-tertiary max-w-lg mx-auto leading-relaxed">
            The x402 ecosystem processes $600M+ in volume. Every service provider
            is flying blind on revenue, customers, and pricing.
          </p>
        </motion.div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-quaternary mb-3 text-center lg:text-left">
              Without Pulse
            </p>
            <TerminalChaos />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-pulse-600 mb-3 text-center lg:text-left">
              With Pulse
            </p>
            <PulseDashboardMini />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
