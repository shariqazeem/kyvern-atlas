"use client";

/**
 * GraphCanvas — the deployed-agent worker canvas for /app.
 *
 * Visual chassis: vault disc at the center, agent tiles arranged on
 * a soft arc above, SVG strings from each tile down to the vault.
 * The strings animate based on each agent's most-recent run status:
 *
 *   no runs yet → soft gray, no animation
 *   running     → amber, slow breath
 *   succeeded   → green, dashes flow toward the vault for ~2s post-finish
 *   failed      → red brief pulse
 *
 * Empty state (zero agents): just the vault + a soft glow ring + a
 * single "+ Deploy your first agent" CTA tile in the center slot.
 *
 * The canvas does NOT mount the builder modal itself — it exposes
 * onDeployClick / onAgentClick callbacks and the parent owns the
 * modal lifecycle. Keeps the canvas pure visual.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GraphTile } from "./tile";
import { GraphAddTile } from "./add-tile";
import type { GraphAgentSummary } from "@/lib/agents/graph/agent-store";

interface Props {
  vaultId: string | null;
  ownerWallet: string | null;
  usdcBalance: number;
  paused?: boolean;
  network?: "devnet" | "mainnet";
  onDeployClick: () => void;
  onAgentClick: (agentId: string) => void;
  className?: string;
}

export function GraphCanvas({
  vaultId,
  ownerWallet,
  usdcBalance,
  paused,
  network = "devnet",
  onDeployClick,
  onAgentClick,
  className,
}: Props) {
  const [agents, setAgents] = useState<GraphAgentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll the agent list every 8s so the canvas stays in sync as
  // runs land (status pill changes from running → succeeded etc).
  // Also fires on tab focus + on every mount so navigating back
  // from the detail page (post-delete) shows fresh state without a
  // hard reload.
  useEffect(() => {
    if (!vaultId || !ownerWallet) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(
          `/api/devices/${vaultId}/graph-agents`,
          {
            headers: { "x-owner-wallet": ownerWallet },
            cache: "no-store",
          },
        );
        if (cancelled) return;
        if (r.status === 401) return; // owner not yet hydrated
        if (!r.ok) {
          setError(`fetch agents failed: ${r.status}`);
          return;
        }
        const data = (await r.json()) as { agents: GraphAgentSummary[] };
        if (!cancelled) {
          setAgents(data.agents);
          setError(null);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    };
    void tick();
    const interval = setInterval(tick, 8000);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [vaultId, ownerWallet]);

  // Layout — N agents around an arc above the vault. The vault is
  // at the bottom-center; agents fan out across the top half.
  const slots = useMemo(() => layoutSlots((agents?.length ?? 0) + 1), [agents?.length]);

  // Empty whenever there are no agents — including the loading state.
  // This avoids the canvas rendering an "agents! is non-null" branch
  // before the first fetch lands.
  const empty = (agents?.length ?? 0) === 0;

  return (
    <div
      className={`relative w-full ${className ?? ""}`}
      style={{
        minHeight: 320,
        background:
          "radial-gradient(ellipse at 50% 90%, rgba(34,197,94,0.06) 0%, transparent 60%), linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        borderRadius: 16,
        border: "1px solid rgba(15,23,42,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Faint dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(15,23,42,0.05) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          opacity: 0.6,
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 50%, transparent 90%)",
        }}
      />

      {/* Whisper line */}
      <div className="relative z-10 pt-4 pb-2 text-center px-4">
        <p
          className="text-[12.5px] tracking-[-0.005em]"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          {empty
            ? "Your device runs agents. Compose one — the chain decides every dollar."
            : `${agents?.length ?? 0} agent${(agents?.length ?? 0) === 1 ? "" : "s"} running. Every dollar enforced on-chain.`}
        </p>
      </div>

      {/* SVG canvas */}
      <div
        className="relative w-full"
        style={{ height: 220 }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 800 220"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Strings from each agent tile to the vault */}
          {agents?.map((agent, i) => {
            const tileSlot = slots[i];
            const status = wireStatus(agent);
            return (
              <Wire
                key={agent.id}
                from={tileSlot}
                to={{ x: 400, y: 180 }}
                status={status}
              />
            );
          })}

          {/* Vault disc */}
          <VaultDisc
            cx={400}
            cy={180}
            usdcBalance={usdcBalance}
            paused={paused === true}
            network={network}
          />
        </svg>

        {/* Tiles overlaid via absolute positioning (HTML for richer
            layout than SVG <foreignObject>). */}
        <div className="absolute inset-0 pointer-events-none">
          {agents?.map((agent, i) => (
            <div
              key={agent.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${(slots[i].x / 800) * 100}%`,
                top: `${(slots[i].y / 220) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <GraphTile agent={agent} onClick={() => onAgentClick(agent.id)} />
            </div>
          ))}

          {/* Add tile — always present; placed in the rightmost
              empty slot if there are agents, or center if empty. */}
          <div
            className="absolute pointer-events-auto"
            style={{
              left: empty
                ? "50%"
                : `${((slots[agents?.length ?? 0]?.x ?? 400) / 800) * 100}%`,
              top: empty
                ? "50%"
                : `${((slots[agents?.length ?? 0]?.y ?? 60) / 220) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <GraphAddTile onClick={onDeployClick} emphasized={empty} />
          </div>
        </div>
      </div>

      {/* Footnote / error */}
      <div className="relative z-10 pb-3 px-4 text-center">
        {error ? (
          <p className="text-[11px] text-red-500/80">canvas · {error}</p>
        ) : (
          <p className="text-[10.5px]" style={{ color: "#9CA3AF" }}>
            Click any tile to manage. Click + to compose a new agent.
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Wire (SVG path) ────────────────────────────────────────── */

interface Pt { x: number; y: number }

type WireStatus = "idle" | "running" | "succeeded" | "failed";

function wireStatus(agent: GraphAgentSummary): WireStatus {
  if (!agent.lastRunStatus) return "idle";
  if (agent.lastRunStatus === "queued" || agent.lastRunStatus === "running") return "running";
  if (agent.lastRunStatus === "succeeded") {
    // Show the successful pulse only if the run completed in the last
    // ~3s (visual flourish; otherwise it's just been settled).
    if (agent.lastRunAt && Date.now() - agent.lastRunAt < 3_000) return "succeeded";
    return "idle";
  }
  return "failed";
}

function Wire({ from, to, status }: { from: Pt; to: Pt; status: WireStatus }) {
  // Quadratic curve from `from` toward `to`, with a soft control
  // point that sweeps the wire visually.
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - 18;
  const d = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  const color =
    status === "running" ? "#F59E0B"
    : status === "succeeded" ? "#22C55E"
    : status === "failed" ? "#EF4444"
    : "rgba(15,23,42,0.10)";
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeDasharray={status === "running" ? "4 4" : status === "succeeded" ? "6 6" : undefined}
      initial={{ opacity: 0.6 }}
      animate={
        status === "running"
          ? { strokeDashoffset: [0, -16], opacity: [0.6, 1, 0.6] }
          : status === "succeeded"
            ? { strokeDashoffset: [0, -24], opacity: [1, 0.7] }
            : { opacity: 0.6 }
      }
      transition={{
        duration: status === "running" ? 1.4 : 1.8,
        repeat: status === "running" ? Infinity : 0,
        ease: "linear",
      }}
    />
  );
}

/* ─── Vault disc ─────────────────────────────────────────────── */

function VaultDisc({
  cx,
  cy,
  usdcBalance,
  paused,
  network,
}: {
  cx: number;
  cy: number;
  usdcBalance: number;
  paused: boolean;
  network: "devnet" | "mainnet";
}) {
  const fill = paused ? "#FEF3C7" : "#ECFDF5";
  const stroke = paused ? "#F59E0B" : "#22C55E";
  return (
    <g>
      <circle cx={cx} cy={cy} r={32} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <text
        x={cx}
        y={cy - 5}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={9}
        fill="#6B7280"
        letterSpacing={1.6}
      >
        VAULT
      </text>
      <text
        x={cx}
        y={cy + 9}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={11}
        fontWeight={600}
        fill="#0A0A0A"
      >
        ${usdcBalance.toFixed(2)}
      </text>
      <text
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={7.5}
        fill="#9CA3AF"
        letterSpacing={1.4}
      >
        {network.toUpperCase()}
      </text>
    </g>
  );
}

/* ─── Layout ─────────────────────────────────────────────────── */

/** Compute N evenly-spaced slots on an arc above the vault. */
function layoutSlots(n: number): Pt[] {
  if (n === 0) return [];
  const cx = 400;
  const cy = 180;
  const r = 130;
  const arcStart = Math.PI - 0.3; // left side of arc, slightly inset
  const arcEnd = 0.3;             // right side
  const slots: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angle = arcStart - (arcStart - arcEnd) * t;
    slots.push({
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    });
  }
  return slots;
}
