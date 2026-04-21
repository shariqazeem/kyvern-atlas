# Stellar Hacks: Agents — BUIDL Submission (DoraHacks)

Copy-paste these into the DoraHacks submission form for KyvernLabs Pulse.

> **Update (April 8, 2026):** The submission has been upgraded with **Stellar Mainnet support** in addition to testnet. The library now uses a chain-agnostic architecture that routes between mainnet (`horizon.stellar.org`) and testnet (`horizon-testnet.stellar.org`) per-call. Mainnet is the default for production accounts. Use the **"Update BUIDL"** flow on DoraHacks to refresh the description with the new section below before judging closes.

---

## BUIDL Name

```
KyvernLabs Pulse
```

---

## BUIDL Logo

Use `public/og-image.jpg` (the KV mark on black, 512x512). Already JPEG, square, well under 2 MB. Upload it directly.

---

## Vision (≤256 characters)

```
Real-time revenue intelligence for x402 agents. Multi-chain by default with deep Stellar integration via @stellar/stellar-sdk and Horizon API. Every transaction verified on-chain. The Bloomberg Terminal for the AI agent economy.
```

*(225 characters — safely under the 256 limit)*

**Backup vision (if you want to lead with the business framing):**

```
The business layer for the x402 agent economy. Real-time revenue intelligence for every service provider, multi-chain by default with deep Stellar integration via @stellar/stellar-sdk and the Horizon API.
```

*(206 characters)*

---

## Category

**Developer Tools / Infrastructure**

If they don't have that exact label, pick the closest of:
- Developer Tools
- Infrastructure
- Analytics
- Payments

Avoid "AI Agent" — Pulse is the layer that AI agents *use*, not an agent itself.

---

## Is this BUIDL an AI Agent?

**No** — Pulse is the infrastructure layer that AI agents and x402 service providers use to track and measure their on-chain revenue.

---

## GitHub

```
https://github.com/shariqazeem/kyvernlabs
```

---

## Project Website

```
https://kyvernlabs.com/pulse
```

---

## Demo Video

Paste the YouTube link (unlisted is fine — embedded players still work in the form).

---

## Social Links (add all 3)

```
https://x.com/KyvernLabs
https://x.com/shariqshkt
https://github.com/shariqazeem/kyvernlabs
```

---

## Team Information

```
Shariq Azeem — Founder, Builder, Engineer

KyvernLabs is a solo founder operation. Shariq is the sole engineer on Pulse, building full-time.

Before starting KyvernLabs, he shipped multiple production x402 projects — ParallaxPay, TrendSurfer, x402-Oracle, and several others — making him one of the very few builders with deep, hands-on experience on the x402 protocol. Every one of those projects revealed the same gap: x402 works beautifully, but service providers have no way to measure their revenue, understand their customers, or optimize their pricing. KyvernLabs Pulse is the answer to that gap, built by someone who has felt the pain firsthand.

Why a solo team:
Building KyvernLabs solo is a deliberate choice for speed and focus. Every product decision, every Stellar integration, and every line of code is hands-on by the founder. This is why Pulse went from concept to a live, multi-chain product with deep Stellar testnet integration in weeks — not quarters.

Technical stack expertise:
Next.js 14, TypeScript, Tailwind, Framer Motion, @stellar/stellar-sdk v15, Horizon API, Privy authentication, MCP server design, SQLite with WAL mode, x402 middleware architecture, Soroban-aware design.

Contact:
- Founder: https://x.com/shariqshkt
- Company: https://x.com/KyvernLabs
- GitHub: https://github.com/shariqazeem
```

**Backup short version (if the field has a tight character limit):**

```
Shariq Azeem — Solo founder & sole engineer.

Before KyvernLabs, shipped ParallaxPay, TrendSurfer, x402-Oracle, and several other x402 projects. One of the few builders with hands-on x402 expertise. Building KyvernLabs full-time.

Stack: Next.js, TypeScript, @stellar/stellar-sdk, Horizon API, MCP, Privy, SQLite.

Solo by design — for speed and focus. Took Pulse from concept to live multi-chain product with deep Stellar testnet integration in weeks.

Contact: https://x.com/shariqshkt
```

---

## Description / Long Pitch (use this if the form has a description field)

**This is the FINAL version — replace the existing DoraHacks submission text with this. Includes mainnet support, Solana, x402-native billing, and production-ready hardening.**

