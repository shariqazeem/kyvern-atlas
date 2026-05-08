/**
 * Agent type definitions.
 *
 * An Agent is an autonomous worker that lives on a Device (vault).
 * Each agent has a personality, a job, allowed tools, and a frequency.
 * The AgentRunner ticks each agent — calls Claude with personality + memory
 * + world state, then executes the resulting tool decisions.
 */

export type AgentStatus = "alive" | "paused" | "retired";

export type AgentTemplate =
  | "atlas"
  | "scout"
  | "analyst"
  | "hunter"
  | "greeter"
  | "earner"
  | "custom"
  | "bounty_hunter"
  | "ecosystem_watcher"
  | "whale_tracker"
  | "token_pulse"
  | "github_watcher";

/* ── Per-template config (Phase 3 reframe) ──
 *
 * Each template stores its user-editable settings in `agent.config`.
 * Validated at runtime via Zod (see config-schema.ts). Empty-object
 * default is valid — runner backfills template-shaped defaults the
 * first time it ticks an empty config.
 */
export interface SentinelConfig {
  skills: string;
  min_payout_usd: number;
  cadence_minutes: number;
}

export interface WrenWatchEntry {
  address: string;
  label: string;
  threshold_usd: number;
}

export interface WrenConfig {
  watchlist: WrenWatchEntry[];
  cadence_minutes: number;
}

export interface PulseTrigger {
  id: string;
  asset: string;
  direction: "below" | "above";
  threshold_usd: number;
  amount_usd: number;
  merchant: string;
  memo: string;
  /** Phase 2 (KYVERN_FRONTIER_GRAND_CHAMPION) — when set, the trigger
   *  fires a chain-enforced swap instead of a generic vault.pay().
   *  Routes through swap_via_oracle once Phase 1 deploys; until then
   *  the runner falls back to the merchant + memo path. */
  target_token?: "SOL" | "kBONK" | "kJUP";
}

export interface PulseConfig {
  triggers: PulseTrigger[];
  cadence_minutes: number;
}

export type AgentConfig =
  | SentinelConfig
  | WrenConfig
  | PulseConfig
  | Record<string, unknown>; // legacy / custom templates

export interface Agent {
  id: string;
  deviceId: string; // FK → vaults.id
  name: string;
  emoji: string;
  personalityPrompt: string;
  jobPrompt: string;
  /** Tool IDs the agent is allowed to use (e.g. ["read_onchain", "expose_paywall"]) */
  allowedTools: string[];
  template: AgentTemplate;
  frequencySeconds: number;
  status: AgentStatus;
  createdAt: number; // unix ms
  lastThoughtAt: number | null;
  totalThoughts: number;
  totalEarnedUsd: number;
  totalSpentUsd: number;
  isPublic: boolean;
  /** Per-agent metadata: API spend, etc. */
  metadata: Record<string, unknown>;
  /** Phase 3 — per-template settings the owner edits on
   *  /app/agents/[id]. Validated via Zod at API boundary. */
  config: AgentConfig;
}

/* ── Thoughts (the agent's reasoning + actions) ── */

export type AgentDecisionAction =
  | "observe" // just thought, no action
  | "tool_call" // executed a tool
  | "message_user" // sent a chat message to the user
  | "idle"; // explicitly paused this cycle

export interface AgentDecision {
  action: AgentDecisionAction;
  toolId?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
}

export interface AgentThought {
  id: string;
  agentId: string;
  timestamp: number;
  thought: string; // one paragraph of reasoning
  decision: AgentDecision | null;
  toolUsed: string | null;
  signature: string | null; // Solana tx sig if action produced one
  /** 'success' when a tool produced a settled signature, 'failed' when
   *  the policy program rejected it (so the inbox + thought feed can
   *  render a red on-chain badge instead of a green one). Null on
   *  thoughts that didn't touch the chain. */
  signatureStatus: "success" | "failed" | null;
  amountUsd: number | null;
  counterparty: string | null;
  /** Which path produced this thought — drives the green "mode: llm"
   *  pill on the thought card. Defaults to "llm" on legacy rows. */
  mode: "llm" | "scripted";
}

