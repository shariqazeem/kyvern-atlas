/**
 * Run dispatcher — the single chokepoint for all graph executions.
 *
 * Wraps runGraph() with:
 *   1. concurrency caps (per-vault + global)
 *   2. daily run cap (per agent, UTC day)
 *   3. agent-runs row lifecycle (queued → running → succeeded/failed)
 *   4. graph parse + agent lookup
 *
 * Called from:
 *   - POST /api/agents/[id]/run    — manual trigger
 *   - POST /api/agents/[id]/webhook/[secret] — external trigger
 *   - tickAgentGraph()             — interval/cron from pool-tick
 *
 * Always resolves; failures are encoded into the returned AgentRun.
 */

import { runGraph } from "./executor";
import { safeParseGraph } from "./schemas";
import {
  countActiveRuns,
  countRunsTodayForAgent,
  createRun,
  finalizeRun,
  markRunRunning,
} from "./runs-store";
import type { AgentGraph, AgentRun, AgentRunStatus, TriggerDef } from "./types";
import { getDb } from "@/lib/db";

/** Max concurrent runs per vault. Higher and a single user can
 *  saturate the executor; lower and bursts feel sluggish. 3 is a
 *  reasonable default — most users will have ≤ 3 agents firing at
 *  once. */
const PER_VAULT_CONCURRENCY_CAP = 3;

/** Global cap. The Next.js process is single-threaded for our
 *  purposes (bun would change this); 30 simultaneous executor
 *  instances is the rough ceiling before event-loop saturation. */
const GLOBAL_CONCURRENCY_CAP = 30;

export interface DispatchInput {
  agentId: string;
  triggerKind: TriggerDef["kind"];
  triggerPayload?: Record<string, unknown> | null;
  /** When false (the default), we enforce caps + daily limit. Set
   *  true for emergency-override paths (none yet — placeholder). */
  bypassLimits?: boolean;
}

export interface DispatchResult {
  ok: boolean;
  runId?: string;
  run?: AgentRun;
  error?: string;
  errorCode?:
    | "agent_not_found"
    | "graph_invalid"
    | "graph_missing"
    | "vault_not_found"
    | "concurrency_per_vault"
    | "concurrency_global"
    | "daily_cap_reached"
    | "executor_failure";
}

interface AgentRow {
  id: string;
  device_id: string;
  graph_json: string | null;
  status: string;
}

interface VaultRow {
  id: string;
  owner_wallet: string;
}

/** Dispatch a single graph execution. Synchronous to the caller —
 *  awaits the full graph run before returning. For long graphs you
 *  might prefer a fire-and-forget variant; not needed in v1. */
export async function dispatchRun(
  input: DispatchInput,
): Promise<DispatchResult> {
  const db = getDb();

  // Look up agent
  const agentRow = db
    .prepare(
      `SELECT id, device_id, graph_json, status
         FROM agents WHERE id = ?`,
    )
    .get(input.agentId) as AgentRow | undefined;
  if (!agentRow) {
    return { ok: false, errorCode: "agent_not_found", error: "agent not found" };
  }
  if (agentRow.status !== "alive") {
    return {
      ok: false,
      errorCode: "agent_not_found",
      error: `agent status is "${agentRow.status}", not alive`,
    };
  }
  if (!agentRow.graph_json) {
    return {
      ok: false,
      errorCode: "graph_missing",
      error: "agent has no graph_json (legacy agent — not migrated to composer)",
    };
  }

  // Parse graph
  let graph: AgentGraph;
  try {
    graph = safeParseGraph(JSON.parse(agentRow.graph_json)) as AgentGraph;
    if (!graph) throw new Error("graph failed schema validation");
  } catch (e) {
    return {
      ok: false,
      errorCode: "graph_invalid",
      error: `graph invalid: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Look up vault
  const vaultRow = db
    .prepare(`SELECT id, owner_wallet FROM vaults WHERE id = ?`)
    .get(agentRow.device_id) as VaultRow | undefined;
  if (!vaultRow) {
    return {
      ok: false,
      errorCode: "vault_not_found",
      error: `vault ${agentRow.device_id} not found`,
    };
  }

  // Caps
  if (!input.bypassLimits) {
    if (countActiveRuns({ vaultId: vaultRow.id }) >= PER_VAULT_CONCURRENCY_CAP) {
      return {
        ok: false,
        errorCode: "concurrency_per_vault",
        error: `per-vault concurrency cap (${PER_VAULT_CONCURRENCY_CAP}) reached`,
      };
    }
    if (countActiveRuns("global") >= GLOBAL_CONCURRENCY_CAP) {
      return {
        ok: false,
        errorCode: "concurrency_global",
        error: `global concurrency cap (${GLOBAL_CONCURRENCY_CAP}) reached`,
      };
    }
    if (countRunsTodayForAgent(input.agentId) >= graph.config.maxRunsPerDay) {
      return {
        ok: false,
        errorCode: "daily_cap_reached",
        error: `daily run cap (${graph.config.maxRunsPerDay}) reached`,
      };
    }
  }

  // Persist queued row first so concurrency counters see it
  const runId = createRun({
    agentId: input.agentId,
    triggerKind: input.triggerKind,
    triggerPayload: input.triggerPayload ?? null,
  });
  markRunRunning(runId);

  // Execute
  let finalStatus: AgentRunStatus = "succeeded";
  try {
    const ctx = await runGraph({
      graph,
      agentId: input.agentId,
      vaultId: vaultRow.id,
      ownerWallet: vaultRow.owner_wallet,
      triggerKind: input.triggerKind,
      triggerPayload: input.triggerPayload ?? null,
    });
    const run = finalizeRun(runId, ctx);
    finalStatus = run.status;
    return { ok: run.status === "succeeded", runId, run };
  } catch (e) {
    // The executor should never throw (it captures errors per step),
    // but defense in depth: finalize the row as failed.
    const db2 = getDb();
    db2.prepare(
      `UPDATE agent_runs
         SET status = 'failed', finished_at = ?, error_message = ?
         WHERE id = ?`,
    ).run(
      Date.now(),
      e instanceof Error ? e.message : String(e),
      runId,
    );
    finalStatus = "failed";
    return {
      ok: false,
      runId,
      errorCode: "executor_failure",
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    void finalStatus; // surface in logs eventually
  }
}
