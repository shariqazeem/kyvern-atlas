"use client";

/**
 * DeviceHero — the cinematic landing section.
 *
 * Dark full-viewport hero featuring the Kyvern Device running Atlas
 * live. The device boots up, shows real data, and the user can
 * interact (fire an attack, see it blocked in real-time).
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KyvernDevice } from "@/components/device/kyvern-device";
import type { DeviceAtlasState, DeviceFeedItem } from "@/components/device/kyvern-device";
import type { AtlasSnapshot } from "@/lib/atlas/ssr";
import { EASE_SPRING as spring } from "@/lib/motion";

interface DeviceHeroProps {
  initialAtlasState: AtlasSnapshot;
}

export function DeviceHero({ initialAtlasState }: DeviceHeroProps) {
  const [state, setState] = useState<DeviceAtlasState | null>(
    initialAtlasState.state as DeviceAtlasState | null,
  );
  const [feed, setFeed] = useState<DeviceFeedItem[]>(
    (initialAtlasState.recentFeed as DeviceFeedItem[]) ?? [],
  );
  const [probeResult, setProbeResult] = useState<string | null>(null);

  // Poll for updates
  useEffect(() => {
    const load = async () => {
      try {
        const [s, f] = await Promise.all([
          fetch("/api/atlas/status").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/atlas/decisions?kind=both&limit=20").then((r) =>
            r.ok ? r.json() : null,
          ),
        ]);
        if (s) setState(s as DeviceAtlasState);
        if (f?.feed) setFeed(f.feed as DeviceFeedItem[]);
      } catch {
        /* silent */
      }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  // Fire attack probe
  const handleProbe = useCallback(async () => {
    setProbeResult(null);
    try {
      const r = await fetch("/api/atlas/probe", { method: "POST" });
      const data = await r.json();
      setProbeResult(
        data.blocked
          ? `Blocked: ${data.reason ?? "policy violation"}`
          : "Attack failed to reach target",
      );
      // Refresh feed after probe
      setTimeout(async () => {
        const f = await fetch("/api/atlas/decisions?kind=both&limit=20").then(
          (r) => (r.ok ? r.json() : null),
        );
        if (f?.feed) setFeed(f.feed as DeviceFeedItem[]);
      }, 1000);
    } catch {
      setProbeResult("Network error — try again");
    }
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* Subtle radial glow behind device */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px circle at 50% 45%, rgba(0,255,136,0.03), transparent 70%)",
        }}
      />

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: spring }}
        className="text-center mb-10 max-w-xl relative z-10"
      >
        <h1
          className="text-[32px] sm:text-[40px] md:text-[48px] font-semibold tracking-[-0.03em] leading-[1.1]"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          Your AI agent can spend.
          <br />
          <span style={{ color: "#00ff88" }}>Only what you allow.</span>
        </h1>
        <p
          className="mt-4 text-[15px] sm:text-[17px] leading-[1.6] max-w-md mx-auto"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          On-chain spending policies for autonomous agents on Solana.
          Budgets. Allowlists. Kill switch. Enforced by a program, not a
          promise.
        </p>
      </motion.div>

      {/* Device */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3, duration: 1, ease: spring }}
        className="relative z-10"
      >
        <KyvernDevice
          state={state}
          feed={feed}
          agentName="ATLAS"
          onProbe={handleProbe}
          bootDelay={1200}
        />
      </motion.div>

      {/* Probe result toast */}
      {probeResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-4 px-4 py-2 rounded-full font-mono text-[12px] relative z-10"
          style={{
            background: "rgba(255,68,68,0.12)",
            color: "#ff6666",
            border: "1px solid rgba(255,68,68,0.2)",
          }}
        >
          {probeResult}
        </motion.div>
      )}

      {/* Sub-CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="mt-8 flex flex-col sm:flex-row items-center gap-4 relative z-10"
      >
        <Link
          href="/vault/new"
          className="group inline-flex items-center gap-2 h-11 px-6 rounded-full font-medium text-[14px] transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "rgba(255,255,255,0.9)",
            color: "#000",
          }}
        >
          Create your agent&apos;s device
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/atlas"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full font-medium text-[14px] transition-colors"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          Full observatory
        </Link>
      </motion.div>

      {/* Bottom tagline */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="mt-12 font-mono text-[11px] tracking-[0.08em] relative z-10"
        style={{ color: "rgba(255,255,255,0.15)" }}
      >
        ATLAS HAS BEEN RUNNING AUTONOMOUSLY ON SOLANA DEVNET SINCE APR 20, 2026
      </motion.p>
    </section>
  );
}
