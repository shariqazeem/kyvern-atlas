/**
 * ════════════════════════════════════════════════════════════════════
 * Shared display formatters — use these everywhere, don't re-implement.
 *
 * History: `fmtUptime`, `fmtAgo`, and `fmtNextCycle` used to exist in
 * three separate files (atlas-observatory, agent-observatory-strip,
 * atlas-client). Every refinement had to be made in triplicate. This
 * module is the single source of truth.
 * ════════════════════════════════════════════════════════════════════
 */

/**
 * Progressive-precision uptime. Drops leading zero units so the string
 * reads as a real clock instead of a padded template:
 *   0s      → "just now"
 *   42s     → "42s"
 *   3m 17s  → "3m 17s"
 *   2h 14m  → "2h 14m"
 *   4d 6h   → "4d 6h"
 */
export function fmtUptime(ms: number): string {
  if (ms <= 0) return "just now";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

/**
 * Human-readable "how long ago" — used in activity feeds / timelines.
 * Truncates to the largest unit that matters (no "1h 7m 13s ago").
 */
export function fmtAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * Countdown to a future ISO timestamp. Used for "next action in 2:14".
 * Returns agent-voice copy rather than engineer placeholders when
 * there's no ETA.
 */
export function fmtNextCycle(iso: string | null): string {
  if (!iso) return "Atlas is thinking";
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "deciding now";
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `next action in ${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** USD with cents. `$6.04` not `$6`. */
export function fmtUsd(n: number): string {
  return `$${(n ?? 0).toFixed(2)}`;
}

/** Thousands separators. `14,321` not `14321`. */
export function fmtInt(n: number): string {
  return (n ?? 0).toLocaleString();
}

/**
 * Truncate a Solana base58 pubkey / signature for visual display.
 * `4YmhrgysrkRjyT…ekJP2` — 13 + 1 + 5 chars. Works for any length.
 */
export function fmtTruncated(full: string, lead = 13, tail = 5): string {
  if (!full || full.length <= lead + tail + 1) return full;
  return `${full.slice(0, lead)}…${full.slice(-tail)}`;
}
