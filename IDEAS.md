# Kyvern — Idea Bank

Every narrative, use case, and direction discussed. Unfiltered. Pick the one that feels right.

---

## What's Already Built (Real, Working)

- **Anchor program** on Solana devnet — enforces budgets, allowlists, velocity caps, memo, kill switch on-chain
- **Squads v4 multisig vaults** — real wallets for agents with delegated spending limits
- **SDK** (`@kyvernlabs/sdk`) on npm — `vault.pay()`, `vault.pause()`, `vault.status()`
- **Atlas** — autonomous agent running 4+ days, 1,400+ cycles, 524+ attacks blocked, $12 spent, $5.60 earned, $0 lost
- **x402 endpoints** — HTTP 402 Payment Required protocol integration (agents pay for API access)
- **KyvernOS UI** — white Apple-grade design, cinematic unboxing, iOS tab bar, device cards, live Atlas feed
- **Attack system** — scheduled + public adversarial probes, all logged
- **Auth** — Privy (email/Google/wallet, embedded wallets, no extension needed)
- **Docs** — full SDK documentation

---

## Direction 1: Spending Guardrails / Trust Primitive

**Pitch:** "Stop giving your AI agent your private key. Use Kyvern instead."

**User:** Developer building an AI agent on Solana who currently puts a private key in an env file with zero controls.

**What they get:** A vault with spending rules. Replace the private key with a Kyvern agent key. Budget, allowlist, velocity caps, kill switch — enforced on-chain.

**Revenue model:** Fee per transaction through Kyvern vaults.

**Pros:**
- Most technically accurate description of what Kyvern does
- The problem is real (every agent builder does this today)
- Atlas proves it works

**Cons:**
- Defensive/boring — "guardrails" doesn't excite anyone
- Requires SDK integration (code)
- No one wakes up excited about limits
- Feels like enterprise compliance, not a consumer product

**Source:** Original plan, GLM's "trust primitive" framing

---

## Direction 2: Brex for AI Agents

**Pitch:** "The corporate credit card and compliance layer for AI agents."

**User:** Institutions, DAOs, funds that want to give AI agents capital with strict governance.

**What they get:** Corporate-grade spending controls for machine labor. Velocity limits, merchant categories, kill switches. On-chain enforcement.

**Revenue model:** SaaS subscription + per-transaction fee.

**Pros:**
- VCs instantly understand the analogy
- Big market (institutional AI + DeFi)
- Clear business model

**Cons:**
- No institutional users exist yet (the market is emerging)
- "Brex for X" is overused in pitches
- Requires code integration
- You don't have the "card" — you have the "management." That's half a product.

**Source:** Gemini's suggestion

---

## Direction 3: Agent Wallet / Agent Device

**Pitch:** "Give your AI agent its own wallet on Solana."

**User:** Any developer who wants their agent to handle money autonomously.

**What they get:** A wallet with built-in rules. Fund it, connect your agent, it spends within limits.

**Revenue model:** Per-transaction fee.

**Pros:**
- "Wallet" is universally understood
- The device/unboxing experience is unique and memorable

**Cons:**
- Technically inaccurate — Squads IS the wallet, Kyvern is the policy layer
- Judges who know Solana will ask "how is this different from Squads?"
- Still requires SDK integration

**Source:** GLM's earlier suggestion

---

## Direction 4: The Agent Economy / Agent-to-Agent Commerce

**Pitch:** "Kyvern is where AI agents become economic entities. They spend, earn, and operate autonomously on Solana."

**User:** Agent builders who want their agents to participate in an economy — both spending and earning.

**What they get:** Spend side (vaults with rules) + earn side (x402 endpoints). Full economic loop.

**Demo:** Atlas pays Scout (second agent) for data. Both run within Kyvern policies. Real on-chain commerce.

**Revenue model:** Take rate on every transaction (both directions).

**Pros:**
- "Economy" > "guardrails" — platform, not feature
- Two-sided marketplace = network effects = investable
- x402 infrastructure already exists in codebase

**Cons:**
- Requires deploying a second agent (demo, not product)
- Two agents paying each other is circular — who's the real customer?
- Still developer-focused
- The economy doesn't exist yet (chicken and egg)

**Source:** All three models agreed on this. GLM, Gemini, Grok all said agent-to-agent commerce is the killer demo.

---

## Direction 5: Deploy an Agent in 60 Seconds (Hosted Agents)

**Pitch:** "Your AI agent works for you on Solana. 24/7. Within rules nobody can break."

