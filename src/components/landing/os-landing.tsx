"use client";

/**
 * Landing page (post-SPEC_TO_WIN §6.1).
 *
 * Minimal. Above the fold: one statement, one sub, three buttons, one
 * live counter strip. No 3D device, no orbital workers, no live-economy
 * mock, no unbox CTA. Below the fold: three-column "how it works" and
 * a logo strip.
 *
 * Every surface that doesn't strengthen the 60-second realization
 * filter (§15) has been cut. The cinematic still ships at /legacy/unbox
 * for narrative video shots — never on the main funnel.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { AtlasSnapshot } from "@/lib/atlas/ssr";

const PROGRAM_ID = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";
const PROGRAM_LINK = `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`;
const REPO_URL = "https://github.com/shariqazeem/kyvern-atlas";

interface LandingPageProps {
  initialAtlas: AtlasSnapshot;
}

interface AtlasStatusPayload {
  totalAttacksBlocked?: number;
  totalEarnedUsd?: number;
  firstIgnitionAt?: string;
}

export function LandingPage({ initialAtlas }: LandingPageProps) {
  const initialAttacks = initialAtlas.state?.totalAttacksBlocked ?? 0;
  const initialIgnition = initialAtlas.state?.firstIgnitionAt ?? null;

  const [attacks, setAttacks] = useState<number>(initialAttacks);
  const [ignition, setIgnition] = useState<string | null>(initialIgnition);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/atlas/status");
        if (!r.ok) return;
        const d = (await r.json()) as AtlasStatusPayload;
        if (cancelled) return;
        if (typeof d.totalAttacksBlocked === "number") setAttacks(d.totalAttacksBlocked);
        if (d.firstIgnitionAt) setIgnition(d.firstIgnitionAt);
      } catch {
        /* swallow — keep last known state */
      }
    };
    void poll();
    const t = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const daysLive = ignition
    ? Math.floor((Date.now() - new Date(ignition).getTime()) / 86_400_000)
    : null;

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background, #FAFAFA)" }}
    >
      <TopBar />
      <Hero attacks={attacks} daysLive={daysLive} />
      <HowItWorks />
      <ProofStrip />
      <FooterStrip />
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────
   TopBar
   ────────────────────────────────────────────────────────────────── */

function TopBar() {
  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md"
      style={{
        background: "rgba(250,250,250,0.85)",
        borderBottom: "1px solid rgba(15,23,42,0.06)",
      }}
    >
      <div className="mx-auto max-w-[1080px] px-6 py-3.5 flex items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span
            className="w-7 h-7 rounded-[8px] inline-flex items-center justify-center font-bold text-[14px]"
            style={{ background: "#0A0A0A", color: "#FFFFFF" }}
          >
            K
          </span>
          <span
            className="font-semibold tracking-[-0.01em]"
            style={{ color: "#0A0A0A", fontSize: 15 }}
          >
            Kyvern
          </span>
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/docs" className="text-[13px] hover:underline" style={{ color: "#6B7280" }}>
            Docs
          </Link>
          <Link href="/atlas" className="text-[13px] hover:underline" style={{ color: "#6B7280" }}>
            Evidence
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] hover:underline inline-flex items-center gap-0.5"
            style={{ color: "#6B7280" }}
          >
            GitHub
            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
          </a>
          <Link
            href="/demo"
            className="text-[12.5px] font-semibold rounded-[10px] px-3 py-1.5"
            style={{ background: "#0A0A0A", color: "#FFFFFF" }}
          >
            Live demo
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Hero — one viewport, no theatre
   ────────────────────────────────────────────────────────────────── */

function Hero({
  attacks,
  daysLive,
}: {
  attacks: number;
  daysLive: number | null;
}) {
  return (
    <section
      className="flex-1 flex items-center justify-center px-6 py-20"
      style={{
        background:
          "radial-gradient(ellipse 800px 500px at 50% 30%, rgba(255,255,255,1) 30%, rgba(248,250,251,0) 70%), #FAFAFA",
      }}
    >
      <div className="w-full max-w-[760px] flex flex-col items-center text-center">
        <span
          className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.16em] rounded-full px-3 py-1 mb-7"
          style={{
            fontSize: 10,
            color: "#15803D",
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.18)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#22C55E" }}
          />
          Atlas reference agent · Solana devnet · {daysLive !== null ? `${daysLive} days live` : "live"}
        </span>

        <h1
          className="font-semibold tracking-[-0.025em] mb-5"
          style={{
            color: "#0A0A0A",
            fontSize: "clamp(34px, 5.5vw, 56px)",
            lineHeight: 1.05,
          }}
        >
          AI agents shouldn&apos;t have private keys.
          <br />
          They should have budgets.
        </h1>

        <p
          className="mb-9 max-w-[580px]"
          style={{
            color: "#4B5563",
            fontSize: "clamp(15px, 1.5vw, 18px)",
            lineHeight: 1.55,
          }}
        >
          Kyvern enforces agent spending policies on-chain using Solana smart
          accounts. Caps, allowlists, kill switch — all decided by the chain
          before a single lamport moves.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-9">
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2.5 font-semibold text-[14px] tracking-[-0.005em] transition active:scale-[0.98]"
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.04), 0 8px 20px -6px rgba(0,0,0,0.20)",
            }}
          >
            Launch live demo
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
          <Link
            href="/atlas"
            className="inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2.5 font-semibold text-[14px] tracking-[-0.005em]"
            style={{
              background: "#FFFFFF",
              color: "#0A0A0A",
              border: "1px solid rgba(15,23,42,0.10)",
            }}
          >
            View Explorer proof
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2.5 font-semibold text-[14px] tracking-[-0.005em]"
            style={{
              background: "#FFFFFF",
              color: "#0A0A0A",
              border: "1px solid rgba(15,23,42,0.10)",
            }}
          >
            GitHub / SDK
            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
          </a>
        </div>

        {/* Live counter strip */}
        <div
          className="rounded-[12px] px-5 py-3 inline-flex items-center gap-4 flex-wrap justify-center"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow:
              "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -16px rgba(15,23,42,0.10)",
          }}
        >
          <CounterCell
            value={daysLive !== null ? `${daysLive}` : "—"}
            label="days live"
          />
          <Sep />
          <CounterCell value="$0" label="lost" tone="green" />
          <Sep />
          <CounterCell value={`${attacks.toLocaleString()}`} label="attacks blocked" />
        </div>
      </div>
    </section>
  );
}

