/**
 * Graph-based agent CRUD.
 *
 * Sits alongside the legacy `src/lib/agents/store.ts` rather than
 * extending it — graph-based agents have a different shape (no
 * jobPrompt, no allowedTools, no per-template config), so trying to
 * shoehorn them into the legacy `createAgent` would mean a lot of
 * sentinel-value fields. Cleaner to have a parallel helper that
 * writes the same agents row but with graph_json populated.
 *
 * Template id is fixed to 'custom' — the runner's pool-tick skips
 * any agent with graph_json set (via isGraphBasedAgent), so the
 * template field is metadata-only for these rows.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import type { Agent } from "@/lib/agents/types";
import { safeParseGraph, parseGraphOrThrow } from "./schemas";
import type { AgentGraph, TriggerDef } from "./types";

interface CreateGraphAgentInput {
  deviceId: string;
  name: string;
  emoji: string;
  graph: AgentGraph;
  /** Whether this agent appears in the public worker leaderboard. */
  isPublic?: boolean;
  /** Free-form metadata (creator notes, recipe id, etc.). */
  metadata?: Record<string, unknown>;
}

export function createGraphAgent(input: CreateGraphAgentInput): Agent {
  // Validate graph at write time — the API route already does this,
  // but a defensive parse here ensures bad data never lands in DB.
  parseGraphOrThrow(input.graph);

  const id = `agt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  // For graph agents, frequency is derived from the trigger; legacy
  // column kept at 0 so accidental reads don't deceive.
  const frequencySeconds = 0;

  getDb()
    .prepare(
      `INSERT INTO agents (
        id, device_id, name, emoji, personality_prompt, job_prompt,
        allowed_tools, template, frequency_seconds, status, created_at,
        total_thoughts, total_earned_usd, total_spent_usd, is_public,
        metadata_json, config_json, graph_json
      ) VALUES (?, ?, ?, ?, '', '', '[]', 'custom', ?, 'alive', ?,
                0, 0, 0, ?, ?, '{}', ?)`,
    )
    .run(
      id,
      input.deviceId,
      input.name,
      input.emoji,
      frequencySeconds,
      now,
      input.isPublic === false ? 0 : 1,
      JSON.stringify(input.metadata ?? {}),
      JSON.stringify(input.graph),
    );

  return {
    id,
    deviceId: input.deviceId,
    name: input.name,
    emoji: input.emoji,
    personalityPrompt: "",
    jobPrompt: "",
    allowedTools: [],
    template: "custom",
    frequencySeconds,
    status: "alive",
    createdAt: now,
    lastThoughtAt: null,
    totalThoughts: 0,
    totalEarnedUsd: 0,
    totalSpentUsd: 0,
    isPublic: input.isPublic !== false,
    metadata: input.metadata ?? {},
    config: {},
  };
}

/** Replace an agent's graph in place. Returns false if no row was
 *  updated (agent doesn't exist or the graph blob is unchanged). */
export function setAgentGraph(agentId: string, graph: AgentGraph): boolean {
  parseGraphOrThrow(graph);
  const db = getDb();
  const result = db
    .prepare(`UPDATE agents SET graph_json = ? WHERE id = ?`)
    .run(JSON.stringify(graph), agentId);
  return result.changes > 0;
}

/** Read an agent's graph. Returns null if agent doesn't exist or
 *  has no graph (legacy agent). Defensively parses the blob — a
 *  corrupted row returns null rather than throwing. */
export function getAgentGraph(agentId: string): AgentGraph | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT graph_json FROM agents WHERE id = ?`)
    .get(agentId) as { graph_json: string | null } | undefined;
  if (!row?.graph_json) return null;
  try {
    return safeParseGraph(JSON.parse(row.graph_json));
  } catch {
    return null;
  }
}

/** Generate a webhook secret. Used by the composer when the user
 *  picks the webhook trigger — the secret becomes part of the
 *  trigger config + the webhook URL. */
export function generateWebhookSecret(): string {
  return randomUUID().replace(/-/g, "");
}

/** Convenience: list all graph-based agents on a device, with their
 *  trigger summaries flattened for the worker canvas. */
export interface GraphAgentSummary {
  id: string;
  name: string;
  emoji: string;
  trigger: TriggerDef;
  createdAt: number;
  lastRunAt: number | null;
  lastRunStatus: string | null;
  status: "alive" | "paused" | "retired";
}

export function listGraphAgentsForDevice(
  deviceId: string,
): GraphAgentSummary[] {
  const db = getDb();
  interface Row {
    id: string;
    name: string;
    emoji: string;
    graph_json: string;
    created_at: number;
    status: string;
  }
  const rows = db
    .prepare(
      `SELECT id, name, emoji, graph_json, created_at, status
         FROM agents
         WHERE device_id = ?
           AND graph_json IS NOT NULL
           AND status != 'retired'
         ORDER BY created_at DESC`,
    )
    .all(deviceId) as Row[];

  return rows.map((r) => {
    let trigger: TriggerDef = { kind: "manual" };
    try {
      const g = safeParseGraph(JSON.parse(r.graph_json));
      if (g) trigger = g.trigger;
    } catch {
      /* fallthrough — trigger stays manual */
    }

    // Pull the most recent run summary
    interface RunRow {
      started_at: number;
      status: string;
    }
    const lastRun = db
      .prepare(
        `SELECT started_at, status FROM agent_runs
           WHERE agent_id = ?
           ORDER BY started_at DESC LIMIT 1`,
      )
      .get(r.id) as RunRow | undefined;

    return {
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      trigger,
      createdAt: r.created_at,
      lastRunAt: lastRun?.started_at ?? null,
      lastRunStatus: lastRun?.status ?? null,
      status: r.status as "alive" | "paused" | "retired",
    };
  });
}
