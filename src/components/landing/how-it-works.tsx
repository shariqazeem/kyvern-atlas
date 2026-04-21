"use client";

/* ════════════════════════════════════════════════════════════════════
   How It Works — 3 steps + one code snippet.
   Minimalist, numbered, no clutter.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const ease = [0.25, 0.1, 0.25, 1] as const;

const STEPS = [
  {
    n: "01",
    title: "Create a vault.",
    body:
      "Pick a daily budget, per-transaction cap, merchant allowlist, velocity limit. Your vault is a Squads smart account + our Kyvern policy PDA. Fund with USDC from any Solana wallet — we never custody.",
  },
  {
    n: "02",
    title: "Deploy your agent.",
    body:
      "Generate an agent keypair. We delegate it into the Squads spending limit. Drop `@kyvernlabs/sdk` into your agent code — every `vault.pay(...)` submits a real Solana transaction that either lands or fails with a program error.",
  },
  {
    n: "03",
    title: "Sell to it.",
    body:
      "Wrap your x402 endpoint with `@kyvernlabs/pulse`. When Kyvern-protected agents pay you, the payment shows up in your dashboard seconds later — payer address, amount, Solana tx link, verified on-chain. Both sides see the same signature.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="py-28 md:py-36 relative">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--border), transparent)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="mb-20 md:mb-24 max-w-[820px]"
        >
          <div className="section-label mb-5">How it works</div>
          <h2
            className="text-balance"
            style={{
              fontSize: "clamp(36px, 5.5vw, 68px)",
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              fontWeight: 500,
            }}
          >
            Three steps. One stack. Both sides of agent commerce.
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-14 lg:gap-20 items-start">
          {/* Left: steps */}
          <div className="space-y-12 lg:space-y-14">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease }}
                className="relative"
              >
                <div className="flex items-start gap-6">
                  <div
                    className="font-mono-numbers text-[15px] font-medium pt-1 flex-shrink-0"
                    style={{ color: "var(--text-quaternary)" }}
                  >
                    {s.n}
                  </div>
                  <div className="flex-1">
                    <h3
                      className="mb-3"
                      style={{
                        fontSize: "26px",
                        fontWeight: 600,
                        letterSpacing: "-0.025em",
                        lineHeight: 1.15,
                      }}
                    >
                      {s.title}
                    </h3>
                    <p
                      className="text-[15.5px] leading-[1.65] max-w-[480px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {s.body}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.4, ease }}
              className="pt-4"
            >
              <Link
                href="/docs"
                className="group inline-flex items-center gap-2 text-[14px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Read the docs
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>

          {/* Right: code card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease }}
            className="card-elevated overflow-hidden lg:sticky lg:top-24"
          >
            {/* Code header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
                <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
                <div className="w-3 h-3 rounded-full bg-black/[0.06]" />
              </div>
              <span
                className="text-[11px] font-mono-numbers"
                style={{ color: "var(--text-tertiary)" }}
              >
                research-agent.ts
              </span>
              <div className="w-[52px]" />
            </div>

            {/* Code body */}
            <div className="p-6 lg:p-7" style={{ background: "#0B0B0C" }}>
              <pre
                className="text-[12.5px] leading-[1.85] font-mono-numbers"
                style={{ color: "#E4E4E7" }}
              >
                <span style={{ color: "#6E7681" }}>{"// the agent paying"}</span>
                {"\n"}
                <span style={{ color: "#C586C0" }}>import</span>{" "}
                <span style={{ color: "#9CDCFE" }}>{"{ OnChainVault }"}</span>{" "}
                <span style={{ color: "#C586C0" }}>from</span>{" "}
                <span style={{ color: "#CE9178" }}>{"\"@kyvernlabs/sdk\""}</span>
                {"\n\n"}
                <span style={{ color: "#C586C0" }}>const</span>{" "}
                <span style={{ color: "#9CDCFE" }}>vault</span> ={" "}
                <span style={{ color: "#C586C0" }}>new</span>{" "}
                <span style={{ color: "#4EC9B0" }}>OnChainVault</span>({"{\n  "}
                <span style={{ color: "#9CDCFE" }}>cluster</span>:{" "}
                <span style={{ color: "#CE9178" }}>{"\"devnet\""}</span>,{"\n  "}
                <span style={{ color: "#9CDCFE" }}>connection</span>,{" "}
                <span style={{ color: "#9CDCFE" }}>multisig</span>,{" "}
                <span style={{ color: "#9CDCFE" }}>spendingLimit</span>
                {"\n}"})
                {"\n\n"}
                <span style={{ color: "#C586C0" }}>const</span>{" "}
                <span style={{ color: "#9CDCFE" }}>res</span> ={" "}
                <span style={{ color: "#C586C0" }}>await</span>{" "}
                <span style={{ color: "#9CDCFE" }}>vault</span>.
                <span style={{ color: "#DCDCAA" }}>pay</span>({"{\n  "}
                <span style={{ color: "#9CDCFE" }}>agent</span>,{" "}
                <span style={{ color: "#9CDCFE" }}>recipient</span>,{" "}
                <span style={{ color: "#9CDCFE" }}>amount</span>:{" "}
                <span style={{ color: "#B5CEA8" }}>0.5</span>,{"\n  "}
                <span style={{ color: "#9CDCFE" }}>merchant</span>:{" "}
                <span style={{ color: "#CE9178" }}>{"\"api.openai.com\""}</span>,{"\n  "}
                <span style={{ color: "#9CDCFE" }}>memo</span>:{" "}
                <span style={{ color: "#CE9178" }}>{"\"forecast\""}</span>
                {"\n}"})
                {"\n\n"}
                <span style={{ color: "#6E7681" }}>{"// res.decision ∈ { \"allowed\", \"blocked\" }"}</span>
                {"\n"}
                <span style={{ color: "#6E7681" }}>{"// res.explorerUrl → Solana tx — real"}</span>
                {"\n\n"}
                <span style={{ color: "#6E7681" }}>{"// the service receiving (one line)"}</span>
                {"\n"}
                <span style={{ color: "#C586C0" }}>export</span>{" "}
                <span style={{ color: "#C586C0" }}>const</span>{" "}
                <span style={{ color: "#9CDCFE" }}>GET</span> ={" "}
                <span style={{ color: "#DCDCAA" }}>withPulse</span>(
                <span style={{ color: "#9CDCFE" }}>handler</span>,{" "}
                <span style={{ color: "#9CDCFE" }}>{"{ apiKey }"}</span>)
              </pre>
            </div>

            {/* Footer strip */}
            <div
              className="px-5 py-3.5 flex items-center justify-between text-[11.5px] font-mono-numbers"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-tertiary)",
                borderTop: "0.5px solid var(--border-subtle)",
              }}
            >
              <span>one sdk · both sides</span>
              <span>~60 seconds to ship</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
