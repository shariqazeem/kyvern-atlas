"use client";

/* ════════════════════════════════════════════════════════════════════
   Kyvern Hero — "Let your AI agents run free."
   Word-by-word headline reveal, live Atlas observatory as the proof.
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AtlasObservatory } from "./atlas-observatory";
import type { AtlasSnapshot } from "@/lib/atlas/ssr";
import { EASE_PREMIUM as ease, EASE_SPRING as spring } from "@/lib/motion";

/* ── Word-by-word headline reveal ── */
function WordReveal({
  text,
  className,
  delay = 0,
  weight = 600,
}: {
  text: string;
  className?: string;
  delay?: number;
  weight?: number;
}) {
  const words = text.split(" ");
  return (
    <motion.span
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08, delayChildren: delay } },
      }}
      className={className}
      style={{ fontWeight: weight }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={{
            hidden: { opacity: 0, y: 28, filter: "blur(14px)" },
            show: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.9, ease: spring },
            },
          }}
          className="inline-block mr-[0.28em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}


/* ════════════════════════════════════════════════════════════════════
   The Hero
   ════════════════════════════════════════════════════════════════════ */

export function Hero({
  initialAtlasState,
}: {
  initialAtlasState?: AtlasSnapshot;
} = {}) {
  return (
    <section className="relative pt-20 md:pt-24 pb-10 md:pb-16 overflow-hidden">
      {/* Background — fine dot grid for texture, no gradients */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-dot-grid opacity-60"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Status badge — tighter; this has to not steal vertical space
            from the observatory. Previously mb-10 + h-8 pushed the whole
            hero 150px lower. */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="flex justify-center mb-5"
        >
          <div
            className="inline-flex items-center gap-2 h-7 px-3 rounded-full text-[11.5px] font-medium"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              color: "var(--text-secondary)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
            Live on Solana devnet
            <span style={{ color: "var(--text-quaternary)" }}>·</span>
            <span style={{ color: "var(--text-tertiary)" }}>
              Built on Squads v4
            </span>
          </div>
        </motion.div>

        {/* Headline — compressed. clamp max was 96px (line 200px × 2 lines
            = 400px). Now 72px cap → ~140px × 2 = 280px. Recovers ~120px
            of vertical for the observatory to crest above the fold. */}
        <div className="text-center mb-4">
          <h1
            className="text-balance"
            style={{
              fontSize: "clamp(36px, 6.5vw, 72px)",
              lineHeight: 0.98,
              letterSpacing: "-0.045em",
            }}
          >
            <WordReveal
              text="Let your AI agents"
              className="block"
              weight={300}
              delay={0.1}
            />
            <WordReveal
              text="run free."
              className="block mt-1"
              weight={600}
              delay={0.55}
            />
          </h1>
        </div>

        {/* Subhead — tighter typography, tighter margin. The observatory
            below IS the proof of the claim; the subhead just frames it. */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1, ease }}
          className="mx-auto max-w-[640px] text-center text-[15px] md:text-[16.5px] leading-[1.5] text-balance mb-6"
          style={{ color: "var(--text-secondary)" }}
        >
          Every AI agent today runs on private keys — one bad prompt and the
          treasury is gone.{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            Kyvern replaces the key with a budget enforced by Solana itself.
          </span>
        </motion.p>

        {/* Live observatory — lifted into the first screen. On a standard
            laptop viewport (~900px below browser chrome) the chrome bar +
            status band + "Atlas" eyebrow + uptime counter now land above
            the fold. That's the entire value prop in <1s. */}
        <AtlasObservatory initialState={initialAtlasState?.state ?? null} />

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.25, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 mb-12 md:mb-16"
        >
          <Link href="/vault/new" className="btn-primary group">
            Deploy your first agent
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/tour"
            className="inline-flex items-center gap-2 h-[52px] px-6 rounded-[18px] text-[15px] font-semibold tracking-[-0.01em] transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: "var(--surface-2)" }}
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 ml-[1px]" fill="currentColor" style={{ color: "var(--text-primary)" }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            Watch the 30-second tour
          </Link>
        </motion.div>

        {/*
         * The old cinematic research-agent/kill-switch demo used to live
         * here (<VaultDemo />). It was designed for the previous narrative
         * where the hero showed "what Kyvern could do in principle."
         * Atlas replaces that entirely — the hero now shows what Kyvern
         * IS doing right now on devnet. Scripted demo → real agent.
         * VaultDemo is preserved for reference but intentionally NOT
         * mounted.
         */}
      </div>
    </section>
  );
}
