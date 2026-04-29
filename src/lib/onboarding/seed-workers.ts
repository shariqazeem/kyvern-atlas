/**
 * seed-workers — pre-spawn the demo trio when /unbox completes.
 *
 * The single highest-leverage onboarding change: when a fresh user
 * lands on /app for the first time, they shouldn't see an empty
 * device with a "Hire your first worker" CTA. They should see three
 * workers ALREADY running: Sentinel on Superteam, Wren on Kraken,
 * Pulse on SOL. The first finding lands within 90 seconds of unboxing.
 *
 * The trio is built from the existing picker templates' chip jobs —
 * not invented for the seeding flow. So everything that ships in the
 * regular spawn path (boot beats, first messages, signal kinds) lights
 * up identically for these auto-spawned workers.
 *
 * Idempotency: every call goes through `seedDefaultWorkersIfEmpty`
 * which checks the device's worker list first. If the device already
 * has any workers, the seed is a no-op. Re-running /unbox completion
 * will not double-spawn.
 */

import { TEMPLATES } from "@/lib/agents/templates";
import type { AgentTemplateDef } from "@/lib/agents/types";

/** Names are pulled from NAME_POOL but pinned per-template so the
 *  trio reads as the same characters every time across demos. */
const SEED_NAMES = {
  bounty_hunter: "Sentinel",
  whale_tracker: "Wren",
  token_pulse: "Pulse",
} as const;

interface SeedSpec {
  template: string;
  name: string;
  emoji: string;
  personalityPrompt: string;
  jobPrompt: string;
  allowedTools: string[];
  frequencySeconds: number;
}

function findTemplate(id: string): AgentTemplateDef {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`seed-workers: missing template ${id}`);
  return t;
}

function specFromTemplate(id: keyof typeof SEED_NAMES): SeedSpec {
  const t = findTemplate(id);
  // First chip = the demo job. The chips are hand-curated jobs that
  // hit real APIs and produce real findings; the first chip is always
  // the cleanest screenshot.
  const job = t.jobSuggestions[0]?.job ?? t.jobPromptExample;
  return {
    template: id,
    name: SEED_NAMES[id],
    emoji: t.emoji,
    personalityPrompt: t.personalityPrompt,
    jobPrompt: job,
    allowedTools: t.recommendedTools,
    frequencySeconds: t.defaultFrequencySeconds,
  };
}

/** The locked demo trio — same three workers every fresh unbox. */
export function getDefaultWorkerSeeds(): SeedSpec[] {
  return [
    specFromTemplate("bounty_hunter"),  // Sentinel · Superteam Dev >$500
    specFromTemplate("whale_tracker"),  // Wren · Kraken hot wallet
    specFromTemplate("token_pulse"),    // Pulse · SOL outside $140–$160 band
  ];
}

/** Seed the demo trio onto a freshly-provisioned device, but only if
 *  the device has no workers yet. Idempotent. Spawns in sequence —
 *  parallel POSTs would race on the agent-pool's first-tick priority
 *  queue and produce noisy ordering on the orbital ring. */
export async function seedDefaultWorkersIfEmpty(deviceId: string): Promise<void> {
  // Idempotency check: skip if any workers already exist.
  try {
    const r = await fetch(`/api/devices/${deviceId}/live-status`);
    if (r.ok) {
      const live = await r.json();
      if (Array.isArray(live?.workers) && live.workers.length > 0) {
        return;
      }
    }
  } catch {
    // If live-status fails, fall through and try to spawn anyway —
    // worst case we get duplicates that the user can retire.
  }

  for (const seed of getDefaultWorkerSeeds()) {
    try {
      await fetch("/api/agents/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          template: seed.template,
          name: seed.name,
          emoji: seed.emoji,
          personalityPrompt: seed.personalityPrompt,
          jobPrompt: seed.jobPrompt,
          allowedTools: seed.allowedTools,
          frequencySeconds: seed.frequencySeconds,
        }),
      });
    } catch (e) {
      // Partial seeding is acceptable — log and keep going. Don't
      // throw because we don't want to block the user's /unbox →
      // /app handoff if one of three spawns flakes.
      console.warn("[seed-workers] spawn failed:", seed.name, e);
    }
  }
}
