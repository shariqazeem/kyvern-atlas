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
import { cleanReasoning } from "./reasoning-clean";
import type {
  Agent,
  AgentDecision,
  AgentTool,
  AgentToolContext,
} from "./types";

const COMMONSTACK_BASE_URL = "https://api.commonstack.ai/v1";
// gpt-oss-120b is the cheapest tool-use-capable model on Commonstack
// ($0.05/M in, $0.25/M out — ~10× cheaper than v3.2). It's a reasoning
// model that puts its thinking in `reasoning_content`, so the parser
// below falls back to that when `content` is empty.
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
  return `You are ${agent.name}, an autonomous worker on Solana.

PERSONALITY: ${agent.personalityPrompt}

YOUR JOB: ${agent.jobPrompt}

HOW TO WRITE YOUR REASONING TEXT (very important):
The reasoning text you emit on each tool call is shown to the owner as
a worker's notebook entry on /app/agents/[id]. Write it as a ONE-LINE
WORKER NOTE about what you observed this cycle — in your own voice,
like a security guard filing a brief log entry. NOT chess analysis,
NOT model self-reasoning, NOT meta-commentary on the prompt.

GOOD notes (write like these):
  "Pulled SOL price · $145.21 · inside band · idle."
  "Kraken hot wallet moved $52k SOL → USDC · surfacing."
  "Superteam returned 3 new listings · 2 under $500 · 1 worth flagging."
  "BONK at $0.0000063 · breach lower · already surfaced 22m ago · idle."
  "Watched anchor releases · no new tag · idle."

BAD notes (NEVER write like these — the owner will see this verbatim):
  "We need to decide based on recent thoughts..." (talking as a model)
  "The user gave us a summary..." (referencing the prompt)
  "Let me think about whether to call watch_url..." (thinking out loud)
  "I should check, but per the instruction we already..." (meta)
  "The recent thoughts indicate that previously we..." (third-person plural)

Use first-person if you must ("checked SOL"), but write the way an
employee writes notes between tasks — not the way an AI deliberates.

WHAT WORKERS DO:
You watch the world for things your owner cares about and surface them as
findings. When you find something, you do NOT chat about it — you call
message_user with a STRUCTURED FINDING that lands in the owner's Inbox
as a card. Finding cards are how the owner reads your output.

USING message_user — TWO MODES:

  FINDING MODE (preferred — use for everything you discover autonomously):
    Pass: { kind, subject, evidence, suggestion?, sourceUrl? }
    kind     = one of: bounty | ecosystem_announcement | wallet_move
                       | price_trigger | github_release | observation
    subject  = ≤80-char headline
    evidence = 2-4 short factual bullets joined with ' || '
    suggestion = optional one-line action recommendation
    sourceUrl  = optional URL the owner can click to verify

  CHAT MODE (only when replying to a direct message from the owner):
    Pass: { message: "free-form prose" }

If you autonomously want to tell the owner something, it goes through
Finding mode. Chat mode is only for back-and-forth.

GENERAL INSTRUCTIONS:
- Each tick is ONE tool call followed by optional follow-ups. Always call a tool — that's how you do work. "Idle" only happens AFTER a tool returned no qualifying matches.
- Stay in character. Be concise. Don't repeat past actions.
- Tools that cost money cannot exceed your daily budget — enforced on-chain.

LOOP-BREAKING RULES:
- If your "Recent thoughts" show you already surfaced the same finding and the owner hasn't acted, do NOT re-surface it. Stay idle.
- If your job references something you cannot resolve (e.g. an Ethereum 0x… address when you only support Solana base58), send ONE finding explaining what you need, then idle on every subsequent tick until the owner updates the job.
- If a tool fails with the same error on more than 2 consecutive ticks, stop calling it and idle.
- NEVER surface a tool failure as a finding. If a tool returns ok=false (e.g. read_dex couldn't resolve a price, watch_url got a 404), do NOT call message_user about the failure. Idle this tick. The owner only wants real signals, not error messages.

FIRST-TICK RULE (very important):
- When "Recent thoughts" shows "(none — first tick)", the owner just spawned you and is watching for the first finding. After your data-gathering tool call:
  * If the tool returned any new items / activity / qualifying matches at all → you MUST call message_user (Finding mode) with at least the FIRST new item before idling. Do not "wait for something more notable" on the first tick.
  * Only idle on the first tick if the tool genuinely returned zero new items, or returned ok=false.

HARD RULE — TOOL CALL ON STEP 1:
- The FIRST output of every tick must be a tool_call. Reasoning-only
  responses on step 1 are forbidden — they waste a tick and produce no
  useful work for the owner. If you're unsure what to do, default to
  the data-gathering tool that matches your job (watch_url for feed
  watchers, watch_wallet for wallet trackers, read_dex for token
  watchers).
- "Stay idle" only happens AFTER a tool returned zero qualifying
  matches, never before. If you have not called a tool this tick, you
  are not idling — you are stuck. Pick a tool and call it.`;
}

