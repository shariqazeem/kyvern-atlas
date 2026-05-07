"use client";

/**
 * SettingsPageShell — Phase 4 (Final Polish + Multi-Surface).
 *
 * Same architectural rhyme: PageHeader + two-zone grid.
 *
 *   ┌─ PAGE HEADER ──────────────────────────────────────────────┐
 *   │ ●  KVN-XXX · Solana devnet                       SETTINGS   │
 *   ├──────────────────────────────────────┬─────────────────────┤
 *   │ DEVICES · 3 yours · plus Atlas       │ ACCOUNT             │
 *   │                                      │                     │
 *   │ ┌─ Atlas KVN-0000 ─────────────────┐ │ Wallet (copy)       │
 *   │ │ Reference · 7700 cycles · …    →│ │ Network             │
 *   │ └──────────────────────────────────┘ │ Programs (Explorer) │
 *   │ ┌─ KVN-XXXXXXXX ───────────────────┐ │ Sign out            │
 *   │ │ devnet · alive                  →│ │                     │
 *   │ └──────────────────────────────────┘ │ ⓘ Pre-alpha note   │
 *   ├──────────────────────────────────────┴─────────────────────┤
 *   │   tab bar (rendered by KyvernOS)                           │
 *   └────────────────────────────────────────────────────────────┘
 *
 * No outer card chrome — content sits directly on the device surface.
 * Each device is a card; account blocks are flat sections separated by
 * hairline dividers.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { PageShell } from "../shell/page-shell";
import { PageHeader } from "../shell/page-header";

interface VaultBrief {
  vault: {
    id: string;
    name: string;
    emoji: string;
    network: string;
    pausedAt: string | null;
  };
}

interface AtlasMini {
  totalCycles: number;
  totalAttacksBlocked: number;
  totalSettled: number;
  uptimeMs: number;
}

interface Props {
  serial: string | null;
  network: "devnet" | "mainnet";
  paused: boolean;
  myDevices: VaultBrief[];
  atlas: AtlasMini | null;
  wallet: string | null;
  onCopyWallet: () => Promise<void>;
  copied: boolean;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
}

const BUDGET_PROGRAM_ID = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";
const SQUADS_PROGRAM_ID = "SQDS4ej4yiWgHWb6ChEKWRZyG7QkqRgNdGYf5RMeKqr"; // Squads v4 program

function deriveSerial(vaultId: string): string {
  return `KVN-${vaultId.replace("vlt_", "").slice(0, 8).toUpperCase()}`;
}

function fmtUptime(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / 3_600_000);
  return `${hours}h`;
}

export function SettingsPageShell({
  serial,
  network,
  paused,
  myDevices,
  atlas,
  wallet,
  onCopyWallet,
  copied,
  onSignOut,
  signingOut,
}: Props) {
  const header = (
    <PageHeader
      left={
        <>
          <motion.span
            className="rounded-full flex-shrink-0"
            style={{
              width: 7,
              height: 7,
              background: paused ? "#F59E0B" : "#22C55E",
              boxShadow: paused
                ? "0 0 0 3px rgba(245,158,11,0.12), 0 0 8px rgba(245,158,11,0.55)"
                : "0 0 0 3px rgba(34,197,94,0.12), 0 0 8px rgba(34,197,94,0.55)",
            }}
            animate={paused ? {} : { opacity: [0.55, 1, 0.55] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span
            className="font-mono text-[12px] sm:text-[13px] font-medium tracking-[0.04em] truncate flex-shrink-0"
            style={{ color: "#0A0A0A" }}
          >
            {serial ?? "KVN-————————"}
          </span>
          <Sep />
          <span
            className="text-[12.5px] hidden sm:inline truncate"
            style={{ color: "#6B7280" }}
          >
            Solana {network}
          </span>
        </>
      }
      right={
        <span
          className="font-mono uppercase tracking-[0.18em]"
          style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
        >
          Settings
        </span>
      }
    />
  );

  const devicesColumn = (
    <>
      <Eyebrow>
        Devices · {myDevices.length} {myDevices.length === 1 ? "yours" : "yours"}{" "}
        · plus Atlas
      </Eyebrow>

      {/* Atlas — reference device */}
      <DeviceCard accent>
        <Link
          href="/atlas"
          className="flex items-center justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <div
              className="flex items-baseline gap-2 mb-1 flex-wrap"
            >
              <span
                className="text-[13.5px] font-semibold tracking-[-0.005em]"
                style={{ color: "#0A0A0A" }}
              >
                Atlas
              </span>
              <span
                className="font-mono text-[10.5px]"
                style={{ color: "rgba(15,23,42,0.55)" }}
              >
                KVN-0000
              </span>
              <span
                className="font-mono uppercase tracking-[0.14em] rounded-full px-1.5 py-0.5"
                style={{
                  fontSize: 8.5,
                  color: "#15803D",
                  background: "rgba(34,197,94,0.10)",
                  border: "1px solid rgba(34,197,94,0.25)",
                }}
              >
                Reference · alive
              </span>
            </div>
            {atlas && (
              <div
                className="text-[11.5px] leading-[1.5]"
                style={{ color: "#6B7280" }}
              >
                {atlas.totalCycles.toLocaleString()} cycles ·{" "}
                {atlas.totalSettled.toLocaleString()} settled ·{" "}
                {atlas.totalAttacksBlocked.toLocaleString()} attacks blocked ·{" "}
                <span style={{ color: "#15803D", fontWeight: 500 }}>
                  $0 lost
                </span>{" "}
                · up {fmtUptime(atlas.uptimeMs)}
              </div>
            )}
          </div>
          <ArrowUpRight
            className="w-3.5 h-3.5 flex-shrink-0"
            strokeWidth={2}
            style={{ color: "rgba(15,23,42,0.55)" }}
          />
        </Link>
      </DeviceCard>

      {/* User devices */}
      {myDevices.map((d) => {
        const s = deriveSerial(d.vault.id);
        const alive = !d.vault.pausedAt;
        return (
          <DeviceCard key={d.vault.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                  <span
                    className="text-[13.5px] font-semibold tracking-[-0.005em]"
                    style={{ color: "#0A0A0A" }}
                  >
                    {d.vault.emoji} {d.vault.name}
                  </span>
                  <span
                    className="font-mono text-[10.5px]"
                    style={{ color: "rgba(15,23,42,0.55)" }}
                  >
                    {s}
                  </span>
                </div>
                <div
                  className="text-[11.5px] flex items-baseline gap-2 flex-wrap"
                  style={{ color: "#6B7280" }}
                >
                  <span>Solana {d.vault.network}</span>
                  <span aria-hidden style={{ color: "rgba(15,23,42,0.20)" }}>
                    ·
                  </span>
                  <span
                    style={{
                      color: alive ? "#15803D" : "#B45309",
                      fontWeight: 500,
                    }}
                  >
                    {alive ? "alive" : "paused"}
                  </span>
                </div>
              </div>
              <ArrowUpRight
                className="w-3.5 h-3.5 flex-shrink-0"
                strokeWidth={2}
                style={{ color: "rgba(15,23,42,0.55)" }}
              />
            </div>
          </DeviceCard>
        );
      })}

      {myDevices.length === 0 && (
        <div
          className="rounded-2xl px-5 py-6 text-center text-[12.5px]"
          style={{
            background: "rgba(15,23,42,0.02)",
            border: "1px dashed rgba(15,23,42,0.10)",
            color: "rgba(15,23,42,0.55)",
          }}
        >
          No devices yet. Visit /unbox to create your first one.
        </div>
      )}
    </>
  );

  const accountColumn = (
    <>
      <Eyebrow>Account</Eyebrow>

      <Block label="Wallet">
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-mono text-[12px] truncate"
            style={{ color: "#0A0A0A" }}
          >
            {wallet
              ? `${wallet.slice(0, 6)}…${wallet.slice(-6)}`
              : "—"}
          </span>
          {wallet && (
            <button
              type="button"
              onClick={() => void onCopyWallet()}
              className="rounded-full p-1.5 hover:bg-black/5 transition flex-shrink-0"
              aria-label="Copy wallet address"
            >
              {copied ? (
                <Check
                  className="w-3.5 h-3.5"
                  strokeWidth={2.5}
                  style={{ color: "#15803D" }}
                />
              ) : (
                <Copy
                  className="w-3.5 h-3.5"
                  strokeWidth={1.8}
                  style={{ color: "rgba(15,23,42,0.55)" }}
                />
              )}
            </button>
          )}
        </div>
      </Block>

      <Block label="Network">
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "#22C55E",
            }}
          />
          <span className="text-[12px]" style={{ color: "#0A0A0A" }}>
            Solana {network}
          </span>
        </div>
      </Block>

      <Block label="Programs">
        <div className="flex flex-col gap-1.5">
          <ProgramRow
            label="Budget"
            address={BUDGET_PROGRAM_ID}
            href={`https://explorer.solana.com/address/${BUDGET_PROGRAM_ID}?cluster=${network}`}
          />
          <ProgramRow
            label="Squads"
            address={SQUADS_PROGRAM_ID}
            href={`https://explorer.solana.com/address/${SQUADS_PROGRAM_ID}?cluster=${network}`}
          />
        </div>
      </Block>

      <Block label="Sign out">
        <p
          className="text-[11.5px] leading-[1.55] mb-2"
          style={{ color: "#6B7280" }}
        >
          Ends Privy session. Devices stay on-chain.
        </p>
        <button
          type="button"
          onClick={() => void onSignOut()}
          disabled={signingOut}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[10px] text-[12px] font-medium transition active:scale-[0.97] disabled:opacity-50"
          style={{
            background: "rgba(220,38,38,0.06)",
            color: "#B91C1C",
            border: "1px solid rgba(220,38,38,0.20)",
          }}
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.8} />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </Block>

      {/* Pre-alpha disclaimer — inline muted text, no card chrome */}
      <p
        className="text-[11px] leading-[1.5] pt-3"
        style={{
          color: "rgba(15,23,42,0.45)",
          borderTop: "1px solid rgba(15,23,42,0.05)",
        }}
      >
        ⓘ Pre-alpha. Devnet only. Squads v4 is audited 3× and secures
        $10B+ today.
      </p>
    </>
  );

  return (
    <PageShell
      header={header}
      primaryZone={devicesColumn}
      secondaryZone={accountColumn}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono uppercase tracking-[0.18em]"
      style={{ fontSize: 9.5, color: "rgba(15,23,42,0.45)" }}
    >
      {children}
    </div>
  );
}

function DeviceCard({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-white px-5 py-4 transition hover:bg-black/[0.01]"
      style={{
        border: accent
          ? "1px solid rgba(34,197,94,0.20)"
          : "1px solid rgba(15,23,42,0.06)",
        boxShadow: accent
          ? "0 1px 3px rgba(34,197,94,0.06), 0 0 0 4px rgba(34,197,94,0.03)"
          : "0 1px 3px rgba(15,23,42,0.04)",
      }}
    >
      {children}
    </motion.div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      {children}
    </div>
  );
}

function ProgramRow({
  label,
  address,
  href,
}: {
  label: string;
  address: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className="text-[11.5px] flex-shrink-0"
        style={{ color: "rgba(15,23,42,0.55)" }}
      >
        {label}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-mono text-[11px] truncate"
        style={{ color: "#0A0A0A" }}
      >
        <span className="truncate">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <ExternalLink className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
      </a>
    </div>
  );
}

function Sep({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex-shrink-0 ${className ?? ""}`}
      style={{ color: "rgba(15,23,42,0.20)", fontSize: 12 }}
    >
      ·
    </span>
  );
}
