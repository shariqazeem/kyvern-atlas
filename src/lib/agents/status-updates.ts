/**
 * agent_status_updates — store + read helpers.
 *
 * These rows drive the agent detail page's first-60s BootSequence
 * stack. They're ephemeral by design: a 5-minute GC sweeps anything
 * older than that on every read.
 *
 * Two flavours:
 *
 *   kind='boot' — written once at spawn time with future created_at
 *                  offsets, so the client polls and reveals each beat
 *                  as time elapses. step_index is 0..6.
 *
 *   kind='tick' — written by the runner during steady-state ticks for
 *                  the LiveWorkerCard's STATE pill (e.g. "scanning",
 *                  "drafting"). Latest one wins.
 */
import { getDb } from "../db";

const FIVE_MIN_MS = 5 * 60 * 1000;

export type StatusUpdateKind = "boot" | "tick";

export interface StatusUpdateRow {
  id: string;
  agentId: string;
  message: string;
  kind: StatusUpdateKind;
  stepIndex: number;
  createdAt: number;
}

interface DbRow {
  id: string;
  agent_id: string;
  message: string;
  kind: string;
  step_index: number;
  created_at: number;
}

function dbRowToStatusUpdate(r: DbRow): StatusUpdateRow {
  return {
    id: r.id,
    agentId: r.agent_id,
    message: r.message,
    kind: r.kind === "tick" ? "tick" : "boot",
    stepIndex: r.step_index,
    createdAt: r.created_at,
  };
}

/** Insert the 7-beat boot timeline at spawn. Each beat's created_at is
 *  set to spawnedAt + offsetMs[i], so the client unwraps them as time
 *  passes. */
export function writeBootBeats(input: {
  agentId: string;
  spawnedAt: number;
  beats: string[];           // exactly BOOT_BEAT_COUNT entries
  offsetsMs: number[];       // exactly BOOT_BEAT_COUNT entries
}): void {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO agent_status_updates (id, agent_id, message, kind, step_index, created_at)
     VALUES (?, ?, ?, 'boot', ?, ?)`,
  );
  const tx = db.transaction((rows: { id: string; message: string; idx: number; ts: number }[]) => {
    for (const r of rows) insert.run(r.id, input.agentId, r.message, r.idx, r.ts);
  });
  const rows = input.beats.map((message, idx) => ({
    id: `stu_${input.agentId.slice(-6)}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    message,
    idx,
    ts: input.spawnedAt + (input.offsetsMs[idx] ?? 0),
  }));
  tx(rows);
}

/** Append a single 'tick' status update — used by the runner during
 *  normal ticks to power the LiveWorkerCard state pill. */
export function writeTickStatus(agentId: string, message: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO agent_status_updates (id, agent_id, message, kind, step_index, created_at)
     VALUES (?, ?, ?, 'tick', 0, ?)`,
  ).run(`stu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, agentId, message, Date.now());
}

/** GC older-than-5min rows for one agent. Cheap; runs on every read. */
function gcStatusUpdates(agentId: string): void {
  getDb()
    .prepare(`DELETE FROM agent_status_updates WHERE agent_id = ? AND created_at < ?`)
    .run(agentId, Date.now() - FIVE_MIN_MS);
}

/** Boot beats whose created_at <= now. Returns ordered ascending by
 *  step_index, capped at 7. */
export function listVisibleBootBeats(agentId: string): StatusUpdateRow[] {
  gcStatusUpdates(agentId);
  const rows = getDb()
    .prepare(
      `SELECT * FROM agent_status_updates
       WHERE agent_id = ? AND kind = 'boot' AND created_at <= ?
       ORDER BY step_index ASC
       LIMIT 7`,
    )
    .all(agentId, Date.now()) as DbRow[];
  return rows.map(dbRowToStatusUpdate);
}

/** Latest 'tick' status update — used by the LiveWorkerCard. */
export function latestTickStatus(agentId: string): StatusUpdateRow | null {
  gcStatusUpdates(agentId);
  const row = getDb()
    .prepare(
      `SELECT * FROM agent_status_updates
       WHERE agent_id = ? AND kind = 'tick'
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(agentId) as DbRow | undefined;
  return row ? dbRowToStatusUpdate(row) : null;
}
