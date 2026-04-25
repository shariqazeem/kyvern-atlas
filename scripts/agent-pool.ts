#!/usr/bin/env -S npx tsx
/**
 * agent-pool.ts — PM2 worker that ticks all user-spawned agents.
 *
 * NOT to be confused with atlas-runner. This pool process handles
 * agents spawned by users (templates: scout/analyst/hunter/greeter/custom).
 * Atlas (template='atlas') has its own dedicated runner and is skipped.
 *
 * On the VM:
 *   pm2 start 'npx tsx scripts/agent-pool.ts' \
 *     --name agent-pool \
 *     --max-memory-restart 500M
 *
 * Required env:
 *   KYVERN_BASE_URL          — where /api/agents/pool-tick lives
 *                              (default http://127.0.0.1:3001)
 *   AGENT_POOL_INTERVAL_MS   — how often to scan for due agents
 *                              (default 10000 = 10s)
 *
 * The actual tick logic lives in src/lib/agents/runner.ts (server-side).
 * This worker just hits /api/agents/pool-tick on a timer so the Next.js
 * server processes the work in its own runtime (with its DB connection).
 */

const BASE_URL = process.env.KYVERN_BASE_URL ?? "http://127.0.0.1:3001";
const INTERVAL_MS = parseInt(process.env.AGENT_POOL_INTERVAL_MS ?? "10000", 10);

let cycle = 0;

async function tick(): Promise<void> {
  cycle++;
  try {
    const res = await fetch(`${BASE_URL}/api/agents/pool-tick`, { method: "POST" });
    if (!res.ok) {
      console.error(`[agent-pool] cycle ${cycle}: HTTP ${res.status}`);
      return;
    }
    const data = (await res.json()) as { ticked: number; errors: number };
    if (data.ticked > 0 || data.errors > 0) {
      console.log(
        `[agent-pool] cycle ${cycle} · ticked: ${data.ticked} · errors: ${data.errors}`,
      );
    }
  } catch (e) {
    console.error(`[agent-pool] cycle ${cycle} fetch failed:`, e);
  }
}

console.log(
  `[agent-pool] starting · interval ${INTERVAL_MS}ms · base ${BASE_URL}`,
);

// Tick immediately, then on interval
void tick();
setInterval(tick, INTERVAL_MS);

// Keep alive
process.on("SIGTERM", () => {
  console.log("[agent-pool] SIGTERM — shutting down");
  process.exit(0);
});
