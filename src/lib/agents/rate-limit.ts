/**
 * In-memory client-side throttle for LLM calls.
 *
 * We're on paid Commonstack credits with DeepSeek V4 flash, so the
 * real provider rate limits are far higher than what an agent pool
 * can produce. The cap here is just a runaway-loop safety valve, not
 * a budget gate. The user wants the LLM path to win nearly every
 * tick — scripted is a true fallback for actual API errors only, not
 * for client-side throttling.
 *
 * Caps below are deliberately generous (10 RPS for ticks). If the
 * provider returns a 429, the runner catches it and falls through to
 * scripted for that one tick — exactly the behavior we want.
 */

const WINDOW_MS = 60_000;
const MAX_TICK_REQUESTS = 600; // 10 RPS safety cap
const MAX_CHAT_REQUESTS = 120; // 2 RPS safety cap for chat

const tickTimestamps: number[] = [];
const chatTimestamps: number[] = [];

function pruneOlderThan(arr: number[], cutoff: number): void {
  while (arr.length > 0 && arr[0] < cutoff) arr.shift();
}

/** Check + reserve a slot for a routine agent tick. Returns true if allowed. */
export function tryAcquireTickSlot(): boolean {
  const now = Date.now();
  pruneOlderThan(tickTimestamps, now - WINDOW_MS);
  if (tickTimestamps.length >= MAX_TICK_REQUESTS) return false;
  tickTimestamps.push(now);
  return true;
}

/** Check + reserve a slot for chat. Independent budget from ticks. */
export function tryAcquireChatSlot(): boolean {
  const now = Date.now();
  pruneOlderThan(chatTimestamps, now - WINDOW_MS);
  if (chatTimestamps.length >= MAX_CHAT_REQUESTS) return false;
  chatTimestamps.push(now);
  return true;
}

/** For diagnostics. */
export function getRateLimitStatus() {
  const now = Date.now();
  pruneOlderThan(tickTimestamps, now - WINDOW_MS);
  pruneOlderThan(chatTimestamps, now - WINDOW_MS);
  return {
    tickRequestsInWindow: tickTimestamps.length,
    chatRequestsInWindow: chatTimestamps.length,
    tickSlotsAvailable: Math.max(0, MAX_TICK_REQUESTS - tickTimestamps.length),
    chatSlotsAvailable: Math.max(0, MAX_CHAT_REQUESTS - chatTimestamps.length),
  };
}
