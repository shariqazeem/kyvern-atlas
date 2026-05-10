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
  AgentConfig,
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
import { defaultConfigFor, parseConfig } from "./config-schema";

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
  config_json: string | null;
}

function rowToAgent(r: AgentRow): Agent {
  const template = r.template as AgentTemplate;
  return {
    id: r.id,
    deviceId: r.device_id,
    name: r.name,
    emoji: r.emoji,
    personalityPrompt: r.personality_prompt,
    jobPrompt: r.job_prompt,
    allowedTools: JSON.parse(r.allowed_tools) as string[],
    template,
    frequencySeconds: r.frequency_seconds,
    status: r.status as AgentStatus,
    createdAt: r.created_at,
    lastThoughtAt: r.last_thought_at,
    totalThoughts: r.total_thoughts,
    totalEarnedUsd: r.total_earned_usd,
    totalSpentUsd: r.total_spent_usd,
    isPublic: r.is_public === 1,
    metadata: JSON.parse(r.metadata_json) as Record<string, unknown>,
    config: parseConfig(template, r.config_json),
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
  /** Optional initial config. Falls back to template defaults. */
  config?: AgentConfig;
}): Agent {
  const id = `agt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const config = input.config ?? defaultConfigFor(input.template);

  getDb()
    .prepare(
      `INSERT INTO agents (
        id, device_id, name, emoji, personality_prompt, job_prompt,
        allowed_tools, template, frequency_seconds, status, created_at,
        total_thoughts, total_earned_usd, total_spent_usd, is_public, metadata_json,
        config_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'alive', ?, 0, 0, 0, ?, ?, ?)`,
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
      JSON.stringify(config),
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
    config,
  };
}

/** Update the per-agent config blob. Called by
 *  POST /api/agents/[id]/config after Zod validation. */
export function updateAgentConfig(
  id: string,
  config: AgentConfig,
): void {
  getDb()
    .prepare(`UPDATE agents SET config_json = ? WHERE id = ?`)
    .run(JSON.stringify(config), id);
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
  /** 'success' for settled txs, 'failed' for policy-blocked. Defaults
   *  to 'success' if a signature is supplied without an explicit
   *  status; null otherwise. Persisted as signature_status. */
  signatureStatus?: "success" | "failed" | null;
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
  const sigStatus: "success" | "failed" | null =
    input.signatureStatus ?? (input.signature ? "success" : null);

  db.prepare(
    `INSERT INTO agent_thoughts (
      id, agent_id, timestamp, thought, decision_json, tool_used,
      signature, amount_usd, counterparty, mode, signature_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    sigStatus,
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
    signatureStatus: sigStatus,
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
  signature_status: string | null;
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
    signatureStatus:
      r.signature_status === "success" || r.signature_status === "failed"
        ? (r.signature_status as "success" | "failed")
        : null,
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
  escrow_signature: string | null;
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
    escrowSignature: r.escrow_signature,
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
  persistence_context: string | null;
  next_trigger: string | null;
  snoozed_until: number | null;
  on_chain_signature: string | null;
  status: string;
  created_at: number;
  // Phase 3 (KYVERN_FRONTIER_GRAND_CHAMPION) — submission receipts.
  submitted_at: number | null;
  submission_memo_tx: string | null;
  submission_email_id: string | null;
  mirrored_pulse_trigger_id: string | null;
}

const VALID_KINDS: SignalKind[] = [
  "bounty",
  "ecosystem_announcement",
  "wallet_move",
  "price_trigger",
  "github_release",
  "observation",
  "condition_update",
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
    persistenceContext: r.persistence_context,
    nextTrigger: r.next_trigger,
    snoozedUntil: r.snoozed_until,
    onChainSignature: r.on_chain_signature,
    status: (["unread", "read", "archived"].includes(r.status) ? r.status : "unread") as SignalStatus,
    createdAt: r.created_at,
    submittedAt: r.submitted_at,
    submissionMemoTx: r.submission_memo_tx,
    submissionEmailId: r.submission_email_id,
    mirroredPulseTriggerId: r.mirrored_pulse_trigger_id,
  };
}

