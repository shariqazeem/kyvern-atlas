"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * TemplateChooser — the first thing a new user sees on /vault/new.
 *
 * Two paths, two feelings:
 *
 *   1. "Clone Atlas" — the fast path. Pre-fills the exact policy our
 *      reference agent runs on. Jumps straight to Review. 60 seconds.
 *      This is the one you want most users to pick because it mirrors
 *      the live proof they just saw on the landing.
 *
 *   2. "Build from scratch" — the advanced path. Full 5-step wizard.
 *      For users who want to customize every policy dimension.
 *
 * The Clone Atlas card is the PRIMARY. It's visually bigger, has the
 * indigo accent, and sits on the left. "From scratch" is secondary —
 * still one click away, not hidden.
 *
 * Design: same premium-light aesthetic as the rest of the app.
 * Hairline borders, clamp() typography, understated motion. No chrome
 * from FlowShell yet — this is the pre-wizard moment, cleaner viewport.
 * ════════════════════════════════════════════════════════════════════
 */

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Sparkles,
  Wand2,
} from "lucide-react";
import { AtlasRunningStrip } from "@/components/vault/atlas-running-strip";
import { KyvernMark } from "@/components/brand/kyvern-mark";
import { EASE_PREMIUM as EASE } from "@/lib/motion";

export interface TemplateChooserProps {
  onCloneAtlas: () => void;
  onStartFresh: () => void;
}

export function TemplateChooser({
  onCloneAtlas,
  onStartFresh,
}: TemplateChooserProps) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* Thin header — brand + back. No big chrome. */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: "rgba(250,250,250,0.78)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderBottom: "0.5px solid var(--border-subtle)",
        }}
      >
        <div className="max-w-[960px] mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link
            href="/app"
            className="group flex items-center gap-2 transition-opacity hover:opacity-80"
            aria-label="Back to app"
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
            {/* Same KyvernMark instance the landing navbar renders.
                Browsers with View Transitions support morph the tile
                between positions as the user navigates in. */}
            <KyvernMark size={28} />
            <span
              className="hidden sm:inline text-[14.5px] font-semibold"
              style={{
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              Kyvern
            </span>
          </Link>
          <Link
            href="/atlas"
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--text-tertiary)" }}
          >
            Watch Atlas run live
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      {/* Cinematic bridge — the live Atlas state travels with the user
          from the landing page into the wizard. Same chrome, same mono,
          same "live" pill. Sets the frame: "the network is running while
          you set this up; in a minute you'll be part of it." */}
      <AtlasRunningStrip />

      {/* Body */}
      <main className="flex-1 w-full flex items-center">
        <div className="max-w-[960px] mx-auto px-6 lg:px-8 w-full py-12 md:py-20">
          {/* Eyebrow + headline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-12 md:mb-16"
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-3"
              style={{ color: "var(--text-quaternary)" }}
            >
              Deploy an agent
            </p>
            <h1
              className="tracking-[-0.035em] text-balance"
              style={{
                fontSize: "clamp(34px, 5vw, 52px)",
                lineHeight: 1.02,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              Pick how you want to start.
            </h1>
            <p
              className="mt-3 text-[15px] leading-[1.55] max-w-[640px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Clone Atlas — our reference autonomous agent — and you&apos;re
              on-chain in 60 seconds with the same policy that&apos;s caught
              11+ attacks in public. Or customize every dimension yourself.
            </p>
          </motion.div>

          {/* The two cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* PRIMARY — Clone Atlas */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              onClick={onCloneAtlas}
              className="group relative text-left p-6 rounded-[20px] md:col-span-3 overflow-hidden transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--text-primary)",
                color: "var(--background)",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.08), 0 20px 60px -30px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="w-7 h-7 rounded-[9px] flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Recommended · 60 seconds
                </span>
              </div>

              <h3
                className="text-[24px] font-semibold tracking-[-0.02em] mb-2"
                style={{ color: "var(--background)" }}
              >
                Clone Atlas.
              </h3>
              <p
                className="text-[13.5px] leading-[1.55] mb-5"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                Deploy your own autonomous agent with the same policy Atlas
                runs on. Your own Squads multisig, your own keypair, same
                battle-tested rules. Start running alongside Atlas today.
              </p>

              {/* Template highlights */}
              <ul className="space-y-1.5 mb-6 text-[12.5px]">
                {[
                  "$20/day · $100/week budget",
                  "$0.50 per-transaction cap",
                  "5 LLM + data merchant allowlist",
                  "60 calls/hour velocity limit",
                ].map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <Check className="w-3 h-3 shrink-0" style={{ color: "rgba(255,255,255,0.5)" }} />
                    <span style={{ color: "rgba(255,255,255,0.85)" }}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>

              <div
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
                style={{ color: "var(--background)" }}
              >
                Deploy clone
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </motion.button>

            {/* SECONDARY — Build from scratch */}
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
              onClick={onStartFresh}
              className="group relative text-left p-6 rounded-[20px] md:col-span-2 transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--surface)",
                border: "0.5px solid var(--border-subtle)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div
                  className="w-7 h-7 rounded-[9px] flex items-center justify-center"
                  style={{ background: "var(--surface-2)" }}
                >
                  <Wand2 className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                </div>
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--text-quaternary)" }}
                >
                  Advanced · 3 minutes
                </span>
              </div>

              <h3
                className="text-[20px] font-semibold tracking-[-0.02em] mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Build from scratch.
              </h3>
              <p
                className="text-[13px] leading-[1.55] mb-5"
                style={{ color: "var(--text-tertiary)" }}
              >
                Customize every policy dimension — budgets, allowlist,
                velocity, memo rules, purpose. For advanced use cases or
                agents that need a specific shape.
              </p>

              <div
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Start wizard
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          </div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11.5px]"
            style={{ color: "var(--text-quaternary)" }}
          >
            <span>Built on Squads v4</span>
            <span>·</span>
            <span>Kyvern policy program live on Solana devnet</span>
            <span>·</span>
            <span>Pre-alpha</span>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
