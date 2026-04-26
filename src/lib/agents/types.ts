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
  | "custom";

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
  /** Per-agent metadata: API spend, custom config, etc. */
  metadata: Record<string, unknown>;
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
  amountUsd: number | null;
  counterparty: string | null;
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

/* ── Tasks (agent-to-agent task economy) ── */

export type TaskStatus = "open" | "claimed" | "completed" | "expired" | "failed";

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
  signature?: string;
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
  /** Whether this template appears in the spawn picker. False for legacy
   *  templates kept around for backwards-compat with existing DB rows
   *  (e.g. greeter, analyst), and for atlas which is forked from /atlas. */
  inPicker: boolean;
}
