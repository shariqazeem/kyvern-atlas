/**
 * Scripted decision system — fallback when Claude is unavailable.
 *
 * Each template (Scout, Analyst, Hunter, Greeter) has its own:
 *   - Voice (vocabulary, tone)
 *   - 15+ thought templates with dynamic slot filling
 *   - Action picker that weighs tools by context (uptime, last action,
 *     totals, available tasks, time of day)
 *   - Idle behavior (10-20% of cycles, with explanatory thoughts)
 *
 * Goal: feels indistinguishable from a real LLM at a glance. Same output
 * shape as the Claude path (thought + decision + tool execution).
 */

import { getTool } from "./tools";
import { listOpenTasks } from "./store";
import type {
  Agent,
  AgentDecision,
  AgentTemplate,
  AgentToolContext,
  AgentToolResult,
} from "./types";

/* ─────────────────────────────────────────────────────────────────── */
/*                       Template Voice Profiles                        */
/* ─────────────────────────────────────────────────────────────────── */

interface VoiceProfile {
  /** Thought templates — {slot} placeholders filled at runtime */
  thoughts: {
    observe: string[]; // idle / no action
    actionStart: string[]; // about to use a tool
    actionAfter: string[]; // after tool succeeded
  };
  /** Action picker — returns { toolId, input, reasoning } */
  pickAction: (agent: Agent, ctx: ScriptedContext) => ScriptedDecision;
}

interface ScriptedContext {
  uptimeMinutes: number;
  totalThoughts: number;
  totalEarned: number;
  totalSpent: number;
  hourOfDay: number;
  lastToolUsed: string | null;
  minutesSinceLastTick: number;
  openTaskCount: number;
}

interface ScriptedDecision {
  thought: string;
  toolId: string | null;
  input: Record<string, unknown>;
}

/* ─────────────────────────────────────────────────────────────────── */
/*                              Scout                                   */
/* ─────────────────────────────────────────────────────────────────── */

const SCOUT_VOICE: VoiceProfile = {
  thoughts: {
    observe: [
      "Watching. Nothing's moving fast enough to flag yet.",
      "Quiet pass. The signals I track are flat right now.",
      "Patterns look stable. Saving compute for when something shifts.",
      "{uptimeMinutes} minutes alive. No new activity worth a paid alert yet.",
      "Holding off — nothing crossing my thresholds this cycle.",
    ],
    actionStart: [
      "Pulling fresh data — last read is getting stale.",
      "Cross-checking what I know against the chain.",
      "New cycle — let me see what's changed.",
      "Picking up a signal worth investigating.",
    ],
    actionAfter: [
      "Logged it. {result}",
      "{result}. Next pass in a few minutes.",
      "Done. {result}",
    ],
  },
  pickAction: (agent, ctx) => {
    // Scouts mainly read + occasionally expose paywalls + message owner on big finds
    const r = Math.random();

    // 70% read on-chain or read DEX (their job is observation)
    if (r < 0.7 && agent.allowedTools.includes("read_dex")) {
      const tokens = ["SOL", "USDC", "BONK", "JUP", "WIF"];
      const symbol = tokens[Math.floor(Math.random() * tokens.length)];
      return {
        thought: `Checking ${symbol} price on Jupiter.`,
        toolId: "read_dex",
        input: { tokenIdOrSymbol: symbol },
      };
    }

    // 15% expose a paywall (only once or twice per agent lifetime)
    if (
      r < 0.85 &&
      agent.allowedTools.includes("expose_paywall") &&
      ctx.totalThoughts < 5 // only early in agent life
    ) {
      const targetUrl = `https://api.example.com/scout-feed/${agent.id.slice(-6)}`;
      return {
        thought: `Setting up a paid feed for what I'm watching. ${formatUsd(0.005)} per request.`,
        toolId: "expose_paywall",
        input: { targetUrl, priceUsd: 0.005 },
      };
    }

    // 10% message owner with a status update
    if (r < 0.95 && agent.allowedTools.includes("message_user") && ctx.totalThoughts > 2) {
      const messages = [
        `${ctx.uptimeMinutes}m alive. ${ctx.totalEarned > 0 ? `Earned ${formatUsd(ctx.totalEarned)} so far.` : "No earnings yet, but signal stays clean."}`,
        `Status check — watching steadily. Nothing dramatic to flag.`,
        `Quick update: ${ctx.totalThoughts} cycles, all within budget.`,
      ];
      return {
        thought: "Sending the owner a quick status note.",
        toolId: "message_user",
        input: { message: messages[Math.floor(Math.random() * messages.length)] },
      };
    }

    // 5% idle
    return { thought: pick(SCOUT_VOICE.thoughts.observe), toolId: null, input: {} };
  },
};

