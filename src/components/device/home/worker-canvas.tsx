"use client";

/**
 * WorkerCanvas — Tab 1's hero scene (v2).
 *
 * The dashboard is a machine, not a card grid. Workers sit in a tight
 * arc above the Vault; SVG wires between them encode each worker's
 * current state in colour + dash flow; the whole worker chip (not a
 * 4px LED) IS the state indicator. Below the canvas, a streaming
 * ticker pairs every wire pulse with a real, clickable signature so
 * the "real on-chain enforcement" claim is self-evident.
 *
 *   Three workers. One vault. The chain decides every wire.
 *
 *      🎯              🐋              📈
 *    Sentinel        Wren            Pulse
 *  earned $0.15 ✓ BLOCKED $0.10 ✗ → Pay.sh thinking
 *        ╲            │             ╱
 *         ╲ red flash │ amber pulse╱  green flow
 *          ╲          │           ╱
 *           ┌─────────┴──────────┐
 *           │   $12.40   USDC    │
 *           │   ████░░░░░░       │
 *           │   $1.22 / $5 today │
 *           │   🛡 Squads · devnet│
 *           └────────────────────┘
 *
 *   ── LIVE TICKER ──────────────────────────────────────
 *   • Sentinel  earned  $0.15 settled  5xK3…hjvx ↗  0:04
 *   • Pulse  →  Pay.sh/gemini  $0.003 settled       0:11
 *   • Wren  attempted  $0.10  BLOCKED daily cap     0:18
 *
 * Wire colour + dash flow:
 *   • settled (success) — green, dashes flow toward vault
 *   • blocked (failed)  — red, brief pulse ring at the worker
 *   • thinking          — amber, slow breath
 *   • idle              — soft gray, no animation
 *
 * Tap a worker node → /app/agents/[id].
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import type { WorkerTileWorker, WorkerTileAction } from "./worker-tile";
import type { ActionFeedItem } from "./action-feed";

interface Props {
  workers: WorkerTileWorker[];
  lastActionByWorker: Record<string, WorkerTileAction | null>;
  /** Full recent action feed — fed into the live ticker below the canvas.
   *  When `hideTicker` is true (canvas inside the new device shell)
   *  it's rendered separately as a control-zone card instead. */
  actionFeed: ActionFeedItem[];
  usdcBalance: number;
  network: "devnet" | "mainnet";
  paused: boolean;
  /** Daily cap — used inside the vault card to render the progress bar. */
  dailyLimitUsd?: number;
  dailySpentUsd?: number;
  /** Device-shell mode: drop the in-canvas balance + Squads label
   *  (identity strip owns those now), keep daily-cap progress + halo. */
  compact?: boolean;
  /** Device-shell mode: hide the embedded ticker so the control zone
   *  can render it as its own card. */
  hideTicker?: boolean;
  /** Device-shell mode: drop the whisper line so the canvas zone owns
   *  it externally. */
  hideWhisper?: boolean;
}

type WireState = "idle" | "thinking" | "settled" | "blocked";

interface Pt {
  x: number;
  y: number;
}

// Canvas geometry — tighter, vault-dominant. Workers sit on a short
// arc above a substantial vault card so the eye anchors at the centre.
const VBW = 360;
const VBH = 300;
const VAULT_W = 184;
const VAULT_H = 96;
const VAULT_CX = VBW / 2;
const VAULT_CY = VBH - VAULT_H / 2 - 14;
const VAULT_TOP_Y = VAULT_CY - VAULT_H / 2;
const WORKER_Y = 70;

