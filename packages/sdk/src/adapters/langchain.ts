/*!
 * @kyvernlabs/sdk/adapters/langchain
 *
 * A thin adapter that wraps `Vault.pay()` as a LangChain StructuredTool,
 * so any LangChain agent can spend money through a Kyvern policy layer
 * in a single line.
 *
 *   // Usage:
 *   import { DynamicStructuredTool } from "@langchain/core/tools";
 *   import { z } from "zod";
 *   import { Vault } from "@kyvernlabs/sdk";
 *   import { kyvernPayTool } from "@kyvernlabs/sdk/adapters/langchain";
 *
 *   const vault = new Vault({ agentKey: process.env.KYVERNLABS_AGENT_KEY! });
 *   const payTool = kyvernPayTool({ vault, DynamicStructuredTool, z });
 *
 *   const agent = await createReactAgent({ llm, tools: [payTool, ...] });
 *
 * Design notes:
 * - LangChain and zod are treated as peer dependencies the caller brings
 *   themselves. The adapter never imports either, so the core SDK stays
 *   dependency-free.
 * - Policy is enforced server-side. The tool will surface a block-code
 *   string to the LLM ("merchant_not_allowed", "amount_exceeds_daily",
 *   etc.) so the agent can recover gracefully (retry with a lower
 *   amount, pick a different merchant, ask the owner to raise limits).
 */

import { Vault, type PayResult, type PolicyBlockCode } from "../index";

/* ─── Minimal structural types so we don't need LangChain/zod at build ─── */

// Structural type for zod — we only use `object/string/number/describe/optional`.
export interface ZodLike {
  object: (shape: Record<string, unknown>) => unknown;
  string: () => { describe(text: string): unknown };
  number: () => { describe(text: string): unknown };
}

// Structural type for LangChain's DynamicStructuredTool class.
export interface DynamicStructuredToolCtorConfig {
  name: string;
  description: string;
  schema: unknown;
  func: (input: Record<string, unknown>) => Promise<string>;
}
export type DynamicStructuredToolCtor<Tool> = new (
  config: DynamicStructuredToolCtorConfig,
) => Tool;

/* ─── Tool options ─── */

export interface KyvernPayToolOptions<Tool> {
  /** The Kyvern Vault instance (from `new Vault({ agentKey })`). */
  vault: Vault;
  /** The DynamicStructuredTool class from `@langchain/core/tools`. */
  DynamicStructuredTool: DynamicStructuredToolCtor<Tool>;
  /** The zod namespace (`import { z } from "zod"`). */
  z: ZodLike;
  /** Override the tool name exposed to the LLM. Default: `kyvern_pay`. */
  name?: string;
  /** Override the description shown to the LLM. */
  description?: string;
  /** Override the merchant allowlist hint in the tool description. */
  allowlistHint?: string;
}

/* ─── The adapter ─── */

const DEFAULT_DESCRIPTION =
  "Pay a merchant in USDC through your Kyvern vault. Policy (daily cap, per-tx max, merchant allowlist, kill switch) is enforced server-side. Returns either { status: 'settled', signature } on success, or { status: 'blocked', code, reason } when a rule denied the call. Never bypass — if blocked, adjust the call or ask the owner.";

/**
 * Returns a LangChain StructuredTool that pays a merchant through the
 * Kyvern vault bound to `options.vault`.
 *
 * The returned tool has signature:
 *   {
 *     merchant: string        // e.g. "api.openai.com"
 *     recipientPubkey: string // Solana base58 pubkey
 *     amount: number          // USD, e.g. 0.12
 *     memo?: string
 *   } -> string (JSON-stringified result)
 */
export function kyvernPayTool<Tool>(options: KyvernPayToolOptions<Tool>): Tool {
  const { vault, DynamicStructuredTool, z } = options;
  if (!vault) {
    throw new Error(
      "@kyvernlabs/sdk/adapters/langchain: `vault` is required",
    );
  }
  if (!DynamicStructuredTool) {
    throw new Error(
      "@kyvernlabs/sdk/adapters/langchain: pass `DynamicStructuredTool` from '@langchain/core/tools'",
    );
  }
  if (!z) {
    throw new Error(
      "@kyvernlabs/sdk/adapters/langchain: pass `z` from 'zod'",
    );
  }

  const schema = z.object({
    merchant: z
      .string()
      .describe(
        "The merchant / service being paid (e.g. 'api.openai.com'). Must be on the vault's allowlist or policy will block.",
      ),
    recipientPubkey: z
      .string()
      .describe("Solana base58 pubkey of the payee."),
    amount: z
      .number()
      .describe(
        "Payment amount in USD. Must be > 0, <= per-transaction max, and fit inside the remaining daily budget.",
      ),
    memo: z
      .string()
      .describe("Short memo describing what this payment is for."),
  });

  const description = options.description ?? DEFAULT_DESCRIPTION;
  const name = options.name ?? "kyvern_pay";

  const tool = new DynamicStructuredTool({
    name,
    description: options.allowlistHint
      ? `${description}\nAllowlist hint: ${options.allowlistHint}`
      : description,
    schema,
    func: async (input) => {
      const res = await vault.pay({
        merchant: String(input.merchant ?? "").trim(),
        recipientPubkey: String(input.recipientPubkey ?? "").trim(),
        amount: Number(input.amount),
        memo: typeof input.memo === "string" ? input.memo : undefined,
      });
      return JSON.stringify(summarize(res));
    },
  });

  return tool;
}

/* ─── Helpers ─── */

/** A compact, LLM-friendly summary of a PayResult.
 *  Surfaces the policy block-code directly so the agent can self-correct. */
export function summarize(result: PayResult): Record<string, unknown> {
  if (result.decision === "allowed") {
    return {
      status: "settled",
      paymentId: result.payment.id,
      merchant: result.payment.merchant,
      amountUsd: result.payment.amountUsd,
      signature: result.tx.signature,
      explorerUrl: result.tx.explorerUrl,
      budget: result.budget,
      velocity: result.velocity,
    };
  }
  return {
    status: "blocked",
    code: result.code,
    reason: result.reason,
    merchant: result.payment.merchant,
    amountUsd: result.payment.amountUsd,
    // Hint the LLM toward a recovery action per block-code.
    recovery: recoveryHintFor(result.code),
  };
}

function recoveryHintFor(code: PolicyBlockCode): string {
  switch (code) {
    case "vault_paused":
      return "Owner paused the vault. Wait for them to resume.";
    case "amount_exceeds_per_tx":
      return "Reduce the amount below the per-transaction cap and retry.";
    case "amount_exceeds_daily":
      return "You are out of daily budget. Retry tomorrow or ask owner to raise.";
    case "amount_exceeds_weekly":
      return "You are out of weekly budget. Ask the owner.";
    case "merchant_not_allowed":
    case "invalid_merchant":
      return "This merchant is not on the allowlist. Pick one that is.";
    case "velocity_cap":
      return "You are calling too fast. Back off and retry after the window.";
    case "missing_memo":
      return "Include a `memo` describing the payment.";
    case "invalid_amount":
      return "Amount is invalid. Must be a positive USD number.";
    default:
      return "Block not recoverable without owner action.";
  }
}
