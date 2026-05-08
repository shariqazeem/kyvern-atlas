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

import type { Signal } from "@/lib/agents/types";
import { ManifestoBlock } from "@/components/atlas/manifesto-block";
import { AtlasDevicePlinth } from "@/components/atlas/atlas-device-plinth";
import { AtlasHeroStats } from "@/components/atlas/atlas-hero-stats";
import {
  AtlasEarningsHero,
  AtlasEconomyStats,
  type AtlasEconomy,
} from "@/components/atlas/atlas-economy";
import { AtlasEconomicLedger } from "@/components/atlas/atlas-economic-ledger";
import { AttackWall } from "@/components/atlas/attack-wall";
import { DrainAtlasCallout } from "@/components/atlas/drain-atlas-callout";
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
  /** Legacy 24h PnL series; retained in the prop shape because page.tsx
   *  still passes it from the SSR snapshot. Phase 7 replaced the
   *  visualisation with a 14-day daily-earnings sparkline pulled live
   *  from /api/atlas/economy, so the value is no longer rendered. */
  initialPnl24h: number[];
  /** Phase C — Findings block replaced by AtlasEconomicLedger which
   *  fetches its own data from /api/atlas/revenue. Props kept in the
   *  shape so the SSR snapshot caller (`page.tsx`) can pass them
   *  without breaking; values are unused. */
  initialFindings?: Signal[];
  initialFindingsThisWeek?: number;
}

export default function AtlasClient({
  initialState,
  initialAttacks,
}: AtlasClientProps) {
  const [state, setState] = useState<AtlasState | null>(initialState);
  const [attacks, setAttacks] = useState<AtlasAttack[]>(initialAttacks);
  const [economy, setEconomy] = useState<AtlasEconomy | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, a, e] = await Promise.all([
        fetch("/api/atlas/status").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/atlas/decisions?kind=attacks&limit=60").then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch("/api/atlas/economy").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (s && typeof s === "object" && !("error" in s)) {
        setState(s as AtlasState);
      }
      if (a && Array.isArray(a.attacks)) {
        setAttacks(a.attacks as AtlasAttack[]);
      }
      if (e && typeof e === "object" && !("error" in e)) {
        setEconomy(e as AtlasEconomy);
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

          {/* 2. Museum centrepiece — Atlas device on a plinth */}
          <AtlasDevicePlinth
            firstIgnitionAt={state?.firstIgnitionAt ?? null}
            totalCycles={state?.totalCycles ?? 0}
            totalAttacksBlocked={state?.totalAttacksBlocked ?? 0}
          />

          {/* 3. Hero stats */}
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

          {/* 3. Atlas economy hero — Phase 7. "Atlas earned $X.XX in N
                days" + 14-day sparkline. Uses Atlas's task-economy
                rollups from /api/atlas/economy (claimed completions,
                payouts, success rate, on-chain totals).

                The legacy AtlasMicroStats + 24h sparkline pair was
                removed; its three values (settled / earned / spent)
                are now subsumed into AtlasEconomyStats with extra
                context (avg payout, success %). state.totalEarnedUsd
                still drives the hero number — economy.totalEarnedUsd
                aggregates the same value from the task pool. */}
          <AtlasEarningsHero
            economy={
              economy
                ? {
                    ...economy,
                    // Use the canonical Atlas state's earnings as the
                    // hero number — it's the same total but already
                    // computed in the runner so the SSR snapshot
                    // shows a real value before /api/atlas/economy
                    // resolves.
                    totalEarnedUsd:
                      state?.totalEarnedUsd ?? economy.totalEarnedUsd,
                  }
                : null
            }
            firstIgnitionAt={state?.firstIgnitionAt ?? null}
          />

          <AtlasEconomyStats economy={economy} />

          {/* Phase C (KYVERN_FRONTIER_FINAL_SPRINT, 2026-05-08) —
              Findings block replaced with the Economic Ledger.
              Atlas's value isn't content output, it's 17 days of
              unbroken on-chain economic activity. The new block
              renders real x402 subscriber payments from
              feed_purchases, every row a real Solana tx. */}
          <AtlasEconomicLedger />

          {/* 4b. Drain Atlas dare — primes the attack wall below.
                The chain refuses, the receipt is public. */}
          <DrainAtlasCallout
            attacksBlocked={state?.totalAttacksBlocked ?? 0}
          />

          {/* 5. Attack wall */}
          <motion.div
            id="attack-wall"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32, ease: EASE }}
            className="mb-14 scroll-mt-24"
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
