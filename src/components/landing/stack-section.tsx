"use client";

/* ════════════════════════════════════════════════════════════════════
   StackSection — the visual moment. Two primitives side-by-side.
   This is where a judge "gets it" in 5 seconds:

     LEFT   VAULT  · agents pay safely      · @kyvernlabs/sdk
     RIGHT  PULSE · services see revenue   · @kyvernlabs/pulse
     BOTH   enforced by the same Kyvern + Squads v4 programs on Solana

   Design cues from Linear's feature grids, Stripe's api-overview, Vercel's
   typography system. White surface, 0.5px borders, soft shadows, mono
   numerics. No gradients. Motion triggered on viewport enter, not on load —
   keeps the hero cinematic and this section calm.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { ArrowDownUp, Check, Sparkles } from "lucide-react";
import { EASE_PREMIUM as ease } from "@/lib/motion";

export function StackSection() {
  return (
    <section
      id="stack"
      className="relative py-20 md:py-28"
      style={{ background: "var(--background)" }}
    >
      {/* Subtle top/bottom gradient cutoffs so the section sits visually
          between the hero (dark bottom demo) and the manifesto (darker).
          Zero noise. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-24"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.55, ease }}
          className="mb-6 flex justify-center"
        >
          <span
            className="section-label inline-flex items-center gap-1.5"
            style={{ color: "var(--text-quaternary)" }}
          >
            <Sparkles className="h-3 w-3" />
            The stack
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease }}
          className="mx-auto max-w-[720px] text-center text-balance"
          style={{
            fontSize: "clamp(32px, 5vw, 54px)",
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            color: "var(--text-primary)",
          }}
        >
          An agent you can actually leave running.
          <br />
          <span style={{ color: "var(--text-tertiary)", fontWeight: 300 }}>
            With a safety layer the chain enforces.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.12, ease }}
          className="mx-auto mt-4 max-w-[620px] text-center text-[15px] leading-[1.55]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Deploy an agent once and let it operate real money on Solana
          autonomously for days. Kyvern replaces the private key with a policy
          PDA — budgets, allowlists, velocity, memo requirements — all enforced
          by consensus before a tx ever signs. Every inbound payment a Kyvern
          agent makes is also verifiable at the service on the other side.
        </motion.p>

        {/* The two cards */}
        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {/* Policy PDA · autonomy primitive */}
          <PrimitiveCard
            index={0}
            accent="var(--agent)"
            accentBg="var(--agent-bg)"
            chip="Kyvern · policy program"
            title="Your agent is a program. Give it boundaries."
            subtitle="Every agent gets a policy PDA on Solana: budgets, allowlist, velocity, memo, kill-switch. Over-budget or off-allowlist calls revert as real failed transactions before a single token moves."
            code={`import { OnChainVault } from "@kyvernlabs/sdk";

const vault = new OnChainVault({ multisig, spendingLimit, connection });

const res = await vault.pay({
  agent,
  recipient,
  amount: 0.50,
  merchant: "api.openai.com",
  memo: "chat completion",
});

// res.decision === "allowed" | "blocked"
// res.explorerUrl → Solana tx, verifiable`}
            bullets={[
              "Agent keypair bound to policy PDA",
              "Per-tx + daily + weekly caps enforced on-chain",
              "Merchant allowlist (hashed)",
              "Kill switch — halts every future tx in one call",
            ]}
          />

          {/* Pulse · reputation layer — a consequence of Kyvern, not a sibling product */}
          <PrimitiveCard
            index={1}
            accent="var(--revenue)"
            accentBg="var(--revenue-bg)"
            chip="Kyvern · reputation layer"
            title="Every paying agent carries its history."
            subtitle="When a Kyvern-protected agent pays your service, you see more than an address. You see its policy, its uptime, its on-chain track record — the first reputation primitive for autonomous software."
            code={`import { withPulse } from "@kyvernlabs/pulse";
import { withX402 } from "@x402/next";

export const GET = withPulse(
  withX402(handler, priceConfig),
  { apiKey: "kv_live_..." }
);

// Your agent customers show up in the dashboard
// seconds after they pay. Every row linked to Explorer.`}
            bullets={[
              "Real-time inbound payment feed",
              "Per-agent identity + policy context",
              "Uptime + reliability score per payer",
              "Every row linked to Solana Explorer",
            ]}
          />
        </div>

        {/* Connector — visually ties both cards to the same on-chain infra */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11.5px]"
            style={{
              background: "var(--surface-2)",
              border: "0.5px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <ArrowDownUp className="h-3 w-3" />
            Both primitives resolve to the same Solana transaction
          </div>
          <p
            className="max-w-[520px] text-center text-[13px] leading-[1.6]"
            style={{ color: "var(--text-tertiary)" }}
          >
            When an agent with a Kyvern vault pays a service wrapped in Kyvern
            Pulse, both the payer dashboard and the merchant dashboard show the
            exact same Solana signature. That&apos;s the full loop — on-chain,
            end-to-end, verifiable.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Card ─── */

function PrimitiveCard({
  index,
  accent,
  accentBg,
  chip,
  title,
  subtitle,
  code,
  bullets,
}: {
  index: number;
  accent: string;
  accentBg: string;
  chip: string;
  title: string;
  subtitle: string;
  code: string;
  bullets: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: 0.1 + index * 0.08, ease }}
      className="relative flex flex-col overflow-hidden rounded-[22px]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.02), 0 20px 60px -28px rgba(0,0,0,0.10)",
      }}
    >
      {/* Accent rail */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: accent }}
      />

      {/* Header */}
      <div className="px-7 pt-7 pb-5">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
          style={{
            background: accentBg,
            color: accent,
          }}
        >
          <span
            className="inline-block h-1 w-1 rounded-full"
            style={{ background: accent }}
          />
          {chip}
        </div>
        <h3
          className="mb-3 text-balance"
          style={{
            fontSize: "24px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h3>
        <p
          className="text-[14px] leading-[1.55] text-balance"
          style={{ color: "var(--text-tertiary)" }}
        >
          {subtitle}
        </p>
      </div>

      {/* Code */}
      <div
        className="mx-6 rounded-[14px] overflow-hidden"
        style={{
          background: "#0B0B0F",
          border: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <pre
          className="m-0 overflow-x-auto px-5 py-4 text-[12px] leading-[1.65] font-mono-numbers"
          style={{ color: "#E4E4E7" }}
        >
          <code>{code}</code>
        </pre>
      </div>

      {/* Bullets */}
      <ul className="px-7 pb-7 pt-5 space-y-2.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2.5 text-[13px]"
            style={{ color: "var(--text-secondary)" }}
          >
            <span
              className="mt-[2px] inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: accentBg }}
            >
              <Check
                className="h-2.5 w-2.5"
                style={{ color: accent }}
                strokeWidth={3}
              />
            </span>
            {b}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
