/**
 * Agent store — CRUD for agents, thoughts, chat, and tasks.
 *
 * All operations use the existing pulse.db (via getDb).
 * Agent runtime state (current cycle, etc.) is computed on the fly,
 * not stored — keeps the schema simple and reads cheap.
 */

import { getDb } from "../db";
import type {
  Agent,
  AgentChatMessage,
  AgentDecision,
  AgentStatus,
  AgentTask,
  AgentTemplate,
  AgentThought,
  ChatRole,
  TaskStatus,
} from "./types";

/* ─────────────────────────────────────────────────────────────────── */
/*                              Agents                                  */
/* ─────────────────────────────────────────────────────────────────── */

interface AgentRow {
  id: string;
  device_id: string;
  name: string;
  emoji: string;
  personality_prompt: string;
  job_prompt: string;
  allowed_tools: string;
  template: string;
  frequency_seconds: number;
  status: string;
  created_at: number;
  last_thought_at: number | null;
  total_thoughts: number;
  total_earned_usd: number;
  total_spent_usd: number;
  is_public: number;
  metadata_json: string;
}

function rowToAgent(r: AgentRow): Agent {
  return {
    id: r.id,
    deviceId: r.device_id,
    name: r.name,
    emoji: r.emoji,
    personalityPrompt: r.personality_prompt,
    jobPrompt: r.job_prompt,
    allowedTools: JSON.parse(r.allowed_tools) as string[],
    template: r.template as AgentTemplate,
    frequencySeconds: r.frequency_seconds,
    status: r.status as AgentStatus,
    createdAt: r.created_at,
    lastThoughtAt: r.last_thought_at,
    totalThoughts: r.total_thoughts,
    totalEarnedUsd: r.total_earned_usd,
    totalSpentUsd: r.total_spent_usd,
    isPublic: r.is_public === 1,
    metadata: JSON.parse(r.metadata_json) as Record<string, unknown>,
  };
}

