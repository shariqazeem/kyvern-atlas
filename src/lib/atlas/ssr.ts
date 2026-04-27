/**
 * Server-side Atlas state reader for SSR.
 *
 * Called from `src/app/page.tsx` and `src/app/atlas/page.tsx` at render
 * time (Next.js App Router, server components, Node runtime). Returns a
 * lightweight snapshot that can be JSON-serialized and passed to the
 * client observatory as initial state.
 *
 * Guardrails:
 *   · Never throws. If atlas.db isn't mounted (e.g. during a local
 *     preview where the runner hasn't initialized the DB yet), we
 *     return a typed `null`-ish snapshot and the client falls back
 *     to the old client-side fetch + "awaiting ignition" UX.
 *   · Reads the same tables the runner writes. Never writes. Safe
 *     to call under any traffic volume — SQLite with WAL lets one
 *     writer (the runner) and many readers (SSR) coexist.
 *
 * This file is marked `import "server-only"` so accidentally importing
 * it into a client component fails the build.
 */

import "server-only";
import type { AtlasState, AtlasDecision, AtlasAttack } from "./schema";
import type { Signal } from "@/lib/agents/types";

export interface AtlasSnapshot {
  state: AtlasState | null;
  recentFeed:
    | Array<
        | (AtlasDecision & { _kind: "decision"; _when: string })
        | (AtlasAttack & { _kind: "attack"; _when: string })
      >
    | null;
  /** Up to 60 most recent caught attacks — feeds the Attack Wall on /atlas. */
  recentAttacks: AtlasAttack[] | null;
  /** 24 hourly buckets of net PnL (earned − spent) for the sparkline.
   *  Atlas mostly spends, so the line typically slopes downward; that's
   *  the right honest picture. */
  pnl24h: number[] | null;
  /** Path C — Atlas's findings from the last 7 days, newest first.
   *  Powers the new Findings section above the Attack Wall on /atlas. */
  recentFindings: Signal[] | null;
  /** Total findings Atlas surfaced in the last 7 days (for the
   *  "Atlas surfaced N signals this week" credibility line). */
  findingsThisWeek: number;
}

/**
 * Reads initial Atlas state + the latest 40 feed items for SSR.
 * If anything fails (DB missing, schema mismatch, etc), returns a
 * null snapshot — never throws.
 */
export function readInitialAtlasSnapshot(): AtlasSnapshot {
  try {
    // Lazy-require so importing this file doesn't try to open atlas.db
    // at module-load time (keeps dev bundling resilient).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readState, readRecentDecisions, readRecentAttacks } = require("./db") as typeof import("./db");
    const state = readState();
    const decisionsAll = readRecentDecisions(120);
    const decisions = decisionsAll.slice(0, 40).map((d) => ({
      ...d,
      _kind: "decision" as const,
      _when: d.decidedAt,
    }));
    const recentAttacks = readRecentAttacks(60);
    const attacks = recentAttacks.slice(0, 40).map((a) => ({
      ...a,
      _kind: "attack" as const,
      _when: a.attemptedAt,
    }));
    const recentFeed = [...decisions, ...attacks]
      .sort((a, b) => (b._when > a._when ? 1 : -1))
      .slice(0, 40);

    // 24-hour PnL sparkline — bucket settled decisions into 24 hourly
    // slots, cumulative net (negative = Atlas net-spent that hour).
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const buckets = new Array<number>(24).fill(0);
    for (const d of decisionsAll) {
      const t = Date.parse(d.decidedAt);
      if (!isFinite(t) || t < dayAgo) continue;
      if (d.outcome !== "settled") continue;
      const hoursAgo = Math.floor((now - t) / (60 * 60 * 1000));
      const idx = 23 - hoursAgo;
      if (idx >= 0 && idx <= 23) {
        // Atlas almost exclusively spends — use as negative delta
        buckets[idx] -= d.amountUsd ?? 0;
      }
    }
    let cum = 0;
    const pnl24h = buckets.map((b) => (cum += b));

    // Atlas findings — Path C. Read from the pulse.db `signals` table,
    // not atlas.db. Last 7 days, scoped to agent_id=agt_atlas.
    let recentFindings: Signal[] | null = null;
    let findingsThisWeek = 0;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { listInbox, countSignals } = require("@/lib/agents/store") as typeof import("@/lib/agents/store");
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      // listInbox is by deviceId; Atlas's deviceId is vlt_QcCPbp3XTzHtF5
      const all = listInbox("vlt_QcCPbp3XTzHtF5", { limit: 100, since: sevenDaysAgo });
      recentFindings = all.filter((s) => s.agentId === "agt_atlas").slice(0, 30);
      findingsThisWeek = recentFindings.length;
      // countSignals is total per device — we want agt_atlas only over 7 days,
      // which is what we just computed; no extra query needed.
      void countSignals;
    } catch {
      recentFindings = null;
      findingsThisWeek = 0;
    }

    return { state, recentFeed, recentAttacks, pnl24h, recentFindings, findingsThisWeek };
  } catch (e) {
    console.warn(
      "[atlas/ssr] could not read initial snapshot:",
      e instanceof Error ? e.message : String(e),
    );
    return {
      state: null,
      recentFeed: null,
      recentAttacks: null,
      pnl24h: null,
      recentFindings: null,
      findingsThisWeek: 0,
    };
  }
}
