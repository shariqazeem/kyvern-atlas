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
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Sliders,
} from "lucide-react";

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
  /** Click handler for the "Already have an agent?" SDK teaser —
   *  switches to Tab 3 where the Integrate card lives. */
  onOpenSdk?: () => void;
}

export function DeployTab({
  deviceId,
  onDeployed,
  isGuest,
  onSignIn,
  onOpenSdk,
}: Props) {
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
      // Celebration runs ~1.6s before auto-switching to Tab 1 so the
      // user feels the success: card ring lights up, then the
      // floating toast slides in saying "Worker added to your device".
      setTimeout(() => {
        onDeployed?.();
      }, 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
      setDeploying(null);
    }
  }

  // The deployed preset's display name for the celebration toast.
  const justDeployedPreset = justDeployed
    ? PRESETS.find((p) => p.id === justDeployed)
    : null;

  return (
    <div className="relative flex flex-col gap-5">
      {/* CELEBRATION TOAST — slides in when a preset deploy lands.
          The card ring + check animation plays inside the preset card;
          this is the higher-level "Worker added to your device" win
          confirmation. Fades out as the tab auto-switches to Tab 1. */}
      <AnimatePresence>
        {justDeployedPreset && (
          <motion.div
            key="deploy-toast"
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute left-1/2 -translate-x-1/2 -top-2 z-30 inline-flex items-center gap-2 rounded-full px-3.5 py-2 pointer-events-none"
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.8)",
              boxShadow:
                "0 8px 28px rgba(15,23,42,0.18), 0 0 0 4px rgba(34,197,94,0.10)",
            }}
          >
            <CheckCircle2
              className="w-4 h-4"
              strokeWidth={2}
              style={{ color: "#86EFAC" }}
            />
            <span
              className="text-[12px] font-semibold tracking-[-0.005em]"
            >
              {justDeployedPreset.emoji}{" "}
              {justDeployedPreset.name} added to your device
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER — ownership-first language. The user OWNS this device;
          workers are tenants they ADD to it, not people they HIRE. */}
      <div>
        <div
          className="font-mono uppercase tracking-[0.18em] mb-1"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          Deploy worker
        </div>
        <h3
          className="text-[20px] font-semibold tracking-[-0.015em] mb-1"
          style={{ color: "#0A0A0A" }}
        >
          Add a worker to this device.
        </h3>
        <p
          className="text-[12.5px] leading-[1.55]"
          style={{ color: "#6B7280" }}
        >
          {isGuest
            ? "Sign in to deploy. Every worker runs inside this device under the same policy program."
            : "Every worker you add runs inside this device — under the same Anchor policy program. Pick a preset or wrap your own agent."}
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
              {/* HERO ICON — 72×72 — the visual anchor of the card.
                  Reads as "installing an app on your device", not
                  "browsing a marketplace." */}
              <div
                className="rounded-[18px] flex items-center justify-center mb-4"
                style={{
                  width: 72,
                  height: 72,
                  fontSize: 40,
                  background:
                    "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
                  border: "1px solid rgba(15,23,42,0.06)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(15,23,42,0.04), 0 8px 22px -10px rgba(15,23,42,0.10)",
                }}
              >
                {p.emoji}
              </div>

              <div
                className="text-[17px] font-semibold tracking-[-0.01em] mb-1"
                style={{ color: "#0A0A0A" }}
              >
                {p.name}
              </div>
              <p
                className="text-[12px] leading-[1.45] mb-2"
                style={{ color: "#6B7280" }}
              >
                {p.oneLine}
              </p>

              {/* OWNERSHIP LINE — kills the marketplace feel. Every
                  card says the same thing: this lives inside the
                  user's device, not in some shared catalog. */}
              <p
                className="font-mono mb-3 flex-1"
                style={{
                  color: "rgba(15,23,42,0.45)",
                  fontSize: 10,
                  letterSpacing: "0.02em",
                }}
              >
                Runs inside your device · enforced by the chain
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
                          : "rgba(15,23,42,0.65)",
                  }}
                >
                  {isDone
                    ? "Joined the device"
                    : isDeploying
                      ? "Deploying"
                      : isGuest
                        ? "Sign in to deploy"
                        : "Deploy to this device"}
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

      {/* SECONDARY OPTIONS — bring your own (custom flow) + SDK teaser.
          Same visual register but tighter — the headline is the three
          presets; these are for builders who want more. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Or bring your own agent — full template picker */}
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
                Or bring your own agent
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

        {/* SDK teaser — points to Tab 3's Integrate card */}
        <button
          type="button"
          onClick={onOpenSdk}
          className="rounded-[14px] p-4 flex items-center justify-between gap-3 text-left transition active:scale-[0.99]"
          style={{
            background:
              "linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 100%)",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="rounded-[10px] flex items-center justify-center flex-shrink-0 font-mono"
              style={{
                width: 40,
                height: 40,
                fontSize: 16,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#86EFAC",
              }}
            >
              {"</>"}
            </div>
            <div className="min-w-0">
              <div
                className="text-[13.5px] font-semibold tracking-[-0.005em]"
                style={{ color: "#FFFFFF" }}
              >
                Already have an agent?
              </div>
              <div
                className="text-[11.5px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Wrap it in 5 lines · SDK + Pay.sh
              </div>
            </div>
          </div>
          <ArrowRight
            className="w-4 h-4 flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.65)" }}
            strokeWidth={2}
          />
        </button>
      </div>
    </div>
  );
}
