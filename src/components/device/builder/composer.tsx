"use client";

/**
 * Composer — the heart of the builder modal.
 *
 * Top: name + emoji
 * Section: trigger config
 * Section: step list (each step is a card with inline-expand form)
 * Section: budget config
 * Bottom: Test Run + Deploy buttons
 *
 * Reorder is via up/down arrows (skipping a DnD lib for v1; the
 * UX is fine for the sizes we expect, ≤ 20 steps).
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Play, Save, ChevronUp, ChevronDown, Trash2, Edit3 } from "lucide-react";
import { randomUUID } from "@/lib/uuid-shim";
import type {
  AgentGraph,
  StepDef,
  StepType,
  TriggerDef,
} from "@/lib/agents/graph/types";
import { TriggerForm } from "./trigger-form";
import { StepForm } from "./step-forms/index";
import { TestRunPanel, type TestRunResult } from "./test-run-panel";

interface Props {
  initialGraph: AgentGraph;
  initialName: string;
  initialEmoji: string;
  vaultId: string | null;
  ownerWallet: string | null;
  /** Set when editing an existing agent. Null when creating new. */
  editingAgentId: string | null;
  onDeployed: (agentId: string) => void;
}

export function Composer({
  initialGraph,
  initialName,
  initialEmoji,
  vaultId,
  ownerWallet,
  editingAgentId,
  onDeployed,
}: Props) {
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [graph, setGraph] = useState<AgentGraph>(initialGraph);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [testRun, setTestRun] = useState<TestRunResult | null>(null);
  const [busy, setBusy] = useState<"test" | "deploy" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = vaultId && ownerWallet && name.trim() && graph.steps.length > 0;

  function updateTrigger(trigger: TriggerDef) {
    setGraph({ ...graph, trigger });
  }

  function updateStep(idx: number, next: StepDef) {
    const steps = [...graph.steps];
    steps[idx] = next;
    setGraph({ ...graph, steps });
  }

  function deleteStep(idx: number) {
    const steps = graph.steps.filter((_, i) => i !== idx);
    setGraph({ ...graph, steps });
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= graph.steps.length) return;
    const steps = [...graph.steps];
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    setGraph({ ...graph, steps });
  }

  function insertStep(at: number, type: StepType) {
    const newStep = makeStep(type);
    const steps = [...graph.steps];
    steps.splice(at, 0, newStep);
    setGraph({ ...graph, steps });
    setExpandedStepId(newStep.id);
    setShowAddPicker(false);
    setInsertAt(null);
  }

  async function runTest() {
    if (!editingAgentId) {
      // For unsaved drafts, we'd need an ephemeral run path. v1
      // requires the graph to be saved before testing — saves the
      // user a foot-gun and we already have the dispatcher path.
      setError("Save first, then test. Or use Deploy to ship + run.");
      return;
    }
    setBusy("test");
    setError(null);
    try {
      const r = await fetch(`/api/agents/${editingAgentId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ownerWallet ? { "x-owner-wallet": ownerWallet } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      setTestRun({ ok: data.ok, run: data.run, error: data.error });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function deploy() {
    if (!ready) return;
    setBusy("deploy");
    setError(null);
    try {
      let agentId = editingAgentId;
      if (editingAgentId) {
        // Update existing agent's graph
        const r = await fetch(`/api/agents/${editingAgentId}/graph`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-owner-wallet": ownerWallet ?? "",
          },
          body: JSON.stringify({ graph }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error ?? `update failed (${r.status})`);
        }
      } else {
        // Create new graph agent
        const r = await fetch(`/api/agents/spawn-graph`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-owner-wallet": ownerWallet ?? "",
          },
          body: JSON.stringify({
            deviceId: vaultId,
            name: name.trim(),
            emoji,
            graph,
          }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error ?? `spawn failed (${r.status})`);
        }
        const data = await r.json();
        agentId = data.agent.id;
      }
      if (agentId) onDeployed(agentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Identity */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const next = prompt("Pick an emoji", emoji);
            if (next && next.length <= 4) setEmoji(next);
          }}
          className="rounded-[10px] flex items-center justify-center text-[20px] hover:bg-slate-100"
          style={{
            width: 44,
            height: 44,
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.10)",
          }}
          title="Click to change emoji"
        >
          {emoji}
        </button>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name (e.g. Daily summary)"
          maxLength={64}
          className="flex-1 px-3 py-2 rounded-[10px] text-[14px] font-semibold tracking-[-0.005em]"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.10)",
            color: "#0A0A0A",
          }}
        />
      </div>

      {/* Trigger */}
      <Section label="Trigger">
        <TriggerForm trigger={graph.trigger} onChange={updateTrigger} />
      </Section>

      {/* Steps */}
      <Section
        label={`Steps · ${graph.steps.length}`}
        right={
          <button
            type="button"
            onClick={() => {
              setInsertAt(graph.steps.length);
              setShowAddPicker(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11.5px] font-medium hover:bg-slate-100"
            style={{ color: "#0A0A0A" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add step
          </button>
        }
      >
        {graph.steps.length === 0 && (
          <div
            className="rounded-[10px] py-6 text-center"
            style={{
              background: "rgba(15,23,42,0.02)",
              border: "1px dashed rgba(15,23,42,0.15)",
            }}
          >
            <p className="text-[12.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
              No steps yet. Add your first step ↓
            </p>
            <button
              type="button"
              onClick={() => {
                setInsertAt(0);
                setShowAddPicker(true);
              }}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-medium"
              style={{
                background: "rgba(34,197,94,0.10)",
                color: "#15803D",
                border: "1px solid rgba(34,197,94,0.30)",
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Add a step
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {graph.steps.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              expanded={expandedStepId === step.id}
              onToggle={() =>
                setExpandedStepId(expandedStepId === step.id ? null : step.id)
              }
              onMoveUp={idx > 0 ? () => moveStep(idx, -1) : undefined}
              onMoveDown={
                idx < graph.steps.length - 1 ? () => moveStep(idx, 1) : undefined
              }
              onDelete={() => {
                if (confirm(`Delete "${step.label}"?`)) deleteStep(idx);
              }}
              onChange={(next) => updateStep(idx, next)}
              priorSteps={graph.steps.slice(0, idx)}
            />
          ))}
        </div>
      </Section>

      {/* Budget */}
      <Section label="Budget">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Max runs / day"
            value={graph.config.maxRunsPerDay}
            onChange={(v) =>
              setGraph({ ...graph, config: { ...graph.config, maxRunsPerDay: v } })
            }
            min={1}
            max={100_000}
          />
          <NumberField
            label="Max $ / run"
            value={graph.config.maxCostPerRunUsd}
            onChange={(v) =>
              setGraph({
                ...graph,
                config: { ...graph.config, maxCostPerRunUsd: v },
              })
            }
            min={0}
            max={1000}
            step={0.10}
          />
        </div>
      </Section>

      {/* Errors */}
      {error && (
        <div
          className="rounded-[10px] px-3 py-2 text-[12px]"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.30)",
            color: "#B91C1C",
          }}
        >
          {error}
        </div>
      )}

      {/* Test run results */}
      {testRun && <TestRunPanel result={testRun} onClose={() => setTestRun(null)} />}

      {/* Bottom bar */}
      <div className="flex items-center justify-between gap-2 pt-2" style={{ borderTop: "1px solid rgba(15,23,42,0.08)" }}>
        <button
          type="button"
          onClick={runTest}
          disabled={!editingAgentId || busy !== null}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium disabled:opacity-50"
          style={{
            background: "rgba(15,23,42,0.04)",
            border: "1px solid rgba(15,23,42,0.10)",
            color: "#0A0A0A",
          }}
        >
          <Play className="w-3.5 h-3.5" />
          {busy === "test" ? "Running…" : "Test run"}
        </button>
        <button
          type="button"
          onClick={deploy}
          disabled={!ready || busy !== null}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold disabled:opacity-50"
          style={{
            background: "#22C55E",
            color: "#FFFFFF",
            boxShadow: "0 1px 2px rgba(34,197,94,0.30)",
          }}
        >
          <Save className="w-3.5 h-3.5" />
          {busy === "deploy"
            ? "Deploying…"
            : editingAgentId
              ? "Save changes"
              : "Deploy"}
        </button>
      </div>

      {/* Step type picker */}
      {showAddPicker && insertAt !== null && (
        <StepTypePicker
          onPick={(t) => insertStep(insertAt, t)}
          onCancel={() => {
            setShowAddPicker(false);
            setInsertAt(null);
          }}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function Section({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "#9CA3AF" }}
        >
          {label}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="font-mono uppercase tracking-[0.10em]"
        style={{ fontSize: 9, color: "#9CA3AF" }}
      >
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        min={min}
        max={max}
        step={step}
        className="px-2 py-1.5 rounded-[8px] text-[12.5px] font-mono"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.10)",
          color: "#0A0A0A",
        }}
      />
    </label>
  );
}

function StepCard({
  step,
  expanded,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
  onChange,
  priorSteps,
}: {
  step: StepDef;
  expanded: boolean;
  onToggle: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
  onChange: (next: StepDef) => void;
  priorSteps: StepDef[];
}) {
  return (
    <motion.div
      layout
      className="rounded-[10px]"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${expanded ? "rgba(34,197,94,0.30)" : "rgba(15,23,42,0.10)"}`,
      }}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span
          className="rounded px-1.5 py-0.5 font-mono uppercase tracking-[0.10em]"
          style={{
            background: typeColor(step.type).bg,
            color: typeColor(step.type).fg,
            fontSize: 8.5,
          }}
        >
          {step.type}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left text-[12.5px] font-medium tracking-[-0.005em] truncate"
          style={{ color: "#0A0A0A" }}
        >
          {step.label || "(unlabeled)"}
        </button>
        <div className="flex items-center gap-0.5">
          <IconBtn onClick={onMoveUp} disabled={!onMoveUp} title="Move up">
            <ChevronUp className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn onClick={onMoveDown} disabled={!onMoveDown} title="Move down">
            <ChevronDown className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn onClick={onToggle} title={expanded ? "Collapse" : "Edit"}>
            <Edit3 className="w-3.5 h-3.5" />
          </IconBtn>
          <IconBtn onClick={onDelete} title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
        </div>
      </div>
      {expanded && (
        <div className="px-2.5 pb-3 pt-1" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
          <StepForm step={step} onChange={onChange} priorSteps={priorSteps} />
        </div>
      )}
    </motion.div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
      style={{ color: "#6B7280" }}
    >
      {children}
    </button>
  );
}