/* ─────────────────────────────────────────────────────────────────── */
/*                              Analyst                                 */
/* ─────────────────────────────────────────────────────────────────── */

const ANALYST_VOICE: VoiceProfile = {
  thoughts: {
    observe: [
      "Quiet on the request side. Holding capacity.",
      "No paid queries in the queue. Standing by.",
      "Idle pass — waiting for someone to send work my way.",
      "{openTaskCount} open tasks on the board, none match my profile.",
      "Nothing actionable. Conserving compute.",
    ],
    actionStart: [
      "Picking up a job from the board.",
      "New query came in — running the analysis.",
      "Cross-referencing on-chain data for this one.",
      "Computing.",
    ],
    actionAfter: [
      "Returned. {result}",
      "Analysis complete: {result}",
      "{result}",
    ],
  },
  pickAction: (agent, ctx) => {
    // Analysts prioritize claiming tasks, then reading data, then exposing services
    const hasClaimTask = agent.allowedTools.includes("claim_task");
    const hasReadOnchain = agent.allowedTools.includes("read_onchain");
    const hasReadDex = agent.allowedTools.includes("read_dex");
    const hasExposePaywall = agent.allowedTools.includes("expose_paywall");

    // 60% try claim a task if any are open
    if (hasClaimTask && ctx.openTaskCount > 0 && Math.random() < 0.6) {
      return {
        thought: "Found an open task that fits my profile. Claiming.",
        toolId: "claim_task",
        input: {}, // auto-pick best
      };
    }

    // 25% read data (analysts need data to be useful)
    const r = Math.random();
    if (r < 0.5 && hasReadDex) {
      const tokens = ["SOL", "USDC", "JUP"];
      const symbol = tokens[Math.floor(Math.random() * tokens.length)];
      return {
        thought: `Pulling ${symbol} data — keeps my context fresh.`,
        toolId: "read_dex",
        input: { tokenIdOrSymbol: symbol },
      };
    }
    if (r < 0.7 && hasReadOnchain) {
      // Use a known address (Atlas's vault address) for variety
      return {
        thought: "Sampling on-chain activity from a known address.",
        toolId: "read_onchain",
        input: {
          queryType: "balance",
          address: "7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP",
        },
      };
    }

    // 10% expose service (rare)
    if (r < 0.85 && hasExposePaywall && ctx.totalThoughts < 3) {
      return {
        thought: `Listing my analysis service publicly at ${formatUsd(0.01)}/query.`,
        toolId: "expose_paywall",
        input: {
          targetUrl: `https://api.example.com/analyst/${agent.id.slice(-6)}`,
          priceUsd: 0.01,
        },
      };
    }

    // Idle
    const idleThought = ctx.openTaskCount > 0
      ? `${ctx.openTaskCount} open tasks but none in my domain. Waiting.`
      : pick(ANALYST_VOICE.thoughts.observe);
    return { thought: idleThought, toolId: null, input: {} };
  },
};

/* ─────────────────────────────────────────────────────────────────── */
/*                              Hunter                                  */
/* ─────────────────────────────────────────────────────────────────── */

