/* ════════════════════════════════════════════════════════════════════
   demo-session.ts — in-memory event bus for the live /demo page
   ────────────────────────────────────────────────────────────────────
   One DemoSession per /demo run. Every event the runner emits lands
   in an append-only ring buffer AND fans out to any live listener
   (the SSE route).

   Design goals
   ────────────
   · Late joiners replay history — so a user refreshing at step 4
     still sees steps 1–3 before catching up.
   · Multiple viewers — more than one browser tab can attach to the
     same session without the runner duplicating work.
   · Bounded memory — the ring buffer caps at 512 events; older events
     fall off the back. Each run is < 50 events so this is a safety net.
   · No deps — plain Node event machinery so Next's edge/node runtime
     differences don't bite us.

   This is singleton-per-process, which matches how Next's dev server
   and a single Vercel lambda behave. For multi-instance production
   we'd swap in Redis Streams, but that's not the hackathon shape.
   ════════════════════════════════════════════════════════════════════ */

import { randomBytes } from "crypto";

export type DemoEventName =
  | "narrative"
  | "think"
  | "attempt" // about to evaluate a payment
  | "policy" // policy engine result (allow/block + per-rule detail)
  | "signing" // Squads cosign started
  | "settled" // on-chain settled — includes real tx signature
  | "blocked" // policy blocked the call
  | "failed" // policy allowed but Squads cosign failed
  | "budget" // budget snapshot update (daily / weekly / velocity)
  | "summary"
  | "pause"
  | "end"
  | "error";

export interface DemoEvent {
  seq: number;
  t: number; // unix ms
  name: DemoEventName;
  data: unknown;
}

type Listener = (ev: DemoEvent) => void;

interface Session {
  id: string;
  createdAt: number;
  vaultId: string | null;
  agentKeyRaw: string | null;
  script: string; // which script is running
  status: "idle" | "running" | "done" | "errored";
  buffer: DemoEvent[];
  listeners: Set<Listener>;
  nextSeq: number;
  abort?: () => void;
}

const SESSIONS = new Map<string, Session>();
const BUFFER_CAP = 512;
const SESSION_TTL_MS = 15 * 60 * 1000; // 15 min

/* ─── Low-level session API ─── */

export function createSession(init: {
  vaultId: string | null;
  agentKeyRaw: string | null;
  script: string;
}): Session {
  const id = `ds_${randomBytes(6).toString("hex")}`;
  const session: Session = {
    id,
    createdAt: Date.now(),
    vaultId: init.vaultId,
    agentKeyRaw: init.agentKeyRaw,
    script: init.script,
    status: "idle",
    buffer: [],
    listeners: new Set(),
    nextSeq: 0,
  };
  SESSIONS.set(id, session);
  return session;
}

export function getSession(id: string): Session | null {
  return SESSIONS.get(id) ?? null;
}

export function emit(
  sessionId: string,
  name: DemoEventName,
  data: unknown,
): DemoEvent | null {
  const s = SESSIONS.get(sessionId);
  if (!s) return null;
  const ev: DemoEvent = {
    seq: s.nextSeq++,
    t: Date.now(),
    name,
    data,
  };
  s.buffer.push(ev);
  if (s.buffer.length > BUFFER_CAP) s.buffer.shift();
  for (const l of s.listeners) {
    try {
      l(ev);
    } catch {
      // A broken listener shouldn't take down the bus.
    }
  }
  if (name === "end" || name === "error") {
    s.status = name === "end" ? "done" : "errored";
  }
  return ev;
}

export function subscribe(
  sessionId: string,
  listener: Listener,
): {
  history: DemoEvent[];
  unsubscribe: () => void;
} | null {
  const s = SESSIONS.get(sessionId);
  if (!s) return null;
  const history = s.buffer.slice();
  s.listeners.add(listener);
  return {
    history,
    unsubscribe: () => {
      s.listeners.delete(listener);
    },
  };
}

export function markRunning(sessionId: string): void {
  const s = SESSIONS.get(sessionId);
  if (s) s.status = "running";
}

export function setAbort(sessionId: string, fn: () => void): void {
  const s = SESSIONS.get(sessionId);
  if (s) s.abort = fn;
}

/* ─── Housekeeping ─── */

export function sweepSessions(): void {
  const now = Date.now();
  for (const [id, s] of SESSIONS) {
    if (now - s.createdAt > SESSION_TTL_MS && s.listeners.size === 0) {
      SESSIONS.delete(id);
    }
  }
}

// Passive sweep every few minutes, never on a hot path.
if (typeof setInterval !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  setInterval(sweepSessions, 2 * 60 * 1000).unref?.();
}
