"use client";

/**
 * GraphFlowView — premium canvas rendering of an agent's graph.
 *
 * Replaces the read-only step list inside the Graph tab. Renders the
 * AgentGraph as a React Flow diagram:
 *
 *   • Steps are nodes in a top-down stack (auto-positioned).
 *   • Edges show data flow: step[N] → step[N+1] (default), plus
 *     explicit edges for any step that interpolates a prior step's
 *     outputVar.
 *   • Money-moving steps (vault.pay, transfer.usdc) route through a
 *     "chain glyph" node before terminating at the vault disc at the
 *     bottom. The chain glyph is the visible representation of the
 *     on-chain Kyvern policy program — every dollar passes through it.
 *   • The vault disc sits at the bottom-center, anchoring the diagram.
 *
 * Read-only for the Graph tab. The composer (P3 of the v1.2 redesign)
 * will reuse this component with drag-drop + an inspector pane.
 */

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ExternalLink } from "lucide-react";
import type { AgentGraph, StepDef, StepType } from "@/lib/agents/graph/types";

const POLICY_PROGRAM = "PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc";

/* ─── Layout constants ───────────────────────────────────────── */

const NODE_WIDTH = 188;
const NODE_HEIGHT = 64;
const STEP_Y_GAP = 76;
const FIRST_STEP_Y = 24;
const VAULT_Y_GAP = 88;
const CHAIN_Y_GAP = 64;
const CHAIN_WIDTH = 168;
const VAULT_WIDTH = 120;

interface Props {
  graph: AgentGraph;
  /** Optional run state — when provided, step nodes light up based on
   *  the run's stepOutputs. Used by the Runs tab for playback. */
  runState?: Map<string, "succeeded" | "failed" | "skipped" | "running">;
  height?: number;
}

interface StepNodeData extends Record<string, unknown> {
  step: StepDef;
  status?: "succeeded" | "failed" | "skipped" | "running";
}

interface VaultNodeData extends Record<string, unknown> {
  network: string;
}

interface ChainNodeData extends Record<string, unknown> {
  programId: string;
}

const nodeTypes = {
  step: StepNode,
  vault: VaultNode,
  chain: ChainNode,
};

