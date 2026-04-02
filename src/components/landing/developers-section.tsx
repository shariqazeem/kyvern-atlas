"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function CodeBlock() {
  return (
    <div className="bg-[#0A0A0A] rounded-xl border border-white/[0.06] overflow-hidden shadow-premium-xl">
      {/* Terminal chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <span className="ml-3 text-[11px] text-white/20 font-mono">api/endpoint.ts</span>
      </div>
      {/* Code */}
      <div className="p-5 lg:p-6">
        <pre className="text-[13px] font-mono leading-[1.7] overflow-x-auto">
          <code>
            {/* Render code with syntax highlighting */}
            <span className="text-purple-400">import</span>
            <span className="text-gray-300">{" { "}</span>
            <span className="text-blue-400">withX402</span>
            <span className="text-gray-300">{" } "}</span>
            <span className="text-purple-400">from</span>
            <span className="text-emerald-400">{" '@x402/next'"}</span>
            {"\n"}
            <span className="text-purple-400">import</span>
            <span className="text-gray-300">{" { "}</span>
            <span className="text-blue-400">withPulse</span>
            <span className="text-gray-300">{" } "}</span>
            <span className="text-purple-400">from</span>
            <span className="text-emerald-400">{" '@kyvernlabs/pulse'"}</span>
            {"\n\n"}
            <span className="text-gray-500">{"// Your x402 handler → Pulse captures every payment"}</span>
            {"\n"}
            <span className="text-purple-400">const</span>
            <span className="text-gray-300">{" x402Handler = "}</span>
            <span className="text-blue-400">withX402</span>
            <span className="text-gray-400">{"(handler, config, server)"}</span>
            {"\n\n"}
            <span className="text-purple-400">export const</span>
            <span className="text-gray-300">{" GET = "}</span>
            <span className="text-blue-400">withPulse</span>
            <span className="text-gray-400">{"(x402Handler, {"}</span>
            {"\n"}
            <span className="text-gray-400">{"  "}</span>
            <span className="text-orange-300">apiKey</span>
            <span className="text-gray-400">{": "}</span>
            <span className="text-emerald-400">{"'kv_...'"}</span>
            {"\n"}
            <span className="text-gray-400">{"})"}</span>
          </code>
        </pre>
      </div>
    </div>
  );
}

export function DevelopersSection() {
  return (
    <section id="developers" className="py-28 lg:py-36 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
              For developers
            </p>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.03em] leading-[1.1]">
              Two lines of code.
              <br />
              <span className="text-tertiary">Full revenue visibility.</span>
            </h2>
            <p className="mt-5 text-[15px] text-secondary leading-relaxed max-w-md">
              Wrap your x402 handler with{" "}
              <code className="text-[13px] font-mono bg-black/[0.04] px-1.5 py-0.5 rounded">
                withPulse()
              </code>
              . Every payment is captured automatically — payer address, amount,
              blockchain tx hash, latency.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/pulse/dashboard/setup"
                className="group inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors duration-300"
              >
                Setup Guide
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/pulse"
                className="inline-flex items-center h-10 px-5 rounded-lg border border-black/[0.08] text-[13px] font-medium text-secondary hover:text-primary transition-colors duration-300"
              >
                View Pricing
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <CodeBlock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
