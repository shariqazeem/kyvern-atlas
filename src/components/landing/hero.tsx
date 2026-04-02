"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STATS = [
  { value: "195+", label: "x402 Services" },
  { value: "$600M+", label: "Annualized Volume" },
  { value: "119M+", label: "Transactions" },
];

export function Hero() {
  return (
    <section className="relative pt-36 pb-28 lg:pt-44 lg:pb-36 px-6 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-fine-grid" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-pulse-100/40 via-transparent to-transparent rounded-full blur-[80px]" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-gradient-radial from-purple-100/25 via-transparent to-transparent rounded-full blur-[60px]" />

      <div className="relative max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/[0.06] bg-white text-[11px] tracking-wide uppercase font-medium text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            x402 Foundation Member
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-balance"
        >
          The infrastructure layer
          <br />
          for the{" "}
          <span className="bg-gradient-to-r from-blue-600 via-pulse to-indigo-500 bg-clip-text text-transparent">
            x402 economy
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-6 text-center text-[17px] leading-relaxed text-secondary max-w-2xl mx-auto"
        >
          Revenue analytics, smart routing, and business tools
          for x402 service providers. Built for the companies
          powering the agent economy.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <Link
            href="/pulse/dashboard"
            className="group inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors duration-300"
          >
            Open Pulse Dashboard
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/pulse"
            className="inline-flex items-center h-11 px-6 rounded-lg border border-black/[0.08] text-[13px] font-medium text-secondary hover:text-primary hover:border-black/[0.15] transition-all duration-300"
          >
            Learn about Pulse
          </Link>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-20 flex items-center justify-center gap-12 lg:gap-20"
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl lg:text-3xl font-semibold tracking-tight font-mono-numbers">
                {stat.value}
              </p>
              <p className="mt-1 text-[12px] text-quaternary uppercase tracking-wider font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
