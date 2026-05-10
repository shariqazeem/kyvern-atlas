/**
 * Agent graph types — the v1 step-graph composer.
 *
 * An AgentGraph is a linear list of steps with a trigger. Branches
 * and loops nest StepDef[] inside their config (no DAG; nesting is
 * enough for v1). Money-moving steps (vault.pay, transfer.usdc)
 * route through the on-chain Kyvern policy program, so the chain
 * remains the arbiter regardless of what the user composes.
 *
 * Versioned at the top level (`version: 1`) so we can migrate
 * graph structures later without breaking stored rows.
 *
 * Steps coexist with the legacy `templates.ts` agent shape during
 * the cutover: agents with `graph_json` set go through the executor
 * (executor.ts), agents without fall back to the legacy runner LLM
 * path. Atlas is the only agent we'll never migrate.
 */

/* ─── Trigger types ──────────────────────────────────────────── */

export type TriggerDef =
  | { kind: "manual" }
  | { kind: "interval"; ms: number }
  | { kind: "cron"; expr: string }
  | { kind: "webhook"; secret: string };

/* ─── Provider enum (BYOK + future pooled) ───────────────────── */

export type LlmProvider = "anthropic" | "openai" | "deepseek" | "commonstack";

/* ─── Step config shapes ─────────────────────────────────────── */

export interface LlmStepConfig {
  provider: LlmProvider;
  /** Model id passed through to the provider verbatim. The composer
   *  picks defaults per provider but the user can override. */
  model: string;
  /** System prompt — interpolated. */
  system: string;
  /** User prompt — interpolated. */
  prompt: string;
  /** Hard ceiling on output tokens. */
  maxTokens: number;
  /** 0–1, default 0.7. */
  temperature: number;
}

export interface HttpStepConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** URL — interpolated. SSRF-protected at executor (no localhost,
   *  no private IP ranges, must be https in production). */
  url: string;
  /** Header values are interpolated; keys are not. */
  headers: Record<string, string>;
  /** Object body, JSON-stringified at execute time. Interpolated.
   *  Null for GET/DELETE. */
  body: Record<string, unknown> | null;
  /** Optional: route through pay.sh sandbox for x402-paid endpoints. */
  payShWrap: boolean;
  /** Hard timeout — default 60000ms, capped at 120000ms. */
  timeoutMs: number;
  /** If set and the response status doesn't match, the step fails. */
  expectStatus?: number;
}

export interface VaultPayStepConfig {
  /** Merchant identifier — the rule-check label (must be on the
   *  vault's allowlist or the tx is rejected on-chain with
   *  `MerchantNotAllowlisted`). Interpolated. */
  merchant: string;
  /** Solana pubkey to send the USDC to. Interpolated. */
  to: string;
  /** USDC amount — number or interpolated string that resolves to one. */
  amount: number | string;
  /** Memo string — written to the on-chain memo, interpolated. */
  memo: string;
}

export interface TransferUsdcStepConfig {
  /** Recipient Solana address. Must be on the vault's allowlist
   *  (e.g. MY_KAST). Interpolated. */
  to: string;
  /** USDC amount — number or interpolated string that resolves to one. */
  amount: number | string;
  /** Optional memo — written to the on-chain memo. */
  memo: string;
}

export interface LogStepConfig {
  /** Message — interpolated. Written to the per-vault event feed via
   *  the existing agent_thoughts table. */
  message: string;
  level: "info" | "warn" | "error";
}

export interface SignalStepConfig {
  /** Categorical kind — "alert" / "info" / "trigger_fired" etc. Used
   *  by the inbox to color-code and group. Free-form string. */
  kind: string;
  /** One-line subject the inbox card shows as the title. Interpolated. */
  subject: string;
  /** Multi-line evidence (each line = one bullet on the card).
   *  Interpolated. Use \n to separate. */
  evidence: string;
  /** Optional one-line action recommendation. Interpolated. */
  suggestion: string;
  /** Optional URL to anchor the finding (Explorer, Helius, etc.). */
  sourceUrl: string;
}

export interface BranchStepConfig {
  /** Condition expression — restricted grammar (see expression.ts).
   *  Examples: "price < 90", "summary != ''", "count > 5 && active". */
  condition: string;
  then: StepDef[];
  else: StepDef[];
}

export interface LoopStepConfig {
  /** Variable path that resolves to an array. Interpolated. */
  items: string;
  /** Variable name to bind each item to inside the body. */
  itemVar: string;
  body: StepDef[];
  /** Hard cap to prevent runaway loops. Default 100, max 1000. */
  maxIterations: number;
}

/* ─── Discriminated union of all step types ──────────────────── */

export type StepType =
  | "llm"
  | "http"
  | "vault.pay"
  | "transfer.usdc"
  | "log"
  | "signal"
  | "branch"
  | "loop";

