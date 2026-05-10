/**
 * Scheduler — interval/cron eligibility for graph-based agents.
 *
 * Called from runner.tickEligibleAgents() on every pool cycle. For
 * each agent with graph_json set, decide whether the trigger fires
 * now and dispatch a run if so.
 *
 * Triggers handled here:
 *   interval: { kind: 'interval', ms } — fires when the elapsed
 *             time since the most-recent run start exceeds `ms`.
 *   cron:     { kind: 'cron', expr }   — fires when the cron
 *             expression has elapsed at least one slot since the
 *             last run.
 *
 * Triggers NOT handled here (other paths):
 *   manual:  POST /api/agents/[id]/run
 *   webhook: POST /api/agents/[id]/webhook/[secret]
 */

import { getDb } from "@/lib/db";
import { CronExpressionParser } from "cron-parser";
import { dispatchRun } from "./dispatcher";
import { safeParseGraph } from "./schemas";
import type { AgentGraph, TriggerDef } from "./types";

interface AgentSchedulerRow {
  id: string;
  graph_json: string;
  status: string;
}

/** Returns the started_at of the agent's most recent run, or null
 *  if it's never run. We key off agent_runs (the new platform's
 *  source of truth), not agent_thoughts. */
function lastRunStartedAt(agentId: string): number | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT MAX(started_at) AS t FROM agent_runs WHERE agent_id = ?`,
    )
    .get(agentId) as { t: number | null };
  return row.t;
}

function isDueByInterval(trigger: Extract<TriggerDef, { kind: "interval" }>, lastStart: number | null, now: number): boolean {
  if (lastStart === null) return true;
  return now - lastStart >= trigger.ms;
}

function isDueByCron(trigger: Extract<TriggerDef, { kind: "cron" }>, lastStart: number | null, now: number): boolean {
  let interval: ReturnType<typeof CronExpressionParser.parse>;
  try {
    interval = CronExpressionParser.parse(trigger.expr, {
      currentDate: new Date(now),
    });
  } catch {
    return false; // bad cron expression — silently skip until user fixes
  }
  // Get the most recent occurrence at or before now
  const prev = interval.prev();
  const prevMs = prev.getTime();
  if (prevMs > now) return false; // shouldn't happen; defensive
  if (lastStart === null) return true;
  return prevMs > lastStart;
}

/** Walk all graph-based agents and dispatch a run for each one
 *  whose trigger is due. Skips agents whose trigger is manual or
 *  webhook (those use other paths). Returns counters for logging. */
export async function tickGraphAgents(): Promise<{
  considered: number;
  dispatched: number;
  errors: number;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, graph_json, status
         FROM agents
         WHERE status = 'alive' AND graph_json IS NOT NULL`,
    )
    .all() as AgentSchedulerRow[];

  const now = Date.now();
  let considered = 0;
  let dispatched = 0;
  let errors = 0;

  for (const row of rows) {
    considered++;
    let graph: AgentGraph | null;
    try {
      graph = safeParseGraph(JSON.parse(row.graph_json));
    } catch {
      graph = null;
    }
    if (!graph) {
      errors++;
      continue;
    }
    const trigger = graph.trigger;
    if (trigger.kind === "manual" || trigger.kind === "webhook") continue;

    const lastStart = lastRunStartedAt(row.id);
    let due = false;
    if (trigger.kind === "interval") {
      due = isDueByInterval(trigger, lastStart, now);
    } else if (trigger.kind === "cron") {
      due = isDueByCron(trigger, lastStart, now);
    }
    if (!due) continue;

    try {
      const result = await dispatchRun({
        agentId: row.id,
        triggerKind: trigger.kind,
      });
      if (result.ok) dispatched++;
      else errors++;
    } catch (e) {
      console.error(`[graph-scheduler] dispatch failed for ${row.id}:`, e);
      errors++;
    }
  }

  return { considered, dispatched, errors };
}

/** Returns whether an agent has graph_json set — used by the legacy
 *  runner to skip agents that the graph scheduler owns. */
export function isGraphBasedAgent(agentId: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT graph_json IS NOT NULL AS has_graph FROM agents WHERE id = ?`,
    )
    .get(agentId) as { has_graph: number } | undefined;
  return row?.has_graph === 1;
}
