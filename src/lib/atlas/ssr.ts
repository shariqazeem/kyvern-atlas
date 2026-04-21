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

export interface AtlasSnapshot {
  state: AtlasState | null;
  recentFeed:
    | Array<
        | (AtlasDecision & { _kind: "decision"; _when: string })
        | (AtlasAttack & { _kind: "attack"; _when: string })
      >
    | null;
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
    const decisions = readRecentDecisions(40).map((d) => ({
      ...d,
      _kind: "decision" as const,
      _when: d.decidedAt,
    }));
    const attacks = readRecentAttacks(40).map((a) => ({
      ...a,
      _kind: "attack" as const,
      _when: a.attemptedAt,
    }));
    const recentFeed = [...decisions, ...attacks]
      .sort((a, b) => (b._when > a._when ? 1 : -1))
      .slice(0, 40);
    return { state, recentFeed };
  } catch (e) {
    // Log but don't throw — SSR must be resilient. Worst case, the
    // client component sees `null` and renders its own loading state.
    console.warn(
      "[atlas/ssr] could not read initial snapshot:",
      e instanceof Error ? e.message : String(e),
    );
    return { state: null, recentFeed: null };
  }
}