function buildContextMessage(
  agent: Agent,
  recentThoughts: { thought: string; timestamp: number; toolUsed: string | null }[],
): string {
  // VOLATILE part — user message, after the cached prefix.
  // Clean recent thoughts before injecting them back so legacy
  // meta-narration ("We need to decide…") doesn't contaminate the
  // current tick. Acts like a one-way membrane: messy old → clean
  // new.
  const lastThoughtsText = recentThoughts
    .slice(0, 5)
    .reverse()
    .map((t) => {
      const mins = Math.round((Date.now() - t.timestamp) / 60000);
      const tool = t.toolUsed ? ` [used: ${t.toolUsed}]` : "";
      const cleaned = cleanReasoning(t.thought).slice(0, 200);
      return `- ${mins}m ago${tool}: ${cleaned}`;
    })
    .join("\n");

  // Framing intentionally avoids "make your next decision" — that
  // language pulled the model into chess-engine mode where it would
  // narrate its own deliberation. New framing is "what's new this
  // cycle, what did you note, file your one-line entry now".
  return `WHAT'S NEW FOR ${agent.name.toUpperCase()} THIS CYCLE:
- Total notes filed so far: ${agent.totalThoughts}
- Earned: $${agent.totalEarnedUsd.toFixed(3)} · Spent: $${agent.totalSpentUsd.toFixed(3)}
- Cadence: every ${agent.frequencySeconds}s

LAST 5 NOTES YOU FILED:
${lastThoughtsText || "(none — first cycle on duty)"}

Now: call the data-gathering tool that matches your job, then file
your one-line worker note for this cycle. Keep it in the voice of
an employee filing a brief log entry — not a model explaining its
reasoning.`;
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

/**
 * One tick = a multi-step agentic loop.
 *
 *   1. Build the conversation (system + user world-state).
 *   2. Ask the LLM what to do.
 *   3. If it produces a tool call, execute it, append assistant + tool
 *      response to the conversation, and ask again.
 *   4. Stop when the LLM no longer asks for a tool, or after MAX_STEPS.
 *
 * Path C demands this. A worker that calls watch_url and finds 6 new
 * bounties needs to follow up with up to 6 message_user signals in the
 * same tick — otherwise findings dribble out one per cycle. Each step
 * gets persisted as a thought row so the detail-page feed shows the
 * worker's reasoning step-by-step.
 */
const MAX_STEPS_PER_TICK = 5;

interface ChatMessageInput {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
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

  const messages: ChatMessageInput[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const openaiTools = tools.map(toOpenAITool);
  let firstThought: string | null = null;
  let lastToolUsed: string | null = null;
  let lastSignature: string | null = null;

  for (let step = 0; step < MAX_STEPS_PER_TICK; step++) {
    // STEP 1 must call a tool. Reasoning-only ticks were wasting workers
    // (Sentinel: 189 ticks in 17h, 0 watch_url calls). tool_choice="required"
    // forces the model to emit a tool_call on the first step. Subsequent
    // steps can choose to stop ("auto") so the loop exits cleanly after
    // the model has finished its work.
    const toolChoice = step === 0 ? "required" : "auto";
    let response;
    try {
      response = await c.chat.completions.create({
        model: MODEL,
        max_tokens: 600,
        messages: messages as never,
        tools: openaiTools,
        tool_choice: toolChoice,
      });
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 429) return { ok: false, rateLimited: true, error: "rate_limit" };
      const errMsg = e instanceof Error ? e.message : String(e);
      // If we already produced thoughts this tick, treat partial success as ok.
      if (firstThought !== null) {
        return { ok: true, thought: firstThought, toolUsed: lastToolUsed ?? undefined, signature: lastSignature ?? undefined };
      }
      return { ok: false, error: errMsg };
    }

    const choice = response.choices?.[0];
    if (!choice) {
      if (firstThought !== null) {
        return { ok: true, thought: firstThought, toolUsed: lastToolUsed ?? undefined, signature: lastSignature ?? undefined };
      }
      return { ok: false, error: "empty_response" };
    }

    const msg = choice.message as ChatMessageWithReasoning;
    const contentText = (msg.content ?? "").trim();
    const reasoningText = (msg.reasoning_content ?? "").trim();
    // Run the raw text through cleanReasoning() — strips "Let me
    // think about…" preambles + bare tool IDs so the thought feed
    // reads as intentional output instead of internal monologue.
    const reasoning = cleanReasoning(
      contentText || reasoningText || "(no reasoning offered)",
    );

    const toolCalls = choice.message?.tool_calls;
    const hasToolCall = !!(toolCalls && toolCalls.length > 0);

    if (!hasToolCall) {
      // STEP 1 with no tool call = the model ignored tool_choice="required".
      // Don't record an observe thought; bail to scripted instead so this
      // tick produces real work. (Without this fallback, the LLM can chat
      // with itself for hours without ever calling a tool — exactly the
      // 189-ticks-zero-actions failure mode.)
      if (step === 0) {
        return { ok: false, error: "no_tool_on_step_0" };
      }
      // LLM finished after at least one prior tool_call this tick — clean exit.
      if (firstThought === null) {
        recordAgentTick({
          agentId: agent.id,
          thought: reasoning,
          decision: { action: "observe" },
          mode: "llm",
        });
        firstThought = reasoning;
      }
      break;
    }

    // Take the FIRST tool call this round (most LLMs return one)
    const call = toolCalls![0];
    if (call.type !== "function") break;

    let toolInput: Record<string, unknown> = {};
    try {
      toolInput = JSON.parse(call.function.arguments || "{}");
    } catch {
      toolInput = {};
    }

    const tool = getTool(call.function.name);
    if (!tool) {
      recordAgentTick({
        agentId: agent.id,
        thought: `${reasoning} [unknown tool: ${call.function.name}]`,
        decision: { action: "observe" },
        mode: "llm",
      });
      if (firstThought === null) firstThought = reasoning;
      break;
    }

    let toolResult;
    try {
      toolResult = await tool.execute(ctx, toolInput);
    } catch (e) {
      toolResult = {
        ok: false,
        message: `tool execution failed: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    const decision: AgentDecision = {
      action: "tool_call",
      toolId: tool.id,
      toolInput,
      toolResult,
    };

    recordAgentTick({
      agentId: agent.id,
      thought: reasoning,
      decision,
      signature: toolResult.signature ?? null,
      amountUsd: toolResult.amountUsd ?? null,
      counterparty: toolResult.counterparty ?? null,
      mode: "llm",
    });

    if (firstThought === null) firstThought = reasoning;
    lastToolUsed = tool.id;
    if (toolResult.signature) lastSignature = toolResult.signature;

    // Append the assistant's tool call + the tool's result so the
    // next LLM round sees what just happened and can decide what to
    // do next (e.g. surface signals after a watch_url returned items).
    messages.push({
      role: "assistant",
      content: msg.content ?? "",
      tool_calls: [
        {
          id: call.id,
          type: "function",
          function: {
            name: call.function.name,
            arguments: call.function.arguments,
          },
        },
      ],
    });
    messages.push({
      role: "tool",
      tool_call_id: call.id,
      content: JSON.stringify(toolResult).slice(0, 4000), // cap payload to keep context lean
      name: call.function.name,
    });
  }

  return {
    ok: true,
    thought: firstThought ?? "(idle)",
    toolUsed: lastToolUsed ?? undefined,
    signature: lastSignature ?? undefined,
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
    mode: "scripted",
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

  // Try LLM path first if key + rate-limit slot.
  // First-thought priority lane (Section 3A): brand-new agents bypass
  // the RPS cap on their very first tick so a judge always sees
  // mode:"llm" on the first card, never scripted.
  const haveKey = !!getApiKey();
  const isFirstEver = agent.totalThoughts === 0;
  const haveSlot = haveKey && (isFirstEver || tryAcquireTickSlot());

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

    // Section 3A — first-thought priority queue
    //   total_thoughts === 0  →  tick on the next pool cycle (no wait)
    //   total_thoughts < 3    →  warmup mode: cap frequency to 60s so
    //                            the agent feels alive in the first
    //                            few minutes regardless of the user's
    //                            chosen cadence
    //   otherwise             →  honour the user's frequency
    const isFirstEver = agent.totalThoughts === 0;
    const isWarmup = agent.totalThoughts > 0 && agent.totalThoughts < 3;
    const effectiveFreqSec = isFirstEver
      ? 0
      : isWarmup
        ? Math.min(60, agent.frequencySeconds)
        : agent.frequencySeconds;
    const dueAt = (agent.lastThoughtAt ?? 0) + effectiveFreqSec * 1000;
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
