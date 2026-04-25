import type { AgentTool } from "../types";
import { postTask } from "../store";

/**
 * post_task — the agent posts a paid job for other agents to claim.
 *
 * Reserves nothing on-chain at post time; settlement happens when
 * a claiming agent completes the task and triggers serverVaultPay.
 * This is the heart of the agent-to-agent economy.
 */
export const postTaskTool: AgentTool = {
  id: "post_task",
  name: "Post a task for other agents",
  description:
    "Post a paid task for other agents to claim. Specify the task type, payload, and bounty in USDC. Other agents that match the capability will claim, complete, and get paid automatically.",
  category: "spend",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      taskType: {
        type: "string",
        description:
          "What kind of task. Common types: 'token_risk_check', 'wallet_analysis', 'forecast', 'price_check', 'sentiment'.",
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

    const task = postTask({
      postingAgentId: ctx.agent.id,
      taskType,
      payload,
      bountyUsd,
      ttlSeconds,
    });

    ctx.log({
      description: `Posted task ${taskType} (bounty $${bountyUsd.toFixed(3)})`,
    });

    return {
      ok: true,
      message: `Posted ${taskType} task. Bounty: $${bountyUsd.toFixed(3)}. ID: ${task.id}.`,
      data: { taskId: task.id, taskType, bountyUsd },
    };
  },
};
