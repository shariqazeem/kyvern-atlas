/**
 * Step graph executor — the orchestrator.
 *
 * Walks an AgentGraph's steps in order, dispatching leaf steps to
 * their type-specific executors and handling branch + loop inline.
 *
 * Per-step lifecycle:
 *   1. budget gate    — abort run if cost ceiling reached
 *   2. interpolate    — config strings get vars substituted (already
 *                       handled inside each leaf executor)
 *   3. execute        — leaf executor runs, returns StepExecutionResult
 *   4. record output  — append StepOutput to ctx.outputs, bind var
 *   5. error policy   — fail | skip | continue per step.onError
 *
 * The executor is pure orchestration. It doesn't write to agent_runs
 * directly — the caller (a manual /run endpoint or pool-tick wiring)
 * owns the run row + persistence. The executor mutates ctx in place
 * and returns a final RunContext.
 *
 * One of the explicit non-goals: parallel branches. v1 is strictly
 * sequential. If a user wants concurrency they author multiple
 * agents.
 */

import { randomUUID } from "crypto";
import { evaluateExpression } from "./expression";
import { resolvePath } from "./interpolate";
import { executeHttp } from "./steps/http";
import { executeLlm } from "./steps/llm";
import { executeLog } from "./steps/log";
import { executeTransferUsdc, executeVaultPay } from "./steps/pay";
import type {
  AgentGraph,
  RunContext,
  StepDef,
  StepExecutionResult,
  StepOutput,
} from "./types";

/* ─── Public entry ──────────────────────────────────────────── */

export interface RunGraphInput {
  graph: AgentGraph;
  agentId: string;
  vaultId: string;
  ownerWallet: string;
  triggerKind: AgentGraph["trigger"]["kind"];
  /** Optional payload passed in from the trigger (webhook body,
   *  manual run inputs). Available as `trigger.payload.*`. */
  triggerPayload: Record<string, unknown> | null;
}

/** Run the graph end-to-end. Always resolves (never rejects) — any
 *  fatal error is captured in ctx.abortReason + the last step's
 *  StepOutput.error. The caller persists the result. */
export async function runGraph(
  input: RunGraphInput,
): Promise<RunContext> {
  const ctx: RunContext = {
    runId: randomUUID(),
    agentId: input.agentId,
    vaultId: input.vaultId,
    ownerWallet: input.ownerWallet,
    triggerKind: input.triggerKind,
    vars: {
      trigger: { kind: input.triggerKind, payload: input.triggerPayload ?? {} },
      vault: { id: input.vaultId, ownerWallet: input.ownerWallet },
    },
    outputs: [],
    costUsd: 0,
    abortReason: null,
  };

  await runSteps(input.graph, input.graph.steps, ctx);

  return ctx;
}

/* ─── Recursive driver ───────────────────────────────────────── */

async function runSteps(
  graph: AgentGraph,
  steps: StepDef[],
  ctx: RunContext,
): Promise<void> {
  for (const step of steps) {
    // Cost ceiling check (per-run cap)
    if (
      graph.config.maxCostPerRunUsd > 0 &&
      ctx.costUsd >= graph.config.maxCostPerRunUsd
    ) {
      ctx.abortReason = "aborted_budget";
      ctx.outputs.push(makeAbortedOutput(step, "cost ceiling reached"));
      return;
    }
    // Bail if a previous step already marked the run aborted
    if (ctx.abortReason) return;

    if (step.type === "branch") {
      await runBranchStep(graph, step, ctx);
      continue;
    }
    if (step.type === "loop") {
      await runLoopStep(graph, step, ctx);
      continue;
    }

    // Leaf step
    await runLeafStep(step, ctx);
    if (ctx.abortReason) return;
  }
}

/* ─── Leaf dispatch ──────────────────────────────────────────── */

