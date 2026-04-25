import type { AgentTool } from "../types";
import { appendChat } from "../store";

/**
 * message_user — sends an in-app chat message from the agent to its owner.
 * Inserts into agent_chat_messages with role='agent'.
 * No on-chain action, no cost.
 */
export const messageUserTool: AgentTool = {
  id: "message_user",
  name: "Message your owner",
  description:
    "Send a chat message to your owner. Use this to surface findings, ask questions, or report status. Be concise — one sentence to one short paragraph.",
  category: "communicate",
  costsMoney: false,
  schema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "The message to send. Plain text. Concise.",
      },
    },
    required: ["message"],
  },
  execute: async (ctx, input) => {
    const message = String(input.message ?? "").trim();
    if (!message) {
      return { ok: false, message: "empty message" };
    }
    appendChat(ctx.agent.id, "agent", message);
    return {
      ok: true,
      message: `Sent message to owner: "${message.slice(0, 50)}${message.length > 50 ? "..." : ""}"`,
    };
  },
};
