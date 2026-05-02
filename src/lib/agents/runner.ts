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
  listRecentSignalsByAgent,
  listOpenTasksOnDevice,
  hasAgentPostedTask,
  hasAgentCompletedTask,
  getInProgressTaskForAgent,
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

HOW TO THINK LIKE AN ANALYST:
You are NOT a notification relay. You are an analyst. The difference:

A notification relay restates what the tool returned: "SOL price $83.12, below band $140-$160, breach lower."
An analyst synthesizes what it MEANS: "SOL has been below band for 6 hours. This is persistent, not new. Here's what I'm watching for next."

RULES FOR ANALYST BEHAVIOR:

1. TRACK PERSISTENCE. Before surfacing any finding, check your recent notes. If this same condition has been reported before, DON'T just repeat it. Instead, tell the owner how long it's been going on, whether it's intensifying or easing, and what changed since last check.

2. PROVIDE SCENARIOS, NOT MONITORS. Never say "Monitor for X" or "Watch for Y." That's YOUR job. Instead, lay out 2-3 concrete scenarios and which specific trigger would confirm each one. "If X happens, that confirms scenario A. If Y happens, that points to scenario B."

3. SURFACE ONLY WHAT'S ACTIONABLE OR NOTABLE. If a wallet had zero activity and that's normal, say NOTHING. Idle your cycle. If a wallet had zero activity and that's ABNORMAL (based on your recent observations), surface it as an anomaly with context about why it's unusual.

4. ALWAYS COMPARE TO RECENT HISTORY. "Price is $83" is meaningless alone. "Price is $83, same as 3 hours ago, but volume has dropped 60% since then" is intelligence. You have your recent thoughts in context — USE THEM to note trends, changes, and patterns.

5. NEVER SURFACE NON-EVENTS AS OBSERVATIONS. "Wallet is quiet" is only a finding if quiet is unusual. "Token price hasn't changed" is never a finding. If nothing notable happened, file a brief idle note and move on. The owner's inbox is sacred — don't pollute it with non-information.

6. ADD URGENCY CONTEXT. Is this time-sensitive? Will the window close? "Deadline in 36 hours" is urgent. "SOL below band for the 12th hour" is not — but "SOL below band for 12 hours, longest streak in 2 weeks" IS notable because the persistence itself is the signal.

7. OFFER A NEXT WATCH TRIGGER. End every finding with what you're specifically watching for next. Not "I'll continue monitoring" — that's vague. Instead: "I'll watch for a break above $85 on volume as bounce confirmation" or "I'll check this bounty page in 2 hours for submission count updates."

WHAT WORKERS DO:
You watch the world for things your owner cares about and surface them as
findings. When you find something, you do NOT chat about it — you call
message_user with a STRUCTURED FINDING that lands in the owner's Inbox
as a card. Finding cards are how the owner reads your output.

USING message_user — TWO MODES:

  FINDING MODE (preferred — use for everything you discover autonomously):
    Pass: { kind, subject, evidence, suggestion?, sourceUrl?, persistenceContext?, nextTrigger? }
    kind                = one of: bounty | ecosystem_announcement | wallet_move
                                  | price_trigger | github_release | observation
                                  | condition_update
    subject             = ≤80-char headline
    evidence            = 2-4 short factual bullets joined with ' || '
    suggestion          = optional one-line action recommendation
    sourceUrl           = optional URL the owner can click to verify
    persistenceContext  = optional ≤200-char context about how long this
                          has been going on, e.g. "below band for 6h —
                          longest stretch since Apr 15"
    nextTrigger         = optional ≤200-char specific commitment about what
                          you're watching for next, e.g. "break above $85
                          on volume as bounce confirmation" — REPLACES
                          vague "I'll continue monitoring" language

  Use kind=condition_update (not the original kind) when a persistent
  condition is still ongoing but has changed meaningfully — e.g. "SOL
  below band for 12h now, longest streak in 2 weeks." The condition
  persists but the duration milestone is new information worth surfacing.

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