async function runLeafStep(step: StepDef, ctx: RunContext): Promise<void> {
  const startedAt = Date.now();
  let result: StepExecutionResult;
  try {
    result = await dispatchLeaf(step, ctx);
  } catch (e) {
    result = {
      ok: false,
      output: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
  const finishedAt = Date.now();

  // Record the output regardless of success/failure
  const output: StepOutput = {
    stepId: step.id,
    type: step.type,
    label: step.label,
    startedAt,
    finishedAt,
    status: result.ok ? "succeeded" : "failed",
    output: result.output,
    error: result.error ?? null,
    signature: result.signature ?? null,
    signatureStatus: result.signatureStatus ?? null,
    costUsd: result.costUsd ?? 0,
  };
  ctx.outputs.push(output);
  ctx.costUsd += output.costUsd;

  // Bind output var for later steps (only on success — failures
  // don't pollute the var bag unless onError='continue').
  if (result.ok && "outputVar" in step && step.outputVar) {
    ctx.vars[step.outputVar] = result.output;
  } else if (
    !result.ok &&
    "outputVar" in step &&
    step.outputVar &&
    step.onError === "continue"
  ) {
    ctx.vars[step.outputVar] = null;
  }

  // Apply onError policy
  if (!result.ok) {
    const policy = step.onError ?? "fail";
    if (policy === "fail") {
      ctx.abortReason = "failed";
    }
    // skip / continue: do nothing — runSteps will move to the next step
  }
}

async function dispatchLeaf(
  step: StepDef,
  ctx: RunContext,
): Promise<StepExecutionResult> {
  switch (step.type) {
    case "log":
      return executeLog(ctx, step.config);
    case "http":
      return executeHttp(ctx, step.config);
    case "llm":
      return executeLlm(ctx, step.config);
    case "vault.pay":
      return executeVaultPay(ctx, step.config);
    case "transfer.usdc":
      return executeTransferUsdc(ctx, step.config);
    default:
      // branch + loop are handled by their dedicated runners; this
      // path means the discriminated-union widened beyond expectation.
      return {
        ok: false,
        output: null,
        error: `unhandled step type: ${(step as { type: string }).type}`,
      };
  }
}

/* ─── Branch ─────────────────────────────────────────────────── */

async function runBranchStep(
  graph: AgentGraph,
  step: Extract<StepDef, { type: "branch" }>,
  ctx: RunContext,
): Promise<void> {
  const startedAt = Date.now();
  let chosen: "then" | "else";
  let error: string | null = null;
  try {
    chosen = evaluateExpression(step.config.condition, ctx.vars) ? "then" : "else";
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    chosen = "else"; // fallback to else on bad condition (don't crash)
  }
  const subSteps = chosen === "then" ? step.config.then : step.config.else;
  ctx.outputs.push({
    stepId: step.id,
    type: "branch",
    label: step.label,
    startedAt,
    finishedAt: Date.now(),
    status: error ? "failed" : "succeeded",
    output: { chosen, condition: step.config.condition },
    error,
    signature: null,
    signatureStatus: null,
    costUsd: 0,
  });
  if (error && (step.onError ?? "fail") === "fail") {
    ctx.abortReason = "failed";
    return;
  }
  await runSteps(graph, subSteps, ctx);
}

/* ─── Loop ───────────────────────────────────────────────────── */

async function runLoopStep(
  graph: AgentGraph,
  step: Extract<StepDef, { type: "loop" }>,
  ctx: RunContext,
): Promise<void> {
  const loopStart = Date.now();
  const itemsResolution = resolvePath(ctx.vars, step.config.items);
  if (!itemsResolution.found || !Array.isArray(itemsResolution.value)) {
    ctx.outputs.push({
      stepId: step.id,
      type: "loop",
      label: step.label,
      startedAt: loopStart,
      finishedAt: Date.now(),
      status: "failed",
      output: null,
      error: `loop.items "${step.config.items}" did not resolve to an array`,
      signature: null,
      signatureStatus: null,
      costUsd: 0,
    });
    if ((step.onError ?? "fail") === "fail") ctx.abortReason = "failed";
    return;
  }
  const items = itemsResolution.value as unknown[];
  const cap = Math.min(step.config.maxIterations, items.length);
  const itemVar = step.config.itemVar;
  const indexVar = `${itemVar}_index`;
  const savedItem = ctx.vars[itemVar];
  const savedIndex = ctx.vars[indexVar];

  let iterations = 0;
  for (let i = 0; i < cap; i++) {
    if (ctx.abortReason) break;
    ctx.vars[itemVar] = items[i];
    ctx.vars[indexVar] = i;
    await runSteps(graph, step.config.body, ctx);
    iterations++;
  }

  // Restore prior bindings (loop scope is local)
  if (savedItem === undefined) delete ctx.vars[itemVar];
  else ctx.vars[itemVar] = savedItem;
  if (savedIndex === undefined) delete ctx.vars[indexVar];
  else ctx.vars[indexVar] = savedIndex;

  ctx.outputs.push({
    stepId: step.id,
    type: "loop",
    label: step.label,
    startedAt: loopStart,
    finishedAt: Date.now(),
    status: ctx.abortReason ? "failed" : "succeeded",
    output: { iterations, capped: items.length > cap },
    error: null,
    signature: null,
    signatureStatus: null,
    costUsd: 0,
  });
}

/* ─── Helpers ────────────────────────────────────────────────── */

function makeAbortedOutput(step: StepDef, reason: string): StepOutput {
  return {
    stepId: step.id,
    type: step.type,
    label: step.label,
    startedAt: Date.now(),
    finishedAt: Date.now(),
    status: "skipped",
    output: null,
    error: reason,
    signature: null,
    signatureStatus: null,
    costUsd: 0,
  };
}
