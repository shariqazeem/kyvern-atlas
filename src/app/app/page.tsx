"use client";

/**
 * /app — Device Home Screen.
 *
 * The first thing you see inside KyvernOS. Your device identity,
 * installed abilities as an icon grid, PnL, and recent activity.
 * Feels like an iPhone home screen — not a SaaS dashboard.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";
import { getAbility } from "@/lib/abilities/registry";
import { fmtAgo } from "@/lib/format";

interface VaultBrief {
  vault: {
    id: string;
    name: string;
    emoji: string;
    dailyLimitUsd: number;
    pausedAt: string | null;
    network: string;
    createdAt?: string;
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

  const [vault, setVault] = useState<VaultBrief | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load vault + init store on every mount (fixes navigation-back bug)
  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) { setLoading(false); return; }

    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) {
          setVault(vaults[0]);
          // Always re-init to pick up newly installed abilities
          init(vaults[0].vault.id);
          // Load payments
          fetch(`/api/vault/${vaults[0].vault.id}?limit=8`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d?.payments && setPayments(d.payments as Payment[]))
            .catch(() => {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoading, wallet, init]);

  // No vault → create device
  if (!loading && !vault) return <NoDeviceState />;

  const hasAbilities = abilities.length > 0;
  const serialNum = vault?.vault.id
    ? `KVN-${vault.vault.id.replace("vlt_", "").slice(0, 8).toUpperCase()}`
    : "KVN-????";

  return (
    <div className="py-2">
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "#111" }} />
        </div>
      )}

      {vault && (
        <>
          {/* ── Device Identity Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-[24px] p-5 mb-5"
            style={{
              background: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-[18px] flex items-center justify-center text-[28px]"
                style={{
                  background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                {vault.vault.emoji || "🧭"}
              </div>
              <div className="flex-1">
                <h1 className="text-[20px] font-semibold text-[#111] tracking-tight">
                  {vault.vault.name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
                    {serialNum}
                  </span>
                  <motion.span
                    className="w-[6px] h-[6px] rounded-full"
                    style={{ background: vault.vault.pausedAt ? "#EF4444" : "#22C55E" }}
                    animate={!vault.vault.pausedAt ? { opacity: [0.5, 1, 0.5] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-[10px] text-[#9CA3AF]">
                    {vault.vault.network}
                  </span>
                </div>
              </div>
            </div>

            {/* PnL row */}
            <div
              className="grid grid-cols-3 gap-4 pt-4"
              style={{ borderTop: "1px solid #F3F4F6" }}
            >
              <PnLStat label="Earned" value={`$${(0).toFixed(2)}`} color="#22C55E" />
              <PnLStat label="Spent" value={`$${vault.budget.spentToday.toFixed(2)}`} color="#111" />
              <PnLStat
                label="Budget"
                value={`${Math.round(vault.budget.dailyUtilization * 100)}%`}
                color={vault.budget.dailyUtilization > 0.85 ? "#EF4444" : vault.budget.dailyUtilization > 0.6 ? "#F59E0B" : "#22C55E"}
              />
            </div>
          </motion.div>

          {/* ── Abilities Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-[#111]">
                {hasAbilities ? "Abilities" : "Get started"}
              </h2>
              <Link
                href="/app/store"
                className="flex items-center gap-1 text-[12px] font-semibold text-[#9CA3AF] hover:text-[#111] transition-colors"
              >
                <Store className="w-3.5 h-3.5" />
                Store
              </Link>
            </div>

            {hasAbilities ? (
              <div className="grid grid-cols-3 gap-3">
                {abilities.map((inst, i) => {
                  const def = getAbility(inst.abilityId);
                  if (!def) return null;
                  return (
                    <motion.div
                      key={inst.abilityId}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={`/app/ability/${inst.abilityId}`}
                        className="flex flex-col items-center gap-2 p-3 rounded-[20px] group transition-all active:scale-[0.95]"
                        style={{
                          background: "#fff",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                          border: "1px solid rgba(0,0,0,0.05)",
                        }}
                      >
                        <div className="relative">
                          <div
                            className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-[24px]"
                            style={{
                              background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
                            }}
                          >
                            {def.emoji}
                          </div>
                          <span
                            className="absolute -top-0.5 -right-0.5 w-[9px] h-[9px] rounded-full border-[2px] border-white"
                            style={{
                              background: inst.status === "active" ? "#22C55E" : "#9CA3AF",
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-[#6B7280] text-center leading-tight">
                          {def.name.split(" ").slice(0, 2).join(" ")}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}

                {/* Add more button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: abilities.length * 0.08 + 0.1, duration: 0.3 }}
                >
                  <Link
                    href="/app/store"
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-[20px] h-full transition-all active:scale-[0.95]"
                    style={{
                      border: "1px dashed rgba(0,0,0,0.1)",
                      minHeight: "100px",
                    }}
                  >
                    <div
                      className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center"
                      style={{ background: "#F9FAFB" }}
                    >
                      <span className="text-[20px] text-[#D1D5DB]">+</span>
                    </div>
                    <span className="text-[11px] text-[#D1D5DB]">Add</span>
                  </Link>
                </motion.div>
              </div>
            ) : (
              /* Empty: Open Store CTA */
              <Link
                href="/app/store"
                className="block rounded-[20px] p-6 text-center group transition-all hover:shadow-md active:scale-[0.98]"
                style={{
                  background: "#fff",
                  border: "1px dashed rgba(0,0,0,0.1)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-3"
                  style={{ background: "#F3F4F6" }}
                >
                  <Store className="w-6 h-6 text-[#9CA3AF]" />
                </div>
                <p className="text-[15px] font-semibold text-[#111]">
                  Open the Ability Store
                </p>
                <p className="text-[12px] text-[#9CA3AF] mt-1 max-w-[240px] mx-auto">
                  Install abilities on your device — earn USDC, block attacks, get intelligence. No code.
                </p>
                <span
                  className="inline-flex items-center gap-1 mt-3 text-[12px] font-semibold"
                  style={{ color: "#111" }}
                >
                  Browse abilities <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            )}
          </motion.div>

          {/* ── Recent Activity ── */}
          {payments.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              <h2 className="text-[13px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">
                Recent
              </h2>
              <div
                className="rounded-[20px] overflow-hidden"
                style={{
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {payments.slice(0, 5).map((p, i) => {
                  const blocked = p.status === "blocked" || p.status === "failed";
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={i > 0 ? { borderTop: "1px solid #F3F4F6" } : {}}
                    >
                      <span
                        className="w-[6px] h-[6px] rounded-full shrink-0"
                        style={{ background: blocked ? "#EF4444" : "#22C55E" }}
                      />
                      <span className="text-[13px] text-[#111] truncate flex-1">
                        {p.merchant}
                        {blocked && <span className="ml-1.5 text-[10px] text-[#EF4444]">blocked</span>}
                      </span>
                      <span className={`text-[12px] font-mono shrink-0 ${blocked ? "line-through text-[#D1D5DB]" : "text-[#111]"}`}>
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

          {/* ── Device links ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-6 flex items-center justify-center gap-4"
          >
            <Link href="/app/devices" className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280]">
              Device registry
            </Link>
            <span className="text-[#E5E7EB]">·</span>
            <Link href={`/vault/${vault.vault.id}`} className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280]">
              Vault detail
            </Link>
            <span className="text-[#E5E7EB]">·</span>
            <Link href="/atlas" className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280]">
              Atlas live
            </Link>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function PnLStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-[18px] font-semibold font-mono" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

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
        style={{
          background: "linear-gradient(135deg, #F9FAFB, #F3F4F6)",
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        <span className="text-[32px]">🧭</span>
      </div>
      <h2 className="text-[22px] font-semibold text-[#111] tracking-tight">
        Create your device.
      </h2>
      <p className="mt-2 text-[14px] text-[#6B7280] max-w-[300px] leading-[1.6]">
        A sovereign wallet on Solana. Install abilities. Earn, protect, monitor — no code.
      </p>
      <Link
        href="/vault/new"
        className="group mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-[14px] text-[14px] font-semibold transition-all active:scale-[0.97]"
        style={{ background: "#111", color: "#fff" }}
      >
        Create device
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
