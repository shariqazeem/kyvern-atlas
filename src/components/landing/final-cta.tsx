"use client";

/* ════════════════════════════════════════════════════════════════════
   Final CTA — one last clear ask, nothing else.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

export function FinalCTA() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-dot-grid opacity-50"
        style={{
          maskImage:
            "radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 90%)",
        }}
      />

      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease }}
          className="text-balance mb-8"
          style={{
            fontSize: "clamp(40px, 7vw, 88px)",
            lineHeight: 1,
            letterSpacing: "-0.045em",
            fontWeight: 500,
          }}
        >
          Stop handing AI agents
          <br />
          <span style={{ fontWeight: 700 }}>the private keys.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.15, ease }}
          className="mx-auto max-w-[600px] text-[17px] leading-[1.5] mb-10 text-balance"
          style={{ color: "var(--text-secondary)" }}
        >
          Deploy an agent in 60 seconds. Give it real USDC. Set the rules
          on-chain. Let it run for days — your treasury stays safe whether
          you&rsquo;re watching or not. Kyvern is the authorization layer for
          the agentic internet{" "}
          <span style={{ color: "var(--text-tertiary)" }}>
            Solana is already building.
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.25, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link href="/vault/new" className="btn-primary group">
            Deploy your first agent
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/app"
            className="btn-secondary"
            style={{ background: "var(--surface)" }}
          >
            Open the dashboard →
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.45, ease }}
          className="mt-16 text-[12.5px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Kyvern policy program + Squads v4 · live on Solana devnet · pre-alpha
        </motion.div>
      </div>
    </section>
  );
}