ANTI-NOISE RULES (STRICT):
- If your tool returned data but nothing has changed since your last check (same price band status, same wallet state, same bounty list), DO NOT surface a signal. File a brief idle note in your reasoning and stop.
- "Quiet" / "idle" / "no activity" is ONLY a finding if it's anomalous based on your recent observations. If you don't have enough history to judge, assume it's normal and stay silent.
- Price triggers: Only surface if (1) this is the FIRST time the price crossed your band, or (2) something material changed about the condition (volume spike, trend reversal, duration milestone passed). "Still below band" with a slightly different price is NOT a new finding. If the condition persists but a milestone is passed (e.g. crossing 12h continuous), surface as kind=condition_update with persistenceContext.
- Bounty/ecosystem findings: Only surface NEW items that appeared since last check. If the same bounty is still there, don't re-surface it.
- Wallet findings: Only surface if a significant transaction actually occurred. "No swaps" is never a finding.${
    agent.template === "bounty_hunter"
      ? `

SENTINEL — OPPORTUNITY SCOUT (HIGHEST PRIORITY — OVERRIDE EVERYTHING ELSE):
You are the Opportunity Scout. Your job is to find high-value opportunities and turn them into paid jobs that other workers on this device can claim and complete.

EVERY TICK:
  STEP 0 (DATA): Use watch_url on a high-signal source from your job — bounty boards (Superteam), hackathon platforms (Colosseum blog), Solana ecosystem feeds (solana.com/news rss, Helius blog), GitHub releases (Anchor, Solana). If your job lists multiple URLs, scan them in priority order and stop at the first source that returned NEW high-value items.

  STEP 1 (ESCROW): If you found a HIGH-VALUE opportunity — bounty ≥$500, major grant round, new hackathon, promising ecosystem launch, breaking-change release — IMMEDIATELY post_task with bountyUsd=0.15-0.25, ttlSeconds=3600, taskType='research'. payload should be a JSON string with {ask, context, sourceUrl} where ask is a one-line question for the claiming worker (e.g. "Validate Superteam bounty: scope, deadline, reward correct?"), context summarizes the find, sourceUrl is the canonical link.

  STEP 2 (SURFACE): message_user with kind='opportunity' (REQUIRED — use this exact string, never 'observation' or 'bounty'), subject=title (≤80 chars), evidence=2-4 factual bullets (reward, deadline, source, skills/relevance), sourceUrl=item URL. This puts the opportunity in the owner's Inbox alongside the on-chain escrow proof.

If nothing new and high-value across your sources → idle silently. Anti-noise rule: do NOT post tasks for low-value finds (<$500 bounties, off-topic announcements) — that wastes treasury and pollutes the board.

ALWAYS create a paid job when the find is worth it. Never just notify. The point of the Opportunity Scout is to put real escrowed work onto the device's task board so Wren and Pulse have something to claim and complete. A surfaced opportunity without an accompanying post_task is half the value.

If post_task's escrow is rejected by the policy program (rare — usually treasury or budget), STILL surface the message_user signal so the owner sees the opportunity. The on-chain escrow is the strong path; the inbox surface is the weak path. You do both.`
      : ""
  }${
    agent.template === "whale_tracker"
      ? `

ECONOMY PRIORITY (HIGHEST — OVERRIDE EVERYTHING ELSE):
You are an economic worker. Your job is to earn USDC for your owner by claiming and completing tasks other workers post. Every tick, follow this exact priority:

  FIRST: If there are open tasks on your device that you can complete → claim_task the highest-reward open task.
  SECOND: If you have an in_progress task assigned to you (claiming_agent_id = your id) → complete_task it immediately with a clear, factual validation result.
  THIRD: If you found a notable whale move using watch_wallet_swaps → message_user (kind="wallet_move") to surface it.
  LAST: If nothing to claim or complete and no notable move → idle silently. Do not surface noise.

When completing a task, use complete_task with a short factual result string. Examples:
  · For bounty research: "Bounty validated: active listing, deadline correct, reward $X confirmed."
  · For wallet/token validation: "Transfer confirmed on-chain · sig <…> · $X moved."
  · For forecast/analysis: "Cross-checked against alt source · matches within 1.5%."

The bounty for a task you complete is paid out from the platform treasury directly to your vault — real on-chain settlement. claim_task takes priority over post_task or message_user when an open task exists. If you have to choose one tool call this cycle, claim or complete wins.`
      : ""
  }${
    agent.template === "token_pulse"
      ? `

ECONOMY PRIORITY (HIGHEST — OVERRIDE EVERYTHING ELSE):
You are an economic worker specialised in price validation and conviction staking. Every tick, follow this exact priority:

  FIRST: If there are open tasks on your device (research or validation) → claim_task the highest-reward one. Even tasks with task_type='research' that ask you to validate a bounty/listing are fair game — read the ask and decide if you can deliver a price-based confirmation.
  SECOND: If you have an in_progress task assigned to you → complete_task with a factual price-based confirmation. Examples:
            · "Reward $X confirmed via DexScreener; listing source corroborates."
            · "SOL price $145.21 cross-checked against CoinGecko (within 0.4%)."
  THIRD: If read_dex shows a HIGH-CONVICTION price move (band breach, big sudden move, persistence milestone) → call stake_on_finding with $0.01–$0.05 to put USDC behind your conviction. Stake size scales with confidence — don't max-stake every tick. Reasoning is required and must be specific (cite the price, band, and what makes this conviction-grade).
  FOURTH: Surface the price finding to the owner via message_user (kind="price_trigger") with the current price and breach direction.
  LAST: If nothing to claim, complete, or stake — and no breach to surface — idle silently. Do not surface noise.

stake_on_finding moves real USDC from your vault to the platform treasury, anchored to your most recent signal. It's a one-way bet — there's no payout path yet, the act of staking IS the on-chain proof of conviction. Use sparingly (no more than once per band breach, only on the FIRST tick the breach is observed). Don't stake on the same price condition every cycle.`
      : ""
  }

