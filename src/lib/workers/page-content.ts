/**
 * Per-template content for the worker detail page.
 *
 * Phase A.1 + Phase B (KYVERN_FRONTIER_FINAL_SPRINT, 2026-05-08) —
 * the single source of truth for what each worker tile + page says.
 * Replaces the prior approach of mapping `agent.allowedTools` through
 * a generic `friendlyTool()` (which leaked Sentinel-only verbs like
 * "Drafts tasks" onto Wren and Pulse).
 *
 * Each worker gets its own `purpose` (one sentence the page hero
 * displays under the role title), `howItWorks` bullets (a plain
 * mechanical explanation of the cycle), and `chainNote` (one
 * line about what the chain caps).
 */

import type { AgentTemplate } from "@/lib/agents/types";

export interface WorkerPageContent {
  /** Single-character emoji rendered into the hero — the WorkerEmoji
   *  component still maps these to Lucide icons so swapping the icon
   *  set later is one map edit. */
  icon: string;
  /** Role label the hero h1 uses (e.g. "Bounty Scout"). */
  role: string;
  /** One-sentence purpose under the role title. Reads in user voice
   *  ("I find paid Solana bounties..."), not engineer voice. */
  purpose: string;
  /** Plain bullets explaining what the worker actually does each
   *  cycle. Replaces the old generic "abilities" list. */
  howItWorks: string[];
  /** One-line "the chain caps this at $X / $Y daily" note rendered
   *  below the bullets. Reinforces "the chain decides every dollar"
   *  positioning. */
  chainNote: string;
  /** What this worker is "watching" — surfaces in observability
   *  stats. Replaces the prior generic "Custom" fallback. */
  watchesLabel: string;
}

