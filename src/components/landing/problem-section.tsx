"use client";

import { motion } from "framer-motion";

const WITHOUT = [
  "No revenue visibility across endpoints",
  "No idea which agents pay the most",
  "No pricing benchmarks vs competitors",
  "No alerts on revenue changes",
];

const WITH_PULSE = [
  "Real-time revenue per endpoint, per day, per agent",
  "Customer analytics with wallet-level detail",
  "Pricing intelligence across the x402 ecosystem",
  "Instant alerts on spikes, drops, and anomalies",
];

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
            <span className="text-tertiary">Zero business intelligence.</span>
          </h2>
        </motion.div>

        {/* Comparison — inspired by x402.org old way vs new way */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          {/* Without */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-xl border border-black/[0.06] bg-white p-7 lg:p-8"
          >
            <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-quaternary mb-6">
              Without Pulse
            </p>
            <div className="space-y-4">
              {WITHOUT.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black/[0.12] shrink-0" />
                  <p className="text-[14px] text-tertiary leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* With Pulse */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-xl border border-pulse/20 bg-gradient-to-b from-pulse-50/50 to-white p-7 lg:p-8"
          >
            <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-pulse-600 mb-6">
              With Pulse
            </p>
            <div className="space-y-4">
              {WITH_PULSE.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-pulse shrink-0" />
                  <p className="text-[14px] text-primary leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
