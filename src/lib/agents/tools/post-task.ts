import type { AgentTool } from "../types";
import { postTask, bumpAgentSpent } from "../store";
import { serverVaultPay } from "@/lib/server-pay";
import {
  TREASURY_VAULT_ID,
  treasuryRecipientPubkey,
} from "../treasury";

/**
 * post_task — the agent posts a paid job for other agents to claim.
 *
 * Phase 1 economy engine: the bounty is ESCROWED on-chain at post time.
 * Flow:
 *
 *   1. Pre-generate the task id so the escrow memo can reference it
 *   2. serverVaultPay(posterVault → treasury, amount=bounty,
 *                     memo="KVN job escrow #<taskId>")
 *   3. If the policy program rejects the escrow → no task is created;
 *      the tool returns failedSignature so the runner can persist a
 *      red on-chain badge on the thought row
 *   4. On success, INSERT the task row with escrow_signature populated
 *
 * complete_task later releases the escrow from treasury → claimer.
 * claim_task is now a pure ownership step that doesn't touch USDC.
 */
export const postTaskTool: AgentTool = {
  id: "post_task",
  name: "Post a task for other agents",
  description:
    "Post a paid task for other agents to claim. The bounty is escrowed on-chain immediately — your vault sends USDC to the platform treasury, locking the reward until a claimer completes the work. If your policy rejects the escrow the task is never created.",
  category: "spend",
  costsMoney: true,
  schema: {
    type: "object",
    properties: {
      taskType: {
        type: "string",
        description:
          "What kind of task. Common types: 'token_risk_check', 'wallet_analysis', 'forecast', 'price_check', 'sentiment', 'research', 'validation'.",
      },
      payload: {
        type: "string",
        description:
          "JSON-encoded payload describing the task input (e.g. token address, wallet, prompt).",
      },
      bountyUsd: {
        type: "number",
        description: "Bounty in USDC. Range: 0.001 to 1.0.",
      },
      ttlSeconds: {
        type: "number",
        description:
          "How long the task is open before expiring (seconds). Default 3600.",
      },
    },
    required: ["taskType", "payload", "bountyUsd"],
  },
  execute: async (ctx, input) => {
    const taskType = String(input.taskType ?? "").trim();
    const bountyUsd = Math.min(Math.max(Number(input.bountyUsd ?? 0.01), 0.001), 1.0);
    const ttlSeconds = Number(input.ttlSeconds ?? 3600);
    let payload: Record<string, unknown> = {};
    try {
      const raw = String(input.payload ?? "{}");
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      payload = { raw: String(input.payload ?? "") };
    }
    if (!taskType) {
      return { ok: false, message: "taskType required" };
    }

    // Don't allow the treasury vault to escrow to itself — that would
    // be a useless self-payment. Atlas can still claim/complete tasks
    // posted by user agents; just not post its own escrowed jobs.
    if (ctx.agent.deviceId === TREASURY_VAULT_ID) {
      return {
        ok: false,
        message: "treasury vault cannot post escrowed tasks",
      };
    }

    // Pre-generate id so the escrow memo can reference the same id
    // that lands in the row.
    const taskId = `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    let recipientPubkey: string;
    try {
      recipientPubkey = treasuryRecipientPubkey();
    } catch (e) {
      return {
        ok: false,
        message: `treasury unavailable: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    const escrow = await serverVaultPay({
      vaultId: ctx.agent.deviceId,
      merchant: "kyvern.escrow",
      recipientPubkey,
      amountUsd: bountyUsd,
      memo: `KVN job escrow #${taskId}`,
      logEvent: {
        eventType: "spending_sent",
        abilityId: "post_task",
        counterparty: "🏛️ Kyvern Treasury",
        description: `Escrowed $${bountyUsd.toFixed(3)} for task ${taskType}`,
      },
    });

    if (!escrow.success || !escrow.signature) {
      // Policy rejected (or settlement failed). DO NOT create the task.
      return {
        ok: false,
        message: `Escrow blocked: ${escrow.reason ?? "unknown"}`,
        failedSignature: null, // see AgentToolResult comment — gap from CLAUDE.md
        failedReason: escrow.reason ?? "policy_blocked",
        amountUsd: bountyUsd,
      };
    }

    const task = postTask({
      id: taskId,
      postingAgentId: ctx.agent.id,
      taskType,
      payload,
      bountyUsd,
      ttlSeconds,
      escrowSignature: escrow.signature,
    });

    bumpAgentSpent(ctx.agent.id, bountyUsd);

    ctx.log({
      description: `Posted ${taskType} (escrowed $${bountyUsd.toFixed(3)})`,
      signature: escrow.signature,
      amountUsd: bountyUsd,
      counterparty: "🏛️ Kyvern Treasury",
      eventType: "spending_sent",
    });

    return {
      ok: true,
      message: `Posted ${taskType}. Escrowed $${bountyUsd.toFixed(3)} (${escrow.signature.slice(0, 10)}…). Task id: ${task.id}.`,
      signature: escrow.signature,
      amountUsd: bountyUsd,
      counterparty: "Kyvern Treasury",
      data: {
        taskId: task.id,
        taskType,
        bountyUsd,
        escrowSignature: escrow.signature,
        explorerUrl: escrow.explorerUrl,
      },
    };
  },
};
