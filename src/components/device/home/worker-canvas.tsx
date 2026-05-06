"use client";

/**
 * WorkerCanvas — Tab 1's hero scene.
 *
 * Replaces the 3-card worker grid with a single connected machine:
 * the Vault node at the bottom centre is the gravity well; each worker
 * sits in the upper field, connected to the Vault by a live wire that
 * encodes its current state.
 *
 *           ┌─────────┐    ┌──────┐   ┌─────────┐
 *           │ Sentinel│    │ Wren │   │  Pulse  │
 *           └────┬────┘    └──┬───┘   └────┬────┘
 *                │            │            │
 *                ╲           │            ╱
 *                 ╲          │           ╱
 *                  ╲         │          ╱
 *                   ╲        │         ╱
 *                    ╲       │        ╱
 *                     ┌──────────────┐
 *                     │   $0.42      │
 *                     │   VAULT      │
 *                     └──────────────┘
 *
 * Wire colour + dash flow encode state per worker:
 *   • settled (success) — green, dashes flow toward the worker that earned
 *   • blocked (failed)  — red, brief pulse, no flow
 *   • thinking          — amber, slow breath
 *   • idle              — soft gray, no animation
 *
 * Tap a worker node → /app/agents/[id] (preserves the existing per-worker
 * deep page; this is just a different framing of the same data).
 *
 * Empty state (no workers) is handled by the parent — the canvas only
 * renders when at least one worker is on the device.
 */

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import type { WorkerTileWorker, WorkerTileAction } from "./worker-tile";

interface Props {
  workers: WorkerTileWorker[];
  lastActionByWorker: Record<string, WorkerTileAction | null>;
  usdcBalance: number;
  network: "devnet" | "mainnet";
  paused: boolean;
}

type WireState = "idle" | "thinking" | "settled" | "blocked";

interface WirePoint {
  x: number;
  y: number;
}

// Canvas geometry. We pin a 360×340 viewBox and let the SVG scale to the
// container. Strokes use vector-effect=non-scaling-stroke so wires read
// the same on a phone or a desktop.
const VBW = 360;
const VBH = 340;
const VAULT_CY = VBH - 56;
const VAULT_CX = VBW / 2;
const WORKER_Y = 64;

export function WorkerCanvas({
  workers,
  lastActionByWorker,
  usdcBalance,
  network,
  paused,
}: Props) {
  const slots = layoutSlots(workers.length);

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: `${VBW} / ${VBH}`,
        background:
          "radial-gradient(ellipse at 50% 92%, rgba(34,197,94,0.06) 0%, transparent 55%), linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
        borderRadius: 16,
        border: "1px solid rgba(15,23,42,0.05)",
      }}
    >
      {/* Faint hex/dot grid backdrop — sells the "scene" without competing */}
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
              to={{ x: VAULT_CX, y: VAULT_CY }}
              state={state}
            />
          );
        })}
      </svg>

      {/* Vault node — gravity well, bottom-centre */}
      <VaultNode
        usdcBalance={usdcBalance}
        paused={paused}
        network={network}
      />

      {/* Worker nodes — taps route to detail page */}
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
  );
}

/* ────────────────────────────────────────────────────────────────────
   Layout — distribute workers along the top arc
   ──────────────────────────────────────────────────────────────────── */

