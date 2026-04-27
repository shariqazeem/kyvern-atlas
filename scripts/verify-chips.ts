/**
 * verify-chips — end-to-end test for every Path C jobSuggestion chip.
 *
 * For each chip across the 5 picker templates:
 *   1. Spawn a worker on a fresh test vault (HTTP)
 *   2. Trigger one manual tick (HTTP)
 *   3. Read back the inbox + thoughts + signals
 *
 * Reports a green/red/idle row per chip. "Idle" = the tool worked but
 * had nothing new to surface this cycle (correct behaviour, not broken).
 *
 * Run on the VM:
 *   cd ~/kyvernlabs-commerce && npx tsx scripts/verify-chips.ts
 */

import Database from "better-sqlite3";
import { TEMPLATES } from "../src/lib/agents/templates";
import type { Signal } from "../src/lib/agents/types";

const BASE_URL = process.env.KYVERN_BASE_URL ?? "http://127.0.0.1:3001";
const DB_PATH = process.env.PULSE_DB_PATH ?? "./pulse.db";

interface ChipSpec {
  template: string;
  label: string;
  job: string;
}

interface ChipResult {
  chip: ChipSpec;
  status: "green" | "idle" | "tool-error" | "tick-error" | "spawn-error";
  agentId?: string;
  thought?: string;
  signalsCount: number;
  signalSubject?: string;
  signalSourceUrl?: string;
  error?: string;
}

function gatherChips(): ChipSpec[] {
  return TEMPLATES.filter((t) => t.inPicker).flatMap((t) =>
    t.jobSuggestions.map((s) => ({
      template: t.id,
      label: s.label,
      job: s.job,
    })),
  );
}

function createTestVault(): string {
  const db = new Database(DB_PATH);
  const id = `vlt_VRFY${Date.now().toString(36).slice(-10)}`;
  db.prepare(
    `INSERT INTO vaults (
      id, owner_wallet, name, emoji, purpose,
      daily_limit_usd, weekly_limit_usd, per_tx_max_usd,
      max_calls_per_window, velocity_window,
      allowed_merchants, require_memo, squads_address, network
    ) VALUES (
      @id, @owner_wallet, @name, @emoji, @purpose,
      @daily_limit_usd, @weekly_limit_usd, @per_tx_max_usd,
      @max_calls_per_window, @velocity_window,
      @allowed_merchants, @require_memo, @squads_address, @network
    )`,
  ).run({
    id,
    owner_wallet: "verify_test",
    name: "ChipVerify",
    emoji: "🧪",
    purpose: "chip verification",
    daily_limit_usd: 5,
    weekly_limit_usd: 25,
    per_tx_max_usd: 1,
    max_calls_per_window: 100,
    velocity_window: 3600,
    allowed_merchants: JSON.stringify([]),
    require_memo: 0,
    // Schema requires NOT NULL — placeholder PDA, never used because the
    // verification chips are read-only (no pay/settle path).
    squads_address: "11111111111111111111111111111111",
    network: "devnet",
  });
  db.close();
  return id;
}

function cleanupTestVault(vaultId: string) {
  const db = new Database(DB_PATH);
  // delete cascade — agents, thoughts, signals, vault
  db.prepare("DELETE FROM agent_thoughts WHERE agent_id IN (SELECT id FROM agents WHERE device_id = ?)").run(vaultId);
  db.prepare("DELETE FROM signals WHERE device_id = ?").run(vaultId);
  db.prepare("DELETE FROM agents WHERE device_id = ?").run(vaultId);
  db.prepare("DELETE FROM device_log WHERE device_id = ?").run(vaultId);
  db.prepare("DELETE FROM vaults WHERE id = ?").run(vaultId);
  db.close();
}

async function spawnWorker(
  vaultId: string,
  chip: ChipSpec,
  index: number,
): Promise<{ agentId?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/api/agents/spawn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: vaultId,
      template: chip.template,
      name: `Verify${index}`,
      emoji: "🧪",
      jobPrompt: chip.job,
      isPublic: false,
    }),
  });
  const text = await res.text();
  if (!res.ok) return { error: `spawn ${res.status}: ${text.slice(0, 200)}` };
  try {
    const json = JSON.parse(text);
    return { agentId: json.agent?.id };
  } catch {
    return { error: `spawn parse: ${text.slice(0, 200)}` };
  }
}