/** Phase 3 (KYVERN_FRONTIER_GRAND_CHAMPION) — record submission
 *  receipt on a drafted_application signal. Idempotent: a second
 *  call returns false without overwriting. */
export function recordSignalSubmission(
  signalId: string,
  receipt: { memoTx: string | null; emailId: string | null },
): boolean {
  const result = getDb()
    .prepare(
      `UPDATE signals
          SET submitted_at = ?, submission_memo_tx = ?, submission_email_id = ?, status = 'read'
        WHERE id = ? AND submitted_at IS NULL`,
    )
    .run(Date.now(), receipt.memoTx, receipt.emailId, signalId);
  return result.changes > 0;
}

/** Phase 4 (KYVERN_FRONTIER_GRAND_CHAMPION) — record a Wren →
 *  Pulse mirror. Stamps the originating wallet_alert with the new
 *  Pulse trigger id. */
export function recordSignalMirrored(
  signalId: string,
  triggerId: string,
): boolean {
  const result = getDb()
    .prepare(
      `UPDATE signals
          SET mirrored_pulse_trigger_id = ?, status = 'read'
        WHERE id = ? AND mirrored_pulse_trigger_id IS NULL`,
    )
    .run(triggerId, signalId);
  return result.changes > 0;
}

/** Subject hash for dedup — moved to ./signal-hash so the migration
 *  re-backfill in db.ts can use the exact same function. v2 normalizes
 *  $-amounts and bare numbers so volatile prices ("$83.14" vs "$83.27")
 *  hash to the same value and the dedup gate actually fires. */
import { hashSubject } from "./signal-hash";

/** Per-kind dedup windows. Tuned (May 1) so that persistent conditions
 *  don't re-surface — Token Pulse "SOL below band" persists for hours
 *  in real markets, so 30 min was too short; same logic for "wallet
 *  quiet" anomaly observations. The condition_update kind exists for
 *  meaningful milestone updates within a long-running condition (e.g.
 *  "12h continuous now, longest streak in 2 weeks"). */
const DEDUPE_WINDOW_MS_BY_KIND: Record<SignalKind, number> = {
  // Phase 3 — user-benefit-first kinds.
  drafted_application: 24 * 60 * 60 * 1000,     // 24h — same bounty draft shouldn't re-fire
  wallet_alert: 60 * 60 * 1000,                 // 1h — wallet movements are fast
  // 2026-05-08: armed used to be 30 min so the user got pinged every
  // ~3 ticks while the price hovered near the threshold. That's spam.
  // One armed alert per trigger per 24h is the right cadence — the
  // user only needs to be told once that the trigger is close.
  trigger_armed: 24 * 60 * 60 * 1000,
  trigger_fired: 24 * 60 * 60 * 1000,           // 24h — same trigger fires once a day max
  trigger_blocked: 24 * 60 * 60 * 1000,         // 24h — same blocked condition once per day
  // Legacy kinds.
  bounty: 24 * 60 * 60 * 1000,
  ecosystem_announcement: 24 * 60 * 60 * 1000,
  github_release: 24 * 60 * 60 * 1000,
  wallet_move: 60 * 60 * 1000,
  price_trigger: 4 * 60 * 60 * 1000,
  observation: 6 * 60 * 60 * 1000,
  condition_update: 4 * 60 * 60 * 1000,
  opportunity: 24 * 60 * 60 * 1000,
  market_intel: 60 * 60 * 1000,
};

/**
 * User-facing inbox filter — Phase 8 (2026-05-08).
 *
 * The inbox is the user's notifications surface, not the runner's
 * audit trail. Only signals that the user can act on (drafted
 * application = TODO; wallet alert = intel; trigger armed = heads-up;
 * trigger fired = celebration / on-chain receipt) are eligible to
 * land in the inbox query.
 *
 * Legacy runner emissions (release announcements, raw observations,
 * "ecosystem update", market intel etc.) stay in the signals table
 * for the worker page's Activity log — but they don't pollute the
 * inbox stream where the four meaningful kinds live.
 */