function layoutSlots(n: number): { x: number }[] {
  if (n === 0) return [];
  if (n === 1) return [{ x: VBW / 2 }];
  if (n === 2) return [{ x: VBW * 0.3 }, { x: VBW * 0.7 }];
  if (n === 3)
    return [{ x: VBW * 0.18 }, { x: VBW * 0.5 }, { x: VBW * 0.82 }];
  // 4+ — distribute evenly with some inset
  const inset = 0.12;
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
  from: WirePoint;
  to: WirePoint;
  state: WireState;
}) {
  // Quadratic bezier with a gentle inward bow toward the vault
  const midX = (from.x + to.x) / 2;
  const midY = from.y + (to.y - from.y) * 0.55;
  const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
  const color = WIRE_COLOR[state];
  const animated = state === "settled" || state === "thinking";

  return (
    <g>
      {/* Halo for active wires — blurred under-stroke */}
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
      {/* Base line */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* Flowing dashes for settled/thinking */}
      {animated && (
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="6 10"
          vectorEffect="non-scaling-stroke"
          animate={{ strokeDashoffset: state === "settled" ? [0, -160] : [0, -48] }}
          transition={{
            duration: state === "settled" ? 2.2 : 4.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}
      {/* Blocked wires get a brief red ring at the worker end */}
      {state === "blocked" && (
        <motion.circle
          cx={from.x}
          cy={from.y}
          r={6}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          animate={{ opacity: [0, 0.9, 0], r: [4, 12, 16] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </g>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Vault node — gravity well at the bottom
   ──────────────────────────────────────────────────────────────────── */

function VaultNode({
  usdcBalance,
  paused,
  network,
}: {
  usdcBalance: number;
  paused: boolean;
  network: "devnet" | "mainnet";
}) {
  return (
    <div
      className="absolute"
      style={{
        left: "50%",
        bottom: 12,
        transform: "translateX(-50%)",
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="relative rounded-[18px] flex flex-col items-center justify-center px-5 py-3"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F7F8FA 100%)",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: [
            "inset 0 1px 0 rgba(255,255,255,1)",
            "0 1px 2px rgba(15,23,42,0.04)",
            "0 14px 38px -16px rgba(15,23,42,0.20)",
            "0 0 0 8px rgba(34,197,94,0.04)",
            "0 0 0 16px rgba(34,197,94,0.02)",
          ].join(", "),
          minWidth: 132,
        }}
      >
        {/* Soft pulsing halo — sells "alive" without being busy */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-[18px]"
          style={{
            boxShadow: paused
              ? "0 0 0 0 rgba(245,158,11,0.0)"
              : "0 0 0 0 rgba(34,197,94,0.0)",
          }}
          animate={
            paused
              ? {
                  boxShadow: [
                    "0 0 0 0 rgba(245,158,11,0.20)",
                    "0 0 0 14px rgba(245,158,11,0.0)",
                  ],
                }
              : {
                  boxShadow: [
                    "0 0 0 0 rgba(34,197,94,0.18)",
                    "0 0 0 14px rgba(34,197,94,0.0)",
                  ],
                }
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        />

        <div className="flex items-baseline gap-1.5">
          <span
            className="font-mono uppercase tracking-[0.18em]"
            style={{ fontSize: 9, color: "rgba(15,23,42,0.45)" }}
          >
            Vault
          </span>
          <span
            className="font-mono tabular-nums"
            style={{
              fontSize: 22,
              color: "#0A0A0A",
              letterSpacing: "-0.02em",
              fontWeight: 500,
            }}
          >
            ${usdcBalance.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <ShieldCheck
            className="w-3 h-3"
            strokeWidth={1.8}
            style={{ color: "rgba(15,23,42,0.50)" }}
          />
          <span
            className="font-mono uppercase tracking-[0.16em]"
            style={{ fontSize: 8.5, color: "rgba(15,23,42,0.50)" }}
          >
            Squads · {network}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Worker node — emoji puck + name + 1-line status
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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        whileTap={{ scale: 0.96 }}
        className="flex flex-col items-center"
      >
        {/* Emoji puck */}
        <div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            background:
              "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,1), 0 4px 14px -6px rgba(15,23,42,0.18)",
            fontSize: 26,
          }}
        >
          {worker.emoji}
          {/* Status LED, top-right of puck */}
          <motion.span
            className="absolute rounded-full"
            style={{
              width: 9,
              height: 9,
              top: -2,
              right: -2,
              background:
                state === "settled"
                  ? "#22C55E"
                  : state === "blocked"
                    ? "#EF4444"
                    : state === "thinking"
                      ? "#F59E0B"
                      : "#94A3B8",
              boxShadow:
                state === "idle"
                  ? "0 0 0 2px rgba(255,255,255,1)"
                  : `0 0 0 2px rgba(255,255,255,1), 0 0 8px ${
                      state === "settled"
                        ? "rgba(34,197,94,0.7)"
                        : state === "blocked"
                          ? "rgba(239,68,68,0.7)"
                          : "rgba(245,158,11,0.7)"
                    }`,
            }}
            animate={
              state === "idle"
                ? {}
                : { opacity: [0.6, 1, 0.6] }
            }
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Name */}
        <div
          className="text-[12px] font-semibold tracking-[-0.005em] mt-1.5"
          style={{ color: "#0A0A0A" }}
        >
          {worker.name}
        </div>

        {/* Verb / status */}
        <div
          className="font-mono uppercase tracking-[0.10em] truncate max-w-[110px] text-center"
          style={{ fontSize: 8.5, color: stateColor, marginTop: 1 }}
        >
          {verb}
        </div>
      </motion.div>
    </Link>
  );
}

/* ────────────────────────────────────────────────────────────────────
   State + verb derivation
   ──────────────────────────────────────────────────────────────────── */

function wireStateFor(
  worker: WorkerTileWorker,
  action: WorkerTileAction | null,
): WireState {
  // Recent on-chain action wins (60s freshness window keeps the wire
  // honest — old success/blocked decays to idle).
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
  // Idle — show a hint based on template so the node isn't blank
  if (worker.template === "bounty_hunter") return "Watching feeds";
  if (worker.template === "whale_tracker") return "Watching wallets";
  if (worker.template === "token_pulse") return "Watching prices";
  return "Standing by";
}
