"use client";

/**
 * /app — Device Home Screen.
 *
 * The first thing you see after the unboxing. Your device's installed
 * abilities as an iOS-style icon grid. PnL summary. Recent activity.
 * If no abilities installed → CTA to open the Ability Store.
 * If no vault → CTA to create your device first.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";
import { AbilityGrid } from "@/components/device/ability-grid";
import { PnLHeader } from "@/components/device/pnl-header";
import { fmtAgo } from "@/lib/format";

interface VaultBrief {
  vault: {
    id: string;
    name: string;
    emoji: string;
    dailyLimitUsd: number;
    pausedAt: string | null;
    network: string;
  };
  budget: { spentToday: number; dailyLimitUsd: number; dailyUtilization: number };
  lastPayment: { merchant: string; amountUsd: number; status: string; createdAt: string } | null;
}

interface Payment {
  id: string;
  merchant: string;
  amountUsd: number;
  status: string;
  txSignature: string | null;
  createdAt: string;
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
  const { abilities, init } = useDeviceStore();

  const [vaults, setVaults] = useState<VaultBrief[] | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pnl, setPnl] = useState({ earned: 0, spent: 0, net: 0 });

  // Load vaults
  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) return;
    let c = false;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        if (c) return;
        const v = (d?.vaults ?? []) as VaultBrief[];
        setVaults(v);
        // Init device store with first vault
        if (v.length > 0) {
          init(v[0].vault.id);
          // Load payments for activity feed
          fetch(`/api/vault/${v[0].vault.id}?limit=10`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d?.payments) setPayments(d.payments as Payment[]);
              if (d?.budget) {
                setPnl({
                  earned: 0, // Will come from PnL endpoint later
                  spent: d.budget.spentToday ?? 0,
                  net: -(d.budget.spentToday ?? 0),
                });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => !c && setVaults([]));
    return () => { c = true; };
  }, [wallet, isLoading, init]);

  const loading = vaults === null;
  const hasVault = (vaults ?? []).length > 0;
  const vault = hasVault ? vaults![0] : null;
  const hasAbilities = abilities.length > 0;

  // No vault → create device first
  if (!loading && !hasVault) {
    return <NoDeviceState />;
  }

  return (
    <div className="py-2">
      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="h-[140px] rounded-[20px] animate-pulse" style={{ background: "rgba(0,0,0,0.03)" }} />
          <div className="h-[100px] rounded-[20px] animate-pulse" style={{ background: "rgba(0,0,0,0.03)" }} />
        </div>
      )}

      {vault && (
        <>
          {/* PnL Header */}
          <PnLHeader
            earned={pnl.earned}
            spent={pnl.spent}
            net={pnl.net}
            deviceName={vault.vault.name}
            deviceEmoji={vault.vault.emoji}
          />

          {/* Ability Grid or Empty CTA */}
          <div className="mt-6">
            {hasAbilities ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[15px] font-semibold text-[#111]">
                    Installed abilities
                  </h2>
                  <Link
                    href="/app/store"
                    className="text-[12px] font-medium text-[#9CA3AF] hover:text-[#6B7280]"
                  >
                    Store →
                  </Link>
                </div>
                <AbilityGrid abilities={abilities} />
              </>
            ) : (
              <EmptyAbilities />
            )}
          </div>

          {/* Recent Activity */}
          {payments.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-6"
            >
              <h2 className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
                Recent activity
              </h2>
              <div
                className="rounded-[16px] overflow-hidden"
                style={{
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {payments.slice(0, 6).map((p, i) => {
                  const blocked = p.status === "blocked" || p.status === "failed";
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                      style={i > 0 ? { borderTop: "1px solid #F3F4F6" } : {}}
                    >
                      <span
                        className="w-[5px] h-[5px] rounded-full shrink-0"
                        style={{ background: blocked ? "#EF4444" : "#22C55E" }}
                      />
                      <span className="text-[12px] text-[#111] truncate flex-1">
                        {p.merchant}
                        {blocked && (
                          <span className="ml-1 text-[10px] text-[#EF4444]">blocked</span>
                        )}
                      </span>
                      <span className={`text-[11px] font-mono shrink-0 ${blocked ? "line-through text-[#D1D5DB]" : "text-[#111]"}`}>
                        ${p.amountUsd.toFixed(2)}
                      </span>
                      {p.txSignature && (
                        <a
                          href={`https://explorer.solana.com/tx/${p.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#D1D5DB] hover:text-[#9CA3AF]"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                      <span className="text-[10px] text-[#D1D5DB] shrink-0">
                        {fmtAgo(p.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Empty States ── */

function NoDeviceState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center py-20"
    >
      <div
        className="w-[80px] h-[80px] rounded-[22px] mb-5 flex items-center justify-center"
        style={{ background: "#F3F4F6" }}
      >
        <span className="text-[28px]">🧭</span>
      </div>
      <h2 className="text-[20px] font-semibold text-[#111]">
        Create your device.
      </h2>
      <p className="mt-2 text-[14px] text-[#6B7280] max-w-[320px] leading-[1.6]">
        Your device is a sovereign wallet on Solana. Create it, install
        abilities, and let it work for you.
      </p>
      <Link
        href="/vault/new"
        className="group mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-[12px] text-[14px] font-semibold transition-all active:scale-[0.97]"
        style={{ background: "#111", color: "#fff" }}
      >
        Create device
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

function EmptyAbilities() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
    >
      <Link
        href="/app/store"
        className="block rounded-[20px] p-6 text-center group transition-all hover:shadow-md"
        style={{
          background: "#fff",
          border: "1px dashed rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
          style={{ background: "#F3F4F6" }}
        >
          <Store className="w-5 h-5 text-[#9CA3AF]" />
        </div>
        <p className="text-[15px] font-semibold text-[#111]">
          Open the Ability Store
        </p>
        <p className="text-[12px] text-[#9CA3AF] mt-1">
          Install your first ability — earn, protect, or monitor
        </p>
      </Link>
    </motion.div>
  );
}