**User:** Anyone (not just developers). Pick a template, fund it, watch it run.

**What they get:** A running agent (hosted by Kyvern) that operates autonomously — spending, earning, surviving attacks. No code needed.

**Templates:** Forecaster (like Atlas), data collector, airdrop hunter, etc.

**Demo:** Judge clicks "Deploy" → agent starts → first decision in 3 minutes → they come back from coffee → agent has been working.

**Revenue model:** Platform fee + take rate on transactions.

**Pros:**
- No code needed for the user
- "My agent is running" is exciting
- The "come back from coffee" moment is powerful
- Atlas proves the template works

**Cons:**
- Relies on AI (Claude API) for every user's agent — expensive for you
- The VALUE comes from Claude's intelligence, not from Kyvern
- "What does the agent actually DO?" keeps being hard to answer concretely
- Agent output (reports, forecasts) — who pays for it? Circular.
- Hosting agent processes for many users on one VM is fragile

**Source:** Grok's suggestion, refined in conversation

---

## Direction 6: Revenue Intelligence / Agent PnL

**Pitch:** "Monetize your agent. See the PnL. Revenue, expenses, net profit — all on-chain."

**User:** A developer running an AI agent that costs money (API calls) and could earn money (selling output).

**What they get:** A dashboard that shows agent economics. Revenue from x402 payments received, expenses from API costs, net profit. The thing you check every morning.

**Demo:** Atlas's PnL — earning $5.60, spending $12.39, with detailed breakdown by endpoint and client.

**Revenue model:** Take rate on transactions + premium analytics.

**Pros:**
- "PnL chart" is something you open every morning
- Shifts focus from "attacks blocked" (defensive) to "money earned" (offensive)
- Clear business value — "am I making money?"

**Cons:**
- Still requires the agent to exist (who builds the agent?)
- Earning requires buyers (who's paying for the agent's output?)
- The revenue is real for Atlas but would be hard to replicate for new users quickly

**Source:** One of the model responses (the "revenue intelligence" framing)

---

## Direction 7: No-Code API Monetization (Payment Proxy)

**Pitch:** "Monetize any API on Solana. No code. Paste your URL. Earn USDC."

**User:** Any developer with an existing API. Also any creator with content.

**What they get:** Paste an API URL into Kyvern → get a paid proxy URL → share it → earn USDC per request. Kyvern acts as a payment proxy. The original API doesn't change.

**Earn side:** Paste URL, set price, earn.
**Spend side:** Create a vault with budget rules, your agent pays through it safely.

**Demo:** Judge pastes any URL → sets price → gets proxy link → Atlas hits it → judge sees "$0.001 earned" in real-time.

**Revenue model:** Small fee on every proxied payment.

**Pros:**
- ZERO code for the seller (just paste a URL)
- Everyone with an API understands it immediately
- Solana-specific (micropayments only work with cheap gas)
- Earnings dashboard is what you check every morning
- Works for both AI agents and humans as buyers

**Cons:**
- Is it exciting enough for grand champion? It's useful but not "holy shit"
- Proxy adds latency
- Trust issue: users trust Kyvern with their API traffic?
- Competing with general API monetization platforms (RapidAPI, etc.)
- Need buyers (agents) to generate actual earnings for sellers

**Source:** Final conversation synthesis

---

## Direction 8: Smart Wallet / "The Wallet You Can't Drain"

**Pitch:** "Create a Solana wallet with spending rules that even the key holder can't break."

**User:** Anyone who needs a controlled wallet — agent builders, DAOs, parents, businesses.

**What they get:** A wallet on Solana with on-chain rules: max spend/day, approved recipients only, velocity limits, kill switch. Rules enforced by Anchor program — even the key holder can't bypass them.

**Demo:** Create wallet → set rules → publicly post the restricted key → watch people TRY to drain it and FAIL. "I posted my key on Twitter. Nobody can steal my money."

**Revenue model:** Vault creation fee + per-transaction fee.

**Pros:**
- "Wallet you can't drain" is visceral and memorable
- No code — create through the UI
- Universal use case (not just agents)
- The "post the key publicly" demo is unforgettable
- Uses Kyvern's actual unique tech (on-chain policy enforcement)

**Cons:**
- "Smart wallet" sounds incremental over Squads
- Might be seen as a feature, not a product
- Less exciting than "agent economy" narratives
- The non-agent use cases (parents, businesses) are a stretch for a Solana hackathon

