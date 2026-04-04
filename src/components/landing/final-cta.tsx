"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative py-32 lg:py-40 px-6 overflow-hidden bg-[#09090B] text-white">
      {/* Gradient mesh */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-radial from-pulse/[0.08] via-transparent to-transparent rounded-full blur-[60px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-gradient-radial from-indigo-500/[0.05] via-transparent to-transparent rounded-full blur-[40px]" />
      </div>

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[0.92]">
            Every x402 service needs
            <br />
            a business layer.
          </h2>
          <p className="mt-6 text-[16px] text-white/50 max-w-md mx-auto leading-relaxed">
            195+ services. $600M+ in volume. Zero revenue visibility. Until now.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/pulse/dashboard"
              className="group inline-flex items-center gap-2.5 h-13 px-8 rounded-xl bg-white text-[#09090B] text-[15px] font-semibold hover:bg-white/90 transition-all duration-300"
              style={{ boxShadow: "0 0 20px rgba(255,255,255,0.1)" }}
            >
              <Wallet className="w-[18px] h-[18px]" />
              Open Pulse Dashboard
              <ArrowRight className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pulse#pricing"
              className="inline-flex items-center h-13 px-8 rounded-xl border border-white/[0.15] text-[15px] font-medium text-white/70 hover:text-white hover:border-white/[0.3] transition-all duration-300"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-6 text-[12px] text-white/30">
            Free for up to 1,000 events/day. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
