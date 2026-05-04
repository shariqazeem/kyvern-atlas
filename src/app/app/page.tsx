"use client";

/**
 * /app — the Live Engine.
 *
 * The pre-Live-Engine /app stacked nine separate dashboard cards inside
 * the device chassis. It was a dashboard. Dashboards force the viewer
 * to interpret the story; a Frontier judge swiping on a phone for eight
 * seconds will not. So the headline is now exactly three things:
 *
 *   1. TOP RAIL — the device frame (KVN serial · uptime · vault USDC ·
 *      "Secured by Squads"). The device noun, made tangible.
 *   2. WORKER STAGE — three vertical tiles, one per worker. Each tile
 *      shows status LED + verb + outcome line ("Tried $0.40 → ❌
 *      Blocked (daily cap)" / "Earned $0.15 → Settled") + Explorer
 *      pill. Tap → /app/agents/[id]. The worker noun, made the
 *      protagonist. The outcome line surfaces the chain as the
 *      antagonist — the unforgettable thing.
 *   3. BOTTOM RAIL — daily-cap gauge + calls today + blocked today +
 *      latest settled tx pill. The dollar noun, made the scoreboard.
 *
 * Everything else (ActionFeed · RevenueTerminal · PolicyShield ·
 * LatestOpportunities · DiscoveryHero · TodayStrip · BalanceOrbit) is
 * still alive — it just lives inside the "View full activity" pull-up
 * sheet now. One layer of depth, not nine columns of breadth.
 *
 * Data: `/api/devices/[id]/live-status` polled every 5s. Same payload
 * as before plus an additive `policySummary` block for the bottom rail.
 * No new endpoints, no new tools, no new fetches — exactly the data we
 * already had, just shown as a scene instead of a wall.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";
import { DeviceChassis } from "@/components/device/home/chassis";
import { TopRail } from "@/components/device/home/top-rail";
import { BottomRail } from "@/components/device/home/bottom-rail";
import { WorkerTile } from "@/components/device/home/worker-tile";
import { ActivitySheet } from "@/components/device/home/activity-sheet";
import { BalanceOrbit } from "@/components/device/home/balance-orbit";
import { TodayStrip } from "@/components/device/home/today-strip";
import { DiscoveryHero } from "@/components/device/home/discovery-hero";
import { RevenueTerminal } from "@/components/device/home/revenue-terminal";
import { LatestOpportunities } from "@/components/device/home/latest-opportunities";
import { ActionFeed } from "@/components/device/home/action-feed";
import type { ActionFeedItem } from "@/components/device/home/action-feed";
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
  // Live Engine — bottom-rail scoreboard summary
  policySummary?: {
    dailyLimitUsd: number;
    dailySpentUsd: number;
    callsToday: number;
    blockedToday: number;
    lastSettledTxSignature: string | null;
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

export default function DeviceHome() {
  const { wallet, isLoading } = useAuth();
  const { init } = useDeviceStore();

  const [vault, setVault] = useState<VaultBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

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

  // Live Engine — most recent ActionFeedItem per worker. Each
  // WorkerTile uses its own to render the verb + outcome line.
  const lastActionByWorker = useMemo(() => {
    const feed = status?.actionFeed ?? [];
    const map: Record<string, ActionFeedItem> = {};
    for (const item of feed) {
      if (!map[item.worker.id]) map[item.worker.id] = item;
    }
    return map;
  }, [status?.actionFeed]);

  // Phase 8 — chassis-level "the device just lit up" bezel flash. Fires
  // when a new opportunity lands (discoveryToday.opportunities ticks up).
  // The DiscoveryHero + RevenueTerminal cards have their own pulse glow
  // rings; this is the higher-level "the whole device noticed" cue.
  const prevOpportunitiesRef = useRef<number | null>(null);
  const [bezelFlashKey, setBezelFlashKey] = useState(0);
  useEffect(() => {
    const opps = status?.discoveryToday?.opportunities ?? 0;
    const prev = prevOpportunitiesRef.current;
    if (prev !== null && opps > prev) {
      setBezelFlashKey((k) => k + 1);
    }
    prevOpportunitiesRef.current = opps;
  }, [status?.discoveryToday?.opportunities]);

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
      {/* Phase 8 — chassis bezel-flash. Pointer-events:none so it never
          intercepts clicks. Inset green glow + outer halo, 1.4s fade.
          Fires on opportunity arrival; the rest of /app's per-card
          pulses still trigger normally on top. */}
      <AnimatePresence>
        {bezelFlashKey > 0 && (
          <motion.div
            key={bezelFlashKey}
            aria-hidden
            className="pointer-events-none fixed inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{
              boxShadow:
                "inset 0 0 0 2px rgba(34,197,94,0.55), inset 0 0 80px rgba(34,197,94,0.18)",
            }}
          />
        )}
      </AnimatePresence>

      <div className="py-2">
        <DeviceChassis
          serial={status?.serial ?? null}
          bornAt={status?.bornAt ?? null}
          paused={status?.paused ?? false}
          network={status?.network ?? "devnet"}
        >
          <div className="flex flex-col gap-3.5 sm:gap-4">
            {/* TOP RAIL — device frame. Serial · uptime · vault · Squads. */}
            <TopRail
              serial={status?.serial ?? null}
              bornAt={status?.bornAt ?? null}
              usdcBalance={status?.usdcBalance ?? 0}
              network={status?.network ?? "devnet"}
              paused={status?.paused ?? false}
            />

            {/* WORKER STAGE — three vertical tiles, the protagonists.
                Each tile renders verb + outcome line ("Tried $X →
                Approved" / "Attempted $X → Blocked (cap)") so the
                chain reads as the visible enforcer. Tap → /app/agents/[id]. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
              {(status?.workers ?? []).map((w) => (
                <WorkerTile
                  key={w.id}
                  worker={w}
                  action={lastActionByWorker[w.id] ?? null}
                  network={status?.network ?? "devnet"}
                />
              ))}
              {(!status || status.workers.length === 0) && (
                <NoWorkersState />
              )}
            </div>

            {/* BOTTOM RAIL — daily-cap gauge · calls today · blocked
                today · last settled tx pill. The dollar scoreboard. */}
            <BottomRail
              summary={status?.policySummary ?? null}
              network={status?.network ?? "devnet"}
            />

            {/* The single seam to the demoted dashboard. One tap. */}
            <button
              type="button"
              onClick={() => setActivityOpen(true)}
              className="self-center inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.16em] hover:opacity-80 transition py-2"
              style={{
                fontSize: 10.5,
                color: "rgba(15,23,42,0.55)",
              }}
            >
              View full activity
              <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </DeviceChassis>
      </div>

      <DeviceFAB onTopUp={onTopUp} hireHref="/app/agents/spawn" />

      {/* The deeper dashboard, kept whole but moved one tap away. */}
      <ActivitySheet
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
      >
        <DiscoveryHero
          opportunitiesToday={status?.discoveryToday?.opportunities ?? 0}
          surfacedValueUsd={status?.discoveryToday?.surfacedValueUsd ?? 0}
          validatedToday={status?.discoveryToday?.validated ?? 0}
          actionableToday={status?.discoveryToday?.actionable ?? 0}
          earnedToday={status?.pnlToday.earned ?? 0}
          onChainToday={status?.onChainToday ?? 0}
          workersActive={status?.workersActive ?? 0}
        />
        <RevenueTerminal />
        {deviceId && <LatestOpportunities deviceId={deviceId} />}
        <ActionFeed
          items={status?.actionFeed ?? []}
          network={status?.network ?? "devnet"}
        />
        {deviceId && <PolicyShield deviceId={deviceId} />}
        <BalanceOrbit
          usdcBalance={status?.usdcBalance ?? 0}
          pnlNet={status?.pnlToday.net ?? 0}
          earningPerMinUsd={status?.earningPerMinUsd ?? 0}
          workers={status?.workers ?? []}
          workerHref={(id) => `/app/agents/${id}`}
          hireHref="/app/agents/spawn"
        />
        <TodayStrip
          earnedToday={status?.pnlToday.earned ?? 0}
          spentToday={status?.pnlToday.spent ?? 0}
          signalsToday={status?.signalsToday?.total ?? 0}
          workersActive={status?.workersActive ?? 0}
          workersTotal={(status?.workers ?? []).length}
          onChainToday={status?.onChainToday ?? 0}
        />
      </ActivitySheet>

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

function NoWorkersState() {
  return (
    <div
      className="col-span-full rounded-[16px] px-5 py-8 text-center"
      style={{
        background: "#FFFFFF",
        border: "1px dashed rgba(15,23,42,0.10)",
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.18em] mb-2"
        style={{ color: "rgba(15,23,42,0.55)", fontSize: 10.5 }}
      >
        No workers yet
      </div>
      <p className="text-[13px]" style={{ color: "#475569" }}>
        Spawn your first worker to see the engine come alive.
      </p>
    </div>
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
