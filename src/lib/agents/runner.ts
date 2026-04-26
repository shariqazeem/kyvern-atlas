/**
 * AgentRunner — dual-mode tick loop.
 *
 * Path A (preferred): DeepSeek V4 flash via Commonstack (OpenAI-compatible).
 *   Used when COMMONSTACK_API_KEY is set AND a rate-limit slot is available.
 *   Cached prefix (stable system prompt + tool schemas) keeps token cost low.
 *
 * Path B (fallback): Scripted decisions per template (see scripted.ts).
 *   Used when no key, rate-limited, or LLM errors. Same output shape.
 *   Tool execution path is identical — both paths produce real signatures.
 *
 * Atlas (template='atlas') is NOT ticked here — it has its own dedicated
 * PM2 process and decide.ts logic. Defensive guard included.
 */

import OpenAI from "openai";
import { writeDeviceLog } from "@/lib/vault-store";
import {
  getAgent,
  recordAgentTick,
  listThoughts,
} from "./store";
import { getTool } from "./tools";
import { tryAcquireTickSlot } from "./rate-limit";
import { scriptedTick } from "./scripted";
import type {
  Agent,
  AgentDecision,
  AgentTool,
  AgentToolContext,
} from "./types";

const COMMONSTACK_BASE_URL = "https://api.commonstack.ai/v1";
// v4-flash is in the catalog but blocked at the API layer for our account
// (works in playground, returns 403 "no accessible providers" via REST).
// v3.2 is the next-cheapest fully-accessible DeepSeek with tool-use support.
const MODEL = "deepseek/deepseek-v3.2";

let _client: OpenAI | null = null;
function getApiKey(): string | undefined {
  return process.env.COMMONSTACK_API_KEY;
}
function client(): OpenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  if (!_client) {
    _client = new OpenAI({ apiKey, baseURL: COMMONSTACK_BASE_URL });
  }
  return _client;
}

/* ─── Build tool ctx (used by both paths) ─── */

function buildToolContext(agent: Agent): AgentToolContext {
  return {
    agent,
    log: (entry) => {
      writeDeviceLog({
        deviceId: agent.deviceId,
        eventType: entry.eventType ?? "ability_installed",
        abilityId: undefined,
        signature: entry.signature,
        amountUsd: entry.amountUsd,
        counterparty: entry.counterparty,
        description: entry.description,
        metadata: { agentId: agent.id, agentName: agent.name },
      });
    },
  };
}

/* ─── LLM path ─── */

function buildSystemPrompt(agent: Agent): string {
  // STABLE prefix — gets cached automatically by DeepSeek prefix-match.
  // No timestamps, no per-request data.
  return `You are ${agent.name}, an autonomous agent on Solana.

PERSONALITY: ${agent.personalityPrompt}

YOUR JOB: ${agent.jobPrompt}

INSTRUCTIONS:
- Each tick is one decision. Think briefly (1-3 sentences), then either use a tool or stay idle.
- Stay in character. Be concise. Don't repeat past actions.
- Tools that cost money cannot exceed your daily budget — the policy program enforces this on-chain.
- If you spend money, justify why. If you earn, surface it to your owner via message_user.`;
}

function buildContextMessage(
  agent: Agent,
  recentThoughts: { thought: string; timestamp: number; toolUsed: string | null }[],
): string {
  // VOLATILE part — user message, after the cached prefix.
  const lastThoughtsText = recentThoughts
    .slice(0, 5)
    .reverse()
    .map((t) => {
      const mins = Math.round((Date.now() - t.timestamp) / 60000);
      const tool = t.toolUsed ? ` [used: ${t.toolUsed}]` : "";
      return `- ${mins}m ago${tool}: ${t.thought.slice(0, 200)}`;
    })
    .join("\n");

  return `Current status:
- Total thoughts: ${agent.totalThoughts}
- Earned: $${agent.totalEarnedUsd.toFixed(3)} · Spent: $${agent.totalSpentUsd.toFixed(3)}
- Tick frequency: every ${agent.frequencySeconds}s

Recent thoughts:
${lastThoughtsText || "(none — first tick)"}

Make your next decision. Brief reasoning + optional tool call.`;
}

function toOpenAITool(tool: AgentTool) {
  return {
    type: "function" as const,
    function: {
      name: tool.id,
      description: tool.description,
      parameters: {
        type: "object",
        properties: tool.schema.properties,
        required: tool.schema.required ?? [],
      },
    },
  };
}

interface LlmTickOutcome {
  ok: boolean;
  thought?: string;
  toolUsed?: string;
  signature?: string;
  rateLimited?: boolean;
  error?: string;
}

