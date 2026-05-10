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
          <div className="flex items-center gap-2 mt-0.5">
            <StatusPill status={meta.status} />
            {graph && <TriggerSummaryPill trigger={graph.trigger} />}
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

      {/* Tabs */}
      <div className="flex gap-1.5">
        {(["runs", "graph", "settings"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-[8px] text-[12px] font-medium tracking-[-0.005em]"
            style={{
              background: tab === t ? "#0A0A0A" : "rgba(15,23,42,0.04)",
              color: tab === t ? "#FFFFFF" : "#0A0A0A",
              border: "1px solid rgba(15,23,42,0.10)",
            }}
          >
            {t}
          </button>
        ))}
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
      {tab === "runs" && <RunsTab runs={runs} />}
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

function RunsTab({ runs }: { runs: AgentRun[] }) {
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
    <div className="flex flex-col gap-2">
      {runs.map((run) => (
        <RunRow key={run.id} run={run} />
      ))}
    </div>
  );
}

function RunRow({ run }: { run: AgentRun }) {
  const [open, setOpen] = useState(false);
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
      {output.error && (
        <p className="text-[10.5px] font-mono mt-1" style={{ color: "#B91C1C" }}>
          {output.error}
        </p>
      )}
    </div>
  );
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
      <div className="flex items-center justify-between">
        <span
          className="font-mono uppercase tracking-[0.14em]"
          style={{ fontSize: 9.5, color: "#9CA3AF" }}
        >
          Trigger · {graph.trigger.kind}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11.5px] font-medium hover:bg-slate-50"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.10)",
            color: "#0A0A0A",
          }}
        >
          <Edit3 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
      <div
        className="rounded-[12px] p-3 flex flex-col gap-2"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        {graph.steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2 text-[12px]">
            <span
              className="font-mono"
              style={{ fontSize: 9, color: "#9CA3AF", minWidth: 18 }}
            >
              {i + 1}.
            </span>
            <span
              className="font-mono uppercase tracking-[0.10em] rounded px-1.5 py-0.5"
              style={{
                fontSize: 8.5,
                background: "rgba(15,23,42,0.04)",
                color: "#374151",
              }}
            >
              {step.type}
            </span>
            <span style={{ color: "#0A0A0A" }}>{step.label}</span>
            {"outputVar" in step && step.outputVar && (
              <code
                className="ml-auto font-mono"
                style={{ fontSize: 10, color: "#9CA3AF" }}
              >
                → {step.outputVar}
              </code>
            )}
          </div>
        ))}
      </div>
    </div>
  );
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
    <div className="flex flex-col gap-3">
      <div
        className="rounded-[12px] p-3 flex flex-col gap-2"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
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
        <div
          className="rounded-[12px] p-3 flex flex-col gap-2"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "#9CA3AF" }}
          >
            Budget
          </span>
          <div className="text-[12px]" style={{ color: "#0A0A0A" }}>
            <p>Max runs / day: <span className="font-mono">{graph.config.maxRunsPerDay}</span></p>
            <p>Max ${" "}/ run: <span className="font-mono">${graph.config.maxCostPerRunUsd.toFixed(2)}</span></p>
          </div>
          <p className="text-[10.5px]" style={{ color: "rgba(15,23,42,0.55)" }}>
            Edit budgets via the Graph tab → Edit button.
          </p>
        </div>
      )}

      <div
        className="rounded-[12px] p-3 flex flex-col gap-2"
        style={{
          background: "rgba(239,68,68,0.04)",
          border: "1px solid rgba(239,68,68,0.20)",
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
          className="self-start flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium disabled:opacity-50"
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
