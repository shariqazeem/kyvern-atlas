"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative py-36 lg:py-48 px-6 overflow-hidden">
      {/* Premium subtle background fade for the final CTA */}
      <div className="absolute inset-0 bg-[#FAFAFA] -z-10" />
      <div className="absolute inset-0 bg-fine-grid opacity-50 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      
      <div className="max-w-3xl mx-auto text-center relative z-10">
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
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pulse/dashboard"
              className="group relative inline-flex items-center gap-2.5 h-14 px-8 rounded-xl bg-foreground text-background text-[15px] font-semibold hover:bg-foreground/90 transition-all duration-300"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)" }}
            >
              <Wallet className="w-4.5 h-4.5" />
              Connect Wallet Now
              <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/pulse#pricing"
              className="group inline-flex items-center h-14 px-8 rounded-xl border border-black/[0.1] bg-white text-[15px] font-medium text-secondary hover:text-primary hover:border-black/[0.2] transition-all duration-300 shadow-sm hover:shadow"
            >
              View Pricing & Pro
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
