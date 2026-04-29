/**
 * reasoning-clean — strip "Let me think about..." brain-leak from
 * raw LLM reasoning before it hits agent_thoughts.thought.
 *
 * The thought feed on /app/agents/[id] used to render the model's
 * unfiltered first-step reasoning, which often started with hedge
 * words ("Let me check...", "I should...", "Okay, first...") and
 * leaked tool IDs verbatim ("I'll call watch_url..."). That reads
 * as internal monologue, not intentional output.
 *
 * This cleaner runs at the recordAgentTick boundary in runner.ts.
 * Two passes:
 *   1. Strip stacked hedge preambles up to 3 levels deep
 *   2. Replace bare tool IDs (watch_url, message_user, …) with
 *      reader-friendly nouns ("the feed", "you", …)
 *
 * Always falls back to the raw input if cleanup destroys all content.
 */

const TOOL_ALIASES: Record<string, string> = {
  watch_url: "the feed",
  watch_wallet: "the wallet",
  watch_wallet_swaps: "the wallet's swaps",
  read_dex: "DEX price",
  read_onchain: "on-chain data",
  message_user: "you",
  expose_paywall: "a paid endpoint",
  subscribe_to_agent: "another agent",
  post_task: "a task",
  claim_task: "an open task",
};

/** Iteratively strip stacked preambles. Handles "Okay, let me think
 *  about whether to check..." → "Whether to check...". Capped at 3
 *  iterations so a perverse input can't infinite-loop. */
function stripPreambles(s: string): string {
  let t = s.trim();
  for (let i = 0; i < 3; i++) {
    const prev = t;
    t = t
      .replace(
        /^(?:let me|let's)\s+(?:think|check|see|consider|figure|start|begin|verify|examine|investigate|look|try|note|observe|gather|review|do|take|go|use|call|run|fetch|grab)\b\s*(?:about\s+|whether\s+|if\s+|by\s+|out\s+|over\s+|through\s+|into\s+|at\s+|on\s+|with\s+|for\s+)?/i,
        "",
      )
      .replace(
        /^i\s+(?:need\s+to|will|should|'?ll|am\s+going\s+to|have\s+to|must|want\s+to|am)\s+/i,
        "",
      )
      .replace(
        /^(?:first|second|third|next|now|okay|ok|hmm|wait|alright|right|so|well|then|let's see|let me see)[,:.\s]+/i,
        "",
      )
      .trim();
    if (t === prev) break;
  }
  return t;
}

/** Substitute bare tool IDs with reader-friendly nouns. We use word
 *  boundaries so we don't mangle quoted code blocks (which shouldn't
 *  appear in reasoning anyway, but defense-in-depth). */
function softenToolNames(s: string): string {
  let t = s;
  for (const [id, alias] of Object.entries(TOOL_ALIASES)) {
    t = t.replace(new RegExp(`\\b${id}\\b`, "gi"), alias);
  }
  return t;
}

/** Public entry point — apply all cleanup passes and capitalize. */
export function cleanReasoning(raw: string): string {
  if (!raw || typeof raw !== "string") return raw;

  let t = stripPreambles(raw);
  t = softenToolNames(t);

  if (t.length > 0) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }

  // If aggressive cleanup somehow ate everything, fall back to the
  // raw input rather than persist an empty thought.
  if (!t.trim()) return raw.trim();
  return t.trim();
}
