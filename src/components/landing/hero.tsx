"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Dot grid background */}
      <div className="absolute inset-0 bg-dot-grid" />

      {/* Gradient orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-pulse-200/30 rounded-full blur-[100px]" />
      <div className="absolute top-40 right-1/4 w-72 h-72 bg-purple-200/20 rounded-full blur-[80px]" />

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-white/80 backdrop-blur-sm text-xs text-muted-foreground mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Now live — Pulse analytics for x402
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.1] text-balance"
        >
          The infrastructure company
          <br />
          for the{" "}
          <span className="bg-gradient-to-r from-pulse-500 to-pulse-700 bg-clip-text text-transparent">
            x402 economy
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Revenue analytics, smart routing, and business tools for x402 service
          providers. Stop flying blind. Start with Pulse.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-8 flex items-center justify-center gap-4"
        >
          <Link
            href="/pulse/dashboard"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 ease-premium transition-opacity"
          >
            Open Pulse Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#products"
            className="inline-flex items-center h-11 px-6 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 ease-premium transition-colors"
          >
            View Products
          </a>
        </motion.div>
      </div>
    </section>
  );
}
