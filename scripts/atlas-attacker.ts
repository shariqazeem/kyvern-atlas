#!/usr/bin/env -S npx tsx
/**
 * atlas-attacker.ts — standalone adversary probing Atlas every ~22m.
 *
 * Supervised by PM2 on the VM:
 *
 *   pm2 start 'npx tsx scripts/atlas-attacker.ts' \
 *     --name atlas-attacker \
 *     --max-memory-restart 300M
 *
 * Required env:
 *   KYVERN_BASE_URL         — same as Atlas (default http://127.0.0.1:3001)
 *   KYVERNLABS_AGENT_KEY    — Atlas's agent key (attacker impersonates Atlas)
 *   ATLAS_RECIPIENT         — optional override (default demo test recipient)
 *   ATLAS_ATTACK_MS         — cadence in ms (default 22 min)
 *   KYVERN_ATLAS_DB_PATH    — sqlite path shared with runner
 */

import { runAttacker } from "../src/lib/atlas/attacker";

runAttacker().catch((err) => {
  console.error("[attacker] fatal:", err);
  process.exit(1);
});
