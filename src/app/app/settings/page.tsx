"use client";

/* ════════════════════════════════════════════════════════════════════
   /app/settings — settings + devices.

   Sprint 3 (Don't List enforcement) collapsed the standalone
   /app/devices route into a Devices section at the top of this page.
   The bottom nav stays at four items: Home / Tasks / Activity /
   Settings.

   Sections, top to bottom:
     1. Devices    — Atlas (reference) + the owner's own KVN-XXXX
     2. Account    — connected wallet, sign-out
     3. Network    — cluster + on-chain Budget program + Squads program
     4. Disclaimer — pre-alpha, devnet-only
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Copy,
  Check,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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

function devWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("kyvern:dev-wallet") ?? "";
}

function deriveSerial(vaultId: string): string {
  return `KVN-${vaultId.replace("vlt_", "").slice(0, 8).toUpperCase()}`;
}

export default function AppSettingsPage() {
  const { wallet, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [myDevices, setMyDevices] = useState<VaultBrief[]>([]);
  const [atlas, setAtlas] = useState<AtlasMini | null>(null);

  useEffect(() => {
    const owner = wallet ?? devWallet();
    if (!owner) return;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => setMyDevices((d?.vaults ?? []) as VaultBrief[]))
      .catch(() => {});
    fetch("/api/atlas/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === "object" && !("error" in d)) {
          setAtlas({
            totalCycles: d.totalCycles ?? 0,
            totalAttacksBlocked: d.totalAttacksBlocked ?? 0,
            totalSettled: d.totalSettled ?? 0,
            uptimeMs: d.uptimeMs ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [wallet]);

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut?.();
    } catch {
      /* ignore — hook hard-redirects regardless */
    }
  };

  const copyWallet = async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-7 pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="pt-2"
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
          style={{ color: "var(--text-quaternary)" }}
        >
          Your Kyvern · settings
        </p>
        <h1
          className="tracking-[-0.035em] text-balance"
          style={{
            fontSize: "clamp(28px, 4.2vw, 36px)",
            lineHeight: 1.05,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Settings
        </h1>
      </motion.div>

      {/* 1. Devices */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
        className="p-6 rounded-[18px]"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-[16px] font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Devices
          </h2>
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {myDevices.length === 0
              ? "1 reference device"
              : `${myDevices.length} of yours · plus Atlas`}
          </span>
        </div>

        {/* Atlas — the reference device */}
        <Link
          href="/atlas"
          className="block mb-2 rounded-[12px] p-3 transition-colors hover:bg-[var(--surface-2)]"
          style={{
            background: "var(--surface-2)",
            border: "0.5px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] shrink-0"
              style={{ background: "#fff", border: "0.5px solid var(--border-subtle)" }}
            >
              🧭
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Atlas
                </span>
                <span
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  KVN-0000
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: "#16A34A" }}
                >
                  · alive
                </span>
              </div>
              <div
                className="text-[11.5px] mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                Reference device · running since April 20, 2026
                {atlas && (
                  <>
                    {" · "}
                    {atlas.totalSettled} settled · {atlas.totalAttacksBlocked} attacks blocked · $0 lost
                  </>
                )}
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          </div>
        </Link>

        {/* Owner's devices */}
        {myDevices.length === 0 ? (
          <div
            className="rounded-[12px] p-3 text-center"
            style={{
              background: "var(--surface-2)",
              border: "0.5px dashed var(--border-subtle)",
              color: "var(--text-tertiary)",
              fontSize: "12px",
            }}
          >
            You haven&apos;t deployed your own device yet.{" "}
            <Link
              href="/vault/new"
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Get one →
            </Link>
          </div>
        ) : (
          myDevices.map((d) => (
            <Link
              key={d.vault.id}
              href={`/vault/${d.vault.id}`}
              className="block mt-2 rounded-[12px] p-3 transition-colors hover:bg-[var(--surface-2)]"
              style={{
                background: "var(--surface-2)",
                border: "0.5px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[20px] shrink-0"
                  style={{ background: "#fff", border: "0.5px solid var(--border-subtle)" }}
                >
                  {d.vault.emoji || "🧭"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[14px] font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {d.vault.name || "Device"}
                    </span>
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {deriveSerial(d.vault.id)}
                    </span>
                    {d.vault.pausedAt ? (
                      <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        · paused
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium" style={{ color: "#16A34A" }}>
                        · alive
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[11.5px] mt-0.5 font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {d.vault.network}
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
              </div>
            </Link>
          ))
        )}
      </motion.section>

      {/* 2. Account */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        className="p-6 rounded-[18px]"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <h2
          className="text-[16px] font-semibold tracking-tight mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Account
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingRow label="Connected wallet">
            {wallet ? (
              <button
                onClick={copyWallet}
                className="group inline-flex items-center gap-1.5 font-mono text-[12.5px] transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                <span>{truncateAddr(wallet)}</span>
                {copied ? (
                  <Check className="w-3 h-3" style={{ color: "#16a34a" }} />
                ) : (
                  <Copy
                    className="w-3 h-3 opacity-60 group-hover:opacity-100"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                )}
              </button>
            ) : (
              <span
                className="text-[12.5px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Local fallback wallet (dev mode).
              </span>
            )}
          </SettingRow>

          <SettingRow label="Network">
            <span
              className="inline-flex items-center gap-1.5 text-[12.5px] font-mono"
              style={{ color: "var(--text-primary)" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: "#F59E0B" }}
              />
              Solana devnet
            </span>
          </SettingRow>

          <SettingRow label="Budget program">
            <a
              href="https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[12.5px] transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              PpmZEr…MSqc
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </SettingRow>

          <SettingRow label="Squads program">
            <a
              href="https://explorer.solana.com/address/SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[12.5px] transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              SQDS4e…2pCf
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </SettingRow>
        </div>
        {wallet && (
          <div
            className="mt-5 pt-5 flex items-center justify-between"
            style={{ borderTop: "0.5px solid var(--border-subtle)" }}
          >
            <div>
              <p
                className="text-[12.5px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Sign out
              </p>
              <p
                className="text-[11.5px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Ends your Privy session. Your devices stay on-chain.
              </p>
            </div>
            <button
              onClick={onSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[12.5px] font-semibold transition-colors hover:bg-[var(--surface-2)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                color: "var(--text-primary)",
                border: "0.5px solid var(--border)",
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </motion.section>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.18 }}
        className="p-4 rounded-[12px] flex items-center gap-2 text-[12px]"
        style={{
          background: "var(--surface-2)",
          border: "0.5px solid var(--border-subtle)",
          color: "var(--text-tertiary)",
        }}
      >
        <Shield className="w-3 h-3 shrink-0" />
        Kyvern is <span className="font-semibold">pre-alpha</span>, devnet-only.
        Do not deposit mainnet funds. Squads v4 (which we compose with) is
        audited 3× and secures $10B+ on Solana today.
      </motion.div>
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="p-3 rounded-[12px]"
      style={{
        background: "var(--surface-2)",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-1"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function truncateAddr(addr: string, head = 6, tail = 6): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