export const WORKER_PAGE_CONTENT: Record<AgentTemplate, WorkerPageContent> = {
  bounty_hunter: {
    icon: "🎯",
    role: "Bounty Scout",
    purpose:
      "I find paid Solana bounties matching your skills, draft your application with Pay.sh / Gemini, and queue it for one-tap submit.",
    howItWorks: [
      "Scans Solana ecosystem feeds (Superteam, Solana Foundation, Colosseum bounties)",
      "Reads payout amounts and skill requirements",
      "Calls Pay.sh / Gemini to draft your application in your voice",
      "Holds the draft in your inbox until you tap Submit",
      "Sends via email + on-chain memo, both visible on Explorer",
    ],
    chainNote: "Chain caps the post + submit cost at $0.15 per draft, $5/day.",
    watchesLabel: "Ecosystem feeds",
  },
  whale_tracker: {
    icon: "🐋",
    role: "Position Watchtower",
    purpose:
      "Pick wallets or contracts to watch. I ping you when something material moves. Chain caps how often I check.",
    howItWorks: [
      "Polls each watched wallet on-chain at your cadence",
      "Reads swap, transfer, and stake history",
      "Calls Pay.sh / Gemini to score whether the move is material",
      "Pings you only on threshold breach",
      "Material alerts can mirror into a Pulse trigger with one tap",
    ],
    chainNote: "Chain caps the read + score cost at $0.10 per check, $5/day.",
    watchesLabel: "Wallet watchlist",
  },
  token_pulse: {
    icon: "📈",
    role: "Conditional Trigger",
    purpose:
      "Set a price condition. I fire your pre-approved spend when it crosses — and the chain checks every dollar.",
    howItWorks: [
      "Reads live DEX prices via CoinGecko + DexScreener fallback",
      "Calls Pay.sh / Gemini to validate the breach reasoning",
      "Fires swap_via_oracle on your Anchor program when crossed",
      "Pyth oracle prices the swap, treasury PDA settles it",
      "Squads multisig cosigns every spend",
    ],
    chainNote: "Chain caps the spend at $0.10 per fire, $5/day total.",
    watchesLabel: "Price triggers",
  },
  // Legacy templates — kept so pre-Phase-3 spawned workers still
  // render a sane page, but they don't appear in the spawn picker.
  atlas: {
    icon: "🛰",
    role: "Reference Agent",
    purpose:
      "The reference deployment that's been autonomous on Solana devnet since April 2026 — the proof Kyvern's chain enforcement works.",
    howItWorks: [
      "Cycles every 3 minutes through observe → decide → act",
      "Pays Pay.sh / Gemini for each reasoning call",
      "Refuses every drain attempt at the Anchor program",
      "Earns USDC from real x402 subscribers paying its feed",
    ],
    chainNote: "Chain caps each cycle's spend; refusals are real failed txs.",
    watchesLabel: "Live on devnet",
  },
  scout: {
    icon: "🔭",
    role: "Custom Worker",
    purpose: "Custom worker — see Configure for what you told me to do.",
    howItWorks: [
      "Runs the cycle script you set at spawn time",
      "Calls only the abilities you allowed",
      "Every spend goes through your vault's policy program",
    ],
    chainNote: "Chain enforces all caps you configured at spawn.",
    watchesLabel: "Custom",
  },
  analyst: {
    icon: "🔭",
    role: "Custom Worker",
    purpose: "Custom worker — see Configure for what you told me to do.",
    howItWorks: [
      "Runs the cycle script you set at spawn time",
      "Calls only the abilities you allowed",
      "Every spend goes through your vault's policy program",
    ],
    chainNote: "Chain enforces all caps you configured at spawn.",
    watchesLabel: "Custom",
  },
  hunter: {
    icon: "🔭",
    role: "Custom Worker",
    purpose: "Custom worker — see Configure for what you told me to do.",
    howItWorks: [
      "Runs the cycle script you set at spawn time",
      "Calls only the abilities you allowed",
      "Every spend goes through your vault's policy program",
    ],
    chainNote: "Chain enforces all caps you configured at spawn.",
    watchesLabel: "Custom",
  },
  greeter: {
    icon: "🔭",
    role: "Custom Worker",
    purpose: "Custom worker — see Configure for what you told me to do.",
    howItWorks: [
      "Runs the cycle script you set at spawn time",
      "Calls only the abilities you allowed",
      "Every spend goes through your vault's policy program",
    ],
    chainNote: "Chain enforces all caps you configured at spawn.",
    watchesLabel: "Custom",
  },
  earner: {
    icon: "🔭",
    role: "Custom Worker",
    purpose: "Custom worker — see Configure for what you told me to do.",
    howItWorks: [
      "Runs the cycle script you set at spawn time",
      "Calls only the abilities you allowed",
      "Every spend goes through your vault's policy program",
    ],
    chainNote: "Chain enforces all caps you configured at spawn.",
    watchesLabel: "Custom",
  },
  custom: {
    icon: "🔭",
    role: "Custom Worker",
    purpose: "Custom worker — see Configure for what you told me to do.",
    howItWorks: [
      "Runs the cycle script you set at spawn time",
      "Calls only the abilities you allowed",
      "Every spend goes through your vault's policy program",
    ],
    chainNote: "Chain enforces all caps you configured at spawn.",
    watchesLabel: "Custom",
  },
  ecosystem_watcher: {
    icon: "🔭",
    role: "Ecosystem Watcher",
    purpose: "Watches Solana ecosystem feeds for relevant updates.",
    howItWorks: [
      "Polls configured ecosystem feeds at your cadence",
      "Calls Pay.sh / Gemini to score relevance",
      "Surfaces only material updates to your inbox",
    ],
    chainNote: "Chain caps the read + score cost at $0.10 per check.",
    watchesLabel: "Ecosystem feeds",
  },
  github_watcher: {
    icon: "🐙",
    role: "Repo Watcher",
    purpose: "Watches GitHub repos for releases and issues you care about.",
    howItWorks: [
      "Polls watched repos at your cadence",
      "Calls Pay.sh / Gemini to score release importance",
      "Pings you only on threshold breach",
    ],
    chainNote: "Chain caps the read + score cost at $0.10 per check.",
    watchesLabel: "GitHub repos",
  },
};