**Source:** Conversation synthesis

---

## Direction 9: Solana-Specific Opportunity Agent (Your Agent Hunts, You Earn)

**Pitch:** "Your AI agent hunts Solana opportunities while you sleep."

**User:** Crypto-native individuals who want 24/7 on-chain intelligence and action.

**What they get:** An agent that monitors Solana (new protocols, airdrops, yield changes), decides what to do, acts within your rules (small deposits, swaps, data purchases), earns from selling its findings.

**Morning check:** "While you slept, your agent deposited $3 into Kamino (airdrop farming), earned $0.15 selling data, and blocked 2 attacks."

**Revenue model:** Platform fee + take rate on earnings.

**Pros:**
- "Something worked for me while I slept" is the stickiest product feeling possible
- Solana-specific (hunts Solana opportunities)
- The earning is from REAL Solana activity (airdrops, DeFi), not circular
- Judges in the Solana ecosystem would personally want this

**Cons:**
- Heavily AI-dependent (Claude API cost per user)
- Building reliable DeFi interactions in 16 days is very risky
- "Airdrop farming" might not impress judges
- If the agent makes bad decisions, users lose money — liability
- Needs real DeFi integrations (Jupiter, Kamino, etc.) to be credible

**Source:** One of the model suggestions (the "opportunity hunter" angle)

---

## Direction 10: Public Honeypot / "Try to Break It"

**Pitch:** "There's $X in this wallet. Try to steal it. You can't."

**User:** The public. Anyone who wants to test Kyvern's security.

**What they get:** An interactive experience where you try to attack a funded Kyvern vault. Every attack blocked. On-chain proof. Leaderboard.

**Demo:** Fund a vault with real USDC. Open it to the public. Tweet the link. Watch people try and fail.

**Revenue model:** Not directly — this is a marketing/proof tool that drives adoption of the platform.

**Pros:**
- Incredibly visceral and shareable
- Already partially built (Attack Atlas exists)
- Generates real social media buzz
- Judges can try it themselves
- Proves the tech better than any pitch

**Cons:**
- It's a demo/marketing stunt, not a product
- If someone actually finds a bug, it's catastrophic
- Doesn't answer "what do users do after they're impressed?"

**Source:** Gemini's "live public honeypot" suggestion

---

## What All Models Agreed On

1. **Mainnet matters** — Even $5 real USDC on mainnet changes devnet→school project into real→company. GLM, Gemini, Grok all said this.

2. **The attack demo is powerful** — "Attack → Block → see it on Explorer" is the moment every model highlighted. Already built.

3. **Agent-to-agent commerce is the strongest demo** — Two agents transacting is what every model said differentiates from other submissions.

4. **One framework integration** — Getting into ElizaOS or SendAI (even a PR) signals "infrastructure." GLM and Gemini both said this.

5. **Pitch video is critical** — 3 minutes, Loom, screen recording + voiceover. Most important submission element per Colosseum's own guide.

---

## Key Tensions To Resolve

- **Code vs. No-Code:** Most directions require SDK integration. Only directions 5, 7, 8, and partially 10 work without user code.

- **AI vs. No-AI:** Directions 5 and 9 depend on Claude API (expensive, value comes from AI not Kyvern). Directions 1, 2, 3, 7, 8 don't need AI.

- **Existing vs. Emerging Market:** Directions 1-4 serve developers building agents (market exists but small). Directions 5, 7, 9 serve broader audiences (bigger market but harder to prove).

- **Feature vs. Product:** Directions 1-3 feel like features. Directions 4-9 feel more like products. Direction 10 is a marketing stunt.

- **Buildable in 16 Days:** Directions 1, 6, 7, 8, 10 are low-risk. Directions 4, 5, 9 require significant new code. Direction 2 requires users that don't exist.

---

## Decision Framework

Ask yourself:

1. **"Would I use this?"** — If you wouldn't open it tomorrow morning, users won't either.

2. **"Can a judge try it in 2 minutes?"** — If it requires setup, explanation, or code, judges skip.

3. **"Does Kyvern create the value, or does something else?"** — If you remove Kyvern and the product still works (with Claude, with Squads alone, etc.), it's not a Kyvern product.

4. **"Can I explain it in one sentence to a non-technical person?"** — If not, it's too complex.

5. **"Is this a company or a hackathon project?"** — Judges invest in companies.

---

*Take your time. Read these. Think. The right answer is the one that makes YOUR gut say "yes, that's it." Not the one that sounds best on paper.*
