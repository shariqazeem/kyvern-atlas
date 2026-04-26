"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 * /atlas — the museum exhibit.
 *
 * Atlas is the credential, not the product. This page is dark like the
 * home device card (hardware register), built top-to-bottom as:
 *
 *   1. Manifesto                 — "Agents shouldn't have keys…"
 *   2. Three hero stats          — uptime · funds lost · attacks blocked
 *   3. Micro stats + sparkline   — settlements · earned · spent · 24h line
 *   4. ATTACK WALL               — real failed Solana txs scrolling
 *   5. Three-layer diagram       — Device · Budget · Workers
 *   6. Sponsor Atlas (footer)    — manual fail-safe, never removed
 *
 * SSR pulls Atlas state + the latest 60 attacks + a 24h PnL bucket
 * series so first paint shows real numbers and a populated wall.
 * Client polls every 5 s; LiveTimer ticks the uptime locally.
 * ════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import type { AtlasState, AtlasDecision, AtlasAttack } from "@/lib/atlas/schema";

import { ManifestoBlock } from "@/components/atlas/manifesto-block";
import { AtlasHeroStats } from "@/components/atlas/atlas-hero-stats";
import { AtlasMicroStats } from "@/components/atlas/atlas-micro-stats";
import { AtlasPnlSparkline } from "@/components/atlas/atlas-pnl-sparkline";
import { AttackWall } from "@/components/atlas/attack-wall";
import { ThreeLayerDiagram } from "@/components/atlas/three-layer-diagram";
import { TopUpAtlas } from "@/components/atlas/top-up-atlas";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// SSR feed type stays compatible with the previous shape.
type FeedItem =
  | (AtlasDecision & { _kind: "decision"; _when: string })
  | (AtlasAttack & { _kind: "attack"; _when: string });

interface AtlasClientProps {
  initialState: AtlasState | null;
  initialFeed: FeedItem[];
  initialAttacks: AtlasAttack[];
  initialPnl24h: number[];
}

export default function AtlasClient({
  initialState,
  initialAttacks,
  initialPnl24h,
}: AtlasClientProps) {
  const [state, setState] = useState<AtlasState | null>(initialState);
  const [attacks, setAttacks] = useState<AtlasAttack[]>(initialAttacks);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        fetch("/api/atlas/status").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/atlas/decisions?kind=attacks&limit=60").then((r) =>
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
      /* silent — observatory must keep showing the last good state */
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = setInterval(load, 5_000);
    return () => clearInterval(poll);
  }, [load]);

  // Page background — same hardware register as the home device card.
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      {/* fine-grain noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' /></filter><rect width='100' height='100' filter='url(%23n)' opacity='0.5'/></svg>\")",
          opacity: 0.022,
          mixBlendMode: "overlay",
          zIndex: 0,
        }}
      />

      <div className="relative z-10">
        <Navbar />

        <main className="max-w-[900px] mx-auto px-5 sm:px-8 pt-24 sm:pt-32 pb-16">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mb-10 transition-colors font-mono"
            style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}
          >
            <ArrowLeft className="w-3 h-3" />
            BACK TO KYVERN
          </Link>

          {/* 1. Manifesto */}
          <ManifestoBlock />

          {/* 2. Hero stats */}
          {state ? (
            <AtlasHeroStats
              firstIgnitionAt={state.firstIgnitionAt}
              attacksBlocked={state.totalAttacksBlocked}
            />
          ) : (
            <div
              className="mb-10 font-mono"
              style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}
            >
              Awaiting ignition…
            </div>
          )}

          {/* 3. Micro stats + sparkline (side-by-side on desktop, stacked on mobile) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25, ease: EASE }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12 pb-6"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <AtlasMicroStats
              totalSettled={state?.totalSettled ?? 0}
              totalEarnedUsd={state?.totalEarnedUsd ?? 0}
              totalSpentUsd={state?.totalSpentUsd ?? 0}
            />
            <div className="flex items-center gap-3">
              <span
                className="font-mono uppercase whitespace-nowrap"
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                }}
              >
                24h
              </span>
              <AtlasPnlSparkline values={initialPnl24h} />
            </div>
          </motion.div>

          {/* 4. Attack wall */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32, ease: EASE }}
            className="mb-14"
          >
            <AttackWall attacks={attacks} limit={60} />
            <div
              className="mt-3 font-mono"
              style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}
            >
              Each row is a real failed Solana transaction. Click any pill to
              verify on the Explorer.
            </div>
          </motion.div>

          {/* 5. Three-layer diagram */}
          <ThreeLayerDiagram />

          {/* 6. Sponsor Atlas — manual fail-safe (do not remove) */}
          <div className="mt-12">
            <TopUpAtlas />
          </div>

          {/* Quiet footer line */}
          <div
            className="mt-16 text-center font-mono"
            style={{
              color: "rgba(255,255,255,0.32)",
              fontSize: "10px",
              letterSpacing: "0.1em",
            }}
          >
            ATLAS · KVN-0000 · SOLANA DEVNET · POLICY{" "}
            <a
              href="https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet"
              target="_blank"
              rel="noreferrer"
              style={{ color: "rgba(134,239,172,0.7)" }}
            >
              PpmZ…MSqc
            </a>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
