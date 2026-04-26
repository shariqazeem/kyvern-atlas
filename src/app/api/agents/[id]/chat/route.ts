import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  getAgent,
  appendChat,
  listChat,
  listThoughts,
  recordAgentTick,
} from "@/lib/agents/store";
import { getTool } from "@/lib/agents/tools";
import { writeDeviceLog } from "@/lib/vault-store";
import { tryAcquireChatSlot } from "@/lib/agents/rate-limit";
import { scriptedChatResponse } from "@/lib/agents/scripted";
import type {
  AgentTool,
  AgentToolContext,
  AgentDecision,
} from "@/lib/agents/types";

const SONNET_MODEL = "claude-sonnet-4-6";

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

/**
 * GET /api/agents/[id]/chat
 * Returns recent chat messages.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10),
      200,
    );
    const messages = listChat(params.id, limit);
    return NextResponse.json({ messages });
  } catch (e) {
    console.error("[chat GET]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

/**
 * POST /api/agents/[id]/chat
 * Send a user message. Tries Claude first; falls back to scripted.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await req.json()) as { message?: string };
    const userText = String(body.message ?? "").trim();
    if (!userText) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const agent = getAgent(params.id);
    if (!agent) {
      return NextResponse.json({ error: "agent not found" }, { status: 404 });
    }

    const userMessage = appendChat(agent.id, "user", userText);

    // Try Claude path if we have a key + slot
    const haveKey = !!getApiKey();
    const haveSlot = haveKey && tryAcquireChatSlot();

    if (haveSlot) {
      const claudeResult = await tryClaudeChat(agent.id);
      if (claudeResult.ok) {
        const agentMessage = appendChat(agent.id, "agent", claudeResult.text);
        return NextResponse.json({
          userMessage,
          agentMessage,
          signature: claudeResult.signature,
          mode: "claude",
        });
      }
      console.log(
        `[chat] claude failed (${claudeResult.error ?? "unknown"}) — falling back to scripted`,
      );
    }

    // Scripted fallback
    const scriptedText = scriptedChatResponse(agent, userText);
    const agentMessage = appendChat(agent.id, "agent", scriptedText);
    return NextResponse.json({
      userMessage,
      agentMessage,
      mode: "scripted",
    });
  } catch (e) {
    console.error("[chat POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal error" },
      { status: 500 },
    );
  }
}

/* ─── Claude chat helper ─── */

interface ClaudeChatOutcome {
  ok: boolean;
  text: string;
  signature?: string | null;
  error?: string;
}

async function tryClaudeChat(
  agentId: string,
): Promise<ClaudeChatOutcome> {
  const c = client();
  if (!c) return { ok: false, text: "", error: "no_api_key" };

  const agent = getAgent(agentId);
  if (!agent) return { ok: false, text: "", error: "agent_missing" };

  const recentChat = listChat(agent.id, 20);
  const claudeMessages = recentChat.map((m) => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));

  const recentThoughts = listThoughts(agent.id, 5);
  const thoughtSummary = recentThoughts
    .reverse()
    .map((t) => {
      const mins = Math.round((Date.now() - t.timestamp) / 60000);
      const tool = t.toolUsed ? ` [used: ${t.toolUsed}]` : "";
      return `- ${mins}m ago${tool}: ${t.thought.slice(0, 150)}`;
    })
    .join("\n");

  // STABLE prefix gets cached
  const systemPrompt = `You are ${agent.name}, an autonomous agent on Solana.

PERSONALITY: ${agent.personalityPrompt}

YOUR JOB: ${agent.jobPrompt}

INSTRUCTIONS FOR CHAT:
- You're chatting with your owner. Match your personality.
- Be concise — 1-3 sentences usually.
- Use tools when the user's question requires action.
- If you use a tool, briefly explain what you did.`;

  const tools: AgentTool[] = agent.allowedTools
    .map((id) => getTool(id))
    .filter((t): t is AgentTool => !!t);

  // Inject volatile context as a synthetic user message before the actual message
  const volatileContext = `[Status: ${agent.totalThoughts} thoughts · earned $${agent.totalEarnedUsd.toFixed(3)} · spent $${agent.totalSpentUsd.toFixed(3)}. Recent thoughts:
${thoughtSummary || "(none)"}]`;

  // Prepend the volatile context to the most recent user message (claudeMessages[-1])
  // so the cached prefix stays stable.
  const messagesWithContext = [...claudeMessages];
  if (messagesWithContext.length > 0) {
    const last = messagesWithContext[messagesWithContext.length - 1];
    if (last.role === "user") {
      messagesWithContext[messagesWithContext.length - 1] = {
        role: "user",
        content: `${volatileContext}\n\n${last.content}`,
      };
    }
  }

  let response;
  try {
    response = await c.messages.create({
      model: SONNET_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: messagesWithContext,
      tools: tools.map(toClaudeTool),
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, text: "", error: "rate_limit" };
    }
    return {
      ok: false,
      text: "",
      error: e instanceof Error ? e.message : "claude_error",
    };
  }

  // Parse response
  let agentText = "";
  let toolUseBlock: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  } | null = null;

  for (const block of response.content) {
    if (block.type === "text") agentText += block.text;
    else if (block.type === "tool_use") {
      toolUseBlock = {
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      };
    }
  }

  let toolResultText = "";
  let toolSignature: string | null = null;

  if (toolUseBlock) {
    const tool = getTool(toolUseBlock.name);
    if (tool) {
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
            metadata: { agentId: agent.id, source: "chat" },
          });
        },
      };

      try {
        const result = await tool.execute(ctx, toolUseBlock.input);
        toolResultText = `\n\n${result.ok ? "✓" : "✗"} ${tool.name}: ${result.message}`;
        if (result.signature) toolSignature = result.signature;

        const decision: AgentDecision = {
          action: "tool_call",
          toolId: tool.id,
          toolInput: toolUseBlock.input,
          toolResult: result,
        };
        recordAgentTick({
          agentId: agent.id,
          thought: `[chat] ${agentText.slice(0, 200)}`,
          decision,
          signature: result.signature ?? null,
          amountUsd: result.amountUsd ?? null,
          counterparty: result.counterparty ?? null,
        });
      } catch (e) {
        toolResultText = `\n\n✗ ${tool.name} error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
  }

  const finalText = (agentText.trim() + toolResultText).trim() || "(no response)";
  return { ok: true, text: finalText, signature: toolSignature };
}
