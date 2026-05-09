"use client";

/**
 * DevTilesCanvas — replaces the worker stage in /app per SPEC R4.
 *
 * Same visual register as WorkerCanvas (vault-anchored chassis, dot
 * grid, soft green halo at the bottom) — but 4 premium dev tiles in
 * a 2x2 grid instead of 3 worker tiles on an arc. Each tile click
 * opens its corresponding instrument-drawer panel.
 *
 *   [ Watch the chain ]   [ Wrap pay.sh ]
 *   [ Send to KAST   ]   [ Wrap your agent ]
 *
 * The vault still anchors the bottom — same USDC balance pill, same
 * "Secured by Squads · enforced by PpmZ…MSqc" footnote. Premium feel
 * is preserved. Workers are gone; dev tooling lives here now.
 */

import { motion } from "framer-motion";
import {
  Code2,
  CreditCard,
  ShieldX,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { PanelKind } from "../home/affordance-row";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Tile {
  kind: PanelKind;
  Icon: LucideIcon;
  title: string;
  sub: string;
  badge: string;
  tone: "red" | "green" | "orange" | "black";
}

const TILES: Tile[] = [
  {
    kind: "bay",
    Icon: ShieldX,
    title: "Watch the chain",
    sub: "5 violations · real failed Solana txs",
    badge: "policy",
    tone: "red",
  },
  {
    kind: "use",
    Icon: Sparkles,
    title: "Wrap pay.sh",
    sub: "live shell-out · x402",
    badge: "live",
    tone: "green",
  },
  {
    kind: "kast",
    Icon: CreditCard,
    title: "Send to KAST",
    sub: "earnings → real card",
    badge: "kast",
    tone: "orange",
  },
  {
    kind: "builder",
    Icon: Code2,
    title: "Wrap your agent",
    sub: "sdk · scaffolder · key",
    badge: "build",
    tone: "black",
  },
];

interface Props {
  onTileClick: (panel: PanelKind) => void;
  usdcBalance: number;
  paused?: boolean;
  network?: "devnet" | "mainnet";
  className?: string;
}

export function DevTilesCanvas({
  onTileClick,
  usdcBalance,
  paused,
  network = "devnet",
  className,
}: Props) {
  return (
    <div className={`flex flex-col gap-3 h-full ${className ?? ""}`}>
      {/* Whisper line */}
      <div className="text-center px-4">
        <p
          className="text-[12.5px] tracking-[-0.005em]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          Four things you can do on this device. The chain decides every one.
        </p>
      </div>

      {/* Canvas */}
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

        {/* 2x2 tile grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
          {TILES.map((t, i) => (
            <DevTile key={t.kind} tile={t} index={i} onClick={() => onTileClick(t.kind)} />
          ))}
        </div>

        {/* Vault anchor at the bottom */}
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

function DevTile({
  tile,
  index,
  onClick,
}: {
  tile: Tile;
  index: number;
  onClick: () => void;
}) {
  const palette =
    tile.tone === "red"
      ? { fg: "#B91C1C", chipBg: "rgba(220,38,38,0.10)", chipBorder: "rgba(220,38,38,0.20)", border: "rgba(220,38,38,0.18)" }
      : tile.tone === "green"
        ? { fg: "#15803D", chipBg: "rgba(34,197,94,0.10)", chipBorder: "rgba(34,197,94,0.20)", border: "rgba(34,197,94,0.18)" }
        : tile.tone === "orange"
          ? { fg: "#EA580C", chipBg: "rgba(249,115,22,0.10)", chipBorder: "rgba(249,115,22,0.20)", border: "rgba(249,115,22,0.18)" }
          : { fg: "#0A0A0A", chipBg: "rgba(15,23,42,0.06)", chipBorder: "rgba(15,23,42,0.12)", border: "rgba(15,23,42,0.10)" };

  const Icon = tile.Icon;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: 0.05 + index * 0.04 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="text-left rounded-[14px] p-3.5 group transition"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${palette.border}`,
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 8px 20px -12px rgba(15,23,42,0.10)",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center"
          style={{
            background: palette.chipBg,
            color: palette.fg,
            border: `1px solid ${palette.chipBorder}`,
          }}
        >
          <Icon className="w-4 h-4" strokeWidth={1.8} />
        </div>
        <span
          className="font-mono uppercase tracking-[0.14em] rounded-full px-2 py-0.5"
          style={{
            fontSize: 9,
            color: palette.fg,
            background: palette.chipBg,
            border: `1px solid ${palette.chipBorder}`,
          }}
        >
          {tile.badge}
        </span>
      </div>
      <div className="text-[14px] font-semibold tracking-[-0.005em] mb-0.5" style={{ color: "#0A0A0A" }}>
        {tile.title}
      </div>
      <div className="text-[11.5px]" style={{ color: "#6B7280" }}>
        {tile.sub}
      </div>
    </motion.button>
  );
}