export function createAgent(input: {
  deviceId: string;
  name: string;
  emoji: string;
  personalityPrompt: string;
  jobPrompt: string;
  allowedTools: string[];
  template: AgentTemplate;
  frequencySeconds: number;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}): Agent {
  const id = `agt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();

  getDb()
    .prepare(
      `INSERT INTO agents (
        id, device_id, name, emoji, personality_prompt, job_prompt,
        allowed_tools, template, frequency_seconds, status, created_at,
        total_thoughts, total_earned_usd, total_spent_usd, is_public, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'alive', ?, 0, 0, 0, ?, ?)`,
    )
    .run(
      id,
      input.deviceId,
      input.name,
      input.emoji,
      input.personalityPrompt,
      input.jobPrompt,
      JSON.stringify(input.allowedTools),
      input.template,
      input.frequencySeconds,
      now,
      input.isPublic === false ? 0 : 1,
      JSON.stringify(input.metadata ?? {}),
    );

  return {
    id,
    deviceId: input.deviceId,
    name: input.name,
    emoji: input.emoji,
    personalityPrompt: input.personalityPrompt,
    jobPrompt: input.jobPrompt,
    allowedTools: input.allowedTools,
    template: input.template,
    frequencySeconds: input.frequencySeconds,
    status: "alive",
    createdAt: now,
    lastThoughtAt: null,
    totalThoughts: 0,
    totalEarnedUsd: 0,
    totalSpentUsd: 0,
    isPublic: input.isPublic !== false,
    metadata: input.metadata ?? {},
  };
}

export function getAgent(id: string): Agent | null {
  const row = getDb().prepare(`SELECT * FROM agents WHERE id = ?`).get(id) as
    | AgentRow
    | undefined;
  return row ? rowToAgent(row) : null;
}

export function listAgentsByDevice(deviceId: string): Agent[] {
  const rows = getDb()
    .prepare(`SELECT * FROM agents WHERE device_id = ? ORDER BY created_at ASC`)
    .all(deviceId) as AgentRow[];
  return rows.map(rowToAgent);
}

export function listAliveAgents(): Agent[] {
  const rows = getDb()
    .prepare(`SELECT * FROM agents WHERE status = 'alive' ORDER BY created_at ASC`)
    .all() as AgentRow[];
  return rows.map(rowToAgent);
}

export function listPublicAgents(limit = 50): Agent[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM agents WHERE is_public = 1 ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as AgentRow[];
  return rows.map(rowToAgent);
}

export function updateAgentStatus(id: string, status: AgentStatus): void {
  getDb()
    .prepare(`UPDATE agents SET status = ? WHERE id = ?`)
    .run(status, id);
}

export function updateAgentJob(
  id: string,
  jobPrompt: string,
  allowedTools: string[],
  frequencySeconds: number,
): void {
  getDb()
    .prepare(
      `UPDATE agents SET job_prompt = ?, allowed_tools = ?, frequency_seconds = ? WHERE id = ?`,
    )
    .run(jobPrompt, JSON.stringify(allowedTools), frequencySeconds, id);
}

export function recordAgentTick(input: {
  agentId: string;
  thought: string;
  decision: AgentDecision | null;
  signature?: string | null;
  amountUsd?: number | null;
  counterparty?: string | null;
}): AgentThought {
  const id = `tht_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const ts = Date.now();
  const db = getDb();

  db.prepare(
    `INSERT INTO agent_thoughts (
      id, agent_id, timestamp, thought, decision_json, tool_used,
      signature, amount_usd, counterparty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.agentId,
    ts,
    input.thought,
    input.decision ? JSON.stringify(input.decision) : null,
    input.decision?.toolId ?? null,
    input.signature ?? null,
    input.amountUsd ?? null,
    input.counterparty ?? null,
  );

  // Update agent rollups (callers use bumpAgentEarned/bumpAgentSpent
  // to update totals — we only track thought count + last_thought_at here)
  db.prepare(
    `UPDATE agents
     SET total_thoughts = total_thoughts + 1,
         last_thought_at = ?
     WHERE id = ?`,
  ).run(ts, input.agentId);

  return {
    id,
    agentId: input.agentId,
    timestamp: ts,
    thought: input.thought,
    decision: input.decision,
    toolUsed: input.decision?.toolId ?? null,
    signature: input.signature ?? null,
    amountUsd: input.amountUsd ?? null,
    counterparty: input.counterparty ?? null,
  };
}

export function bumpAgentEarned(agentId: string, amountUsd: number): void {
  getDb()
    .prepare(`UPDATE agents SET total_earned_usd = total_earned_usd + ? WHERE id = ?`)
    .run(amountUsd, agentId);
}

export function bumpAgentSpent(agentId: string, amountUsd: number): void {
  getDb()
    .prepare(`UPDATE agents SET total_spent_usd = total_spent_usd + ? WHERE id = ?`)
    .run(amountUsd, agentId);
}

/* ─────────────────────────────────────────────────────────────────── */
/*                             Thoughts                                 */
/* ─────────────────────────────────────────────────────────────────── */

interface ThoughtRow {
  id: string;
  agent_id: string;
  timestamp: number;
  thought: string;
  decision_json: string | null;
  tool_used: string | null;
  signature: string | null;
  amount_usd: number | null;
  counterparty: string | null;
}

export function listThoughts(agentId: string, limit = 50): AgentThought[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM agent_thoughts WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?`,
    )
    .all(agentId, limit) as ThoughtRow[];
  return rows.map((r) => ({
    id: r.id,
    agentId: r.agent_id,
    timestamp: r.timestamp,
    thought: r.thought,
    decision: r.decision_json ? (JSON.parse(r.decision_json) as AgentDecision) : null,
    toolUsed: r.tool_used,
    signature: r.signature,
    amountUsd: r.amount_usd,
    counterparty: r.counterparty,
  }));
}

/* ─────────────────────────────────────────────────────────────────── */
/*                               Chat                                   */
/* ─────────────────────────────────────────────────────────────────── */

interface ChatRow {
  id: string;
  agent_id: string;
  role: string;
  content: string;
  timestamp: number;
}