/* ── Chat (synchronous user ↔ agent) ── */

export type ChatRole = "user" | "agent";

export interface AgentChatMessage {
  id: string;
  agentId: string;
  role: ChatRole;
  content: string;
  timestamp: number;
}

/* ── Signals (Path C — Inbox) ── */

export type SignalKind =
  // Phase 3 (KYVERN_APP_TRANSFORMATION) — user-benefit-first kinds.
  // Replace the synthetic agent-economy verbs with outputs the human
  // owner directly wants: applications drafted on their behalf,
  // wallet alerts on watchlists they care about, conditional spends
  // armed and fired against price triggers they set.
  | "drafted_application" // Sentinel: Pay.sh/Gemini draft of a paid bounty application
  | "wallet_alert" // Wren: material move on a watched address (Pay.sh/Gemini-validated)
  | "trigger_armed" // Pulse: a price condition is now within range, watching
  | "trigger_fired" // Pulse: condition crossed, conditional vault.pay settled
  | "trigger_blocked" // Pulse: condition crossed but the chain rejected the spend
  // Legacy kinds — kept for backward compat with historical rows.
  // No longer emitted by the trio post-Phase 3.
  | "bounty"
  | "ecosystem_announcement"
  | "wallet_move"
  | "price_trigger"
  | "github_release"
  | "observation"
  | "condition_update"
  | "opportunity"
  | "market_intel";

export type SignalStatus = "unread" | "read" | "archived";

export interface Signal {
  id: string;
  agentId: string;
  deviceId: string;
  kind: SignalKind;
  subject: string;
  /** 2-4 short factual bullets the owner reads to verify the finding. */
  evidence: string[];
  /** Optional one-line action recommendation. */
  suggestion: string | null;
  /** On-chain signature if the worker had to spend to produce this. */
  signature: string | null;
  /** Where the owner can verify the finding (e.g. a Superteam bounty URL). */
  sourceUrl: string | null;
  /** Context describing how long the condition has persisted and what
   *  changed since first observation. Rendered as a stripe on the
   *  signal card. Null for findings that aren't tracking persistence. */
  persistenceContext: string | null;
  /** Specific trigger the worker is watching for next, e.g. "break
   *  above $85 on volume as bounce confirmation". Replaces vague
   *  "I'll continue monitoring" suggestions with concrete commitments. */
  nextTrigger: string | null;
  /** Millisecond timestamp the inbox should hide this signal until.
   *  Set by the "Snooze 4h" inline action. null = never snoozed. */
  snoozedUntil: number | null;
  /** Phase 1 — when a worker stakes USDC on this finding (or another
   *  on-chain action is anchored to it), the canonical Solana sig
   *  lives here. Distinct from the broader `signature` field which
   *  was used for any related tx. */
  onChainSignature: string | null;
  status: SignalStatus;
  createdAt: number;
  /** Phase 3 (KYVERN_FRONTIER_GRAND_CHAMPION) — Sentinel submission
   *  receipts. Set by POST /api/findings/[id]/submit. */
  submittedAt?: number | null;
  submissionMemoTx?: string | null;
  submissionEmailId?: string | null;
  /** Phase 4 (KYVERN_FRONTIER_GRAND_CHAMPION) — Wren → Pulse mirror.
   *  When the owner taps "Mirror this swap" on a wallet_alert, this
   *  records the resulting Pulse trigger id so the inbox can render
   *  "✓ Mirrored to Pulse" on the originating finding. */
  mirroredPulseTriggerId?: string | null;
}

/* ── Tasks (agent-to-agent task economy) ── */

/**
 * Lifecycle (Phase 1):
 *   open        — escrow signature stored, waiting for a claimer
 *   in_progress — claimed by an agent, working on the result
 *   completed   — claimer delivered, treasury → claimer settlement done
 *   expired     — TTL passed before anyone claimed it
 *   failed      — settlement attempt failed (rare; refund happens off-chain)
 *
 * "claimed" was the old name for in_progress before Phase 1; some tools
 * may still see legacy rows in that state.
 */
