"use client";

/**
 * Landing page — Atlas-first proof narrative.
 *
 * Replaces the prior light "product page" with a 7-section flow that
 * leads with PROOF (live Atlas stats + Attack Wall) and earns the
 * pitch sections that follow:
 *
 *   1. The Proof          — dark fullscreen, manifesto + 3 live Atlas stats
 *                            + condensed Attack Wall + 2 CTAs
 *   2. The Problem        — light, 3 problem cards
 *   3. The Device         — light, 3-layer diagram + policy program callout
 *   4. Your Workers       — light, 5 worker template cards with example findings
 *   5. Drain Atlas Dare   — dark, full-width viral moment
 *   6. For Builders       — light, SDK snippet + docs link
 *   7. Final CTA          — dark, "Get your Kyvern"
 *
 * The dark sections use the same museum-mode palette as /atlas. The
 * navbar transitions transparent→solid based on scroll position so it
 * reads correctly over both registers.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowDown, ExternalLink, Zap } from "lucide-react";
import type { AtlasState, AtlasAttack } from "@/lib/atlas/schema";
import type { AtlasSnapshot } from "@/lib/atlas/ssr";
import { AtlasHeroStats } from "@/components/atlas/atlas-hero-stats";
import { ThreeLayerDiagram } from "@/components/atlas/three-layer-diagram";
import { AttackWallPreview } from "@/components/landing/attack-wall-preview";
import { ScrollAwareNav } from "@/components/landing/scroll-aware-nav";

const POLICY_PROGRAM_ID = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

interface Props {
  initialAtlas: AtlasSnapshot;
}

export function LandingPage({ initialAtlas }: Props) {
  const [state, setState] = useState<AtlasState | null>(initialAtlas.state);
  const [attacks, setAttacks] = useState<AtlasAttack[]>(
    initialAtlas.recentAttacks ?? [],
  );

  // Live polling — keeps the hero stats + attack wall hot
  useEffect(() => {
    const load = async () => {
      try {
        const [s, a] = await Promise.all([
          fetch("/api/atlas/status").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/atlas/decisions?kind=attacks&limit=24").then((r) =>
            r.ok ? r.json() : null,
          ),
        ]);
        if (s && typeof s === "object" && !("error" in s)) {
          setState(s as AtlasState);
        }
        if (a && Array.isArray(a.attacks)) {
          setAttacks(a.attacks as AtlasAttack[]);
        }
      } catch {
        /* silent — never block the landing */
      }
    };
    void load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ background: "#FAFAFA" }}>
      <ScrollAwareNav />

      <SectionProof state={state} attacks={attacks} />
      <SectionProblem />
      <SectionDevice />
      <SectionWorkers />
      <SectionDrainAtlas attacksBlocked={state?.totalAttacksBlocked ?? 1408} />
      <SectionBuilders />
      <SectionFinalCta />
      <FooterMini />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section 1 — THE PROOF (dark fullscreen)
   ════════════════════════════════════════════════════════════════════ */

