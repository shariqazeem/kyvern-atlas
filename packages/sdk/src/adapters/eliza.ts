/*!
 * @kyvernlabs/sdk/adapters/eliza
 *
 * Wraps `Vault.pay()` as an Eliza (@elizaos) Action so any Eliza agent
 * can route spending through a Kyvern vault with one line.
 *
 *   // Usage:
 *   import { Vault } from "@kyvernlabs/sdk";
 *   import { kyvernPayAction } from "@kyvernlabs/sdk/adapters/eliza";
 *
 *   const vault = new Vault({ agentKey: process.env.KYVERNLABS_AGENT_KEY! });
 *
 *   const runtime = new AgentRuntime({
 *     actions: [kyvernPayAction({ vault })],
 *     ...
 *   });
 *
 * Design notes:
 * - Eliza's Action interface is fluid; we describe the minimum shape
 *   here and cast the runtime args to `unknown`. This keeps the SDK
 *   free of an @elizaos/core dependency.
 * - The action extracts `merchant`, `recipient`, `amount`, `memo` from
 *   the message state (either structured params supplied by the LLM
 *   tool-call OR best-effort parse from free text), calls `vault.pay`,
 *   and surfaces the block-code back to the runtime so the agent can
 *   self-correct.
 */

import { Vault, type PayResult } from "../index";
import { summarize } from "./langchain";

/* ─── Minimal structural types ─── */

export interface ElizaActionExample {
  user: string;
  content: { text: string; action?: string };
}

export interface ElizaAction {
  name: string;
  similes: string[];
  description: string;
  validate: (runtime: unknown, message: unknown) => Promise<boolean>;
  handler: (
    runtime: unknown,
    message: unknown,
    state: unknown,
    options: unknown,
    callback?: (response: { text: string; content?: unknown }) => void,
  ) => Promise<boolean>;
  examples: ElizaActionExample[][];
}

export interface KyvernPayActionOptions {
  vault: Vault;
  /** Override the action name. Default: `KYVERN_PAY`. */
  name?: string;
  /** Optional parser the host passes instead of auto-extract. Given the
   *  raw user message + current state, return the four pay fields. */
  extractParams?: (input: {
    text: string;
    state: unknown;
  }) => Promise<PayParams | null> | PayParams | null;
}

export interface PayParams {
  merchant: string;
  recipientPubkey: string;
  amount: number;
  memo?: string;
}

/* ─── The adapter ─── */

const DEFAULT_DESCRIPTION =
  "Spend USDC from the user's Kyvern vault. Policy (daily cap, per-tx max, merchant allowlist, kill switch) is enforced server-side. If blocked, the callback response includes a `code` explaining which rule tripped so the agent can recover.";

/**
 * Returns an Eliza action that calls `vault.pay()` when triggered.
 */
export function kyvernPayAction(options: KyvernPayActionOptions): ElizaAction {
  const { vault } = options;
  if (!vault) {
    throw new Error(
      "@kyvernlabs/sdk/adapters/eliza: `vault` is required",
    );
  }

  const name = options.name ?? "KYVERN_PAY";
  const extract = options.extractParams ?? defaultExtract;

  const action: ElizaAction = {
    name,
    similes: [
      "PAY_MERCHANT",
      "SPEND_USDC",
      "BUY_API_CALL",
      "PAY_FROM_VAULT",
    ],
    description: DEFAULT_DESCRIPTION,

    async validate(_runtime, message) {
      const text = readText(message);
      if (!text) return false;
      // Heuristic: the message must mention a dollar amount and a payee.
      return /\$?\d+(?:\.\d+)?\s*(?:usd|usdc|dollars?)?/i.test(text);
    },

    async handler(_runtime, message, state, _options, callback) {
      const text = readText(message) ?? "";
      const params = await extract({ text, state });

      if (!params) {
        callback?.({
          text: "I need a merchant, recipient pubkey, USD amount, and memo before I can pay from the vault.",
        });
        return false;
      }

      try {
        const result: PayResult = await vault.pay({
          merchant: params.merchant,
          recipientPubkey: params.recipientPubkey,
          amount: params.amount,
          memo: params.memo,
        });

        const summary = summarize(result);

        if (result.decision === "allowed") {
          callback?.({
            text: `Paid ${params.merchant} $${result.payment.amountUsd}. Tx: ${result.tx.signature}.`,
            content: summary,
          });
          return true;
        }

        // Blocked — let the runtime know why so the agent can recover.
        callback?.({
          text: `Payment blocked: ${result.reason}. Code: ${result.code}.`,
          content: summary,
        });
        return false;
      } catch (err) {
        callback?.({
          text: `Payment failed: ${err instanceof Error ? err.message : "unknown error"}.`,
          content: { status: "error", error: String(err) },
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            text: "Pay api.openai.com $0.12 for 'forecast lookup' to 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          },
        },
        {
          user: "{{agent}}",
          content: {
            text: "Paid api.openai.com $0.12. Tx: 3K9zTv…",
            action: name,
          },
        },
      ],
    ],
  };

  return action;
}

/* ─── Internals ─── */

function readText(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const m = message as { content?: { text?: unknown }; text?: unknown };
  if (typeof m.content?.text === "string") return m.content.text;
  if (typeof m.text === "string") return m.text;
  return null;
}

/**
 * Fallback param extractor. Pulls a merchant domain, USD amount, memo,
 * and Solana-looking pubkey out of free text. Callers should typically
 * supply their own `extractParams` that uses the LLM's tool-call
 * arguments instead of string-scraping.
 */
function defaultExtract(input: { text: string }): PayParams | null {
  const text = input.text;
  const amountMatch = text.match(
    /\$?\s*(\d+(?:\.\d+)?)\s*(?:usd|usdc|dollars?)?/i,
  );
  const merchantMatch = text.match(
    /\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b/i,
  );
  // Solana base58 pubkeys are 32–44 chars, base58 alphabet (no 0,O,I,l).
  const pubkeyMatch = text.match(
    /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/,
  );
  const memoMatch = text.match(/['"`]([^'"`]{2,120})['"`]/);

  const amount = amountMatch ? Number(amountMatch[1]) : NaN;
  if (!merchantMatch || !pubkeyMatch || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    merchant: merchantMatch[1].toLowerCase(),
    recipientPubkey: pubkeyMatch[0],
    amount,
    memo: memoMatch ? memoMatch[1] : undefined,
  };
}