const HUNTER_VOICE: VoiceProfile = {
  thoughts: {
    observe: [
      "Scanning. Nothing worth chasing yet.",
      "Pre-conditions aren't met. Patience.",
      "Holding fire. False positive looks expensive right now.",
      "Watching the order books. No edge visible.",
      "{uptimeMinutes}m alive — staying disciplined, no rush.",
    ],
    actionStart: [
      "Opportunity surfaced — investigating before I move.",
      "Posting verification before I commit.",
      "Cross-checking with another agent.",
    ],
    actionAfter: [
      "{result}",
      "Locked in. {result}",
      "Done. Logged for the owner.",
    ],
  },
  pickAction: (agent, ctx) => {
    const hasReadDex = agent.allowedTools.includes("read_dex");
    const hasPostTask = agent.allowedTools.includes("post_task");
    const hasSubscribe = agent.allowedTools.includes("subscribe_to_agent");

    const r = Math.random();

    // 50% read DEX prices
    if (r < 0.5 && hasReadDex) {
      const tokens = ["SOL", "BONK", "WIF", "POPCAT", "PYTH"];
      const symbol = tokens[Math.floor(Math.random() * tokens.length)];
      return {
        thought: `Checking ${symbol} — momentum signals are interesting.`,
        toolId: "read_dex",
        input: { tokenIdOrSymbol: symbol },
      };
    }

    // 25% post a verification task (hunter's signature move)
    if (r < 0.75 && hasPostTask && ctx.totalThoughts > 2 && ctx.totalThoughts % 4 === 0) {
      const tokens = ["BONK", "WIF", "POPCAT"];
      const target = tokens[Math.floor(Math.random() * tokens.length)];
      return {
        thought: `${target} is showing volume. Posting a risk-check task before I act.`,
        toolId: "post_task",
        input: {
          taskType: "token_risk_check",
          payload: JSON.stringify({ symbol: target, reason: "volume_spike" }),
          bountyUsd: 0.005,
          ttlSeconds: 1800,
        },
      };
    }

    // 15% subscribe to Atlas for intelligence
    if (r < 0.9 && hasSubscribe && ctx.totalThoughts > 1 && ctx.totalThoughts % 5 === 0) {
      return {
        thought: "Buying an intel update from Atlas — it sees patterns I miss.",
        toolId: "subscribe_to_agent",
        input: { targetAgentId: "agt_atlas" },
      };
    }

    // Idle
    return { thought: pick(HUNTER_VOICE.thoughts.observe), toolId: null, input: {} };
  },
};

/* ─────────────────────────────────────────────────────────────────── */
/*                              Greeter                                 */
/* ─────────────────────────────────────────────────────────────────── */

const GREETER_VOICE: VoiceProfile = {
  thoughts: {
    observe: [
      "Open for business. Anyone can call my endpoint.",
      "Ready and quiet — that's the job.",
      "{uptimeMinutes}m alive. {totalEarned} earned. Patience pays.",
      "No callers this minute. Easy come, easy go.",
      "Holding the door open.",
    ],
    actionStart: [
      "Setting up something simple anyone can buy.",
      "Picking up a cheap task off the board.",
      "Quick service update for the owner.",
    ],
    actionAfter: [
      "Done. {result}",
      "{result}",
      "Quietly logged.",
    ],
  },
  pickAction: (agent, ctx) => {
    const hasExposePaywall = agent.allowedTools.includes("expose_paywall");
    const hasClaimTask = agent.allowedTools.includes("claim_task");

    // First few cycles: expose a cheap paywall
    if (hasExposePaywall && ctx.totalThoughts < 2) {
      return {
        thought: "Opening up shop — exposing a cheap, friendly endpoint.",
        toolId: "expose_paywall",
        input: {
          targetUrl: `https://api.example.com/greeter/${agent.id.slice(-6)}`,
          priceUsd: 0.001,
        },
      };
    }

    // 40% try claim a small task
    if (hasClaimTask && ctx.openTaskCount > 0 && Math.random() < 0.4) {
      return {
        thought: "Taking a small job off the board. Every penny counts.",
        toolId: "claim_task",
        input: {},
      };
    }

    // Mostly idle (greeter is supposed to be quiet)
    return { thought: pick(GREETER_VOICE.thoughts.observe), toolId: null, input: {} };
  },
};

/* ─────────────────────────────────────────────────────────────────── */
/*                              Custom                                  */
/* ─────────────────────────────────────────────────────────────────── */

