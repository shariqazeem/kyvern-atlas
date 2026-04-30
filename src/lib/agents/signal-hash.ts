/**
 * signal-hash — the dedup key for `signals.subject_hash`.
 *
 * Lives in its own module because two separate code paths need it:
 *   · src/lib/agents/store.ts — at writeSignal() time, to gate inserts
 *   · src/lib/db.ts            — at migrate() time, to re-backfill rows
 *
 * Both must produce the SAME value for the SAME subject, so they
 * import from here instead of each maintaining their own copy.
 *
 * Why normalization (the v2 of this hash):
 *
 * The first cut hashed `lower(trim(subject)).slice(0, 80)` — literal.
 * Token Pulse exposed the flaw immediately: it produced
 *   "SOL outside band: $83.14"
 *   "SOL outside band: $83.18"
 *   "SOL outside band: $83.27"
 * within the same 30-minute window. Different prices → different
 * literal hashes → dedup gate never fires → six near-identical
 * cards land in the inbox.
 *
 * v2 normalizes the parts that change every cycle but the owner
 * doesn't actually care about for dedup purposes:
 *
 *   - dollar amounts ($83.14 → $X)
 *   - decimal numbers (0.0008 → N)
 *   - integer numbers (15000 → N)
 *   - whitespace runs (" " ×N → " ")
 *
 * Net: the price-band-break-on-SOL signal gets one canonical hash
 * regardless of which dollar value the LLM saw this cycle. Same for
 * "Wallet swapped $X SOL → Y token" and other numeric subjects.
 *
 * Trade-off: subjects that share a structural shape but legitimately
 * differ by quantity hash to the same value (e.g. two genuinely
 * different bounty postings whose subjects only differ by reward
 * amount). Acceptable for v1 — most bounty subjects include a title.
 */

export function hashSubject(subject: string): string {
  return (
    subject
      .toLowerCase()
      .trim()
      // $-amounts: $83.14, $1,500, $0.0008 → $X
      .replace(/\$\s*[\d,]+(?:\.\d+)?/g, "$X")
      // Standalone decimals or comma'd numbers: 0.0008, 1,500, 1.5 → N
      .replace(/\b\d+[\d,]*(?:\.\d+)?\b/g, "N")
      // Collapse whitespace runs
      .replace(/\s+/g, " ")
      .slice(0, 80)
  );
}
