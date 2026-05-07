/**
 * Per-template config schemas (Phase 3).
 *
 * The `agents.config_json` column stores a JSON blob whose shape depends
 * on `agents.template`. These Zod schemas validate every read at the
 * runner edge AND every write at the API edge, and produce sensible
 * template-specific defaults so legacy / fresh-spawn rows are valid.
 *
 *   bounty_hunter (Sentinel)  → SentinelConfigSchema
 *   whale_tracker (Wren)      → WrenConfigSchema
 *   token_pulse  (Pulse)      → PulseConfigSchema
 *
 * Anything else falls through to a permissive `z.record(z.unknown())`
 * — `custom` workers and any legacy template don't get the new
 * trigger / watchlist machinery.
 */

import { z } from "zod";
import type { AgentConfig, AgentTemplate } from "./types";

/* ────────────────────────────────────────────────────────────────────
   Schemas
   ──────────────────────────────────────────────────────────────────── */

export const SentinelConfigSchema = z.object({
  skills: z.string().min(1).max(500),
  min_payout_usd: z.number().min(50).max(100_000),
  cadence_minutes: z.number().int().min(1).max(60 * 24),
});

export const WrenConfigSchema = z.object({
  watchlist: z
    .array(
      z.object({
        address: z.string().min(8).max(80),
        label: z.string().min(1).max(60),
        threshold_usd: z.number().min(0).max(10_000_000),
      }),
    )
    .max(20),
  cadence_minutes: z.number().int().min(1).max(60 * 24),
});

export const PulseConfigSchema = z.object({
  triggers: z
    .array(
      z.object({
        id: z.string().min(1),
        asset: z.string().min(1).max(20),
        direction: z.enum(["below", "above"]),
        threshold_usd: z.number().min(0),
        amount_usd: z.number().min(0.001).max(50),
        merchant: z.string().min(3).max(120),
        memo: z.string().max(200),
        // Phase 2 (KYVERN_FRONTIER_GRAND_CHAMPION) — optional swap target.
        target_token: z
          .enum(["SOL", "kBONK", "kJUP"])
          .optional(),
      }),
    )
    .max(10),
  cadence_minutes: z.number().int().min(1).max(60 * 24),
});

/* ────────────────────────────────────────────────────────────────────
   Defaults — backfill empty / legacy rows
   ──────────────────────────────────────────────────────────────────── */

export const SENTINEL_DEFAULT_CONFIG = {
  skills: "Solana developer · Rust · TypeScript",
  min_payout_usd: 300,
  cadence_minutes: 10,
};

export const WREN_DEFAULT_CONFIG = {
  // Three Solana ecosystem-known whales so a fresh `/try` device
  // produces wallet alerts inside the first cycle. Replace via the
  // configure form on /app/agents/[id].
  watchlist: [
    {
      address: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
      label: "Whale A · Jump Trading",
      threshold_usd: 5000,
    },
    {
      address: "FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5",
      label: "Whale B · GSR liquidity",
      threshold_usd: 5000,
    },
    {
      address: "DE4Sr3z69WV2Bx1WXowWtEbDV3zLmEBczFPoG2Z9aPZf",
      label: "Whale C · Wintermute",
      threshold_usd: 5000,
    },
  ],
  cadence_minutes: 5,
};

export const PULSE_DEFAULT_CONFIG = {
  triggers: [
    {
      id: "trg_default_sol",
      asset: "SOL",
      direction: "below" as const,
      threshold_usd: 182.5,
      amount_usd: 5,
      merchant: "api.openai.com",
      memo: "test conditional spend on SOL breach",
    },
  ],
  cadence_minutes: 1,
};

/* ────────────────────────────────────────────────────────────────────
   Read / write helpers
   ──────────────────────────────────────────────────────────────────── */

export function defaultConfigFor(
  template: AgentTemplate,
): AgentConfig {
  if (template === "bounty_hunter") return { ...SENTINEL_DEFAULT_CONFIG };
  if (template === "whale_tracker") return { ...WREN_DEFAULT_CONFIG };
  if (template === "token_pulse") return { ...PULSE_DEFAULT_CONFIG };
  return {};
}

/** Parse a stored JSON blob → typed config. Falls back to template
 *  defaults when the blob is empty / invalid. Never throws. */
export function parseConfig(
  template: AgentTemplate,
  rawJson: string | null | undefined,
): AgentConfig {
  if (!rawJson || rawJson === "{}") return defaultConfigFor(template);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return defaultConfigFor(template);
  }
  if (template === "bounty_hunter") {
    const r = SentinelConfigSchema.safeParse(parsed);
    return r.success ? r.data : defaultConfigFor(template);
  }
  if (template === "whale_tracker") {
    const r = WrenConfigSchema.safeParse(parsed);
    return r.success ? r.data : defaultConfigFor(template);
  }
  if (template === "token_pulse") {
    const r = PulseConfigSchema.safeParse(parsed);
    return r.success ? r.data : defaultConfigFor(template);
  }
  return (parsed as AgentConfig) ?? {};
}

/** Validate a write at the API boundary. Returns either typed config
 *  or a list of human-readable errors. */
export function validateConfig(
  template: AgentTemplate,
  candidate: unknown,
): { ok: true; config: AgentConfig } | { ok: false; errors: string[] } {
  let schema: z.ZodTypeAny | null = null;
  if (template === "bounty_hunter") schema = SentinelConfigSchema;
  else if (template === "whale_tracker") schema = WrenConfigSchema;
  else if (template === "token_pulse") schema = PulseConfigSchema;
  if (!schema) {
    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      return { ok: true, config: candidate as AgentConfig };
    }
    return { ok: false, errors: ["custom config must be an object"] };
  }
  const r = schema.safeParse(candidate);
  if (r.success) return { ok: true, config: r.data as AgentConfig };
  return {
    ok: false,
    errors: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}
