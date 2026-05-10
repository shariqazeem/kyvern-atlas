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

const NODE_WIDTH = 220;
const STEP_Y_GAP = 90;
const FIRST_STEP_Y = 40;
const VAULT_Y_GAP = 110;
const CHAIN_Y_GAP = 60;

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
    FIRST_STEP_Y + graph.steps.length * STEP_Y_GAP + CHAIN_Y_GAP + VAULT_Y_GAP,
  );

  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)",
        border: "1px solid rgba(15,23,42,0.08)",
        height: computedHeight,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, minZoom: 0.6, maxZoom: 1.2 }}
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
          color="rgba(15,23,42,0.08)"
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

    // Default sequential edge to the next step
    if (i < graph.steps.length - 1) {
      edges.push({
        id: `e-seq-${step.id}-${graph.steps[i + 1].id}`,
        source: step.id,
        target: graph.steps[i + 1].id,
        type: "default",
        animated: false,
        style: { stroke: "rgba(15,23,42,0.20)", strokeWidth: 1.5 },
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
    position: { x: centerX - 80, y: chainY },
    data: { programId: POLICY_PROGRAM } as ChainNodeData,
    draggable: false,
  });

  nodes.push({
    id: "_vault",
    type: "vault",
    position: { x: centerX - 60, y: vaultY },
    data: { network: "devnet" } as VaultNodeData,
    draggable: false,
  });

  // Edges from each money step → chain → vault
  for (const ms of moneySteps) {
    edges.push({
      id: `e-money-${ms.id}-chain`,
      source: ms.id,
      target: "_chain",
      type: "default",
      animated: !!runState?.get(ms.id),
      style: {
        stroke:
          runState?.get(ms.id) === "succeeded" ? "#22C55E"
          : runState?.get(ms.id) === "failed" ? "#EF4444"
          : "#22C55E",
        strokeWidth: 2,
        strokeDasharray: "6 4",
      },
    });
  }

  // Chain → vault (always present)
  edges.push({
    id: "e-chain-vault",
    source: "_chain",
    target: "_vault",
    type: "default",
    animated: false,
    style: { stroke: "#22C55E", strokeWidth: 2 },
  });

  return { nodes, edges };
}

/* ─── Custom node renderers ──────────────────────────────────── */

function StepNode({ data }: NodeProps) {
  const d = data as StepNodeData;
  const step = d.step;
  const status = d.status;
  const palette = TYPE_PALETTE[step.type];
  return (
    <div
      className="rounded-[10px] flex flex-col gap-0.5"
      style={{
        width: NODE_WIDTH,
        background: status === "running" ? "rgba(245,158,11,0.06)"
          : status === "failed" ? "rgba(239,68,68,0.04)"
          : "#FFFFFF",
        border: `1px solid ${
          status === "running" ? "rgba(245,158,11,0.40)"
          : status === "succeeded" ? "rgba(34,197,94,0.40)"
          : status === "failed" ? "rgba(239,68,68,0.40)"
          : "rgba(15,23,42,0.10)"
        }`,
        padding: "8px 10px",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px -8px rgba(15,23,42,0.10)",
        transition: "all 0.2s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <div className="flex items-center gap-1.5">
        <span
          className="rounded px-1.5 py-0.5 font-mono uppercase tracking-[0.10em]"
          style={{
            fontSize: 8.5,
            background: palette.bg,
            color: palette.fg,
          }}
        >
          {step.type}
        </span>
        {status && (
          <span
            className="font-mono uppercase tracking-[0.10em]"
            style={{
              fontSize: 8.5,
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
      <div
        className="text-[12px] font-semibold tracking-[-0.005em] truncate"
        style={{ color: "#0A0A0A" }}
      >
        {step.label}
      </div>
      {"outputVar" in step && step.outputVar && (
        <div
          className="font-mono"
          style={{ fontSize: 9.5, color: "#9CA3AF" }}
        >
          → {step.outputVar}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
    </div>
  );
}

function ChainNode() {
  return (
    <div
      className="rounded-full flex flex-col items-center justify-center gap-0.5"
      style={{
        width: 160,
        height: 56,
        background: "linear-gradient(180deg, #ECFDF5 0%, #FFFFFF 100%)",
        border: "1px solid rgba(34,197,94,0.40)",
        boxShadow: "0 4px 14px rgba(34,197,94,0.12), inset 0 0 0 4px rgba(34,197,94,0.04)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 9, color: "#15803D" }}
      >
        ⛓ Kyvern policy
      </span>
      <a
        href={`https://explorer.solana.com/address/${POLICY_PROGRAM}?cluster=devnet`}
        target="_blank"
        rel="noreferrer"
        className="font-mono inline-flex items-center gap-0.5 hover:underline"
        style={{ fontSize: 9, color: "#15803D" }}
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

function VaultNode({ data }: NodeProps) {
  const d = data as VaultNodeData;
  return (
    <div
      className="rounded-full flex flex-col items-center justify-center gap-0.5"
      style={{
        width: 120,
        height: 80,
        background: "linear-gradient(180deg, #FFFFFF 0%, #ECFDF5 100%)",
        border: "1px solid rgba(34,197,94,0.40)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 8px 32px -10px rgba(34,197,94,0.30)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "transparent", border: "none", width: 1, height: 1 }}
      />
      <span
        className="font-mono uppercase tracking-[0.16em]"
        style={{ fontSize: 9, color: "#6B7280" }}
      >
        VAULT
      </span>
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
