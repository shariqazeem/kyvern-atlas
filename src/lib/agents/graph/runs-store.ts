/**
 * agent_runs store — helpers around the agent_runs table.
 *
 * One row per execution of a graph. The step-by-step detail is
 * JSON-blobbed in step_outputs_json (an array of StepOutput).
 *
 * Used by:
 *   - run dispatcher (creates row at queued, updates at finished)
 *   - GET /api/agents/[id]/runs (paged history for the detail page)
 *   - GET /api/agents/[id]/runs/[runId] (single-run drilldown)
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { AgentRun, AgentRunStatus, RunContext, StepOutput, TriggerDef } from "./types";

interface DbRow {
  id: string;
  agent_id: string;
  started_at: number;
  finished_at: number | null;
  status: AgentRunStatus;
  trigger_kind: TriggerDef["kind"];
  trigger_payload: string | null;
  step_outputs_json: string;
  error_message: string | null;
  total_cost_usd: number;
}

function rowToRun(row: DbRow): AgentRun {
  let stepOutputs: StepOutput[] = [];
  try {
    stepOutputs = JSON.parse(row.step_outputs_json) as StepOutput[];
  } catch {
    stepOutputs = [];
  }
  let triggerPayload: Record<string, unknown> | null = null;
  if (row.trigger_payload) {
    try {
      triggerPayload = JSON.parse(row.trigger_payload) as Record<string, unknown>;
    } catch {
      triggerPayload = null;
    }
  }
  return {
    id: row.id,
    agentId: row.agent_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    triggerKind: row.trigger_kind,
    triggerPayload,
    stepOutputs,
    errorMessage: row.error_message,
    totalCostUsd: row.total_cost_usd,
  };
}

/* ─── Mutations ──────────────────────────────────────────────── */

export interface CreateRunInput {
  agentId: string;
  triggerKind: TriggerDef["kind"];
  triggerPayload?: Record<string, unknown> | null;
}

/** Create a queued run row. Caller updates it via finalizeRun()
 *  once the executor returns. */
export function createRun(input: CreateRunInput): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    `INSERT INTO agent_runs
       (id, agent_id, started_at, finished_at, status, trigger_kind,
        trigger_payload, step_outputs_json, error_message, total_cost_usd)
     VALUES (?, ?, ?, NULL, 'queued', ?, ?, '[]', NULL, 0)`,
  ).run(
    id,
    input.agentId,
    Date.now(),
    input.triggerKind,
    input.triggerPayload ? JSON.stringify(input.triggerPayload) : null,
  );
  return id;
}

export function markRunRunning(runId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE agent_runs SET status = 'running' WHERE id = ?`,
  ).run(runId);
}

/** Persist the executor's RunContext as a finalized row. Status
 *  is derived from ctx.abortReason (or 'succeeded' if none). */
export function finalizeRun(runId: string, ctx: RunContext): AgentRun {
  const db = getDb();
  const status: AgentRunStatus = ctx.abortReason ?? "succeeded";
  const errorMessage =
    status === "succeeded"
      ? null
      : ctx.outputs.find((o) => o.error)?.error ?? "run aborted";
  db.prepare(
    `UPDATE agent_runs
       SET finished_at = ?, status = ?, step_outputs_json = ?,
           error_message = ?, total_cost_usd = ?
       WHERE id = ?`,
  ).run(
    Date.now(),
    status,
    JSON.stringify(ctx.outputs),
    errorMessage,
    ctx.costUsd,
    runId,
  );
  return getRun(runId)!;
}

/* ─── Reads ──────────────────────────────────────────────────── */

export function getRun(runId: string): AgentRun | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM agent_runs WHERE id = ?`)
    .get(runId) as DbRow | undefined;
  return row ? rowToRun(row) : null;
}

export function listRunsForAgent(
  agentId: string,
  limit = 50,
  beforeStartedAt?: number,
): AgentRun[] {
  const db = getDb();
  const rows = beforeStartedAt
    ? db
        .prepare(
          `SELECT * FROM agent_runs
             WHERE agent_id = ? AND started_at < ?
             ORDER BY started_at DESC LIMIT ?`,
        )
        .all(agentId, beforeStartedAt, limit) as DbRow[]
    : db
        .prepare(
          `SELECT * FROM agent_runs
             WHERE agent_id = ?
             ORDER BY started_at DESC LIMIT ?`,
        )
        .all(agentId, limit) as DbRow[];
  return rows.map(rowToRun);
}

/** Count today's runs for a given agent (UTC day window). Used
 *  by P2.4 to enforce graph.config.maxRunsPerDay. */
export function countRunsTodayForAgent(agentId: string): number {
  const utcDayStart = new Date();
  utcDayStart.setUTCHours(0, 0, 0, 0);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM agent_runs
         WHERE agent_id = ? AND started_at >= ?`,
    )
    .get(agentId, utcDayStart.getTime()) as { c: number };
  return row.c;
}

/** Count runs currently in flight (queued or running). Used by P2.4
 *  for per-vault and global concurrency caps. */
export function countActiveRuns(scope: "global" | { vaultId: string }): number {
  const db = getDb();
  if (scope === "global") {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM agent_runs
           WHERE status IN ('queued', 'running')`,
      )
      .get() as { c: number };
    return row.c;
  }
  // Per-vault — join through agents
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM agent_runs r
         JOIN agents a ON a.id = r.agent_id
         WHERE r.status IN ('queued', 'running') AND a.device_id = ?`,
    )
    .get(scope.vaultId) as { c: number };
  return row.c;
}