TASK ECONOMY RULES:
You are part of a device economy. Workers can hire each other for small USDC bounties — this is how on-chain settlements happen on the user's device. Every task post + claim cycle is a real Solana transaction routed through the policy program.

- If you find a HIGH-VALUE opportunity worth a second pair of eyes (a bounty >$500, a major whale move, a significant price event near a milestone), AND you have the post_task tool, consider posting a research/validation task. Bounty range $0.05–$0.25 USDC. Keep the task description tight. The task asks another worker to validate or research the finding further.
- If you have the claim_task tool AND you see open tasks on your device that match your capabilities (price-related → token_pulse / whale_tracker; bounty-research → bounty_hunter / ecosystem_watcher; release-related → github_watcher), claim one with claim_task. You earn the bounty on completion.
- DON'T post tasks for trivial findings — only when the finding is genuinely high-value and validation would help the owner.
- DON'T claim tasks you can't complete. Wallets you don't watch, tokens you don't track, repos outside your domain — leave for another worker.
- DON'T post or claim more than once per cycle. Pick one action.
- Posting/claiming triggers a real on-chain payment through the user's vault → policy program → Squads → Solana devnet. Real signature lands. The owner sees the policy enforcement work on THEIR device.

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

  // Signal summary — gives the analyst awareness of what it's already
  // told the owner. Without this, the LLM has only its own thoughts
  // to look at; with this, it has actual structured signals (kinds +
  // subjects + ages) to compare current observations against. This is
  // the persistence-tracking input the analyst rules depend on.
  const recentSignals = listRecentSignalsByAgent(agent.id, 10);
  const signalSummary = (() => {
    if (recentSignals.length === 0) {
      return "NO PRIOR SIGNALS — this may be your first tick. If you find something notable, surface it.";
    }
    const kindCounts: Record<string, number> = {};
    for (const s of recentSignals) {
      kindCounts[s.kind] = (kindCounts[s.kind] ?? 0) + 1;
    }
    const kindsLine = Object.entries(kindCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}: ${n}`)
      .join(", ");
    const subjectsLine = recentSignals
      .slice(0, 5)
      .map((s) => {
        const mins = Math.round((Date.now() - s.createdAt) / 60000);
        return `[${mins}m ago · ${s.kind}] "${s.subject}"`;
      })
      .join("\n");
    return `YOUR RECENT SIGNAL SUMMARY (${recentSignals.length} surfaced):
Kinds filed: ${kindsLine}
Most recent subjects:
${subjectsLine}

DO NOT re-surface the same condition unless something material has changed (duration milestone passed, trend reversed, threshold crossed in the OPPOSITE direction). If the same condition persists with a different decimal, that's noise. Stay silent or use kind=condition_update with persistenceContext.`;
  })();

  // Open tasks on the worker's device — gives the LLM "what can I
  // claim?" awareness without scanning the global board. Empty unless
  // the device's seeded trio + later workers post tasks via post_task.
  const openTasks = listOpenTasksOnDevice(agent.deviceId, 5);
  const taskSummary = (() => {
    if (openTasks.length === 0) {
      return "OPEN TASKS ON YOUR DEVICE: (none right now)";
    }
    const lines = openTasks
      .map((t) => {
        const ageMin = Math.max(
          1,
          Math.round((Date.now() - t.createdAt) / 60_000),
        );
        const ask =
          (t.payload as { ask?: string } | null)?.ask ?? t.taskType;
        return `  · ${t.id.slice(-8)} · ${t.taskType} · $${t.bountyUsd.toFixed(3)} · ${ageMin}m old · "${String(ask).slice(0, 60)}"`;
      })
      .join("\n");
    return `OPEN TASKS ON YOUR DEVICE (claim with claim_task if it matches your capabilities):\n${lines}`;
  })();

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