export function appendChat(
  agentId: string,
  role: ChatRole,
  content: string,
): AgentChatMessage {
  const id = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const ts = Date.now();
  getDb()
    .prepare(
      `INSERT INTO agent_chat_messages (id, agent_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, agentId, role, content, ts);
  return { id, agentId, role, content, timestamp: ts };
}

export function listChat(agentId: string, limit = 50): AgentChatMessage[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM agent_chat_messages WHERE agent_id = ? ORDER BY timestamp ASC LIMIT ?`,
    )
    .all(agentId, limit) as ChatRow[];
  return rows.map((r) => ({
    id: r.id,
    agentId: r.agent_id,
    role: r.role as ChatRole,
    content: r.content,
    timestamp: r.timestamp,
  }));
}

/* ─────────────────────────────────────────────────────────────────── */
/*                              Tasks                                   */
/* ─────────────────────────────────────────────────────────────────── */

interface TaskRow {
  id: string;
  posting_agent_id: string;
  task_type: string;
  payload_json: string;
  bounty_usd: number;
  status: string;
  claiming_agent_id: string | null;
  result_json: string | null;
  payment_signature: string | null;
  created_at: number;
  expires_at: number;
  completed_at: number | null;
}

function rowToTask(r: TaskRow): AgentTask {
  return {
    id: r.id,
    postingAgentId: r.posting_agent_id,
    taskType: r.task_type,
    payload: JSON.parse(r.payload_json) as Record<string, unknown>,
    bountyUsd: r.bounty_usd,
    status: r.status as TaskStatus,
    claimingAgentId: r.claiming_agent_id,
    result: r.result_json ? (JSON.parse(r.result_json) as Record<string, unknown>) : null,
    paymentSignature: r.payment_signature,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    completedAt: r.completed_at,
  };
}

export function postTask(input: {
  postingAgentId: string;
  taskType: string;
  payload: Record<string, unknown>;
  bountyUsd: number;
  /** TTL in seconds, default 1 hour */
  ttlSeconds?: number;
}): AgentTask {
  const id = `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const ttl = (input.ttlSeconds ?? 3600) * 1000;
  getDb()
    .prepare(
      `INSERT INTO agent_tasks (
        id, posting_agent_id, task_type, payload_json, bounty_usd,
        status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
    )
    .run(
      id,
      input.postingAgentId,
      input.taskType,
      JSON.stringify(input.payload),
      input.bountyUsd,
      now,
      now + ttl,
    );
  return {
    id,
    postingAgentId: input.postingAgentId,
    taskType: input.taskType,
    payload: input.payload,
    bountyUsd: input.bountyUsd,
    status: "open",
    claimingAgentId: null,
    result: null,
    paymentSignature: null,
    createdAt: now,
    expiresAt: now + ttl,
    completedAt: null,
  };
}

/** Atomic claim — only succeeds if task is still 'open'. */
export function claimTask(taskId: string, claimingAgentId: string): boolean {
  const result = getDb()
    .prepare(
      `UPDATE agent_tasks SET status = 'claimed', claiming_agent_id = ?
       WHERE id = ? AND status = 'open' AND expires_at > ?`,
    )
    .run(claimingAgentId, taskId, Date.now());
  return result.changes > 0;
}

export function completeTask(input: {
  taskId: string;
  result: Record<string, unknown>;
  paymentSignature: string | null;
}): void {
  getDb()
    .prepare(
      `UPDATE agent_tasks
       SET status = 'completed', result_json = ?, payment_signature = ?, completed_at = ?
       WHERE id = ?`,
    )
    .run(JSON.stringify(input.result), input.paymentSignature, Date.now(), input.taskId);
}

export function failTask(taskId: string): void {
  getDb()
    .prepare(`UPDATE agent_tasks SET status = 'failed', completed_at = ? WHERE id = ?`)
    .run(Date.now(), taskId);
}

export function listOpenTasks(limit = 50): AgentTask[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM agent_tasks
       WHERE status = 'open' AND expires_at > ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(Date.now(), limit) as TaskRow[];
  return rows.map(rowToTask);
}

export function listTasksByAgent(agentId: string, limit = 50): AgentTask[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM agent_tasks
       WHERE posting_agent_id = ? OR claiming_agent_id = ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(agentId, agentId, limit) as TaskRow[];
  return rows.map(rowToTask);
}

export function getTask(id: string): AgentTask | null {
  const row = getDb()
    .prepare(`SELECT * FROM agent_tasks WHERE id = ?`)
    .get(id) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}