export const USER_FACING_KINDS: ReadonlySet<SignalKind> = new Set<SignalKind>([
  "drafted_application",
  "wallet_alert",
  "trigger_armed",
  "trigger_fired",
  "trigger_blocked",
]);

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
  persistenceContext?: string | null;
  nextTrigger?: string | null;
}): WriteSignalResult {
  const now = Date.now();
  const subject = input.subject.slice(0, 200);
  const evidence = input.evidence.map((e) => String(e).slice(0, 400)).slice(0, 8);
  const subjectHash = hashSubject(subject);
  const persistenceContext = input.persistenceContext
    ? String(input.persistenceContext).slice(0, 200).trim() || null
    : null;
  const nextTrigger = input.nextTrigger
    ? String(input.nextTrigger).slice(0, 200).trim() || null
    : null;
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
      suggestion, signature, source_url, persistence_context, next_trigger,
      status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?)`,
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
    persistenceContext,
    nextTrigger,
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
      persistenceContext,
      nextTrigger,
      snoozedUntil: null,
      onChainSignature: null,
      status: "unread",
      createdAt: now,
    },
  };
}

/** Anchor a signal to an on-chain transaction. Used by stake_on_finding
 *  so the inbox can render the green "On-chain ✓ $X staked" badge with
 *  an Explorer link directly on the finding card. */
export function setSignalOnChain(
  signalId: string,
  signature: string,
): boolean {
  const r = getDb()
    .prepare(`UPDATE signals SET on_chain_signature = ? WHERE id = ?`)
    .run(signature, signalId);
  return r.changes > 0;
}

/** Phase 8 stake dedup. Returns true if this agent has already staked
 *  on the same finding subject (normalised via hashSubject) inside the
 *  given window. The Phase 4 verification surfaced 4 stakes on a single
 *  SOL-band breach in one tick — this lets stake_on_finding short-
 *  circuit without burning USDC.
 *
 *  Window default: 24h. Pass 0 to allow re-stake per cycle (testing). */
export function hasRecentStakeOnSubject(
  agentId: string,
  subjectHash: string,
  windowMs: number = 24 * 60 * 60 * 1000,
): boolean {
  if (windowMs <= 0) return false;
  const cutoff = Date.now() - windowMs;
  const row = getDb()
    .prepare(
      `SELECT 1 FROM agent_stakes
        WHERE agent_id = ? AND subject_hash = ? AND created_at >= ?
        LIMIT 1`,
    )
    .get(agentId, subjectHash, cutoff);
  return !!row;
}

/** Record a successful stake for the dedup gate above. Called by
 *  stake_on_finding AFTER serverVaultPay settles. */
export function recordStake(input: {
  agentId: string;
  subjectHash: string;
  signature: string;
  amountUsd: number;
}): void {
  const id = `stk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  getDb()
    .prepare(
      `INSERT INTO agent_stakes (id, agent_id, subject_hash, signature, amount_usd, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.agentId, input.subjectHash, input.signature, input.amountUsd, Date.now());
}

/** Find the most recent signal subject by an agent — used by
 *  stake_on_finding to attach the stake to the latest finding when the
 *  caller doesn't pass an explicit signal id. */
export function findRecentSignalBySubject(
  agentId: string,
  subject: string,
): Signal | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM signals WHERE agent_id = ? AND subject = ?
         ORDER BY created_at DESC LIMIT 1`,
    )
    .get(agentId, subject) as SignalRow | undefined;
  return row ? rowToSignal(row) : null;
}

/** Recent signals filed by ONE agent — used by the runner to build
 *  a "what have I already told the owner" summary the LLM can read.
 *  Persistence-aware analysis depends on this. */
export function listRecentSignalsByAgent(
  agentId: string,
  limit = 10,
): Signal[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM signals WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(agentId, Math.max(1, Math.min(limit, 50))) as SignalRow[];
  return rows.map(rowToSignal);
}

