"use client";

/**
 * /app — Device Home (Phase 6: discovery-first reframe).
 *
 * The closed-circuit trio economy ("$0.00 earned today") was the
 * mathematically-truthful but narratively-hollow Phase 5 headline.
 * Phase 6 re-leads with the *discovery* output of the workers — the
 * real value the user actually wants:
 *
 *   • DISCOVERY HERO — "Your workers found N opportunities today" —
 *     headline, with $ surfaced + validated + actionable sub-pills,
 *     and the closed-loop economy demoted to a small footer pill.
 *   • LATEST OPPORTUNITIES — the inbox findings strip, promoted from
 *     the demoted /app/inbox to the home page so users see what their
 *     workers actually surfaced without an extra click.
 *   • LIVE LOOP (formerly Action Feed) — economic activity log with
 *     Explorer links. Stays as proof, not headline.
 *   • POLICY SHIELD — on-chain enforcement bar.
 *   • WORKER STRIP — per-worker chip row.
 *   • BALANCE ORBIT — secondary visual signature.
 *   • TODAY STRIP — full grid of today's stats.
 *   • DeviceFAB — top-up / hire-worker.
 *
 * Live data: `/api/devices/[id]/live-status` polled every 5s, now
 * returning a `discoveryToday` block (opportunities count, surfaced
 * value USD, validated count, actionable count) added in Phase 6.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";
import { DeviceChassis } from "@/components/device/home/chassis";
import { BalanceOrbit } from "@/components/device/home/balance-orbit";
import { TodayStrip } from "@/components/device/home/today-strip";
import { DiscoveryHero } from "@/components/device/home/discovery-hero";
import { RevenueTerminal } from "@/components/device/home/revenue-terminal";
import { LatestOpportunities } from "@/components/device/home/latest-opportunities";
import { ActionFeed } from "@/components/device/home/action-feed";
import type { ActionFeedItem } from "@/components/device/home/action-feed";
import { WorkerStrip } from "@/components/device/home/worker-strip";
import { PolicyShield } from "@/components/device/home/policy-shield";
import { DeviceFAB } from "@/components/device/home/device-fab";
import { TopUpDrawer } from "@/components/device/top-up-drawer";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface VaultBrief {
  vault: { id: string; name: string; emoji: string; pausedAt: string | null; network: string };
}

interface LiveWorker {
  id: string;
  name: string;
  emoji: string;
  template: string;
  isThinking: boolean;
  lastThoughtAt: number | null;
  totalThoughts: number;
  totalEarnedUsd: number;
}

interface LiveStatus {
  serial: string;
  network: "devnet" | "mainnet";
  paused: boolean;
  bornAt: string;
  usdcBalance: number;
  solBalance: number;
  vaultPda: string | null;
  usdcAta: string | null;
  pnlToday: { earned: number; spent: number; net: number };
  pnlSparkline: number[];
  workersActive: number;
  earningPerMinUsd: number;
  workers: LiveWorker[];
  signalsToday?: { total: number; unread: number; read: number; actionable: number };
  onChainToday?: number;
  actionFeed?: ActionFeedItem[];
  policyLastAction?: {
    id: string;
    merchant: string;
    amountUsd: number;
    approved: boolean;
    reason: string | null;
    txSignature: string | null;
    createdAt: number;
  } | null;
  // Phase 6 — discovery-first headline metrics
  discoveryToday?: {
    opportunities: number;
    surfacedValueUsd: number;
    validated: number;
    actionable: number;
  };
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  const K = "kyvern:dev-wallet";
  const e = window.localStorage.getItem(K);
  if (e) return e;
  const a = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) s += a[Math.floor(Math.random() * a.length)];
  window.localStorage.setItem(K, s);
  return s;
}

const VERB_BY_TOOL: Record<string, string> = {
  post_task: "posted a task",
  claim_task: "claimed a task",
  complete_task: "completed a task",
  stake_on_finding: "staked on a finding",
  subscribe_to_agent: "subscribed to feed",
};

export default function DeviceHome() {
  const { wallet, isLoading } = useAuth();
  const { init } = useDeviceStore();

  const [vault, setVault] = useState<VaultBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);

  // Resolve the user's primary device once
  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) {
      setLoading(false);
      return;
    }
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) {
          setVault(vaults[0]);
          init(vaults[0].vault.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoading, wallet, init]);

  // Poll live-status every 5s
  const deviceId = vault?.vault.id ?? null;
  useEffect(() => {
    if (!deviceId) return;
    let alive = true;
    const load = () => {
      fetch(`/api/devices/${deviceId}/live-status`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: LiveStatus | null) => {
          if (alive && d) setStatus(d);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 5_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [deviceId]);

  const onTopUp = useCallback(() => setTopUpOpen(true), []);

  // Derive last-verb-by-agent from the action feed so the WorkerStrip
  // shows a real recent action ("staked", "completed", etc.) instead
  // of the template's default verb. Falls back inside WorkerStrip.
  const lastVerbByAgent = useMemo(() => {
    const feed = status?.actionFeed ?? [];
    const map: Record<string, string> = {};
    for (const item of feed) {
      if (map[item.worker.id]) continue;
      const v = VERB_BY_TOOL[item.tool];
      if (v) map[item.worker.id] = v;
    }
    return map;
  }, [status?.actionFeed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "#0A0A0A" }}
        />
      </div>
    );
  }

  if (!vault) return <NoDeviceState />;

  return (
    <>
      <div className="py-2">
        <DeviceChassis
          serial={status?.serial ?? null}
          bornAt={status?.bornAt ?? null}
          paused={status?.paused ?? false}
          network={status?.network ?? "devnet"}
        >
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* DISCOVERY HERO (Phase 6) — leads with what workers
                FOUND for the user, not the closed-loop $ they
                shuffled. Pulse-on-increment glow when a new opp
                lands. The closed-loop economy is demoted to a small
                footer pill on this card so the proof is still here. */}
            <DiscoveryHero
              opportunitiesToday={status?.discoveryToday?.opportunities ?? 0}
              surfacedValueUsd={status?.discoveryToday?.surfacedValueUsd ?? 0}
              validatedToday={status?.discoveryToday?.validated ?? 0}
              actionableToday={status?.discoveryToday?.actionable ?? 0}
              earnedToday={status?.pnlToday.earned ?? 0}
              onChainToday={status?.onChainToday ?? 0}
              workersActive={status?.workersActive ?? 0}
            />

            {/* REVENUE TERMINAL (Phase 8) — proves money is flowing
                IN, not just shuffling between trio workers. External
                buyer-bot pays Atlas's x402 feed every 30s; each
                purchase is a real Solana settlement signature
                clickable on Explorer. Closes the simulated-earnings
                narrative gap. */}
            <RevenueTerminal />

            {/* LATEST OPPORTUNITIES — the inbox findings strip,
                promoted to /app home so users see what their workers
                actually surfaced without navigating to /app/inbox.
                Auto-hides if no signals exist yet. */}
            {deviceId && <LatestOpportunities deviceId={deviceId} />}

            {/* LIVE LOOP (formerly Action Feed) — every post / claim /
                complete / stake, with Explorer links. Demoted from
                Phase-5 headline; stays as economic-loop proof. */}
            <ActionFeed
              items={status?.actionFeed ?? []}
              network={status?.network ?? "devnet"}
            />

            {/* POLICY SHIELD — compact "what the chain enforced last"
                bar. Owns its own polling at a slower cadence (15s)
                so we don't load it from this page's status feed. */}
            {deviceId && <PolicyShield deviceId={deviceId} />}

            {/* WORKERS — compact chip row showing each worker's last
                tool verb + total earnings. Demoted from the old
                scrollable findings strip per Phase 5. */}
            <WorkerStrip
              workers={status?.workers ?? []}
              lastVerbByAgent={lastVerbByAgent}
            />

            {/* BALANCE ORBIT — secondary now. Still the device's
                visual signature for screenshots, but no longer the
                headline. */}
            <BalanceOrbit
              usdcBalance={status?.usdcBalance ?? 0}
              pnlNet={status?.pnlToday.net ?? 0}
              earningPerMinUsd={status?.earningPerMinUsd ?? 0}
              workers={status?.workers ?? []}
              workerHref={(id) => `/app/agents/${id}`}
              hireHref="/app/agents/spawn"
            />

            {/* TODAY STRIP — full grid of today's stats. */}
            <TodayStrip
              earnedToday={status?.pnlToday.earned ?? 0}
              spentToday={status?.pnlToday.spent ?? 0}
              signalsToday={status?.signalsToday?.total ?? 0}
              workersActive={status?.workersActive ?? 0}
              workersTotal={(status?.workers ?? []).length}
              onChainToday={status?.onChainToday ?? 0}
            />

            <div className="flex items-center justify-center pt-1">
              <Link
                href="/atlas"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9CA3AF] hover:text-[#0A0A0A] transition"
              >
                Watch Atlas →
              </Link>
            </div>
          </div>
        </DeviceChassis>
      </div>

      <DeviceFAB onTopUp={onTopUp} hireHref="/app/agents/spawn" />

      <TopUpDrawer
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        vaultPda={status?.vaultPda ?? null}
        usdcAta={status?.usdcAta ?? null}
        network={status?.network ?? "devnet"}
        solBalance={status?.solBalance ?? 0}
        usdcBalance={status?.usdcBalance ?? 0}
      />
    </>
  );
}

function NoDeviceState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="flex flex-col items-center text-center py-20"
    >
      <div
        className="w-[80px] h-[80px] rounded-[22px] mb-5 flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #FFFFFF, #F3F4F6)",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 8px 24px -10px rgba(15,23,42,0.10)",
        }}
      >
        <span className="text-[32px]">🧭</span>
      </div>
      <h2 className="text-[22px] font-semibold text-[#0A0A0A] tracking-tight">
        A device that earns for you.
      </h2>
      <p className="mt-2 text-[14px] text-[#6B6B6B] max-w-[340px] leading-[1.6]">
        Workers post, claim, and complete paid tasks on-chain. You set the budget; the policy program enforces it.
      </p>
      <Link
        href="/app/agents/spawn"
        className="group mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-[14px] text-[14px] font-semibold transition-all active:scale-[0.97]"
        style={{ background: "#0A0A0A", color: "#fff" }}
      >
        Get started
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
