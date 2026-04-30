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

/** Strip pure-intention sentences ("I should check", "I need to verify",
 *  "Let me see if…") that announce future work without doing any. The
 *  reasoning text is supposed to be a worker's note about what
 *  HAPPENED this cycle, not what the model intends to do next. The
 *  next-trigger commitment lives in the structured nextTrigger field. */
function stripIntentionSentences(s: string): string {
  return s
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => {
      const t = sentence.trim().toLowerCase();
      if (!t) return false;
      // Drop pure-intention openers — same patterns the analyst rules
      // told the model to avoid, but defensive at the cleanup layer.
      if (
        /^(?:i\s+(?:should|need\s+to|must|will\s+check|will\s+verify)|let\s+me\s+(?:see|check|verify|figure)|i'?ll\s+(?:check|verify|see|look))\b/.test(
          t,
        )
      ) {
        return false;
      }
      return true;
    })
    .join(" ")
    .trim();
}

/** Replace vague "I'll continue / keep monitoring" → "idle this cycle"
 *  and bare "Monitor for X" / "Watch for X" → "Next trigger: X" so the
 *  text matches the analyst rules' preference for specific commitments
 *  over vague verbs. */
function rephraseMonitorSpeak(s: string): string {
  return (
    s
      // "I'll continue monitoring" / "I'll keep watching" / "I will keep an eye on"
      .replace(
        /\b(?:i'?ll|i\s+will)\s+(?:continue|keep)\s+(?:monitor(?:ing)?|watch(?:ing)?|track(?:ing)?|look(?:ing)?(?:\s+at)?)(?:\s+(?:it|this|that))?\b/gi,
        "idle this cycle",
      )
      .replace(
        /\b(?:keep(?:ing)?|continue(?:s|d)?)\s+(?:an?\s+)?(?:eye|watch)(?:\s+on)?\b/gi,
        "idle this cycle",
      )
      // Sentence-start "Monitor for X" / "Watch for X" / "Keep an eye on X"
      // → "Next trigger: X" so suggestions read as commitments not vague
      // monitoring. Match at start-of-sentence boundaries.
      .replace(
        /(^|[.!?]\s+)(?:monitor|watch|keep\s+an?\s+eye\s+on)\s+for\s+/gi,
        "$1Next trigger: ",
      )
      .replace(
        /(^|[.!?]\s+)(?:monitor|watch)\s+(?=[a-z])/gi,
        "$1Next trigger: ",
      )
  );
}

/** Public entry point — apply all cleanup passes and capitalize. */
export function cleanReasoning(raw: string): string {
  if (!raw || typeof raw !== "string") return raw;

  let t = stripPreambles(raw);
  t = softenToolNames(t);
  t = rephraseMonitorSpeak(t);
  t = stripIntentionSentences(t);

  if (t.length > 0) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }

  // If aggressive cleanup somehow ate everything, fall back to the
  // raw input rather than persist an empty thought.
  if (!t.trim()) return raw.trim();
  return t.trim();
}
