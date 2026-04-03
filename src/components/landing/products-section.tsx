"use client";

import { motion } from "framer-motion";
import { Wallet, Key, Terminal, LineChart } from "lucide-react";

const STEPS = [
  {
    title: "Connect Wallet & SIWE",
    desc: "Sign in with Ethereum. Your wallet owns the namespace, the data, and the USDC.",
    icon: Wallet,
  },
  {
    title: "Get your kv_live_ key",
    desc: "Generate your API key instantly in the dashboard. No credit card required.",
    icon: Key,
  },
  {
    title: "One-line integration",
    desc: "npm install @kyvernlabs/pulse and wrap your handlers. Your logic stays untouched.",
    icon: Terminal,
  },
  {
    title: "See your revenue instantly",
    desc: "Watch live USDC flowing from agentic consumers directly into your wallet.",
    icon: LineChart,
  },
];

export function ProductsSection() {
  return (
    <section id="products" className="py-28 lg:py-40 px-6 bg-white relative overflow-hidden">
      {/* Decorative subtle background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-black/[0.04] to-transparent" />
      
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-24 lg:mb-32"
        >
          <p className="text-[12px] uppercase tracking-[0.15em] font-medium text-quaternary mb-4">
            How It Works
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.03em] leading-[1.1]">
            From zero to real business in 47 seconds
          </h2>
          <p className="mt-4 text-[15px] text-tertiary max-w-lg mx-auto">
            Stop guessing who is paying you. Integrate Pulse and see every transaction, authenticated and verified on-chain.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 relative">
          {/* Connector line for desktop */}
          <div className="hidden lg:block absolute top-[40px] left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-black/[0.08] to-transparent z-0" />
          
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
              transition={{
                duration: 0.7,
                delay: i * 0.12,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="relative z-10 flex flex-col items-center text-center group cursor-default"
            >
              {/* Drop shadow glow effect on hover */}
              <div className="absolute top-[32px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-pulse/0 group-hover:bg-pulse/5 rounded-full blur-xl transition-colors duration-500 pointer-events-none" />
              
              <div className="w-[80px] h-[80px] rounded-[1.25rem] bg-white border border-black/[0.05] flex items-center justify-center mb-6 shadow-premium transition-all duration-500 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <step.icon className="w-[28px] h-[28px] text-primary group-hover:text-pulse group-hover:scale-110 transition-all duration-500" strokeWidth={1.5} />
              </div>
              
              <h3 className="text-[17px] font-semibold tracking-tight mb-3 text-primary">
                {step.title}
              </h3>
              <p className="text-[14px] text-secondary leading-relaxed max-w-[260px]">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