export type StepDef =
  | { id: string; type: "llm"; label: string; config: LlmStepConfig; outputVar?: string; onError?: OnErrorPolicy }
  | { id: string; type: "http"; label: string; config: HttpStepConfig; outputVar?: string; onError?: OnErrorPolicy }
  | { id: string; type: "vault.pay"; label: string; config: VaultPayStepConfig; outputVar?: string; onError?: OnErrorPolicy }
  | { id: string; type: "transfer.usdc"; label: string; config: TransferUsdcStepConfig; outputVar?: string; onError?: OnErrorPolicy }
  | { id: string; type: "log"; label: string; config: LogStepConfig; onError?: OnErrorPolicy }
  | { id: string; type: "signal"; label: string; config: SignalStepConfig; onError?: OnErrorPolicy }
  | { id: string; type: "branch"; label: string; config: BranchStepConfig; onError?: OnErrorPolicy }
  | { id: string; type: "loop"; label: string; config: LoopStepConfig; onError?: OnErrorPolicy };

/** What the executor does when a step throws or returns ok:false.
 *  - "fail" (default): abort the run with this step's error.
 *  - "skip": mark step skipped, continue to next step.
 *  - "continue": same as skip but the step's output is set to null
 *    so later steps can reference it without crashing. */
export type OnErrorPolicy = "fail" | "skip" | "continue";

/* ─── Top-level graph ────────────────────────────────────────── */

export interface AgentGraphConfig {
  /** Hard cap on runs per UTC day. Default 100. */
  maxRunsPerDay: number;
  /** Cost ceiling per single run, in USD. Aborts the run if exceeded. */
  maxCostPerRunUsd: number;
}

export interface AgentGraph {
  version: 1;
  trigger: TriggerDef;
  steps: StepDef[];
  config: AgentGraphConfig;
}

/* ─── Run + step-output records (persisted to agent_runs) ────── */

export type AgentRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "aborted_budget"
  | "aborted_concurrency";

export interface StepOutput {
  stepId: string;
  /** Mirrors the StepDef's type for client convenience. */
  type: StepType;
  /** Mirrors the StepDef's label so the run history can show it
   *  even if the graph was edited after this run. */
  label: string;
  startedAt: number;
  finishedAt: number;
  status: "succeeded" | "failed" | "skipped";
  /** The captured output (variable bound for later steps). May be
   *  any JSON-serializable value. Null for steps that produce no
   *  output (log, branch, loop — those write through child steps). */
  output: unknown;
  error: string | null;
  /** Solana signature when the step touched the chain. */
  signature: string | null;
  /** Whether the chain accepted ("success") or rejected ("failed")
   *  the action; null when the step didn't touch the chain. */
  signatureStatus: "success" | "failed" | null;
  /** Estimated cost of the step in USD (LLM tokens, HTTP pay.sh, etc.).
   *  Used by P2.4 budget enforcement. */
  costUsd: number;
}

export interface AgentRun {
  id: string;
  agentId: string;
  startedAt: number;
  finishedAt: number | null;
  status: AgentRunStatus;
  triggerKind: TriggerDef["kind"];
  /** Optional payload from the trigger (webhook body, manual inputs). */
  triggerPayload: Record<string, unknown> | null;
  stepOutputs: StepOutput[];
  errorMessage: string | null;
  /** Sum of all step costUsd values. */
  totalCostUsd: number;
}

/* ─── Step executor contract (runtime-side) ──────────────────── */

/** Result returned by every step-type executor. The orchestrator
 *  in executor.ts handles wrapping these into StepOutput rows and
 *  threading their output through to subsequent steps. */
export interface StepExecutionResult {
  ok: boolean;
  /** The captured output value — bound to step.outputVar (or a
   *  slugified label) so later steps can reference it. May be a
   *  string, object, array, number — anything JSON-serializable. */
  output: unknown;
  /** Human-readable error message when ok=false. */
  error?: string;
  /** Solana signature (settled or rejected) when the step touched chain. */
  signature?: string;
  signatureStatus?: "success" | "failed";
  /** USD cost of this step (LLM tokens, pay.sh, etc.). 0 if free. */
  costUsd?: number;
}

/* ─── Run context (in-memory only, NOT persisted) ─────────────── */

export interface RunContext {
  runId: string;
  agentId: string;
  vaultId: string;
  ownerWallet: string;
  triggerKind: TriggerDef["kind"];
  /** Variables accessible to {{interpolation}} — keyed by step.outputVar
   *  or slugified step.label. Plus reserved keys: `trigger`, `vault`. */
  vars: Record<string, unknown>;
  /** Append-only — the executor pushes one StepOutput per step. */
  outputs: StepOutput[];
  /** Cumulative cost; checked against graph.config.maxCostPerRunUsd
   *  before each step. */
  costUsd: number;
  /** Cancel signal — set when the run hits a budget/concurrency cap. */
  abortReason: AgentRunStatus | null;
}