export function listInbox(
  deviceId: string,
  opts: {
    status?: SignalStatus;
    limit?: number;
    since?: number;
    /** When true (default), suppress signals whose snoozed_until is in
     *  the future. Set false to include snoozed rows for admin views. */
    excludeSnoozed?: boolean;
    /** When true (default), restrict to USER_FACING_KINDS only — the
     *  inbox is the user's notifications, not the runner audit trail.
     *  Pass false for admin / debug surfaces that want every signal. */
    userFacingOnly?: boolean;
  } = {},
): Signal[] {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 200));
  const since = opts.since ?? 0;
  const now = Date.now();
  const excludeSnoozed = opts.excludeSnoozed !== false;
  const userFacingOnly = opts.userFacingOnly !== false;
  const db = getDb();
  const snoozeClause = excludeSnoozed
    ? `AND (snoozed_until IS NULL OR snoozed_until <= ${now})`
    : "";
  const kindClause = userFacingOnly
    ? `AND kind IN (${[...USER_FACING_KINDS].map(() => "?").join(",")})`
    : "";
  const kindParams = userFacingOnly ? [...USER_FACING_KINDS] : [];
  const rows = opts.status
    ? (db
        .prepare(
          `SELECT * FROM signals
           WHERE device_id = ? AND status = ? AND created_at >= ?
             ${snoozeClause} ${kindClause}
           ORDER BY created_at DESC LIMIT ?`,
        )
        .all(deviceId, opts.status, since, ...kindParams, limit) as SignalRow[])
    : (db
        .prepare(
          `SELECT * FROM signals
           WHERE device_id = ? AND created_at >= ?
             ${snoozeClause} ${kindClause}
           ORDER BY created_at DESC LIMIT ?`,
        )
        .all(deviceId, since, ...kindParams, limit) as SignalRow[]);
  return rows.map(rowToSignal);
}

export function countSignals(
  deviceId: string,
  status?: SignalStatus,
): number {
  // Inbox count mirrors the inbox query. v1.1 dropped the
  // USER_FACING_KINDS filter so graph-emitted signals (daily_brief,
  // vault_digest, wallet_watch, custom) count in the unread badge.
  const db = getDb();
  if (status) {
    const r = db
      .prepare(
        `SELECT COUNT(*) as n FROM signals
          WHERE device_id = ? AND status = ?`,
      )
      .get(deviceId, status) as { n: number };
    return r.n;
  }
  const r = db
    .prepare(
      `SELECT COUNT(*) as n FROM signals
        WHERE device_id = ?`,
    )
    .get(deviceId) as { n: number };
  return r.n;
}

export function markSignalStatus(signalId: string, status: SignalStatus): boolean {
  const r = getDb()
    .prepare(`UPDATE signals SET status = ? WHERE id = ?`)
    .run(status, signalId);
  return r.changes > 0;
}

/** Mark a signal as read AND snooze it until `until` (ms). The inbox
 *  filter hides snoozed signals by default — recurring conditions stop
 *  re-yelling at the user once they've acknowledged. */
export function snoozeSignal(signalId: string, untilMs: number): boolean {
  const r = getDb()
    .prepare(
      `UPDATE signals SET status = 'read', snoozed_until = ? WHERE id = ?`,
    )
    .run(untilMs, signalId);
  return r.changes > 0;
}

/** Daily digest counts for the inbox banner. Resets at UTC midnight to
 *  match the rest of the "today" stats on /app live-status. */
