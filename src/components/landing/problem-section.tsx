"use client";

import { motion } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

function TerminalChaos() {
  const lines = [
    { text: "$ curl -s /api/analytics", cls: "text-gray-400" },
    { text: 'error: endpoint not found', cls: "text-red-400" },
    { text: "$ grep 'payment' server.log | wc -l", cls: "text-gray-400" },
    { text: "47,291", cls: "text-gray-300" },
    { text: "$ # Who paid? How much? Which endpoint?", cls: "text-gray-600" },
    { text: "$ # No idea ¯\\_(ツ)_/¯", cls: "text-gray-600" },
    { text: '$ echo "total revenue?"', cls: "text-gray-400" },
    { text: "# manually parse 47k lines...", cls: "text-gray-600" },
    { text: "$ awk '{sum+=$5} END {print sum}'", cls: "text-gray-400" },
    { text: "ERROR: field 5 not found", cls: "text-red-400" },
    { text: "$ # give up", cls: "text-gray-700" },
  ];

  return (
    <div className="bg-[#000000] rounded-2xl overflow-hidden h-full relative" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.4)" }}>
      {/* Intense but subtle chaos glow */}
      <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] bg-red-500/10 blur-[80px] pointer-events-none" />
      <div className="relative flex items-center gap-1.5 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        <span className="ml-3 text-[10px] text-white/15 font-mono">your-server — ssh</span>
      </div>
      <div className="relative p-6 space-y-2">
        {lines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease }}
            className={`text-[12px] font-mono leading-relaxed ${line.cls}`}
          >
            {line.text}
          </motion.p>
        ))}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-2 h-4 bg-white/40 mt-3"
        />
      </div>
    </div>
  );
}

function PulseDashboardMini() {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden h-full relative" style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)" }}>
      {/* Positive Pulse aura */}
      <div className="absolute top-[20%] right-[10%] w-[250px] h-[250px] bg-pulse/5 blur-[60px] pointer-events-none rounded-full" />
      <div className="relative flex items-center gap-1.5 px-5 py-3 border-b border-black/[0.03] bg-[#FAFAFA]/80 backdrop-blur-md z-10">
        <div className="w-2.5 h-2.5 rounded-full bg-black/[0.06]" />
        <div className="w-2.5 h-2.5 rounded-full bg-black/[0.06]" />
        <div className="w-2.5 h-2.5 rounded-full bg-black/[0.06]" />
        <span className="ml-3 text-[10px] text-quaternary font-mono">Pulse Dashboard</span>
        <span className="ml-auto relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Revenue", value: "$12,847", delta: "+23%" },
            { label: "API Calls", value: "8,492", delta: "+13%" },
          ].map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="bg-[#FAFAFA] rounded-xl p-3"
            >
              <p className="text-[9px] text-quaternary font-medium uppercase tracking-wider">{card.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[16px] font-bold font-mono tracking-tight">{card.value}</span>
                <span className="text-[9px] font-semibold text-emerald-600">{card.delta}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 1 }}
          className="bg-[#FAFAFA] rounded-xl p-3"
        >
          <svg viewBox="0 0 240 45" className="w-full h-auto">
            <defs>
              <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,32 C24,30 48,22 72,24 C96,26 120,16 144,13 C168,10 192,12 216,7 L240,4" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            <path d="M0,32 C24,30 48,22 72,24 C96,26 120,16 144,13 C168,10 192,12 216,7 L240,4 L240,45 L0,45 Z" fill="url(#miniGrad)" />
          </svg>
        </motion.div>

        {[
          { ep: "/api/search", amt: "$0.15", badge: "Verified" },
          { ep: "/api/summarize", amt: "$0.25", badge: "Verified" },
          { ep: "/api/weather", amt: "$0.05", badge: "Verified" },
        ].map((tx, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 1.2 + i * 0.1, ease }}
            className="flex items-center justify-between py-1.5 border-b border-black/[0.02] last:border-0"
          >
            <span className="text-[10px] font-mono text-secondary">{tx.ep}</span>
            <span className="text-[10px] font-mono font-semibold">{tx.amt}</span>
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase tracking-wider">
              {tx.badge}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ProblemSection() {
  return (
    <section className="py-32 lg:py-40 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.8, ease }}
          className="text-center mb-24"
        >
          <p className="text-[12px] uppercase tracking-[0.2em] font-medium text-quaternary mb-5">
            The problem
          </p>
          <h2 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold tracking-[-0.04em] leading-[0.95]">
            195+ x402 services.
            <br />
            <span className="text-tertiary">Zero revenue visibility.</span>
          </h2>
          <p className="mt-5 text-[16px] text-tertiary max-w-lg mx-auto leading-relaxed">
            $600M+ flows through the x402 economy. Every service provider
            is flying blind on revenue, customers, and pricing.
          </p>
        </motion.div>

        {/* Before / After labels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease }}
          >
            <div className="flex items-center gap-2.5 mb-5 pl-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-40" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-[12px] uppercase tracking-[0.2em] font-bold text-red-500/80">
                Before
              </span>
            </div>
            <TerminalChaos />
            <div className="mt-4 space-y-2 pl-2">
              {["No idea which agents pay you the most", "Can't tell if your pricing is competitive", "Zero visibility into payment trends", "Manual wallet balance checking"].map((pain, i) => (
                <motion.p key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 1 + i * 0.08 }}
                  className="flex items-center gap-2 text-[12px] text-red-400/70">
                  <span className="w-1 h-1 rounded-full bg-red-400/50 shrink-0" />{pain}
                </motion.p>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, delay: 0.2, ease }}
          >
            <div className="flex items-center gap-2.5 mb-5 pl-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[12px] uppercase tracking-[0.2em] font-bold text-emerald-600">
                After
              </span>
            </div>
            <PulseDashboardMini />
            <div className="mt-4 space-y-2 pl-2">
              {["Revenue per endpoint, per agent, in real-time", "Market pricing benchmarks and percentile rank", "Retention curves and growth trends", "On-chain verified, click to BaseScan"].map((sol, i) => (
                <motion.p key={i} initial={{ opacity: 0, x: 8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 1.2 + i * 0.08 }}
                  className="flex items-center gap-2 text-[12px] text-emerald-600/80">
                  <span className="w-1 h-1 rounded-full bg-emerald-500/50 shrink-0" />{sol}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
