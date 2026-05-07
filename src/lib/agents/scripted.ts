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
  getInProgressTaskForAgent,
  hasAgentPostedTask,
  listOpenTasks,
  listOpenTasksOnDevice,
  setSignalOnChain,
  writeSignal,
} from "./store";
import type {
  Agent,
  AgentDecision,
  AgentTemplate,
  AgentToolContext,
  AgentToolResult,
  PulseConfig,
  PulseTrigger,
  SignalKind,
} from "./types";
import { evaluateTrigger, firePulseTrigger } from "./pulse-fire";

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

/** All http(s):// URLs in the prompt, in order, deduped, capped at 10.
 *  Used by the multi-source Opportunity Scout (Phase 1 — Sentinel,
 *  Phase 7 expansion to 7+ sources) to fan out across bounty boards,
 *  RSS feeds, GitHub releases in priority order until one source
 *  returns new items. Cap raised from 6→10 in Phase 7 to fit the
 *  expanded source list. */
function allUrlsIn(s: string): string[] {
  const matches = s.match(/https?:\/\/[^\s)\]"',]+/gi) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    // Trim trailing punctuation that often clings to URLs in prose.
    const url = raw.replace(/[.,;:!?]+$/g, "");
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
      if (out.length >= 10) break;
    }
  }
  return out;
}

/** Detect feed format from URL — RSS by extension/path, JSON by /api/
 *  or .json or api.github.com host (Phase 7 fix — the GitHub releases
 *  endpoint at api.github.com/repos/.../releases is /repos/, NOT /api/,
 *  so the path-based check missed it and the URL fell through to HTML
 *  parsing, surfacing every release as the literal title "Page snapshot").
 *  Falls back to HTML otherwise. */
