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

import { motion } from "framer-motion";
import type { PanelKind } from "../home/affordance-row";
import { AgentEventFeed } from "../feed/agent-event-feed";

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
  agentKeyPrefix,
  usdcBalance,
  paused,
  network = "devnet",
  className,
}: Props) {
  // Suppress unused warnings while T1/T2 are pending — these props
  // are wired by the placeholder copy and become live data once the
  // wizard and feed land.
  void vaultId;
  void ownerWallet;
  void agentKeyPrefix;

  return (
    <div className={`flex flex-col gap-3 h-full ${className ?? ""}`}>
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
          {/* Left: wizard placeholder (T2) */}
          <PlaceholderSlot
            title="Integrate"
            tag="wizard"
            copy="Five-step wizard lands in T2 — mint key · install · first call · try violation · KAST payout."
          />
          {/* Right: live event feed (T1) */}
          <AgentEventFeed
            vaultId={vaultId}
            ownerWallet={ownerWallet}
            className="min-h-[340px]"
          />
        </div>

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
    </div>
  );
}

function PlaceholderSlot({
  title,
  tag,
  copy,
}: {
  title: string;
  tag: string;
  copy: string;
}) {
  return (
    <div
      className="rounded-[14px] p-5 flex flex-col"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <h3
          className="text-[14px] font-semibold tracking-[-0.005em]"
          style={{ color: "#0A0A0A" }}
        >
          {title}
        </h3>
        <span
          className="font-mono uppercase tracking-[0.14em] rounded-full px-2 py-0.5"
          style={{
            fontSize: 9,
            color: "#6B7280",
            background: "rgba(15,23,42,0.04)",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          {tag}
        </span>
      </div>
      <p
        className="text-[12.5px] leading-[1.55] flex-1"
        style={{ color: "#6B7280" }}
      >
        {copy}
      </p>
    </div>
  );
}