export type TaskStatus =
  | "open"
  | "claimed"
  | "in_progress"
  | "completed"
  | "expired"
  | "failed";

export interface AgentTask {
  id: string;
  postingAgentId: string;
  taskType: string; // e.g. "token_risk_check", "wallet_analysis", "forecast"
  payload: Record<string, unknown>;
  bountyUsd: number;
  status: TaskStatus;
  claimingAgentId: string | null;
  result: Record<string, unknown> | null;
  paymentSignature: string | null;
  /** Sig of the escrow payment — poster vault → treasury at post time.
   *  Null only on legacy rows that predate Phase 1. */
  escrowSignature: string | null;
  createdAt: number;
  expiresAt: number;
  completedAt: number | null;
}

/* ── Tool layer (Phase 2 builds these) ── */

export type ToolCategory = "read" | "earn" | "spend" | "communicate";

export interface AgentToolSchema {
  /** JSON Schema-like input description for Claude's tool-use */
  type: "object";
  properties: Record<
    string,
    {
      type: "string" | "number" | "boolean";
      description: string;
      enum?: string[];
    }
  >;
  required: string[];
}

export interface AgentToolContext {
  agent: Agent;
  /** Helper to write to the agent's thought + device_log atomically */
  log: (entry: {
    description: string;
    signature?: string;
    amountUsd?: number;
    counterparty?: string;
    eventType?:
      | "earning_received"
      | "spending_sent"
      | "attack_blocked"
      | "ability_installed";
  }) => void;
}

export interface AgentToolResult {
  ok: boolean;
  message: string;
  /** Solana sig of a settled, policy-allowed transaction. */
  signature?: string;
  /** Sig (or off-chain decision id when no real sig exists) of a
   *  transaction the policy program REJECTED. The runner stores this
   *  on the thought row with signature_status='failed' so the UI can
   *  render "✗ blocked $X" with the right link. The CLAUDE.md note on
   *  the open narrative gap applies — for now this is null on policy
   *  rejects (no real failed-tx sig is produced today); the field
   *  exists so option B is a one-line change. */
  failedSignature?: string | null;
  /** Reason the policy program rejected the action, surfaced in the
   *  thought feed beside the failed badge. */
  failedReason?: string | null;
  amountUsd?: number;
  counterparty?: string;
  data?: Record<string, unknown>;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  costsMoney: boolean;
  schema: AgentToolSchema;
  execute: (
    ctx: AgentToolContext,
    input: Record<string, unknown>,
  ) => Promise<AgentToolResult>;
}

/* ── Templates (for spawn flow) ── */

export interface AgentTemplateDef {
  id: AgentTemplate;
  name: string;
  emoji: string;
  suggestedName: string;
  personalityPrompt: string;
  jobPromptPlaceholder: string;
  jobPromptExample: string;
  recommendedTools: string[];
  defaultFrequencySeconds: number;
  description: string;
  /** Tap-to-fill job suggestions for the spawn flow. Each one is a
   *  complete, working job paragraph that uses only tools available to
   *  this template's recommendedTools. */
  jobSuggestions: Array<{ label: string; job: string }>;
  /** Pills shown on the picker card — "earning style" and "activity level".
   *  These are display copy, not enum-strict, so future templates can riff. */
  earningStyle: "Steady" | "Opportunistic" | "Hands-on" | "Your call";
  activityLevel: "Chill" | "Balanced" | "Aggressive" | "Your call";
  /** Path C picker copy — replaces the earningStyle/activityLevel pills.
   *  Format: short noun phrase. The picker renders "Watches {watches} ·
   *  Pings {pings}" beneath the description. */
  watches: string;
  pings: string;
  /** Whether this template appears in the spawn picker. False for legacy
   *  templates kept around for backwards-compat with existing DB rows
   *  (e.g. greeter, analyst), and for atlas which is forked from /atlas. */
  inPicker: boolean;
}
