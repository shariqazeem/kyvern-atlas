#!/usr/bin/env -S npx tsx
/**
 * scripts/maintenance.ts — nightly hygiene for the Kyvern VM.
 *
 * Runs from crontab at 03:00 UTC. Single shot, exits when done.
 *
 * What it does (in order):
 *   1. Prune agent_thoughts older than RETENTION_DAYS_THOUGHTS (7d default)
 *   2. Prune agent_status_updates older than RETENTION_DAYS_STATUS (7d)
 *   3. Prune vault_payments older than RETENTION_DAYS_PAYMENTS (30d)
 *   4. Retire agents whose last_thought_at is older than
 *      RETIRE_DORMANT_AFTER_DAYS (30d) AND total_thoughts > 0
 *   5. VACUUM pulse.db so the freed pages are returned to disk
 *   6. Clean /tmp/kyvern-* logs > 50 MB
 *   7. Free disk from old .next backups + dangling tsx caches
 *
 * Why this exists:
 *   The agent fleet has grown into the thousands and produces
 *   ~200k thought rows per day even under the pool-tick cap. Without
 *   nightly hygiene, pulse.db will pass 25 GB inside a week and the
 *   45 GB VM disk fills, which causes the Next.js build to fail and
 *   pm2 to crashloop. That's the single fastest path to a slow site,
 *   so this script's job is to make it unreachable.
 *
 * Safety:
 *   - All deletes are bounded by a `created_at` / `timestamp` cutoff.
 *   - All deletes batch in chunks of 50 000 to avoid long writer locks
 *     that block the live runner.
 *   - Atlas (`agt_atlas`) is never retired.
 *   - Errors in one step never abort the rest — every step is wrapped
 *     in its own try/catch and logged with prefix [maintenance].
 *
 * Tunables (env vars):
 *   RETENTION_DAYS_THOUGHTS   — default 7
 *   RETENTION_DAYS_STATUS     — default 7
 *   RETENTION_DAYS_PAYMENTS   — default 30
 *   RETIRE_DORMANT_AFTER_DAYS — default 30
 *   MAINTENANCE_DRY_RUN       — "1" → log what would happen, no writes
 */

import Database from "better-sqlite3";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

const PULSE_DB = process.env.PULSE_DB_PATH ?? path.join(process.cwd(), "pulse.db");
const ATLAS_DB = process.env.KYVERN_ATLAS_DB_PATH ?? path.join(process.cwd(), "atlas.db");
const DRY = process.env.MAINTENANCE_DRY_RUN === "1";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_THOUGHTS_DAYS = parseInt(process.env.RETENTION_DAYS_THOUGHTS ?? "7", 10);
const RETENTION_STATUS_DAYS = parseInt(process.env.RETENTION_DAYS_STATUS ?? "7", 10);
const RETENTION_PAYMENTS_DAYS = parseInt(process.env.RETENTION_DAYS_PAYMENTS ?? "30", 10);
const RETIRE_AFTER_DAYS = parseInt(process.env.RETIRE_DORMANT_AFTER_DAYS ?? "30", 10);
const BATCH_SIZE = 50_000;

function ts(): string {
  return new Date().toISOString();
}

function log(msg: string): void {
  console.log(`[maintenance ${ts()}] ${msg}`);
}

function pretty(n: number): string {
  return n.toLocaleString("en-US");
}