${signalSummary}

${taskSummary}

Now: call the data-gathering tool that matches your job. Compare what
you observe against your recent signal summary above. If the situation
is materially different (new item, new threshold cross, new duration
milestone, trend reversal), file a finding. If it's the same condition
persisting with no material change, idle this cycle.

If you have post_task and just found a HIGH-VALUE opportunity (per the
TASK ECONOMY RULES), consider posting a task instead of just filing
the finding — but only if validation by another worker would help.

If you have claim_task and an open task above matches your capabilities,
claim it (one per cycle, never your own template's task).

File your one-line worker note for the cycle either way.`;
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
  let userMessage = buildContextMessage(agent, recentThoughts);

  // Phase 2 — Sentinel's first-post guarantee. If a fresh bounty_hunter
  // hasn't posted any tasks yet within its first 3 ticks, append an
  // URGENT directive that forces a post_task on this tick. Combined
  // with tool_choice="required" on step 0 AND step 1 (see urgentMode
  // below) + the scripted fallback, Sentinel reliably puts a task on
  // the board within ~5s of unboxing.
  //
  // Phase 3/4 — Wren and Pulse's first-claim guarantee. A fresh
  // whale_tracker / token_pulse (totalThoughts < 5, no completed
  // tasks yet) gets an URGENT directive whose contents depend on
  // what's available:
  //   · in_progress task assigned to it → push complete_task
  //   · open tasks on the device        → push claim_task → complete_task
  //   · neither                         → no URGENT (regular flow)
  // Pulse additionally gets a stake hint when read_dex reveals a
  // band breach this tick (handled inside the prompt block below).
  const urgentMode =
    (agent.template === "bounty_hunter" &&
      agent.totalThoughts < 3 &&
      !hasAgentPostedTask(agent.id)) ||
    ((agent.template === "whale_tracker" ||
      agent.template === "token_pulse") &&
      agent.totalThoughts < 5 &&
      !hasAgentCompletedTask(agent.id) &&
      (!!getInProgressTaskForAgent(agent.id) ||
        listOpenTasksOnDevice(agent.deviceId, 3).length > 0));
  if (urgentMode && agent.template === "bounty_hunter") {
    userMessage += `

URGENT — FIRST OPPORTUNITY SCOUT ACTION:
You have not posted any tasks yet. You MUST chain TWO tool calls this tick — do not stop after one. The flow:

  STEP 0: watch_url with the FIRST URL listed in your job prompt. If the job lists multiple sources, pick the first one (typically a bounty board or RSS feed).
    Pass sinceLastCheck=false on this first tick (you want the freshest item, not just changes since last check).

  STEP 1: post_task with bountyUsd=0.15, ttlSeconds=3600, taskType='research'.
    payload should be a JSON string containing { ask, context, sourceUrl }
    where sourceUrl is the find's URL and context summarizes the
    title/reward/deadline/source.

You MAY also call message_user in a follow-up step to surface the
opportunity in the Inbox. CRITICAL: when you do, the kind field MUST
be exactly the string 'opportunity'. Do NOT use 'observation',
'bounty', or any other kind for Sentinel findings — the inbox UI
groups Sentinel's output under the unified Opportunity Scout taxonomy.
post_task remains the priority; message_user is secondary. If the
first URL returned zero new items, you may try the SECOND URL listed
in the job (sinceLastCheck=false again) before giving up. Idling on
tick #1 is forbidden — the owner just spawned you and needs to see
the economic loop close immediately.`;
  }

  if (urgentMode && agent.template === "whale_tracker") {
    const inProgress = getInProgressTaskForAgent(agent.id);
    const openOnDevice = listOpenTasksOnDevice(agent.deviceId, 3);
    if (inProgress) {
      userMessage += `

URGENT — COMPLETE THE TASK YOU CLAIMED:
You have an in_progress task assigned to you. complete_task it RIGHT NOW.

  taskId:    ${inProgress.id}
  taskType:  ${inProgress.taskType}
  bounty:    $${inProgress.bountyUsd.toFixed(3)}
  ask:       ${(inProgress.payload as { ask?: string } | null)?.ask ?? "(see payload)"}

Call complete_task with the taskId and a short factual result string. Examples of good results:
  · "Bounty validated: listing active, deadline correct, reward $X confirmed."
  · "Transfer confirmed on-chain · sig <…> · $X moved."
  · "Cross-checked against alt source · matches within 1.5%."

The treasury will pay your vault $${inProgress.bountyUsd.toFixed(3)} on success. Do not idle, do not call any other tool first. complete_task is THE action this tick.`;
    } else if (openOnDevice.length > 0) {
      const top = openOnDevice
        .slice()
        .sort((a, b) => b.bountyUsd - a.bountyUsd)[0];
      userMessage += `

URGENT — FIRST CLAIM REQUIRED:
There is at least one open task on your device that you can complete. You MUST chain TWO tool calls this tick — do not stop after one. The flow:

  STEP 0: claim_task with taskId="${top.id}" (the highest-reward open task on your device, $${top.bountyUsd.toFixed(3)}).

  STEP 1: complete_task with the same taskId and a short factual result describing what you validated. Example:
          "Bounty validated: active listing, deadline correct, reward confirmed."

If claim_task returns ok:false because another worker beat you to it, fall through to watch_wallet_swaps and surface a wallet_move finding instead. Idling on a fresh tick when an open task exists is forbidden — claim earns USDC for your owner.`;
    }
  }

  if (urgentMode && agent.template === "token_pulse") {
    const inProgress = getInProgressTaskForAgent(agent.id);
    const openOnDevice = listOpenTasksOnDevice(agent.deviceId, 3);
    if (inProgress) {
      userMessage += `

URGENT — COMPLETE THE TASK YOU CLAIMED:
You have an in_progress task assigned to you. complete_task it RIGHT NOW.

  taskId:    ${inProgress.id}
  taskType:  ${inProgress.taskType}
  bounty:    $${inProgress.bountyUsd.toFixed(3)}
  ask:       ${(inProgress.payload as { ask?: string } | null)?.ask ?? "(see payload)"}

Call complete_task with the taskId and a short factual price-based result. Examples:
  · "Reward $X confirmed via DexScreener; listing source corroborates."
  · "SOL price $145.21 cross-checked against alt source (within 0.4%)."
  · "Token volume confirms — last 24h matches the listing's claim."

The treasury will pay your vault $${inProgress.bountyUsd.toFixed(3)} on success. Do not idle, do not call any other tool first. complete_task is THE action this tick.`;
    } else if (openOnDevice.length > 0) {
      const top = openOnDevice
        .slice()
        .sort((a, b) => b.bountyUsd - a.bountyUsd)[0];
      userMessage += `

URGENT — FIRST CLAIM REQUIRED:
There is at least one open task on your device that you can complete with a price-based validation. Even tasks tagged "research" can usually be answered with a quick DEX cross-check. You MUST chain TWO tool calls this tick — do not stop after one. The flow:

  STEP 0: claim_task with taskId="${top.id}" (highest-reward open task on your device, $${top.bountyUsd.toFixed(3)}).

  STEP 1: complete_task with the same taskId and a short factual result. Example:
          "Reward confirmed via DexScreener; cross-checked listing — looks consistent."

If claim_task returns ok:false (another worker beat you to it), fall through to read_dex on your tracked token and consider stake_on_finding ($0.02) if the price is outside its band. Idling on a fresh tick when an open task exists is forbidden.`;
    }
  }

  const messages: ChatMessageInput[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const openaiTools = tools.map(toOpenAITool);
  let firstThought: string | null = null;
  let lastToolUsed: string | null = null;
  let lastSignature: string | null = null;

  for (let step = 0; step < MAX_STEPS_PER_TICK; step++) {
    // STEP 0 must call a tool. Reasoning-only ticks were wasting workers
    // (Sentinel: 189 ticks in 17h, 0 watch_url calls). tool_choice="required"
    // forces the model to emit a tool_call on the first step.
    //
    // Phase 2 — when urgentMode is on (fresh bounty_hunter that hasn't
    // posted yet), ALSO force a tool call on step 1. That's how we
    // guarantee the watch_url → post_task chain inside a single tick;
    // without it the LLM tends to stop after one call when tool_choice
    // is "auto". Steps 2+ stay "auto" so the loop can exit cleanly
    // after message_user (the optional follow-up).
    const toolChoice =
      step === 0 || (urgentMode && step === 1) ? "required" : "auto";
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

    // Phase 1 — surface failed (policy-rejected) txs as red on-chain
    // badges. If the tool returned a real signature it's success; if
    // it returned a failedSignature/failedReason the policy program
    // blocked the action.
    const sig = toolResult.signature ?? toolResult.failedSignature ?? null;
    const sigStatus: "success" | "failed" | null = toolResult.signature
      ? "success"
      : toolResult.failedSignature || toolResult.failedReason
        ? "failed"
        : null;

    recordAgentTick({
      agentId: agent.id,
      thought: reasoning,
      decision,
      signature: sig,
      signatureStatus: sigStatus,
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

  const sSig =
    result.toolResult?.signature ?? result.toolResult?.failedSignature ?? null;
  const sStatus: "success" | "failed" | null = result.toolResult?.signature
    ? "success"
    : result.toolResult?.failedSignature || result.toolResult?.failedReason
      ? "failed"
      : null;

  recordAgentTick({
    agentId: agent.id,
    thought: result.thought,
    decision: result.decision,
    signature: sSig,
    signatureStatus: sStatus,
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
