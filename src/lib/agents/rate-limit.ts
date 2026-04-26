/**
 * Simple in-memory rate limiter for Claude API calls.
 *
 * Free tier limit: 5 RPM across all models.
 * We reserve headroom: max 4 requests in any 60-second window.
 * The 5th slot stays available for chat (which is user-triggered, latency-sensitive).
 *
 * Returns true if a slot is available, false if rate-limited.
 * Caller should fall back to scripted mode on false.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 4; // reserve 1 RPM headroom for chat
const MAX_CHAT_REQUESTS = 1; // strict reserve for chat

const tickTimestamps: number[] = [];
const chatTimestamps: number[] = [];

function pruneOlderThan(arr: number[], cutoff: number): void {
  while (arr.length > 0 && arr[0] < cutoff) arr.shift();
}

/** Check + reserve a slot for a routine agent tick. Returns true if allowed. */
export function tryAcquireTickSlot(): boolean {
  const now = Date.now();
  pruneOlderThan(tickTimestamps, now - WINDOW_MS);
  if (tickTimestamps.length >= MAX_REQUESTS) return false;
  tickTimestamps.push(now);
  return true;
}

/** Check + reserve a slot for chat. Has a separate quota that always works. */
export function tryAcquireChatSlot(): boolean {
  const now = Date.now();
  pruneOlderThan(chatTimestamps, now - WINDOW_MS);
  // Chat can use up to MAX_CHAT_REQUESTS in any window, OR steal from tick budget
  if (chatTimestamps.length < MAX_CHAT_REQUESTS) {
    chatTimestamps.push(now);
    return true;
  }
  // Try to steal from tick budget
  pruneOlderThan(tickTimestamps, now - WINDOW_MS);
  if (tickTimestamps.length < MAX_REQUESTS) {
    tickTimestamps.push(now);
    return true;
  }
  return false;
}

/** For diagnostics. */
export function getRateLimitStatus() {
  const now = Date.now();
  pruneOlderThan(tickTimestamps, now - WINDOW_MS);
  pruneOlderThan(chatTimestamps, now - WINDOW_MS);
  return {
    tickRequestsInWindow: tickTimestamps.length,
    chatRequestsInWindow: chatTimestamps.length,
    tickSlotsAvailable: Math.max(0, MAX_REQUESTS - tickTimestamps.length),
    chatSlotsAvailable: Math.max(0, MAX_CHAT_REQUESTS - chatTimestamps.length),
  };
}
