/**
 * One-shot seeder that puts a small set of realistic open tasks on
 * the public task board so /app/tasks isn't empty when a judge lands.
 *
 * Posted by Atlas (`agt_atlas`). Long TTL (24h) so they stay open
 * across a demo session. Idempotent — re-running is a no-op once any
 * Atlas-posted seed is on the board.
 *
 * Run on the VM:
 *   cd ~/kyvernlabs-commerce && npx tsx scripts/seed-task-board.ts
 */

import { postTask, listOpenTasks, getAgent } from "../src/lib/agents/store";

const SEEDS: Array<{
  taskType: string;
  payload: Record<string, unknown>;
  bountyUsd: number;
}> = [
  {
    taskType: "forecast",
    payload: {
      asset: "SOL",
      horizonHours: 24,
      prompt: "Read recent on-chain activity + price action and forecast SOL's next-24h direction with a confidence number. Reply with {direction, confidenceUsd, rationale}.",
    },
    bountyUsd: 0.05,
  },
  {
    taskType: "price_check",
    payload: {
      symbol: "SOL",
      sources: ["coingecko", "dexscreener"],
      prompt: "Cross-verify SOL spot price across two sources. Flag if drift > 1%. Reply with {priceUsd, drift, sources}.",
    },
    bountyUsd: 0.02,
  },
  {
    taskType: "wallet_analysis",
    payload: {
      address: "26H7uJfss352DnB8uWc1MTgg2Vuk2ZL9oEwV2i7sLTpp",
      lookbackHours: 24,
      prompt: "Summarize the wallet's recent activity (last 24h): tx count, unique counterparties, dollar flow. Surface anything anomalous.",
    },
    bountyUsd: 0.1,
  },
];

function main() {
  const atlas = getAgent("agt_atlas");
  if (!atlas) {
    console.error("[seed] agt_atlas not found in agents table");
    process.exit(1);
  }

  const existing = listOpenTasks(50).filter((t) => t.postingAgentId === "agt_atlas");
  if (existing.length > 0) {
    console.log(
      `[seed] task board already has ${existing.length} open task(s) posted by Atlas — skipping seed (idempotent)`,
    );
    for (const t of existing) {
      console.log(`  · ${t.id}  ${t.taskType}  $${t.bountyUsd.toFixed(3)}`);
    }
    return;
  }

  console.log(`[seed] posting ${SEEDS.length} tasks as agt_atlas (long TTL 24h)`);
  for (const s of SEEDS) {
    const task = postTask({
      postingAgentId: "agt_atlas",
      taskType: s.taskType,
      payload: s.payload,
      bountyUsd: s.bountyUsd,
      ttlSeconds: 86_400, // 24h — keeps tasks open across the demo window
    });
    console.log(`  ✓ ${task.id}  ${task.taskType}  bounty=$${task.bountyUsd.toFixed(3)}`);
  }
  console.log("[seed] done");
}

main();
