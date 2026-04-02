"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CODE = `import { withPulse } from '@kyvernlabs/pulse'

// Wrap your x402 endpoint — that's it
export default withPulse(handler, {
  apiKey: 'kv_...'
})`;

export function DevelopersSection() {
  return (
    <section id="developers" className="py-20 px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="text-sm font-medium text-pulse mb-3">For developers</p>
            <h2 className="text-3xl font-semibold tracking-tight">
              One line of code.
              <br />
              Full revenue visibility.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Integrate Pulse into any x402 endpoint with a single middleware
              wrapper. Every payment is automatically tracked — revenue, customers,
              latency, errors.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <Link
                href="/pulse/dashboard/setup"
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 ease-premium transition-opacity"
              >
                View Setup Guide
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="bg-gray-950 rounded-xl p-5 shadow-premium-lg">
              <div className="flex items-center gap-1.5 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              </div>
              <pre className="text-sm font-mono text-gray-300 leading-relaxed overflow-x-auto">
                <code>{CODE}</code>
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
