"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Copy, Check, Package } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

const CODE_RAW = `import { withPulse } from '@kyvernlabs/pulse'
import { withX402 } from '@x402/next'

// That's it. One line wraps your handler.
export const GET = withPulse(
  withX402(handler, x402Config, server),
  { apiKey: 'kv_live_a8Bx...' }
)`;

function CodeBlock() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(CODE_RAW);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="relative">
      <div
        className="bg-[#09090B] overflow-hidden"
        style={{
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 24px 48px rgba(0,0,0,0.2)",
        }}
      >
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-medium text-white/40 hover:text-white/70 transition-all duration-200"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="p-6 lg:p-7">
          <pre className="text-[13px] lg:text-[14px] font-mono leading-[1.8] overflow-x-auto">
            <code>
              <span className="text-purple-400">import</span>
              <span className="text-gray-300">{" { "}</span>
              <span className="text-blue-400">withPulse</span>
              <span className="text-gray-300">{" } "}</span>
              <span className="text-purple-400">from</span>
              <span className="text-emerald-400">{" '@kyvernlabs/pulse'"}</span>
              {"\n"}
              <span className="text-purple-400">import</span>
              <span className="text-gray-300">{" { "}</span>
              <span className="text-blue-400">withX402</span>
              <span className="text-gray-300">{" } "}</span>
              <span className="text-purple-400">from</span>
              <span className="text-emerald-400">{" '@x402/next'"}</span>
              {"\n\n"}
              <span className="text-gray-500">{"// That's it. One line wraps your handler."}</span>
              {"\n"}
              <span className="text-purple-400">export const</span>
              <span className="text-gray-300">{" GET = "}</span>
              <span className="text-blue-400">withPulse</span>
              <span className="text-gray-400">{"("}</span>
              {"\n"}
              <span className="text-gray-400">{"  "}</span>
              <span className="text-blue-400">withX402</span>
              <span className="text-gray-400">{"(handler, x402Config, server),"}</span>
              {"\n"}
              <span className="text-gray-400">{"  "}</span>
              <span className="text-gray-400">{"{ "}</span>
              <span className="text-gray-300">apiKey</span>
              <span className="text-gray-400">{": "}</span>
              <span className="text-emerald-400">{"'kv_live_a8Bx...'"}</span>
              <span className="text-gray-400">{" }"}</span>
              {"\n"}
              <span className="text-gray-400">{")"}</span>
            </code>
          </pre>
        </div>
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
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="section-label mb-5">For developers</p>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-[-0.04em] leading-[0.95]">
              One line of code.
              <br />
              <span className="text-[var(--text-tertiary)]">Full business intelligence.</span>
            </h2>
            <p className="mt-6 text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-md">
              <code className="text-[13px] font-mono bg-[var(--surface-2)] px-2 py-0.5 rounded-[8px]">
                npm install @kyvernlabs/pulse
              </code>
              {" "}&rarr; wrap your handler &rarr; every Solana payment captured automatically.
              Payer wallet, USDC amount, SPL token, tx signature. All verified on-chain.
            </p>

            <div className="mt-4 space-y-2">
              {[
                "Works with Next.js, Express, Hono, and Cloudflare Workers",
                "Fire-and-forget — never blocks your API response",
                "17 MCP tools for AI agents to query their own revenue",
              ].map((point, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.08, ease }}
                  className="flex items-center gap-2.5 text-[13px] text-[var(--text-secondary)]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  {point}
                </motion.p>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/pulse/dashboard/setup"
                className="btn-primary h-11 px-6 text-[13px]"
              >
                Setup Guide
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="https://www.npmjs.com/package/@kyvernlabs/pulse"
                className="btn-secondary h-11 px-6 text-[13px]"
                target="_blank"
              >
                View on npm
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
          >
            <CodeBlock />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
