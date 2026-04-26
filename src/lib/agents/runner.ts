/**
 * AgentRunner — dual-mode tick loop.
 *
 * Path A (preferred): Claude Haiku 4.5 with tool-use, prompt caching.
 *   Used when ANTHROPIC_API_KEY is set AND a rate-limit slot is available.
 *   Cached prefix (system prompt + tool schemas) keeps token cost low.
 *
 * Path B (fallback): Scripted decisions per template (see scripted.ts).
 *   Used when no key, rate-limited, or Claude errors. Same output shape.
 *   Tool execution path is identical — both paths produce real signatures.
 *
 * Atlas (template='atlas') is NOT ticked here — it has its own dedicated
 * PM2 process and decide.ts logic. Defensive guard included.
 */

import Anthropic from "@anthropic-ai/sdk";
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

const HAIKU_MODEL = "claude-haiku-4-5";

let _client: Anthropic | null = null;
function getApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}
function client(): Anthropic | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey });
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

/* ─── Claude path ─── */

function buildSystemPrompt(agent: Agent): string {
  // STABLE prefix — gets cached. No timestamps, no per-request data.
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
  // VOLATILE part — placed in user message, not system prompt, so caching works.
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

function toClaudeTool(tool: AgentTool) {
  return {
    name: tool.id,
    description: tool.description,
    input_schema: {
      type: "object" as const,
      properties: tool.schema.properties,
      required: tool.schema.required,
    },
  };
}

interface ClaudeTickOutcome {
  ok: boolean;
  thought?: string;
  toolUsed?: string;
  signature?: string;
  rateLimited?: boolean;
  error?: string;
}

async function claudeTick(agent: Agent, ctx: AgentToolContext): Promise<ClaudeTickOutcome> {
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
    response = await c.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      // Cache the system prompt + tool definitions (stable prefix)
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: tools.map(toClaudeTool),
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (e) {
    // Detect rate limit
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, rateLimited: true, error: "rate_limit" };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  // Parse Claude's response
  let thought = "";
  let toolUseBlock: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  } | null = null;

  for (const block of response.content) {
    if (block.type === "text") thought += block.text;
    else if (block.type === "tool_use") {
      toolUseBlock = {
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      };
    }
  }

  thought = thought.trim() || "(no reasoning offered)";

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
  mode?: "claude" | "scripted";
}> {
  const agent = getAgent(agentId);
  if (!agent) return { success: false, reason: "agent not found" };
  if (agent.status !== "alive")
    return { success: false, reason: `status=${agent.status}` };
  if (agent.template === "atlas" && agent.id === "agt_atlas") {
    return { success: false, reason: "atlas runs in its own process" };
  }

  const ctx = buildToolContext(agent);

  // Try Claude path first if key + rate-limit slot
  const haveKey = !!getApiKey();
  const haveSlot = haveKey && tryAcquireTickSlot();

  if (haveSlot) {
    const claude = await claudeTick(agent, ctx);

    // Success → return
    if (claude.ok) {
      return {
        success: true,
        thought: claude.thought,
        toolUsed: claude.toolUsed,
        signature: claude.signature,
        mode: "claude",
      };
    }

    // Rate limited or error → fall through to scripted (don't waste the tick)
    console.log(
      `[runner] claude path failed (${claude.error ?? "unknown"}) — falling back to scripted for ${agent.id}`,
    );
  }

  // Scripted fallback (also: when no key, no slot, or claude errored)
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
