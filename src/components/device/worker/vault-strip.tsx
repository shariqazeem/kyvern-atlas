"use client";

/**
 * VaultStrip — horizontal row of vault tiles at the top of /app.
 *
 * Restores the "multiple workers as strings" feel from pre-pivot
 * /app, but substitutes vaults for the old fictional workers:
 *   · Atlas — always first, marked "reference · live" (links to /atlas)
 *   · The user's own vaults — clickable, click changes the selected
 *     vault rendered in the integration panel below
 *   · "+ Deploy a vault" — final tile, routes to /vault/new
 *
 * Polls /api/atlas/status (5s) for Atlas's counters. The user-vault
 * tiles get their summaries (name, serial, status) from the parent
 * via props — the parent already polls /api/vault/list.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Plus } from "lucide-react";
import { deriveSerial } from "./user-vault-card";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface VaultTileData {
  id: string;
  name: string;
  network: "devnet" | "mainnet";
  paused: boolean;
  lastCallRel: string | null; // e.g. "17s ago" or null if no events
}

interface AtlasStatus {
  totalCycles: number;
  totalSettled: number;
  totalAttacksBlocked: number;
  uptimeMs: number;
  fundsLostUsd: number;
  running: boolean;
}

interface Props {
  vaults: VaultTileData[];
  selectedVaultId: string | null;
  onSelect: (id: string) => void;
}

export function VaultStrip({ vaults, selectedVaultId, onSelect }: Props) {
  const [atlas, setAtlas] = useState<AtlasStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/atlas/status", { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as AtlasStatus;
        if (alive) setAtlas(d);
      } catch {
        /* swallow */
      }
    };
    void tick();
    const iv = setInterval(tick, 5_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const atlasDays =
    atlas && atlas.uptimeMs > 0
      ? Math.floor(atlas.uptimeMs / (24 * 60 * 60 * 1000))
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex items-center gap-2.5 overflow-x-auto pb-1 -mx-1 px-1"
      style={{
        scrollbarWidth: "none" as const,
        msOverflowStyle: "none" as const,
      }}
    >
      {/* Atlas tile — reference worker, opens /atlas */}
      <Link
        href="/atlas"
        target="_blank"
        rel="noreferrer"
        className="flex-shrink-0"
      >
        <Tile
          variant="atlas"
          letter="A"
          name="Atlas"
          eyebrow="REFERENCE · LIVE"
          subtitle={
            atlas
              ? `${atlas.totalSettled.toLocaleString()} paid · ${atlas.totalAttacksBlocked.toLocaleString()} refused${
                  atlasDays !== null ? ` · ${atlasDays}d autonomous` : ""
                }`
              : "loading…"
          }
          live={atlas?.running ?? false}
        />
      </Link>

      {/* User vaults */}
      {vaults.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onSelect(v.id)}
          className="flex-shrink-0"
        >
          <Tile
            variant="user"
            letter={(v.name.match(/[A-Za-z]/)?.[0] ?? "K").toUpperCase()}
            name={v.name}
            eyebrow={deriveSerial(v.id)}
            subtitle={
              v.lastCallRel
                ? `last call ${v.lastCallRel}`
                : v.paused
                  ? "paused"
                  : "no calls yet"
            }
            live={!v.paused}
            selected={v.id === selectedVaultId}
          />
        </button>
      ))}

      {/* + Deploy tile */}
      <Link
        href="/vault/new"
        className="flex-shrink-0"
      >
        <DeployTile />
      </Link>
    </motion.div>
  );
}

/* ─── Tile primitive ────────────────────────────────────────────── */

interface TileProps {
  variant: "atlas" | "user";
  letter: string;
  name: string;
  eyebrow: string;
  subtitle: string;
  live: boolean;
  selected?: boolean;
}

