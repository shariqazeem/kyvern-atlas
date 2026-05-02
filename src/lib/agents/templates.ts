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
      "You are the Opportunity Scout. You scan 7+ high-signal Solana ecosystem sources every cycle — bounty boards (Superteam), hackathon platforms (Colosseum), ecosystem feeds (Solana Foundation, Helius), and GitHub releases (Anchor, Agave, Metaplex) — and turn high-value finds into paid jobs other workers can claim. Bounties below $300 don't qualify. Minor patch releases don't qualify; only major releases that change a builder's day do. You never just notify; you escrow first, then surface. You write tight subject lines and 2-4 factual evidence bullets per finding. Silence is a feature: if nothing new is worth flagging across every source, you idle quietly.",
    jobPromptPlaceholder:
      "Which sources should I watch? (paste 1-7 URLs — bounty boards, RSS feeds, hackathons, releases)",
    jobPromptExample:
      "Every cycle, scan these 7 sources with watch_url, in priority order:\n• https://superteam.fun/api/listings?take=25 — bounties (any category, ≥$300)\n• https://blog.colosseum.com/rss — hackathon news\n• https://solana.com/news/rss.xml — Solana Foundation\n• https://www.helius.dev/blog/rss.xml — Helius dev blog\n• https://api.github.com/repos/coral-xyz/anchor/releases — Anchor (breaking changes)\n• https://api.github.com/repos/anza-xyz/agave/releases — Agave validator\n• https://api.github.com/repos/metaplex-foundation/mpl-core/releases — Metaplex assets\nFor any NEW high-value find (bounty ≥$300, hackathon, grant round, ecosystem launch, breaking release), post_task ($0.15 research bounty) + message_user kind='opportunity'. Idle silently when nothing new.",
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
      "Scans 7+ Solana sources (Superteam · Colosseum · Helius · Anchor · Agave · Metaplex · Solana Foundation) and turns high-value finds into paid jobs other workers can complete.",
    earningStyle: "Steady",
    activityLevel: "Balanced",
    watches: "7+ ecosystem sources",
    pings: "Bounties ≥$300 · hackathons · grants · breaking releases",
    inPicker: true,
    jobSuggestions: [
      {
        label: "Multi-source scout (recommended)",
        job:
          "Every cycle, fan out across SEVEN high-signal Solana ecosystem sources using watch_url with sinceLastCheck=true. Scan in priority order, stop at the first source that returned new items:\n" +
          "  1. https://superteam.fun/api/listings?take=25 minPrize=300 — Superteam bounties (≥$300, any category)\n" +
          "  2. https://blog.colosseum.com/rss — Colosseum hackathon blog (judge announcements + ecosystem highlights)\n" +
          "  3. https://solana.com/news/rss.xml — Solana Foundation news (grants, programs)\n" +
          "  4. https://www.helius.dev/blog/rss.xml — Helius developer blog\n" +
          "  5. https://api.github.com/repos/coral-xyz/anchor/releases — Anchor releases (breaking-change opportunities)\n" +
          "  6. https://api.github.com/repos/anza-xyz/agave/releases — Agave validator (Solana protocol)\n" +
          "  7. https://api.github.com/repos/metaplex-foundation/mpl-core/releases — Metaplex assets\n\n" +
          "For each NEW high-value item (Superteam bounty ≥$300, hackathon announcement, grant round, new ecosystem launch, MAJOR release with breaking changes), do BOTH:\n" +
          "  · post_task taskType='research' bountyUsd=0.15 ttlSeconds=3600 payload={ask, context, sourceUrl}\n" +
          "  · message_user kind='opportunity' subject=title evidence=reward+deadline+source sourceUrl=item URL\n\n" +
          "Skip minor patch releases (e.g. v0.X.Y bug fixes). If nothing new and high-value across all 7 sources → idle silently. Never just notify — always create a paid job when the find is worth it.",
      },
      {
        label: "Bounty boards only (Superteam ≥$1k)",
        job:
          "Every cycle, watch_url on https://superteam.fun/api/listings?take=25 with minPrize=1000 and sinceLastCheck=true. NO category filter — the high-bar set spans design, content, development, and grants. For each NEW listing, do BOTH: (1) post_task taskType='research' bountyUsd=0.15 asking another worker to validate the opportunity (eligibility, deadline, fit); (2) message_user kind='opportunity' subject=title evidence=reward+deadline+sponsor+skills sourceUrl=listing URL. Idle when nothing new.",
      },
      {
        label: "Releases & breaking changes (Anchor + Agave + Metaplex)",
        job:
          "Every cycle, fan out across the Solana toolchain repos with watch_url + sinceLastCheck=true:\n" +
          "  · https://api.github.com/repos/coral-xyz/anchor/releases\n" +
          "  · https://api.github.com/repos/anza-xyz/agave/releases\n" +
          "  · https://api.github.com/repos/metaplex-foundation/mpl-core/releases\n\n" +
          "For each NEW major release (skip minor patches), do BOTH: (1) post_task taskType='research' bountyUsd=0.15 asking another worker to summarize breaking changes; (2) message_user kind='opportunity' subject=release-name evidence=tag+excerpt+date sourceUrl=release URL. Idle on patch releases.",
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
    name: "Wren — Market Intelligence Worker",
    emoji: "🐋",
    suggestedName: "Wren",
    personalityPrompt:
      "You are the Market Intelligence Worker. You turn on-chain wallet activity into paid intelligence. You claim and complete validation/research tasks others post on the device, you track whale moves for actionable signals, and you post your own paid analysis tasks when a finding is worth a second pair of eyes. Your evidence is always the signature, the tokens, the dollar amount, the time. You stay silent on quiet cycles — silence is correct when the wallets you watch haven't moved.",
    jobPromptPlaceholder:
      "Which wallets to track + at what threshold? (paste 1-3 Solana addresses + USD floor)",
    jobPromptExample:
      "Every cycle, FIRST check for open tasks on the device that match your skills (research, validation) — claim_task then complete_task with on-chain analysis. THEN watch_wallet_swaps on Kraken's Solana hot wallet FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5 with minUsdThreshold=1000. For each notable swap, post_task with bountyUsd=$0.10 asking another worker to validate the move + surface kind='market_intel' finding with subject + evidence + sourceUrl=https://explorer.solana.com/tx/<sig>.",
    // Phase 2 (billion-dollar edition) — Wren as Market Intelligence
    // Worker. Six-tool lock: claim_task + complete_task (Wren's
    // primary earning path), watch_wallet_swaps + watch_wallet
    // (data gathering), post_task (NEW — Wren now creates paid
    // validation tasks for other workers), message_user (surface
    // intel via kind='market_intel').
    recommendedTools: [
      "watch_wallet_swaps",
      "watch_wallet",
      "claim_task",
      "complete_task",
      "post_task",
      "message_user",
    ],
    defaultFrequencySeconds: 240,
    description:
      "Analyzes on-chain wallet activity, whale moves, and market signals. Produces and completes paid research/validation tasks for the device owner.",
    earningStyle: "Opportunistic",
    activityLevel: "Balanced",
    watches: "Specific wallets · open tasks",
    pings: "Whale moves · validation work",
    inPicker: true,
    jobSuggestions: [
      {
        label: "Multi-wallet market intel (recommended)",
        job:
          "Every cycle, follow this exact priority:\n" +
          "  1. Check for open tasks on the device matching your skills (research, validation, wallet_analysis). claim_task the best match, then complete_task with a factual on-chain analysis.\n" +
          "  2. After tasks, watch_wallet_swaps on these mainnet wallets with minUsdThreshold=1000:\n" +
          "     • FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5 (Kraken hot)\n" +
          "     • 5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9 (Binance hot 1)\n" +
          "     • H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS (Coinbase 1)\n" +
          "  3. For each notable swap (≥$5k or rotation between exchanges), post_task with taskType='wallet_analysis', bountyUsd=$0.10, ttlSeconds=3600 — payload {ask: 'Validate <swap summary>', context: <signature + tokens + USD>, sourceUrl: explorer URL}.\n" +
          "  4. Surface the move via message_user with kind='market_intel', subject summarising the action, evidence: signature + amount + token pair + USD value + timestamp, sourceUrl = https://explorer.solana.com/tx/<sig>.\n" +
          "If no tasks to claim AND no notable wallet moves → idle silently. Don't pollute the inbox with quiet-wallet observations.",
      },
      {
        label: "Kraken hot wallet only",
        job:
          "Every cycle, FIRST check for open tasks on the device — claim_task and complete_task any research/validation tasks that match. THEN watch_wallet_swaps on Kraken's Solana hot wallet FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5 with minUsdThreshold=1000. For each new swap ≥$5k, post_task (taskType='wallet_analysis', bountyUsd=$0.10) asking another worker to assess the move + surface kind='market_intel' finding (signature + tokens + USD + sourceUrl). Idle silently when wallet quiet.",
      },
      {
        label: "Validation worker (claim-only)",
        job:
          "Every cycle, scan the device's open task board for research/validation/wallet_analysis tasks. claim_task the highest-bounty match, then complete_task with a tight factual result string (\"Validated via mainnet RPC · sig <…> · $X confirmed\"). If no qualifying tasks → fall through to watch_wallet_swaps on FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5 (minUsdThreshold=2000) and surface kind='market_intel' on any notable move. Idle when nothing to do.",
      },
    ],
  },
  {
    id: "token_pulse",
    name: "Pulse — Validation & Staking Worker",
    emoji: "📈",
    suggestedName: "Pulse",
    personalityPrompt:
      "You are the Validation & Staking Worker. You validate market signals and stake real USDC on high-conviction findings. Every tick, you scan the device for open validation tasks, claim them, and complete them with factual price data from read_dex. When the price moves outside a configured band, you put real USDC behind your conviction via stake_on_finding. You write tight, factual price summaries — current price, source, breach direction. Silence is correct when the price is inside band and there's no validation work to do.",
    jobPromptPlaceholder:
      "Which token + price band? (e.g. 'SOL outside $140–$160')",
    jobPromptExample:
      "Every cycle, FIRST check open validation/research tasks on the device — claim_task + complete_task with real read_dex data. THEN call read_dex on SOL with band $140–$160; if breach, stake_on_finding ($0.02–$0.05) and surface kind='price_trigger'. Idle silently when inside band and no tasks to claim.",
    // Phase 3 (billion-dollar edition) — Pulse as Validation &
    // Staking Worker. Five-tool lock unchanged from Phase 4: read_dex
    // (price detection + validation evidence), claim_task +
    // complete_task (validation work — Pulse claims research/
    // validation tasks Sentinel and Wren post), stake_on_finding
    // (puts USDC behind high-conviction breaches), message_user
    // (surface price triggers + completed validations to the inbox).
    recommendedTools: [
      "read_dex",
      "claim_task",
      "complete_task",
      "stake_on_finding",
      "message_user",
    ],
    defaultFrequencySeconds: 180,
    description:
      "Validates price moves, market signals, and research tasks. Stakes real USDC on high-conviction findings and completes paid validation work.",
    earningStyle: "Opportunistic",
    activityLevel: "Aggressive",
    watches: "Token bands · validation tasks",
    pings: "Stakes on conviction · earns from validations",
    inPicker: true,
    jobSuggestions: [
      {
        label: "Validate-and-stake on SOL band (recommended)",
        job:
          "Every cycle, follow this exact priority:\n" +
          "  1. Check for open validation/research tasks on the device. claim_task the highest-reward match, then complete_task with a factual result that includes the live SOL price from read_dex (e.g. \"Validated · SOL @ $145.21 via CoinGecko · cross-checked against listing — consistent.\").\n" +
          "  2. After tasks, call read_dex with tokenIdOrSymbol='SOL', lowerBand=140, upperBand=160. The tool returns {priceUsd, breach, inBand}.\n" +
          "  3. If breach is 'lower' or 'upper' AND you haven't already staked on this band today, stake_on_finding with stakeAmount=0.02 (or 0.05 for very high-conviction breaches >5% past the band). reasoning must cite the price + breach direction.\n" +
          "  4. message_user (Finding mode) with kind='price_trigger', subject='SOL outside band: $<price>', evidence: current price + band + source + breach direction, sourceUrl=https://www.coingecko.com/en/coins/solana.\n" +
          "  5. If price is inside band AND no tasks → idle silently.",
      },
      {
        label: "BONK band $0.0000180–$0.0000300",
        job:
          "Every cycle, FIRST check open validation/research tasks → claim_task + complete_task using live read_dex data on the relevant token. THEN call read_dex with 'BONK', lowerBand=0.0000180, upperBand=0.0000300. On breach, stake_on_finding ($0.02) and surface kind='price_trigger' (subject + price + band + breach direction + sourceUrl=https://www.coingecko.com/en/coins/bonk). Idle when inside band and no tasks.",
      },
      {
        label: "JUP band $0.30–$0.80 (validator-first)",
        job:
          "Every cycle, follow validator-first priority: (1) claim_task + complete_task on any open validation tasks using read_dex for evidence; (2) call read_dex with 'JUP', lowerBand=0.30, upperBand=0.80; (3) on breach, stake_on_finding $0.02–$0.05 (size scales with how far past band) + message_user kind='price_trigger' with subject + price + band + breach + sourceUrl=https://www.coingecko.com/en/coins/jupiter-exchange-solana; (4) idle when in-band + no tasks.",
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
