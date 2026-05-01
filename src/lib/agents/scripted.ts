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
import {
  hasAgentPostedTask,
  listOpenTasks,
  writeSignal,
} from "./store";
import type {
  Agent,
  AgentDecision,
  AgentTemplate,
  AgentToolContext,
  AgentToolResult,
  SignalKind,
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
  /** Sync action picker — returns { toolId, input, reasoning }.
   *  Used by legacy templates (scout/analyst/hunter/greeter/earner/
   *  custom/atlas). Cycle is single-tool: pick → execute → done. */
  pickAction: (agent: Agent, ctx: ScriptedContext) => ScriptedDecision;
  /** Optional async picker — runs INSTEAD of pickAction when defined.
   *  Path C templates use this so they can do "watch → if qualifying,
   *  surface" in one cycle: data-gathering tool first, then optional
   *  message_user write via writeSignal directly (storage-layer dedup
   *  handles idempotency). Returns the final thought + decision the
   *  scripted runner records. Idle → toolId: null. */
  pickActionAsync?: (
    agent: Agent,
    toolCtx: AgentToolContext,
    ctx: ScriptedContext,
  ) => Promise<ScriptedTickResult>;
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
/*                  Path C Templates — Async Pickers                    */
/* ─────────────────────────────────────────────────────────────────── */
/*  Each Path C template runs a deterministic "data-gather → surface
 *  if qualifying" flow as the LLM-fallback. The script parses the
 *  job_prompt to extract the URL/wallet/symbol/repo, calls the
 *  matching tool, inspects the result, and ONLY surfaces a signal if
 *  the tool returned something the owner would actually want to
 *  read. The storage-layer dedup gate (per-kind windows in
 *  writeSignal) handles idempotency, so we don't have to track
 *  "already surfaced" state here.
 *
 *  Strict rule: if nothing notable happened, call no tools after
 *  the gather and return an idle thought. Silence is correct.
 */

/** First http(s):// URL anywhere in the prompt. */
function firstUrlIn(s: string): string | null {
  const m = s.match(/https?:\/\/[^\s)\]"']+/i);
  return m ? m[0] : null;
}

/** First Solana base58 pubkey-shaped substring. */
function firstSolanaAddrIn(s: string): string | null {
  const m = s.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
  return m ? m[0] : null;
}

/** Min-USD threshold from prose like "minUsdThreshold 5000" or "> $1000". */
function parseMinUsd(s: string, fallback = 100): number {
  const m =
    s.match(/minUsdThreshold\s*=?\s*(\d+(?:[\.,]\d+)?)/i) ??
    s.match(/>\s*\$?\s*(\d+(?:[\.,]\d+)?)/);
  if (m) {
    const n = Number(m[1].replace(",", ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

/** "minPrize=500" / "minPrize 500" / "≥$500" type extraction. */
function parseMinPrize(s: string): number | null {
  const m =
    s.match(/minPrize\s*=?\s*(\d+)/i) ??
    s.match(/[≥>]\s*\$?\s*(\d{2,})/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Token symbol (SOL, BONK, JUP …) from prose or a read_dex example. */
function parseTokenSymbol(s: string): string | null {
  const dexMatch = s.match(/read_dex\s*(?:with)?\s*['"]?([A-Z]{2,8})['"]?/);
  if (dexMatch) return dexMatch[1];
  const inlineMatch = s.match(
    /\b([A-Z]{2,6})\b\s+(?:price|outside|band|moves|crosses)/,
  );
  if (inlineMatch) return inlineMatch[1];
  return null;
}

/** $A–$B band parsed from "$140–$160" or "$140 to $160". */
function parsePriceBand(
  s: string,
): { lower: number; upper: number } | null {
  const dashMatch = s.match(/\$([\d.]+)\s*[–\-—]\s*\$?([\d.]+)/);
  const wordMatch = s.match(/\$([\d.]+)\s*to\s*\$?([\d.]+)/i);
  const m = dashMatch ?? wordMatch;
  if (!m) return null;
  const lower = Number(m[1]);
  const upper = Number(m[2]);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper <= lower) {
    return null;
  }
  return { lower, upper };
}

/** Reusable shape: data-gather tool then optional signal write. */
async function runDataGatherThenMaybeSignal(
  agent: Agent,
  toolCtx: AgentToolContext,
  spec: {
    dataToolId: string;
    dataInput: Record<string, unknown>;
    /** Decide what (if anything) to surface from the tool result.
     *  Return null to idle silently. */
    deriveSignal: (
      toolResult: AgentToolResult,
    ) =>
      | {
          kind: SignalKind;
          subject: string;
          evidence: string[];
          suggestion?: string;
          sourceUrl?: string;
          persistenceContext?: string;
          nextTrigger?: string;
        }
      | null;
    idleThought: (toolResult: AgentToolResult) => string;
    surfacedThought: (
      toolResult: AgentToolResult,
      surfaced: { subject: string },
    ) => string;
    parseFailedThought: () => string;
  },
): Promise<ScriptedTickResult> {
  const tool = getTool(spec.dataToolId);
  if (!tool) {
    return {
      thought: `${spec.dataToolId} unavailable, can't gather data.`,
      decision: { action: "observe" },
    };
  }

  let toolResult: AgentToolResult;
  try {
    toolResult = await tool.execute(toolCtx, spec.dataInput);
  } catch (e) {
    return {
      thought: `gather call failed: ${e instanceof Error ? e.message : String(e)}`,
      decision: { action: "observe" },
    };
  }

  if (!toolResult.ok) {
    return {
      thought: `gather returned not-ok · idle.`,
      decision: {
        action: "tool_call",
        toolId: tool.id,
        toolInput: spec.dataInput,
        toolResult,
      },
      toolResult,
    };
  }

  const signalSpec = spec.deriveSignal(toolResult);
  if (!signalSpec) {
    return {
      thought: spec.idleThought(toolResult),
      decision: {
        action: "tool_call",
        toolId: tool.id,
        toolInput: spec.dataInput,
        toolResult,
      },
      toolResult,
    };
  }

  // Surface — write directly via writeSignal so the storage-layer
  // dedup gate decides if it actually persists. We don't go through
  // message_user because that's a tool the LLM uses; in scripted we
  // already have the structured payload and just need to write it.
  const writeResult = writeSignal({
    agentId: agent.id,
    deviceId: agent.deviceId,
    kind: signalSpec.kind,
    subject: signalSpec.subject,
    evidence: signalSpec.evidence,
    suggestion: signalSpec.suggestion ?? null,
    sourceUrl: signalSpec.sourceUrl ?? null,
    persistenceContext: signalSpec.persistenceContext ?? null,
    nextTrigger: signalSpec.nextTrigger ?? null,
  });

  if (!writeResult.created) {
    // Dedup gate fired. Treat as idle so we don't double-log.
    return {
      thought: `same finding already surfaced ${Math.round((writeResult.duplicateAgeMs ?? 0) / 60000)}m ago · idle`,
      decision: {
        action: "tool_call",
        toolId: tool.id,
        toolInput: spec.dataInput,
        toolResult,
      },
      toolResult,
    };
  }

  toolCtx.log({
    description: `Surfaced signal: ${signalSpec.subject.slice(0, 60)}${signalSpec.subject.length > 60 ? "…" : ""}`,
  });

  return {
    thought: spec.surfacedThought(toolResult, { subject: signalSpec.subject }),
    decision: {
      action: "tool_call",
      toolId: tool.id,
      toolInput: spec.dataInput,
      toolResult,
    },
    toolResult,
  };
}

const BOUNTY_HUNTER_VOICE: VoiceProfile = {
  thoughts: {
    observe: ["No new bounties this pass · idle."],
    actionStart: ["Pulled bounty board."],
    actionAfter: ["{result}"],
  },
  pickAction: () => ({
    thought: pick(SCOUT_VOICE.thoughts.observe),
    toolId: null,
    input: {},
  }),
  // Phase 2 — Sentinel becomes the first economic worker. The scripted
  // fallback now does the FULL economic loop: watch_url → post_task
  // (escrow $0.15 research bounty) → writeSignal (surface to inbox).
  // Idle silently when there's nothing new — anti-noise rules apply.
  //
  // The scripted path is a safety net: the LLM owns this flow most of
  // the time, but if Commonstack is down or the LLM declines to call a
  // tool, scripted guarantees Sentinel still posts within 3 ticks.
  pickActionAsync: async (agent, toolCtx) => {
    const url = firstUrlIn(agent.jobPrompt);
    if (!url) {
      return {
        thought: "no bounty URL parsed from job · idle",
        decision: { action: "observe" },
      };
    }
    const minPrize = parseMinPrize(agent.jobPrompt);

    // Step 1 — fetch the bounty board.
    const watchTool = getTool("watch_url");
    if (!watchTool) {
      return {
        thought: "watch_url tool unavailable · idle",
        decision: { action: "observe" },
      };
    }
    // Phase 2 — fresh BH that hasn't posted a task yet bypasses the
    // sinceLastCheck cache so we always have a listing to escrow.
    // Otherwise the agent could lock its first three ticks into
    // "no new items" when the cache is warm but nothing has changed.
    const isFreshBH = !hasAgentPostedTask(agent.id);
    const watchInput = {
      url,
      format: "json" as const,
      sinceLastCheck: !isFreshBH,
      ...(minPrize ? { minPrize } : {}),
    };
    let watchResult: AgentToolResult;
    try {
      watchResult = await watchTool.execute(toolCtx, watchInput);
    } catch (e) {
      return {
        thought: `watch_url failed: ${e instanceof Error ? e.message : "error"} · idle`,
        decision: { action: "observe" },
      };
    }
    if (!watchResult.ok) {
      return {
        thought: `watch_url returned not-ok · idle`,
        decision: {
          action: "tool_call",
          toolId: "watch_url",
          toolInput: watchInput,
          toolResult: watchResult,
        },
        toolResult: watchResult,
      };
    }
    // watch_url returns `newItems` (the post-dedup list), not `items` —
    // the legacy scripted code read the wrong key and silently idled
    // forever. Pre-Phase-2 this only manifested as "no new listings"
    // strings; once we wired post_task on top, the bug stopped the
    // economy loop cold.
    const itemsRaw =
      (watchResult.data as { newItems?: unknown[] } | undefined)?.newItems ??
      [];
    const items = itemsRaw as Array<{
      title?: string;
      url?: string;
      summary?: string;
      rewardUsd?: number | null;
      deadline?: string | null;
      skills?: string[] | string;
    }>;
    if (!Array.isArray(items) || items.length === 0) {
      // Anti-noise: no new qualifying listings → idle silently.
      return {
        thought: "scanned bounty board · no new qualifying listings · idle",
        decision: {
          action: "tool_call",
          toolId: "watch_url",
          toolInput: watchInput,
          toolResult: watchResult,
        },
        toolResult: watchResult,
      };
    }

    const top = items[0];
    const title = String(top.title ?? "(unknown)").slice(0, 80);
    const sourceUrl = top.url ?? url;
    const rewardUsd =
      typeof top.rewardUsd === "number" && Number.isFinite(top.rewardUsd)
        ? top.rewardUsd
        : null;
    const skills = Array.isArray(top.skills)
      ? top.skills.join(", ")
      : typeof top.skills === "string"
        ? top.skills
        : "";

    // Step 2 — escrow + post the research task. Goes first because
    // ECONOMY PRIORITY puts post_task ahead of message_user.
    const postTool = getTool("post_task");
    let postResult: AgentToolResult | null = null;
    if (postTool) {
      const ask = `Validate Superteam bounty: ${title}`;
      const context =
        `URL: ${sourceUrl}` +
        (top.summary ? ` · ${String(top.summary).slice(0, 200)}` : "") +
        (rewardUsd != null ? ` · reward $${rewardUsd}` : "") +
        (top.deadline ? ` · deadline ${top.deadline}` : "") +
        (skills ? ` · skills ${skills}` : "");
      try {
        postResult = await postTool.execute(toolCtx, {
          taskType: "research",
          payload: JSON.stringify({ ask, context, sourceUrl }),
          bountyUsd: 0.15,
          ttlSeconds: 3600,
        });
      } catch (e) {
        postResult = {
          ok: false,
          message: `post_task failed: ${e instanceof Error ? e.message : "error"}`,
        };
      }
    }

    // Step 3 — write the signal regardless of post outcome. The owner
    // still wants to see the bounty in their inbox even if the policy
    // program rejected the escrow.
    const writeResult = writeSignal({
      agentId: agent.id,
      deviceId: agent.deviceId,
      kind: "bounty",
      subject: title,
      evidence: [
        rewardUsd != null ? `Reward: $${rewardUsd}` : "Reward: see listing",
        top.deadline ? `Deadline: ${top.deadline}` : "Deadline: see listing",
        skills ? `Skills: ${skills}` : "Skills: see listing",
        minPrize ? `Filtered ≥ $${minPrize}` : "No minimum filter",
      ].slice(0, 4),
      sourceUrl,
    });

    if (writeResult.created) {
      toolCtx.log({
        description: `Surfaced bounty · ${title.slice(0, 60)}${title.length > 60 ? "…" : ""}`,
      });
    }

    // Final decision recorded references whichever action moved money:
    // post_task on success, otherwise watch_url so the thought feed
    // still has context.
    if (postResult?.ok && postResult.signature) {
      return {
        thought: `posted research task · escrowed $0.15 · ${title.slice(0, 50)}`,
        decision: {
          action: "tool_call",
          toolId: "post_task",
          toolInput: { taskType: "research", bountyUsd: 0.15 },
          toolResult: postResult,
        },
        toolResult: postResult,
      };
    }

    // Post failed (policy reject / treasury issue). Still emitted the
    // signal — note both outcomes in the thought.
    return {
      thought: postResult
        ? `surfaced bounty · ${title.slice(0, 40)} · post_task blocked: ${postResult.failedReason ?? postResult.message ?? "unknown"}`
        : `surfaced bounty · ${title.slice(0, 50)} · post_task tool unavailable`,
      decision: {
        action: "tool_call",
        toolId: "watch_url",
        toolInput: watchInput,
        toolResult: watchResult,
      },
      toolResult: watchResult,
    };
  },
};

const ECOSYSTEM_WATCHER_VOICE: VoiceProfile = {
  thoughts: {
    observe: ["No new ecosystem items · idle."],
    actionStart: ["Pulled feed."],
    actionAfter: ["{result}"],
  },
  pickAction: () => ({
    thought: "scanning ecosystem feed",
    toolId: null,
    input: {},
  }),
  pickActionAsync: async (agent, toolCtx) => {
    const url = firstUrlIn(agent.jobPrompt);
    if (!url) {
      return {
        thought: "no feed URL parsed from job · idle",
        decision: { action: "observe" },
      };
    }
    const isRss = /\.(?:xml|rss)\b|rss\.\w+|\/rss\b/.test(url);
    return runDataGatherThenMaybeSignal(agent, toolCtx, {
      dataToolId: "watch_url",
      dataInput: {
        url,
        format: isRss ? "rss" : "json",
        sinceLastCheck: true,
      },
      deriveSignal: (r) => {
        const items = ((r.data as { items?: unknown[] })?.items ?? []) as Array<{
          title?: string;
          url?: string;
          summary?: string;
        }>;
        if (!Array.isArray(items) || items.length === 0) return null;
        const top = items[0];
        return {
          kind: "ecosystem_announcement",
          subject: String(top.title ?? "(unknown)").slice(0, 80),
          evidence: [
            top.summary ? String(top.summary).slice(0, 200) : "New ecosystem item",
            `Source: ${new URL(url).host}`,
          ],
          sourceUrl: top.url ?? url,
        };
      },
      idleThought: () => "scanned ecosystem feed · no new items · idle",
      surfacedThought: (_r, s) => `surfaced ecosystem update · ${s.subject.slice(0, 50)}`,
      parseFailedThought: () => "feed unavailable · idle",
    });
  },
};

const WHALE_TRACKER_VOICE: VoiceProfile = {
  thoughts: {
    observe: ["wallet quiet · idle."],
    actionStart: ["Scanning wallet."],
    actionAfter: ["{result}"],
  },
  pickAction: () => ({
    thought: "scanning whale wallet",
    toolId: null,
    input: {},
  }),
  pickActionAsync: async (agent, toolCtx) => {
    const wallet = firstSolanaAddrIn(agent.jobPrompt);
    if (!wallet) {
      return {
        thought: "no wallet address parsed from job · idle",
        decision: { action: "observe" },
      };
    }
    const minUsd = parseMinUsd(agent.jobPrompt, 100);
    return runDataGatherThenMaybeSignal(agent, toolCtx, {
      dataToolId: "watch_wallet_swaps",
      dataInput: {
        address: wallet,
        lookbackCount: 25,
        minUsdThreshold: minUsd,
      },
      deriveSignal: (r) => {
        const swaps = ((r.data as { swaps?: unknown[] })?.swaps ?? []) as Array<{
          signature: string;
          valueUsd?: number | null;
          tokenInMint?: string;
          tokenOutMint?: string;
        }>;
        if (!Array.isArray(swaps) || swaps.length === 0) return null;
        const top = swaps[0];
        const usd = typeof top.valueUsd === "number" ? top.valueUsd : null;
        if (usd !== null && usd < minUsd) return null;
        return {
          kind: "wallet_move",
          subject: `Whale moved ${usd ? `$${usd.toFixed(0)} ` : ""}on ${wallet.slice(0, 6)}…`,
          evidence: [
            `Signature: ${top.signature}`,
            usd ? `Value: $${usd.toFixed(2)}` : "Value: unpriced",
            top.tokenInMint && top.tokenOutMint
              ? `Pair: ${top.tokenInMint.slice(0, 6)} → ${top.tokenOutMint.slice(0, 6)}`
              : "",
          ].filter(Boolean),
          sourceUrl: `https://explorer.solana.com/tx/${top.signature}`,
        };
      },
      idleThought: () => `wallet quiet · no qualifying swaps ≥ $${minUsd} · idle`,
      surfacedThought: (_r, s) => `surfaced whale move · ${s.subject.slice(0, 50)}`,
      parseFailedThought: () => "wallet RPC unavailable · idle",
    });
  },
};

const TOKEN_PULSE_VOICE: VoiceProfile = {
  thoughts: {
    observe: ["price inside band · idle."],
    actionStart: ["Pulling price."],
    actionAfter: ["{result}"],
  },
  pickAction: () => ({
    thought: "pulling token price",
    toolId: null,
    input: {},
  }),
  pickActionAsync: async (agent, toolCtx) => {
    const symbol = parseTokenSymbol(agent.jobPrompt);
    const band = parsePriceBand(agent.jobPrompt);
    if (!symbol) {
      return {
        thought: "no token symbol parsed from job · idle",
        decision: { action: "observe" },
      };
    }
    return runDataGatherThenMaybeSignal(agent, toolCtx, {
      dataToolId: "read_dex",
      dataInput: {
        tokenIdOrSymbol: symbol,
        ...(band ? { lowerBand: band.lower, upperBand: band.upper } : {}),
      },
      deriveSignal: (r) => {
        const data = r.data as
          | { symbol?: string; priceUsd?: number; breach?: string | null; lowerBand?: number; upperBand?: number }
          | undefined;
        if (!data || typeof data.priceUsd !== "number") return null;
        // Without a band, we can't deterministically decide if this
        // is notable. Idle silently.
        if (!band) return null;
        if (!data.breach) return null;
        const direction = data.breach;
        return {
          kind: "price_trigger",
          subject: `${symbol} outside band: $${data.priceUsd.toFixed(data.priceUsd < 1 ? 6 : 4)}`,
          evidence: [
            `Price: $${data.priceUsd}`,
            `Band: $${band.lower}–$${band.upper}`,
            `Breach: ${direction}`,
          ],
          nextTrigger:
            direction === "lower"
              ? `Re-entry above $${band.lower} on volume`
              : `Pullback below $${band.upper}`,
        };
      },
      idleThought: (r) => {
        const data = r.data as { priceUsd?: number; breach?: string | null } | undefined;
        const price = data?.priceUsd
          ? `$${data.priceUsd.toFixed(data.priceUsd < 1 ? 6 : 4)}`
          : "?";
        return `${symbol} price ${price} · inside band · idle`;
      },
      surfacedThought: (_r, s) => `surfaced price breach · ${s.subject.slice(0, 50)}`,
      parseFailedThought: () => "price source unavailable · idle",
    });
  },
};

const GITHUB_WATCHER_VOICE: VoiceProfile = {
  thoughts: {
    observe: ["no new releases · idle."],
    actionStart: ["Pulled release feed."],
    actionAfter: ["{result}"],
  },
  pickAction: () => ({
    thought: "scanning github releases",
    toolId: null,
    input: {},
  }),
  pickActionAsync: async (agent, toolCtx) => {
    const url = firstUrlIn(agent.jobPrompt);
    if (!url) {
      return {
        thought: "no github URL parsed from job · idle",
        decision: { action: "observe" },
      };
    }
    return runDataGatherThenMaybeSignal(agent, toolCtx, {
      dataToolId: "watch_url",
      dataInput: {
        url,
        format: "json",
        sinceLastCheck: true,
      },
      deriveSignal: (r) => {
        const items = ((r.data as { items?: unknown[] })?.items ?? []) as Array<{
          title?: string;
          url?: string;
          summary?: string;
        }>;
        if (!Array.isArray(items) || items.length === 0) return null;
        const top = items[0];
        return {
          kind: "github_release",
          subject: String(top.title ?? "(release)").slice(0, 80),
          evidence: [
            top.summary ? String(top.summary).slice(0, 200) : "New release",
            `Repo: ${url.replace(/.*\/repos\//, "").replace(/\/releases.*/, "")}`,
          ],
          sourceUrl: top.url ?? url,
        };
      },
      idleThought: () => "scanned releases · no new tag · idle",
      surfacedThought: (_r, s) => `surfaced release · ${s.subject.slice(0, 50)}`,
      parseFailedThought: () => "github API unavailable · idle",
    });
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
  // Path C templates — own deterministic data-gather → maybe-surface
  // flows via pickActionAsync. The storage-layer dedup gate prevents
  // re-emission, so silence-on-non-events is enforced two ways:
  // here at decision time, and again in writeSignal at write time.
  bounty_hunter: BOUNTY_HUNTER_VOICE,
  ecosystem_watcher: ECOSYSTEM_WATCHER_VOICE,
  whale_tracker: WHALE_TRACKER_VOICE,
  token_pulse: TOKEN_PULSE_VOICE,
  github_watcher: GITHUB_WATCHER_VOICE,
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

  // Path C templates own the entire decision + signal-surfacing flow
  // via pickActionAsync. Legacy templates fall through to the sync
  // pickAction below.
  if (voice.pickActionAsync) {
    return voice.pickActionAsync(agent, toolCtx, ctx);
  }

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