export function WorkerCanvas({
  workers,
  lastActionByWorker,
  actionFeed,
  usdcBalance,
  network,
  paused,
  dailyLimitUsd,
  dailySpentUsd,
  compact,
  hideTicker,
  hideWhisper,
}: Props) {
  const slots = layoutSlots(workers.length);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Whisper line — replaces the old multi-paragraph banner */}
      {!hideWhisper && (
        <div className="text-center px-4">
          <p
            className="text-[12.5px] tracking-[-0.005em]"
            style={{ color: "rgba(15,23,42,0.55)" }}
          >
            Three workers. One vault. The chain decides every wire.
          </p>
        </div>
      )}

      {/* Canvas — workers on a short arc, vault as the anchor */}
      <div
        className="relative w-full overflow-hidden flex-shrink-0"
        style={{
          aspectRatio: `${VBW} / ${VBH}`,
          background:
            "radial-gradient(ellipse at 50% 88%, rgba(34,197,94,0.08) 0%, transparent 55%), linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.05)",
        }}
      >
        {/* Faint dot grid backdrop, masked to the centre so it never
            competes with the foreground */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(15,23,42,0.05) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
            opacity: 0.6,
            maskImage:
              "radial-gradient(ellipse at 50% 50%, black 50%, transparent 90%)",
          }}
        />

        {/* Wires layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${VBW} ${VBH}`}
          preserveAspectRatio="none"
        >
          {slots.map((slot, i) => {
            const w = workers[i];
            if (!w) return null;
            const action = lastActionByWorker[w.id] ?? null;
            const state = wireStateFor(w, action);
            return (
              <Wire
                key={w.id}
                from={{ x: slot.x, y: WORKER_Y }}
                to={{ x: VAULT_CX, y: VAULT_TOP_Y }}
                state={state}
              />
            );
          })}
        </svg>

        {/* Vault — the gravity well, substantial centre card */}
        <VaultCard
          usdcBalance={usdcBalance}
          paused={paused}
          network={network}
          dailyLimitUsd={dailyLimitUsd ?? 0}
          dailySpentUsd={dailySpentUsd ?? 0}
          compact={!!compact}
        />

        {/* Workers — chip-as-state, taps route to detail page */}
        {workers.map((w, i) => {
          const slot = slots[i];
          if (!slot) return null;
          const action = lastActionByWorker[w.id] ?? null;
          const state = wireStateFor(w, action);
          return (
            <WorkerNode
              key={w.id}
              worker={w}
              action={action}
              state={state}
              cxPct={(slot.x / VBW) * 100}
              cyPct={(WORKER_Y / VBH) * 100}
            />
          );
        })}
      </div>

      {/* Live ticker — every wire pulse paired with a clickable signature.
          Hidden when the device shell renders the ticker as a control-zone card. */}
      {!hideTicker && <LiveTicker items={actionFeed} network={network} />}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Layout — distribute workers along a tight arc above the vault
   ──────────────────────────────────────────────────────────────────── */

function layoutSlots(n: number): { x: number }[] {
  if (n === 0) return [];
  if (n === 1) return [{ x: VBW / 2 }];
  if (n === 2) return [{ x: VBW * 0.32 }, { x: VBW * 0.68 }];
  if (n === 3)
    return [{ x: VBW * 0.22 }, { x: VBW * 0.5 }, { x: VBW * 0.78 }];
  const inset = 0.14;
  return Array.from({ length: n }).map((_, i) => ({
    x: VBW * (inset + (i / (n - 1)) * (1 - 2 * inset)),
  }));
}

/* ────────────────────────────────────────────────────────────────────
   Wire — SVG path from worker to vault, state-coloured + animated
   ──────────────────────────────────────────────────────────────────── */

const WIRE_COLOR: Record<WireState, string> = {
  idle: "rgba(15,23,42,0.14)",
  thinking: "rgba(245,158,11,0.55)",
  settled: "rgba(34,197,94,0.65)",
  blocked: "rgba(239,68,68,0.65)",
};

