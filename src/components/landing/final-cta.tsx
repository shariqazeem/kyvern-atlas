"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="py-32 lg:py-40 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="text-[clamp(2rem,4.5vw,3.25rem)] font-bold tracking-[-0.04em] leading-[0.95]">
            Ready to own the business layer
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-pulse to-indigo-500 bg-clip-text text-transparent">
              of the agentic internet?
            </span>
          </h2>
          <p className="mt-6 text-[16px] text-tertiary max-w-md mx-auto leading-relaxed">
            Connect your wallet. Get your API key. See every payment.
            Free to start — upgrade when you make real money.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/pulse/dashboard"
              className="group relative inline-flex items-center gap-2.5 h-12 px-7 rounded-xl bg-foreground text-background text-[14px] font-semibold hover:bg-foreground/90 transition-all duration-300"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.08)" }}
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet Now
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pulse#pricing"
              className="inline-flex items-center h-12 px-7 rounded-xl border border-black/[0.08] text-[14px] font-medium text-secondary hover:text-primary hover:border-black/[0.16] transition-all duration-300"
            >
              View Pricing & Pro
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
