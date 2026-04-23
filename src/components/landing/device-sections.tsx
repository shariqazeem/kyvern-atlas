"use client";

/**
 * Dark-themed landing sections that flow below the DeviceHero.
 * Matches the matte-black + OLED green aesthetic of the device.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";
import { EASE_PREMIUM as ease, EASE_SPRING as spring } from "@/lib/motion";

/* ── How It Works ──────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Create a device",
    body: "A Squads multisig vault with a Kyvern policy program. Set your budget, allowlist, velocity limits. Fund it with USDC. 60 seconds.",
    accent: "#00ff88",
  },
  {
    n: "02",
    title: "Give it to your agent",
    body: "One API key. Drop @kyvernlabs/sdk into your agent. Every vault.pay() submits a real Solana transaction — the on-chain program enforces every rule.",
    accent: "#00ccff",
  },
  {
    n: "03",
    title: "Watch it run",
    body: "Every payment, every block, every attack — visible on your device in real-time. Kill switch always ready. Solana Explorer receipts for everything.",
    accent: "#aa88ff",
  },
];

export function HowItWorks() {
  return (
    <section
      className="py-20 md:py-28 px-4"
      style={{ background: "#050505" }}
    >
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          <p
            className="font-mono text-[10px] font-semibold tracking-[0.2em] mb-3"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            HOW IT WORKS
          </p>
          <h2
            className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.02em] leading-[1.15]"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            Three steps. Real on-chain enforcement.
          </h2>
        </motion.div>

        <div className="mt-12 space-y-8">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.6, ease }}
              className="flex gap-5"
            >
              <div
                className="shrink-0 w-10 h-10 rounded-[12px] flex items-center justify-center font-mono text-[13px] font-bold"
                style={{
                  background: `${step.accent}0f`,
                  color: step.accent,
                  border: `1px solid ${step.accent}20`,
                }}
              >
                {step.n}
              </div>
              <div>
                <h3
                  className="text-[17px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="mt-1.5 text-[14px] leading-[1.6] max-w-lg"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Developer / SDK Section ───────────────────────────────────── */

const SDK_CODE = `import { Vault } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: process.env.KYVERN_KEY });

const result = await vault.pay({
  merchant: "api.openai.com",
  recipientPubkey: "5eyKt...",
  amount: 0.12,
  memo: "forecast lookup",
});

// { decision: "allowed", txSignature: "4Ym..." }`;

export function DeveloperSection() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(SDK_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      className="py-20 md:py-28 px-4"
      style={{
        background: "#050505",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          <p
            className="font-mono text-[10px] font-semibold tracking-[0.2em] mb-3"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            FOR DEVELOPERS
          </p>
          <h2
            className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.02em] leading-[1.15]"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            Five lines. Any agent framework.
          </h2>
          <p
            className="mt-3 text-[15px] leading-[1.6] max-w-lg"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Works with SendAI, ElizaOS, LangChain, Vercel AI SDK, or any
            agent that makes HTTP calls. Published on npm. Zero runtime
            dependencies.
          </p>
        </motion.div>

        {/* Code block */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ delay: 0.15, duration: 0.6, ease }}
          className="mt-8 relative rounded-[16px] overflow-hidden"
          style={{
            background: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-white/30">
                agent.ts
              </span>
            </div>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-[11px] font-mono transition-colors"
              style={{ color: copied ? "#00ff88" : "rgba(255,255,255,0.25)" }}
            >
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Code */}
          <pre className="p-4 overflow-x-auto">
            <code
              className="font-mono text-[12px] sm:text-[13px] leading-[1.7]"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              {SDK_CODE}
            </code>
          </pre>
        </motion.div>

        {/* Install pill */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-4 flex items-center gap-3"
        >
          <code
            className="font-mono text-[12px] px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.4)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            npm install @kyvernlabs/sdk
          </code>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 text-[12px] font-medium transition-colors"
            style={{ color: "#00ff88" }}
          >
            Read the docs
            <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Why Solana ────────────────────────────────────────────────── */

const REASONS = [
  {
    stat: "400ms",
    label: "Time to finality",
    detail: "Agent payments clear instantly. No 15-second Ethereum waits.",
  },
  {
    stat: "$0.00025",
    label: "Average tx fee",
    detail: "Agent economics collapse on expensive chains. Solana makes them viable.",
  },
  {
    stat: "Program",
    label: "On-chain enforcement",
    detail:
      "Spending rules are enforced by a Solana program the agent cannot bypass. Not server checks. Not promises.",
  },
];

export function WhySolanaSection() {
  return (
    <section
      className="py-20 md:py-28 px-4"
      style={{
        background: "#050505",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
        >
          <p
            className="font-mono text-[10px] font-semibold tracking-[0.2em] mb-3"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            WHY SOLANA
          </p>
          <h2
            className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.02em] leading-[1.15]"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            The only chain fast enough for agents.
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-6">
          {REASONS.map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.5, ease }}
              className="flex items-start gap-5 p-5 rounded-[16px]"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span
                className="font-mono text-[20px] font-bold shrink-0 mt-0.5"
                style={{ color: "#00ff88" }}
              >
                {r.stat}
              </span>
              <div>
                <h3
                  className="text-[15px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  {r.label}
                </h3>
                <p
                  className="mt-1 text-[13px] leading-[1.55]"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {r.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ─────────────────────────────────────────────────── */

export function DeviceCTA() {
  return (
    <section
      className="py-24 md:py-32 px-4 text-center"
      style={{
        background: "#050505",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: spring }}
        className="mx-auto max-w-lg"
      >
        <h2
          className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.02em] leading-[1.15]"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          Give your agent its own device.
        </h2>
        <p
          className="mt-3 text-[15px] leading-[1.6]"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          60 seconds. No wallet extension. No npm install needed for the
          device. Just open the URL and your agent has spending rules
          enforced on Solana.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/vault/new"
            className="group inline-flex items-center gap-2 h-12 px-7 rounded-full font-semibold text-[15px] transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "#00ff88",
              color: "#000",
            }}
          >
            Create a device
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-full font-semibold text-[15px] transition-colors"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Read the docs
          </Link>
        </div>
      </motion.div>

      {/* Footer */}
      <div
        className="mt-20 pt-8 mx-auto max-w-3xl"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center justify-center gap-6">
          <span
            className="font-mono text-[11px] font-bold tracking-[0.15em]"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            KYVERN
          </span>
          <a
            href="https://github.com/shariqazeem/kyvern-atlas"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] transition-colors"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            GitHub
          </a>
          <Link
            href="/docs"
            className="text-[12px] transition-colors"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Docs
          </Link>
          <Link
            href="/atlas"
            className="text-[12px] transition-colors"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Atlas
          </Link>
        </div>
        <p
          className="mt-4 text-[11px]"
          style={{ color: "rgba(255,255,255,0.1)" }}
        >
          Built on Solana. Powered by Squads Protocol.
        </p>
      </div>
    </section>
  );
}