function Wire({
  from,
  to,
  state,
}: {
  from: Pt;
  to: Pt;
  state: WireState;
}) {
  const midX = (from.x + to.x) / 2;
  const midY = from.y + (to.y - from.y) * 0.55;
  const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
  const color = WIRE_COLOR[state];
  const animated = state === "settled" || state === "thinking";

  return (
    <g>
      {animated && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeOpacity={0.18}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {animated && (
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="6 10"
          vectorEffect="non-scaling-stroke"
          animate={{
            strokeDashoffset: state === "settled" ? [0, -160] : [0, -48],
          }}
          transition={{
            duration: state === "settled" ? 2.2 : 4.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
      {state === "blocked" && (
        <motion.circle
          cx={from.x}
          cy={from.y}
          r={6}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          animate={{ opacity: [0, 0.9, 0], r: [4, 12, 18] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Vault — the gravity well. Substantial card with USDC, daily-cap,
   and Squads attribution all inline.
   ──────────────────────────────────────────────────────────────────── */

function VaultCard({
  usdcBalance,
  paused,
  network,
  dailyLimitUsd,
  dailySpentUsd,
  compact,
}: {
  usdcBalance: number;
  paused: boolean;
  network: "devnet" | "mainnet";
  dailyLimitUsd: number;
  dailySpentUsd: number;
  compact: boolean;
}) {
  const dailyPct =
    dailyLimitUsd > 0
      ? Math.min(100, Math.max(0, (dailySpentUsd / dailyLimitUsd) * 100))
      : 0;

  return (
    <div
      className="absolute"
      style={{
        left: "50%",
        bottom: 14,
        transform: "translateX(-50%)",
        width: VAULT_W,
        height: VAULT_H,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className={`relative w-full h-full rounded-[16px] flex flex-col px-4 ${
          compact ? "justify-start pt-2" : "justify-center"
        }`}
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F7F8FA 100%)",
          border: "1px solid rgba(15,23,42,0.10)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "inset 0 0 0 1px rgba(255,255,255,0.6)",
            "0 1px 2px rgba(15,23,42,0.04)",
            "0 16px 40px -16px rgba(15,23,42,0.20)",
            "0 0 0 8px rgba(34,197,94,0.04)",
            "0 0 0 18px rgba(34,197,94,0.02)",
          ].join(", "),
        }}
      >
        {/* Halo — sells "alive" without busy detail */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-[16px]"
          animate={
            paused
              ? {
                  boxShadow: [
                    "0 0 0 0 rgba(245,158,11,0.20)",
                    "0 0 0 16px rgba(245,158,11,0.0)",
                  ],
                }
              : {
                  boxShadow: [
                    "0 0 0 0 rgba(34,197,94,0.18)",
                    "0 0 0 16px rgba(34,197,94,0.0)",
                  ],
                }
          }
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        />

        {/* Row 1 — VAULT label + USDC balance.
            Hidden in compact mode: identity strip owns balance. */}
        {!compact && (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span
                className="font-mono uppercase tracking-[0.18em]"
                style={{ fontSize: 9, color: "rgba(15,23,42,0.45)" }}
              >
                Vault
              </span>
              <span
                className="font-mono uppercase tracking-[0.14em]"
                style={{ fontSize: 8.5, color: "rgba(15,23,42,0.45)" }}
              >
                USDC
              </span>
            </div>
            <div
              className="font-mono tabular-nums leading-none"
              style={{
                fontSize: 26,
                color: "#0A0A0A",
                letterSpacing: "-0.02em",
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              ${usdcBalance.toFixed(2)}
            </div>
          </>
        )}

        {/* Compact mode — just a small DAILY label so the card isn't blank above the bar */}
        {compact && dailyLimitUsd > 0 && (
          <div
            className="font-mono uppercase tracking-[0.18em] text-center"
            style={{ fontSize: 9, color: "rgba(15,23,42,0.45)" }}
          >
            Daily cap
          </div>
        )}

        {/* Row 2 — daily-cap progress bar */}
        {dailyLimitUsd > 0 && (
          <div className={compact ? "mt-1" : "mt-2"}>
            <div
              className="rounded-full overflow-hidden"
              style={{
                height: 4,
                background: "rgba(15,23,42,0.06)",
              }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${dailyPct}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background:
                    dailyPct > 85
                      ? "linear-gradient(90deg, #F59E0B, #EF4444)"
                      : "linear-gradient(90deg, #15803D, #22C55E)",
                }}
              />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span
                className="font-mono tabular-nums"
                style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
              >
                ${dailySpentUsd.toFixed(2)} / ${dailyLimitUsd.toFixed(0)} today
              </span>
              {/* Squads · {network} hidden in compact mode — identity strip owns it */}
              {!compact && (
                <span
                  className="inline-flex items-center gap-0.5 font-mono uppercase tracking-[0.14em]"
                  style={{ fontSize: 8.5, color: "rgba(15,23,42,0.55)" }}
                >
                  <ShieldCheck className="w-2.5 h-2.5" strokeWidth={2} />
                  Squads · {network}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Worker node — chip-IS-the-state. Whole tile glows / rings /
   pulses based on current wire state.
   ──────────────────────────────────────────────────────────────────── */

function WorkerNode({
  worker,
  action,
  state,
  cxPct,
  cyPct,
}: {
  worker: WorkerTileWorker;
  action: WorkerTileAction | null;
  state: WireState;
  cxPct: number;
  cyPct: number;
}) {
  const verb = verbFor(worker, action, state);
  const stateColor =
    state === "settled"
      ? "#15803D"
      : state === "blocked"
        ? "#B91C1C"
        : state === "thinking"
          ? "#B45309"
          : "rgba(15,23,42,0.50)";

  // Each non-idle state animates the chip border + outer halo so the
  // worker's mood is legible from across a room.
  const chipAnimate =
    state === "settled"
      ? {
          boxShadow: [
            "0 0 0 0 rgba(34,197,94,0.0), 0 0 0 1px rgba(34,197,94,0.55), 0 4px 14px -4px rgba(34,197,94,0.35)",
            "0 0 0 6px rgba(34,197,94,0.10), 0 0 0 1px rgba(34,197,94,0.65), 0 6px 18px -4px rgba(34,197,94,0.45)",
            "0 0 0 0 rgba(34,197,94,0.0), 0 0 0 1px rgba(34,197,94,0.55), 0 4px 14px -4px rgba(34,197,94,0.35)",
          ],
        }
      : state === "blocked"
        ? {
            boxShadow: [
              "0 0 0 0 rgba(239,68,68,0.0), 0 0 0 1px rgba(239,68,68,0.55), 0 4px 14px -4px rgba(239,68,68,0.35)",
              "0 0 0 8px rgba(239,68,68,0.10), 0 0 0 1px rgba(239,68,68,0.65), 0 6px 18px -4px rgba(239,68,68,0.45)",
              "0 0 0 0 rgba(239,68,68,0.0), 0 0 0 1px rgba(239,68,68,0.55), 0 4px 14px -4px rgba(239,68,68,0.35)",
            ],
          }
        : state === "thinking"
          ? {
              boxShadow: [
                "0 0 0 0 rgba(245,158,11,0.0), 0 0 0 1px rgba(245,158,11,0.50), 0 4px 14px -4px rgba(245,158,11,0.30)",
                "0 0 0 5px rgba(245,158,11,0.10), 0 0 0 1px rgba(245,158,11,0.60), 0 6px 18px -4px rgba(245,158,11,0.40)",
                "0 0 0 0 rgba(245,158,11,0.0), 0 0 0 1px rgba(245,158,11,0.50), 0 4px 14px -4px rgba(245,158,11,0.30)",
              ],
            }
          : {};

  const chipDuration =
    state === "blocked" ? 1.0 : state === "settled" ? 1.6 : 2.4;

  const showTuneBadge = worker.personalized === false;

  return (
    <Link
      href={`/app/agents/${worker.id}`}
      className="absolute"
      style={{
        left: `${cxPct}%`,
        top: `${cyPct}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        whileTap={{ scale: 0.96 }}
        className="flex flex-col items-center relative"
      >
        {/* TUNE badge — Phase 6. Worker is on starter defaults. Clears
            the moment the owner saves any config change. */}
        {showTuneBadge && (
          <span
            className="absolute font-mono uppercase tracking-[0.10em] rounded-md px-1 py-0.5 z-10"
            style={{
              top: -4,
              right: 6,
              fontSize: 7.5,
              color: "rgba(15,23,42,0.55)",
              background: "#FFFFFF",
              border: "1px solid rgba(15,23,42,0.10)",
              boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
            }}
          >
            TUNE
          </span>
        )}
        {/* The chip IS the state — no LED dot. Whole element animates. */}
        <motion.div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 64,
            height: 64,
            background:
              state === "settled"
                ? "linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%)"
                : state === "blocked"
                  ? "linear-gradient(180deg, #FFFFFF 0%, #FEF2F2 100%)"
                  : state === "thinking"
                    ? "linear-gradient(180deg, #FFFFFF 0%, #FFFBEB 100%)"
                    : "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
            border:
              state === "idle"
                ? "1px solid rgba(15,23,42,0.10)"
                : "1px solid transparent",
            boxShadow:
              state === "idle"
                ? "inset 0 1px 0 rgba(255,255,255,1), 0 4px 14px -6px rgba(15,23,42,0.18)"
                : undefined,
            fontSize: 32,
          }}
          animate={chipAnimate}
          transition={{
            duration: chipDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {worker.emoji}
        </motion.div>

        {/* Name */}
        <div
          className="text-[12.5px] font-semibold tracking-[-0.005em] mt-1.5"
          style={{ color: "#0A0A0A" }}
        >
          {worker.name}
        </div>

        {/* Verb / status */}
        <div
          className="font-mono uppercase tracking-[0.10em] truncate text-center"
          style={{
            fontSize: 8.5,
            color: stateColor,
            marginTop: 1,
            maxWidth: 110,
          }}
        >
          {verb}
        </div>
      </motion.div>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Live ticker — streaming list of recent on-chain events.
   Pairs every wire pulse with a clickable signature so the on-chain
   claim is self-evident, not aspirational.
   ──────────────────────────────────────────────────────────────────── */

export function LiveTicker({
  items,
  network,
}: {
  items: ActionFeedItem[];
  network: "devnet" | "mainnet";
}) {
  // Re-render every 15s so age strings stay live without thrash
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(iv);
  }, []);

  const visible = items.slice(0, 6);
  if (visible.length === 0) return null;

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
      }}
    >
      <div
        className="flex items-center justify-between px-3.5 py-2"
        style={{ borderBottom: "1px solid rgba(15,23,42,0.04)" }}
      >
        <div className="flex items-center gap-1.5">
          <motion.span
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "#22C55E",
              boxShadow: "0 0 0 2px rgba(34,197,94,0.18), 0 0 6px rgba(34,197,94,0.7)",
            }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <span
            className="font-mono uppercase tracking-[0.16em]"
            style={{ fontSize: 9.5, color: "rgba(15,23,42,0.55)" }}
          >
            Live ticker
          </span>
        </div>
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 8.5, color: "rgba(15,23,42,0.40)" }}
        >
          On-chain · Solana {network}
        </span>
      </div>
      <ol className="flex flex-col">
        <AnimatePresence initial={false}>
          {visible.map((it, i) => (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{
                opacity: i === 0 ? 1 : Math.max(0.45, 1 - i * 0.12),
                y: 0,
              }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 px-3.5 py-2"
              style={{
                borderBottom:
                  i < visible.length - 1
                    ? "1px solid rgba(15,23,42,0.04)"
                    : "none",
              }}
            >
              <TickerRow item={it} network={network} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}

function TickerRow({
  item,
  network,
}: {
  item: ActionFeedItem;
  network: "devnet" | "mainnet";
}) {
  const settled = item.signatureStatus === "success";
  const failed = item.signatureStatus === "failed";
  const amt = item.amountUsd != null ? `$${item.amountUsd.toFixed(2)}` : null;
  const verb = verbForTicker(item);

  const dotColor = settled ? "#22C55E" : failed ? "#EF4444" : "#94A3B8";

  return (
    <>
      {/* Worker emoji */}
      <span style={{ fontSize: 14 }}>{item.worker.emoji}</span>

      {/* Worker name */}
      <span
        className="text-[11.5px] font-semibold tracking-[-0.005em]"
        style={{ color: "#0A0A0A", flexShrink: 0 }}
      >
        {item.worker.name}
      </span>

      {/* Verb + amount, single line, truncates */}
      <span
        className="text-[11.5px] truncate flex-1 min-w-0"
        style={{ color: "rgba(15,23,42,0.65)" }}
      >
        {verb}
        {amt && (
          <span className="font-mono tabular-nums ml-1" style={{ color: "#0A0A0A" }}>
            {amt}
          </span>
        )}
      </span>

      {/* Outcome dot */}
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: dotColor }}
      />

      {/* Tx pill — clickable Explorer link, only when we have a sig */}
      {item.signature && settled && (
        <Link
          href={explorerUrlFor(item.signature, network)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 font-mono px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{
            background: "rgba(34,197,94,0.08)",
            color: "#15803D",
            fontSize: 9.5,
            border: "1px solid rgba(34,197,94,0.20)",
          }}
        >
          {item.signature.slice(0, 4)}…{item.signature.slice(-4)}
          <ArrowUpRight className="w-2.5 h-2.5" strokeWidth={2.5} />
        </Link>
      )}
      {failed && (
        <span
          className="font-mono uppercase tracking-[0.10em] flex-shrink-0"
          style={{ fontSize: 8.5, color: "#B91C1C" }}
        >
          Blocked
        </span>
      )}

      {/* Age */}
      <span
        className="font-mono tabular-nums flex-shrink-0"
        style={{ fontSize: 9.5, color: "rgba(15,23,42,0.40)" }}
      >
        {fmtAgo(item.timestamp)}
      </span>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────
   State / verb derivation
   ──────────────────────────────────────────────────────────────────── */

function wireStateFor(
  worker: WorkerTileWorker,
  action: WorkerTileAction | null,
): WireState {
  if (action) {
    const age = Date.now() - action.timestamp;
    const fresh = age < 90_000;
    if (fresh && action.signatureStatus === "success") return "settled";
    if (fresh && action.signatureStatus === "failed") return "blocked";
  }
  if (worker.isThinking) return "thinking";
  return "idle";
}

function verbFor(
  worker: WorkerTileWorker,
  action: WorkerTileAction | null,
  state: WireState,
): string {
  if (state === "thinking") return "Thinking…";
  if (state === "settled") {
    const amt = action?.amountUsd != null ? `$${action.amountUsd.toFixed(2)}` : "";
    return amt ? `Settled ${amt}` : "Settled";
  }
  if (state === "blocked") {
    const amt = action?.amountUsd != null ? `$${action.amountUsd.toFixed(2)}` : "";
    return amt ? `Blocked ${amt}` : "Blocked";
  }
  // Phase 4 — server-computed userOutcome wins over template fallback.
  // "2 drafts ready" / "3 alerts · last 14m ago" / "1 trigger armed".
  if (worker.userOutcome && worker.userOutcome.trim().length > 0) {
    return worker.userOutcome;
  }
  if (worker.template === "bounty_hunter") return "Watching feeds";
  if (worker.template === "whale_tracker") return "Watching wallets";
  if (worker.template === "token_pulse") return "Watching prices";
  return "Standing by";
}

function verbForTicker(item: ActionFeedItem): string {
  const failed = item.signatureStatus === "failed";
  const settled = item.signatureStatus === "success";
  const counter = item.counterparty?.replace(/^[^\w]+/, "").trim() ?? "";
  const message = item.message ?? "";

  // Phase 4 — prefer user-outcome verbs over internal tool names.
  // Pay.sh routings always read "→ Pay.sh / Gemini · validate …".
  if (counter.includes("Pay.sh") || message.toLowerCase().includes("gemini")) {
    return "→ Pay.sh / Gemini · validate ";
  }

  switch (item.tool) {
    case "post_task":
      return failed ? "tried to post task — escrow blocked " : "posted task ";
    case "claim_task":
      return "claimed task ";
    case "complete_task":
      return settled ? "earned " : "tried to earn ";
    case "stake_on_finding":
      return "staked on finding ";
    case "subscribe_to_agent":
      return "subscribed ";
    default:
      return failed ? "blocked " : "settled ";
  }
}

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function explorerUrlFor(sig: string, network: "devnet" | "mainnet"): string {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${sig}${cluster}`;
}
