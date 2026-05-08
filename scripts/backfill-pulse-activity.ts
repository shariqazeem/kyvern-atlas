/**
 * Backfill historical Pulse trigger fires — KYVERN_FRONTIER_FINAL_SPRINT
 * Phase A.4 (2026-05-08).
 *
 * Until 2026-05-08 the scripted Pulse runner emitted thoughts with
 * `tool_used="read_dex"` even when the thought represented a
 * trigger-fire spend. The economic-timeline renderer keys off
 * tool_used to pick the row verb, so historical fires render as
 * "used read dex $0.10" instead of "bought SOL at $X · spent $Y".
 *
 * The runner now writes `tool_used="pulse_trigger_fire"` for new
 * fires (commit 2026-05-07). This script rewrites the historical
 * tail so every row in the Activity timeline reads consistently.
 *
 * Heuristic: thoughts with tool_used='read_dex' AND amount_usd > 0
 * AND counterparty LIKE 'Kyvern · swap router%' are unambiguously
 * trigger fires — read_dex itself never moves money or has a
 * Kyvern-shaped counterparty.
 *
 * Run on the VM:
 *   cd ~/kyvernlabs-commerce
 *   npx tsx scripts/backfill-pulse-activity.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH =
  process.env.KYVERN_PULSE_DB_PATH ??
  path.resolve(process.cwd(), "pulse.db");

const db = new Database(DB_PATH);

const beforeRow = db
  .prepare(
    `SELECT COUNT(*) AS n FROM agent_thoughts
      WHERE tool_used = 'read_dex'
        AND amount_usd > 0
        AND counterparty LIKE 'Kyvern · swap router%'`,
  )
  .get() as { n: number };

console.log(`[backfill] candidates: ${beforeRow.n}`);
if (beforeRow.n === 0) {
  console.log("[backfill] nothing to fix — exiting clean.");
  db.close();
  process.exit(0);
}

const result = db
  .prepare(
    `UPDATE agent_thoughts
        SET tool_used = 'pulse_trigger_fire'
      WHERE tool_used = 'read_dex'
        AND amount_usd > 0
        AND counterparty LIKE 'Kyvern · swap router%'`,
  )
  .run();

console.log(`[backfill] updated rows: ${result.changes}`);

const afterRow = db
  .prepare(
    `SELECT COUNT(*) AS n FROM agent_thoughts
      WHERE tool_used = 'pulse_trigger_fire'`,
  )
  .get() as { n: number };
console.log(`[backfill] total pulse_trigger_fire rows now: ${afterRow.n}`);

db.close();
console.log("[backfill] done.");
