import type { AgentTool } from "../types";
import {
  bumpAgentEarned,
  bumpAgentSpent,
  claimTask,
  completeTask,
  failTask,
  getAgent,
  getTask,
  listOpenTasks,
} from "../store";
import { getVault } from "@/lib/vault-store";
import { serverVaultPay } from "@/lib/server-pay";

/**
 * claim_task — the agent picks an open task, completes it, and gets paid.
 *
 * Atomic claim (UPDATE WHERE status='open'). If claimed, the agent
 * processes the task with a simple result (Phase 3 wires Claude here),
 * then triggers serverVaultPay() from the posting agent's vault to
 * the claiming agent's vault. Real USDC, real signature.
 *
 * For Phase 2 (this commit): uses a deterministic stub result so the
 * full settlement path can be tested. Phase 3+ uses Claude to actually
 * do the work.
 */
export const claimTaskTool: AgentTool = {
  id: "claim_task",
  name: "Claim and complete a task",
  description:
    "Pick an open task from the task board, complete it, and earn the bounty. Specify a taskId, or pass empty to auto-pick a matching task.",
  category: "earn",
  costsMoney: false, // earning, not spending
  schema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description:
          "Specific task ID to claim. If omitted, picks the highest bounty task you can handle.",
      },
      result: {
        type: "string",
        description:
          "JSON-encoded result of completing the task. If omitted, a default acknowledgement is used.",
      },
    },
    required: [],
  },
  execute: async (ctx, input) => {
    let taskId = String(input.taskId ?? "").trim();

    // Auto-pick if no taskId provided — highest bounty open task not posted by us
    if (!taskId) {
      const open = listOpenTasks(20).filter(
        (t) => t.postingAgentId !== ctx.agent.id,
      );
      if (open.length === 0) {
        return { ok: false, message: "no open tasks available" };
      }
      open.sort((a, b) => b.bountyUsd - a.bountyUsd);
      taskId = open[0].id;
    }

    const task = getTask(taskId);
    if (!task) {
      return { ok: false, message: `task ${taskId} not found` };
    }
    if (task.status !== "open") {
      return { ok: false, message: `task already ${task.status}` };
    }
    if (task.postingAgentId === ctx.agent.id) {
      return { ok: false, message: "cannot claim your own task" };
    }

    // Atomic claim
    const claimed = claimTask(taskId, ctx.agent.id);
    if (!claimed) {
      return { ok: false, message: "task was claimed by another agent" };
    }

    // Build a result. For Phase 2 this is a deterministic stub.
    // Phase 3 wires Claude to actually solve the task.
    const resultStr = String(input.result ?? "").trim();
    let result: Record<string, unknown>;
    if (resultStr) {
      try {
        result = JSON.parse(resultStr) as Record<string, unknown>;
      } catch {
        result = { raw: resultStr };
      }
    } else {
      result = {
        verdict: "completed",
        note: `${ctx.agent.name} processed ${task.taskType}`,
        taskType: task.taskType,
      };
    }

    // Settlement: posting agent's vault pays claiming agent's vault
    const postingAgent = getAgent(task.postingAgentId);
    if (!postingAgent) {
      failTask(taskId);
      return { ok: false, message: "posting agent missing" };
    }
    const claimingVault = getVault(ctx.agent.deviceId);
    if (!claimingVault) {
      failTask(taskId);
      return { ok: false, message: "claiming vault missing" };
    }

    const payment = await serverVaultPay({
      vaultId: postingAgent.deviceId,
      merchant: "kyvern-devices",
      recipientPubkey: claimingVault.ownerWallet,
      amountUsd: task.bountyUsd,
      memo: `task:${taskId}`,
      logEvent: {
        eventType: "spending_sent",
        abilityId: "post_task",
        counterparty: `${ctx.agent.emoji} ${ctx.agent.name}`,
        description: `Paid ${ctx.agent.name} $${task.bountyUsd.toFixed(3)} for completing ${task.taskType}`,
      },
    });

    if (payment.success && payment.signature) {
      // Mark task completed
      completeTask({
        taskId,
        result,
        paymentSignature: payment.signature,
      });

      // Update rollups
      bumpAgentSpent(postingAgent.id, task.bountyUsd);
      bumpAgentEarned(ctx.agent.id, task.bountyUsd);

      ctx.log({
        description: `Earned $${task.bountyUsd.toFixed(3)} completing ${task.taskType} for ${postingAgent.name}`,
        signature: payment.signature,
        amountUsd: task.bountyUsd,
        counterparty: `${postingAgent.emoji} ${postingAgent.name}`,
        eventType: "earning_received",
      });

      return {
        ok: true,
        message: `Completed ${task.taskType} for ${postingAgent.name}. Earned $${task.bountyUsd.toFixed(3)}.`,
        signature: payment.signature,
        amountUsd: task.bountyUsd,
        counterparty: postingAgent.name,
        data: { taskId, result },
      };
    }

    // Settlement failed — task is technically claimed but unpaid
    failTask(taskId);
    return {
      ok: false,
      message: `Settlement failed: ${payment.reason ?? "unknown"}`,
    };
  },
};
