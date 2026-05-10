/**
 * Signal step — emits a finding to the user's inbox.
 *
 * Writes to the `signals` table that the legacy worker era + the
 * /app/inbox surface both consume. Now graph agents can produce
 * findings on the same canvas as Atlas + the legacy trio: a wallet
 * alert from a Wren-style agent, a draft application from a
 * Sentinel-style agent, a price-trigger fired notice, etc.
 *
 * The agent's vault id is resolved via the agents table at write
 * time so the inbox query can filter by device without joining.
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { interpolate } from "../interpolate";
import type {
  RunContext,
  SignalStepConfig,
  StepExecutionResult,
} from "../types";

interface AgentRow {
  device_id: string;
}

export async function executeSignal(
  ctx: RunContext,
  config: SignalStepConfig,
): Promise<StepExecutionResult> {
  const kind = interpolate(config.kind, ctx.vars).trim() || "info";
  const subject = interpolate(config.subject, ctx.vars).trim();
  if (!subject) {
    return { ok: false, output: null, error: "signal.subject required" };
  }

  // Pull device_id from the agent row so the inbox can filter by
  // vault without joins.
  const db = getDb();
  const agent = db
    .prepare(`SELECT device_id FROM agents WHERE id = ?`)
    .get(ctx.agentId) as AgentRow | undefined;
  if (!agent) {
    return { ok: false, output: null, error: "agent_not_found" };
  }

  // Multi-line evidence → JSON array of bullets.
  const evidenceLines = interpolate(config.evidence, ctx.vars)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  const suggestion = interpolate(config.suggestion, ctx.vars).trim() || null;
  const sourceUrl = interpolate(config.sourceUrl, ctx.vars).trim() || null;

  const id = `sig_${randomUUID().slice(0, 12)}`;
  const now = Date.now();

  db.prepare(
    `INSERT INTO signals
       (id, agent_id, device_id, kind, subject, evidence_json,
        suggestion, signature, source_url, persistence_context,
        next_trigger, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, 'unread', ?)`,
  ).run(
    id,
    ctx.agentId,
    agent.device_id,
    kind,
    subject,
    JSON.stringify(evidenceLines),
    suggestion,
    sourceUrl,
    now,
  );

  return {
    ok: true,
    output: {
      id,
      kind,
      subject,
      evidenceCount: evidenceLines.length,
    },
  };
}
