"use client";

/**
 * KyvernDevice — virtual hardware device for AI agent management.
 *
 * A full CSS-3D rendered device with OLED screen, physical buttons,
 * and LED status indicator. Receives Atlas data and renders it as
 * a real-time hardware display.
 *
 * Design language: matte black, OLED screen, JetBrains Mono numerals,
 * subtle 3D tilt on hover, interactive buttons.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { fmtUptime, fmtUsd, fmtAgo } from "@/lib/format";

/* ── Types ─────────────────────────────────────────────────────── */

export interface DeviceAtlasState {
  running: boolean;
  uptimeMs: number;
  totalSettled: number;
  totalSpentUsd: number;
  totalAttacksBlocked: number;
  fundsLostUsd: number;
  firstIgnitionAt: string | null;
  network: "devnet" | "mainnet";
  policy: {
    dailyCapUsd: number;
    spentTodayUsd: number;
    spendUtilization: number;
  };
  nextCycleAt: string | null;
}

export interface DeviceFeedItem {
  id: string;
  _kind: "decision" | "attack";
  _when: string;
  merchant?: string | null;
  amountUsd?: number;
  outcome?: string;
  type?: string;
  txSignature?: string | null;
  blockedReason?: string | null;
}

interface KyvernDeviceProps {
  state: DeviceAtlasState | null;
  feed: DeviceFeedItem[];
  agentName?: string;
  onKill?: () => void;
  onProbe?: () => void;
  /** Delay before boot animation starts (ms) */
  bootDelay?: number;
}

/* ── Constants ─────────────────────────────────────────────────── */

const TILT_MAX = 6; // degrees

/* ── Component ─────────────────────────────────────────────────── */

