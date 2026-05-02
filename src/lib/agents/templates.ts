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
    watches: "Wallets and tokens",
    pings: "Movements and price",
    inPicker: false,
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
    watches: "Open tasks",
    pings: "Small earnings",
    inPicker: false,
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
    watches: "On-chain opportunities",
    pings: "Setups and verifications",
    inPicker: false,
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
    watches: "Whatever you tell it",
    pings: "Your call",
    inPicker: false,
    jobSuggestions: [],
  },
  /* ── Path C picker templates ──────────────────────────────────── */
  {
    id: "bounty_hunter",
    name: "Sentinel — Opportunity Scout",
    emoji: "🎯",
    suggestedName: "Sentinel",
    personalityPrompt:
      "You are the Opportunity Scout. You scan high-signal sources every cycle — bounty boards, ecosystem feeds, hackathon platforms, GitHub releases — and turn high-value finds into paid jobs other workers can claim. You never just notify; you escrow first, then surface. You write tight subject lines and 2-4 factual evidence bullets per finding. Silence is a feature: if nothing new is worth flagging, you idle quietly.",
    jobPromptPlaceholder:
      "Which sources should I watch? (paste 1-4 URLs — bounty boards, RSS feeds, hackathons, releases)",
    jobPromptExample:
      "Every cycle, scan these sources with watch_url:\n• https://superteam.fun/api/listings?take=25 (bounties)\n• https://blog.colosseum.com/rss (hackathon news)\n• https://solana.com/news/rss.xml (Solana ecosystem)\n• https://api.github.com/repos/coral-xyz/anchor/releases (Anchor releases)\nFor any new high-value find — bounty ≥$500, major grant, new hackathon, promising launch — post_task with a $0.15 research bounty AND message_user (kind='opportunity'). Idle silently when nothing new.",
    // Phase 1 (billion-dollar edition) — Sentinel becomes a true
    // multi-source Opportunity Scout. Toolset locked to the three
    // tools its lifecycle uses: watch_url (scan multiple sources),
    // post_task (escrow $0.15-0.25 research jobs), message_user
    // (surface as kind='opportunity'). read_onchain dropped — Sentinel
    // shouldn't be sanity-checking issuers; that's a downstream
    // worker's job.
    recommendedTools: ["watch_url", "post_task", "message_user"],
    defaultFrequencySeconds: 600,
    description:
      "Finds high-value opportunities (bounties, grants, gigs, launches) and turns them into paid jobs other workers can complete.",
    earningStyle: "Steady",
    activityLevel: "Balanced",
    watches: "Bounties · grants · launches · releases",
    pings: "Posts paid jobs from high-value finds",
    inPicker: true,
    jobSuggestions: [
      {
        label: "Multi-source scout (recommended)",
        job:
          "Every cycle, fan out across four high-signal sources using watch_url with sinceLastCheck=true:\n" +
          "• https://superteam.fun/api/listings?take=25 — Superteam bounties (all categories)\n" +
          "• https://blog.colosseum.com/rss — Colosseum hackathon blog\n" +
          "• https://solana.com/news/rss.xml — Solana Foundation news\n" +
          "• https://api.github.com/repos/coral-xyz/anchor/releases — Anchor releases (breaking-change opportunities)\n\n" +
          "For each NEW high-value item (Superteam bounty ≥$500, hackathon announcement, grant round, new ecosystem launch, major Anchor release), do BOTH:\n" +
          "  1. post_task with taskType='research', bountyUsd=0.15, ttlSeconds=3600. payload JSON should include {ask, context, sourceUrl} where ask asks another worker to validate the opportunity.\n" +
          "  2. message_user (Finding mode) with kind='opportunity', subject=title (≤80 chars), evidence including reward/USD where applicable + deadline + source. sourceUrl = item URL.\n\n" +
          "If nothing new and high-value across all four sources → idle silently. Never just notify — always create a paid job when the find is worth it.",
      },
      {
        label: "Bounty boards (Superteam ≥$2k)",
        job:
          "Every cycle, watch_url on https://superteam.fun/api/listings?take=25 with minPrize=2000 and sinceLastCheck=true. NO category filter — the high-bar set spans design, content, development, and grants. For each NEW listing, do BOTH: (1) post_task with taskType='research', bountyUsd=0.15 to ask another worker to validate the opportunity (eligibility, deadline, fit); (2) message_user kind='opportunity' subject=title evidence=reward+deadline+sponsor+skills sourceUrl=listing URL. Idle when nothing new.",
      },
      {
        label: "Ecosystem announcements (Solana + Helius)",
        job:
          "Every cycle, fan out across Solana ecosystem feeds with watch_url + sinceLastCheck=true:\n" +
          "• https://solana.com/news/rss.xml format=rss — Solana Foundation\n" +
          "• https://www.helius.dev/blog/rss.xml format=rss — Helius blog\n" +
          "• https://blog.colosseum.com/rss format=rss — Colosseum hackathons\n\n" +
          "For each NEW item that announces a grant round, hackathon, or major launch, do BOTH: (1) post_task with taskType='research', bountyUsd=0.15 asking another worker to assess relevance; (2) message_user kind='opportunity' subject=title evidence=excerpt+source+date sourceUrl=item URL. Idle when nothing new.",
      },
    ],
  },
  {
    id: "ecosystem_watcher",
    name: "Ecosystem Watcher",
    emoji: "📡",
    suggestedName: "Echo",
    personalityPrompt:
      "You watch the rooms where ecosystem news drops first — official accounts, foundation feeds, hackathon platforms. You don't speculate. You surface the announcement and the link.",
    jobPromptPlaceholder: "Which ecosystem feeds should I watch?",
    jobPromptExample:
      "Every cycle, watch_url https://solana.com/news/rss.xml with format='rss' and sinceLastCheck=true. Surface every new post as an ecosystem_announcement. Subject = title, evidence = excerpt + author + date, sourceUrl = post URL.",
    recommendedTools: ["watch_url", "message_user", "post_task", "claim_task"],
    defaultFrequencySeconds: 600,
    description: "Watches Solana accounts and feeds. Pings on hackathons, grants, and launches.",
    earningStyle: "Steady",
    activityLevel: "Balanced",
    watches: "Ecosystem accounts & feeds",
    pings: "Hackathons, grants, launches",
    // Phase 0 (billion-dollar edition): picker locked to the trio
    // Sentinel · Wren · Pulse. Ecosystem Watcher kept in the registry
    // for backwards-compat with any DB rows that already chose it,
    // but no longer offered on the spawn picker.
    inPicker: false,
    jobSuggestions: [
      {
        label: "Multi-feed: Solana + Helius + Superteam",
        job:
          "Every cycle, fan out across three feeds for redundancy: (1) watch_url on https://solana.com/news/rss.xml format='rss', (2) watch_url on https://www.helius.dev/blog/rss.xml format='rss', (3) watch_url on https://superteam.fun/api/listings?category=Development&order=desc&take=15 format='json'. All three with sinceLastCheck=true. For each new item across the three feeds, call message_user in Finding mode with kind='ecosystem_announcement' (or kind='bounty' if it came from Superteam), subject= the title (≤80 chars), evidence= source feed + excerpt + date, sourceUrl = the item URL. Idle if all three return no new items.",
      },
      {
        label: "Solana Foundation blog",
        job:
          "Every cycle, watch_url on https://solana.com/news/rss.xml with format='rss' and sinceLastCheck=true. Surface every new post as an ecosystem_announcement. Subject = title, evidence = excerpt + author + date, sourceUrl = post URL.",
      },
      {
        label: "Colosseum blog (judge feed)",
        job:
          "Every cycle, watch_url on https://blog.colosseum.com/rss with format='rss' and sinceLastCheck=true. This is the hackathon's own newsroom — judge announcements, prize updates, ecosystem highlights from the org running this contest. For each new post, surface an ecosystem_announcement. Subject = title, evidence = excerpt + date, sourceUrl = post URL.",
      },
    ],
  },
  {
    id: "whale_tracker",
    name: "Whale Tracker",
    emoji: "🐋",
    suggestedName: "Drift",
    personalityPrompt:
      "You track wallets. You watch their on-chain moves with patience and surface the moments they move size. Your evidence is the signature, the tokens, the dollar amount, the time. No commentary unless asked.",
    jobPromptPlaceholder: "Which wallets should I track, and at what size threshold?",
    jobPromptExample:
      "Every cycle, watch_wallet on Kraken's Solana hot wallet FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5 with lookbackCount=20. For each new transfer or swap, surface a wallet_move finding with subject summarising the action, evidence: signature + amount + token + time, sourceUrl = https://explorer.solana.com/tx/<signature>.",
    // Phase 3 — Wren is the FIRST claim+complete worker. Toolset
    // locked to the four economic-loop tools: watch_wallet_swaps for
    // the original whale watching, claim_task + complete_task for the
    // task economy (this is where Wren earns), message_user for
    // surfacing wallet moves to the inbox. watch_wallet (no-op when
    // swaps tool exists) and read_dex (Wren doesn't track tokens)
    // were dropped.
    recommendedTools: ["watch_wallet_swaps", "claim_task", "complete_task", "message_user"],
    defaultFrequencySeconds: 240,
    description: "Tracks wallets. Pings you when they move size.",
    earningStyle: "Opportunistic",
    activityLevel: "Balanced",
    watches: "Specific wallets",
    pings: "Big swaps & rotations",
    inPicker: true,
    jobSuggestions: [
      {
        label: "Major exchange wallets",
        job:
          "Track major Solana exchange wallets quietly — watch and only ping when something stands out. Every cycle, watch_wallet on Kraken's Solana hot wallet FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5 with lookbackCount=10. The tool returns recent on-chain entries (type, signature, tokenChanges, programs). When you spot a movement worth flagging — a swap, a sizeable transfer, an unusual program call — surface it as a wallet_move finding with subject summarising the action, evidence: signature + type + tokenChanges + programs + time, and sourceUrl = https://explorer.solana.com/tx/<signature>. Most cycles, the wallet is quiet — that's normal; idle and check again next cycle.",
      },
    ],
  },
  {
    id: "token_pulse",
    name: "Token Pulse",
    emoji: "📈",
    suggestedName: "Pulse",
    personalityPrompt:
      "You watch a token's heartbeat — price + volume. You ping the owner only on configured threshold breaks. You write tight, factual price summaries.",
    jobPromptPlaceholder: "Which token, what threshold, what window?",
    jobPromptExample:
      "Every cycle, read_dex with 'SOL'. Track price across cycles in your recent thoughts. If SOL moves >5% in either direction over 30 minutes, surface a price_trigger finding with the percent change and current price as subject, evidence with start price, end price, and time window.",
    // Phase 4 — Pulse is the FIRST validator + staker. Toolset locked
    // to the five economic-loop tools: read_dex (price detection),
    // claim_task + complete_task (validation work — Pulse claims
    // research/validation tasks Sentinel posts), stake_on_finding
    // (puts USDC behind high-conviction price moves), message_user
    // (surface price triggers to the inbox). watch_wallet_swaps was
    // dropped — Wren owns wallet tracking now, Pulse focuses on price.
    recommendedTools: [
      "read_dex",
      "claim_task",
      "complete_task",
      "stake_on_finding",
      "message_user",
    ],
    defaultFrequencySeconds: 180,
    description: "Watches a token's price + volume. Pings you on configured moves.",
    earningStyle: "Opportunistic",
    activityLevel: "Aggressive",
    watches: "Token price & volume",
    pings: "Price spikes & volume jumps",
    inPicker: true,
    jobSuggestions: [
      {
        label: "SOL outside $140–$160 band",
        job:
          "Every cycle, call read_dex with 'SOL'. If the returned price is below $140 OR above $160, surface a price_trigger finding. Subject = 'SOL outside band: $<price>'. Evidence: current price, band ($140–$160), source (CoinGecko or DexScreener), and whether it's the upper or lower break. sourceUrl = https://www.coingecko.com/en/coins/solana. If price is inside the band, idle.",
      },
      {
        label: "BONK outside $0.0000180–$0.0000300 band",
        job:
          "Every cycle, call read_dex with 'BONK'. If the returned price is below $0.0000180 OR above $0.0000300, surface a price_trigger finding. Subject = 'BONK outside band: $<price>'. Evidence: current price, band, source, and whether it's the upper or lower break. sourceUrl = https://www.coingecko.com/en/coins/bonk. Idle when inside band.",
      },
      {
        label: "JUP outside $0.30–$0.80 band",
        job:
          "Every cycle, call read_dex with 'JUP' (Jupiter token). The tool returns the current USD price. Compare it to the band: lower bound $0.30, upper bound $0.80. If the price is strictly less than $0.30 OR strictly greater than $0.80, you MUST surface a price_trigger finding with subject='JUP outside band: $<price>', evidence covering current price + band + source, sourceUrl=https://www.coingecko.com/en/coins/jupiter-exchange-solana. If the price is within [$0.30, $0.80] inclusive, idle.",
      },
    ],
  },
  {
    id: "github_watcher",
    name: "GitHub Watcher",
    emoji: "🛠️",
    suggestedName: "Forge",
    personalityPrompt:
      "You watch repositories with the patience of a long-time contributor. You only ping the owner when something they'd care about ships — a release, a fresh commit on main, a new issue thread.",
    jobPromptPlaceholder: "Which repo or org should I watch?",
    jobPromptExample:
      "Every cycle, watch_url on https://api.github.com/repos/coral-xyz/anchor/releases with format='json' and sinceLastCheck=true. For each new release, surface a github_release finding with the tag as subject, body excerpt as evidence, and the release URL as sourceUrl.",
    recommendedTools: ["watch_url", "message_user", "claim_task"],
    defaultFrequencySeconds: 900,
    description: "Watches a GitHub repo or org. Pings on releases and fresh commits.",
    earningStyle: "Steady",
    activityLevel: "Chill",
    watches: "GitHub repos & orgs",
    pings: "Releases & fresh commits",
    // Phase 0 (billion-dollar edition): picker locked to the trio
    // Sentinel · Wren · Pulse. GitHub Watcher kept in the registry
    // for backwards-compat with any DB rows that already chose it,
    // but no longer offered on the spawn picker.
    inPicker: false,
    jobSuggestions: [
      {
        label: "solana-labs/solana releases",
        job:
          "Every cycle, watch_url on https://api.github.com/repos/solana-labs/solana/releases with format='json' and sinceLastCheck=true. For each new release, surface a github_release finding. Subject = release name, evidence = tag + body excerpt + author + published date, sourceUrl = release URL.",
      },
      {
        label: "coral-xyz/anchor releases",
        job:
          "Every cycle, watch_url on https://api.github.com/repos/coral-xyz/anchor/releases with format='json' and sinceLastCheck=true. Surface each new release as a github_release finding. Subject = release name, evidence = tag + body excerpt + published date, sourceUrl = release URL.",
      },
      {
        label: "metaplex/mpl-core releases",
        job:
          "Every cycle, watch_url on https://api.github.com/repos/metaplex-foundation/mpl-core/releases with format='json' and sinceLastCheck=true. Surface each new release as a github_release finding. Subject = release name, evidence = tag + body excerpt + published date, sourceUrl = release URL.",
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
    watches: "Open tasks",
    pings: "Paid queries",
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
    watches: "Tiny tasks",
    pings: "Small earnings",
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
    "watch_url",
    "read_onchain",
    "message_user",
    "subscribe_to_agent",
    "expose_paywall",
    "post_task",
    "claim_task",
  ],
  defaultFrequencySeconds: 180,
  description: "Fork of the original Atlas. Same personality. Fresh memory. Your vault.",
  earningStyle: "Steady",
  activityLevel: "Balanced",
  watches: "Solana ecosystem",
  pings: "Decisions and findings",
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
