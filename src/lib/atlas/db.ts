/**
 * Atlas SQLite helpers — the runner and the observability API share
 * one DB file at ~/kyvernlabs-commerce/atlas.db.
 *
 * Kept separate from pulse.db so Atlas's high-frequency writes never
 * contend with Pulse's multi-tenant tables. If Atlas crashes, pulse
 * stays clean, and vice versa.
 */

import Database from "better-sqlite3";
import path from "node:path";
import type {
  AtlasAttack,
  AtlasDecision,
  AtlasState,
} from "./schema";

let _db: Database.Database | null = null;

function atlasDbPath(): string {
  // Allow override for tests / local dev.
  const fromEnv = process.env.KYVERN_ATLAS_DB_PATH;
  if (fromEnv) return fromEnv;
  // Default: sit next to pulse.db in the repo root on the VM.
  return path.join(process.cwd(), "atlas.db");
}

export function getAtlasDb(): Database.Database {
  if (_db) return _db;
  const db = new Database(atlasDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  // ─── Tables ───────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS atlas_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      first_ignition_at TEXT,
      vault_id TEXT,
      network TEXT NOT NULL DEFAULT 'devnet',
      total_cycles INTEGER NOT NULL DEFAULT 0,
      total_spent_usd REAL NOT NULL DEFAULT 0,
      total_earned_usd REAL NOT NULL DEFAULT 0,
      funds_lost_usd REAL NOT NULL DEFAULT 0,
      last_heartbeat_at TEXT,
      /* next_attack_at — written by attacker at schedule time so the
         observatory can render a 'defending · next probe in N:NN'
         countdown. nullable for cold start / no attacker running. */
      next_attack_at TEXT
    );
    /* Lightweight migration: older atlas.db files didn't have this
       column. Adding it idempotently via PRAGMA-safe ALTER. */

    CREATE TABLE IF NOT EXISTS atlas_decisions (
      id TEXT PRIMARY KEY,
      decided_at TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      action TEXT NOT NULL,
      merchant TEXT,
      amount_usd REAL NOT NULL,
      outcome TEXT NOT NULL,
      tx_signature TEXT,
      blocked_reason TEXT,
      latency_ms INTEGER NOT NULL,
      cycle INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_atlas_decisions_decided_at
      ON atlas_decisions(decided_at DESC);
    CREATE INDEX IF NOT EXISTS idx_atlas_decisions_outcome
      ON atlas_decisions(outcome);

    CREATE TABLE IF NOT EXISTS atlas_attacks (
      id TEXT PRIMARY KEY,
      attempted_at TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      blocked_reason TEXT NOT NULL,
      failed_tx_signature TEXT,
      /* source — "scheduled" (PM2 attacker) or "public" (visitor probe).
         Nullable for legacy rows; readers default missing → "scheduled". */
      source TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_atlas_attacks_attempted_at
      ON atlas_attacks(attempted_at DESC);
    CREATE INDEX IF NOT EXISTS idx_atlas_attacks_source
      ON atlas_attacks(source);

    CREATE TABLE IF NOT EXISTS atlas_cycles (
      id INTEGER PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      decision_id TEXT,
      next_cycle_at TEXT
    );
  `);

  // Seed the singleton state row so we never have to null-check it.
  db.prepare(
    `INSERT OR IGNORE INTO atlas_state (id, network) VALUES (1, 'devnet')`,
  ).run();

  // Idempotent column additions — safe on fresh and legacy DBs.
  // SQLite raises if the column already exists; we swallow that.
  const tryAlter = (sql: string) => {
    try {
      db.exec(sql);
    } catch {
      /* already applied */
    }
  };
  tryAlter(`ALTER TABLE atlas_state ADD COLUMN next_attack_at TEXT`);
  tryAlter(`ALTER TABLE atlas_attacks ADD COLUMN source TEXT`);

  _db = db;
  return db;
}

// ─── Helpers used by the runner ───

export function setVaultId(vaultId: string) {
  getAtlasDb()
    .prepare(`UPDATE atlas_state SET vault_id = ? WHERE id = 1`)
    .run(vaultId);
}

export function markIgnition() {
  const db = getAtlasDb();
  const row = db
    .prepare(`SELECT first_ignition_at FROM atlas_state WHERE id = 1`)
    .get() as { first_ignition_at: string | null };
  if (!row?.first_ignition_at) {
    db.prepare(
      `UPDATE atlas_state SET first_ignition_at = ? WHERE id = 1`,
    ).run(new Date().toISOString());
  }
}

export function heartbeat() {
  getAtlasDb()
    .prepare(`UPDATE atlas_state SET last_heartbeat_at = ? WHERE id = 1`)
    .run(new Date().toISOString());
}

/**
 * Attacker calls this right after it queues its next `setTimeout`.
 * The observatory polls the state endpoint, sees the ISO, and the
 * `<LiveTimer/>`-style countdown band fills in. Pass `null` to clear
 * the schedule (e.g. attacker shutting down cleanly).
 */
export function setNextAttackAt(iso: string | null) {
  getAtlasDb()
    .prepare(`UPDATE atlas_state SET next_attack_at = ? WHERE id = 1`)
    .run(iso);
}

export function nextCycleId(): number {
  const db = getAtlasDb();
  const row = db
    .prepare(`SELECT total_cycles FROM atlas_state WHERE id = 1`)
    .get() as { total_cycles: number };
  const next = (row?.total_cycles ?? 0) + 1;
  db.prepare(
    `UPDATE atlas_state SET total_cycles = ? WHERE id = 1`,
  ).run(next);
  return next;
}

export function recordDecision(d: AtlasDecision) {
  const db = getAtlasDb();
  db.prepare(
    `INSERT INTO atlas_decisions
     (id, decided_at, reasoning, action, merchant, amount_usd,
      outcome, tx_signature, blocked_reason, latency_ms, cycle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    d.id,
    d.decidedAt,
    d.reasoning,
    d.action,
    d.merchant,
    d.amountUsd,
    d.outcome,
    d.txSignature,
    d.blockedReason,
    d.latencyMs,
    d.cycle,
  );

  // Accumulate spend / block counters atomically.
  if (d.outcome === "settled") {
    db.prepare(
      `UPDATE atlas_state SET total_spent_usd = total_spent_usd + ? WHERE id = 1`,
    ).run(d.amountUsd);
  }
}

export function recordCycleStart(cycleId: number): void {
  getAtlasDb()
    .prepare(
      `INSERT INTO atlas_cycles (id, started_at) VALUES (?, ?)`,
    )
    .run(cycleId, new Date().toISOString());
}

export function recordCycleEnd(
  cycleId: number,
  decisionId: string,
  nextCycleAt: string,
): void {
  getAtlasDb()
    .prepare(
      `UPDATE atlas_cycles
       SET ended_at = ?, decision_id = ?, next_cycle_at = ?
       WHERE id = ?`,
    )
    .run(new Date().toISOString(), decisionId, nextCycleAt, cycleId);
}

export function recordAttack(a: AtlasAttack): void {
  const db = getAtlasDb();
  db.prepare(
    `INSERT INTO atlas_attacks
     (id, attempted_at, type, description, blocked_reason, failed_tx_signature, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    a.id,
    a.attemptedAt,
    a.type,
    a.description,
    a.blockedReason,
    a.failedTxSignature,
    a.source ?? "scheduled",
  );
}

export function addEarning(amountUsd: number): void {
  getAtlasDb()
    .prepare(
      `UPDATE atlas_state SET total_earned_usd = total_earned_usd + ? WHERE id = 1`,
    )
    .run(amountUsd);
}

// ─── Read-side helpers used by /api/atlas/* ───

export function readState(): AtlasState {
  const db = getAtlasDb();
  const s = db
    .prepare(`SELECT * FROM atlas_state WHERE id = 1`)
    .get() as {
    first_ignition_at: string | null;
    vault_id: string | null;
    network: string;
    total_cycles: number;
    total_spent_usd: number;
    total_earned_usd: number;
    funds_lost_usd: number;
    last_heartbeat_at: string | null;
    next_attack_at: string | null;
  };

  const lastDecisionRow = db
    .prepare(
      `SELECT * FROM atlas_decisions ORDER BY decided_at DESC LIMIT 1`,
    )
    .get() as Record<string, unknown> | undefined;
  const lastAttackRow = db
    .prepare(
      `SELECT * FROM atlas_attacks ORDER BY attempted_at DESC LIMIT 1`,
    )
    .get() as Record<string, unknown> | undefined;

  const totals = db
    .prepare(
      `SELECT
         SUM(CASE WHEN outcome = 'settled' THEN 1 ELSE 0 END) as settled,
         SUM(CASE WHEN outcome = 'blocked' THEN 1 ELSE 0 END) as blocked
       FROM atlas_decisions`,
    )
    .get() as { settled: number | null; blocked: number | null };
  const totalAttacks = db
    .prepare(`SELECT COUNT(*) as n FROM atlas_attacks`)
    .get() as { n: number };

  const nextCycleRow = db
    .prepare(
      `SELECT next_cycle_at FROM atlas_cycles
       WHERE next_cycle_at IS NOT NULL
       ORDER BY id DESC LIMIT 1`,
    )
    .get() as { next_cycle_at: string | null } | undefined;

  // "Running" heuristic: runner has heartbeat'd in the last 2 minutes.
  const now = Date.now();
  const beat = s.last_heartbeat_at
    ? new Date(s.last_heartbeat_at).getTime()
    : 0;
  const running = now - beat < 120_000;

  const firstIgnitionAt = s.first_ignition_at;
  const uptimeMs = firstIgnitionAt
    ? now - new Date(firstIgnitionAt).getTime()
    : 0;

  // ─── Policy window — rolling 24h spend vs configured cap ───────────
  // Matches how per-vault budgets work so the observatory narrative
  // ("policy window healthy / near cap / exhausted") is consistent
  // across the public Atlas card and user vaults. Defaults to $5/day
  // which is what Atlas ships with on devnet; override via env to
  // track a richer cap without code changes.
  const dailyCapUsd = Number(process.env.ATLAS_DAILY_CAP_USD ?? 5);
  const windowStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const win = db
    .prepare(
      `SELECT
         COALESCE(SUM(amount_usd), 0) as spent,
         MIN(decided_at) as oldest
       FROM atlas_decisions
       WHERE outcome = 'settled' AND decided_at >= ?`,
    )
    .get(windowStart) as { spent: number; oldest: string | null };
  const spentTodayUsd = Number(win.spent ?? 0);
  const spendUtilization =
    dailyCapUsd > 0 ? spentTodayUsd / dailyCapUsd : 0;
  const oldestInWindow = win.oldest
    ? new Date(win.oldest).getTime()
    : null;
  const windowResetsAt = oldestInWindow
    ? new Date(oldestInWindow + 24 * 60 * 60 * 1000).toISOString()
    : null;

  return {
    running,
    totalCycles: s.total_cycles,
    firstIgnitionAt,
    uptimeMs,
    totalSettled: totals.settled ?? 0,
    totalSpentUsd: s.total_spent_usd,
    totalEarnedUsd: s.total_earned_usd,
    totalBlocked: totals.blocked ?? 0,
    totalAttacksBlocked: totalAttacks.n,
    fundsLostUsd: s.funds_lost_usd,
    lastDecision: lastDecisionRow
      ? rowToDecision(lastDecisionRow)
      : null,
    lastAttack: lastAttackRow ? rowToAttack(lastAttackRow) : null,
    nextCycleAt: nextCycleRow?.next_cycle_at ?? null,
    nextAttackAt: s.next_attack_at,
    policy: {
      dailyCapUsd,
      spentTodayUsd,
      spendUtilization,
      nearCap: spendUtilization >= 0.8,
      exhausted: spendUtilization >= 1.0,
      windowResetsAt,
    },
    vaultId: s.vault_id,
    network: (s.network as "devnet" | "mainnet") ?? "devnet",
  };
}

export function readRecentDecisions(limit = 20): AtlasDecision[] {
  const db = getAtlasDb();
  const rows = db
    .prepare(
      `SELECT * FROM atlas_decisions ORDER BY decided_at DESC LIMIT ?`,
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToDecision);
}

export function readRecentAttacks(limit = 20): AtlasAttack[] {
  const db = getAtlasDb();
  const rows = db
    .prepare(
      `SELECT * FROM atlas_attacks ORDER BY attempted_at DESC LIMIT ?`,
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToAttack);
}

/**
 * Leaderboard read — aggregated counts powering /atlas and the landing
 * page ticker. Does everything in SQL so we can afford to hit this
 * endpoint from every client poll (500ms-level SQLite work).
 */
export interface LeaderboardData {
  weekly: {
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
  };
  allTime: {
    total: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
  };
  recent: AtlasAttack[];
  fundsLostUsd: number;
  /** Rough estimate of what was "protected" — $0.50 per scheduled attack +
   * amountUsd on blocked decisions (conservative; real value is often higher). */
  fundsProtectedUsd: number;
}

export function readLeaderboard(): LeaderboardData {
  const db = getAtlasDb();
  const now = Date.now();
  const weekAgoIso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const countRows = (since?: string) => {
    const rows = (since
      ? db
          .prepare(
            `SELECT type, source, COUNT(*) as n
             FROM atlas_attacks
             WHERE attempted_at >= ?
             GROUP BY type, source`,
          )
          .all(since)
      : db
          .prepare(
            `SELECT type, source, COUNT(*) as n
             FROM atlas_attacks
             GROUP BY type, source`,
          )
          .all()) as Array<{
      type: string;
      source: string | null;
      n: number;
    }>;
    let total = 0;
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const r of rows) {
      total += r.n;
      byType[r.type] = (byType[r.type] ?? 0) + r.n;
      const src = r.source ?? "scheduled";
      bySource[src] = (bySource[src] ?? 0) + r.n;
    }
    return { total, byType, bySource };
  };

  const weekly = countRows(weekAgoIso);
  const allTime = countRows();

  const recentRows = db
    .prepare(
      `SELECT * FROM atlas_attacks ORDER BY attempted_at DESC LIMIT 8`,
    )
    .all() as Record<string, unknown>[];
  const recent = recentRows.map(rowToAttack);

  const state = db
    .prepare(`SELECT funds_lost_usd FROM atlas_state WHERE id = 1`)
    .get() as { funds_lost_usd: number };

  const blockedDecisionsTotal = db
    .prepare(
      `SELECT COALESCE(SUM(amount_usd), 0) as total
       FROM atlas_decisions
       WHERE outcome = 'blocked'`,
    )
    .get() as { total: number };
  const fundsProtectedUsd =
    (allTime.total * 0.5) + (blockedDecisionsTotal.total ?? 0);

  return {
    weekly,
    allTime,
    recent,
    fundsLostUsd: state?.funds_lost_usd ?? 0,
    fundsProtectedUsd,
  };
}

function rowToDecision(r: Record<string, unknown>): AtlasDecision {
  return {
    id: String(r.id),
    decidedAt: String(r.decided_at),
    reasoning: String(r.reasoning),
    action: r.action as AtlasDecision["action"],
    merchant: (r.merchant as string | null) ?? null,
    amountUsd: Number(r.amount_usd),
    outcome: r.outcome as AtlasDecision["outcome"],
    txSignature: (r.tx_signature as string | null) ?? null,
    blockedReason: (r.blocked_reason as string | null) ?? null,
    latencyMs: Number(r.latency_ms),
    cycle: Number(r.cycle),
  };
}

function rowToAttack(r: Record<string, unknown>): AtlasAttack {
  return {
    id: String(r.id),
    attemptedAt: String(r.attempted_at),
    type: r.type as AtlasAttack["type"],
    description: String(r.description),
    blockedReason: String(r.blocked_reason),
    failedTxSignature: (r.failed_tx_signature as string | null) ?? null,
    source:
      (r.source as AtlasAttack["source"] | null | undefined) ?? "scheduled",
  };
}
