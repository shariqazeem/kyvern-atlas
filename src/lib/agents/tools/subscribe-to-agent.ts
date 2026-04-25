import type { AgentTool } from "../types";
import { getAgent, bumpAgentSpent, bumpAgentEarned } from "../store";
import { getVault } from "@/lib/vault-store";
import { serverVaultPay } from "@/lib/server-pay";

/**
 * subscribe_to_agent — pay another agent's vault for one feed update.
 *
 * Real serverVaultPay() → policy → Squads co-sign → Solana devnet.
 * On success: writes spending_sent for caller, earning_received for target.
 *
 * For now: $0.001 per call (matching Atlas Intelligence pricing).
 * Future: agents publish their own subscription prices in metadata.
 */
export const subscribeToAgentTool: AgentTool = {
  id: "subscribe_to_agent",
  name: "Subscribe to another agent",
  description:
    "Pay another agent $0.001 to receive their latest decisions and findings. Use this to learn from agents that watch things you care about.",
  category: "spend",
  costsMoney: true,
  schema: {
    type: "object",
    properties: {
      targetAgentId: {
        type: "string",
        description:
          "The agent ID to subscribe to (e.g. 'agt_atlas' for the original Atlas).",
      },
    },
    required: ["targetAgentId"],
  },
  execute: async (ctx, input) => {
    const targetAgentId = String(input.targetAgentId ?? "").trim();
    if (!targetAgentId || targetAgentId === ctx.agent.id) {
      return { ok: false, message: "invalid or self target" };
    }

    const targetAgent = getAgent(targetAgentId);
    if (!targetAgent) {
      return { ok: false, message: `agent ${targetAgentId} not found` };
    }

    const targetVault = getVault(targetAgent.deviceId);
    if (!targetVault) {
      return { ok: false, message: "target vault not found" };
    }

    const amount = 0.001;
    const merchant = `agent.${targetAgent.name.toLowerCase().replace(/\s+/g, "-")}.kyvernlabs.com`;

    const result = await serverVaultPay({
      vaultId: ctx.agent.deviceId,
      merchant,
      recipientPubkey: targetVault.ownerWallet,
      amountUsd: amount,
      memo: `subscribe:${targetAgentId}`,
      logEvent: {
        eventType: "spending_sent",
        abilityId: "subscribe_to_agent",
        counterparty: `${targetAgent.emoji} ${targetAgent.name}`,
        description: `Paid ${targetAgent.name} $${amount.toFixed(3)} for an intelligence update`,
      },
    });

    if (result.success && result.signature) {
      bumpAgentSpent(ctx.agent.id, amount);
      bumpAgentEarned(targetAgent.id, amount);
      ctx.log({
        description: `Subscribed to ${targetAgent.name}`,
        signature: result.signature,
        amountUsd: amount,
        counterparty: `${targetAgent.emoji} ${targetAgent.name}`,
        eventType: "spending_sent",
      });
      return {
        ok: true,
        message: `Paid ${targetAgent.name} $${amount.toFixed(3)}. Signature: ${result.signature.slice(0, 12)}...`,
        signature: result.signature,
        amountUsd: amount,
        counterparty: targetAgent.name,
      };
    }

    return {
      ok: false,
      message: `Payment failed: ${result.reason ?? "unknown"}`,
    };
  },
};
