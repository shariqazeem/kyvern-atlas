"use client";

/**
 * DeployTab — Tab 2. Apple-minimal: three hero cards for the trio
 * presets, one custom card secondary. No SDK section here — Tab 3's
 * Policy Playground replaces the static code reference.
 *
 * Click → animated deploy moment → tab-switches back to Live Inside
 * where the new worker is already on stage.
 */

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, Sliders } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PRESETS: Array<{
  id: string;
  emoji: string;
  name: string;
  oneLine: string;
  template: string;
}> = [
  {
    id: "sentinel",
    emoji: "🎯",
    name: "Sentinel",
    oneLine: "Scans 7 ecosystem feeds. Posts paid jobs on every find ≥$300.",
    template: "bounty_hunter",
  },
  {
    id: "wren",
    emoji: "🐋",
    name: "Wren",
    oneLine: "Tracks whale wallets. Posts intel on $5k+ swaps.",
    template: "whale_tracker",
  },
  {
    id: "pulse",
    emoji: "📈",
    name: "Pulse",
    oneLine: "Reads live DEX prices. Stakes on band breaches.",
    template: "token_pulse",
  },
];

interface Props {
  deviceId: string | null;
  onDeployed?: () => void;
  isGuest?: boolean;
  onSignIn?: () => void;
}

export function DeployTab({ deviceId, onDeployed, isGuest, onSignIn }: Props) {
  const [deploying, setDeploying] = useState<string | null>(null);
  const [justDeployed, setJustDeployed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function deployPreset(preset: (typeof PRESETS)[number]) {
    if (isGuest) {
      onSignIn?.();
      return;
    }
    if (!deviceId || deploying) return;
    setDeploying(preset.id);
    setError(null);
    setJustDeployed(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}/deploy-preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: preset.template }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || data?.error || "Deploy failed");
      }
      setJustDeployed(preset.id);
      // Brief celebration before switching tabs.
      setTimeout(() => {
        onDeployed?.();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
      setDeploying(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* HEADER */}
      <div>
        <div
          className="font-mono uppercase tracking-[0.18em] mb-1"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          Deploy worker
        </div>
        <h3
          className="text-[16px] font-semibold tracking-[-0.005em] mb-0.5"
          style={{ color: "#0A0A0A" }}
        >
          Drop a worker into this device.
        </h3>
        <p className="text-[12px] leading-[1.5]" style={{ color: "#6B7280" }}>
          {isGuest
            ? "Sign in to deploy. Workers run under the same Anchor policy program."
            : "Pick a preset or roll your own. Every worker runs under the same policy program."}
        </p>
      </div>

      {/* PRESETS — three visual hero cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRESETS.map((p) => {
          const isDeploying = deploying === p.id;
          const isDone = justDeployed === p.id;
          return (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => deployPreset(p)}
              disabled={!!deploying}
              whileTap={{ scale: 0.98 }}
              className="relative rounded-[16px] p-4 flex flex-col items-start text-left transition disabled:opacity-60"
              style={{
                background: "#FFFFFF",
                border: isDone
                  ? "1px solid rgba(34,197,94,0.40)"
                  : "1px solid rgba(15,23,42,0.08)",
                boxShadow: isDone
                  ? "0 1px 2px rgba(15,23,42,0.04), 0 12px 28px -10px rgba(34,197,94,0.30)"
                  : "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)",
              }}
            >
              {/* HERO ICON */}
              <div
                className="rounded-[14px] flex items-center justify-center mb-3"
                style={{
                  width: 56,
                  height: 56,
                  fontSize: 32,
                  background:
                    "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
                  border: "1px solid rgba(15,23,42,0.06)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04)",
                }}
              >
                {p.emoji}
              </div>

              <div
                className="text-[16px] font-semibold tracking-[-0.01em] mb-1"
                style={{ color: "#0A0A0A" }}
              >
                {p.name}
              </div>
              <p
                className="text-[12px] leading-[1.45] mb-3 flex-1"
                style={{ color: "#6B7280" }}
              >
                {p.oneLine}
              </p>

              {/* ACTION ROW */}
              <div className="w-full flex items-center justify-between mt-auto">
                <span
                  className="font-mono uppercase tracking-[0.14em]"
                  style={{
                    fontSize: 9.5,
                    color: isDone
                      ? "#15803D"
                      : isDeploying
                        ? "#15803D"
                        : isGuest
                          ? "#B45309"
                          : "rgba(15,23,42,0.55)",
                  }}
                >
                  {isDone
                    ? "Joined the device"
                    : isDeploying
                      ? "Deploying"
                      : isGuest
                        ? "Sign in to deploy"
                        : "Deploy"}
                </span>
                <span
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    background: isDone
                      ? "#22C55E"
                      : isDeploying
                        ? "rgba(34,197,94,0.10)"
                        : "#0A0A0A",
                    color: "#FFFFFF",
                    border: isDeploying
                      ? "1px solid rgba(34,197,94,0.30)"
                      : "1px solid rgba(0,0,0,0.8)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  ) : isDeploying ? (
                    <Loader2
                      className="w-3.5 h-3.5 animate-spin"
                      strokeWidth={2}
                      style={{ color: "#15803D" }}
                    />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                  )}
                </span>
              </div>

              {/* Deploy ring overlay — animated celebration */}
              <AnimatePresence>
                {isDone && (
                  <motion.div
                    aria-hidden
                    className="absolute inset-0 rounded-[16px] pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.0, ease: EASE }}
                    style={{
                      boxShadow:
                        "inset 0 0 0 2px rgba(34,197,94,0.45), 0 0 28px rgba(34,197,94,0.32)",
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {error && (
        <p
          className="font-mono px-1"
          style={{ color: "#B45309", fontSize: 11 }}
        >
          {error}
        </p>
      )}

      {/* CUSTOM */}
      <Link
        href="/app/agents/spawn"
        className="rounded-[14px] p-4 flex items-center justify-between gap-3 transition active:scale-[0.99]"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              background:
                "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
              border: "1px solid rgba(15,23,42,0.06)",
            }}
          >
            <Sliders
              className="w-4 h-4"
              strokeWidth={1.6}
              style={{ color: "rgba(15,23,42,0.55)" }}
            />
          </div>
          <div className="min-w-0">
            <div
              className="text-[13.5px] font-semibold tracking-[-0.005em]"
              style={{ color: "#0A0A0A" }}
            >
              Roll your own
            </div>
            <div className="text-[11.5px]" style={{ color: "#6B7280" }}>
              Pick a template, tweak prompt + tools + budget.
            </div>
          </div>
        </div>
        <ArrowRight
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "rgba(15,23,42,0.45)" }}
          strokeWidth={2}
        />
      </Link>
    </div>
  );
}
