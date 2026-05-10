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

import { useEffect, useMemo, useState } from "react";
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
import { StepIcon } from "./step-icon";
import { lintGraph, type VaultSnapshot } from "@/lib/agents/graph/lint";
import { AlertTriangle, Info } from "lucide-react";

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
  const [vaultSnap, setVaultSnap] = useState<VaultSnapshot | null>(null);

  // Pull the vault snapshot + provider keys once for the linter so
  // warnings show inline as the user composes.
  useEffect(() => {
    if (!vaultId || !ownerWallet) return;
    let cancelled = false;
    (async () => {
      try {
        const [vRes, kRes] = await Promise.all([
          fetch(`/api/vault/${vaultId}`, {
            headers: { "x-owner-wallet": ownerWallet },
          }),
          fetch(`/api/keys/providers`, {
            headers: { "x-owner-wallet": ownerWallet },
          }),
        ]);
        const vData = vRes.ok ? await vRes.json() : null;
        const kData = kRes.ok ? await kRes.json() : null;
        if (cancelled) return;
        const vault = vData?.vault;
        const providers = new Set<VaultSnapshot["configuredProviders"] extends Set<infer T> ? T : never>();
        for (const k of (kData?.keys ?? []) as Array<{ provider: string }>) {
          providers.add(k.provider as never);
        }
        setVaultSnap({
          perTxMaxUsd: vault?.perTxMaxUsd ?? 0.5,
          dailyLimitUsd: vault?.dailyLimitUsd ?? 5,
          weeklyLimitUsd: vault?.weeklyLimitUsd ?? 25,
          allowedMerchants: vault?.allowedMerchants ?? [],
          paused: !!vault?.pausedAt,
          configuredProviders: providers,
        });
      } catch {
        /* swallow */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vaultId, ownerWallet]);

  const lintResult = useMemo(
    () => lintGraph(graph, vaultSnap ?? undefined),
    [graph, vaultSnap],
  );

  const ready =
    vaultId &&
    ownerWallet &&
    name.trim() &&
    graph.steps.length > 0 &&
    !lintResult.hasErrors;

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
    if (!ownerWallet) {
      setError("Auth not yet hydrated — wait a second and retry.");
      return;
    }
    if (!vaultId) {
      setError("No vault attached to this session — refresh and try again.");
      return;
    }
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

      {/* Pre-deploy lint — surfaces placeholder strings, invalid
          pubkeys, per-tx max overflows, missing provider keys. The
          Deploy button is gated on no errors. */}
      {lintResult.issues.length > 0 && (
        <div
          className="rounded-[12px] flex flex-col gap-2 p-3"
          style={{
            background: lintResult.hasErrors
              ? "rgba(239,68,68,0.05)"
              : "rgba(245,158,11,0.06)",
            border: `1px solid ${lintResult.hasErrors ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
          }}
        >
          <div className="flex items-center gap-2">
            {lintResult.hasErrors ? (
              <AlertTriangle className="w-4 h-4" style={{ color: "#B91C1C" }} />
            ) : (
              <Info className="w-4 h-4" style={{ color: "#B45309" }} />
            )}
            <span
              className="text-[12.5px] font-semibold"
              style={{ color: lintResult.hasErrors ? "#B91C1C" : "#B45309" }}
            >
              {lintResult.hasErrors
                ? `${lintResult.issues.filter((i) => i.severity === "error").length} issue${lintResult.issues.filter((i) => i.severity === "error").length === 1 ? "" : "s"} to fix before deploying`
                : `${lintResult.issues.length} thing${lintResult.issues.length === 1 ? "" : "s"} to know`}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 pl-6">
            {lintResult.issues.map((issue, i) => (
              <div key={i} className="text-[12px] leading-snug">
                <span
                  className="font-mono uppercase tracking-[0.10em] mr-1.5"
                  style={{
                    fontSize: 9,
                    color: issue.severity === "error" ? "#B91C1C" : "#B45309",
                  }}
                >
                  {issue.severity === "error" ? "fix" : "fyi"}
                </span>
                <span style={{ color: "#0A0A0A" }}>
                  {issue.stepLabel} · {issue.message}
                </span>
                {issue.fix && (
                  <span style={{ color: "rgba(15,23,42,0.55)", display: "block", marginTop: 2 }}>
                    {issue.fix}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar — paired CTAs, right-aligned */}
      <div
        className="flex items-center justify-end gap-2 pt-3"
        style={{ borderTop: "1px solid rgba(15,23,42,0.08)" }}
      >
        <button
          type="button"
          onClick={runTest}
          disabled={!editingAgentId || busy !== null}
          title={
            !editingAgentId
              ? "Deploy first — Test run executes a saved agent."
              : "Run this agent once with the saved graph"
          }
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium disabled:opacity-50"
          style={{
            background: "rgba(15,23,42,0.04)",
            border: "1px solid rgba(15,23,42,0.10)",
            color: "rgba(15,23,42,0.75)",
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
            boxShadow: "0 1px 2px rgba(34,197,94,0.30), 0 8px 20px -8px rgba(34,197,94,0.40)",
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
      <div className="flex items-center gap-2.5 pl-2 pr-1.5 py-1.5 group">
        <StepIcon type={step.type} size={28} />
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 text-left min-w-0"
        >
          <div
            className="text-[12.5px] font-semibold tracking-[-0.005em] truncate"
            style={{ color: "#0A0A0A" }}
          >
            {step.label || "(unlabeled)"}
          </div>
          <div
            className="font-mono uppercase tracking-[0.10em]"
            style={{ fontSize: 9, color: "rgba(15,23,42,0.45)" }}
          >
            {step.type}
            {"outputVar" in step && step.outputVar && (
              <span style={{ color: "rgba(15,23,42,0.40)" }}>
                {" · → "}
                {step.outputVar}
              </span>
            )}
          </div>
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

function StepTypePicker({
  onPick,
  onCancel,
}: {
  onPick: (type: StepType) => void;
  onCancel: () => void;
}) {
  // Grouped by role so users can scan by intent (money / logic /
  // output) instead of scanning all eight options. Same grouping as
  // the StepIcon palette colors.
  const groups: Array<{
    label: string;
    types: Array<{ type: StepType; label: string; desc: string }>;
  }> = [
    {
      label: "Money",
      types: [
        { type: "vault.pay", label: "vault.pay", desc: "Chain-enforced merchant payment" },
        { type: "transfer.usdc", label: "transfer.usdc", desc: "Direct USDC transfer (allowlist)" },
      ],
    },
    {
      label: "Logic",
      types: [
        { type: "llm", label: "LLM", desc: "Anthropic / OpenAI / DeepSeek / Commonstack" },
        { type: "http", label: "HTTP", desc: "GET/POST any URL (with pay.sh wrap)" },
        { type: "branch", label: "Branch", desc: "If / else on a condition" },
        { type: "loop", label: "Loop", desc: "Iterate over an array" },
      ],
    },
    {
      label: "Output",
      types: [
        { type: "log", label: "Log", desc: "Write to your event feed" },
        { type: "signal", label: "Signal", desc: "Emit a finding to your inbox" },
      ],
    },
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
          className="w-full max-w-[520px] rounded-[14px] p-3 pointer-events-auto"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: "0 24px 60px -16px rgba(15,23,42,0.30)",
          }}
        >
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <p
                  className="px-1 text-[11px] font-mono uppercase tracking-[0.14em]"
                  style={{ color: "#9CA3AF" }}
                >
                  {group.label}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {group.types.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => onPick(t.type)}
                      className="flex items-center gap-2.5 p-2 rounded-[8px] hover:bg-slate-50 text-left"
                    >
                      <StepIcon type={t.type} size={28} />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold truncate" style={{ color: "#0A0A0A" }}>
                          {t.label}
                        </div>
                        <div className="text-[10.5px] truncate" style={{ color: "rgba(15,23,42,0.55)" }}>
                          {t.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
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
    case "signal":
      return {
        id,
        type: "signal",
        label: "Emit finding",
        config: {
          kind: "alert",
          subject: "",
          evidence: "",
          suggestion: "",
          sourceUrl: "",
        },
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
