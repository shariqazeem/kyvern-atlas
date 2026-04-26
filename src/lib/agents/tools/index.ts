/**
 * Tool registry — central import for all agent tools.
 *
 * Add new tools here. Atlas's runner and the agent-pool runner
 * resolve tool IDs through this map.
 */

import type { AgentTool } from "../types";
import { messageUserTool } from "./message-user";
import { exposePaywallTool } from "./expose-paywall";
import { subscribeToAgentTool } from "./subscribe-to-agent";
import { postTaskTool } from "./post-task";
import { claimTaskTool } from "./claim-task";
import { readOnchainTool } from "./read-onchain";
import { readDexTool } from "./read-dex";
import { watchWalletTool, watchWalletSwapsTool } from "./watch-wallet";
import { watchUrlTool } from "./watch-url";

export const TOOLS: Record<string, AgentTool> = {
  [messageUserTool.id]: messageUserTool,
  [exposePaywallTool.id]: exposePaywallTool,
  [subscribeToAgentTool.id]: subscribeToAgentTool,
  [postTaskTool.id]: postTaskTool,
  [claimTaskTool.id]: claimTaskTool,
  [readOnchainTool.id]: readOnchainTool,
  [readDexTool.id]: readDexTool,
  [watchWalletTool.id]: watchWalletTool,
  [watchWalletSwapsTool.id]: watchWalletSwapsTool,
  [watchUrlTool.id]: watchUrlTool,
};

export function getTool(id: string): AgentTool | undefined {
  return TOOLS[id];
}

export function listTools(): AgentTool[] {
  return Object.values(TOOLS);
}