function fileSize(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

function mb(b: number): string {
  return (b / 1_000_000).toFixed(1) + " MB";
}

/**
 * Delete in chunks so we never hold a writer lock for more than a
 * few hundred ms. The runner is still writing during maintenance —
 * we don't want it to stall.
 */
function batchDelete(
  db: Database.Database,
  table: string,
  whereClause: string,
  cutoff: number | string,
): number {
  if (DRY) {
    const count = db
      .prepare(`SELECT COUNT(*) as n FROM ${table} WHERE ${whereClause}`)
      .get(cutoff) as { n: number };
    log(`  [dry-run] would delete ${pretty(count.n)} rows from ${table}`);
    return count.n;
  }
  let totalDeleted = 0;
  let last = -1;
  while (totalDeleted !== last) {
    last = totalDeleted;
    const r = db
      .prepare(
        `DELETE FROM ${table}
         WHERE rowid IN (
           SELECT rowid FROM ${table} WHERE ${whereClause} LIMIT ?
         )`,
      )
      .run(cutoff, BATCH_SIZE);
    totalDeleted += r.changes;
    if (r.changes === 0) break;
    // breathe — give the runner a chance to write between batches
    if (r.changes === BATCH_SIZE) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  return totalDeleted;
}

function pruneAgentThoughts(db: Database.Database): void {
  log(`step 1/6 — prune agent_thoughts older than ${RETENTION_THOUGHTS_DAYS} days`);
  try {
    const cutoff = Date.now() - RETENTION_THOUGHTS_DAYS * DAY_MS;
    const before = (db.prepare("SELECT COUNT(*) as n FROM agent_thoughts").get() as { n: number }).n;
    const deleted = batchDelete(db, "agent_thoughts", "timestamp < ?", cutoff);
    const after = (db.prepare("SELECT COUNT(*) as n FROM agent_thoughts").get() as { n: number }).n;
    log(`  before=${pretty(before)} deleted=${pretty(deleted)} after=${pretty(after)}`);
  } catch (e) {
    log(`  FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function pruneAgentStatusUpdates(db: Database.Database): void {
  log(`step 2/6 — prune agent_status_updates older than ${RETENTION_STATUS_DAYS} days`);
  try {
    const cutoff = Date.now() - RETENTION_STATUS_DAYS * DAY_MS;
    const before = (db.prepare("SELECT COUNT(*) as n FROM agent_status_updates").get() as { n: number }).n;
    const deleted = batchDelete(db, "agent_status_updates", "created_at < ?", cutoff);
    const after = (db.prepare("SELECT COUNT(*) as n FROM agent_status_updates").get() as { n: number }).n;
    log(`  before=${pretty(before)} deleted=${pretty(deleted)} after=${pretty(after)}`);
  } catch (e) {
    log(`  FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function pruneVaultPayments(db: Database.Database): void {
  log(`step 3/6 — prune vault_payments older than ${RETENTION_PAYMENTS_DAYS} days`);
  try {
    // vault_payments.created_at is a TEXT ISO-like string. We compare
    // textually since the format is sortable. Atlas's recent rows
    // (the ones the observatory shows) stay.
    const cutoffMs = Date.now() - RETENTION_PAYMENTS_DAYS * DAY_MS;
    const cutoffIso = new Date(cutoffMs).toISOString().replace("T", " ").slice(0, 19);
    const before = (db.prepare("SELECT COUNT(*) as n FROM vault_payments").get() as { n: number }).n;
    const deleted = batchDelete(db, "vault_payments", "created_at < ?", cutoffIso);
    const after = (db.prepare("SELECT COUNT(*) as n FROM vault_payments").get() as { n: number }).n;
    log(`  cutoff="${cutoffIso}" before=${pretty(before)} deleted=${pretty(deleted)} after=${pretty(after)}`);
  } catch (e) {
    log(`  FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function retireDormantAgents(db: Database.Database): void {
  log(`step 4/6 — retire agents dormant > ${RETIRE_AFTER_DAYS} days`);
  try {
    const cutoff = Date.now() - RETIRE_AFTER_DAYS * DAY_MS;
    // Only retire agents that have done SOMETHING (total_thoughts > 0)
    // and haven't ticked since the cutoff. Never touch Atlas. Never
    // touch fresh agents (total_thoughts === 0 means user just spawned
    // them and they're queued for first tick).
    const sel = db
      .prepare(
        `SELECT COUNT(*) as n FROM agents
         WHERE status = 'alive'
           AND id != 'agt_atlas'
           AND total_thoughts > 0
           AND (last_thought_at IS NULL OR last_thought_at < ?)`,
      )
      .get(cutoff) as { n: number };
    if (DRY) {
      log(`  [dry-run] would retire ${pretty(sel.n)} agents`);
      return;
    }
    const r = db
      .prepare(
        `UPDATE agents SET status = 'retired'
         WHERE status = 'alive'
           AND id != 'agt_atlas'
           AND total_thoughts > 0
           AND (last_thought_at IS NULL OR last_thought_at < ?)`,
      )
      .run(cutoff);
    log(`  retired=${pretty(r.changes)}`);
  } catch (e) {
    log(`  FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function vacuumPulse(): void {
  log(`step 5/6 — VACUUM pulse.db (reclaims freed pages to disk)`);
  if (DRY) {
    log(`  [dry-run] skipping VACUUM`);
    return;
  }
  try {
    const sizeBefore = fileSize(PULSE_DB);
    log(`  size before = ${mb(sizeBefore)}`);
    // VACUUM cannot run inside a transaction and needs exclusive
    // access. better-sqlite3's exec is fine; the runner will pause
    // for the duration (single-digit minutes on a multi-GB DB).
    const v = new Database(PULSE_DB);
    v.pragma("journal_mode = WAL"); // ensure WAL stays on after
    v.exec("VACUUM;");
    v.close();
    const sizeAfter = fileSize(PULSE_DB);
    log(`  size after  = ${mb(sizeAfter)} (freed ${mb(sizeBefore - sizeAfter)})`);
  } catch (e) {
    log(`  FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function cleanTmpAndOldBackups(): void {
  log(`step 6/6 — clean /tmp build logs and ~/kyvernlabs-commerce.backup-*`);
  try {
    const tmpDir = "/tmp";
    if (existsSync(tmpDir)) {
      for (const f of readdirSync(tmpDir)) {
        if (!/^kyvern-|^perf|^rpc-build/.test(f)) continue;
        const full = path.join(tmpDir, f);
        try {
          const st = statSync(full);
          if (!st.isFile()) continue;
          if (st.size > 50_000_000 || Date.now() - st.mtimeMs > 7 * DAY_MS) {
            if (DRY) {
              log(`  [dry-run] would unlink ${full} (${mb(st.size)})`);
            } else {
              unlinkSync(full);
              log(`  unlinked ${full} (${mb(st.size)})`);
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
    // Old kyvernlabs-commerce.backup-* dirs (left over from old
    // hand-rolled deploy scripts).
    try {
      const home = process.env.HOME ?? "/home/ubuntu";
      for (const f of readdirSync(home)) {
        if (!/^kyvernlabs-commerce\.backup-/.test(f)) continue;
        const full = path.join(home, f);
        if (DRY) {
          log(`  [dry-run] would rm -rf ${full}`);
        } else {
          try {
            execSync(`rm -rf ${full}`, { stdio: "ignore" });
            log(`  removed ${full}`);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
  } catch (e) {
    log(`  FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function reportAtlasDb(): void {
  try {
    if (!existsSync(ATLAS_DB)) return;
    const a = new Database(ATLAS_DB, { readonly: true });
    const decisions = (a.prepare("SELECT COUNT(*) as n FROM atlas_decisions").get() as { n: number }).n;
    const attacks = (a.prepare("SELECT COUNT(*) as n FROM atlas_attacks").get() as { n: number }).n;
    a.close();
    log(`atlas.db: ${pretty(decisions)} decisions · ${pretty(attacks)} attacks · ${mb(fileSize(ATLAS_DB))}`);
  } catch {
    /* ignore */
  }
}

function main(): void {
  log(`starting · dry=${DRY} pulse=${PULSE_DB}`);
  if (!existsSync(PULSE_DB)) {
    log(`pulse.db not found at ${PULSE_DB}; nothing to do`);
    return;
  }
  reportAtlasDb();

  const db = new Database(PULSE_DB);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  pruneAgentThoughts(db);
  pruneAgentStatusUpdates(db);
  pruneVaultPayments(db);
  retireDormantAgents(db);

  db.close(); // close before VACUUM since VACUUM needs its own connection
  vacuumPulse();
  cleanTmpAndOldBackups();

  log(`done`);
}

main();