export function GraphFlowView({
  graph,
  runState,
  height = 480,
}: Props) {
  const { nodes, edges } = useMemo(
    () => layoutGraph(graph, runState),
    [graph, runState],
  );

  // Compute total height so the canvas auto-sizes to the diagram
  const computedHeight = Math.max(
    height,
    FIRST_STEP_Y + graph.steps.length * STEP_Y_GAP + CHAIN_Y_GAP + VAULT_Y_GAP + 32,
  );

  return (
    <div
      className="relative rounded-[14px] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        border: "1px solid rgba(15,23,42,0.08)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.5)",
        height: computedHeight,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        // Tight padding + clamped zoom — keeps the graph dead-center
        // and prevents ReactFlow's auto-fit from stretching short
        // graphs across the whole canvas (which produced the "lost
        // in space" feel).
        fitViewOptions={{ padding: 0.22, minZoom: 0.85, maxZoom: 1.0 }}
        minZoom={0.6}
        maxZoom={1.2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={true}
        panOnScroll={false}
        panOnDrag={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="rgba(15,23,42,0.06)"
        />
      </ReactFlow>
    </div>
  );
}

/* ─── Layout — turn StepDef[] into Nodes + Edges ─────────────── */

function layoutGraph(
  graph: AgentGraph,
  runState?: Map<string, "succeeded" | "failed" | "skipped" | "running">,
): { nodes: Node[]; edges: Edge[] } {
  const centerX = 0;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Step nodes — top-down stack
  graph.steps.forEach((step, i) => {
    nodes.push({
      id: step.id,
      type: "step",
      position: { x: centerX - NODE_WIDTH / 2, y: FIRST_STEP_Y + i * STEP_Y_GAP },
      data: { step, status: runState?.get(step.id) } as StepNodeData,
      draggable: false,
    });

    // Default sequential edge to the next step. When both adjacent
    // steps succeeded in the selected run, light up green with a
    // 30%-opacity glow — completes the "data flowed through these
    // steps" narrative. Quieter than the chain edge (which gets the
    // loudest treatment because it's the gate).
    if (i < graph.steps.length - 1) {
      const fromStatus = runState?.get(step.id);
      const toStatus = runState?.get(graph.steps[i + 1].id);
      const succeeded =
        fromStatus === "succeeded" && toStatus === "succeeded";
      const failed =
        fromStatus === "failed" || toStatus === "failed";
      edges.push({
        id: `e-seq-${step.id}-${graph.steps[i + 1].id}`,
        source: step.id,
        target: graph.steps[i + 1].id,
        type: "default",
        animated: false,
        style: succeeded
          ? {
              stroke: "rgba(34,197,94,0.65)",
              strokeWidth: 2,
              filter: "drop-shadow(0 0 3px rgba(34,197,94,0.30))",
            }
          : failed
            ? {
                stroke: "rgba(239,68,68,0.55)",
                strokeWidth: 2,
                filter: "drop-shadow(0 0 3px rgba(239,68,68,0.25))",
              }
            : { stroke: "rgba(15,23,42,0.18)", strokeWidth: 2 },
      });
    }
  });

  // Find money-moving steps; they get routed through the chain glyph
  const moneySteps = graph.steps.filter(
    (s) => s.type === "vault.pay" || s.type === "transfer.usdc",
  );

  const lastStepY =
    graph.steps.length > 0
      ? FIRST_STEP_Y + (graph.steps.length - 1) * STEP_Y_GAP
      : FIRST_STEP_Y;
  const chainY = lastStepY + STEP_Y_GAP;
  const vaultY = chainY + VAULT_Y_GAP;

  // Always render the chain glyph + vault — they're the chassis
  nodes.push({
    id: "_chain",
    type: "chain",
    position: { x: centerX - CHAIN_WIDTH / 2, y: chainY },
    data: { programId: POLICY_PROGRAM } as ChainNodeData,
    draggable: false,
  });

  nodes.push({
    id: "_vault",
    type: "vault",
    position: { x: centerX - VAULT_WIDTH / 2, y: vaultY },
    data: { network: "devnet" } as VaultNodeData,
    draggable: false,
  });

  // Edges from each money step → chain → vault
  const anyMoneySucceeded = moneySteps.some(
    (ms) => runState?.get(ms.id) === "succeeded",
  );
  const anyMoneyFailed = moneySteps.some(
    (ms) => runState?.get(ms.id) === "failed",
  );
  for (const ms of moneySteps) {
    const status = runState?.get(ms.id);
    const stroke =
      status === "succeeded" ? "#22C55E"
      : status === "failed" ? "#EF4444"
      : "#22C55E";
    edges.push({
      id: `e-money-${ms.id}-chain`,
      source: ms.id,
      target: "_chain",
      type: "default",
      animated: status === "running",
      style: {
        stroke,
        strokeWidth: 2.4,
        strokeDasharray: "6 4",
        filter: status === "succeeded"
          ? "drop-shadow(0 0 5px rgba(34,197,94,0.50))"
          : status === "failed"
            ? "drop-shadow(0 0 5px rgba(239,68,68,0.45))"
            : undefined,
      },
    });
  }

  // Chain → vault (always present, glows when a money step in the
  // selected run actually settled)
  edges.push({
    id: "e-chain-vault",
    source: "_chain",
    target: "_vault",
    type: "default",
    animated: false,
    style: {
      stroke: anyMoneyFailed && !anyMoneySucceeded ? "#EF4444" : "#22C55E",
      strokeWidth: 2.4,
      filter: anyMoneySucceeded
        ? "drop-shadow(0 0 5px rgba(34,197,94,0.50))"
        : undefined,
    },
  });

  return { nodes, edges };
}

/* ─── Custom node renderers ──────────────────────────────────── */

function StepNode({ data }: NodeProps) {
  const d = data as StepNodeData;
  const step = d.step;
  const status = d.status;
  const palette = TYPE_PALETTE[step.type];
  const borderColor =
    status === "running" ? "rgba(245,158,11,0.55)"
    : status === "succeeded" ? "rgba(34,197,94,0.55)"
    : status === "failed" ? "rgba(239,68,68,0.55)"
    : "rgba(15,23,42,0.12)";
  const hasOutputVar = "outputVar" in step && step.outputVar;
  return (
    <div
      className="rounded-[12px] relative overflow-hidden"
      style={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        background: "#FFFFFF",
        border: `1px solid ${borderColor}`,
        // Tile feel — subtle inner top highlight + soft outer shadow so
        // the node looks like a physical object resting on the canvas
        // rather than a div.
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,0.95)",
          "0 1px 2px rgba(15,23,42,0.05)",
          "0 8px 24px -12px rgba(15,23,42,0.18)",
          status === "succeeded" ? "0 0 0 3px rgba(34,197,94,0.10)" : "",
          status === "failed" ? "0 0 0 3px rgba(239,68,68,0.10)" : "",
        ].filter(Boolean).join(", "),
        transition: "all 0.18s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />

      {/* Left-edge tinted band — gives the tile its color identity
          and visual mass. The tile becomes one solid object with a
          colored side, not a card-with-header. */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: palette.fg,
          opacity: 0.85,
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
        }}
      />

      <div className="flex items-start justify-between gap-2 pl-3.5 pr-2 pt-2">
        {/* Type label — small mono uppercase, sits in the tile's
            tactile mass against the colored band, not as a separate
            badge with its own background. */}
        <span
          className="font-mono uppercase tracking-[0.12em]"
          style={{ fontSize: 8.5, color: palette.fg }}
        >
          {step.type}
        </span>
        {status && (
          <span
            className="font-mono"
            style={{
              fontSize: 9.5,
              color: status === "succeeded" ? "#15803D"
                : status === "failed" ? "#B91C1C"
                : status === "running" ? "#B45309"
                : "#9CA3AF",
            }}
          >
            {status === "succeeded" ? "✓" : status === "failed" ? "✗" : status === "skipped" ? "—" : "…"}
          </span>
        )}
      </div>

      {/* Label — primary content of the tile */}
      <div
        className="text-[12.5px] font-semibold tracking-[-0.005em] truncate pl-3.5 pr-2 pb-2"
        style={{ color: "#0A0A0A" }}
      >
        {step.label}
      </div>

      {/* Output var — small floating tag in the bottom-right corner
          of the tile rather than a full hairline-divided footer.
          Reads as an attribute of the tile, not a section. */}
      {hasOutputVar && (
        <span
          className="font-mono"
          style={{
            position: "absolute",
            right: 6,
            bottom: 6,
            fontSize: 9,
            color: palette.fg,
            background: palette.bg,
            padding: "1.5px 5px",
            borderRadius: 5,
            letterSpacing: "0.02em",
          }}
        >
          → {(step as { outputVar: string }).outputVar}
        </span>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
    </div>
  );
}

/* Chain glyph — visually MORE prominent than the vault. Black body
 * with green stroke + soft green halo says "this is a gate, not a
 * resting destination." The vault below is the destination. */
function ChainNode() {
  return (
    <div
      className="rounded-[14px] flex flex-col items-center justify-center gap-0.5 relative"
      style={{
        width: CHAIN_WIDTH,
        height: 56,
        background: "linear-gradient(180deg, #0A0A0A 0%, #111827 100%)",
        border: "1.5px solid rgba(34,197,94,0.55)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 4px rgba(34,197,94,0.08), 0 8px 24px -10px rgba(34,197,94,0.40)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <span
        className="font-mono uppercase tracking-[0.18em] flex items-center gap-1"
        style={{ fontSize: 9, color: "#34D399" }}
      >
        <span style={{ fontSize: 11, lineHeight: 1 }}>⛓</span> Kyvern policy
      </span>
      <a
        href={`https://explorer.solana.com/address/${POLICY_PROGRAM}?cluster=devnet`}
        target="_blank"
        rel="noreferrer"
        className="font-mono inline-flex items-center gap-0.5 hover:underline"
        style={{ fontSize: 9, color: "rgba(167,243,208,0.85)" }}
        onClick={(e) => e.stopPropagation()}
      >
        PpmZ…MSqc <ExternalLink className="w-2 h-2" />
      </a>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
    </div>
  );
}

/* Vault — quieter rest state but with weight. Neutral capsule with
 * a green status dot. The chain glyph is still the loudest element
 * but the vault now feels grounded, not vestigial — slight border
 * weight bump + soft inner shadow + a subtle outer ring give it
 * physical presence as the destination. */
function VaultNode({ data }: NodeProps) {
  const d = data as VaultNodeData;
  return (
    <div
      className="rounded-[16px] flex flex-col items-center justify-center gap-0.5"
      style={{
        width: VAULT_WIDTH,
        height: 68,
        background: "linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)",
        border: "1.5px solid rgba(15,23,42,0.14)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -2px 4px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.05), 0 12px 28px -14px rgba(15,23,42,0.22)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <div className="flex items-center gap-1.5">
        <span
          className="rounded-full"
          style={{
            width: 6,
            height: 6,
            background: "#22C55E",
            boxShadow: "0 0 0 2px rgba(34,197,94,0.20)",
          }}
        />
        <span
          className="font-mono uppercase tracking-[0.16em]"
          style={{ fontSize: 9.5, color: "#0A0A0A" }}
        >
          VAULT
        </span>
      </div>
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 8, color: "#9CA3AF" }}
      >
        {d.network}
      </span>
    </div>
  );
}

const TYPE_PALETTE: Record<StepType, { bg: string; fg: string }> = {
  llm: { bg: "rgba(168,85,247,0.12)", fg: "#7E22CE" },
  http: { bg: "rgba(59,130,246,0.12)", fg: "#1E3A8A" },
  "vault.pay": { bg: "rgba(34,197,94,0.12)", fg: "#15803D" },
  "transfer.usdc": { bg: "rgba(34,197,94,0.12)", fg: "#15803D" },
  log: { bg: "rgba(15,23,42,0.06)", fg: "#374151" },
  signal: { bg: "rgba(236,72,153,0.12)", fg: "#9D174D" },
  branch: { bg: "rgba(245,158,11,0.12)", fg: "#B45309" },
  loop: { bg: "rgba(245,158,11,0.12)", fg: "#B45309" },
};
