"use client";

/**
 * OS Landing — white, minimal, Apple-grade.
 * Shows the KyvernOS concept with live Atlas data as proof.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { AtlasSnapshot } from "@/lib/atlas/ssr";
import { EASE_PREMIUM as ease, EASE_SPRING as spring } from "@/lib/motion";
import { fmtUptime } from "@/lib/format";

interface Props {
  initialAtlas: AtlasSnapshot;
}

export function LandingPage({ initialAtlas }: Props) {
  const s = initialAtlas.state;
  const [uptime, setUptime] = useState(s?.uptimeMs ?? 0);

  useEffect(() => {
    if (!s?.firstIgnitionAt) return;
    const iv = setInterval(() => {
      setUptime(Date.now() - new Date(s.firstIgnitionAt!).getTime());
    }, 1000);
    return () => clearInterval(iv);
  }, [s?.firstIgnitionAt]);

  return (
    <div className="min-h-screen" style={{ background: "#FAFAFA" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 sm:px-8 h-14 max-w-[1100px] mx-auto">
        <span className="text-[13px] font-semibold tracking-tight text-[#111]">
          Kyvern
        </span>
        <div className="flex items-center gap-5">
          <Link href="/atlas" className="text-[13px] text-[#6B7280] hover:text-[#111] transition-colors">
            Atlas
          </Link>
          <Link href="/docs" className="text-[13px] text-[#6B7280] hover:text-[#111] transition-colors">
            Docs
          </Link>
          <Link
            href="/app"
            className="h-8 px-4 rounded-[10px] text-[12px] font-semibold inline-flex items-center transition-all hover:opacity-90"
            style={{ background: "#111", color: "#fff" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: spring }}
          className="max-w-[600px]"
        >
          <p className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-4">
            For AI agent builders on Solana
          </p>
          <h1
            className="text-[40px] sm:text-[52px] font-semibold tracking-[-0.035em] leading-[1.05]"
            style={{ color: "#111" }}
          >
            Your agent can spend.
            <br />
            <span style={{ color: "#9CA3AF" }}>Only what you allow.</span>
          </h1>
          <p className="mt-5 text-[17px] leading-[1.65] max-w-[480px]" style={{ color: "#6B7280" }}>
            Kyvern gives every AI agent a wallet with on-chain spending rules.
            Budgets, allowlists, velocity limits, kill switch — enforced by a
            Solana program, not a promise.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-[12px] text-[15px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#111", color: "#fff" }}
            >
              Get started
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/atlas"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-[12px] text-[15px] font-medium transition-colors"
              style={{ color: "#6B7280", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              Watch Atlas live
            </Link>
          </div>
        </motion.div>

        {/* Atlas proof strip */}
        {s && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease }}
            className="mt-12 rounded-[16px] px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-2"
            style={{
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex items-center gap-2">
              <motion.span
                className="w-[6px] h-[6px] rounded-full"
                style={{ background: "#22C55E" }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[12px] font-medium text-[#111]">Atlas is live</span>
            </div>
            <Stat label="Uptime" value={fmtUptime(uptime)} />
            <Stat label="Transactions" value={String(s.totalSettled)} />
            <Stat label="Attacks blocked" value={String(s.totalAttacksBlocked)} />
            <Stat label="Funds lost" value="$0" accent="#22C55E" />
          </motion.div>
        )}
      </section>

      {/* How it works */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.025em] text-[#111]">
            Three steps. Real enforcement.
          </h2>
        </motion.div>
        <div className="mt-10 grid sm:grid-cols-3 gap-6">
          {[
            { n: "01", title: "Create a device", body: "A Squads multisig with a Kyvern policy program. Set budget, allowlist, limits. Fund with USDC. 60 seconds." },
            { n: "02", title: "Connect your agent", body: "One API key. Drop @kyvernlabs/sdk into your agent code. Every vault.pay() is a real Solana transaction." },
            { n: "03", title: "Watch it run", body: "Every payment visible in real-time. Kill switch always ready. Solana Explorer receipts for everything." },
          ].map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease }}
              className="rounded-[20px] p-5"
              style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.05)" }}
            >
              <span className="text-[12px] font-mono font-semibold text-[#9CA3AF]">{step.n}</span>
              <h3 className="mt-2 text-[16px] font-semibold text-[#111]">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.6] text-[#6B7280]">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SDK */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="flex-1"
          >
            <p className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">
              For developers
            </p>
            <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.025em] text-[#111]">
              Five lines. Any framework.
            </h2>
            <p className="mt-3 text-[15px] leading-[1.6] text-[#6B7280] max-w-md">
              SendAI, ElizaOS, LangChain, Vercel AI SDK, or any agent that makes
              HTTP calls. Published on npm. Zero runtime dependencies.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <code className="text-[12px] font-mono text-[#6B7280] bg-[#F3F4F6] px-3 py-1.5 rounded-[8px]">
                npm i @kyvernlabs/sdk
              </code>
              <Link href="/docs" className="text-[12px] font-medium text-[#111] hover:underline">
                Read the docs →
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5, ease }}
            className="flex-1 w-full rounded-[16px] overflow-hidden"
            style={{ background: "#111" }}
          >
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-[11px] font-mono text-white/40">agent.ts</span>
            </div>
            <pre className="p-4 overflow-x-auto">
              <code className="text-[12px] sm:text-[13px] font-mono leading-[1.7] text-white/70">{`import { Vault } from "@kyvernlabs/sdk";

const vault = new Vault({
  agentKey: process.env.KYVERN_KEY
});

const result = await vault.pay({
  merchant: "api.openai.com",
  amount: 0.12,
  memo: "forecast lookup",
});
// { decision: "allowed", txSignature: "4Ym..." }`}</code>
            </pre>
          </motion.div>
        </div>
      </section>

      {/* Why Solana */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-3">Why Solana</p>
          <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.025em] text-[#111]">
            The only chain fast enough for agents.
          </h2>
        </motion.div>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {[
            { stat: "400ms", label: "Finality", detail: "Agent payments clear instantly." },
            { stat: "$0.00025", label: "Avg fee", detail: "Agent economics actually work." },
            { stat: "Program", label: "Enforcement", detail: "Rules the agent cannot bypass." },
          ].map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4, ease }}
              className="rounded-[16px] p-5"
              style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.05)" }}
            >
              <p className="text-[22px] font-semibold font-mono text-[#111]">{r.stat}</p>
              <p className="text-[13px] font-medium text-[#6B7280] mt-1">{r.label}</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">{r.detail}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-20 text-center" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: spring }}
        >
          <h2 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.025em] text-[#111]">
            Give your agent its own wallet.
          </h2>
          <p className="mt-3 text-[15px] text-[#6B7280] max-w-md mx-auto leading-[1.6]">
            60 seconds. Real on-chain enforcement. No wallet extension needed.
          </p>
          <Link
            href="/app"
            className="group mt-6 inline-flex items-center gap-2 h-12 px-7 rounded-[12px] text-[15px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#111", color: "#fff" }}
          >
            Get started
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="max-w-[1100px] mx-auto px-5 sm:px-8 py-8 flex items-center justify-between" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <span className="text-[12px] text-[#9CA3AF]">Kyvern · Built on Solana</span>
        <div className="flex items-center gap-4">
          <a href="https://github.com/shariqazeem/kyvern-atlas" target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280]">GitHub</a>
          <Link href="/docs" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280]">Docs</Link>
          <Link href="/atlas" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280]">Atlas</Link>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">{label}</p>
      <p className="text-[14px] font-semibold font-mono" style={{ color: accent ?? "#111" }}>{value}</p>
    </div>
  );
}
