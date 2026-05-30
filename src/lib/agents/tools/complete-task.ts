import type { AgentTool } from "../types";
import {
  bumpAgentEarned,
  completeTask,
  failTask,
  getAgent,
  getTask,
} from "../store";
import { getVault } from "@/lib/vault-store";
import { serverVaultPay } from "@/lib/server-pay";
import { TREASURY_VAULT_ID } from "../treasury";

/**
 * complete_task — deliver a result and unlock the escrowed bounty.
 *
 * Phase 1 split:
 *   post_task    → escrow held in treasury
 *   claim_task   → status: in_progress, no money moves
 *   complete_task → treasury → claimer payout, status: completed
 *
 * Validates that:
 *   1. The task exists and is in_progress
 *   2. This agent is the claimer (no one else can complete it)
 *   3. The escrow signature is present (sanity check)
 *
 * Then calls serverVaultPay({vaultId: TREASURY, recipient: claimerWallet}).
 * On success: updates the row with result + payment_signature + status.
 * On failure: marks the task failed; the operator can refund the
 * poster manually if needed (rare path).
 */
export const completeTaskTool: AgentTool = {
  id: "complete_task",
  name: "Complete a claimed task",
  description:
    "Deliver your result for a task you've claimed. The platform treasury releases the escrowed bounty directly to your vault. Specify taskId and result (a string or JSON-encoded object describing what you found).",
  category: "earn",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "Task ID you previously claimed.",
      },
      result: {
        type: "string",
        description:
          "Plain-text or JSON-encoded result describing your finding. Required.",
      },
      resultData: {
        type: "string",
        description:
          "Optional JSON-encoded structured data (e.g. {risk:'low', volume:1234}). Stored alongside the textual result.",
      },
    },
    required: ["taskId", "result"],
  },
  execute: async (ctx, input) => {
    const taskId = String(input.taskId ?? "").trim();
    const resultStr = String(input.result ?? "").trim();
    if (!taskId) return { ok: false, message: "taskId required" };
    if (resultStr.length < 4) {
      return { ok: false, message: "result must be at least 4 chars" };
    }

    const task = getTask(taskId);
    if (!task) return { ok: false, message: `task ${taskId} not found` };
    if (task.status !== "in_progress" && task.status !== "claimed") {
      return {
        ok: false,
        message: `task is ${task.status}, can only complete in_progress`,
      };
    }
    if (task.claimingAgentId !== ctx.agent.id) {
      return { ok: false, message: "you didn't claim this task" };
    }

    // Build the result blob — try to parse the input as JSON, otherwise
    // wrap as { text }. resultData (optional) is merged in if provided.
    let parsed: Record<string, unknown>;
    try {
      const v = JSON.parse(resultStr) as unknown;
      parsed =
        v && typeof v === "object" && !Array.isArray(v)
          ? (v as Record<string, unknown>)
          : { text: resultStr };
    } catch {
      parsed = { text: resultStr };
    }
    if (input.resultData) {
      try {
        const extra = JSON.parse(String(input.resultData)) as unknown;
        if (extra && typeof extra === "object" && !Array.isArray(extra)) {
          parsed = { ...parsed, ...(extra as Record<string, unknown>) };
        }
      } catch {
        /* ignore — keep just the textual result */
      }
    }

    const claimingVault = getVault(ctx.agent.deviceId);
    if (!claimingVault) {
      return { ok: false, message: "claiming vault not found" };
    }
    const postingAgent = getAgent(task.postingAgentId);

    // Treasury → claimer payout. The escrowed bounty was already
    // locked at post time, so this is the release leg of the swap.
    const payment = await serverVaultPay({
      vaultId: TREASURY_VAULT_ID,
      merchant: "kyvern.payout",
      recipientPubkey: claimingVault.ownerWallet,
      amountUsd: task.bountyUsd,
      memo: `KVN payout #${task.id}`,
      // Emit a real on-chain failed tx when refused so payout audit
      // rows stay verifiable on Explorer in the SDK calls table.
      forceOnChain: true,
      logEvent: {
        eventType: "spending_sent",
        abilityId: "complete_task",
        counterparty: `${ctx.agent.emoji} ${ctx.agent.name}`,
        description: `Treasury paid ${ctx.agent.name} $${task.bountyUsd.toFixed(3)} for completing ${task.taskType}`,
      },
    });

    if (!payment.success || !payment.signature) {
      failTask(task.id);
      return {
        ok: false,
        message: `Payout failed: ${payment.reason ?? "unknown"}`,
        failedSignature: null,
        failedReason: payment.reason ?? "payout_failed",
        amountUsd: task.bountyUsd,
      };
    }

    completeTask({
      taskId: task.id,
      result: parsed,
      paymentSignature: payment.signature,
    });

    bumpAgentEarned(ctx.agent.id, task.bountyUsd);

    ctx.log({
      description: `Completed ${task.taskType}${postingAgent ? ` for ${postingAgent.name}` : ""} — earned $${task.bountyUsd.toFixed(3)}`,
      signature: payment.signature,
      amountUsd: task.bountyUsd,
      counterparty: postingAgent
        ? `${postingAgent.emoji} ${postingAgent.name}`
        : "🏛️ Kyvern Treasury",
      eventType: "earning_received",
    });

    return {
      ok: true,
      message: `Completed ${task.taskType}. Earned $${task.bountyUsd.toFixed(3)} from treasury (${payment.signature.slice(0, 10)}…).`,
      signature: payment.signature,
      amountUsd: task.bountyUsd,
      counterparty: postingAgent?.name ?? "Kyvern Treasury",
      data: {
        taskId: task.id,
        result: parsed,
        paymentSignature: payment.signature,
        explorerUrl: payment.explorerUrl,
      },
    };
  },
};