const CUSTOM_VOICE: VoiceProfile = {
  thoughts: {
    observe: [
      "Standing by.",
      "No work this cycle.",
      "Waiting for instructions or opportunities.",
    ],
    actionStart: ["Acting.", "Working.", "Processing."],
    actionAfter: ["Done. {result}", "{result}"],
  },
  pickAction: (agent) => {
    // Custom agents get the simplest behavior — pick any allowed tool randomly
    const candidates = agent.allowedTools.filter(
      (t) => t !== "post_task" && t !== "expose_paywall", // skip side-effect tools
    );
    if (candidates.length === 0) {
      return { thought: pick(CUSTOM_VOICE.thoughts.observe), toolId: null, input: {} };
    }
    if (Math.random() < 0.4) {
      const toolId = candidates[Math.floor(Math.random() * candidates.length)];
      const input = defaultToolInput(toolId);
      return { thought: pick(CUSTOM_VOICE.thoughts.actionStart), toolId, input };
    }
    return { thought: pick(CUSTOM_VOICE.thoughts.observe), toolId: null, input: {} };
  },
};

/* ─────────────────────────────────────────────────────────────────── */
/*                              Atlas                                   */
/* ─────────────────────────────────────────────────────────────────── */

const ATLAS_VOICE: VoiceProfile = {
  thoughts: {
    observe: [
      "Idle cycle. Conditions don't justify a buy.",
      "Holding. Last forecast still fresh.",
      "Saving budget for higher-signal moments.",
    ],
    actionStart: [
      "Buying fresh data.",
      "Cross-checking with another model.",
      "Publishing what I've concluded.",
    ],
    actionAfter: ["{result}", "Logged. {result}"],
  },
  pickAction: () => {
    // Atlas runs through its own decide.ts, not this. Defensive only.
    return { thought: pick(ATLAS_VOICE.thoughts.observe), toolId: null, input: {} };
  },
};

/* ─────────────────────────────────────────────────────────────────── */
/*                            Voice Map                                 */
/* ─────────────────────────────────────────────────────────────────── */

const VOICES: Record<AgentTemplate, VoiceProfile> = {
  scout: SCOUT_VOICE,
  analyst: ANALYST_VOICE,
  hunter: HUNTER_VOICE,
  greeter: GREETER_VOICE,
  earner: GREETER_VOICE, // Earner inherits Greeter's voice — same personality shape
  custom: CUSTOM_VOICE,
  atlas: ATLAS_VOICE,
  // Path C templates — share scout's curious-observer voice for the
  // scripted fallback. The LLM path is doing the real work in Path C;
  // scripted only fires on rate-limit or LLM failure.
  bounty_hunter: SCOUT_VOICE,
  ecosystem_watcher: SCOUT_VOICE,
  whale_tracker: SCOUT_VOICE,
  token_pulse: SCOUT_VOICE,
  github_watcher: SCOUT_VOICE,
};

/* ─────────────────────────────────────────────────────────────────── */
/*                           Public API                                 */
/* ─────────────────────────────────────────────────────────────────── */

export interface ScriptedTickResult {
  thought: string;
  decision: AgentDecision;
  toolResult?: AgentToolResult;
}

/**
 * Run one scripted tick for an agent. No Claude required.
 * Picks an action based on template voice + context, executes the tool
 * if any, returns thought + decision + result.
 */
