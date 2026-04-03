"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Copy, Check, Package } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

const CODE = `import { withPulse } from '@kyvernlabs/pulse';
import { withX402 } from '@x402/next';

export const GET = withPulse(withX402(async () => { ... }));`;

function CodeBlock() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="relative">
      <div className="bg-[#09090B] rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.12)" }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <span className="ml-3 text-[10px] text-white/15 font-mono">your-api/route.ts</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-400/60">
              <Package className="w-3 h-3" />
              Published on npm
            </span>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-medium text-white/40 hover:text-white/70 transition-all duration-200"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Code */}
        <div className="p-6 lg:p-7">
          <pre className="text-[13px] lg:text-[14px] font-mono leading-[1.75] overflow-x-auto">
            <code>
              <span className="text-purple-400">import</span>
              <span className="text-gray-300">{" { "}</span>
              <span className="text-blue-400">withPulse</span>
              <span className="text-gray-300">{" } "}</span>
              <span className="text-purple-400">from</span>
              <span className="text-emerald-400">{" '@kyvernlabs/pulse'"}</span>
              <span className="text-gray-400">{";"}</span>
              {"\n"}
              <span className="text-purple-400">import</span>
              <span className="text-gray-300">{" { "}</span>
              <span className="text-blue-400">withX402</span>
              <span className="text-gray-300">{" } "}</span>
              <span className="text-purple-400">from</span>
              <span className="text-emerald-400">{" '@x402/next'"}</span>
              <span className="text-gray-400">{";"}</span>
              {"\n\n"}
              <span className="text-purple-400">export const</span>
              <span className="text-gray-300">{" GET = "}</span>
              <span className="text-blue-400">withPulse</span>
              <span className="text-gray-400">{"("}</span>
              <span className="text-blue-400">withX402</span>
              <span className="text-gray-400">{"("}</span>
              <span className="text-purple-400">async</span>
              <span className="text-gray-400">{" () "}</span>
              <span className="text-blue-400">{"=>"}</span>
              <span className="text-gray-400">{" { "}</span>
              <span className="text-gray-500">{"..."}</span>
              <span className="text-gray-400">{" }));"}</span>
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export function DevelopersSection() {
  return (
    <section id="developers" className="py-32 lg:py-40 px-6 bg-[#FAFAFA]">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="text-[12px] uppercase tracking-[0.2em] font-medium text-quaternary mb-5">
              For developers
            </p>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.04em] leading-[0.95]">
              One line of code.
              <br />
              <span className="text-tertiary">Full revenue visibility.</span>
            </h2>
            <p className="mt-6 text-[16px] text-secondary leading-relaxed max-w-md">
              <code className="text-[14px] font-mono bg-black/[0.04] px-2 py-0.5 rounded-md">
                npm install @kyvernlabs/pulse
              </code>
              {" "}→ wrap your handler → every payment captured automatically.
              Payer wallet, USDC amount, blockchain tx hash. Your data only — SIWE-secured.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/pulse/dashboard/setup"
                className="group inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-foreground text-background text-[13px] font-semibold hover:bg-foreground/90 transition-all duration-300"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
              >
                Setup Guide
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/pulse#pricing"
                className="inline-flex items-center h-11 px-6 rounded-xl border border-black/[0.08] text-[13px] font-medium text-secondary hover:text-primary hover:border-black/[0.16] transition-all duration-300"
              >
                View Pricing
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.12, ease }}
          >
            <CodeBlock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
