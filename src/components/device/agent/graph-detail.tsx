"use client";

/**
 * GraphAgentDetail — full detail page for a graph-based agent.
 *
 * Replaces the legacy AgentPageShell for agents with graph_json set.
 * Three tabs:
 *   Runs    — paged history of agent_runs, with per-step Explorer links
 *   Graph   — read-only graph viewer, Edit button reopens the composer
 *   Settings — pause / resume / delete + budget caps
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Edit3, Play, RefreshCw, Pause, Trash2, ExternalLink } from "lucide-react";
import { BuilderModal } from "../builder/modal";
import { GraphFlowView } from "./graph-flow-view";
import type { AgentGraph, AgentRun, StepOutput } from "@/lib/agents/graph/types";

interface Props {
  agentId: string;
}

interface AgentMeta {
  id: string;
  name: string;
  emoji: string;
  status: "alive" | "paused" | "retired";
  deviceId: string;
}

export function GraphAgentDetail({ agentId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"runs" | "graph" | "settings">("runs");
  const [meta, setMeta] = useState<AgentMeta | null>(null);
  const [graph, setGraph] = useState<AgentGraph | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOpen, setEditingOpen] = useState(false);
  const [busy, setBusy] = useState<"run" | "pause" | "resume" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownerWallet, setOwnerWallet] = useState<string | null>(null);

  // Pull owner wallet from privy session via the agent's vault.
  // Server endpoints already require x-owner-wallet — without it
  // the page errors out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/agents/${agentId}`);
        if (!r.ok) {
          setError(`agent fetch failed: ${r.status}`);
          setLoading(false);
          return;
        }
        const data = await r.json();
        if (cancelled) return;
        const a = data.agent;
        setMeta({
          id: a.id,
          name: a.name,
          emoji: a.emoji,
          status: a.status,
          deviceId: a.deviceId,
        });
        // Get the vault's owner_wallet via the device endpoint
        const v = await fetch(`/api/vault/${a.deviceId}`);
        if (v.ok) {
          const vd = await v.json();
          if (!cancelled) setOwnerWallet(vd?.vault?.ownerWallet ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  // Fetch graph + runs once we have ownerWallet
  const refresh = useCallback(async () => {
    if (!ownerWallet) return;
    try {
      const [gr, rr] = await Promise.all([
        fetch(`/api/agents/${agentId}/graph`, {
          headers: { "x-owner-wallet": ownerWallet },
        }).then((r) => r.json()),
        fetch(`/api/agents/${agentId}/runs?limit=20`, {
          headers: { "x-owner-wallet": ownerWallet },
        }).then((r) => r.json()),
      ]);
      if (gr.ok && gr.graph) setGraph(gr.graph);
      if (rr.ok) setRuns(rr.runs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [agentId, ownerWallet]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-refresh runs every 6s while page is open
  useEffect(() => {
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  async function runNow() {
    if (!ownerWallet) return;
    setBusy("run");
    setError(null);
    try {
      const r = await fetch(`/api/agents/${agentId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error ?? "run failed");
      void refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(next: "alive" | "paused" | "retired") {
    if (!meta) return;
    const action = next === "alive" ? "resume" : next === "paused" ? "pause" : "delete";
    setBusy(action);
    setError(null);
    try {
      const r = await fetch(`/api/agents/${agentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? `status update failed (${r.status})`);
      }
      if (next === "retired") {
        router.push("/app");
        return;
      }
      setMeta({ ...meta, status: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-[12.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
        Loading…
      </div>
    );
  }
  if (!meta) {
    return (
      <div className="p-8 text-center text-[12.5px]" style={{ color: "#B91C1C" }}>
        {error ?? "Agent not found"}
      </div>
    );
  }

  return (
    <div className="max-w-[920px] mx-auto px-4 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/app")}
          className="p-1.5 rounded hover:bg-slate-100"
          style={{ color: "#6B7280" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[24px] leading-none">{meta.emoji}</span>
        <div className="flex-1">
          <h1
            className="text-[18px] font-semibold tracking-[-0.01em]"
            style={{ color: "#0A0A0A" }}
          >
            {meta.name}
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <StatusPill status={meta.status} />
            {graph && <TriggerSummaryPill trigger={graph.trigger} />}
            <a
              href="https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet"
              target="_blank"
              rel="noreferrer"
              title="Every money-moving step routes through this on-chain Kyvern policy program."
              className="font-mono uppercase tracking-[0.10em] rounded px-1.5 py-0.5 inline-flex items-center gap-1 hover:underline"
              style={{
                fontSize: 9,
                color: "#15803D",
                background: "rgba(34,197,94,0.10)",
              }}
            >
              ⛓ Policy · PpmZ…MSqc
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={busy !== null || meta.status !== "alive"}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium disabled:opacity-50"
          style={{
            background: "#22C55E",
            color: "#FFFFFF",
            boxShadow: "0 1px 2px rgba(34,197,94,0.30)",
          }}
        >
          <Play className="w-3.5 h-3.5" />
          {busy === "run" ? "Running…" : "Run now"}
        </button>
      </div>

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

      {/* Tabs — premium segmented pill */}
      <div className="flex items-center gap-2">
        <div
          className="inline-flex p-0.5 rounded-[10px]"
          style={{
            background: "rgba(15,23,42,0.04)",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          {(["runs", "graph", "settings"] as const).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="relative px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold tracking-[-0.005em] transition"
                style={{
                  background: active ? "#FFFFFF" : "transparent",
                  color: active ? "#0A0A0A" : "rgba(15,23,42,0.55)",
                  boxShadow: active
                    ? "0 1px 2px rgba(15,23,42,0.05), 0 4px 12px -8px rgba(15,23,42,0.10)"
                    : undefined,
                }}
              >
                <span className="capitalize">{t}</span>
                {t === "runs" && runs.length > 0 && (
                  <span
                    className="ml-1.5 font-mono"
                    style={{ fontSize: 10, color: active ? "#9CA3AF" : "rgba(15,23,42,0.35)" }}
                  >
                    {runs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="ml-auto p-1.5 rounded hover:bg-slate-100"
          style={{ color: "#6B7280" }}
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab body */}
      {tab === "runs" && <RunsTab runs={runs} graph={graph} />}
      {tab === "graph" && (
        <GraphTab
          graph={graph}
          onEdit={() => setEditingOpen(true)}
        />
      )}
      {tab === "settings" && (
        <SettingsTab
          meta={meta}
          graph={graph}
          busy={busy}
          onPause={() => setStatus("paused")}
          onResume={() => setStatus("alive")}
          onDelete={() => {
            if (confirm(`Delete ${meta.name}? This is permanent.`)) {
              void setStatus("retired");
            }
          }}
        />
      )}

      {/* Builder modal — edit existing agent */}
      {graph && (
        <BuilderModal
          open={editingOpen}
          vaultId={meta.deviceId}
          ownerWallet={ownerWallet}
          editingAgent={{
            id: meta.id,
            name: meta.name,
            emoji: meta.emoji,
            graph,
          }}
          onClose={() => setEditingOpen(false)}
          onDeployed={() => {
            setEditingOpen(false);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

/* ─── Tabs ───────────────────────────────────────────────────── */

function RunsTab({ runs, graph }: { runs: AgentRun[]; graph: AgentGraph | null }) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    runs[0]?.id ?? null,
  );
  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;

  // Build a step-id → status map for the canvas to color the nodes
  const runState = useMemo(() => {
    const m = new Map<string, "succeeded" | "failed" | "skipped" | "running">();
    if (selectedRun) {
      for (const out of selectedRun.stepOutputs) {
        m.set(out.stepId, out.status);
      }
    }
    return m;
  }, [selectedRun]);

  if (runs.length === 0) {
    return (
      <div
        className="rounded-[12px] p-6 text-center text-[12.5px]"
        style={{
          background: "rgba(15,23,42,0.02)",
          border: "1px dashed rgba(15,23,42,0.15)",
          color: "rgba(15,23,42,0.55)",
        }}
      >
        No runs yet. Click {`"Run now"`} above, or wait for the trigger to fire.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {/* Canvas with the selected run's state highlighted */}
      {graph && (
        <GraphFlowView graph={graph} runState={runState} height={360} />
      )}

      {/* Run picker timeline */}
      <div
        className="rounded-[12px] p-2 flex items-center gap-2 overflow-x-auto"
        style={{
          background: "rgba(15,23,42,0.02)",
          border: "1px solid rgba(15,23,42,0.06)",
        }}
      >
        <span
          className="font-mono uppercase tracking-[0.14em] px-2 shrink-0"
          style={{ fontSize: 9, color: "#9CA3AF" }}
        >
          Runs · {runs.length}
        </span>
        {runs.map((r) => {
          const active = r.id === selectedRunId;
          const dotColor =
            r.status === "succeeded" ? "#22C55E"
            : r.status === "failed" ? "#EF4444"
            : r.status === "running" ? "#F59E0B"
            : "#9CA3AF";
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRunId(r.id)}
              className="rounded-[8px] px-2 py-1 text-left flex items-center gap-1.5 shrink-0 transition"
              style={{
                background: active ? "#FFFFFF" : "transparent",
                border: `1px solid ${active ? "rgba(15,23,42,0.12)" : "transparent"}`,
                boxShadow: active
                  ? "0 1px 2px rgba(15,23,42,0.05), 0 0 0 3px rgba(34,197,94,0.10)"
                  : undefined,
              }}
            >
              <span
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: dotColor,
                  boxShadow: active ? `0 0 0 2px ${dotColor}30` : undefined,
                }}
              />
              <span
                className="font-mono text-[10.5px]"
                style={{
                  color: active ? "#0A0A0A" : "rgba(15,23,42,0.55)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {new Date(r.startedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected run's step output cards */}
      {selectedRun && (
        <div className="flex flex-col gap-2">
          <RunRow run={selectedRun} initiallyOpen />
        </div>
      )}
    </div>
  );
}

function RunRow({ run, initiallyOpen = false }: { run: AgentRun; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const summary = useMemo(() => {
    const ok = run.stepOutputs.filter((s) => s.status === "succeeded").length;
    const failed = run.stepOutputs.filter((s) => s.status === "failed").length;
    const skipped = run.stepOutputs.filter((s) => s.status === "skipped").length;
    return { ok, failed, skipped };
  }, [run]);
  const wallMs = run.finishedAt && run.startedAt ? run.finishedAt - run.startedAt : null;

  return (
    <motion.div
      layout
      className="rounded-[12px]"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.08)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <RunStatusDot status={run.status} />
        <span className="text-[12.5px] font-medium" style={{ color: "#0A0A0A" }}>
          {run.status}
        </span>
        <span className="font-mono" style={{ fontSize: 10.5, color: "#9CA3AF" }}>
          {new Date(run.startedAt).toLocaleString()}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[10.5px] font-mono" style={{ color: "#15803D" }}>
            ✓{summary.ok}
          </span>
          {summary.failed > 0 && (
            <span className="text-[10.5px] font-mono" style={{ color: "#B91C1C" }}>
              ✗{summary.failed}
            </span>
          )}
          {summary.skipped > 0 && (
            <span className="text-[10.5px] font-mono" style={{ color: "#9CA3AF" }}>
              —{summary.skipped}
            </span>
          )}
          {wallMs !== null && (
            <span className="text-[10.5px] font-mono" style={{ color: "#9CA3AF" }}>
              {wallMs}ms
            </span>
          )}
          <span className="text-[10.5px] font-mono" style={{ color: "#9CA3AF" }}>
            ${run.totalCostUsd.toFixed(4)}
          </span>
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
          {run.stepOutputs.map((s, i) => (
            <StepOutputCard key={`${s.stepId}-${i}`} output={s} />
          ))}
          {run.errorMessage && (
            <p className="text-[11px] font-mono mt-1" style={{ color: "#B91C1C" }}>
              {run.errorMessage}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

function StepOutputCard({ output }: { output: StepOutput }) {
  const explorerUrl = output.signature
    ? `https://explorer.solana.com/tx/${output.signature}?cluster=devnet`
    : null;
  const previewText = previewOutputForType(output);
  return (
    <div
      className="rounded-[8px] p-2"
      style={{ background: "rgba(15,23,42,0.02)" }}
    >
      <div className="flex items-center gap-2">
        <span
          style={{
            color:
              output.status === "succeeded" ? "#15803D"
              : output.status === "failed" ? "#B91C1C"
              : "#9CA3AF",
          }}
        >
          {output.status === "succeeded" ? "✓" : output.status === "failed" ? "✗" : "—"}
        </span>
        <span
          className="font-mono uppercase tracking-[0.10em]"
          style={{ fontSize: 8.5, color: "#9CA3AF" }}
        >
          {output.type}
        </span>
        <span className="text-[11.5px] font-medium" style={{ color: "#0A0A0A" }}>
          {output.label}
        </span>
        {(output.type === "vault.pay" || output.type === "transfer.usdc") && (
          <span
            className="font-mono uppercase tracking-[0.10em] rounded px-1 py-0.5"
            style={{
              fontSize: 8,
              color: output.signatureStatus === "failed" ? "#B91C1C" : "#15803D",
              background: output.signatureStatus === "failed"
                ? "rgba(239,68,68,0.10)"
                : "rgba(34,197,94,0.10)",
            }}
            title="Routed through Kyvern policy program PpmZ…MSqc"
          >
            {output.signatureStatus === "failed" ? "chain refused" : "chain settled"}
          </span>
        )}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-[10.5px] font-mono inline-flex items-center gap-0.5 hover:underline"
            style={{ color: "#0A0A0A" }}
          >
            Explorer <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
      {previewText && <PreviewBlock text={previewText} />}
      {output.error && (
        <p className="text-[10.5px] font-mono mt-1" style={{ color: "#B91C1C" }}>
          {output.error}
        </p>
      )}
    </div>
  );
}

/** Inspectable preview block — capped width, mono, soft border + tint.
 *  Truncates after ~6 lines with a "show full" toggle. Replaces the
 *  raw paragraph that ran the full page width. */
function PreviewBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lineCount = text.split("\n").length;
  const charCount = text.length;
  const overflowing = lineCount > 6 || charCount > 480;
  return (
    <div className="mt-2" style={{ maxWidth: 720 }}>
      <pre
        className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap rounded-[8px] px-2.5 py-2 overflow-hidden"
        style={{
          color: "rgba(15,23,42,0.78)",
          background: "rgba(15,23,42,0.03)",
          border: "1px solid rgba(15,23,42,0.07)",
          maxHeight: expanded ? "none" : 110,
        }}
      >
        {text}
      </pre>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-[10.5px] font-mono uppercase tracking-[0.10em] hover:underline"
          style={{ color: "#6B7280" }}
        >
          {expanded ? "show less" : "show full"}
        </button>
      )}
    </div>
  );
}

/** Pull the most user-friendly preview from a step's output. LLM
 *  steps surface .text inline; signal steps show subject + first
 *  bullet; http steps show status + truncated body summary. */
function previewOutputForType(output: StepOutput): string | null {
  if (output.status !== "succeeded") return null;
  const v = output.output as Record<string, unknown> | null;
  if (!v) return null;
  if (output.type === "llm" && typeof v.text === "string") {
    const txt = v.text.slice(0, 600);
    return txt.length < (v.text as string).length ? txt + "…" : txt;
  }
  if (output.type === "signal") {
    const subject = typeof v.subject === "string" ? v.subject : "";
    const kind = typeof v.kind === "string" ? `[${v.kind}] ` : "";
    return subject ? `📬 ${kind}${subject}` : null;
  }
  if (output.type === "http") {
    const status = typeof v.status === "number" ? v.status : "?";
    const body = v.body;
    if (typeof body === "string") {
      return `HTTP ${status} · ${body.slice(0, 240)}${body.length > 240 ? "…" : ""}`;
    }
    return `HTTP ${status} · (body returned)`;
  }
  if (output.type === "vault.pay" || output.type === "transfer.usdc") {
    if (v.signature) return `→ ${v.merchant ?? v.to} · $${(v as { amountUsd?: number }).amountUsd ?? "?"}`;
    return null;
  }
  if (output.type === "log" && typeof v.message === "string") {
    return v.message;
  }
  return null;
}

function GraphTab({ graph, onEdit }: { graph: AgentGraph | null; onEdit: () => void }) {
  if (!graph) {
    return (
      <p className="text-[12.5px] p-4" style={{ color: "rgba(15,23,42,0.55)" }}>
        Loading graph…
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {/* Canvas with chrome — trigger + Edit overlaid in the corners
          so editing reads as a property of the canvas, not a separate
          section. */}
      <div className="relative">
        <GraphFlowView graph={graph} />
        <div
          className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 pointer-events-auto"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(15,23,42,0.10)",
            fontSize: 10,
          }}
        >
          <span
            className="font-mono uppercase tracking-[0.12em]"
            style={{ color: "#9CA3AF" }}
          >
            Trigger
          </span>
          <span
            className="font-mono"
            style={{ color: "#0A0A0A" }}
          >
            {triggerInline(graph.trigger)}
          </span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 hover:bg-slate-50 transition pointer-events-auto"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(15,23,42,0.10)",
            fontSize: 11,
          }}
        >
          <Edit3 className="w-3 h-3" /> Edit
        </button>
      </div>

      {/* SDK equivalent — the strongest affordance, sits right below
          the canvas so the user sees graph → code as one narrative. */}
      <SdkPreview graph={graph} />
    </div>
  );
}

function triggerInline(trigger: AgentGraph["trigger"]): string {
  switch (trigger.kind) {
    case "manual":
      return "Manual";
    case "interval":
      return `Every ${formatMsShort(trigger.ms)}`;
    case "cron":
      return `Cron · ${trigger.expr}`;
    case "webhook":
      return "Webhook";
  }
}

function formatMsShort(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function SettingsTab({
  meta,
  graph,
  busy,
  onPause,
  onResume,
  onDelete,
}: {
  meta: AgentMeta;
  graph: AgentGraph | null;
  busy: "run" | "pause" | "resume" | "delete" | null;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 max-w-[640px]">
      <div className="flex items-center justify-between">
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "#9CA3AF" }}
        >
          Status
        </span>
        <div className="flex items-center gap-2">
          {meta.status === "alive" ? (
            <button
              type="button"
              onClick={onPause}
              disabled={busy !== null}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium disabled:opacity-50"
              style={{
                background: "rgba(245,158,11,0.10)",
                border: "1px solid rgba(245,158,11,0.30)",
                color: "#B45309",
              }}
            >
              <Pause className="w-3.5 h-3.5" />
              {busy === "pause" ? "Pausing…" : "Pause agent"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onResume}
              disabled={busy !== null}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium disabled:opacity-50"
              style={{
                background: "rgba(34,197,94,0.10)",
                border: "1px solid rgba(34,197,94,0.30)",
                color: "#15803D",
              }}
            >
              <Play className="w-3.5 h-3.5" />
              {busy === "resume" ? "Resuming…" : "Resume agent"}
            </button>
          )}
        </div>
      </div>

      {graph && (
        <div className="flex items-center justify-between">
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "#9CA3AF" }}
          >
            Budget
          </span>
          <span className="text-[12px] font-mono" style={{ color: "rgba(15,23,42,0.75)" }}>
            <span style={{ color: "#0A0A0A" }}>{graph.config.maxRunsPerDay}</span>
            {" runs/day · "}
            <span style={{ color: "#0A0A0A" }}>${graph.config.maxCostPerRunUsd.toFixed(2)}</span>
            {" max/run"}
          </span>
        </div>
      )}

      <div
        className="rounded-[10px] p-2.5 flex items-center justify-between gap-3 mt-2"
        style={{
          background: "rgba(239,68,68,0.04)",
          border: "1px solid rgba(239,68,68,0.18)",
        }}
      >
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "#B91C1C" }}
        >
          Danger zone
        </span>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium disabled:opacity-50"
          style={{
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.30)",
            color: "#B91C1C",
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {busy === "delete" ? "Deleting…" : "Delete agent"}
        </button>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function StatusPill({ status }: { status: "alive" | "paused" | "retired" }) {
  const map = {
    alive: { color: "#15803D", bg: "rgba(34,197,94,0.10)", label: "alive" },
    paused: { color: "#B45309", bg: "rgba(245,158,11,0.10)", label: "paused" },
    retired: { color: "#9CA3AF", bg: "rgba(15,23,42,0.04)", label: "retired" },
  } as const;
  const s = map[status];
  return (
    <span
      className="font-mono uppercase tracking-[0.12em] rounded px-1.5 py-0.5"
      style={{ fontSize: 9, color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function TriggerSummaryPill({ trigger }: { trigger: AgentGraph["trigger"] }) {
  const label =
    trigger.kind === "manual" ? "manual"
    : trigger.kind === "interval" ? `every ${formatMs(trigger.ms)}`
    : trigger.kind === "cron" ? `cron · ${trigger.expr}`
    : "webhook";
  return (
    <span
      className="font-mono uppercase tracking-[0.10em] rounded px-1.5 py-0.5"
      style={{
        fontSize: 9,
        color: "#374151",
        background: "rgba(15,23,42,0.04)",
      }}
    >
      {label}
    </span>
  );
}

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

/** SdkPreview — shows the user what their composed agent would look
 *  like as raw @kyvernlabs/sdk code. Strips the policy plumbing
 *  (vault.pay always routes through the on-chain program) and shows
 *  the moral equivalent of the graph as a script. Demystifies the
 *  composer: it's not a black box, it's a UI on top of the same
 *  primitives the SDK exposes. */
function SdkPreview({ graph }: { graph: AgentGraph }) {
  const code = graphToSdkPseudocode(graph);
  return (
    <details
      className="rounded-[12px] group"
      style={{
        background: "#0A0A0A",
        border: "1px solid rgba(15,23,42,0.10)",
      }}
    >
      <summary
        className="cursor-pointer px-3 py-2 flex items-center justify-between text-[11px]"
        style={{ color: "#A7F3D0" }}
      >
        <span className="font-mono uppercase tracking-[0.14em]">
          ⛓ How this works · same primitives as @kyvernlabs/sdk
        </span>
        <span style={{ color: "#6B7280", fontSize: 10 }}>tap to expand</span>
      </summary>
      <pre
        className="px-3 pb-3 pt-1 text-[11px] font-mono leading-relaxed overflow-x-auto"
        style={{ color: "#F3F4F6" }}
      >
        {code}
      </pre>
    </details>
  );
}

function graphToSdkPseudocode(graph: AgentGraph): string {
  const lines: string[] = [
    `// Equivalent SDK code — every vault.pay routes through the`,
    `// on-chain Kyvern policy program (PpmZ…MSqc). Refusals come`,
    `// back as real failed Solana txs you can verify on Explorer.`,
    ``,
    `import { Vault } from "@kyvernlabs/sdk";`,
    ``,
    `const vault = new Vault({ key: process.env.KYVERN_KEY });`,
    ``,
    triggerToCode(graph.trigger),
  ];
  for (const step of graph.steps) {
    lines.push(...stepToCode(step, 2));
  }
  lines.push(`});`);
  return lines.join("\n");
}

function triggerToCode(trigger: AgentGraph["trigger"]): string {
  switch (trigger.kind) {
    case "manual":
      return `// Trigger: manual run\n(async () => {`;
    case "interval":
      return `// Trigger: every ${Math.round(trigger.ms / 1000)}s\nsetInterval(async () => {`;
    case "cron":
      return `// Trigger: cron "${trigger.expr}"\ncron.schedule("${trigger.expr}", async () => {`;
    case "webhook":
      return `// Trigger: webhook (secret in URL)\nwebhook.on("trigger", async (payload) => {`;
  }
}

function stepToCode(step: AgentGraph["steps"][number], indent: number): string[] {
  const pad = " ".repeat(indent);
  switch (step.type) {
    case "llm": {
      const v = step.outputVar ?? "out";
      return [
        `${pad}// ${step.label}`,
        `${pad}const ${v} = await llm.call({`,
        `${pad}  provider: "${step.config.provider}",`,
        `${pad}  model: "${step.config.model}",`,
        `${pad}  system: ${JSON.stringify(step.config.system.slice(0, 60))}…,`,
        `${pad}  prompt: ${JSON.stringify(step.config.prompt.slice(0, 60))}…,`,
        `${pad}});`,
      ];
    }
    case "http":
      return [
        `${pad}// ${step.label}`,
        `${pad}const ${step.outputVar ?? "res"} = await fetch("${step.config.url.slice(0, 60)}…", {`,
        `${pad}  method: "${step.config.method}",`,
        `${pad}});`,
      ];
    case "vault.pay":
      return [
        `${pad}// ${step.label} — chain-enforced (passes through PpmZ…MSqc)`,
        `${pad}const ${step.outputVar ?? "tx"} = await vault.pay({`,
        `${pad}  merchant: "${step.config.merchant}",`,
        `${pad}  to: "${String(step.config.to).slice(0, 8)}…",`,
        `${pad}  amount: ${step.config.amount},`,
        `${pad}  memo: "${step.config.memo}",`,
        `${pad}});  // ← chain refuses if rules don't pass`,
      ];
    case "transfer.usdc":
      return [
        `${pad}// ${step.label} — chain-enforced`,
        `${pad}const ${step.outputVar ?? "tx"} = await vault.transfer({`,
        `${pad}  to: "${String(step.config.to).slice(0, 8)}…",`,
        `${pad}  amount: ${step.config.amount},`,
        `${pad}});`,
      ];
    case "log":
      return [`${pad}log(${JSON.stringify(step.config.message.slice(0, 60))}…);`];
    case "signal":
      return [
        `${pad}// ${step.label}`,
        `${pad}await inbox.emit({`,
        `${pad}  kind: "${step.config.kind}",`,
        `${pad}  subject: ${JSON.stringify(step.config.subject.slice(0, 60))}…,`,
        `${pad}});`,
      ];
    case "branch":
      return [
        `${pad}if (${step.config.condition}) {`,
        ...step.config.then.flatMap((s) => stepToCode(s, indent + 2)),
        `${pad}} else {`,
        ...step.config.else.flatMap((s) => stepToCode(s, indent + 2)),
        `${pad}}`,
      ];
    case "loop":
      return [
        `${pad}for (const ${step.config.itemVar} of ${step.config.items}) {`,
        ...step.config.body.flatMap((s) => stepToCode(s, indent + 2)),
        `${pad}}`,
      ];
  }
}

function RunStatusDot({ status }: { status: AgentRun["status"] }) {
  const color =
    status === "succeeded" ? "#22C55E"
    : status === "failed" ? "#EF4444"
    : status === "running" ? "#F59E0B"
    : "#9CA3AF";
  return (
    <span
      className="rounded-full"
      style={{ width: 6, height: 6, background: color, boxShadow: `0 0 0 2px ${color}30` }}
    />
  );
}
