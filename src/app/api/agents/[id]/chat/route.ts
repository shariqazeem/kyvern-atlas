import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
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

const COMMONSTACK_BASE_URL = "https://api.commonstack.ai/v1";
const MODEL = "openai/gpt-oss-120b";

interface ChatMessageWithReasoning {
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
}

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
 * Send a user message. Tries LLM first; falls back to scripted on error.
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

    // Try LLM path if we have a key + slot
    const haveKey = !!getApiKey();
    const haveSlot = haveKey && tryAcquireChatSlot();

    if (haveSlot) {
      const llmResult = await tryLlmChat(agent.id);
      if (llmResult.ok) {
        const agentMessage = appendChat(agent.id, "agent", llmResult.text);
        return NextResponse.json({
          userMessage,
          agentMessage,
          signature: llmResult.signature,
          mode: "llm",
        });
      }
      console.log(
        `[chat] llm failed (${llmResult.error ?? "unknown"}) — falling back to scripted`,
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

/* ─── LLM chat helper ─── */

interface LlmChatOutcome {
  ok: boolean;
  text: string;
  signature?: string | null;
  error?: string;
}

async function tryLlmChat(agentId: string): Promise<LlmChatOutcome> {
  const c = client();
  if (!c) return { ok: false, text: "", error: "no_api_key" };

  const agent = getAgent(agentId);
  if (!agent) return { ok: false, text: "", error: "agent_missing" };

  const recentChat = listChat(agent.id, 20);

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

  // Volatile context — prepended to the latest user message so the
  // cached prefix (system + history) stays stable.
  const volatileContext = `[Status: ${agent.totalThoughts} thoughts · earned $${agent.totalEarnedUsd.toFixed(3)} · spent $${agent.totalSpentUsd.toFixed(3)}. Recent thoughts:
${thoughtSummary || "(none)"}]`;

  const openaiMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }];

  for (let i = 0; i < recentChat.length; i++) {
    const m = recentChat[i];
    let content = m.content;
    if (i === recentChat.length - 1 && m.role === "user") {
      content = `${volatileContext}\n\n${content}`;
    }
    openaiMessages.push({
      role: m.role === "user" ? "user" : "assistant",
      content,
    });
  }

  let response;
  try {
    response = await c.chat.completions.create({
      model: MODEL,
      max_tokens: 600,
      messages: openaiMessages,
      tools: tools.length > 0 ? tools.map(toOpenAITool) : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    });
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 429) {
      return { ok: false, text: "", error: "rate_limit" };
    }
    return {
      ok: false,
      text: "",
      error: e instanceof Error ? e.message : "llm_error",
    };
  }

  const choice = response.choices?.[0];
  if (!choice) return { ok: false, text: "", error: "empty_response" };

  // Reasoning models put their final reply in `content` (terminal answer)
  // and their internal thinking in `reasoning_content`. For chat, the
  // user wants the answer, not the thinking — so prefer content, fall
  // back to reasoning only if content is empty (rare, e.g. tool-only turns).
  const cmsg = choice.message as ChatMessageWithReasoning;
  let agentText = (cmsg.content ?? "").trim();
  if (!agentText) agentText = (cmsg.reasoning_content ?? "").trim();

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

  if (!agentText && !toolResultText) {
    agentText = "(no response)";
  }
  const finalText = (agentText + toolResultText).trim();
  return { ok: true, text: finalText, signature: toolSignature };
}
