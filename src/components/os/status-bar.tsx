"use client";

/**
 * StatusBar — top system bar showing network + greeting + device serial.
 *
 * The greeting personalises with the user's active device serial so the
 * very first line of chrome reads as: "Solana devnet · Good afternoon ·
 * KVN-LZJSXSSN online." Greeting → device identity in one line.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { KyvernMark } from "@/components/brand/kyvern-mark";

interface VaultBrief {
  vault: { id: string; network: string };
}

function devWallet(): string {
  if (typeof window === "undefined") return "";
  const K = "kyvern:dev-wallet";
  return window.localStorage.getItem(K) ?? "";
}

export function StatusBar({ network: forcedNetwork }: { network?: string }) {
  const { wallet, isLoading } = useAuth();
  const [serial, setSerial] = useState<string | null>(null);
  const [networkFromVault, setNetworkFromVault] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) return;
    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) {
          const v = vaults[0].vault;
          setSerial(`KVN-${v.id.replace("vlt_", "").slice(0, 8).toUpperCase()}`);
          setNetworkFromVault(v.network);
        }
      })
      .catch(() => {});
  }, [isLoading, wallet]);

  const network = forcedNetwork ?? networkFromVault ?? "devnet";

  return (
    <div className="flex items-center justify-between px-5 sm:px-8 h-12">
      <Link
        href="/app"
        className="flex items-center gap-2 transition active:scale-[0.97]"
        aria-label="Kyvern home"
      >
        <KyvernMark size={22} radius={6} />
        <span className="text-[13px] font-semibold tracking-tight text-[#0A0A0A]">
          Kyvern
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <motion.span
          className="w-[6px] h-[6px] rounded-full"
          style={{ background: "#22C55E" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(0,0,0,0.04)",
            color: "#6B7280",
          }}
        >
          Solana {network}
        </span>
        {serial && (
          <span className="hidden sm:inline-flex items-center text-[12px] text-[#9CA3AF]">
            <span className="mx-1.5 text-[#D1D5DB]">·</span>
            <span className="font-mono text-[11px] text-[#6B7280]">{serial}</span>
          </span>
        )}
      </div>
    </div>
  );
}
