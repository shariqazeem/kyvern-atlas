/**
 * Zod schemas for the agent graph types.
 *
 * Used at write-time (POST /api/agents/spawn validates the body's
 * graph_json) and at read-time (executor parses graph from DB row
 * defensively — a corrupted blob shouldn't crash the runner).
 *
 * The recursive bits (branch.then/else, loop.body) use z.lazy() to
 * reference StepDefSchema before it's defined.
 */

import { z } from "zod";
import type { StepDef, AgentGraph } from "./types";

/* ─── Trigger ────────────────────────────────────────────────── */

export const TriggerDefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("manual") }),
  z.object({
    kind: z.literal("interval"),
    ms: z.number().int().min(60_000).max(86_400_000), // 1 min – 24h
  }),
  z.object({
    kind: z.literal("cron"),
    expr: z.string().min(1).max(120),
  }),
  z.object({
    kind: z.literal("webhook"),
    secret: z.string().min(16).max(128),
  }),
]);

/* ─── Step config schemas ────────────────────────────────────── */

export const LlmProviderSchema = z.enum([
  "anthropic",
  "openai",
  "deepseek",
  "commonstack",
]);

export const LlmStepConfigSchema = z.object({
  provider: LlmProviderSchema,
  model: z.string().min(1).max(120),
  system: z.string().max(20_000),
  prompt: z.string().min(1).max(20_000),
  maxTokens: z.number().int().min(1).max(8192),
  temperature: z.number().min(0).max(2),
});

export const HttpStepConfigSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  url: z.string().min(1).max(2048),
  headers: z.record(z.string(), z.string()),
  body: z.record(z.string(), z.unknown()).nullable(),
  payShWrap: z.boolean(),
  timeoutMs: z.number().int().min(1000).max(120_000),
  expectStatus: z.number().int().min(100).max(599).optional(),
});

export const VaultPayStepConfigSchema = z.object({
  merchant: z.string().min(1).max(256),
  to: z.string().min(32).max(64),
  amount: z.union([z.number().min(0), z.string().min(1).max(64)]),
  memo: z.string().max(256),
});

export const TransferUsdcStepConfigSchema = z.object({
  to: z.string().min(32).max(64), // Solana base58 addresses ~ 43 chars
  amount: z.union([z.number().min(0), z.string().min(1).max(64)]),
  memo: z.string().max(256),
});

export const LogStepConfigSchema = z.object({
  message: z.string().min(1).max(2000),
  level: z.enum(["info", "warn", "error"]),
});

/* ─── On-error policy ────────────────────────────────────────── */

export const OnErrorPolicySchema = z.enum(["fail", "skip", "continue"]);

/* ─── Step (recursive — branch & loop nest StepDef[]) ────────── */

const StepBaseSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  outputVar: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).max(64).optional(),
  onError: OnErrorPolicySchema.optional(),
});

// Forward reference: declared first, resolved via z.lazy() below.
export const StepDefSchema: z.ZodType<StepDef> = z.lazy(() =>
  z.discriminatedUnion("type", [
    StepBaseSchema.extend({
      type: z.literal("llm"),
      config: LlmStepConfigSchema,
    }),
    StepBaseSchema.extend({
      type: z.literal("http"),
      config: HttpStepConfigSchema,
    }),
    StepBaseSchema.extend({
      type: z.literal("vault.pay"),
      config: VaultPayStepConfigSchema,
    }),
    StepBaseSchema.extend({
      type: z.literal("transfer.usdc"),
      config: TransferUsdcStepConfigSchema,
    }),
    StepBaseSchema.omit({ outputVar: true }).extend({
      type: z.literal("log"),
      config: LogStepConfigSchema,
    }),
    StepBaseSchema.omit({ outputVar: true }).extend({
      type: z.literal("branch"),
      config: z.object({
        condition: z.string().min(1).max(500),
        then: z.array(StepDefSchema).max(50),
        else: z.array(StepDefSchema).max(50),
      }),
    }),
    StepBaseSchema.omit({ outputVar: true }).extend({
      type: z.literal("loop"),
      config: z.object({
        items: z.string().min(1).max(200),
        itemVar: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).min(1).max(64),
        body: z.array(StepDefSchema).max(50),
        maxIterations: z.number().int().min(1).max(1000),
      }),
    }),
  ]),
) as z.ZodType<StepDef>;

/* ─── Graph config + top-level graph ─────────────────────────── */

export const AgentGraphConfigSchema = z.object({
  maxRunsPerDay: z.number().int().min(1).max(100_000),
  maxCostPerRunUsd: z.number().min(0).max(1000),
});

export const AgentGraphSchema: z.ZodType<AgentGraph> = z.object({
  version: z.literal(1),
  trigger: TriggerDefSchema,
  steps: z.array(StepDefSchema).min(1).max(100),
  config: AgentGraphConfigSchema,
});

/* ─── Helpers ────────────────────────────────────────────────── */

/** Parse a graph from an arbitrary JSON value (e.g. JSON.parse of a
 *  DB column). Returns null on validation failure — caller decides
 *  whether to fall back to legacy agent path or surface an error. */
export function safeParseGraph(value: unknown): AgentGraph | null {
  const result = AgentGraphSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Strict parse — throws on invalid graph. Used at write-time. */
export function parseGraphOrThrow(value: unknown): AgentGraph {
  return AgentGraphSchema.parse(value);
}