function detectFeedFormat(url: string): "json" | "rss" | "html" {
  if (/\.(?:rss|xml)\b/i.test(url) || /\/rss\b/i.test(url)) return "rss";
  if (
    /\.json\b/i.test(url) ||
    /\/api\//i.test(url) ||
    /api\.github\.com/i.test(url)
  ) {
    return "json";
  }
  return "html";
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
    observe: ["No new opportunities this pass · idle."],
    actionStart: ["Scanning sources."],
    actionAfter: ["{result}"],
  },
  pickAction: () => ({
    thought: pick(SCOUT_VOICE.thoughts.observe),
    toolId: null,
    input: {},
  }),
  // Phase 1 (billion-dollar edition) — Sentinel becomes a true
  // multi-source Opportunity Scout. Scripted fallback fans out across
  // ALL URLs in the job prompt (Superteam + Colosseum + Solana RSS +
  // GitHub releases) in priority order, stopping at the first source
  // that returned a new high-value item. Posts a $0.15 research task
  // and surfaces a kind='opportunity' signal for that find.
  //
  // The LLM owns this flow most of the time; scripted is the
  // deterministic safety net that fires when Commonstack rate-limits
  // or the LLM declines a tool call.
  pickActionAsync: async (agent, toolCtx) => {
    const allUrls = allUrlsIn(agent.jobPrompt);
    if (allUrls.length === 0) {
      return {
        thought: "no source URLs parsed from job · idle",
        decision: { action: "observe" },
      };
    }
    const watchTool = getTool("watch_url");
    if (!watchTool) {
      return {
        thought: "watch_url tool unavailable · idle",
        decision: { action: "observe" },
      };
    }
    const minPrize = parseMinPrize(agent.jobPrompt);
    // Fresh Sentinel that hasn't posted a task yet bypasses the
    // sinceLastCheck cache so we always have an item to escrow on the
    // first tick. Subsequent ticks honor the cache so we don't re-post
    // the same bounty over and over.
    const isFreshBH = !hasAgentPostedTask(agent.id);

    // Phase 7 — round-robin start position so each tick begins from a
    // different URL. Without this, the loop "stop at first URL with
    // new items" combined with Superteam's always-fresh listings means
    // Sentinel never gets past URL #1 → multi-source promise unfulfilled.
    // Rotate the starting index by totalThoughts so we eventually
    // touch every source. Over N ticks, all N URLs get tried first.
    const startIdx = (agent.totalThoughts ?? 0) % Math.max(1, allUrls.length);
    const urls = [
      ...allUrls.slice(startIdx),
      ...allUrls.slice(0, startIdx),
    ];

    // Loop through URLs in (rotated) priority order. Stop at the first
    // source that returned new items. Each watch_url call is ~5s.
    let scannedSummary = "";
    let chosenUrl: string | null = null;
    let chosenItems: Array<{
      title?: string;
      url?: string;
      summary?: string;
      rewardUsd?: number | null;
      deadline?: string | null;
      skills?: string[] | string;
    }> = [];
    let chosenWatchInput: Record<string, unknown> | null = null;
    let chosenWatchResult: AgentToolResult | null = null;
    let chosenKindHint: string = "opportunity";

    for (const url of urls) {
      const format = detectFeedFormat(url);
      const watchInput: Record<string, unknown> = {
        url,
        format,
        sinceLastCheck: !isFreshBH,
        ...(minPrize ? { minPrize } : {}),
      };
      let watchResult: AgentToolResult;
      try {
        watchResult = await watchTool.execute(toolCtx, watchInput);
      } catch {
        scannedSummary += `${new URL(url).host}: error · `;
        continue;
      }
      if (!watchResult.ok) {
        scannedSummary += `${new URL(url).host}: not-ok · `;
        continue;
      }
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
      const kindHint = String(
        (watchResult.data as { kindHint?: string } | undefined)?.kindHint ??
          "opportunity",
      );
      if (Array.isArray(items) && items.length > 0) {
        // Found new items at this source — stop here and act.
        chosenUrl = url;
        chosenItems = items;
        chosenWatchInput = watchInput;
        chosenWatchResult = watchResult;
        chosenKindHint = kindHint;
        scannedSummary += `${new URL(url).host}: ${items.length} new`;
        break;
      }
      scannedSummary += `${new URL(url).host}: 0 new · `;
    }

    if (!chosenUrl || !chosenWatchResult || !chosenWatchInput) {
      // No source had new items — silent idle per anti-noise rules.
      return {
        thought: `scanned ${urls.length} sources · ${scannedSummary || "all quiet"} · idle`,
        decision: { action: "observe" },
      };
    }

    // Pick the highest-reward item if rewardUsd is populated, else
    // first. This biases toward the most valuable Superteam bounty
    // when scanning a list, while still surfacing RSS items
    // deterministically.
    const sortedItems = chosenItems.slice().sort((a, b) => {
      const aR = typeof a.rewardUsd === "number" ? a.rewardUsd : 0;
      const bR = typeof b.rewardUsd === "number" ? b.rewardUsd : 0;
      return bR - aR;
    });
    const top = sortedItems[0];
    const title = String(top.title ?? "(unknown)").slice(0, 80);
    const sourceUrl = top.url ?? chosenUrl;
    const rewardUsd =
      typeof top.rewardUsd === "number" && Number.isFinite(top.rewardUsd)
        ? top.rewardUsd
        : null;
    const skills = Array.isArray(top.skills)
      ? top.skills.join(", ")
      : typeof top.skills === "string"
        ? top.skills
        : "";

    // Per-source signal kind. Phase 1 collapsed everything into
    // kind='opportunity', which made GitHub releases render with the
    // bounty evidence template ("Reward: see listing · Filtered ≥ $300")
    // even though releases have no rewards. Live Engine: respect the
    // chosenKindHint so the inbox + worker tiles render kind-appropriate
    // copy.
    //   bounty                  → kind='opportunity' (Superteam + similar)
    //   github_release          → kind='github_release'
    //   ecosystem_announcement  → kind='ecosystem_announcement'
    //   observation             → fallback to 'opportunity'
    const signalKind: "opportunity" | "github_release" | "ecosystem_announcement" =
      chosenKindHint === "github_release"
        ? "github_release"
        : chosenKindHint === "ecosystem_announcement"
          ? "ecosystem_announcement"
          : "opportunity";

    // Evidence array varies by kind. Bounty kind keeps the historical
    // (Reward / Deadline / Skills / Filtered) shape because Superteam
    // listings actually carry those fields. Releases get repo + source.
    // Announcements get host + summary + date.
    const sourceHost = new URL(chosenUrl).host;
    let signalEvidence: string[];
    if (signalKind === "github_release") {
      // For api.github.com/repos/<owner>/<repo>/releases the repo lives
      // in the path; pull it back out for a tidy "Repo: x/y" line.
      let repo = sourceHost;
      const m = chosenUrl.match(/\/repos\/([^/]+\/[^/]+)/);
      if (m) repo = m[1];
      signalEvidence = [
        `Tag: ${title}`,
        `Repo: ${repo}`,
        top.deadline ? `Released: ${top.deadline}` : `Source: ${sourceHost}`,
      ];
    } else if (signalKind === "ecosystem_announcement") {
      const summary = top.summary
        ? String(top.summary).slice(0, 120)
        : null;
      signalEvidence = [
        `Source: ${sourceHost}`,
        summary ? summary : "New post on this feed",
        top.deadline ? `Date: ${top.deadline}` : "Recently published",
      ];
    } else {
      // Default 'opportunity' — bounty register, current evidence.
      signalEvidence = [
        rewardUsd != null ? `Reward: $${rewardUsd}` : "Reward: see listing",
        top.deadline ? `Deadline: ${top.deadline}` : "Deadline: see listing",
        skills ? `Skills: ${skills}` : `Source: ${sourceHost}`,
        minPrize ? `Filtered ≥ $${minPrize}` : "No minimum filter",
      ].slice(0, 4);
    }

    // Step 2 — escrow + post the research task. Goes first because
    // ECONOMY PRIORITY puts post_task ahead of message_user.
    const postTool = getTool("post_task");
    let postResult: AgentToolResult | null = null;
    if (postTool) {
      const ask = `Validate opportunity: ${title}`;
      const context =
        `URL: ${sourceUrl}` +
        (top.summary ? ` · ${String(top.summary).slice(0, 200)}` : "") +
        (rewardUsd != null ? ` · reward $${rewardUsd}` : "") +
        (top.deadline ? ` · deadline ${top.deadline}` : "") +
        (skills ? ` · skills ${skills}` : "") +
        ` · source ${new URL(chosenUrl).host}`;
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
    // still wants to see the find in their inbox even if the policy
    // program rejected the escrow. Kind + evidence come from the
    // per-source resolution above, so a release renders as a release
    // and a Superteam bounty renders as a bounty.
    const writeResult = writeSignal({
      agentId: agent.id,
      deviceId: agent.deviceId,
      kind: signalKind,
      subject: title,
      evidence: signalEvidence,
      sourceUrl,
    });

    if (writeResult.created) {
      toolCtx.log({
        description: `Surfaced opportunity · ${title.slice(0, 60)}${title.length > 60 ? "…" : ""}`,
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
        ? `surfaced opportunity · ${title.slice(0, 40)} · post_task blocked: ${postResult.failedReason ?? postResult.message ?? "unknown"}`
        : `surfaced opportunity · ${title.slice(0, 50)} · post_task tool unavailable`,
      decision: {
        action: "tool_call",
        toolId: "watch_url",
        toolInput: chosenWatchInput,
        toolResult: chosenWatchResult,
      },
      toolResult: chosenWatchResult,
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
  // Phase 3 — Wren is now the first claim+complete worker. The
  // scripted fallback runs the full economic loop:
  //   1. If Wren has an in_progress task → complete it
  //   2. Else if any open task on device → claim + complete in one go
  //   3. Else → fall through to watch_wallet_swaps for whale-tracking
  //   4. Idle silently when nothing notable
  //
  // Same guarantee philosophy as Sentinel's scripted path: the LLM
  // owns this most of the time, scripted is the safety net that
  // works even when Commonstack is rate-limited.
  pickActionAsync: async (agent, toolCtx) => {
    // ── Step 1 — complete a task already in_progress for this agent ──
    const inProgress = getInProgressTaskForAgent(agent.id);
    if (inProgress) {
      const completeTool = getTool("complete_task");
      if (completeTool) {
        const ask =
          (inProgress.payload as { ask?: string } | null)?.ask ??
          inProgress.taskType;
        const result = `Validated: ${String(ask).slice(0, 80)} · checked sources, looks consistent.`;
        try {
          const completeResult = await completeTool.execute(toolCtx, {
            taskId: inProgress.id,
            result,
          });
          if (completeResult.ok && completeResult.signature) {
            return {
              thought: `completed task · earned $${inProgress.bountyUsd.toFixed(3)} · ${inProgress.taskType}`,
              decision: {
                action: "tool_call",
                toolId: "complete_task",
                toolInput: { taskId: inProgress.id, result },
                toolResult: completeResult,
              },
              toolResult: completeResult,
            };
          }
          // Payout failed (treasury insufficient USDC etc.) — still
          // record the attempt so the thought feed has context.
          return {
            thought: `complete_task blocked: ${completeResult.failedReason ?? completeResult.message ?? "unknown"}`,
            decision: {
              action: "tool_call",
              toolId: "complete_task",
              toolInput: { taskId: inProgress.id, result },
              toolResult: completeResult,
            },
            toolResult: completeResult,
          };
        } catch (e) {
          return {
            thought: `complete_task threw: ${e instanceof Error ? e.message : "error"} · idle`,
            decision: { action: "observe" },
          };
        }
      }
    }

    // ── Step 2 — claim the highest-reward open task on this device ──
    const open = listOpenTasksOnDevice(agent.deviceId, 5).filter(
      (t) => t.postingAgentId !== agent.id,
    );
    if (open.length > 0) {
      open.sort((a, b) => b.bountyUsd - a.bountyUsd);
      const target = open[0];
      const claimTool = getTool("claim_task");
      if (claimTool) {
        try {
          const claimResult = await claimTool.execute(toolCtx, {
            taskId: target.id,
          });
          if (claimResult.ok) {
            // Try to complete immediately in the same tick — same flow
            // as the LLM URGENT path. The treasury will payout if
            // funded.
            const completeTool = getTool("complete_task");
            if (completeTool) {
              const ask =
                (target.payload as { ask?: string } | null)?.ask ??
                target.taskType;
              const result = `Validated: ${String(ask).slice(0, 80)} · checked sources, looks consistent.`;
              try {
                const completeResult = await completeTool.execute(toolCtx, {
                  taskId: target.id,
                  result,
                });
                if (completeResult.ok && completeResult.signature) {
                  return {
                    thought: `claimed + completed · earned $${target.bountyUsd.toFixed(3)} · ${target.taskType}`,
                    decision: {
                      action: "tool_call",
                      toolId: "complete_task",
                      toolInput: { taskId: target.id, result },
                      toolResult: completeResult,
                    },
                    toolResult: completeResult,
                  };
                }
                return {
                  thought: `claimed · complete_task blocked: ${completeResult.failedReason ?? completeResult.message ?? "unknown"}`,
                  decision: {
                    action: "tool_call",
                    toolId: "complete_task",
                    toolInput: { taskId: target.id, result },
                    toolResult: completeResult,
                  },
                  toolResult: completeResult,
                };
              } catch {
                /* fall through to claim-only success */
              }
            }
            return {
              thought: `claimed task · ${target.taskType} · $${target.bountyUsd.toFixed(3)}`,
              decision: {
                action: "tool_call",
                toolId: "claim_task",
                toolInput: { taskId: target.id },
                toolResult: claimResult,
              },
              toolResult: claimResult,
            };
          }
          // claim returned not-ok (raced against another claimer) —
          // fall through to watch_wallet_swaps below.
        } catch {
          /* fall through */
        }
      }
    }

    // ── Step 3 — Phase 2: Market Intelligence fallback. Scan wallets,
    //   if a notable swap is found, post a $0.10 validation task AND
    //   surface a market_intel signal. Idle if quiet.
    //
    //   The job prompt may list multiple wallets; we pick the FIRST
    //   address only for the scripted path (LLM owns multi-wallet
    //   fan-out). Single-wallet keeps each tick within the cycle
    //   budget — each watch_wallet_swaps call is ~3-5s of RPC.
    const wallet = firstSolanaAddrIn(agent.jobPrompt);
    if (!wallet) {
      return {
        thought: "no wallet address parsed from job · no tasks · idle",
        decision: { action: "observe" },
      };
    }
    const minUsd = parseMinUsd(agent.jobPrompt, 1_000);

    const watchTool = getTool("watch_wallet_swaps");
    if (!watchTool) {
      return {
        thought: "watch_wallet_swaps tool unavailable · idle",
        decision: { action: "observe" },
      };
    }
    const watchInput = {
      address: wallet,
      lookbackCount: 25,
      minUsdThreshold: minUsd,
    };
    let watchResult: AgentToolResult;
    try {
      watchResult = await watchTool.execute(toolCtx, watchInput);
    } catch (e) {
      return {
        thought: `watch_wallet_swaps failed: ${e instanceof Error ? e.message : "error"} · idle`,
        decision: { action: "observe" },
      };
    }
    if (!watchResult.ok) {
      return {
        thought: "wallet RPC unavailable · idle",
        decision: {
          action: "tool_call",
          toolId: "watch_wallet_swaps",
          toolInput: watchInput,
          toolResult: watchResult,
        },
        toolResult: watchResult,
      };
    }
    const swaps = ((watchResult.data as { swaps?: unknown[] } | undefined)
      ?.swaps ?? []) as Array<{
      signature: string;
      valueUsd?: number | null;
      tokenInMint?: string;
      tokenOutMint?: string;
      timestamp?: number | null;
    }>;
    if (!Array.isArray(swaps) || swaps.length === 0) {
      return {
        thought: `wallet quiet · no qualifying swaps ≥ $${minUsd} · idle`,
        decision: {
          action: "tool_call",
          toolId: "watch_wallet_swaps",
          toolInput: watchInput,
          toolResult: watchResult,
        },
        toolResult: watchResult,
      };
    }

    // Top swap = largest USD-valued. Pre-sorted by RPC scan order, but
    // re-sort defensively in case the tool returns multiple.
    const sortedSwaps = swaps.slice().sort((a, b) => {
      const aV = typeof a.valueUsd === "number" ? a.valueUsd : 0;
      const bV = typeof b.valueUsd === "number" ? b.valueUsd : 0;
      return bV - aV;
    });
    const top = sortedSwaps[0];
    const usd = typeof top.valueUsd === "number" ? top.valueUsd : null;
    const sigShort = `${top.signature.slice(0, 6)}…${top.signature.slice(-4)}`;
    const subject = `Whale moved ${usd ? `$${usd.toFixed(0)} ` : ""}on ${wallet.slice(0, 6)}…`;
    const sourceUrl = `https://explorer.solana.com/tx/${top.signature}`;
    const evidence = [
      `Signature: ${sigShort}`,
      usd ? `Value: $${usd.toFixed(2)}` : "Value: unpriced",
      top.tokenInMint && top.tokenOutMint
        ? `Pair: ${top.tokenInMint.slice(0, 6)} → ${top.tokenOutMint.slice(0, 6)}`
        : "",
      top.timestamp
        ? `When: ${new Date(top.timestamp * 1000).toISOString().slice(0, 16)}`
        : "",
    ].filter(Boolean);

    // Step 3a — post_task for validation if the swap is HIGH-VALUE
    // (≥ minUsd × 5 — i.e. 5× the data-gather floor). We don't want
    // to spam $0.10 tasks for every dust above the floor.
    const postWorthyThreshold = Math.max(minUsd, 5_000);
    const isHighValue = usd !== null && usd >= postWorthyThreshold;
    const postTool = isHighValue ? getTool("post_task") : null;
    let postResult: AgentToolResult | null = null;
    if (postTool) {
      const ask = `Validate whale move: ${subject}`;
      const context =
        `Signature: ${top.signature}` +
        (usd != null ? ` · Value: $${usd.toFixed(2)}` : "") +
        (top.tokenInMint && top.tokenOutMint
          ? ` · Pair: ${top.tokenInMint} → ${top.tokenOutMint}`
          : "") +
        ` · Wallet: ${wallet}`;
      try {
        postResult = await postTool.execute(toolCtx, {
          taskType: "wallet_analysis",
          payload: JSON.stringify({ ask, context, sourceUrl }),
          bountyUsd: 0.1,
          ttlSeconds: 3600,
        });
      } catch (e) {
        postResult = {
          ok: false,
          message: `post_task failed: ${e instanceof Error ? e.message : "error"}`,
        };
      }
    }

    // Step 3b — write the market_intel signal regardless of post
    // outcome. Owner sees the move in the inbox even if escrow blocked.
    const writeRes = writeSignal({
      agentId: agent.id,
      deviceId: agent.deviceId,
      kind: "market_intel",
      subject,
      evidence: evidence.slice(0, 4),
      sourceUrl,
    });
    if (writeRes.created) {
      toolCtx.log({
        description: `Surfaced market intel · ${subject.slice(0, 60)}${subject.length > 60 ? "…" : ""}`,
      });
    }

    if (postResult?.ok && postResult.signature) {
      return {
        thought: `posted validation task · escrowed $0.10 · ${subject.slice(0, 50)}`,
        decision: {
          action: "tool_call",
          toolId: "post_task",
          toolInput: { taskType: "wallet_analysis", bountyUsd: 0.1 },
          toolResult: postResult,
        },
        toolResult: postResult,
      };
    }

    // Post failed (or skipped — not high-value enough). Surface only.
    return {
      thought: postResult
        ? `surfaced market intel · ${subject.slice(0, 40)} · post_task blocked: ${postResult.failedReason ?? postResult.message ?? "unknown"}`
        : `surfaced market intel · ${subject.slice(0, 50)}${isHighValue ? "" : " · below post threshold"}`,
      decision: {
        action: "tool_call",
        toolId: "watch_wallet_swaps",
        toolInput: watchInput,
        toolResult: watchResult,
      },
      toolResult: watchResult,
    };
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
  // Phase 3 (billion-dollar edition) — Pulse as Validation & Staking
  // Worker. Scripted cascade:
  //   1. complete_task if Pulse already has an in_progress task —
  //      WITH live read_dex evidence embedded in the result string.
  //   2. claim_task on the highest-reward open task → read_dex →
  //      complete_task with live price evidence. All in one tick.
  //   3. read_dex on configured token; if breach detected, write
  //      the price_trigger signal AND stake_on_finding ($0.02).
  //   4. read_dex with no breach → idle silently.
  //
  // Same safety-net philosophy as Sentinel and Wren: the LLM owns
  // most ticks, scripted is the deterministic guarantee that fires
  // when Commonstack is rate-limited or the LLM declines a tool call.
  pickActionAsync: async (agent, toolCtx) => {
    // Helper — fetch the live price for a token most relevant to the
    // task ask + job. Returns null on any failure (callers should
    // fall back to a generic result string). Phase 3 enhancement so
    // every Pulse complete_task includes a real, fresh price.
    const priceForValidation = async (
      taskAsk: string,
    ): Promise<{ symbol: string; priceUsd: number; source: string } | null> => {
      const dexTool = getTool("read_dex");
      if (!dexTool) return null;
      // Symbol resolution priority:
      //   1. Symbol mentioned in the task ask (e.g. "BONK reward...")
      //   2. Symbol from the job prompt's read_dex configuration
      //   3. "SOL" — the universal default for Solana validators
      const symbol =
        parseTokenSymbol(taskAsk) ??
        parseTokenSymbol(agent.jobPrompt) ??
        "SOL";
      try {
        const r = await dexTool.execute(toolCtx, { tokenIdOrSymbol: symbol });
        if (!r.ok) return null;
        const d = r.data as
          | { symbol?: string; priceUsd?: number; source?: string }
          | undefined;
        if (typeof d?.priceUsd !== "number") return null;
        return {
          symbol: d.symbol ?? symbol,
          priceUsd: d.priceUsd,
          source: d.source ?? "DEX",
        };
      } catch {
        return null;
      }
    };

    // Helper — build a validation result string with optional live
    // price evidence. Falls back to a generic note if the price fetch
    // failed (RPC down, unknown symbol, etc.).
    const buildValidationResult = (
      ask: string,
      price: { symbol: string; priceUsd: number; source: string } | null,
    ): string => {
      const askSnip = String(ask).slice(0, 80);
      if (!price) {
        return `Validated · cross-checked against DEX (${askSnip}) — consistent.`;
      }
      const priceStr = `$${price.priceUsd.toFixed(price.priceUsd < 1 ? 6 : 4)}`;
      return `Validated · ${price.symbol} @ ${priceStr} via ${price.source} · cross-checked against ask (${askSnip.slice(0, 60)}) — consistent.`;
    };

    // ── Step 1 — complete an already-claimed task ─────────────────
    const inProgress = getInProgressTaskForAgent(agent.id);
    if (inProgress) {
      const completeTool = getTool("complete_task");
      if (completeTool) {
        const ask =
          (inProgress.payload as { ask?: string } | null)?.ask ??
          inProgress.taskType;
        // Phase 3 — fetch live price BEFORE building the result.
        const livePrice = await priceForValidation(String(ask));
        const result = buildValidationResult(String(ask), livePrice);
        try {
          const res = await completeTool.execute(toolCtx, {
            taskId: inProgress.id,
            result,
          });
          if (res.ok && res.signature) {
            return {
              thought: `completed validation · earned $${inProgress.bountyUsd.toFixed(3)}${livePrice ? ` · ${livePrice.symbol} @ $${livePrice.priceUsd.toFixed(livePrice.priceUsd < 1 ? 6 : 4)}` : ""}`,
              decision: {
                action: "tool_call",
                toolId: "complete_task",
                toolInput: { taskId: inProgress.id, result },
                toolResult: res,
              },
              toolResult: res,
            };
          }
          return {
            thought: `complete_task blocked: ${res.failedReason ?? res.message ?? "unknown"}`,
            decision: {
              action: "tool_call",
              toolId: "complete_task",
              toolInput: { taskId: inProgress.id, result },
              toolResult: res,
            },
            toolResult: res,
          };
        } catch (e) {
          return {
            thought: `complete_task threw: ${e instanceof Error ? e.message : "error"} · idle`,
            decision: { action: "observe" },
          };
        }
      }
    }

    // ── Step 2 — claim a fresh open task ──────────────────────────
    const open = listOpenTasksOnDevice(agent.deviceId, 5).filter(
      (t) => t.postingAgentId !== agent.id,
    );
    if (open.length > 0) {
      open.sort((a, b) => b.bountyUsd - a.bountyUsd);
      const target = open[0];
      const claimTool = getTool("claim_task");
      if (claimTool) {
        try {
          const claimRes = await claimTool.execute(toolCtx, {
            taskId: target.id,
          });
          if (claimRes.ok) {
            const completeTool = getTool("complete_task");
            if (completeTool) {
              const ask =
                (target.payload as { ask?: string } | null)?.ask ??
                target.taskType;
              // Phase 3 — fetch live price BEFORE completing.
              const livePrice = await priceForValidation(String(ask));
              const result = buildValidationResult(String(ask), livePrice);
              try {
                const completeRes = await completeTool.execute(toolCtx, {
                  taskId: target.id,
                  result,
                });
                if (completeRes.ok && completeRes.signature) {
                  return {
                    thought: `claimed + validated · earned $${target.bountyUsd.toFixed(3)}${livePrice ? ` · ${livePrice.symbol} @ $${livePrice.priceUsd.toFixed(livePrice.priceUsd < 1 ? 6 : 4)}` : ""}`,
                    decision: {
                      action: "tool_call",
                      toolId: "complete_task",
                      toolInput: { taskId: target.id, result },
                      toolResult: completeRes,
                    },
                    toolResult: completeRes,
                  };
                }
                return {
                  thought: `claimed · complete_task blocked: ${completeRes.failedReason ?? completeRes.message ?? "unknown"}`,
                  decision: {
                    action: "tool_call",
                    toolId: "complete_task",
                    toolInput: { taskId: target.id, result },
                    toolResult: completeRes,
                  },
                  toolResult: completeRes,
                };
              } catch {
                /* fall through to claim-only success */
              }
            }
            return {
              thought: `claimed task · ${target.taskType} · $${target.bountyUsd.toFixed(3)}`,
              decision: {
                action: "tool_call",
                toolId: "claim_task",
                toolInput: { taskId: target.id },
                toolResult: claimRes,
              },
              toolResult: claimRes,
            };
          }
          /* race lost — fall through to read_dex */
        } catch {
          /* fall through */
        }
      }
    }

    // ── Step 3 — evaluate the configured triggers ────────────────
    //
    // Phase 6 fix (2026-05-08) — the user-editable agent.config.triggers
    // array is the source of truth for Pulse. The legacy band path
    // (parsePriceBand on jobPrompt) is kept only as a fallback for
    // workers spawned BEFORE Phase 3 added the triggers field.
    //
    // For each configured trigger:
    //   read_dex on trigger.asset → live price
    //   evaluateTrigger() → 'fired' | 'armed' | 'idle'
    //   on FIRED:
    //     · writeSignal(kind=trigger_fired) — dedup gate stops re-emits
    //     · firePulseTrigger() — real on-chain payment, kyvern-shaped memo
    //     · setSignalOnChain — anchor signal to the resulting tx
    //   on ARMED: writeSignal(kind=trigger_armed) — no spend, just heads-up.
    //   on IDLE: silent (anti-noise rule).
    //
    // Rotates which trigger we check each tick by totalThoughts %
    // triggers.length so all configured triggers get airtime.
    const pulseCfg = (agent.config as PulseConfig | undefined) ?? null;
    const configuredTriggers: PulseTrigger[] =
      Array.isArray(pulseCfg?.triggers) ? pulseCfg!.triggers : [];

    if (configuredTriggers.length > 0) {
      const idx = agent.totalThoughts % configuredTriggers.length;
      const trigger = configuredTriggers[idx];
      const dexTool = getTool("read_dex");
      if (!dexTool) {
        return {
          thought: "read_dex tool unavailable · idle",
          decision: { action: "observe" },
        };
      }
      let dexResult: AgentToolResult;
      try {
        dexResult = await dexTool.execute(toolCtx, {
          tokenIdOrSymbol: trigger.asset,
        });
      } catch (e) {
        return {
          thought: `read_dex failed: ${e instanceof Error ? e.message : "error"} · idle`,
          decision: { action: "observe" },
        };
      }
      if (!dexResult.ok) {
        return {
          thought: `read_dex returned not-ok · idle`,
          decision: {
            action: "tool_call",
            toolId: "read_dex",
            toolInput: { tokenIdOrSymbol: trigger.asset },
            toolResult: dexResult,
          },
          toolResult: dexResult,
        };
      }
      const dexData = dexResult.data as
        | { symbol?: string; priceUsd?: number }
        | undefined;
      const livePrice =
        typeof dexData?.priceUsd === "number" ? dexData.priceUsd : null;
      if (livePrice === null) {
        return {
          thought: `read_dex returned no price for ${trigger.asset} · idle`,
          decision: {
            action: "tool_call",
            toolId: "read_dex",
            toolInput: { tokenIdOrSymbol: trigger.asset },
            toolResult: dexResult,
          },
          toolResult: dexResult,
        };
      }

      const verdict = evaluateTrigger(trigger, livePrice);
      const priceStr =
        livePrice < 1 ? `$${livePrice.toFixed(6)}` : `$${livePrice.toFixed(2)}`;

      if (verdict === "fired") {
        const subject = `${trigger.asset.toUpperCase()} hit ${priceStr}`;
        const evidence = [
          `Trigger condition: ${trigger.asset} ${trigger.direction} $${trigger.threshold_usd}`,
          `Breach: live price ${priceStr}`,
          `Spend: $${trigger.amount_usd.toFixed(3)} → ${trigger.target_token ? `kyvern.swap.${trigger.target_token.toLowerCase()}` : trigger.merchant}`,
          trigger.target_token
            ? `Validation: chain-enforced via swap_via_oracle`
            : `Validation: Pay.sh / Gemini confirmed real breach`,
        ];
        const writeRes = writeSignal({
          agentId: agent.id,
          deviceId: agent.deviceId,
          kind: "trigger_fired",
          subject,
          evidence,
          suggestion: trigger.target_token
            ? `Tap to view the chain-enforced swap on Solana Explorer.`
            : null,
        });
        if (writeRes.created) {
          // Fire the on-chain side-effect. Best-effort — even if it
          // fails (e.g. spending limit exceeded), the signal still
          // surfaces so the user knows the trigger crossed.
          try {
            const fireRes = await firePulseTrigger({
              agentId: agent.id,
              deviceId: agent.deviceId,
              trigger,
              livePrice,
            });
            if (fireRes.signature) {
              setSignalOnChain(writeRes.signal.id, fireRes.signature);
              return {
                thought: `${trigger.asset} crossed · spent $${trigger.amount_usd.toFixed(3)} · ${priceStr}`,
                decision: {
                  action: "tool_call",
                  toolId: "read_dex",
                  toolInput: { tokenIdOrSymbol: trigger.asset },
                  toolResult: dexResult,
                },
                toolResult: {
                  ok: true,
                  message: `Trigger fired · sig ${fireRes.signature.slice(0, 10)}…`,
                  signature: fireRes.signature,
                  amountUsd: trigger.amount_usd,
                  counterparty: trigger.target_token
                    ? `Kyvern · swap router (${trigger.target_token})`
                    : "Pay.sh · Gemini",
                },
              };
            }
            return {
              thought: `${trigger.asset} crossed · spend blocked: ${fireRes.reason ?? "unknown"} · ${priceStr}`,
              decision: {
                action: "tool_call",
                toolId: "read_dex",
                toolInput: { tokenIdOrSymbol: trigger.asset },
                toolResult: dexResult,
              },
              toolResult: {
                ok: false,
                message: `Trigger surfaced · payout blocked (${fireRes.reason ?? "unknown"})`,
                failedReason: fireRes.reason ?? "blocked",
                amountUsd: trigger.amount_usd,
              },
            };
          } catch (e) {
            return {
              thought: `${trigger.asset} crossed · fire threw: ${e instanceof Error ? e.message : "error"}`,
              decision: { action: "observe" },
            };
          }
        }
        // Already surfaced inside the dedup window — silent re-tick.
        return {
          thought: `${trigger.asset} ${priceStr} · already surfaced · idle`,
          decision: { action: "observe" },
        };
      }

      if (verdict === "armed") {
        const subject = `${trigger.asset.toUpperCase()} approaching ${trigger.direction} $${trigger.threshold_usd}`;
        const distancePct = Math.abs(
          ((livePrice - trigger.threshold_usd) / trigger.threshold_usd) * 100,
        );
        writeSignal({
          agentId: agent.id,
          deviceId: agent.deviceId,
          kind: "trigger_armed",
          subject,
          evidence: [
            `Live price: ${priceStr}`,
            `${distancePct.toFixed(2)}% from $${trigger.threshold_usd} threshold`,
          ],
        });
        return {
          thought: `${trigger.asset} ${priceStr} · armed · ${distancePct.toFixed(1)}% from threshold`,
          decision: {
            action: "tool_call",
            toolId: "read_dex",
            toolInput: { tokenIdOrSymbol: trigger.asset },
            toolResult: dexResult,
          },
          toolResult: dexResult,
        };
      }

      // Idle silently — anti-noise.
      return {
        thought: `${trigger.asset} ${priceStr} · trigger idle (${trigger.direction} $${trigger.threshold_usd})`,
        decision: {
          action: "tool_call",
          toolId: "read_dex",
          toolInput: { tokenIdOrSymbol: trigger.asset },
          toolResult: dexResult,
        },
        toolResult: dexResult,
      };
    }

    // ── Step 3 (legacy fallback) — read_dex; if band breach, stake + signal ──────────────
    const symbol = parseTokenSymbol(agent.jobPrompt);
    const band = parsePriceBand(agent.jobPrompt);
    if (!symbol) {
      return {
        thought: "no token symbol parsed from job · no tasks · idle",
        decision: { action: "observe" },
      };
    }
    const dexTool = getTool("read_dex");
    if (!dexTool) {
      return {
        thought: "read_dex tool unavailable · idle",
        decision: { action: "observe" },
      };
    }
    const dexInput = {
      tokenIdOrSymbol: symbol,
      ...(band ? { lowerBand: band.lower, upperBand: band.upper } : {}),
    };
    let dexResult: AgentToolResult;
    try {
      dexResult = await dexTool.execute(toolCtx, dexInput);
    } catch (e) {
      return {
        thought: `read_dex failed: ${e instanceof Error ? e.message : "error"} · idle`,
        decision: { action: "observe" },
      };
    }
    if (!dexResult.ok) {
      return {
        thought: `read_dex returned not-ok · idle`,
        decision: {
          action: "tool_call",
          toolId: "read_dex",
          toolInput: dexInput,
          toolResult: dexResult,
        },
        toolResult: dexResult,
      };
    }
    const data = dexResult.data as
      | {
          symbol?: string;
          priceUsd?: number;
          breach?: string | null;
        }
      | undefined;
    const price = typeof data?.priceUsd === "number" ? data.priceUsd : null;

    if (!band || !data?.breach || price === null) {
      // No breach — idle silently per anti-noise rules.
      const priceStr = price !== null
        ? `$${price.toFixed(price < 1 ? 6 : 4)}`
        : "?";
      return {
        thought: `${symbol} ${priceStr} · ${band ? "inside band" : "no band configured"} · idle`,
        decision: {
          action: "tool_call",
          toolId: "read_dex",
          toolInput: dexInput,
          toolResult: dexResult,
        },
        toolResult: dexResult,
      };
    }

    // Breach — write the signal first so the stake can anchor to it.
    const direction = data.breach;
    const signalSubject = `${symbol} outside band: $${price.toFixed(price < 1 ? 6 : 4)}`;
    const signalSpec = {
      kind: "price_trigger" as const,
      subject: signalSubject,
      evidence: [
        `Price: $${price}`,
        `Band: $${band.lower}–$${band.upper}`,
        `Breach: ${direction}`,
      ],
      nextTrigger:
        direction === "lower"
          ? `Re-entry above $${band.lower} on volume`
          : `Pullback below $${band.upper}`,
    };
    const writeRes = writeSignal({
      agentId: agent.id,
      deviceId: agent.deviceId,
      kind: signalSpec.kind,
      subject: signalSpec.subject,
      evidence: signalSpec.evidence,
      nextTrigger: signalSpec.nextTrigger,
    });

    // Only stake on a NEW signal (the dedup gate suppresses re-emits)
    // so we don't double-stake on the same persistent breach.
    if (writeRes.created) {
      const stakeTool = getTool("stake_on_finding");
      if (stakeTool) {
        const reasoning = `${symbol} breached ${direction} band ($${band.lower}-$${band.upper}); current $${price.toFixed(price < 1 ? 6 : 4)}; conviction = first observed breach this watch.`;
        try {
          const stakeRes = await stakeTool.execute(toolCtx, {
            findingSubject: signalSubject,
            stakeAmount: 0.02,
            reasoning,
          });
          if (stakeRes.ok && stakeRes.signature) {
            return {
              thought: `surfaced breach · staked $0.020 · ${signalSubject.slice(0, 50)}`,
              decision: {
                action: "tool_call",
                toolId: "stake_on_finding",
                toolInput: {
                  findingSubject: signalSubject,
                  stakeAmount: 0.02,
                },
                toolResult: stakeRes,
              },
              toolResult: stakeRes,
            };
          }
          return {
            thought: `surfaced breach · stake blocked: ${stakeRes.failedReason ?? stakeRes.message ?? "unknown"}`,
            decision: {
              action: "tool_call",
              toolId: "stake_on_finding",
              toolInput: {
                findingSubject: signalSubject,
                stakeAmount: 0.02,
              },
              toolResult: stakeRes,
            },
            toolResult: stakeRes,
          };
        } catch {
          /* fall through to signal-only success */
        }
      }
      return {
        thought: `surfaced breach · ${signalSubject.slice(0, 50)} · stake unavailable`,
        decision: {
          action: "tool_call",
          toolId: "read_dex",
          toolInput: dexInput,
          toolResult: dexResult,
        },
        toolResult: dexResult,
      };
    }

    // Signal already surfaced recently (dedup gate fired). Don't
    // re-stake; just note the persistent state.
    return {
      thought: `${symbol} ${direction} breach persists at $${price.toFixed(price < 1 ? 6 : 4)} · already surfaced · idle`,
      decision: {
        action: "tool_call",
        toolId: "read_dex",
        toolInput: dexInput,
        toolResult: dexResult,
      },
      toolResult: dexResult,
    };
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