```
KyvernLabs Pulse is real-time revenue intelligence for x402 service providers — the business infrastructure layer for the AI agent economy.

The x402 protocol just became the official payment standard for AI agents under the Linux Foundation, with Solana Foundation, Coinbase, Stripe, Google, Visa, and Cloudflare as founding members. 195+ services are already live, processing $24M+ in monthly volume. But every single one of them is flying blind — no analytics, no dashboard, no way to know who's paying them.

Pulse fixes that with one line of middleware.

WHAT WE BUILT FOR THIS HACKATHON:
- Deep Stellar integration via @stellar/stellar-sdk v15 and the Horizon API — supporting BOTH Stellar Mainnet (horizon.stellar.org) AND Testnet (horizon-testnet.stellar.org) through a single chain-agnostic library. Mainnet is the default for production accounts; testnet remains available for demos.
- Real PaymentOperations on both networks — every Stellar transaction in Pulse is a real on-chain payment, verifiable on stellar.expert (mainnet or testnet)
- Circle's official mainnet USDC issuer integrated alongside the testnet issuer
- Multi-chain dashboard showing Base, Stellar (mainnet + testnet), and Solana (mainnet + devnet) in one unified view
- Solana integration added with the same depth as Stellar via @solana/web3.js — captures real Solana transactions on mainnet-beta and devnet
- AI Copilot that understands cross-chain x402 revenue ("What's my Stellar revenue?", "Compare Base vs Stellar", "Which agents chain multiple services?")
- 17 MCP tools so AI agents on Claude or Cursor can query their own Stellar earnings programmatically
- Soroban-aware architecture for future smart contract integration — schema is ready
- Friendbot-funded testnet accounts for instant onboarding (testnet); manual XLM funding flow on mainnet
- On-chain verification badges showing which transactions are confirmed on Horizon
- x402-native subscription billing — Pulse Pro is paid in USDC on Base via x402, eating our own dog food. Users can pay from any wallet (Privy, MetaMask, Coinbase Wallet, Phantom, hardware) — backend verifies on-chain, activates the authenticated account regardless of which wallet sent the payment.
- Production-ready multi-tenant: every API route filters by api_key_id, every user gets their own dashboard, session-authenticated subscription endpoint, no data leakage

WHY THIS MATCHES THE STELLAR HACKS VISION:
Stellar Hacks: Agents is about agents that discover, pay, and continue. Pulse is the layer that makes that loop measurable. Every Stellar payment an agent makes — every API call, every service consumed — gets captured, verified on-chain via Horizon, and surfaced in real-time analytics. Without observability, the agent economy on Stellar can't grow. Pulse provides the observability — on testnet for demos and on mainnet right now for production providers.

THE PICKAXE POSITIONING:
During the California Gold Rush, the richest people weren't the miners — they were the ones selling pickaxes. We're building the pickaxes for the x402 agent economy on Stellar.

TECH STACK:
- Frontend: Next.js 14, TypeScript, Tailwind, Framer Motion
- Backend: Next.js API routes, SQLite with WAL mode
- Stellar: @stellar/stellar-sdk v15, Horizon mainnet + testnet, Friendbot (testnet), Circle USDC issuer
- Solana: @solana/web3.js v1.98, RPC mainnet-beta + devnet, USDC support
- Multi-chain architecture: chain-agnostic events table with CAIP-2 network IDs
- Auth: Privy (email, Google, wallet) with session cookies
- Middleware: @kyvernlabs/pulse npm package — chain-agnostic, auto-detects network
- MCP: @kyvernlabs/mcp with 17 tools
- Billing: x402-native USDC subscriptions on Base mainnet

LINKS:
- Live: https://kyvernlabs.com/pulse
- Setup guide (all chains): https://kyvernlabs.com/pulse/dashboard/setup
- GitHub: https://github.com/shariqazeem/kyvernlabs
- npm: https://npmjs.com/package/@kyvernlabs/pulse
```

---

# YouTube Video Metadata

For the unlisted demo video on YouTube.

## Title (under 100 chars)

**Primary:**
```
KyvernLabs Pulse — Real-Time Revenue Intelligence for x402 Agents on Stellar
```

**Alternatives:**
- `KyvernLabs Pulse: The Bloomberg Terminal for x402 Agents (Stellar Demo)`
- `Pulse by KyvernLabs — Multi-Chain x402 Analytics with Real Stellar Integration`
- `Introducing KyvernLabs Pulse: The Business Layer for x402 (Stellar Hacks: Agents)`

