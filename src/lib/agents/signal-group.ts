/**
 * signal-group — collapse repeat signals into one inbox card.
 *
 * The dedup gate in writeSignal() already drops *exact* re-emits inside
 * a per-kind window, but workers in observation mode legitimately
 * re-surface the same condition every cycle (e.g. "SOL outside band
 * for 3h" → "for 4h" → "for 5h"). Each of those rows is meaningful in
 * the timeline but the inbox shouldn't yell at the user three times.
 *
 * Grouping rule:
 *   - Same agent_id (Wren and Pulse don't merge even if the subject
 *     normalizes to the same hash — they're different perspectives)
 *   - Same kind (don't fold a wallet_move into a price_trigger)
 *   - Same hashSubject (numeric volatility already collapsed by v2)
 *
 * The first signal in the group is the "head" — that's what renders in
 * collapsed mode. Subsequent signals are "updates", shown when expanded.
 */

import type { Signal } from "./types";
import { hashSubject } from "./signal-hash";

export interface SignalGroup<T extends Signal = Signal> {
  /** Stable id for React keys: agentId + kind + hash. */
  id: string;
  agentId: string;
  /** Most-recent signal — the headline displayed when collapsed. */
  head: T;
  /** All signals in the group, head first (newest first). */
  members: T[];
  /** True if any member is unread. */
  hasUnread: boolean;
  /** Number of unread signals in the group. */
  unreadCount: number;
}

export function groupSignals<T extends Signal>(signals: T[]): SignalGroup<T>[] {
  const groups = new Map<string, SignalGroup<T>>();
  for (const s of signals) {
    const key = `${s.agentId}::${s.kind}::${hashSubject(s.subject)}`;
    const existing = groups.get(key);
    const isUnread = s.status === "unread";
    if (!existing) {
      groups.set(key, {
        id: key,
        agentId: s.agentId,
        head: s,
        members: [s],
        hasUnread: isUnread,
        unreadCount: isUnread ? 1 : 0,
      });
    } else {
      existing.members.push(s);
      // Keep `head` pointing at the most recent member.
      if (s.createdAt > existing.head.createdAt) existing.head = s;
      if (isUnread) {
        existing.hasUnread = true;
        existing.unreadCount += 1;
      }
    }
  }
  // Sort groups: unread first (descending unread count), then by most
  // recent member time descending.
  return Array.from(groups.values()).sort((a, b) => {
    if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1;
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
    return b.head.createdAt - a.head.createdAt;
  });
}