function CounterCell({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "green";
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="font-mono tabular-nums font-semibold"
        style={{
          color: tone === "green" ? "#15803D" : "#0A0A0A",
          fontSize: 17,
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ color: "#9CA3AF", fontSize: 9.5 }}
      >
        {label}
      </span>
    </div>
  );
}

function Sep() {
  return (
    <span
      style={{
        width: 1,
        height: 16,
        background: "rgba(15,23,42,0.10)",
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────
   How it works — three columns
   ────────────────────────────────────────────────────────────────── */

function HowItWorks() {
  const cols = [
    {
      icon: <Zap className="w-5 h-5" strokeWidth={1.6} />,
      title: "Fund a vault.",
      body: "Real Squads multisig on Solana. You hold the keys; the agent gets a session pass.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5" strokeWidth={1.6} />,
      title: "Set policy.",
      body: (
        <>
          Caps, merchant allowlists, kill switch. Compiled to a Solana program
          at{" "}
          <a
            href={PROGRAM_LINK}
            target="_blank"
            rel="noreferrer"
            className="font-mono hover:underline"
            style={{ color: "#0A0A0A" }}
          >
            PpmZ…MSqc
          </a>
          .
        </>
      ),
    },
    {
      icon: <Sparkles className="w-5 h-5" strokeWidth={1.6} />,
      title: "Run autonomously.",
      body: "Wraps pay.sh, x402, and any HTTP-402 rail with on-chain budgets. Agent earnings can flow to a KAST-funded card.",
    },
  ];

  return (
    <section className="px-6 py-20" style={{ background: "#FFFFFF" }}>
      <div className="mx-auto max-w-[1080px]">
        <div className="text-center mb-12">
          <span
            className="font-mono uppercase tracking-[0.18em]"
            style={{ color: "#9CA3AF", fontSize: 10 }}
          >
            How it works
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cols.map((c, i) => (
            <div
              key={i}
              className="rounded-[16px] p-6"
              style={{
                background: "#FAFAFA",
                border: "1px solid rgba(15,23,42,0.05)",
              }}
            >
              <div
                className="w-10 h-10 rounded-[10px] inline-flex items-center justify-center mb-4"
                style={{
                  background: "#FFFFFF",
                  color: "#0A0A0A",
                  border: "1px solid rgba(15,23,42,0.08)",
                }}
              >
                {c.icon}
              </div>
              <h3
                className="text-[18px] font-semibold tracking-[-0.015em] mb-2"
                style={{ color: "#0A0A0A" }}
              >
                {c.title}
              </h3>
              <p
                className="text-[14px] leading-[1.6]"
                style={{ color: "#6B7280" }}
              >
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Proof strip — logo bar + tagline
   ────────────────────────────────────────────────────────────────── */

function ProofStrip() {
  const logos = ["Solana", "Squads", "pay.sh", "KAST", "npm"];
  return (
    <section className="px-6 py-12" style={{ background: "#FAFAFA" }}>
      <div className="mx-auto max-w-[1080px] text-center">
        <div className="flex items-center justify-center gap-6 flex-wrap mb-5">
          {logos.map((l, i) => (
            <span
              key={l}
              className="font-mono"
              style={{ color: "#9CA3AF", fontSize: 13 }}
            >
              {l}
              {i < logos.length - 1 && (
                <span className="ml-6" style={{ color: "#D1D5DB" }}>
                  ·
                </span>
              )}
            </span>
          ))}
        </div>
        <p className="text-[12px]" style={{ color: "#9CA3AF" }}>
          Built for Solana Frontier 2026. Devnet today. Mainnet auditing in
          progress. Compatible with pay.sh and KAST deposit rails.
        </p>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Footer
   ────────────────────────────────────────────────────────────────── */

function FooterStrip() {
  return (
    <footer
      className="px-6 py-8"
      style={{
        background: "#FFFFFF",
        borderTop: "1px solid rgba(15,23,42,0.05)",
      }}
    >
      <div className="mx-auto max-w-[1080px] flex items-center justify-between gap-4 flex-wrap">
        <span
          className="font-mono"
          style={{ color: "#9CA3AF", fontSize: 11 }}
        >
          © Kyvern · Made in Pakistan · Built for Solana Frontier 2026
        </span>
        <div className="flex items-center gap-5">
          <Link href="/docs" className="text-[12px] hover:underline" style={{ color: "#6B7280" }}>
            Docs
          </Link>
          <Link href="/atlas" className="text-[12px] hover:underline" style={{ color: "#6B7280" }}>
            Evidence
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] hover:underline"
            style={{ color: "#6B7280" }}
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