---

## Description

```
KyvernLabs Pulse is real-time revenue intelligence for x402 service providers — the business infrastructure layer for the AI agent economy.

Submitted to Stellar Hacks: Agents 🌟

→ Live: https://kyvernlabs.com/pulse
→ GitHub: https://github.com/shariqazeem/kyvernlabs
→ npm: https://npmjs.com/package/@kyvernlabs/pulse

WHAT IT DOES
x402 just became the official payment protocol for AI agents under the Linux Foundation, backed by Solana Foundation, Coinbase, Stripe, Google, Visa, and Cloudflare. 195+ services are already live, processing $24M+ in monthly volume. But none of them have any way to actually measure their revenue, see who's paying them, or optimize their pricing.

Pulse fixes that. One line of middleware. Multi-chain by default. Real on-chain verification.

DEEP STELLAR INTEGRATION
- Built on @stellar/stellar-sdk v15 and the Horizon API
- Real testnet PaymentOperations — every transaction is verifiable on testnet.stellarchain.io
- Friendbot-funded account creation for instant testing
- Soroban-aware architecture for future smart contract integration
- Multi-chain dashboard showing Stellar alongside Base in one unified view

KEY FEATURES
→ Real-time revenue dashboard with on-chain verified transactions
→ AI Copilot that answers questions in plain English
→ 17 MCP tools so AI agents on Claude or Cursor can track their own earnings
→ Agent personas (Whales, Loyalists, Explorers, At Risk)
→ Smart Alerts via Slack and Discord
→ A/B pricing experiments and revenue forecasting
→ One-line middleware: npm install @kyvernlabs/pulse

WHY IT MATTERS
Stellar Hacks: Agents is about agents that discover, pay, and continue. Pulse is the layer that makes that loop measurable. Without observability, the agent economy can't grow. We're building the pickaxes for the x402 economy.

CHAPTERS
0:00 The problem with x402 today
0:20 The Pulse dashboard
0:50 Real Stellar transactions on Horizon
1:25 AI Copilot demo
1:55 One-line integration
2:15 The vision

LINKS
🌐 https://kyvernlabs.com/pulse
🐦 https://x.com/KyvernLabs
👤 https://x.com/shariqshkt
💻 https://github.com/shariqazeem/kyvernlabs
📦 https://npmjs.com/package/@kyvernlabs/pulse

#x402 #Stellar #AIAgents #Web3 #StellarHacks #Hackathon #DeFi #Soroban #AgentEconomy
```

---

## YouTube Tags

```
x402, stellar, kyvernlabs, pulse, ai agents, stellar hacks, dorahacks, agent economy, web3, blockchain analytics, horizon api, soroban, x402 protocol, linux foundation, coinbase, solana, stripe, defi, mcp, model context protocol, claude, cursor, anthropic
```

---

## Pre-Submission Checklist

- [ ] YouTube video uploaded (unlisted is fine, but Public is better for reach)
- [ ] Dashboard at kyvernlabs.com/pulse loads with fresh Base + Stellar data
- [ ] GitHub repo README has Stellar integration section visible at top
- [ ] @KyvernLabs and @shariqshkt X profiles look professional
- [ ] Logo file (`public/og-image.jpg`) downloaded and ready to upload
- [ ] All form fields above copy-pasted into DoraHacks
- [ ] Submission tweet drafted for @KyvernLabs to post right after

---

# Submission Announcement Tweet (from @KyvernLabs)

Post this from @KyvernLabs right after updating the DoraHacks submission. Tags @StellarOrg + @SDF_org so the Stellar team can see it. Tech-heavy on purpose — Stellar reposts builders who ship real chain code.

## Primary version (long, technical, max impressive)