function typeColor(t: StepType): { bg: string; fg: string } {
  switch (t) {
    case "llm": return { bg: "rgba(168,85,247,0.12)", fg: "#7E22CE" };
    case "http": return { bg: "rgba(59,130,246,0.12)", fg: "#1E3A8A" };
    case "vault.pay": return { bg: "rgba(34,197,94,0.12)", fg: "#15803D" };
    case "transfer.usdc": return { bg: "rgba(34,197,94,0.12)", fg: "#15803D" };
    case "log": return { bg: "rgba(15,23,42,0.06)", fg: "#374151" };
    case "branch": return { bg: "rgba(245,158,11,0.12)", fg: "#B45309" };
    case "loop": return { bg: "rgba(245,158,11,0.12)", fg: "#B45309" };
  }
}

function StepTypePicker({
  onPick,
  onCancel,
}: {
  onPick: (type: StepType) => void;
  onCancel: () => void;
}) {
  const types: Array<{ type: StepType; emoji: string; label: string; desc: string }> = [
    { type: "llm", emoji: "🧠", label: "LLM", desc: "Anthropic / OpenAI / DeepSeek / Commonstack" },
    { type: "http", emoji: "🌐", label: "HTTP", desc: "GET/POST any URL (with optional pay.sh wrap)" },
    { type: "vault.pay", emoji: "💸", label: "vault.pay", desc: "Chain-enforced merchant payment" },
    { type: "transfer.usdc", emoji: "🪙", label: "transfer.usdc", desc: "Direct USDC transfer (allowlist)" },
    { type: "log", emoji: "📝", label: "log", desc: "Write to your event feed" },
    { type: "branch", emoji: "🌿", label: "branch", desc: "If / else on a condition" },
    { type: "loop", emoji: "🔁", label: "loop", desc: "Iterate over an array" },
  ];
  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(15,23,42,0.40)" }}
        onClick={onCancel}
      />
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-[480px] rounded-[14px] p-3 pointer-events-auto"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: "0 24px 60px -16px rgba(15,23,42,0.30)",
          }}
        >
          <p
            className="px-1 py-1 text-[11px] font-mono uppercase tracking-[0.14em]"
            style={{ color: "#9CA3AF" }}
          >
            Pick a step type
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
            {types.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => onPick(t.type)}
                className="flex items-start gap-2 p-2 rounded-[8px] hover:bg-slate-50 text-left"
              >
                <span className="text-[16px] leading-none mt-0.5">{t.emoji}</span>
                <div>
                  <div className="text-[12.5px] font-semibold" style={{ color: "#0A0A0A" }}>
                    {t.label}
                  </div>
                  <div className="text-[11px]" style={{ color: "rgba(15,23,42,0.55)" }}>
                    {t.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Step factory ───────────────────────────────────────────── */

function makeStep(type: StepType): StepDef {
  const id = randomUUID();
  switch (type) {
    case "llm":
      return {
        id,
        type: "llm",
        label: "LLM step",
        outputVar: "output",
        config: {
          provider: "anthropic",
          model: "claude-haiku-4-5",
          system: "You are a helpful assistant.",
          prompt: "",
          maxTokens: 500,
          temperature: 0.7,
        },
      };
    case "http":
      return {
        id,
        type: "http",
        label: "HTTP request",
        outputVar: "response",
        config: {
          method: "GET",
          url: "https://",
          headers: {},
          body: null,
          payShWrap: false,
          timeoutMs: 60_000,
        },
      };
    case "vault.pay":
      return {
        id,
        type: "vault.pay",
        label: "Vault pay",
        outputVar: "payment",
        config: { merchant: "", to: "", amount: 0.01, memo: "" },
      };
    case "transfer.usdc":
      return {
        id,
        type: "transfer.usdc",
        label: "Transfer USDC",
        outputVar: "transfer",
        config: { to: "", amount: 0.01, memo: "" },
      };
    case "log":
      return {
        id,
        type: "log",
        label: "Log",
        config: { message: "", level: "info" },
      };
    case "branch":
      return {
        id,
        type: "branch",
        label: "Branch",
        config: { condition: "true", then: [], else: [] },
      };
    case "loop":
      return {
        id,
        type: "loop",
        label: "Loop",
        config: { items: "", itemVar: "item", body: [], maxIterations: 10 },
      };
  }
}
