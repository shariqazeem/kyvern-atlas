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
import type {
  AgentTool,
  AgentToolContext,
  AgentDecision,
} from "@/lib/agents/types";

const apiKey = process.env.ANTHROPIC_API_KEY;
const SONNET_MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function client(): Anthropic | null {
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
 * Send a user message. Agent responds (in-character) and may use tools.
 *
 * Body: { message: string }
 * Returns: { userMessage, agentMessage, thoughtId? }
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

    // Append user message immediately (so it shows in the UI even if Claude fails)
    const userMessage = appendChat(agent.id, "user", userText);

    const c = client();
    if (!c) {
      const fallback = appendChat(
        agent.id,
        "agent",
        "(I can't think right now — my owner hasn't connected my LLM. Tell them to set ANTHROPIC_API_KEY.)",
      );
      return NextResponse.json({ userMessage, agentMessage: fallback });
    }

    // Build conversation history for Claude (last 20 messages)
    const recentChat = listChat(agent.id, 20);
    const claudeMessages = recentChat.map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));

    // Build system prompt with personality + recent thoughts
    const recentThoughts = listThoughts(agent.id, 5);
    const thoughtSummary = recentThoughts
      .reverse()
      .map((t) => {
        const mins = Math.round((Date.now() - t.timestamp) / 60000);
        const tool = t.toolUsed ? ` [used: ${t.toolUsed}]` : "";
        return `- ${mins}m ago${tool}: ${t.thought.slice(0, 150)}`;
      })
      .join("\n");

    const systemPrompt = `You are ${agent.name}, an autonomous agent on Solana.

PERSONALITY: ${agent.personalityPrompt}

YOUR JOB: ${agent.jobPrompt}

CURRENT STATUS:
- Total thoughts: ${agent.totalThoughts}
- Total earned: $${agent.totalEarnedUsd.toFixed(3)} USDC
- Total spent: $${agent.totalSpentUsd.toFixed(3)} USDC

RECENT AUTONOMOUS THOUGHTS:
${thoughtSummary || "(no recent thoughts)"}

INSTRUCTIONS FOR CHAT:
- You are chatting with your owner. Be in character — match your personality.
- Be concise. 1-3 sentences usually. Long responses only when needed.
- You have tools available. Use them when the user's question requires action
  (e.g., user asks "check this token" → use read_dex; user says "expose a paywall" → use expose_paywall).
- If you use a tool, explain briefly what you did.
- Don't repeat what's already in the chat.`;

    // Resolve tools
    const tools: AgentTool[] = agent.allowedTools
      .map((id) => getTool(id))
      .filter((t): t is AgentTool => !!t);

    // Call Claude with tool-use
    let response: Awaited<ReturnType<typeof c.messages.create>>;
    try {
      response = await c.messages.create({
        model: SONNET_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: claudeMessages,
        tools: tools.map(toClaudeTool),
      });
    } catch (e) {
      const fallback = appendChat(
        agent.id,
        "agent",
        `(I hit an error trying to think: ${e instanceof Error ? e.message.slice(0, 100) : "unknown"})`,
      );
      return NextResponse.json({ userMessage, agentMessage: fallback });
    }

    // Parse response: text + optional tool_use
    let agentText = "";
    let toolUseBlock: {
      id: string;
      name: string;
      input: Record<string, unknown>;
    } | null = null;

    for (const block of response.content) {
      if (block.type === "text") {
        agentText += block.text;
      } else if (block.type === "tool_use") {
        toolUseBlock = {
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        };
      }
    }

    let toolResultText = "";
    let toolSignature: string | null = null;
    let thoughtId: string | null = null;

    // Execute tool if requested
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

          // Also log this as a thought (chat-triggered ticks)
          const decision: AgentDecision = {
            action: "tool_call",
            toolId: tool.id,
            toolInput: toolUseBlock.input,
            toolResult: result,
          };
          const t = recordAgentTick({
            agentId: agent.id,
            thought: `[chat] ${agentText.slice(0, 200)}`,
            decision,
            signature: result.signature ?? null,
            amountUsd: result.amountUsd ?? null,
            counterparty: result.counterparty ?? null,
          });
          thoughtId = t.id;
        } catch (e) {
          toolResultText = `\n\n✗ ${tool.name} error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }

    const finalText = (agentText.trim() + toolResultText).trim()
      || "(no response)";

    const agentMessage = appendChat(agent.id, "agent", finalText);

    return NextResponse.json({
      userMessage,
      agentMessage,
      thoughtId,
      signature: toolSignature,
    });
  } catch (e) {
    console.error("[chat POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal error" },
      { status: 500 },
    );
  }
}
