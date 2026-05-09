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
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";
import type { PanelKind } from "@/components/device/home/affordance-row";
import { OpenBayPanel } from "@/components/device/panels/open-bay-panel";
import { UseDevicePanel } from "@/components/device/panels/use-device-panel";
import { BuilderPanel } from "@/components/device/panels/builder-panel";
import { SandboxBanner } from "@/components/device/home/sandbox-banner";
import type { ActionFeedItem } from "@/components/device/home/action-feed";
import { TopUpDrawer } from "@/components/device/top-up-drawer";
// Phase 1–5 (Device Shell Redesign) — device-shell composition.
import { IdentityStrip } from "@/components/device/shell/identity-strip";
import { CanvasZone } from "@/components/device/shell/canvas-zone";
import { ControlZone } from "@/components/device/shell/control-zone";
import { ManifestoStrip } from "@/components/device/shell/manifesto-strip";
import { StateStrip } from "@/components/device/state-strip";
import { FirstFindingToast } from "@/components/device/first-finding-toast";
import type { DeviceState } from "@/lib/device-state";

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
  /** Phase 6 — TUNE badge gates on this. */
  personalized?: boolean;
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
  // Phase 4 — "Working for you this week" strip
  weeklyBenefit?: {
    drafts: number;
    alerts: number;
    triggersFired: number;
    aiSpendUsd: number;
    dailyCapUsd: number;
  };
  // Phase 6 (Frontier Grand Champion) — activation-flow state.
  deviceState?: DeviceState;
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
  const { wallet, isAuthenticated, isLoading, signIn } = useAuth();
  const { init } = useDeviceStore();
  // Guest mode = synthetic dev-wallet in localStorage AND no Privy
  // session. Determines the SANDBOX banner + the gates on Tab 2/3.
  const [isGuest, setIsGuest] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const dev = window.localStorage.getItem("kyvern:dev-wallet");
    setIsGuest(!!dev && !isAuthenticated);
  }, [isAuthenticated]);

  const [vault, setVault] = useState<VaultBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);

  // Panel state — synced to ?panel= so deep-links work and refresh
  // restores the open panel. NEVER stash this in localStorage; URL is
  // the single source of truth.
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPanel = searchParams?.get("panel");
  const panel: PanelKind | null =
    rawPanel === "bay" || rawPanel === "use" || rawPanel === "builder"
      ? rawPanel
      : null;
  const setPanel = useCallback(
    (next: PanelKind | null) => {
      const params = new URLSearchParams(
        Array.from(searchParams?.entries() ?? []),
      );
      if (next) params.set("panel", next);
      else params.delete("panel");
      const qs = params.toString();
      router.replace(qs ? `/app?${qs}` : "/app", { scroll: false });
    },
    [router, searchParams],
  );

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

      {/* SANDBOX BANNER — guests see this above the device shell. */}
      {isGuest && (
        <div className="px-3 pt-2">
          <SandboxBanner />
        </div>
      )}

      {/* DEVICE SHELL — the new full-bleed layout. No chassis bezel.
          Identity strip top · canvas + control grid middle · manifesto
          bottom (TabBar continues to render via KyvernOS). */}
      <div
        className="device-shell flex flex-col mx-auto w-full"
        style={{
          maxWidth: 1440,
          minHeight:
            "calc(100dvh - 88px)" /* TabBar height + safe-area padding */,
        }}
      >
        <IdentityStrip
          serial={status?.serial ?? null}
          bornAt={status?.bornAt ?? null}
          network={status?.network ?? "devnet"}
          paused={status?.paused ?? false}
          usdcBalance={status?.usdcBalance ?? 0}
          className="h-14 flex-shrink-0"
        />

        <main
          className="flex-1 min-h-0 grid gap-4 sm:gap-6 p-4 sm:p-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          {/* STATE STRIP — Phase 6 Frontier-grand-champion activation
              flow. Vanishes when state === 'active'. Spans the full
              grid width — without col-span the strip would push
              CanvasZone into the 380px sidebar slot. */}
          {status?.deviceState && status.deviceState !== "active" && (
            <div className="lg:col-span-2 -mb-1">
              <StateStrip
                state={status.deviceState}
                onTopUp={onTopUp}
                firstUntunedHref={
                  (status.workers.find((w) => w.personalized === false)?.id
                    && `/app/agents/${
                      status.workers.find((w) => w.personalized === false)
                        ?.id
                    }`) ||
                  null
                }
              />
            </div>
          )}

          {status && status.workers.length > 0 ? (
            <CanvasZone
              workers={status.workers}
              lastActionByWorker={lastActionByWorker}
              actionFeed={status.actionFeed ?? []}
              usdcBalance={status.usdcBalance}
              network={status.network}
              paused={status.paused}
              dailyLimitUsd={status.policySummary?.dailyLimitUsd}
              dailySpentUsd={status.policySummary?.dailySpentUsd}
              deviceState={status.deviceState}
              className="min-h-0"
            />
          ) : (
            <NoWorkersState />
          )}

          <ControlZone
            actionFeed={status?.actionFeed ?? []}
            network={status?.network ?? "devnet"}
            weeklyBenefit={status?.weeklyBenefit ?? null}
            policySummary={status?.policySummary ?? null}
            vaultEmpty={(status?.usdcBalance ?? 0) < 0.01}
            onTopUp={onTopUp}
            panel={panel}
            onOpenPanel={setPanel}
            className="min-h-0"
          />
        </main>

        <ManifestoStrip className="h-8 flex-shrink-0" />
      </div>

      {/* THREE INSTRUMENT-DRAWER PANELS — phase 2 wires the real logic.
          Each panel owns its own DevicePanel shell + body. */}
      <OpenBayPanel
        open={panel === "bay"}
        onClose={() => setPanel(null)}
        deviceId={deviceId}
        workers={status?.workers ?? []}
        isGuest={isGuest}
        onSignIn={signIn}
      />
      <UseDevicePanel
        open={panel === "use"}
        onClose={() => setPanel(null)}
        deviceId={deviceId}
        network={status?.network ?? "devnet"}
        vaultEmpty={(status?.usdcBalance ?? 0) < 0.01}
        onTopUp={onTopUp}
        isGuest={isGuest}
      />
      <BuilderPanel
        open={panel === "builder"}
        onClose={() => setPanel(null)}
        deviceId={deviceId}
        network={status?.network ?? "devnet"}
        isGuest={isGuest}
        onSignIn={signIn}
        policySummary={status?.policySummary ?? null}
        perTxMaxUsd={0.5}
      />

      <TopUpDrawer
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        vaultPda={status?.vaultPda ?? null}
        usdcAta={status?.usdcAta ?? null}
        network={status?.network ?? "devnet"}
        solBalance={status?.solBalance ?? 0}
        usdcBalance={status?.usdcBalance ?? 0}
      />

      {/* Phase 6 — first-finding toast fires once per device when the
          first user-facing Phase 3 SignalKind lands in actionFeed. */}
      <FirstFindingToast
        deviceId={deviceId}
        signals={(status?.actionFeed ?? []).map((it) => ({
          id: it.id,
          kind: it.tool === "stake_on_finding" ? "trigger_fired" : it.tool,
          worker: it.worker,
        }))}
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
