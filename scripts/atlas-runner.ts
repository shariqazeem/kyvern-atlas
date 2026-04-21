#!/usr/bin/env -S npx tsx
/**
 * atlas-runner.ts — the standalone process that runs Atlas 24/7.
 *
 * On the VM, this is supervised by PM2 alongside kyvern-commerce:
 *
 *   pm2 start 'npx tsx scripts/atlas-runner.ts' \
 *     --name atlas \
 *     --max-memory-restart 500M
 *
 * Required env:
 *   KYVERN_BASE_URL         — where /api/vault/pay lives (default
 *                             http://127.0.0.1:3001)
 *   KYVERNLABS_AGENT_KEY    — Atlas's agent key (kv_live_…)
 *   ATLAS_VAULT_ID          — vlt_… the vault that owns Atlas's funds
 *   ATLAS_RECIPIENT         — pubkey Atlas pays (default: the demo
 *                             devnet test recipient)
 *   ATLAS_CYCLE_MS          — how often Atlas decides (default 120000)
 *   KYVERN_ATLAS_DB_PATH    — override sqlite path (default ./atlas.db)
 */

import { runAtlas } from "../src/lib/atlas/runner";

runAtlas().catch((err) => {
  console.error("[atlas] fatal:", err);
  process.exit(1);
});
