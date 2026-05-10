/**
 * Graph linter — pre-deploy sanity check.
 *
 * Catches the failure modes that real users hit on first run:
 *
 *   1. Placeholder strings the recipe author left for editing
 *      (`<paste-allowlisted-recipient-pubkey>`, etc.) — would crash
 *      the chain step at execute time.
 *   2. Invalid Solana pubkeys (non-base58 chars, wrong length).
 *   3. Per-tx amounts that exceed the vault's per-tx max — would
 *      hit chain refusal `12002 AmountExceedsPerTxMax` on every run.
 *   4. Missing required fields (empty merchant / to / message).
 *   5. Provider keys that aren't yet configured (warns, doesn't
 *      block — user can deploy and then add the key, but worth
 *      surfacing pre-deploy).
 *
 * Pure function. Runs client-side on the graph + vault snapshot.
 * No network. Used by the recipe review screen and the composer's
 * Deploy button to show inline warnings before the agent is saved.
 */

import type { AgentGraph, StepDef } from "./types";

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  severity: LintSeverity;
  /** Step index in the top-level graph (or -1 for graph-level issues). */
  stepIndex: number;
  stepLabel: string;
  /** Field name the issue is anchored to (for highlighting). */
  field: string;
  message: string;
  /** One-line user-facing fix hint. */
  fix?: string;
}

export interface VaultSnapshot {
  perTxMaxUsd: number;
  dailyLimitUsd: number;
  weeklyLimitUsd: number;
  allowedMerchants: string[];
  paused: boolean;
  configuredProviders: Set<"anthropic" | "openai" | "deepseek" | "commonstack">;
}