export function KyvernDevice({
  state,
  feed,
  agentName = "ATLAS",
  onKill,
  onProbe,
  bootDelay = 0,
}: KyvernDeviceProps) {
  const deviceRef = useRef<HTMLDivElement>(null);
  const [booted, setBooted] = useState(bootDelay === 0);
  const [killing, setKilling] = useState(false);
  const [probing, setProbing] = useState(false);
  const [uptimeMs, setUptimeMs] = useState(state?.uptimeMs ?? 0);

  // Boot sequence
  useEffect(() => {
    if (bootDelay === 0) return;
    const t = setTimeout(() => setBooted(true), bootDelay);
    return () => clearTimeout(t);
  }, [bootDelay]);

  // Live uptime counter
  useEffect(() => {
    if (!state?.firstIgnitionAt) return;
    const base = Date.now() - new Date(state.firstIgnitionAt).getTime();
    setUptimeMs(base);
    const iv = setInterval(() => {
      setUptimeMs(Date.now() - new Date(state.firstIgnitionAt!).getTime());
    }, 1000);
    return () => clearInterval(iv);
  }, [state?.firstIgnitionAt]);

  // 3D tilt
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [TILT_MAX, -TILT_MAX]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-TILT_MAX, TILT_MAX]), {
    stiffness: 150,
    damping: 20,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = deviceRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    },
    [mouseX, mouseY],
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  // Kill switch
  const handleKill = useCallback(async () => {
    setKilling(true);
    onKill?.();
    setTimeout(() => setKilling(false), 2000);
  }, [onKill]);

  // Attack probe
  const handleProbe = useCallback(async () => {
    if (probing) return;
    setProbing(true);
    onProbe?.();
    setTimeout(() => setProbing(false), 3000);
  }, [onProbe, probing]);

  const isRunning = state?.running ?? false;
  const budgetUtil = state?.policy.spendUtilization ?? 0;
  const budgetPct = Math.min(budgetUtil * 100, 100);
  const recentFeed = feed.slice(0, 5);

  return (
    <div style={{ perspective: 1200 }}>
      <motion.div
        ref={deviceRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative mx-auto select-none"
        /* Device body — 340×580 on desktop */
        /* Responsive: wider on mobile, auto height */
      >
        {/* ── Device body ──────────────────────────────── */}
        <div
          className="relative w-[340px] sm:w-[340px] max-w-[calc(100vw-32px)] rounded-[28px] overflow-hidden"
          style={{
            background: "linear-gradient(165deg, #1a1a1a 0%, #0a0a0a 100%)",
            boxShadow: [
              "0 0 0 1px rgba(255,255,255,0.06)",
              "0 1px 0 0 rgba(255,255,255,0.03) inset",
              "0 30px 80px rgba(0,0,0,0.6)",
              "0 8px 32px rgba(0,0,0,0.4)",
            ].join(", "),
            padding: "14px",
          }}
        >
          {/* ── Screen ────────────────────────────────── */}
          <motion.div
            className="rounded-[18px] overflow-hidden"
            style={{
              background: "#000",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.8)",
            }}
            animate={
              probing
                ? {
                    boxShadow: [
                      "inset 0 1px 3px rgba(0,0,0,0.8), 0 0 0 0 rgba(255,68,68,0)",
                      "inset 0 1px 3px rgba(0,0,0,0.8), 0 0 20px 2px rgba(255,68,68,0.3)",
                      "inset 0 1px 3px rgba(0,0,0,0.8), 0 0 0 0 rgba(255,68,68,0)",
                    ],
                  }
                : {}
            }
            transition={{ duration: 0.6, repeat: probing ? 2 : 0 }}
          >
            <AnimatePresence mode="wait">
              {!booted ? (
                <BootScreen key="boot" />
              ) : (
                <motion.div
                  key="live"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="p-4 min-h-[440px] flex flex-col"
                >
                  {/* Status bar */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold tracking-[0.15em] text-white/40">
                        KYVERN
                      </span>
                      <span className="text-[9px] font-mono text-white/25 tracking-wider">
                        {state?.network?.toUpperCase() ?? "DEVNET"}
                      </span>
                    </div>
                    <DeviceLED active={isRunning} attacking={probing} />
                  </div>

                  {/* Agent name + status */}
                  <div className="mb-4">
                    <h2 className="font-mono text-[22px] font-bold tracking-[-0.02em] text-white">
                      {agentName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: isRunning
                            ? "rgba(0,255,136,0.12)"
                            : "rgba(255,68,68,0.12)",
                          color: isRunning ? "#00ff88" : "#ff4444",
                        }}
                      >
                        {isRunning ? "ACTIVE" : "PAUSED"}
                      </span>
                      <span className="font-mono text-[11px] text-white/30">
                        {fmtUptime(uptimeMs)}
                      </span>
                    </div>
                  </div>

                  {/* Budget gauge */}
                  <div className="mb-4">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[9px] font-mono font-semibold tracking-[0.12em] text-white/35">
                        DAILY BUDGET
                      </span>
                      <span className="font-mono text-[12px] text-white/70">
                        {fmtUsd(state?.policy.spentTodayUsd ?? 0)}
                        <span className="text-white/25">
                          {" "}/ {fmtUsd(state?.policy.dailyCapUsd ?? 0)}
                        </span>
                      </span>
                    </div>
                    <div
                      className="h-[3px] rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${budgetPct}%` }}
                        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                        style={{
                          background:
                            budgetPct > 80
                              ? "linear-gradient(90deg, #ffaa00, #ff4444)"
                              : budgetPct > 50
                                ? "linear-gradient(90deg, #00ff88, #ffaa00)"
                                : "#00ff88",
                        }}
                      />
                    </div>
                  </div>

                  {/* Activity feed */}
                  <div className="flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono font-semibold tracking-[0.12em] text-white/35">
                        LIVE FEED
                      </span>
                      <span className="text-[9px] font-mono text-white/20">
                        {feed.length} events
                      </span>
                    </div>
                    <div className="space-y-1">
                      {recentFeed.length === 0 && (
                        <p className="text-[11px] font-mono text-white/20 py-4 text-center">
                          Awaiting first cycle...
                        </p>
                      )}
                      {recentFeed.map((item, i) => (
                        <FeedRow key={item.id} item={item} index={i} />
                      ))}
                    </div>
                  </div>

                  {/* Bottom stats */}
                  <div
                    className="mt-4 pt-3 flex items-center justify-between"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <StatPill label="TXS" value={String(state?.totalSettled ?? 0)} />
                    <StatPill
                      label="BLOCKED"
                      value={String(state?.totalAttacksBlocked ?? 0)}
                      color="#ff4444"
                    />
                    <StatPill
                      label="LOST"
                      value={fmtUsd(state?.fundsLostUsd ?? 0)}
                      color={
                        (state?.fundsLostUsd ?? 0) === 0 ? "#00ff88" : "#ff4444"
                      }
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Buttons ────────────────────────────────── */}
          <div className="flex items-center gap-2 mt-3 px-1">
            <DeviceButton
              label="KILL"
              variant="danger"
              active={killing}
              onClick={handleKill}
            />
            <DeviceButton
              label="ATTACK"
              variant="warn"
              active={probing}
              onClick={handleProbe}
            />
            <DeviceButton label="FUND" variant="default" onClick={() => {}} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function BootScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-[440px] flex flex-col items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="font-mono text-[14px] font-bold tracking-[0.3em] text-white/60">
          KYVERN
        </span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-4"
      >
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-white/30"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-3 font-mono text-[9px] tracking-[0.1em] text-white/20"
      >
        CONNECTING TO SOLANA
      </motion.p>
    </motion.div>
  );
}

