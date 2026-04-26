/**
 * Agent templates — four picker tiles for the spawn flow.
 *
 * Visible in the picker (inPicker: true):
 *   · scout    — Watches wallets and tokens. Sells signals.
 *   · earner   — Exposes paid endpoints. Claims small tasks.
 *   · hunter   — Finds opportunities. Posts and claims bounties.
 *   · custom   — Build your own from scratch.
 *
 * Hidden but kept in the registry for backwards-compat with existing
 * DB rows (inPicker: false): atlas, analyst, greeter.
 */

import type { AgentTemplateDef } from "./types";

/** Curated emoji options shown on the configure screen. The first one
 *  matches the default for the chosen template; the rest let the user
 *  riff without typing. */
export const EMOJI_PALETTE = [
  "🔭", "🎯", "💰", "🦅", "🐺", "🦊", "🐙", "⚡", "🌙", "✨",
];

/** Name pool for the auto-suggest reload button on the configure screen. */
export const NAME_POOL = [
  "Sentinel", "Atlas Jr", "Shadow", "Pulse", "Echo",
  "Drift", "Forge", "Beacon", "Dax", "Nova", "Wren", "Juno",
];

export const TEMPLATES: AgentTemplateDef[] = [
  {
    id: "scout",
    name: "Scout",
    emoji: "🔭",
    suggestedName: "Sentinel",
    personalityPrompt:
      "You are a curious observer. You watch the on-chain world for patterns, surface what matters, and stay quiet when nothing changes. You speak in short, calm sentences. You earn by exposing your findings as a paid feed.",
    jobPromptPlaceholder: "Watch a wallet, token, or protocol — report what's interesting.",
    jobPromptExample:
      "Watch the Solana wallet 7Yk8...bWqA. Use watch_wallet_swaps every cycle. Whenever it makes a Jupiter swap >$5,000, send a message to my owner with the signature and the dollar amount.",
    recommendedTools: [
      "watch_wallet_swaps",
      "watch_wallet",
      "read_onchain",
      "read_dex",
      "expose_paywall",
      "message_user",
    ],
    defaultFrequencySeconds: 240,
    description: "Watches wallets and tokens. Sells signals.",
    earningStyle: "Steady",
    activityLevel: "Balanced",
    inPicker: true,
    jobSuggestions: [
      {
        label: "Whale-watcher",
        job:
          "Watch the Solana wallet 7Yk8cPDKL5h4QnQiVhHcvWg9HXKJpQfTmnK9zTzk5bWqA every cycle using watch_wallet_swaps with minUsdThreshold 1000. When a swap >$1k lands, message the owner with the signature, dollar amount, and the token pair.",
      },
      {
        label: "SOL price tracker",
        job:
          "Use read_dex with 'SOL' every cycle. Track the price across cycles. If it moves more than 5% in either direction since you started, send a message to the owner with the percent change and the new price.",
      },
      {
        label: "Activity feed seller",
        job:
          "Watch the Solana wallet GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ with watch_wallet. Each cycle, expose a paid feed at $0.002 summarising the latest 3 transactions and their types.",
      },
    ],
  },
  {
    id: "earner",
    name: "Earner",
    emoji: "💰",
    suggestedName: "Juno",
    personalityPrompt:
      "You are warm and patient. You exist to be useful in small ways — answering common questions, exposing simple data feeds, taking small jobs. You charge tiny amounts. You make the network feel populated.",
    jobPromptPlaceholder: "Be available. Earn small fees by answering queries or claiming jobs.",
    jobPromptExample:
      "Expose a paid endpoint at $0.001 that returns SOL price. Claim any open task with bounty <= $0.02 each cycle.",
    recommendedTools: ["expose_paywall", "claim_task", "read_dex", "read_onchain", "message_user"],
    defaultFrequencySeconds: 300,
    description: "Exposes paid endpoints. Claims small tasks.",
    earningStyle: "Steady",
    activityLevel: "Chill",
    inPicker: true,
    jobSuggestions: [
      {
        label: "Cheap SOL price feed",
        job:
          "Expose a paid endpoint at $0.001 that returns the current SOL price. Welcome every paying agent with a friendly message_user note that says you're alive and listening.",
      },
      {
        label: "Tiny-task taker",
        job:
          "Each cycle, claim any open task with bounty <= $0.02. Just one. Be the cheap, friendly worker who clears the small jobs other agents leave behind.",
      },
      {
        label: "Onboarding assistant",
        job:
          "Welcome every new agent on the network. When you see a task posted, claim if it fits, otherwise just send a polite hello message via message_user telling the owner you're available for small jobs.",
      },
    ],
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
      "Hunt for new token launches on Raydium with >$10k volume in their first hour. Before flagging one, post a verification task to an Earner agent.",
    recommendedTools: ["read_dex", "watch_wallet_swaps", "post_task", "subscribe_to_agent", "message_user"],
    defaultFrequencySeconds: 180,
    description: "Finds opportunities. Posts and claims bounties.",
    earningStyle: "Opportunistic",
    activityLevel: "Aggressive",
    inPicker: true,
    jobSuggestions: [
      {
        label: "Whale-mover hunter",
        job:
          "Hunt for big swaps. Pick 2-3 known whale wallets and use watch_wallet_swaps with minUsdThreshold 5000 each cycle. When you find one, post a 'wallet_analysis' task with $0.05 bounty asking another worker what it means.",
      },
      {
        label: "Verify-then-act trader",
        job:
          "Each cycle, check SOL price via read_dex. If it moved >3% since last cycle, post a 'forecast' task with $0.03 bounty asking another worker whether to buy or sell. Send the answer to the owner.",
      },
      {
        label: "New-listing scout",
        job:
          "Watch a few mint addresses with watch_wallet. When you see fresh activity (new token), post a 'token_risk_check' task with $0.02 bounty before doing anything else. Message the owner with the verdict.",
      },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    emoji: "🧬",
    suggestedName: "",
    personalityPrompt: "",
    jobPromptPlaceholder: "Describe what your worker should do, in plain English.",
    jobPromptExample: "",
    recommendedTools: ["message_user"],
    defaultFrequencySeconds: 300,
    description: "Build your own from scratch.",
    earningStyle: "Your call",
    activityLevel: "Your call",
    inPicker: true,
    jobSuggestions: [],
  },
  /* ── Path C templates — promoted to picker in Sprint 2 ─────────── */
  {
    id: "bounty_hunter",
    name: "Bounty Hunter",
    emoji: "🎯",
    suggestedName: "Sentinel",
    personalityPrompt:
      "You hunt opportunities. You watch bounty boards and hackathon platforms with patience, then surface a clean finding the moment a fit drops. You don't speculate; you cite. You write tight subject lines and 2-4 factual evidence bullets per finding.",
    jobPromptPlaceholder: "What kind of bounties are you watching for?",
    jobPromptExample:
      "Watch https://superteam.fun/api/listings?category=Development&order=desc&take=15 every cycle using watch_url. Surface any new bounty with reward >$500 as a finding. Use kind='bounty', include the reward and deadline as evidence, and link the listing as sourceUrl.",
    recommendedTools: ["watch_url", "read_dex", "message_user"],
    defaultFrequencySeconds: 600,
    description: "Watches bounty boards. Pings you when a fit drops.",
    earningStyle: "Steady",
    activityLevel: "Chill",
    inPicker: false,
    jobSuggestions: [
      {
        label: "Superteam Frontend >$500",
        job:
          "Every cycle, call watch_url on https://superteam.fun/api/listings?category=Development&order=desc&take=15 with minPrize=500 and sinceLastCheck=true. For each new listing returned, call message_user in Finding mode with kind='bounty', subject= the listing title (≤80 chars), evidence including the reward in USD, the deadline, and any required skills, and sourceUrl set to the listing URL. If no new listings, idle.",
      },
      {
        label: "Colosseum Frontier announcements",
        job:
          "Watch https://arena.colosseum.org/api/events?status=open with watch_url every cycle. When a new hackathon or grant track drops, surface it as a finding with kind='ecosystem_announcement', subject= the event name, evidence with prize pool, deadline, and category, and the event URL as sourceUrl.",
      },
      {
        label: "GitHub releases for tools you use",
        job:
          "Watch https://api.github.com/repos/anchor-lang/anchor/releases with watch_url every cycle. When a new release lands, surface a github_release finding with the release tag as subject, body excerpt as evidence, and the release URL as sourceUrl.",
      },
    ],
  },
  /* ── Hidden / legacy templates kept for backwards-compat ────────── */
  {
    id: "analyst",
    name: "Analyst",
    emoji: "📊",
    suggestedName: "Marlowe",
    personalityPrompt:
      "You are a rigorous analyst. You answer questions about on-chain data with precision. You charge for your work — small fees for routine queries, larger fees for deep analysis.",
    jobPromptPlaceholder: "Answer paid queries.",
    jobPromptExample: "",
    recommendedTools: ["read_onchain", "read_dex", "claim_task", "expose_paywall", "message_user"],
    defaultFrequencySeconds: 120,
    description: "Answers paid questions. Claims tasks.",
    earningStyle: "Steady",
    activityLevel: "Balanced",
    inPicker: false,
    jobSuggestions: [],
  },
  {
    id: "greeter",
    name: "Greeter",
    emoji: "👋",
    suggestedName: "Juno",
    personalityPrompt:
      "You are warm and patient. You exist to be useful in small ways.",
    jobPromptPlaceholder: "",
    jobPromptExample: "",
    recommendedTools: ["expose_paywall", "claim_task", "message_user"],
    defaultFrequencySeconds: 300,
    description: "Lightweight earner.",
    earningStyle: "Steady",
    activityLevel: "Chill",
    inPicker: false,
    jobSuggestions: [],
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
  description: "Fork of the original Atlas. Same personality. Fresh memory. Your vault.",
  earningStyle: "Steady",
  activityLevel: "Balanced",
  inPicker: false,
  jobSuggestions: [],
};

export function getTemplate(id: string): AgentTemplateDef | undefined {
  if (id === "atlas") return ATLAS_TEMPLATE_DEF;
  return TEMPLATES.find((t) => t.id === id);
}

/** All registered templates (picker + hidden) — used by getTemplate
 *  resolution and for backwards-compat reads. */
export function getAllTemplates(): AgentTemplateDef[] {
  return [ATLAS_TEMPLATE_DEF, ...TEMPLATES];
}

/** Templates shown on the spawn picker — exactly four tiles. */
export function getPickerTemplates(): AgentTemplateDef[] {
  return TEMPLATES.filter((t) => t.inPicker);
}
