"use client";

/**
 * RecipeReview — the two-click deploy path.
 *
 * When a user picks a recipe from the gallery, they don't drop into
 * the full composer. They land here: a one-screen review with the
 * recipe's identity, schedule, steps summary, budget readout, and
 * two CTAs:
 *
 *   [Customize]                                  [Deploy now]
 *
 * Customize bumps them to the full composer (current behavior).
 * Deploy now ships the recipe as-is.
 *
 * Median user → 2 taps from gallery to live agent.
 * Power user → 1 extra tap (Customize) to edit anything.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Save, Settings2, AlertTriangle, Info } from "lucide-react";
import type { AgentGraph, TriggerDef } from "@/lib/agents/graph/types";
import type { RecipeDef } from "@/lib/agents/graph/recipes";
import { lintGraph, type VaultSnapshot, type LintIssue } from "@/lib/agents/graph/lint";
import { RecipeIcon } from "./step-icon";

interface Props {
  recipe: RecipeDef;
  graph: AgentGraph;
  vaultId: string | null;
  ownerWallet: string | null;
  onCustomize: () => void;
  onDeployed: (agentId: string) => void;
  onCancel: () => void;
}

export function RecipeReview({
  recipe,
  graph,
  vaultId,
  ownerWallet,
  onCustomize,
  onDeployed,
  onCancel,
}: Props) {
  const [name, setName] = useState(recipe.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultSnap, setVaultSnap] = useState<VaultSnapshot | null>(null);

  // Fetch vault config + provider keys so the linter can warn about
  // per-tx max overflows + missing provider keys before deploy.
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
        /* swallow — linter falls back to graph-only checks */
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

  const stepSummary = describeSteps(graph);
  const triggerSummary = describeTrigger(graph.trigger);
  const maxDailySpend = graph.config.maxRunsPerDay * graph.config.maxCostPerRunUsd;

  async function deploy() {
    if (!vaultId || !ownerWallet) {
      setError("Auth not yet hydrated — wait a moment and try again.");
      return;
    }
    if (!name.trim()) {
      setError("Give the agent a name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/agents/spawn-graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({
          deviceId: vaultId,
          name: name.trim(),
          emoji: recipe.emoji,
          graph,
          metadata: { recipeId: recipe.id },
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error ?? `spawn failed (${r.status})`);
      }
      const data = await r.json();
      onDeployed(data.agent.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="flex flex-col gap-4 p-5 max-w-[640px] mx-auto"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Identity */}
      <div className="flex items-start gap-3">
        <RecipeIcon recipeId={recipe.id} tag={recipe.tag} size={48} />
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            className="w-full bg-transparent text-[18px] font-semibold tracking-[-0.01em] outline-none"
            style={{ color: "#0A0A0A" }}
          />
          <p className="text-[12.5px] mt-0.5" style={{ color: "rgba(15,23,42,0.65)" }}>
            {recipe.description}
          </p>
        </div>
      </div>

      {/* Long description */}
      <p
        className="text-[12.5px] leading-[1.55]"
        style={{ color: "rgba(15,23,42,0.72)" }}
      >
        {recipe.longDescription}
      </p>

      {/* Recipe summary — schedule + steps + budget */}
      <div
        className="rounded-[12px] flex flex-col"
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <SummaryRow label="Schedule" value={triggerSummary} />
        <SummaryRow label="Steps" value={stepSummary} />
        <SummaryRow
          label="Budget"
          value={
            <>
              <span className="font-mono" style={{ color: "#0A0A0A" }}>
                {graph.config.maxRunsPerDay}
              </span>
              <span style={{ color: "rgba(15,23,42,0.55)" }}> runs/day × </span>
              <span className="font-mono" style={{ color: "#0A0A0A" }}>
                ${graph.config.maxCostPerRunUsd.toFixed(2)}
              </span>
              <span style={{ color: "rgba(15,23,42,0.55)" }}> max/run = </span>
              <span className="font-mono" style={{ color: "#15803D" }}>
                up to ${maxDailySpend.toFixed(2)}/day
              </span>
            </>
          }
          last
        />
      </div>

      {/* Pre-deploy lint warnings */}
      {lintResult.issues.length > 0 && (
        <LintPanel issues={lintResult.issues} />
      )}

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

      {/* CTAs */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="text-[12.5px] font-medium hover:underline disabled:opacity-50"
          style={{ color: "rgba(15,23,42,0.55)" }}
        >
          ← Back to gallery
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCustomize}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12.5px] font-medium disabled:opacity-50"
            style={{
              background: "rgba(15,23,42,0.04)",
              border: "1px solid rgba(15,23,42,0.10)",
              color: "rgba(15,23,42,0.75)",
            }}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Customize
          </button>
          <button
            type="button"
            onClick={deploy}
            disabled={busy || !name.trim() || lintResult.hasErrors}
            title={
              lintResult.hasErrors
                ? "Resolve the issues above before deploying"
                : undefined
            }
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold disabled:opacity-50"
            style={{
              background: lintResult.hasErrors ? "#9CA3AF" : "#22C55E",
              color: "#FFFFFF",
              boxShadow: lintResult.hasErrors
                ? "none"
                : "0 1px 2px rgba(34,197,94,0.30), 0 8px 20px -8px rgba(34,197,94,0.40)",
            }}
          >
            <Save className="w-3.5 h-3.5" />
            {busy
              ? "Deploying…"
              : lintResult.hasErrors
                ? "Fix issues to deploy"
                : "Deploy now"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryRow({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between px-3 py-2.5"
      style={{
        borderBottom: last ? undefined : "1px solid rgba(15,23,42,0.06)",
      }}
    >
      <span
        className="font-mono uppercase tracking-[0.14em]"
        style={{ fontSize: 9.5, color: "#9CA3AF" }}
      >
        {label}
      </span>
      <span className="text-[12.5px] text-right" style={{ color: "#0A0A0A" }}>
        {value}
      </span>
    </div>
  );
}

function describeSteps(graph: AgentGraph): string {
  const counts = graph.steps.length;
  const types = graph.steps.map((s) => s.type).join(" → ");
  return `${counts} step${counts === 1 ? "" : "s"} · ${types}`;
}

function describeTrigger(trigger: TriggerDef): string {
  switch (trigger.kind) {
    case "manual":
      return "Manual — you click Run now";
    case "interval":
      return `Every ${formatMs(trigger.ms)}`;
    case "cron":
      return `Cron · ${trigger.expr} (UTC)`;
    case "webhook":
      return "On every webhook POST";
  }
}

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} hour${Math.round(ms / 3_600_000) === 1 ? "" : "s"}`;
  return `${Math.round(ms / 86_400_000)} day${Math.round(ms / 86_400_000) === 1 ? "" : "s"}`;
}

/* ─── LintPanel — pre-deploy warnings ─────────────────────────── */

function LintPanel({ issues }: { issues: LintIssue[] }) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const headline =
    errors.length > 0
      ? `${errors.length} issue${errors.length === 1 ? "" : "s"} to fix before deploying`
      : `${warnings.length} thing${warnings.length === 1 ? "" : "s"} to know before deploying`;
  const tone =
    errors.length > 0
      ? {
          bg: "rgba(239,68,68,0.05)",
          border: "rgba(239,68,68,0.25)",
          fg: "#B91C1C",
        }
      : {
          bg: "rgba(245,158,11,0.06)",
          border: "rgba(245,158,11,0.25)",
          fg: "#B45309",
        };
  return (
    <div
      className="rounded-[12px] flex flex-col gap-2 p-3"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
      }}
    >
      <div className="flex items-center gap-2">
        {errors.length > 0 ? (
          <AlertTriangle className="w-4 h-4" style={{ color: tone.fg }} />
        ) : (
          <Info className="w-4 h-4" style={{ color: tone.fg }} />
        )}
        <span
          className="text-[12.5px] font-semibold tracking-[-0.005em]"
          style={{ color: tone.fg }}
        >
          {headline}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 pl-6">
        {issues.map((issue, i) => (
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
  );
}
