"use client";

/* ════════════════════════════════════════════════════════════════════
   Manifesto — The emotional spine of the product
   Three principles. Apple-minimalist. Black on white.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Wallet, ShieldCheck, Activity, Power } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

type Principle = {
  icon: typeof Wallet;
  eyebrow: string;
  title: string;
  body: string;
};

const PRINCIPLES: Principle[] = [
  {
    icon: Wallet,
    eyebrow: "Budgets",
    title: "Hard limits, not soft guidelines.",
    body:
      "Every vault has a daily ceiling, a per-transaction max, and a velocity cap — enforced by our Anchor program before the tx reaches Squads. Over-cap calls fail as real failed Solana transactions with specific error codes.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Policies",
    title: "Who the agent can pay, not just how much.",
    body:
      "Merchant allowlist hashed on-chain. Memo requirement enforced on-chain. Velocity window tracked on-chain. Every rule runs inside a Solana program — not a Next.js route handler pretending to be enforcement.",
  },
  {
    icon: Activity,
    eyebrow: "Revenue",
    title: "The other side of the transaction.",
    body:
      "When an agent pays your service, Kyvern Pulse captures the payment — payer, amount, tx hash, verified against Solana Explorer. Your dashboard ticks up in real time. The same signature your agent signed is the row on your payout report.",
  },
  {
    icon: Power,
    eyebrow: "Kill switch",
    title: "One call. Every payment reverts. On-chain.",
    body:
      "Something feels off? Flip the pause flag on the policy PDA. Every subsequent `execute_payment` fails immediately with `VaultPaused` — Solana consensus rejects it, not our server. Not a ticket. Not an email. A program-level kill.",
  },
];

export function Manifesto() {
  return (
    <section className="py-28 md:py-36 relative">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease }}
          className="mb-6"
        >
          <div className="section-label">The product</div>
        </motion.div>

        {/* Huge statement */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
          className="text-balance mb-20 md:mb-28"
          style={{
            fontSize: "clamp(32px, 5.5vw, 62px)",
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            fontWeight: 500,
            maxWidth: "900px",
          }}
        >
          Give an agent a full wallet and it might spend{" "}
          <span style={{ color: "var(--destructive)" }}>$4,800 in 11 minutes</span> on a
          recursive bug. Give it a Kyvern vault and it simply can&apos;t — and your
          service sees every cent it did spend, verified on-chain.
        </motion.h2>

        {/* Four principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRINCIPLES.map((p, i) => (
            <motion.div
              key={p.eyebrow}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.12, ease }}
              className="card p-8"
            >
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-6"
                style={{ background: "var(--surface-2)" }}
              >
                <p.icon className="w-[18px] h-[18px]" strokeWidth={1.6} />
              </div>
              <div className="section-label mb-2.5">{p.eyebrow}</div>
              <h3
                className="mb-3 text-balance"
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  letterSpacing: "-0.025em",
                }}
              >
                {p.title}
              </h3>
              <p
                className="text-[14.5px] leading-[1.6]"
                style={{ color: "var(--text-secondary)" }}
              >
                {p.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
