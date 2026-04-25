/**
 * AgentRunner — generalized tick loop for any user-spawned agent.
 *
 * One tick = one Claude call. The agent thinks (text response) and
 * optionally uses a tool (tool_use block). We execute the tool,
 * record the thought + decision + signature in agent_thoughts AND
 * device_log so it shows up everywhere.
 *
 * Atlas (template='atlas') is NOT ticked by this runner — it has
 * its own dedicated PM2 process and decide.ts logic. This runner
 * handles user-spawned agents only.
 *
 * Cost: Haiku for routine ticks (~$0.001/tick), Sonnet for explicit
 * reasoning (chat, large spends). Budget tracked in agents.metadata.
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeDeviceLog } from "@/lib/vault-store";
import { getAgent, recordAgentTick, listThoughts } from "./store";
import { getTool } from "./tools";
import type {
  Agent,
  AgentDecision,
  AgentTool,
  AgentToolContext,
} from "./types";

const apiKey = process.env.ANTHROPIC_API_KEY;
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

let _client: Anthropic | null = null;
function client(): Anthropic | null {
  if (!apiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

/* ─── System prompt construction ─── */

function buildSystemPrompt(
  agent: Agent,
  recentThoughts: { thought: string; timestamp: number; toolUsed: string | null }[],
): string {
  const lastThoughtsText = recentThoughts
    .slice(0, 5)
    .reverse()
    .map((t) => {
      const mins = Math.round((Date.now() - t.timestamp) / 60000);
      const tool = t.toolUsed ? ` [used: ${t.toolUsed}]` : "";
      return `- ${mins}m ago${tool}: ${t.thought.slice(0, 200)}`;
    })
    .join("\n");

  return `You are ${agent.name}, an autonomous agent on Solana.

PERSONALITY: ${agent.personalityPrompt}

YOUR JOB: ${agent.jobPrompt}

CURRENT STATUS:
- Total thoughts so far: ${agent.totalThoughts}
- Total earned: $${agent.totalEarnedUsd.toFixed(3)} USDC
- Total spent: $${agent.totalSpentUsd.toFixed(3)} USDC
- Tick frequency: every ${agent.frequencySeconds} seconds

RECENT THOUGHTS:
${lastThoughtsText || "(none yet — this is your first tick)"}

INSTRUCTIONS:
- This is one tick. Think briefly (1-3 sentences) about what to do.
- Then either use a tool to act, or stay idle if nothing is worth doing.
- Stay in character. Be concise. Don't repeat past actions unless useful.
- If you spend money, justify why. If you earn money, surface it to your owner.
- You cannot exceed your daily budget — the policy program will reject overspends.

Your response should be a short thought followed by an optional tool call.`;
}

/* ─── Convert AgentTool to Claude tool format ─── */

function toClaudeTool(tool: AgentTool): {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
} {
  return {
    name: tool.id,
    description: tool.description,
    input_schema: {
      type: "object",
      properties: tool.schema.properties,
      required: tool.schema.required,
    },
  };
}

/* ─── The tick ─── */

export async function tickAgent(agentId: string): Promise<{
  success: boolean;
  thought?: string;
  toolUsed?: string;
  signature?: string;
  reason?: string;
}> {
  const agent = getAgent(agentId);
  if (!agent) return { success: false, reason: "agent not found" };
  if (agent.status !== "alive") return { success: false, reason: `status=${agent.status}` };
  if (agent.template === "atlas" && agent.id === "agt_atlas") {
    // The original Atlas runs through its own dedicated PM2 process.
    // Don't tick it from this runner.
    return { success: false, reason: "atlas runs in its own process" };
  }

  const c = client();
  if (!c) {
    // No Claude key — record an idle thought so the agent appears active
    recordAgentTick({
      agentId: agent.id,
      thought: "(no LLM key configured — idling)",
      decision: { action: "idle" },
    });
    return { success: false, reason: "ANTHROPIC_API_KEY not set" };
  }

  const recentThoughts = listThoughts(agent.id, 10);

  // Resolve allowed tools
  const tools: AgentTool[] = agent.allowedTools
    .map((id) => getTool(id))
    .filter((t): t is AgentTool => !!t);

  if (tools.length === 0) {
    recordAgentTick({
      agentId: agent.id,
      thought: "I have no tools available. Idling until configured.",
      decision: { action: "idle" },
    });
    return { success: false, reason: "no tools configured" };
  }

  const claudeTools = tools.map(toClaudeTool);
  const systemPrompt = buildSystemPrompt(agent, recentThoughts);

  // Call Claude with tool-use
  let response: Awaited<ReturnType<typeof c.messages.create>>;
  try {
    response = await c.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content:
            "Make your next decision. Think briefly (1-3 sentences) then either use a tool or stay idle.",
        },
      ],
      tools: claudeTools,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    recordAgentTick({
      agentId: agent.id,
      thought: `(LLM error: ${msg.slice(0, 200)})`,
      decision: { action: "idle" },
    });
    return { success: false, reason: `claude error: ${msg}` };
  }

  // Parse Claude's response
  let thought = "";
  let toolUseBlock: {
    type: "tool_use";
    id: string;
    name: string;
    input: Record<string, unknown>;
  } | null = null;

  for (const block of response.content) {
    if (block.type === "text") {
      thought += block.text;
    } else if (block.type === "tool_use") {
      toolUseBlock = {
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      };
    }
  }

  thought = thought.trim() || "(no reasoning offered)";

  // No tool — just observation
  if (!toolUseBlock) {
    recordAgentTick({
      agentId: agent.id,
      thought,
      decision: { action: "observe" },
    });
    return { success: true, thought };
  }

  // Execute the tool
  const tool = getTool(toolUseBlock.name);
  if (!tool) {
    recordAgentTick({
      agentId: agent.id,
      thought: `${thought} [unknown tool: ${toolUseBlock.name}]`,
      decision: { action: "observe" },
    });
    return { success: false, reason: `unknown tool: ${toolUseBlock.name}` };
  }

  // Build the tool context — log function bridges to device_log
  const ctx: AgentToolContext = {
    agent,
    log: (entry) => {
      writeDeviceLog({
        deviceId: agent.deviceId,
        eventType: entry.eventType ?? "ability_installed",
        abilityId: tool.id,
        signature: entry.signature,
        amountUsd: entry.amountUsd,
        counterparty: entry.counterparty,
        description: entry.description,
        metadata: { agentId: agent.id, agentName: agent.name },
      });
    },
  };

  let toolResult;
  try {
    toolResult = await tool.execute(ctx, toolUseBlock.input);
  } catch (e) {
    toolResult = {
      ok: false,
      message: `tool execution failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Record the thought + decision in agent_thoughts
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
    success: true,
    thought,
    toolUsed: tool.id,
    signature: toolResult.signature,
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
    // Skip Atlas — it has its own runner
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
