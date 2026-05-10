/**
 * Log step — writes a message to the per-vault event feed.
 *
 * The feed is fed by agent_thoughts (per the audit). We write a row
 * with mode='scripted' and the interpolated message, and the existing
 * /api/vault/[id]/events endpoint surfaces it.
 *
 * Cheap, no network, always succeeds (unless DB is wedged).
 */

import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { interpolate } from "../interpolate";
import type {
  LogStepConfig,
  RunContext,
  StepExecutionResult,
} from "../types";

export async function executeLog(
  ctx: RunContext,
  config: LogStepConfig,
): Promise<StepExecutionResult> {
  const message = interpolate(config.message, ctx.vars);
  const decoration =
    config.level === "error" ? "✗ "
    : config.level === "warn" ? "⚠ "
    : "› ";
  const thoughtText = decoration + message;

  const db = getDb();
  db.prepare(
    `INSERT INTO agent_thoughts
       (id, agent_id, timestamp, thought, decision_json, tool_used,
        signature, amount_usd, counterparty, mode, signature_status)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 'scripted', NULL)`,
  ).run(
    randomUUID(),
    ctx.agentId,
    Date.now(),
    thoughtText,
    JSON.stringify({ action: "observe", source: "graph.log", level: config.level }),
  );

  return { ok: true, output: { message, level: config.level } };
}
