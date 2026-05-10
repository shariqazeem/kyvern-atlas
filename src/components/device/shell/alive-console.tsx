"use client";

/**
 * AliveConsole — replaces DevTilesCanvas when ?alive=1 is set, per
 * TRANSFORM_24H §"What we transform". Two columns inside the existing
 * vault-anchored chassis:
 *
 *   [ Integration wizard ]   [ Live event feed ]
 *
 * The chassis (vault anchor at the bottom, dot-grid backdrop, soft
 * green halo) is preserved pixel-for-pixel from DevTilesCanvas. Only
 * the contents of the worker-stage slot change.
 *
 * Hour 0 — this is a stub. The wizard goes in T2 (left column),
 * the event feed goes in T1 (right column). Both slots show
 * placeholder copy + the empty-state hook so a /app?alive=1 visit
 * doesn't 500 even before the real components ship.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { PanelKind } from "../home/affordance-row";
import { AgentEventFeed } from "../feed/agent-event-feed";
import { IntegrationWizard } from "../wizard/integration-wizard";
import { GraphCanvas } from "../graph-canvas/canvas";
import { BuilderModal } from "../builder/modal";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Props {
  vaultId: string | null;
  ownerWallet: string | null;
  agentKeyPrefix: string | null;
  usdcBalance: number;
  paused?: boolean;
  network?: "devnet" | "mainnet";
  onTileClick?: (panel: PanelKind) => void;
  className?: string;
}

export function AliveConsole({
  vaultId,
  ownerWallet,
  agentKeyPrefix: agentKeyPrefixProp,
  usdcBalance,
  paused,
  network = "devnet",
  className,
}: Props) {
  // T4 — fetch agent key prefix for the live status line + today
  // stats from the events endpoint. Both poll alongside the feed
  // so the chassis stays in sync as the user runs vault.pay() calls.
  const [keyPrefix, setKeyPrefix] = useState<string | null>(agentKeyPrefixProp);
  const [stats, setStats] = useState<TodayStatsT>({
    callsToday: 0,
    blockedToday: 0,
    spentTodayUsd: 0,
    lastEventTs: null,
  });

  // Agent platform v1 — graph canvas + builder modal
  const router = useRouter();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);

  // Hydrate agent key prefix once
  useEffect(() => {
    if (!vaultId || keyPrefix) return;
    let cancelled = false;
    void fetch(`/api/devices/${vaultId}/agent-key`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.keyPrefix) setKeyPrefix(d.keyPrefix);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [vaultId, keyPrefix]);

  // Poll today's stats every 5s
  useEffect(() => {
    if (!vaultId || !ownerWallet) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/vault/${vaultId}/events?limit=200`, {
          headers: { "x-owner-wallet": ownerWallet },
        });
        if (!r.ok) return;
        const data = (await r.json()) as {
          events: Array<{
            ts: string;
            status: string;
            amountUsd: number;
          }>;
          latestTs: string | null;
        };
        if (cancelled) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayMs = todayStart.getTime();
        let calls = 0;
        let blocked = 0;
        let spent = 0;
        for (const ev of data.events) {
          const evMs = parseTs(ev.ts);
          if (evMs < todayMs) continue;
          calls += 1;
          if (ev.status === "blocked" || ev.status === "failed") blocked += 1;
          if (ev.status === "settled" || ev.status === "allowed")
            spent += ev.amountUsd;
        }
        setStats({
          callsToday: calls,
          blockedToday: blocked,
          spentTodayUsd: spent,
          lastEventTs: data.latestTs,
        });
      } catch {
        /* swallow */
      }
    };
    void tick();
    const t = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [vaultId, ownerWallet]);

  return (
    <div className={`flex flex-col gap-3 h-full ${className ?? ""}`}>
      {/* T4 — live agent status line */}
      <AgentStatusLine keyPrefix={keyPrefix} lastEventTs={stats.lastEventTs} />

      {/* Agent platform v1 — graph canvas. Empty state: deploy CTA.
          Otherwise: tiles + strings to vault. Clicking a tile opens
          the agent detail page. */}
      <GraphCanvas
        key={canvasRefreshKey}
        vaultId={vaultId}
        ownerWallet={ownerWallet}
        usdcBalance={usdcBalance}
        paused={paused}
        network={network}
        onDeployClick={() => setBuilderOpen(true)}
        onAgentClick={(agentId) => router.push(`/app/agents/${agentId}`)}
      />

      {/* Whisper line */}
      <div className="text-center px-4">
        <p
          className="text-[12.5px] tracking-[-0.005em]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          Mint your key. Run three lines. Watch the chain decide every dollar.
        </p>
      </div>

      {/* Vault-anchored frame — same chassis as DevTilesCanvas */}
      <div
        className="relative w-full flex flex-col p-4 sm:p-5 gap-4"
        style={{
          minHeight: 380,
          background:
            "radial-gradient(ellipse at 50% 88%, rgba(34,197,94,0.08) 0%, transparent 55%), linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.05)",
        }}
      >
        {/* Faint dot grid backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-[16px]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(15,23,42,0.05) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
            opacity: 0.6,
            maskImage:
              "radial-gradient(ellipse at 50% 50%, black 50%, transparent 90%)",
          }}
        />

        {/* Two-column body — wizard on the left, feed on the right */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[340px]">
          {/* Left: 5-step integration wizard (T2) */}
          <IntegrationWizard
            vaultId={vaultId}
            ownerWallet={ownerWallet}
            className="min-h-[340px]"
          />
          {/* Right: live event feed (T1) */}
          <AgentEventFeed
            vaultId={vaultId}
            ownerWallet={ownerWallet}
            className="min-h-[340px]"
          />
        </div>

        {/* T4 — today's stats row, just above the vault anchor */}
        <TodayStats stats={stats} />

        {/* Vault anchor at the bottom — same as DevTilesCanvas */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
          className="relative z-10 flex items-center justify-center"
        >
          <div
            className="rounded-[14px] px-4 py-2.5 inline-flex items-center gap-3 flex-wrap justify-center"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow:
                "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -16px rgba(15,23,42,0.20)",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: paused ? "#F59E0B" : "#22C55E",
                  boxShadow: paused
                    ? "0 0 0 3px rgba(245,158,11,0.18)"
                    : "0 0 0 3px rgba(34,197,94,0.18)",
                }}
              />
              <span
                className="font-mono uppercase tracking-[0.16em]"
                style={{ fontSize: 9.5, color: "#9CA3AF" }}
              >
                Vault · {paused ? "Paused" : "Live"} · {network}
              </span>
            </div>
            <span style={{ width: 1, height: 12, background: "rgba(15,23,42,0.10)" }} />
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-mono tabular-nums font-semibold"
                style={{ fontSize: 16, color: "#0A0A0A" }}
              >
                ${usdcBalance.toFixed(2)}
              </span>
              <span
                className="font-mono uppercase tracking-[0.14em]"
                style={{ fontSize: 9, color: "#9CA3AF" }}
              >
                USDC
              </span>
            </div>
          </div>
        </motion.div>

        {/* Footnote */}
        <p
          className="relative z-10 text-center text-[10.5px]"
          style={{ color: "#9CA3AF" }}
        >
          Secured by Squads · enforced by{" "}
          <a
            href="https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet"
            target="_blank"
            rel="noreferrer"
            className="font-mono hover:underline"
            style={{ color: "#6B7280" }}
          >
            PpmZ…MSqc
          </a>
        </p>
      </div>

      {/* Builder modal — open from the canvas's deploy CTA */}
      <BuilderModal
        open={builderOpen}
        vaultId={vaultId}
        ownerWallet={ownerWallet}
        onClose={() => setBuilderOpen(false)}
        onDeployed={() => {
          setBuilderOpen(false);
          // Bump the canvas's key so it remounts + refetches
          setCanvasRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   T4 — Agent status line + today stats row
   ────────────────────────────────────────────────────────────────── */

interface TodayStatsT {
  callsToday: number;
  blockedToday: number;
  spentTodayUsd: number;
  lastEventTs: string | null;
}

function AgentStatusLine({
  keyPrefix,
  lastEventTs,
}: {
  keyPrefix: string | null;
  lastEventTs: string | null;
}) {
  const hasActivity = !!lastEventTs;
  const display = keyPrefix ? `${keyPrefix}…` : "no key minted yet";

  return (
    <div
      className="flex items-center justify-center gap-2.5 px-3 py-1.5 rounded-full mx-auto"
      style={{
        background: "rgba(15,23,42,0.04)",
        border: "1px solid rgba(15,23,42,0.06)",
        maxWidth: "fit-content",
      }}
    >
      <span className="flex items-center gap-1.5">
        <motion.span
          className="rounded-full"
          style={{
            width: 6,
            height: 6,
            background: hasActivity ? "#22C55E" : "#9CA3AF",
            boxShadow: hasActivity
              ? "0 0 0 3px rgba(34,197,94,0.18), 0 0 6px #22C55E"
              : "none",
          }}
          animate={
            hasActivity
              ? { opacity: [0.55, 1, 0.55] }
              : { opacity: 0.55 }
          }
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9, color: "#9CA3AF" }}
        >
          Your agent
        </span>
      </span>
      <span style={{ width: 1, height: 10, background: "rgba(15,23,42,0.10)" }} />
      <span
        className="font-mono truncate"
        style={{ fontSize: 11, color: keyPrefix ? "#0A0A0A" : "rgba(15,23,42,0.45)", maxWidth: 160 }}
      >
        {display}
      </span>
      {hasActivity && (
        <>
          <span style={{ width: 1, height: 10, background: "rgba(15,23,42,0.10)" }} />
          <span
            className="font-mono"
            style={{ fontSize: 10.5, color: "#15803D" }}
          >
            last action {relTimeShort(lastEventTs!)}
          </span>
        </>
      )}
    </div>
  );
}

function TodayStats({ stats }: { stats: TodayStatsT }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
      className="relative z-10 flex items-center justify-center gap-4 flex-wrap"
    >
      <StatCell
        label="Today"
        value={`$${stats.spentTodayUsd.toFixed(stats.spentTodayUsd >= 1 ? 2 : 3)}`}
        sub="spent"
      />
      <Sep />
      <StatCell
        label=""
        value={`${stats.callsToday}`}
        sub="calls"
      />
      <Sep />
      <StatCell
        label=""
        value={`${stats.blockedToday}`}
        sub="blocked"
        tone={stats.blockedToday > 0 ? "amber" : "neutral"}
      />
    </motion.div>
  );
}

function StatCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "amber" | "neutral";
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      {label && (
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9, color: "#9CA3AF" }}
        >
          {label}
        </span>
      )}
      <span
        className="font-mono tabular-nums font-semibold"
        style={{
          fontSize: 13,
          color: tone === "amber" ? "#B45309" : "#0A0A0A",
        }}
      >
        {value}
      </span>
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 9, color: "#9CA3AF" }}
      >
        {sub}
      </span>
    </div>
  );
}

function Sep() {
  return (
    <span style={{ width: 1, height: 12, background: "rgba(15,23,42,0.10)" }} />
  );
}

function parseTs(raw: string): number {
  // SQLite returns "YYYY-MM-DD HH:MM:SS" without TZ. Treat as UTC.
  let ms = Date.parse(raw);
  if (isNaN(ms)) {
    const norm = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
    ms = Date.parse(norm);
  }
  return isNaN(ms) ? 0 : ms;
}

function relTimeShort(iso: string): string {
  const ms = parseTs(iso);
  if (!ms) return "now";
  const diff = Math.max(0, Date.now() - ms);
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

