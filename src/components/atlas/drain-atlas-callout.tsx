"use client";

/**
 * DrainAtlasCallout — a loud banner that dares any visitor to try
 * to drain the Atlas vault. The chain refuses; the receipt is public.
 *
 * Placed immediately before the Attack Wall on /atlas so the user
 * reads the dare → sees a wall of public refusals. The framing is
 * deliberately direct (Solana hackathon culture; no wishy-washy
 * "interactive demo" language).
 *
 * The CTA scrolls to #attack-wall so the proof is one click away.
 * On the attack wall itself, every failed-tx pill links to Solana
 * Explorer — so anyone who wants to verify a refusal can do so
 * without leaving the page.
 */

import { motion } from "framer-motion";
import { ArrowDown, Zap } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface DrainAtlasCalloutProps {
  attacksBlocked: number;
}

export function DrainAtlasCallout({ attacksBlocked }: DrainAtlasCalloutProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="rounded-[18px] mb-8 overflow-hidden relative"
      style={{
        background:
          "linear-gradient(135deg, rgba(248,113,113,0.10) 0%, rgba(134,239,172,0.06) 60%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(134,239,172,0.22)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 32px -16px rgba(0,0,0,0.50)",
      }}
    >
      {/* Subtle red glow in the top-right — the "danger" cue without
          dominating the card */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 w-48 h-48 pointer-events-none"
        style={{
          background:
            "radial-gradient(closest-side, rgba(248,113,113,0.18), rgba(248,113,113,0))",
          filter: "blur(8px)",
        }}
      />

      <div className="relative px-5 sm:px-7 py-6 flex flex-col sm:flex-row gap-5 sm:gap-6 sm:items-center">
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(248,113,113,0.18), rgba(248,113,113,0.04))",
            border: "1px solid rgba(248,113,113,0.45)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 24px -4px rgba(248,113,113,0.30)",
          }}
        >
          <Zap
            className="w-5 h-5"
            strokeWidth={1.8}
            style={{ color: "rgba(252,165,165,0.95)" }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="font-mono uppercase mb-1.5"
            style={{
              color: "rgba(252,165,165,0.85)",
              fontSize: 10.5,
              letterSpacing: "0.18em",
            }}
          >
            Want to break it?
          </div>
          <h3
            className="font-mono leading-[1.2] tracking-tight mb-1.5"
            style={{
              color: "rgba(255,255,255,0.96)",
              fontSize: "clamp(18px, 3.6vw, 22px)",
              fontWeight: 500,
            }}
          >
            Drain Atlas. Reward: bragging rights.
          </h3>
          <p
            className="text-[13.5px] leading-[1.55]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Atlas runs on Solana devnet with a ${" "}
            <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              5/day
            </span>{" "}
            budget, a small allowlist, and {attacksBlocked.toLocaleString()}{" "}
            attempts already refused on-chain. If you can move a single USDC
            without our policy program signing it,{" "}
            <a
              href="https://x.com/shariqshkt"
              target="_blank"
              rel="noreferrer"
              className="hover:underline underline-offset-4"
              style={{
                color: "rgba(134,239,172,0.95)",
                fontWeight: 500,
              }}
            >
              tag @shariqshkt
            </a>{" "}
            and the bragging rights are yours.
          </p>
        </div>

        <a
          href="#attack-wall"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[12px] text-[13px] font-semibold tracking-[-0.005em] shrink-0 transition active:scale-[0.97]"
          style={{
            background: "rgba(255,255,255,0.95)",
            color: "#0A0B10",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.18), 0 8px 22px rgba(0,0,0,0.45)",
          }}
        >
          See the wall
          <ArrowDown className="w-3.5 h-3.5" strokeWidth={2} />
        </a>
      </div>
    </motion.aside>
  );
}