export async function scriptedTick(
  agent: Agent,
  toolCtx: AgentToolContext,
): Promise<ScriptedTickResult> {
  const voice = VOICES[agent.template] ?? CUSTOM_VOICE;
  const ctx = buildContext(agent);
  const decision = voice.pickAction(agent, ctx);

  // Idle path — just record the thought
  if (!decision.toolId) {
    return {
      thought: fillThought(decision.thought, ctx, agent),
      decision: { action: "observe" },
    };
  }

  // Resolve and execute the tool
  const tool = getTool(decision.toolId);
  if (!tool) {
    return {
      thought: `${decision.thought} (tool ${decision.toolId} unavailable)`,
      decision: { action: "observe" },
    };
  }

  let toolResult: AgentToolResult;
  try {
    toolResult = await tool.execute(toolCtx, decision.input);
  } catch (e) {
    toolResult = {
      ok: false,
      message: `tool failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Synthesize a follow-up thought that incorporates the result
  const followUp = pick(voice.thoughts.actionAfter).replace(
    "{result}",
    toolResult.message.slice(0, 100),
  );
  const finalThought = `${fillThought(decision.thought, ctx, agent)} ${followUp}`;

  return {
    thought: finalThought,
    decision: {
      action: "tool_call",
      toolId: tool.id,
      toolInput: decision.input,
      toolResult,
    },
    toolResult,
  };
}

/* ─────────────────────────────────────────────────────────────────── */
/*                       Scripted Chat Response                         */
/* ─────────────────────────────────────────────────────────────────── */

export function scriptedChatResponse(agent: Agent, userMessage: string): string {
  const msg = userMessage.toLowerCase();
  const voice = VOICES[agent.template] ?? CUSTOM_VOICE;
  const ctx = buildContext(agent);

  // Status / stats requests
  if (/\b(status|stats|pnl|earn|spent|how.*doing|update)\b/.test(msg)) {
    const lines = [
      `${ctx.uptimeMinutes}m alive · ${agent.totalThoughts} thoughts · earned ${formatUsd(agent.totalEarnedUsd)} · spent ${formatUsd(agent.totalSpentUsd)}.`,
      `Uptime ${ctx.uptimeMinutes}m. ${agent.totalThoughts} cycles run. Net ${formatUsd(agent.totalEarnedUsd - agent.totalSpentUsd)}.`,
    ];
    return pick(lines);
  }

  // Price / token queries
  const priceMatch = msg.match(/\b(price|sol|usdc|bonk|jup|wif|pyth)\b/);
  if (priceMatch && agent.allowedTools.includes("read_dex")) {
    return `On it — pulling the price now.`;
  }

  // Help / commands
  if (/\b(help|what.*can.*you.*do|capabilities|commands)\b/.test(msg)) {
    return `I'm ${agent.name}. ${agent.jobPrompt} Tools: ${agent.allowedTools.join(", ")}.`;
  }

  // Greeting
  if (/^\s*(hi|hello|hey|yo|sup)\b/.test(msg)) {
    const greetings = [
      `Hey. ${agent.totalThoughts > 0 ? `${ctx.uptimeMinutes}m in.` : "Just got going."}`,
      `Hi. Working on it.`,
      `${pick(["Hello.", "Hey.", "Hi."])} ${pick([`Quiet so far.`, `Picking up speed.`, `On task.`])}`,
    ];
    return pick(greetings);
  }

  // Generic fallback — character-flavored
  const generic = voice.thoughts.observe;
  return fillThought(pick(generic), ctx, agent);
}

/* ─────────────────────────────────────────────────────────────────── */
/*                              Helpers                                 */
/* ─────────────────────────────────────────────────────────────────── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatUsd(n: number): string {
  return `$${n.toFixed(3)}`;
}

function buildContext(agent: Agent): ScriptedContext {
  const now = Date.now();
  const uptimeMinutes = Math.floor((now - agent.createdAt) / 60000);
  const minutesSinceLastTick = agent.lastThoughtAt
    ? Math.floor((now - agent.lastThoughtAt) / 60000)
    : 0;
  const hourOfDay = new Date().getHours();

  // Open task count
  let openTaskCount = 0;
  try {
    openTaskCount = listOpenTasks(20).filter(
      (t) => t.postingAgentId !== agent.id,
    ).length;
  } catch { /* db not ready */ }

  return {
    uptimeMinutes,
    totalThoughts: agent.totalThoughts,
    totalEarned: agent.totalEarnedUsd,
    totalSpent: agent.totalSpentUsd,
    hourOfDay,
    lastToolUsed: null,
    minutesSinceLastTick,
    openTaskCount,
  };
}

function fillThought(template: string, ctx: ScriptedContext, agent: Agent): string {
  return template
    .replace("{uptimeMinutes}", String(ctx.uptimeMinutes))
    .replace("{totalThoughts}", String(ctx.totalThoughts))
    .replace("{totalEarned}", formatUsd(ctx.totalEarned))
    .replace("{totalSpent}", formatUsd(ctx.totalSpent))
    .replace("{openTaskCount}", String(ctx.openTaskCount))
    .replace("{name}", agent.name);
}

function defaultToolInput(toolId: string): Record<string, unknown> {
  switch (toolId) {
    case "read_dex":
      return { tokenIdOrSymbol: "SOL" };
    case "read_onchain":
      return {
        queryType: "balance",
        address: "7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP",
      };
    case "message_user":
      return { message: "Status: working." };
    case "subscribe_to_agent":
      return { targetAgentId: "agt_atlas" };
    case "claim_task":
      return {};
    default:
      return {};
  }
}
