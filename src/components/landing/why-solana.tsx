"use client";

/* ════════════════════════════════════════════════════════════════════
   Why Solana + Built on Squads — the credibility section.
   Why this product can only exist on this chain, with this foundation.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";

const ease = [0.25, 0.1, 0.25, 1] as const;

const STATS = [
  { value: "$0.00025", label: "Avg Solana tx fee" },
  { value: "400ms", label: "Time to finality" },
  { value: "$10B+", label: "Secured by Squads" },
  { value: "3×", label: "Audits (ToB, OtterSec, Neodyme)" },
];

export function WhySolana() {
  return (
    <section className="py-20 md:py-28 relative">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--border), transparent)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-14 lg:gap-24 items-start">
          {/* Left: narrative */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease }}
              className="mb-6"
            >
              <div className="section-label">Why Solana. Why Squads.</div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease }}
              className="text-balance mb-8"
              style={{
                fontSize: "clamp(32px, 5vw, 58px)",
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
                fontWeight: 500,
              }}
            >
              A $1 agent budget is uneconomical on any other chain.
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.1, ease }}
              className="space-y-5 text-[16px] leading-[1.65]"
              style={{ color: "var(--text-secondary)" }}
            >
              <p>
                Micro-budgets need micro-fees. Solana&apos;s sub-cent
                transaction cost and 400ms finality is the only chain where
                it&apos;s sane to hand an agent a ten-dollar weekly allowance
                and let it spend it one request at a time — and where a
                service can afford to write every tiny inbound payment to a
                real on-chain receipt.
              </p>
              <p>
                We don&apos;t reinvent custody. Every Kyvern vault is a{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Squads v4 smart account
                </span>
                — audited three times, securing over $10B across Jito, Pyth,
                Helium, and hundreds of DAOs. Our Kyvern policy program layers
                merchant, velocity, memo, and pause enforcement on top, then
                CPIs into Squads&apos; native spending-limit primitive. Two
                programs, one atomic transaction.
              </p>
              <p>
                And on the receiving side, Pulse reads that same Solana
                transaction — verifies it against Explorer, attributes it to
                the paying agent, and drops it into the merchant&apos;s
                revenue feed seconds after it lands.
              </p>
              <p
                className="pt-2 text-[14px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                You inherit Squads&apos; security. We inherit the trust. Both
                sides see the same signature.
              </p>
            </motion.div>
          </div>

          {/* Right: stat grid */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease }}
                className="card p-6 md:p-7"
              >
                <div
                  className="font-mono-numbers mb-2"
                  style={{
                    fontSize: "clamp(28px, 4vw, 40px)",
                    fontWeight: 300,
                    letterSpacing: "-0.035em",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="text-[12.5px] leading-snug"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