export function dailyDigest(deviceId: string): {
  signalsToday: number;
  criticalToday: number;
  onChainToday: number;
  thoughtsToday: number;
} {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const since = day.getTime();
  const db = getDb();
  const sigRow = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN signature IS NOT NULL THEN 1 ELSE 0 END) AS onchain
       FROM signals WHERE device_id = ? AND created_at >= ?`,
    )
    .get(deviceId, since) as { total: number; onchain: number };
  const thoughtsRow = db
    .prepare(
      `SELECT COUNT(*) AS n FROM agent_thoughts t
       JOIN agents a ON a.id = t.agent_id
       WHERE a.device_id = ? AND t.timestamp >= ?`,
    )
    .get(deviceId, since) as { n: number };
  return {
    signalsToday: sigRow?.total ?? 0,
    criticalToday: 0,
    onChainToday: sigRow?.onchain ?? 0,
    thoughtsToday: thoughtsRow?.n ?? 0,
  };
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
  /** Solana sig of the escrow payment (poster vault → treasury). The
   *  Phase 1 economy engine requires this — a task with no
   *  escrow_signature is a contract that was never signed and shouldn't
   *  exist. */
  escrowSignature?: string | null;
  /** Optional pre-generated id (so the escrow payment's memo can
   *  reference the same id that lands in the row). When omitted a new
   *  id is generated. */
  id?: string;
}): AgentTask {
  const id = input.id ?? `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const ttl = (input.ttlSeconds ?? 3600) * 1000;
  getDb()
    .prepare(
      `INSERT INTO agent_tasks (
        id, posting_agent_id, task_type, payload_json, bounty_usd,
        status, escrow_signature, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
    )
    .run(
      id,
      input.postingAgentId,
      input.taskType,
      JSON.stringify(input.payload),
      input.bountyUsd,
      input.escrowSignature ?? null,
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
    escrowSignature: input.escrowSignature ?? null,
    createdAt: now,
    expiresAt: now + ttl,
    completedAt: null,
  };
}

/** Atomic claim — only succeeds if task is still 'open'. Sets
 *  status='in_progress'. The Phase 1 economy split moves the actual
 *  settlement out to complete_task; claim is now a pure ownership
 *  acquisition step that doesn't touch USDC. */
export function claimTask(taskId: string, claimingAgentId: string): boolean {
  const result = getDb()
    .prepare(
      `UPDATE agent_tasks SET status = 'in_progress', claiming_agent_id = ?
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

/** Open tasks posted by ANY agent on a given device — used by the
 *  runner to surface "what can I claim?" awareness in the LLM
 *  context. Device-scoped so a worker doesn't get distracted by
 *  tasks on someone else's device. */
export function listOpenTasksOnDevice(
  deviceId: string,
  limit = 5,
): AgentTask[] {
  const rows = getDb()
    .prepare(
      `SELECT t.* FROM agent_tasks t
       JOIN agents a ON a.id = t.posting_agent_id
       WHERE t.status = 'open' AND t.expires_at > ?
         AND a.device_id = ?
       ORDER BY t.created_at DESC LIMIT ?`,
    )
    .all(Date.now(), deviceId, limit) as TaskRow[];
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

/** True if this agent has ever posted a task. Used by the Phase 2
 *  first-post guarantee in the runner — a fresh Sentinel that hasn't
 *  posted anything yet gets an URGENT injection forcing a post on its
 *  first qualifying tick. */
export function hasAgentPostedTask(agentId: string): boolean {
  const row = getDb()
    .prepare(`SELECT 1 FROM agent_tasks WHERE posting_agent_id = ? LIMIT 1`)
    .get(agentId);
  return !!row;
}

/** Most recent in_progress task assigned to this agent (null if none).
 *  Phase 3 — Wren's URGENT directive checks this to decide whether to
 *  push the LLM toward claim_task (no in-progress task yet) or
 *  complete_task (already has one waiting). */
export function getInProgressTaskForAgent(agentId: string): AgentTask | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM agent_tasks
        WHERE claiming_agent_id = ?
          AND status IN ('in_progress','claimed')
        ORDER BY created_at DESC
        LIMIT 1`,
    )
    .get(agentId) as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

/** True if this agent has ever completed any task. Used as the
 *  "fresh worker" signal for Wren's URGENT first-claim guarantee. */
export function hasAgentCompletedTask(agentId: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 FROM agent_tasks
        WHERE claiming_agent_id = ? AND status = 'completed'
        LIMIT 1`,
    )
    .get(agentId);
  return !!row;
}