```
Just shipped deep Stellar integration into KyvernLabs Pulse and submitted to @StellarOrg's Stellar Hacks: Agents 🌟

Pulse is the business intelligence layer for the x402 agent economy — and now Stellar is a first-class citizen on BOTH mainnet and testnet.

Here's exactly how we built it ↓

🔧 Real Stellar SDK Integration (@stellar/stellar-sdk v15)

Single chain-agnostic library in src/lib/stellar.ts. One network parameter routes between horizon.stellar.org (mainnet) and horizon-testnet.stellar.org (testnet). Same code path, both networks.

→ Real PaymentOperations submitted via Horizon — every tx in Pulse is a real on-chain payment, not a label
→ Circle's official mainnet USDC issuer integrated alongside the testnet issuer
→ Friendbot auto-funding on testnet, real XLM funding flow on mainnet (correctly handled per network)
→ Soroban-aware events schema — ready for smart contract integration the moment x402 ships Soroban support

📊 Multi-chain Dashboard

Stellar mainnet + testnet shown alongside Base and Solana in one unified view. Click any transaction → opens stellar.expert → shows the real on-chain payment with real G-addresses, real ledger numbers, real fees.

🤖 AI Copilot for Stellar Revenue

Ask "What's my Stellar revenue?" or "Compare Base vs Stellar" — natural language queries against real Horizon-captured data. Pulse Copilot understands cross-chain x402 revenue patterns out of the box.

🛠 17 MCP tools

AI agents on Claude Desktop or Cursor can query their own Stellar earnings programmatically via @kyvernlabs/mcp. The agent economy needs agents that know how much they earn.

🪶 One-line middleware to integrate

  npm install @kyvernlabs/pulse

  export default withPulse(handler, { apiKey: 'kv_live_...' })

That's it. Pulse auto-detects Stellar from the x402 payment headers. No per-chain config.

We're not building another agent. We're building the financial infrastructure that every x402 service provider on Stellar needs to actually run a business.

Live → https://kyvernlabs.com/pulse
Setup guide (all chains) → https://kyvernlabs.com/pulse/dashboard/setup
GitHub → https://github.com/shariqazeem/kyvernlabs
npm → https://npmjs.com/package/@kyvernlabs/pulse

@StellarOrg @SDF_org @dorahacks #StellarHacks #x402 #Soroban
```

## Shorter alternative (more viral hook, less depth)

```
Just submitted to @StellarOrg Stellar Hacks: Agents 🌟

We built deep Stellar integration into KyvernLabs Pulse — the business intelligence layer for x402 — supporting BOTH Stellar mainnet AND testnet.

Real @stellar/stellar-sdk v15 + Horizon API. Real PaymentOperations. Real on-chain verification on stellar.expert. Multi-chain dashboard with Stellar as a first-class citizen alongside Base and Solana. AI Copilot that answers "What's my Stellar revenue?" in plain English. 17 MCP tools so agents on Claude/Cursor can query their own earnings. Soroban-aware schema, ready for smart contract integration.

Not a label. Real blockchain code. One line of middleware to integrate.

The agent economy needs observability — and Stellar just got it.

Live → https://kyvernlabs.com/pulse
GitHub → https://github.com/shariqazeem/kyvernlabs

@StellarOrg @SDF_org @dorahacks #StellarHacks #x402
```

## Micro version (single tweet, no thread)

```
Just shipped deep Stellar integration into KyvernLabs Pulse 🌟

Real @stellar/stellar-sdk v15 + Horizon API. Mainnet AND testnet. Real PaymentOperations verified on stellar.expert. Multi-chain dashboard with Stellar alongside Base and Solana. AI Copilot for Stellar revenue queries. 17 MCP tools.

Submitted to @StellarOrg Stellar Hacks: Agents.

→ kyvernlabs.com/pulse

@StellarOrg @SDF_org @dorahacks #StellarHacks
```

---

## Tweet posting tips

1. **Pick the long version if you want to maximize Stellar's chance of reposting.** Stellar Foundation specifically reposts builders who show real depth. The long version gives them the most credibility signal — exact SDK version, exact Horizon endpoints, exact architecture decisions.

2. **Pick the shorter version if you want broader engagement.** It's more readable, more shareable, but loses some of the "this is real engineering" signal.

3. **Always tag in this order:** `@StellarOrg @SDF_org @dorahacks` — that's the canonical Stellar ecosystem trio.

4. **Include a screenshot if possible.** Tweets with images get 2-3x more engagement. Best options:
   - A screenshot of the Pulse dashboard showing a Stellar transaction with the chain badge visible
   - A screenshot of `src/lib/stellar.ts` showing the network configuration table
   - A side-by-side of mainnet + testnet badges in the dashboard

5. **Reply to your own tweet** with a follow-up: "Big thanks to @StellarOrg for hosting Stellar Hacks: Agents — and to the @x402 community for the protocol that makes this all work. More multi-chain shipments coming this week."

6. **Don't post and ghost.** Reply to every comment within the first 30 minutes — the X algorithm rewards fast engagement.

7. **Pin this tweet on @KyvernLabs profile** for the next 48 hours so it's the first thing visitors see.
