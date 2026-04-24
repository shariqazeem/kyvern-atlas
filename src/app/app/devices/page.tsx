"use client";

/**
 * /app/devices — Public device registry.
 *
 * Lists all deployed Kyvern devices. Atlas (KVN-0000) is always first.
 * Anyone can see this page — it's the proof that devices exist.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { fmtAgo } from "@/lib/format";

interface DeviceEntry {
  vault: {
    id: string;
    name: string;
    emoji: string;
    network: string;
    pausedAt: string | null;
    createdAt?: string;
  };
  budget: { spentToday: number; dailyLimitUsd: number; dailyUtilization: number };
  lastPayment: { merchant: string; amountUsd: number; status: string; createdAt: string } | null;
}

export default function DeviceRegistryPage() {
  const [devices, setDevices] = useState<DeviceEntry[] | null>(null);
  const [atlasStats, setAtlasStats] = useState<{
    totalCycles: number;
    totalAttacksBlocked: number;
    totalSettled: number;
    uptimeMs: number;
  } | null>(null);

  useEffect(() => {
    // Fetch all vaults (public registry)
    fetch("/api/vault/list?ownerWallet=all")
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => setDevices((d?.vaults ?? []) as DeviceEntry[]))
      .catch(() => setDevices([]));

    // Fetch Atlas stats
    fetch("/api/atlas/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setAtlasStats({
          totalCycles: d.totalCycles,
          totalAttacksBlocked: d.totalAttacksBlocked,
          totalSettled: d.totalSettled,
          uptimeMs: d.uptimeMs,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="py-2">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-[#111]">
          Device Registry
        </h1>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          Every Kyvern device ever deployed. All public. All verifiable.
        </p>
      </motion.div>

      {/* Atlas — Device #0000 (always shown) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="rounded-[20px] p-5 mb-4"
        style={{
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-[13px] flex items-center justify-center text-[22px]"
              style={{ background: "#F3F4F6" }}
            >
              🧭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-[#111]">Atlas</h2>
                <span className="text-[9px] font-mono font-semibold text-[#9CA3AF] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
                  KVN-0000
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <motion.span
                  className="w-[5px] h-[5px] rounded-full bg-[#22C55E]"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[11px] text-[#22C55E] font-medium">Active</span>
                <span className="text-[10px] text-[#D1D5DB]">· devnet</span>
              </div>
            </div>
          </div>
          <Link
            href="/atlas"
            className="text-[11px] font-medium text-[#9CA3AF] hover:text-[#6B7280]"
          >
            Full view →
          </Link>
        </div>

        {atlasStats && (
          <div className="grid grid-cols-4 gap-3">
            <MiniStat label="Cycles" value={String(atlasStats.totalCycles)} />
            <MiniStat label="Settled" value={String(atlasStats.totalSettled)} />
            <MiniStat label="Blocked" value={String(atlasStats.totalAttacksBlocked)} />
            <MiniStat label="Uptime" value={`${Math.floor(atlasStats.uptimeMs / 86400000)}d`} />
          </div>
        )}

        <div
          className="mt-3 pt-3 text-[11px] text-[#9CA3AF]"
          style={{ borderTop: "1px solid #F3F4F6" }}
        >
          Reference device. Running since April 20, 2026. $0 lost.
        </div>
      </motion.div>

      {/* User devices */}
      {devices === null ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-[80px] rounded-[16px] animate-pulse"
              style={{ background: "rgba(0,0,0,0.03)" }}
            />
          ))}
        </div>
      ) : devices.length > 0 ? (
        <div className="space-y-3">
          {devices.map((d, i) => (
            <motion.div
              key={d.vault.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
            >
              <Link
                href={`/vault/${d.vault.id}`}
                className="block rounded-[16px] p-4 group transition-all hover:shadow-md"
                style={{
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-[11px] flex items-center justify-center text-[17px]"
                    style={{ background: "#F3F4F6" }}
                  >
                    {d.vault.emoji || "🧭"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#111] truncate">
                      {d.vault.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-[5px] h-[5px] rounded-full"
                        style={{
                          background: d.vault.pausedAt ? "#9CA3AF" : "#22C55E",
                        }}
                      />
                      <span className="text-[10px] text-[#9CA3AF]">
                        {d.vault.network}
                      </span>
                      {d.lastPayment && (
                        <>
                          <span className="text-[10px] text-[#D1D5DB]">·</span>
                          <span className="text-[10px] text-[#9CA3AF]">
                            Last: {fmtAgo(d.lastPayment.createdAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#9CA3AF]" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-[#9CA3AF] text-center py-8">
          No other devices deployed yet. Be the first.
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">{label}</p>
      <p className="text-[15px] font-semibold font-mono text-[#111]">{value}</p>
    </div>
  );
}