async function tickWorker(agentId: string): Promise<{
  success: boolean;
  thought?: string;
  reason?: string;
}> {
  const res = await fetch(`${BASE_URL}/api/agents/${agentId}/tick`, { method: "POST" });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return {
      success: json.success === true,
      thought: typeof json.thought === "string" ? json.thought : undefined,
      reason: json.reason,
    };
  } catch {
    return { success: false, reason: text.slice(0, 200) };
  }
}

async function getInbox(vaultId: string): Promise<Signal[]> {
  const res = await fetch(`${BASE_URL}/api/devices/${vaultId}/inbox`);
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json.signals) ? (json.signals as Signal[]) : [];
}

async function verifyOne(
  vaultId: string,
  chip: ChipSpec,
  index: number,
): Promise<ChipResult> {
  const spawn = await spawnWorker(vaultId, chip, index);
  if (!spawn.agentId) {
    return { chip, status: "spawn-error", signalsCount: 0, error: spawn.error };
  }
  const tick = await tickWorker(spawn.agentId);
  if (!tick.success) {
    return {
      chip,
      agentId: spawn.agentId,
      status: "tick-error",
      thought: tick.thought,
      signalsCount: 0,
      error: tick.reason,
    };
  }
  const inbox = await getInbox(vaultId);
  const mySignals = inbox.filter((s) => s.agentId === spawn.agentId);
  if (mySignals.length > 0) {
    const first = mySignals[0];
    return {
      chip,
      agentId: spawn.agentId,
      status: "green",
      thought: tick.thought,
      signalsCount: mySignals.length,
      signalSubject: first.subject,
      signalSourceUrl: first.sourceUrl ?? undefined,
    };
  }
  // Tick succeeded, no signal — was the thought a tool error or a clean idle?
  const t = (tick.thought ?? "").toLowerCase();
  const looksLikeToolError =
    t.includes("not a valid solana address") ||
    t.includes("could not resolve") ||
    t.includes("fetch failed") ||
    t.includes("rpc unavailable") ||
    t.includes("404");
  return {
    chip,
    agentId: spawn.agentId,
    status: looksLikeToolError ? "tool-error" : "idle",
    thought: tick.thought,
    signalsCount: 0,
  };
}

async function main() {
  const chips = gatherChips();
  console.log(`Verifying ${chips.length} chips against ${BASE_URL}`);
  const vaultId = createTestVault();
  console.log(`Test vault: ${vaultId}\n`);

  // Run sequentially — parallel ticks would overload the LLM provider rate
  // limit and confuse logs. 14 chips × ~30s ≈ 7 minutes.
  const results: ChipResult[] = [];
  for (let i = 0; i < chips.length; i++) {
    const chip = chips[i];
    process.stdout.write(`[${i + 1}/${chips.length}] ${chip.template} :: ${chip.label} … `);
    const result = await verifyOne(vaultId, chip, i);
    results.push(result);
    console.log(result.status.toUpperCase());
  }

  // Pretty report
  console.log("\n────────────────────────────────────────────────────");
  console.log("Chip verification report");
  console.log("────────────────────────────────────────────────────");
  for (const r of results) {
    const icon =
      r.status === "green"
        ? "✅"
        : r.status === "idle"
          ? "○"
          : r.status === "tool-error"
            ? "⚠️ "
            : "❌";
    console.log(`\n${icon} [${r.chip.template}] ${r.chip.label}`);
    console.log(`   status: ${r.status}`);
    if (r.thought) {
      console.log(`   thought: ${r.thought.slice(0, 140).replace(/\n/g, " ")}`);
    }
    if (r.signalSubject) {
      console.log(`   signal:  "${r.signalSubject}"`);
    }
    if (r.signalSourceUrl) {
      console.log(`   source:  ${r.signalSourceUrl}`);
    }
    if (r.error) {
      console.log(`   error:   ${r.error}`);
    }
  }

  // Counts
  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n────────────────────────────────────────────────────");
  console.log("Summary:", counts);

  // Cleanup unless --keep
  if (!process.argv.includes("--keep")) {
    cleanupTestVault(vaultId);
    console.log(`Cleaned up test vault ${vaultId}.`);
  } else {
    console.log(`Test vault kept: ${vaultId}`);
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