function SectionProof({
  state,
  attacks,
}: {
  state: AtlasState | null;
  attacks: AtlasAttack[];
}) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      {/* fine-grain noise */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' /></filter><rect width='100' height='100' filter='url(%23n)' opacity='0.5'/></svg>\")",
          opacity: 0.022,
          mixBlendMode: "overlay",
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-[980px] mx-auto px-5 sm:px-8 pt-28 sm:pt-32 pb-16 sm:pb-20">
        {/* tiny top label */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2 mb-10"
        >
          <motion.span
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "#22C55E",
              boxShadow: "0 0 0 3px rgba(34,197,94,0.18), 0 0 8px #22C55E",
            }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="font-mono uppercase"
            style={{
              color: "rgba(255,255,255,0.50)",
              fontSize: 10.5,
              letterSpacing: "0.20em",
            }}
          >
            Kyvern Atlas · Device #0000 · Live
          </span>
        </motion.div>

        {/* Manifesto */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center font-mono leading-[1.05] tracking-tight mb-12 sm:mb-16"
          style={{
            color: "rgba(255,255,255,0.96)",
            fontSize: "clamp(36px, 7vw, 72px)",
            fontWeight: 500,
          }}
        >
          Agents shouldn&apos;t have keys.
          <br />
          They should have{" "}
          <span style={{ color: "#86EFAC" }}>budgets</span>.
        </motion.h1>

        {/* Three live stats */}
        <div className="mb-14">
          <AtlasHeroStats
            firstIgnitionAt={state?.firstIgnitionAt ?? null}
            attacksBlocked={state?.totalAttacksBlocked ?? 0}
          />
        </div>

        {/* Attack Wall preview */}
        <AttackWallPreview attacks={attacks} limit={12} />

        {/* Transition lines */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-12 text-center max-w-[640px] mx-auto"
        >
          <p
            className="text-[14px] sm:text-[15px] leading-[1.65]"
            style={{ color: "rgba(255,255,255,0.62)" }}
          >
            The on-chain policy program rejected each attempt.
            <br />
            <span style={{ color: "rgba(255,255,255,0.85)" }}>
              This device has been running autonomous since April 20.
            </span>{" "}
            Now you can have your own.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-[12px] text-[14.5px] font-semibold tracking-[-0.005em] active:scale-[0.98] transition group"
            style={{
              background: "#FFFFFF",
              color: "#0A0B10",
              border: "1px solid rgba(134,239,172,0.45)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.18), 0 0 0 4px rgba(134,239,172,0.10), 0 12px 28px rgba(0,0,0,0.45)",
            }}
          >
            Get your Kyvern
            <ArrowRight
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              strokeWidth={2}
            />
          </Link>
          <Link
            href="/atlas"
            className="inline-flex items-center gap-1.5 h-[52px] px-6 rounded-[12px] text-[13.5px] font-medium tracking-[-0.005em]"
            style={{
              color: "rgba(255,255,255,0.78)",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Watch Atlas live
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-16 sm:mt-20 flex flex-col items-center gap-1.5"
        >
          <span
            className="font-mono uppercase tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.30)", fontSize: 9.5 }}
          >
            Why this matters
          </span>
          <ArrowDown
            className="w-3.5 h-3.5 animate-bounce"
            style={{ color: "rgba(255,255,255,0.30)" }}
          />
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section 2 — THE PROBLEM (light)
   ════════════════════════════════════════════════════════════════════ */

function SectionProblem() {
  const cards = [
    {
      title: "Unlimited access",
      body:
        "Hand an AI agent your private key and it can drain your entire wallet. There's no kill switch, no budget, no guardrail. One prompt injection and everything is gone.",
    },
    {
      title: "No accountability",
      body:
        "When an agent goes rogue, there's no audit trail, no policy check, no on-chain record. You can't prove what it tried to do or what stopped it. It's just your empty wallet.",
    },
    {
      title: "Trust isn't infrastructure",
      body:
        "Hoping your AI agent behaves isn't a security model. Trust must be enforced at the protocol level — not in a prompt, not in a promise, but in code that runs on-chain.",
    },
  ];
  return (
    <section className="relative" style={{ background: "#FAFAFA" }}>
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-24 sm:py-32">
        <div className="text-center mb-12">
          <SectionLabel>The problem</SectionLabel>
          <h2
            className="mt-3 mx-auto max-w-[820px] tracking-tight"
            style={{
              color: "#0A0A0A",
              fontSize: "clamp(28px, 4.4vw, 44px)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            AI agents with private keys can steal everything.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="rounded-[16px] p-6"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
              }}
            >
              <h3
                className="mb-2 tracking-tight"
                style={{
                  color: "#0A0A0A",
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {c.title}
              </h3>
              <p
                className="text-[13.5px] leading-[1.6]"
                style={{ color: "#475569" }}
              >
                {c.body}
              </p>
            </motion.div>
          ))}
        </div>

        <p
          className="mt-12 text-center text-[14.5px]"
          style={{ color: "#374151", maxWidth: 640, marginInline: "auto" }}
        >
          Kyvern solves this with on-chain policy enforcement.{" "}
          <strong style={{ color: "#0A0A0A" }}>The blockchain itself says no.</strong>
        </p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section 3 — THE DEVICE (light)
   ════════════════════════════════════════════════════════════════════ */

function SectionDevice() {
  return (
    <section
      className="relative"
      style={{
        background:
          "linear-gradient(180deg, #FAFAFA 0%, #F4F4F6 100%)",
      }}
    >
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-24 sm:py-32">
        <div className="text-center mb-10">
          <SectionLabel>The device</SectionLabel>
          <h2
            className="mt-3 mx-auto max-w-[920px] tracking-tight"
            style={{
              color: "#0A0A0A",
              fontSize: "clamp(28px, 4.4vw, 44px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-[8px] mr-1.5 align-middle"
              style={{
                background: "#0A0A0A",
                color: "#FFFFFF",
                fontSize: "0.85em",
                fontWeight: 600,
                letterSpacing: "-0.01em",
              }}
            >
              A device
            </span>{" "}
            you own.{" "}
            <span style={{ color: "#15803D" }}>Workers</span> that earn.{" "}
            <span style={{ color: "#B45309" }}>Money</span> you control.
          </h2>
        </div>

        <div className="my-12">
          <ThreeLayerDiagram />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          {[
            {
              tag: "Layer 1",
              title: "The Device",
              body:
                "Your identity on Solana. A Privy embedded wallet wrapped in a Squads multisig vault with on-chain budgets. A serial number. A birthday. The vault holds USDC. The device hosts workers.",
            },
            {
              tag: "Layer 2",
              title: "The Policy",
              body:
                "A custom Anchor program. Every outgoing payment goes through it first. Per-tx cap, daily cap, weekly cap, allowed merchants, velocity window, memo requirement, kill switch. Rejection = a real reverting on-chain transaction.",
            },
            {
              tag: "Layer 3",
              title: "The Workers",
              body:
                "Autonomous agents you spawn on your device. Each has personality, job, allowed tools, frequency. They find opportunities. They operate within the budget. They cannot exceed it.",
            },
          ].map((l, i) => (
            <motion.div
              key={l.tag}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="rounded-[16px] p-6"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <div
                className="font-mono uppercase tracking-[0.16em] mb-2"
                style={{ color: "#9CA3AF", fontSize: 10 }}
              >
                {l.tag}
              </div>
              <h3
                className="text-[17px] font-semibold tracking-tight mb-2"
                style={{ color: "#0A0A0A" }}
              >
                {l.title}
              </h3>
              <p className="text-[13.5px] leading-[1.6]" style={{ color: "#475569" }}>
                {l.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Policy program callout */}
        <motion.a
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          href={`https://explorer.solana.com/address/${POLICY_PROGRAM_ID}?cluster=devnet`}
          target="_blank"
          rel="noreferrer"
          className="mt-8 mx-auto block w-fit rounded-[14px] overflow-hidden group"
          style={{
            background: "linear-gradient(180deg, #161A26 0%, #0E1320 100%)",
            border: "1px solid rgba(134,239,172,0.30)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.20)",
          }}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <div
              className="font-mono uppercase tracking-[0.16em]"
              style={{ color: "#86EFAC", fontSize: 9.5 }}
            >
              Policy program
            </div>
            <span style={{ color: "rgba(255,255,255,0.20)" }}>·</span>
            <span
              className="font-mono"
              style={{ color: "rgba(255,255,255,0.92)", fontSize: 13 }}
            >
              {POLICY_PROGRAM_ID}
            </span>
            <ExternalLink
              className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform"
              style={{ color: "rgba(255,255,255,0.55)" }}
              strokeWidth={2}
            />
          </div>
          <div
            className="px-5 py-2 text-center font-mono uppercase tracking-[0.14em]"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.45)",
              fontSize: 9.5,
              background: "rgba(0,0,0,0.18)",
            }}
          >
            Live on Solana devnet since April 2026
          </div>
        </motion.a>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section 4 — YOUR WORKERS (light)
   ════════════════════════════════════════════════════════════════════ */

function SectionWorkers() {
  const workers = [
    {
      emoji: "🎯",
      name: "Bounty Hunter",
      watches: "Bounty boards & hackathons",
      pings: "When a fit drops",
      example:
        "High-value match: $10K Superteam bounty, Development category, deadline in 36 hours. Only 4 submissions so far.",
    },
    {
      emoji: "📡",
      name: "Ecosystem Watcher",
      watches: "Solana accounts & RSS feeds",
      pings: "Hackathons, grants, launches",
      example:
        "Solana Foundation just announced a new grant round for infrastructure projects. Applications open May 5.",
    },
    {
      emoji: "🐋",
      name: "Whale Tracker",
      watches: "Specific wallets",
      pings: "Big swaps & rotations",
      example:
        "Kraken moved $2.3M SOL to a Binance deposit wallet. This pattern historically precedes a 2-5% price move within 2 hours.",
    },
    {
      emoji: "📈",
      name: "Token Pulse",
      watches: "Token price + volume",
      pings: "Configured threshold breaks",
      example:
        "SOL has been below your $140 band for 6 hours — longest streak since April 15. Watching for bounce above $85 on volume.",
    },
    {
      emoji: "🛠️",
      name: "GitHub Watcher",
      watches: "Repos & orgs",
      pings: "Releases & fresh commits",
      example:
        "solana-labs/solana v2.1.0 released 12 minutes ago. Includes breaking changes to the stake program interface.",
    },
  ];

  return (
    <section className="relative" style={{ background: "#F4F4F6" }}>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-24 sm:py-32">
        <div className="text-center mb-12">
          <SectionLabel>Your workers</SectionLabel>
          <h2
            className="mt-3 mx-auto max-w-[820px] tracking-tight"
            style={{
              color: "#0A0A0A",
              fontSize: "clamp(28px, 4.4vw, 44px)",
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Spawn a worker. Give it a job. Watch it find opportunities.
          </h2>
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {workers.map((w, i) => (
            <motion.div
              key={w.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="rounded-[16px] p-5 flex flex-col"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[22px]"
                  style={{
                    background:
                      "linear-gradient(180deg, #F4F5F7 0%, #FFFFFF 100%)",
                    border: "1px solid rgba(15,23,42,0.06)",
                    boxShadow: "inset 0 1px 1px rgba(15,23,42,0.04)",
                  }}
                >
                  {w.emoji}
                </div>
                <div>
                  <div
                    className="text-[14px] font-semibold tracking-tight"
                    style={{ color: "#0A0A0A" }}
                  >
                    {w.name}
                  </div>
                  <div
                    className="font-mono uppercase tracking-[0.10em]"
                    style={{ color: "#9CA3AF", fontSize: 9.5 }}
                  >
                    Worker template
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <KV label="Watches" value={w.watches} />
                <KV label="Pings on" value={w.pings} />
              </div>

              {/* Realistic finding example */}
              <div
                className="mt-auto rounded-[12px] p-3"
                style={{
                  background: "rgba(15,23,42,0.025)",
                  border: "1px dashed rgba(15,23,42,0.10)",
                }}
              >
                <div
                  className="font-mono uppercase tracking-[0.14em] mb-1.5"
                  style={{ color: "#9CA3AF", fontSize: 9 }}
                >
                  Example finding
                </div>
                <p
                  className="text-[12.5px] leading-[1.55]"
                  style={{ color: "#374151" }}
                >
                  {w.example}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/app/agents/spawn"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-[12px] text-[13.5px] font-semibold tracking-[-0.005em] active:scale-[0.98] transition group"
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 10px 28px rgba(15,23,42,0.18)",
            }}
          >
            Spawn your first worker
            <ArrowRight
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              strokeWidth={2}
            />
          </Link>
        </div>
      </div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="font-mono uppercase tracking-[0.14em] mb-0.5"
        style={{ color: "#9CA3AF", fontSize: 9.5 }}
      >
        {label}
      </div>
      <div className="text-[12.5px]" style={{ color: "#0A0A0A" }}>
        {value}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section 5 — DRAIN ATLAS DARE (dark, full-width viral moment)
   ════════════════════════════════════════════════════════════════════ */

function SectionDrainAtlas({ attacksBlocked }: { attacksBlocked: number }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 100% at 70% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      {/* Red ambient glow at top-right */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-[480px] h-[480px] pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(248,113,113,0.18), rgba(248,113,113,0))",
          filter: "blur(20px)",
        }}
      />

      <div className="relative z-10 max-w-[980px] mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{
              width: 32,
              height: 32,
              background:
                "linear-gradient(180deg, rgba(248,113,113,0.18), rgba(248,113,113,0.04))",
              border: "1px solid rgba(248,113,113,0.45)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 24px -4px rgba(248,113,113,0.30)",
            }}
          >
            <Zap
              className="w-4 h-4"
              strokeWidth={1.8}
              style={{ color: "rgba(252,165,165,0.95)" }}
            />
          </span>
          <span
            className="font-mono uppercase tracking-[0.18em]"
            style={{ color: "rgba(252,165,165,0.85)", fontSize: 11 }}
          >
            The dare
          </span>
        </div>

        <h2
          className="font-mono leading-[1.05] tracking-tight"
          style={{
            color: "#FFFFFF",
            fontSize: "clamp(48px, 9vw, 96px)",
            fontWeight: 500,
          }}
        >
          Drain Atlas.
        </h2>

        <p
          className="mt-6 mx-auto max-w-[680px] text-[15.5px] leading-[1.65]"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          Atlas is a real device holding real USDC on Solana devnet. Its
          private key is online. Its workers spend money autonomously.
          Try to take it. Reward: bragging rights.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/atlas#attack-wall"
            className="inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-[12px] text-[14px] font-semibold tracking-[-0.005em] transition active:scale-[0.97]"
            style={{
              background: "#FFFFFF",
              color: "#0A0B10",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.18), 0 12px 28px rgba(0,0,0,0.45)",
            }}
          >
            See the wall
            <ArrowDown className="w-3.5 h-3.5" strokeWidth={2} />
          </a>
          <a
            href="https://x.com/shariqshkt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 h-[52px] px-6 rounded-[12px] text-[13.5px] font-medium"
            style={{
              color: "rgba(255,255,255,0.78)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Tag @shariqshkt
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
          </a>
        </div>

        <div
          className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span
            className="font-mono uppercase tracking-[0.16em]"
            style={{ color: "rgba(255,255,255,0.55)", fontSize: 10.5 }}
          >
            {attacksBlocked.toLocaleString()} attempts · 0 successful drains
          </span>
        </div>

        <p
          className="mt-3 text-[13px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          The policy program doesn&apos;t negotiate.
        </p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section 6 — FOR BUILDERS (light)
   ════════════════════════════════════════════════════════════════════ */

function SectionBuilders() {
  return (
    <section className="relative" style={{ background: "#FAFAFA" }}>
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <SectionLabel>For builders</SectionLabel>
            <h2
              className="mt-3 mb-4 tracking-tight"
              style={{
                color: "#0A0A0A",
                fontSize: "clamp(28px, 4.4vw, 40px)",
                fontWeight: 600,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
              }}
            >
              Five lines to give your agent a wallet.
            </h2>
            <p
              className="text-[14.5px] leading-[1.6] mb-6"
              style={{ color: "#475569" }}
            >
              The <code style={{ background: "rgba(15,23,42,0.04)", padding: "1px 6px", borderRadius: 4, fontSize: "0.95em" }}>@kyvernlabs/sdk</code>{" "}
              ships <code style={{ background: "rgba(15,23,42,0.04)", padding: "1px 6px", borderRadius: 4, fontSize: "0.95em" }}>Vault</code>{" "}
              and <code style={{ background: "rgba(15,23,42,0.04)", padding: "1px 6px", borderRadius: 4, fontSize: "0.95em" }}>OnChainVault</code>{" "}
              with <code style={{ background: "rgba(15,23,42,0.04)", padding: "1px 6px", borderRadius: 4, fontSize: "0.95em" }}>vault.pay()</code>{" "}
              and <code style={{ background: "rgba(15,23,42,0.04)", padding: "1px 6px", borderRadius: 4, fontSize: "0.95em" }}>vault.pause()</code>.
              Bring an existing AI agent — replace its raw key with a Kyvern vault and you&apos;re done.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/docs"
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[10px] text-[13px] font-semibold tracking-[-0.005em]"
                style={{
                  background: "#0A0A0A",
                  color: "#FFFFFF",
                }}
              >
                Read the docs
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </Link>
              <a
                href="https://github.com/shariqazeem/kyvern-atlas"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-[10px] text-[13px] font-medium"
                style={{
                  color: "#0A0A0A",
                  border: "1px solid rgba(15,23,42,0.10)",
                }}
              >
                GitHub
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
              </a>
            </div>
          </div>

          {/* Code block */}
          <div
            className="rounded-[14px] overflow-hidden"
            style={{
              background: "#0E1320",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 32px rgba(15,23,42,0.18)",
            }}
          >
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span
                className="font-mono uppercase tracking-[0.16em]"
                style={{ color: "rgba(255,255,255,0.40)", fontSize: 9.5 }}
              >
                @kyvernlabs/sdk
              </span>
            </div>
            <pre
              className="px-5 py-5 font-mono text-[12.5px] leading-[1.7] overflow-x-auto"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
{`import { OnChainVault } from "@kyvernlabs/sdk";

const vault = new OnChainVault({
  apiKey: process.env.KYVERN_AGENT_KEY,
});

await vault.pay({
  merchant: "api.openai.com",
  amountUsd: 0.05,
  memo: "gpt-4 inference",
});
// → real Solana tx · enforced on-chain`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section 7 — FINAL CTA (dark)
   ════════════════════════════════════════════════════════════════════ */

function SectionFinalCta() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 100% at 50% 100%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      <div className="relative z-10 max-w-[820px] mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
        <h2
          className="tracking-tight"
          style={{
            color: "#FFFFFF",
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
          }}
        >
          Get your <span style={{ color: "#86EFAC" }}>Kyvern</span>.
        </h2>
        <p
          className="mt-5 mx-auto max-w-[560px] text-[15px] leading-[1.6]"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          A device that finds you opportunities. On-chain budgets that
          can&apos;t be bypassed. Workers that earn while you sleep.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-[12px] text-[14.5px] font-semibold tracking-[-0.005em] active:scale-[0.98] transition group"
            style={{
              background: "#FFFFFF",
              color: "#0A0B10",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.18), 0 12px 28px rgba(0,0,0,0.45)",
            }}
          >
            Get started
            <ArrowRight
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              strokeWidth={2}
            />
          </Link>
          <Link
            href="/atlas"
            className="inline-flex items-center gap-1.5 h-[52px] px-6 rounded-[12px] text-[13.5px] font-medium"
            style={{
              color: "rgba(255,255,255,0.78)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Watch Atlas
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Footer + helpers
   ════════════════════════════════════════════════════════════════════ */

function FooterMini() {
  return (
    <footer
      className="relative"
      style={{
        background: "#080B14",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span
          className="font-mono uppercase tracking-[0.16em]"
          style={{ color: "rgba(255,255,255,0.32)", fontSize: 10 }}
        >
          Kyvern · Solana devnet · Policy{" "}
          <a
            href={`https://explorer.solana.com/address/${POLICY_PROGRAM_ID}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "rgba(134,239,172,0.7)" }}
          >
            PpmZ…MSqc
          </a>
        </span>
        <div className="flex items-center gap-5">
          <Link
            href="/atlas"
            className="font-mono uppercase tracking-[0.16em] hover:text-white transition"
            style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}
          >
            Atlas
          </Link>
          <Link
            href="/docs"
            className="font-mono uppercase tracking-[0.16em] hover:text-white transition"
            style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}
          >
            Docs
          </Link>
          <a
            href="https://github.com/shariqazeem/kyvern-atlas"
            target="_blank"
            rel="noreferrer"
            className="font-mono uppercase tracking-[0.16em] hover:text-white transition"
            style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex items-center font-mono uppercase tracking-[0.18em]"
      style={{ color: "#9CA3AF", fontSize: 10.5 }}
    >
      {children}
    </div>
  );
}
