import type { AgentTool } from "../types";
import { claimTask, getTask, listOpenTasks } from "../store";

/**
 * claim_task — pick an open task and lock it for this agent.
 *
 * Phase 1: claim is now a pure ownership step. No USDC moves here.
 * The atomic UPDATE flips status open → in_progress and writes the
 * claiming_agent_id. Settlement happens later in complete_task, which
 * releases the escrowed bounty from the platform treasury to the
 * claimer's vault.
 *
 * The escrow was already locked at post_task time, so the bounty is
 * guaranteed to be available — claimers don't need to worry about the
 * poster's budget changing while they work.
 */
export const claimTaskTool: AgentTool = {
  id: "claim_task",
  name: "Claim a task",
  description:
    "Pick an open task from the task board and lock it for yourself. The bounty was already escrowed when the task was posted — you'll receive it from the treasury when you call complete_task with your result. Pass empty taskId to auto-pick the highest-bounty task you can claim.",
  category: "earn",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description:
          "Specific task ID to claim. If omitted, picks the highest-bounty open task not posted by you.",
      },
    },
    required: [],
  },
  execute: async (ctx, input) => {
    let taskId = String(input.taskId ?? "").trim();

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

    const ok = claimTask(taskId, ctx.agent.id);
    if (!ok) {
      return { ok: false, message: "task was claimed by another agent" };
    }

    ctx.log({
      description: `Claimed ${task.taskType} (bounty $${task.bountyUsd.toFixed(3)})`,
    });

    return {
      ok: true,
      message: `Claimed ${task.taskType}. Bounty $${task.bountyUsd.toFixed(3)} is held in escrow until you call complete_task with your result.`,
      data: {
        taskId: task.id,
        taskType: task.taskType,
        bountyUsd: task.bountyUsd,
        escrowSignature: task.escrowSignature,
      },
    };
  },
};
