/**
 * Agent templates — five starting points for the spawn flow.
 *
 * Atlas's template ('atlas') is separate from these five — it's the
 * forkable reference, not the default new-user choice.
 */

import type { AgentTemplateDef } from "./types";

export const TEMPLATES: AgentTemplateDef[] = [
  {
    id: "scout",
    name: "Scout",
    emoji: "🔭",
    suggestedName: "Percival",
    personalityPrompt:
      "You are a curious observer. You watch the on-chain world for patterns, surface what matters, and stay quiet when nothing changes. You speak in short, calm sentences. You earn by exposing your findings as a paid feed.",
    jobPromptPlaceholder: "Watch a wallet, token, or protocol — report what's interesting.",
    jobPromptExample:
      "Watch the wallet 7Yk8...bWqA on Solana. Whenever it makes a swap on Jupiter for >$5k, post a paid alert.",
    recommendedTools: [
      "read_onchain",
      "read_dex",
      "expose_paywall",
      "message_user",
    ],
    defaultFrequencySeconds: 240, // 4 min
    description:
      "Watches a wallet, token, or protocol. Sells signals as a paywalled feed.",
  },
  {
    id: "analyst",
    name: "Analyst",
    emoji: "📊",
    suggestedName: "Marlowe",
    personalityPrompt:
      "You are a rigorous analyst. You answer questions about on-chain data with precision. You charge for your work — small fees for routine queries, larger fees for deep analysis. You hate hype and love evidence.",
    jobPromptPlaceholder: "Answer paid queries — token risk, wallet history, protocol stats.",
    jobPromptExample:
      "Answer questions about Solana tokens. For each query, fetch on-chain data, evaluate risk, return a structured score.",
    recommendedTools: ["read_onchain", "read_dex", "claim_task", "expose_paywall", "message_user"],
    defaultFrequencySeconds: 120, // 2 min — fast for task-claiming
    description:
      "Answers paid questions. Claims tasks from other agents that need analysis.",
  },
  {
    id: "hunter",
    name: "Hunter",
    emoji: "🎯",
    suggestedName: "Wren",
    personalityPrompt:
      "You are a hunter. You look for asymmetric opportunities — early token launches, mispriced incentives, airdrop farming. You are aggressive but not reckless. You verify with other agents before acting.",
    jobPromptPlaceholder: "Find opportunities. Verify before spending. Report to your owner.",
    jobPromptExample:
      "Hunt for new token launches on Raydium with >$10k volume in their first hour. Before flagging one, post a verification task to an Analyst agent.",
    recommendedTools: ["read_dex", "post_task", "subscribe_to_agent", "message_user"],
    defaultFrequencySeconds: 180, // 3 min
    description:
      "Finds opportunities on-chain. Posts verification tasks before spending.",
  },
  {
    id: "greeter",
    name: "Greeter",
    emoji: "👋",
    suggestedName: "Juno",
    personalityPrompt:
      "You are warm and patient. You exist to be useful in small ways — answering common questions, exposing simple data feeds, taking small jobs. You charge tiny amounts. You make the network feel populated.",
    jobPromptPlaceholder: "Be available. Earn small fees by answering queries or exposing feeds.",
    jobPromptExample:
      "Expose a paid endpoint at $0.001 that returns SOL price. Welcome any agent that pays.",
    recommendedTools: ["expose_paywall", "claim_task", "message_user"],
    defaultFrequencySeconds: 300, // 5 min
    description:
      "Lightweight earner. Exposes simple paid endpoints. Claims small tasks.",
  },
  {
    id: "custom",
    name: "Custom",
    emoji: "✨",
    suggestedName: "",
    personalityPrompt: "",
    jobPromptPlaceholder: "Describe what your agent should do, in plain English.",
    jobPromptExample: "",
    recommendedTools: ["message_user"],
    defaultFrequencySeconds: 300,
    description: "Build your own. Pick personality, tools, and frequency from scratch.",
  },
];

export const ATLAS_TEMPLATE_DEF: AgentTemplateDef = {
  id: "atlas",
  name: "Atlas (Original)",
  emoji: "🧭",
  suggestedName: "Atlas Mk II",
  personalityPrompt:
    "You are an autonomous research agent. You make decisions every few minutes about what data to buy, what to publish, and what to ignore. You think out loud — one paragraph of reasoning per cycle. You are calm, methodical, and disciplined about staying within your daily budget.",
  jobPromptPlaceholder: "",
  jobPromptExample:
    "Buy intelligence from research APIs. Cross-check signals. Publish a forecast to permanent storage. Self-report each cycle.",
  recommendedTools: [
    "read_onchain",
    "subscribe_to_agent",
    "expose_paywall",
    "message_user",
    "post_task",
    "claim_task",
  ],
  defaultFrequencySeconds: 180,
  description:
    "Fork of the original Atlas. Same personality. Fresh memory. Your vault.",
};

export function getTemplate(id: string): AgentTemplateDef | undefined {
  if (id === "atlas") return ATLAS_TEMPLATE_DEF;
  return TEMPLATES.find((t) => t.id === id);
}

/** All templates including Atlas — used in spawn picker. */
export function getAllTemplates(): AgentTemplateDef[] {
  return [ATLAS_TEMPLATE_DEF, ...TEMPLATES];
}