async function llmTick(agent: Agent, ctx: AgentToolContext): Promise<LlmTickOutcome> {
  const c = client();
  if (!c) return { ok: false, error: "no_api_key" };

  const tools: AgentTool[] = agent.allowedTools
    .map((id) => getTool(id))
    .filter((t): t is AgentTool => !!t);

  if (tools.length === 0) return { ok: false, error: "no_tools" };

  const recentThoughts = listThoughts(agent.id, 10);
  const systemPrompt = buildSystemPrompt(agent);
  const userMessage = buildContextMessage(agent, recentThoughts);

  let response;
  try {
    response = await c.chat.completions.create({
      model: MODEL,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      tools: tools.map(toOpenAITool),
      tool_choice: "auto",
    });
  } catch (e) {
    // Detect rate limit / status 429
    const status = (e as { status?: number })?.status;
    if (status === 429) {
      return { ok: false, rateLimited: true, error: "rate_limit" };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  // Parse response
  const choice = response.choices?.[0];
  if (!choice) return { ok: false, error: "empty_response" };

  let thought = (choice.message?.content ?? "").trim();

  let toolUseBlock: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  } | null = null;

  const toolCalls = choice.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    const call = toolCalls[0];
    if (call.type === "function") {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(call.function.arguments || "{}");
      } catch {
        parsed = {};
      }
      toolUseBlock = {
        id: call.id,
        name: call.function.name,
        input: parsed,
      };
    }
  }

  if (!thought) thought = "(no reasoning offered)";

  // No tool — observe only
  if (!toolUseBlock) {
    recordAgentTick({
      agentId: agent.id,
      thought,
      decision: { action: "observe" },
    });
    return { ok: true, thought };
  }

  // Execute tool
  const tool = getTool(toolUseBlock.name);
  if (!tool) {
    recordAgentTick({
      agentId: agent.id,
      thought: `${thought} [unknown tool: ${toolUseBlock.name}]`,
      decision: { action: "observe" },
    });
    return { ok: true, thought };
  }

  let toolResult;
  try {
    toolResult = await tool.execute(ctx, toolUseBlock.input);
  } catch (e) {
    toolResult = {
      ok: false,
      message: `tool execution failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const decision: AgentDecision = {
    action: "tool_call",
    toolId: tool.id,
    toolInput: toolUseBlock.input,
    toolResult,
  };

  recordAgentTick({
    agentId: agent.id,
    thought,
    decision,
    signature: toolResult.signature ?? null,
    amountUsd: toolResult.amountUsd ?? null,
    counterparty: toolResult.counterparty ?? null,
  });

  return {
    ok: true,
    thought,
    toolUsed: tool.id,
    signature: toolResult.signature,
  };
}

/* ─── Scripted path wrapper ─── */

async function scriptedTickWrapper(agent: Agent, ctx: AgentToolContext) {
  const result = await scriptedTick(agent, ctx);

  recordAgentTick({
    agentId: agent.id,
    thought: result.thought,
    decision: result.decision,
    signature: result.toolResult?.signature ?? null,
    amountUsd: result.toolResult?.amountUsd ?? null,
    counterparty: result.toolResult?.counterparty ?? null,
  });

  return {
    ok: true,
    thought: result.thought,
    toolUsed: result.decision.toolId,
    signature: result.toolResult?.signature,
  };
}

/* ─── Public tick API ─── */

export async function tickAgent(agentId: string): Promise<{
  success: boolean;
  thought?: string;
  toolUsed?: string;
  signature?: string;
  reason?: string;
  mode?: "llm" | "scripted";
}> {
  const agent = getAgent(agentId);
  if (!agent) return { success: false, reason: "agent not found" };
  if (agent.status !== "alive")
    return { success: false, reason: `status=${agent.status}` };
  if (agent.template === "atlas" && agent.id === "agt_atlas") {
    return { success: false, reason: "atlas runs in its own process" };
  }

  const ctx = buildToolContext(agent);

  // Try LLM path first if key + rate-limit slot
  const haveKey = !!getApiKey();
  const haveSlot = haveKey && tryAcquireTickSlot();

  if (haveSlot) {
    const llm = await llmTick(agent, ctx);

    // Success → return
    if (llm.ok) {
      return {
        success: true,
        thought: llm.thought,
        toolUsed: llm.toolUsed,
        signature: llm.signature,
        mode: "llm",
      };
    }

    // Rate limited or error → fall through to scripted (don't waste the tick)
    console.log(
      `[runner] llm path failed (${llm.error ?? "unknown"}) — falling back to scripted for ${agent.id}`,
    );
  }

  // Scripted fallback (also: when no key, no slot, or llm errored)
  const scripted = await scriptedTickWrapper(agent, ctx);
  return {
    success: scripted.ok,
    thought: scripted.thought,
    toolUsed: scripted.toolUsed ?? undefined,
    signature: scripted.signature,
    mode: "scripted",
  };
}

/* ─── Pool tick — called by the agent-pool worker ─── */

export async function tickEligibleAgents(): Promise<{
  ticked: number;
  errors: number;
}> {
  const { listAliveAgents } = await import("./store");
  const agents = listAliveAgents();
  const now = Date.now();

  let ticked = 0;
  let errors = 0;

  for (const agent of agents) {
    if (agent.template === "atlas" && agent.id === "agt_atlas") continue;

    const dueAt = (agent.lastThoughtAt ?? 0) + agent.frequencySeconds * 1000;
    if (now < dueAt) continue;

    try {
      const result = await tickAgent(agent.id);
      if (result.success) ticked++;
      else errors++;
    } catch (e) {
      console.error(`[agent-pool] tick failed for ${agent.id}:`, e);
      errors++;
    }
  }

  return { ticked, errors };
}