function DeviceLED({
  active,
  attacking,
}: {
  active: boolean;
  attacking?: boolean;
}) {
  const color = attacking ? "#ff4444" : active ? "#00ff88" : "#ff4444";
  return (
    <div className="relative">
      <motion.div
        className="w-2 h-2 rounded-full"
        style={{ background: color }}
        animate={{
          boxShadow: [
            `0 0 4px ${color}`,
            `0 0 10px ${color}`,
            `0 0 4px ${color}`,
          ],
        }}
        transition={{
          duration: attacking ? 0.3 : 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

function FeedRow({ item, index }: { item: DeviceFeedItem; index: number }) {
  const isAttack = item._kind === "attack";
  const isBlocked =
    isAttack || item.outcome === "blocked" || item.outcome === "failed";
  const label = isAttack
    ? item.type?.replace(/_/g, " ") ?? "attack"
    : item.merchant ?? "unknown";
  const amount = item.amountUsd ?? 0;
  const sig = item.txSignature;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-center gap-2 py-1.5 px-2 rounded-lg"
      style={{ background: "rgba(255,255,255,0.02)" }}
    >
      {/* Status dot */}
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: isBlocked ? "#ff4444" : "#00ff88",
        }}
      />

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[11px] text-white/70 truncate">{label}</p>
      </div>

      {/* Amount */}
      {amount > 0 && (
        <span
          className="font-mono text-[10px] shrink-0"
          style={{ color: isBlocked ? "#ff4444" : "#00ff88" }}
        >
          {isBlocked ? "−" : ""}${amount.toFixed(2)}
        </span>
      )}

      {/* Time */}
      <span className="font-mono text-[9px] text-white/20 shrink-0">
        {fmtAgo(item._when)}
      </span>

      {/* Explorer link */}
      {sig && (
        <a
          href={`https://explorer.solana.com/tx/${sig}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/15 hover:text-white/40 transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}
    </motion.div>
  );
}

function StatPill({
  label,
  value,
  color = "white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-mono tracking-[0.1em] text-white/25">
        {label}
      </p>
      <p className="font-mono text-[14px] font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function DeviceButton({
  label,
  variant = "default",
  active = false,
  onClick,
}: {
  label: string;
  variant?: "default" | "danger" | "warn";
  active?: boolean;
  onClick: () => void;
}) {
  const colors = {
    default: { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.5)" },
    danger: {
      bg: active ? "rgba(255,68,68,0.25)" : "rgba(255,68,68,0.1)",
      text: active ? "#ff6666" : "#ff4444",
    },
    warn: {
      bg: active ? "rgba(255,170,0,0.25)" : "rgba(255,170,0,0.1)",
      text: active ? "#ffcc44" : "#ffaa00",
    },
  };
  const c = colors[variant];

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex-1 h-[38px] rounded-[12px] font-mono text-[10px] font-bold tracking-[0.15em] transition-colors"
      style={{ background: c.bg, color: c.text }}
    >
      {active && variant === "warn" ? "PROBING..." : label}
    </motion.button>
  );
}