export interface LintResult {
  issues: LintIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

/* ─── Solana pubkey validation ──────────────────────────────── */

const BASE58_ALPHABET = /^[1-9A-HJ-NP-Za-km-z]+$/;

function isValidSolanaPubkey(s: string): boolean {
  // Base58 alphabet excludes 0, O, I, l. Solana pubkeys are 32-44 chars.
  if (!s) return false;
  if (s.length < 32 || s.length > 44) return false;
  return BASE58_ALPHABET.test(s);
}

/** Common placeholder patterns recipe authors leave in graph
 *  config for users to fill in. Detected so the linter can flag
 *  pre-deploy instead of letting them crash at runtime. */
const PLACEHOLDER_PATTERNS = [
  /^<.*>$/,                  // <paste-...>
  /^paste-?/i,               // paste-...
  /^TODO/i,
  /^REPLACE_WITH/i,
  /^xxx+$/i,
];

function looksLikePlaceholder(s: string | undefined | null): boolean {
  if (!s) return false;
  const trimmed = s.trim();
  if (!trimmed) return false;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
}

/* ─── Main lint ─────────────────────────────────────────────── */

export function lintGraph(
  graph: AgentGraph,
  vault?: VaultSnapshot,
): LintResult {
  const issues: LintIssue[] = [];

  if (graph.steps.length === 0) {
    issues.push({
      severity: "error",
      stepIndex: -1,
      stepLabel: "Graph",
      field: "steps",
      message: "Graph has no steps",
      fix: "Add at least one step before deploying.",
    });
  }

  if (vault?.paused) {
    issues.push({
      severity: "warning",
      stepIndex: -1,
      stepLabel: "Vault",
      field: "paused",
      message: "Your vault is currently paused",
      fix: "Unpause the vault before this agent's chain steps will succeed.",
    });
  }

  graph.steps.forEach((step, i) => {
    lintStep(step, i, issues, vault);
  });

  return {
    issues,
    hasErrors: issues.some((i) => i.severity === "error"),
    hasWarnings: issues.some((i) => i.severity === "warning"),
  };
}

function lintStep(
  step: StepDef,
  index: number,
  issues: LintIssue[],
  vault?: VaultSnapshot,
): void {
  const label = step.label || `Step ${index + 1}`;

  if (step.type === "vault.pay") {
    const c = step.config;
    if (!c.merchant || looksLikePlaceholder(c.merchant)) {
      issues.push({
        severity: "error",
        stepIndex: index,
        stepLabel: label,
        field: "merchant",
        message: "Merchant is empty or a placeholder",
        fix: "Set the merchant label to one on your vault's allowlist.",
      });
    }
    if (typeof c.to === "string" && (looksLikePlaceholder(c.to) || !isValidSolanaPubkey(c.to))) {
      // Skip validation when it's a template (contains {{...}})
      if (!c.to.includes("{{")) {
        issues.push({
          severity: "error",
          stepIndex: index,
          stepLabel: label,
          field: "to",
          message: looksLikePlaceholder(c.to)
            ? "Recipient pubkey is a placeholder"
            : "Recipient pubkey isn't a valid Solana base58 address",
          fix: "Paste a valid 32-44 char base58 Solana pubkey.",
        });
      }
    }
    if (typeof c.amount === "number" && vault && c.amount > vault.perTxMaxUsd) {
      issues.push({
        severity: "error",
        stepIndex: index,
        stepLabel: label,
        field: "amount",
        message: `Amount $${c.amount.toFixed(2)} exceeds your vault's per-tx max ($${vault.perTxMaxUsd.toFixed(2)})`,
        fix: `Either lower this step's amount to ≤ $${vault.perTxMaxUsd.toFixed(2)}, or raise the vault's per-tx cap in vault settings.`,
      });
    }
    if (vault && typeof c.merchant === "string" && !c.merchant.includes("{{")) {
      const allow = vault.allowedMerchants.map((m) => m.toLowerCase());
      if (!allow.includes(c.merchant.toLowerCase()) && allow.length > 0) {
        issues.push({
          severity: "warning",
          stepIndex: index,
          stepLabel: label,
          field: "merchant",
          message: `Merchant "${c.merchant}" isn't on your vault's allowlist`,
          fix: "The chain will refuse this payment with code 12005. Add the merchant via the wizard, or change this step to use one of: " + (vault.allowedMerchants.slice(0, 3).join(", ") || "(allowlist empty)"),
        });
      }
    }
  }

  if (step.type === "transfer.usdc") {
    const c = step.config;
    if (typeof c.to === "string" && !c.to.includes("{{")) {
      if (looksLikePlaceholder(c.to) || !isValidSolanaPubkey(c.to)) {
        issues.push({
          severity: "error",
          stepIndex: index,
          stepLabel: label,
          field: "to",
          message: looksLikePlaceholder(c.to)
            ? "Recipient pubkey is a placeholder"
            : "Recipient pubkey isn't a valid Solana base58 address",
          fix: "Paste a valid 32-44 char base58 pubkey, allowlisted on the vault.",
        });
      }
    }
    if (typeof c.amount === "number" && vault && c.amount > vault.perTxMaxUsd) {
      issues.push({
        severity: "error",
        stepIndex: index,
        stepLabel: label,
        field: "amount",
        message: `Amount $${c.amount.toFixed(2)} exceeds your vault's per-tx max ($${vault.perTxMaxUsd.toFixed(2)})`,
        fix: `Lower the amount to ≤ $${vault.perTxMaxUsd.toFixed(2)}, or raise the vault per-tx cap.`,
      });
    }
  }

  if (step.type === "llm") {
    const c = step.config;
    if (vault && !vault.configuredProviders.has(c.provider)) {
      issues.push({
        severity: "warning",
        stepIndex: index,
        stepLabel: label,
        field: "provider",
        message: `No ${c.provider} key configured`,
        fix: `Add a ${c.provider} key via /app → Keys, or change this step's provider to one you have a key for.`,
      });
    }
    if (!c.prompt || c.prompt.trim().length === 0) {
      issues.push({
        severity: "error",
        stepIndex: index,
        stepLabel: label,
        field: "prompt",
        message: "Prompt is empty",
      });
    }
    if (c.maxTokens < 500) {
      issues.push({
        severity: "warning",
        stepIndex: index,
        stepLabel: label,
        field: "maxTokens",
        message: `max_tokens is ${c.maxTokens} — reasoning models like gpt-oss-120b need ≥ 1500 to leave room for hidden thinking`,
        fix: "Bump to 2000 unless you're using a non-reasoning model.",
      });
    }
  }

  if (step.type === "http") {
    const c = step.config;
    if (!c.url || looksLikePlaceholder(c.url) || c.url === "https://" || c.url.trim().length < 8) {
      issues.push({
        severity: "error",
        stepIndex: index,
        stepLabel: label,
        field: "url",
        message: "URL is empty or a placeholder",
        fix: "Paste a complete https:// URL.",
      });
    }
  }

  if (step.type === "log") {
    if (!step.config.message || step.config.message.trim().length === 0) {
      issues.push({
        severity: "error",
        stepIndex: index,
        stepLabel: label,
        field: "message",
        message: "Log message is empty",
      });
    }
  }

  if (step.type === "signal") {
    if (!step.config.subject || step.config.subject.trim().length === 0) {
      issues.push({
        severity: "error",
        stepIndex: index,
        stepLabel: label,
        field: "subject",
        message: "Signal subject is empty (the inbox card needs a title)",
      });
    }
  }

  if (step.type === "branch") {
    if (!step.config.condition || step.config.condition.trim().length === 0) {
      issues.push({
        severity: "error",
        stepIndex: index,
        stepLabel: label,
        field: "condition",
        message: "Branch condition is empty",
      });
    }
    // Recurse into nested step lists
    step.config.then.forEach((s, j) =>
      lintStep(s, index + (j / 100), issues, vault),
    );
    step.config.else.forEach((s, j) =>
      lintStep(s, index + ((step.config.then.length + j) / 100), issues, vault),
    );
  }

  if (step.type === "loop") {
    if (!step.config.items || step.config.items.trim().length === 0) {
      issues.push({
        severity: "error",
        stepIndex: index,
        stepLabel: label,
        field: "items",
        message: "Loop has no items path",
      });
    }
    step.config.body.forEach((s, j) =>
      lintStep(s, index + (j / 100), issues, vault),
    );
  }
}
