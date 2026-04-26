"use client";

/**
 * /app — The Kyvern home.
 *
 * Section 2A of the Grand Champion plan. The page is two pieces:
 *
 *   1. The DeviceHeroCard — dark, hardware-feel, tweet-worthy. KVN-XXXX
 *      serial, USDC balance scrambling on change, three live status
 *      pills, worker avatars with orbital ring when thinking, PnL with
 *      24h sparkline. Polls live-status every 5s.
 *
 *   2. The ActivityFeed — five monospace rows beneath the card, each
 *      clickable to Solana Explorer or the worker page. New events
 *      slide in from the top.
 *
 * Don't add anything else to this page. If a feature isn't in this
 * surface's spec, it lives on a different surface.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeviceStore } from "@/hooks/use-device-store";
import { DeviceHeroCard } from "@/components/device/hero-card";
import { ActivityFeed } from "@/components/device/activity-feed";

interface VaultBrief {
  vault: { id: string; name: string; emoji: string; pausedAt: string | null; network: string };
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
  const { init } = useDeviceStore();

  const [vault, setVault] = useState<VaultBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    const owner = wallet ?? devWallet();
    if (!owner) {
      setLoading(false);
      return;
    }

    fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
      .then((r) => (r.ok ? r.json() : { vaults: [] }))
      .then((d) => {
        const vaults = (d?.vaults ?? []) as VaultBrief[];
        if (vaults.length > 0) {
          setVault(vaults[0]);
          init(vaults[0].vault.id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isLoading, wallet, init]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: "rgba(0,0,0,0.08)", borderTopColor: "#0A0A0A" }}
        />
      </div>
    );
  }

  if (!vault) return <NoDeviceState />;

  return (
    <div className="py-2 space-y-4">
      <DeviceHeroCard deviceId={vault.vault.id} />
      <ActivityFeed deviceId={vault.vault.id} />

      <div className="flex items-center justify-center pt-2">
        <Link
          href="/atlas"
          className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#9B9B9B] hover:text-[#0A0A0A] transition"
        >
          Watch Atlas →
        </Link>
      </div>
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
      <h2 className="text-[22px] font-semibold text-[#0A0A0A] tracking-tight">
        Get your Kyvern.
      </h2>
      <p className="mt-2 text-[14px] text-[#6B6B6B] max-w-[300px] leading-[1.6]">
        A device you own. Workers that earn. Money you control.
      </p>
      <Link
        href="/vault/new"
        className="group mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-[14px] text-[14px] font-semibold transition-all active:scale-[0.97]"
        style={{ background: "#0A0A0A", color: "#fff" }}
      >
        Get started
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
