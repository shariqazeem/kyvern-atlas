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
  Signal,
  SignalKind,
  SignalStatus,
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
  /** "llm" (default) or "scripted" — drives the mode pill on the
   *  thought card. The LLM path wins ~all the time on paid Commonstack. */
  mode?: "llm" | "scripted";
}): AgentThought {
  const id = `tht_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const ts = Date.now();
  const db = getDb();
  const mode: "llm" | "scripted" = input.mode ?? "llm";

  db.prepare(
    `INSERT INTO agent_thoughts (
      id, agent_id, timestamp, thought, decision_json, tool_used,
      signature, amount_usd, counterparty, mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    mode,
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
    mode,
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
  mode: string | null;
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
    mode: (r.mode === "scripted" ? "scripted" : "llm") as "llm" | "scripted",
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

/* ─────────────────────────────────────────────────────────────────── */
/*                              Signals                                 */
/* ─────────────────────────────────────────────────────────────────── */

interface SignalRow {
  id: string;
  agent_id: string;
  device_id: string;
  kind: string;
  subject: string;
  evidence_json: string;
  suggestion: string | null;
  signature: string | null;
  source_url: string | null;
  status: string;
  created_at: number;
}

const VALID_KINDS: SignalKind[] = [
  "bounty",
  "ecosystem_announcement",
  "wallet_move",
  "price_trigger",
  "github_release",
  "observation",
];

function rowToSignal(r: SignalRow): Signal {
  return {
    id: r.id,
    agentId: r.agent_id,
    deviceId: r.device_id,
    kind: (VALID_KINDS.includes(r.kind as SignalKind) ? r.kind : "observation") as SignalKind,
    subject: r.subject,
    evidence: (() => {
      try {
        const v = JSON.parse(r.evidence_json) as unknown;
        return Array.isArray(v) ? v.map(String) : [];
      } catch {
        return [];
      }
    })(),
    suggestion: r.suggestion,
    signature: r.signature,
    sourceUrl: r.source_url,
    status: (["unread", "read", "archived"].includes(r.status) ? r.status : "unread") as SignalStatus,
    createdAt: r.created_at,
  };
}

/** Subject hash for dedup. Matches the SQL backfill exactly:
 *  lower → trim → first 80 chars. Two signals from the same worker
 *  with the same kind hash to the same value → dedup hit. */
function hashSubject(subject: string): string {
  return subject.toLowerCase().trim().slice(0, 80);
}

/** Per-kind dedup windows. Tuned for the noise patterns we saw in
 *  production: token_pulse re-emits the same band-break every tick
 *  while a price stays out-of-band, so a 30-min window collapses
 *  ~55 of those 72 dupes; bounty/release/announcement are slower-
 *  moving and warrant a 24-hour window so reposts don't re-surface. */
const DEDUPE_WINDOW_MS_BY_KIND: Record<SignalKind, number> = {
  bounty: 24 * 60 * 60 * 1000,                  // 24h
  ecosystem_announcement: 24 * 60 * 60 * 1000,  // 24h
  github_release: 24 * 60 * 60 * 1000,          // 24h
  wallet_move: 60 * 60 * 1000,                  // 1h
  price_trigger: 30 * 60 * 1000,                // 30m
  observation: 60 * 60 * 1000,                  // 1h
};

interface WriteSignalResult {
  signal: Signal;
  /** false = a brand-new signal was inserted.
   *  true  = the same finding (by agent + kind + subject) was already
   *          surfaced inside the per-kind dedup window; the existing
   *          signal is returned and no new row is written. */
  created: boolean;
  /** When created=false, how long ago the existing signal was written.
   *  Used by the message_user tool to render an honest "already
   *  surfaced X minutes ago" tool result back to the LLM. */
  duplicateAgeMs?: number;
}

export function writeSignal(input: {
  agentId: string;
  deviceId: string;
  kind: SignalKind;
  subject: string;
  evidence: string[];
  suggestion?: string | null;
  signature?: string | null;
  sourceUrl?: string | null;
}): WriteSignalResult {
  const now = Date.now();
  const subject = input.subject.slice(0, 200);
  const evidence = input.evidence.map((e) => String(e).slice(0, 400)).slice(0, 8);
  const subjectHash = hashSubject(subject);
  const db = getDb();

  // Dedup gate — same (agent, kind, subject_hash) inside window → drop.
  const windowMs =
    DEDUPE_WINDOW_MS_BY_KIND[input.kind] ?? 60 * 60 * 1000;
  const cutoff = now - windowMs;
  const existing = db
    .prepare(
      `SELECT * FROM signals
       WHERE agent_id = ? AND kind = ? AND subject_hash = ? AND created_at >= ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(input.agentId, input.kind, subjectHash, cutoff) as
    | SignalRow
    | undefined;
  if (existing) {
    return {
      signal: rowToSignal(existing),
      created: false,
      duplicateAgeMs: now - existing.created_at,
    };
  }

  const id = `sig_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(
    `INSERT INTO signals (
      id, agent_id, device_id, kind, subject, subject_hash, evidence_json,
      suggestion, signature, source_url, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?)`,
  ).run(
    id,
    input.agentId,
    input.deviceId,
    input.kind,
    subject,
    subjectHash,
    JSON.stringify(evidence),
    input.suggestion ?? null,
    input.signature ?? null,
    input.sourceUrl ?? null,
    now,
  );

  return {
    created: true,
    signal: {
      id,
      agentId: input.agentId,
      deviceId: input.deviceId,
      kind: input.kind,
      subject,
      evidence,
      suggestion: input.suggestion ?? null,
      signature: input.signature ?? null,
      sourceUrl: input.sourceUrl ?? null,
      status: "unread",
      createdAt: now,
    },
  };
}

export function listInbox(
  deviceId: string,
  opts: { status?: SignalStatus; limit?: number; since?: number } = {},
): Signal[] {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 200));
  const since = opts.since ?? 0;
  const db = getDb();
  const rows = opts.status
    ? (db
        .prepare(
          `SELECT * FROM signals
           WHERE device_id = ? AND status = ? AND created_at >= ?
           ORDER BY created_at DESC LIMIT ?`,
        )
        .all(deviceId, opts.status, since, limit) as SignalRow[])
    : (db
        .prepare(
          `SELECT * FROM signals
           WHERE device_id = ? AND created_at >= ?
           ORDER BY created_at DESC LIMIT ?`,
        )
        .all(deviceId, since, limit) as SignalRow[]);
  return rows.map(rowToSignal);
}

export function countSignals(
  deviceId: string,
  status?: SignalStatus,
): number {
  const db = getDb();
  if (status) {
    const r = db
      .prepare(`SELECT COUNT(*) as n FROM signals WHERE device_id = ? AND status = ?`)
      .get(deviceId, status) as { n: number };
    return r.n;
  }
  const r = db.prepare(`SELECT COUNT(*) as n FROM signals WHERE device_id = ?`).get(deviceId) as { n: number };
  return r.n;
}

export function markSignalStatus(signalId: string, status: SignalStatus): boolean {
  const r = getDb()
    .prepare(`UPDATE signals SET status = ? WHERE id = ?`)
    .run(status, signalId);
  return r.changes > 0;
}

export function getSignal(signalId: string): Signal | null {
  const row = getDb()
    .prepare(`SELECT * FROM signals WHERE id = ?`)
    .get(signalId) as SignalRow | undefined;
  return row ? rowToSignal(row) : null;
}

/* ── watch_url cache (used by the watch_url tool for sinceLastCheck) ── */

interface WatchUrlCacheRow {
  agent_id: string;
  url: string;
  last_response_hash: string | null;
  last_seen_ids: string | null;
  last_check_at: number;
}

export function readWatchCache(
  agentId: string,
  url: string,
): { lastResponseHash: string | null; lastSeenIds: string[]; lastCheckAt: number } | null {
  const row = getDb()
    .prepare(`SELECT * FROM watch_url_cache WHERE agent_id = ? AND url = ?`)
    .get(agentId, url) as WatchUrlCacheRow | undefined;
  if (!row) return null;
  let lastSeenIds: string[] = [];
  if (row.last_seen_ids) {
    try {
      const v = JSON.parse(row.last_seen_ids) as unknown;
      lastSeenIds = Array.isArray(v) ? v.map(String) : [];
    } catch {
      lastSeenIds = [];
    }
  }
  return {
    lastResponseHash: row.last_response_hash,
    lastSeenIds,
    lastCheckAt: row.last_check_at,
  };
}

export function writeWatchCache(
  agentId: string,
  url: string,
  responseHash: string,
  seenIds: string[],
): void {
  // Cap stored ids to the most recent 200 to bound the cache row size
  const trimmed = seenIds.slice(0, 200);
  getDb()
    .prepare(
      `INSERT INTO watch_url_cache (agent_id, url, last_response_hash, last_seen_ids, last_check_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(agent_id, url) DO UPDATE SET
         last_response_hash = excluded.last_response_hash,
         last_seen_ids = excluded.last_seen_ids,
         last_check_at = excluded.last_check_at`,
    )
    .run(agentId, url, responseHash, JSON.stringify(trimmed), Date.now());
}

/* ─────────────────────────────────────────────────────────────────── */
/*                              Tasks                                   */
/* ─────────────────────────────────────────────────────────────────── */

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