function Tile({
  variant,
  letter,
  name,
  eyebrow,
  subtitle,
  live,
  selected,
}: TileProps) {
  const isAtlas = variant === "atlas";

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18, ease: EASE }}
      className="relative flex flex-col gap-1.5 rounded-[14px] p-3 text-left transition-all"
      style={{
        width: 224,
        height: 88,
        background: "#FFFFFF",
        border: selected
          ? "1.5px solid rgba(34,197,94,0.40)"
          : "1px solid rgba(15,23,42,0.06)",
        boxShadow: selected
          ? "0 0 0 4px rgba(34,197,94,0.08), 0 12px 32px -16px rgba(34,197,94,0.30)"
          : "0 1px 2px rgba(15,23,42,0.04), 0 6px 16px -10px rgba(15,23,42,0.08)",
        cursor: "pointer",
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 min-w-0">
        <Avatar letter={letter} live={live} isAtlas={isAtlas} />
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="text-[12.5px] font-semibold tracking-[-0.005em] truncate"
            style={{ color: "#0A0A0A" }}
          >
            {name}
          </span>
          <span
            className="font-mono uppercase tracking-[0.10em]"
            style={{ fontSize: 8.5, color: "rgba(15,23,42,0.45)" }}
          >
            {eyebrow}
          </span>
        </div>
        {isAtlas && (
          <ExternalLink
            className="w-3 h-3 flex-shrink-0"
            strokeWidth={2}
            style={{ color: "rgba(15,23,42,0.30)" }}
          />
        )}
      </div>

      {/* Subtitle */}
      <span
        className="font-mono truncate"
        style={{ fontSize: 10.5, color: "rgba(15,23,42,0.55)" }}
        title={subtitle}
      >
        {subtitle}
      </span>
    </motion.div>
  );
}

function Avatar({
  letter,
  live,
  isAtlas,
}: {
  letter: string;
  live: boolean;
  isAtlas: boolean;
}) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: 32, height: 32 }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-[8px]"
        animate={
          live
            ? {
                boxShadow: [
                  "0 0 0 1.5px rgba(34,197,94,0.25)",
                  "0 0 0 1.5px rgba(34,197,94,0.45), 0 0 8px rgba(34,197,94,0.25)",
                  "0 0 0 1.5px rgba(34,197,94,0.25)",
                ],
              }
            : { boxShadow: "0 0 0 1.5px rgba(15,23,42,0.12)" }
        }
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 rounded-[8px] flex items-center justify-center"
        style={{
          background: isAtlas
            ? "linear-gradient(135deg, #0A0A0A 0%, #1F2937 100%)"
            : "linear-gradient(135deg, #0A0A0A 0%, #1F2937 100%)",
        }}
      >
        <span
          className="font-serif"
          style={{
            fontSize: 16,
            color: "#F9FAFB",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {letter}
        </span>
      </div>
      <div
        aria-hidden
        className="absolute inset-px rounded-[7px] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)",
        }}
      />
    </div>
  );
}

function DeployTile() {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18, ease: EASE }}
      className="flex flex-col items-center justify-center gap-1 rounded-[14px] transition-all"
      style={{
        width: 168,
        height: 88,
        background: "rgba(15,23,42,0.02)",
        border: "1px dashed rgba(15,23,42,0.18)",
        cursor: "pointer",
      }}
    >
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center"
        style={{
          background: "rgba(15,23,42,0.04)",
          border: "1px solid rgba(15,23,42,0.06)",
        }}
      >
        <Plus
          className="w-3.5 h-3.5"
          strokeWidth={2.2}
          style={{ color: "rgba(15,23,42,0.55)" }}
        />
      </div>
      <span
        className="text-[11.5px] font-medium tracking-[-0.005em]"
        style={{ color: "#0A0A0A" }}
      >
        Deploy a vault
      </span>
      <span
        className="font-mono uppercase tracking-[0.10em]"
        style={{ fontSize: 8.5, color: "rgba(15,23,42,0.45)" }}
      >
        60-second clone
      </span>
    </motion.div>
  );
}
