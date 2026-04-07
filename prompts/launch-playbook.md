# KyvernLabs Launch Playbook

## Pre-Launch Checklist

- [x] X Premium on @KyvernLabs
- [x] Profile: bio, header, profile pic
- [ ] Demo video recorded and uploaded to YouTube
- [ ] All launch tabs ready in browser
- [ ] Send 3 fresh Stellar payments before recording so dashboard data is current

---

## THE GLOBAL LAUNCH ARTICLE

**Post this as an X Article from @KyvernLabs.** This is the master announcement — multi-chain, multi-product, the full vision. Pin it as the first thing people see.

---

### Title:
**Introducing KyvernLabs — The Business Layer for x402**

### Body:

Last week, the x402 Foundation launched under the Linux Foundation. Coinbase, Cloudflare, Stripe, Google, Visa, Amazon, Microsoft, Solana Foundation, Mastercard, and Shopify are founding members.

x402 is the protocol that lets AI agents pay for APIs with stablecoins over HTTP. It turns the 30-year-old "402 Payment Required" status code into a real payment rail. There are now 195+ services live across the ecosystem, processing $24M+ in monthly volume on Base and Stellar. The protocol infrastructure is ready.

What's missing is the business layer. The analytics, the revenue intelligence, the tools that turn an x402 endpoint into a real company. Nobody has built it.

Until now.

**What we built**

KyvernLabs Pulse is real-time revenue intelligence for x402 service providers. Multi-chain by default. Built for the agent economy.

One middleware integration captures every payment that flows through your endpoint — payer wallet, USDC amount, blockchain transaction hash, latency, error rates. Everything is verified on-chain. Click any transaction in the dashboard and see it live on BaseScan or StellarChain.io. We support both Base and Stellar today, and the architecture extends to every chain x402 supports.

The integration is one line of code:

```
import { withPulse } from '@kyvernlabs/pulse'

export default withPulse(handler, { apiKey: 'kv_live_...' })
```

The dashboard shows your revenue, your customers, your endpoints, and your growth — scoped to your account via Privy authentication. Email, Google, or wallet login. No friction, no passwords.

**What's live today**

- Pulse analytics dashboard at kyvernlabs.com/pulse — live, multi-chain, free tier included
- Real Stellar testnet integration via @stellar/stellar-sdk and Horizon API. Every Stellar transaction in Pulse is a real on-chain transaction with a verifiable hash on StellarChain.io
- @kyvernlabs/pulse npm package — one-line middleware for any x402 endpoint
- @kyvernlabs/mcp — an MCP server with 17 tools so AI agents can query your analytics directly from Claude, Cursor, or any MCP-compatible client
- Pulse Copilot — ask "What's my Stellar revenue?" or "Compare Base vs Stellar" in plain English and get real answers from your data
- Agent Persona Engine — automatic classification of your customers as Whales, Loyalists, Explorers, or At Risk
- Smart Alerts with Slack and Discord notifications, Webhooks with HMAC signing, A/B Pricing Experiments, Revenue Forecasting, Public x402 Service Registry, Market Gap Finder, Market Data API
- Two production x402 services running through our own Pulse middleware as proof
- Pro tier with x402-native USDC billing or credit card via MoonPay

Every piece of this stack uses x402. Our own Pro subscription is paid with x402. We dogfood our own product at every level.

**Pricing**

Free for up to 5,000 events per day. Growth at $19 per month. Pro at $49 USDC per month — paid with x402, the same way your agents pay you. Or with a credit card via MoonPay if you prefer. No middlemen.

**The vision**

KyvernLabs is building the full x402 business stack:

1. Pulse — Revenue intelligence (live)
2. Vault — Smart contract wallets with per-agent budgets (alpha)
3. Router — Smart routing to the cheapest and fastest x402 service (planned)
4. Marketplace — Launch x402 APIs in minutes (planned)

Each one makes the x402 economy more functional. Pulse tracks the money. Vault manages it. Router optimizes it. Marketplace distributes it.

We are not building another agent. We are the infrastructure layer that every agent and every service provider in this economy needs. During the California Gold Rush, the richest people were not the miners — they were the ones selling pickaxes. We are building the pickaxes for the x402 agent economy.

**What's next**

This is day one. Today we are also submitting Pulse to the Stellar Hacks: Agents hackathon and applying to the Elsa Agentic Fellowship. The Solana Frontier Hackathon and ETHGlobal Open Agents are next. Multi-chain is not a roadmap item — it is the foundation.

If you are building an x402 service on any chain, install Pulse. If you are building an agent that earns, our MCP tools let it track its own revenue. If you are an investor, builder, or operator who sees the agent economy coming, we are here to build the rails with you.

The protocol is ready. The Foundation members are in place. The first wave of x402 services is live and earning. What was missing is the business layer.

That is what we are building.

kyvernlabs.com/pulse
github.com/shariqazeem/kyvernlabs
npmjs.com/package/@kyvernlabs/pulse

— Shariq Azeem, Founder

---

## SHORT LAUNCH POST (Optional companion to the Article)

**From @KyvernLabs, posted right before the Article so the Article can be linked:**

---

Today we're launching KyvernLabs.

The business layer for the x402 agent economy. Multi-chain — Stellar, Base, and every chain x402 supports. Real-time revenue intelligence. AI Copilot. 17 MCP tools. One line of middleware.

195+ x402 services live. $24M+ monthly volume. Zero analytics — until now.

Pulse is live → kyvernlabs.com/pulse

Full launch story in the Article below ↓

---

## FOUNDER POST — From @shariqshkt

**Post this immediately after the @KyvernLabs Article. Personal, real, no corporate voice.**

---

Today I'm launching KyvernLabs.

I've spent the last few weeks building the business infrastructure layer for x402 — the new internet-native payment protocol for AI agents. And today it's live.

I'm a 5x hackathon winner. Built ParallaxPay, TrendSurfer, and x402-Oracle. Every project taught me the same lesson — x402 is going to be massive, but nobody is building the tools that make it a real business.

195+ services exist right now. They process $24M+ monthly across Stellar and Base. Agents pay for APIs autonomously. But every service provider is flying blind. No dashboard. No analytics. No way to know who's paying them.

That's what KyvernLabs solves.

Our first product, Pulse, gives every x402 provider real-time revenue tracking, on-chain verified transactions, an AI Copilot that answers "What's my Stellar revenue?" with actual data, agent personas, churn prediction, pricing experiments, and 17 MCP tools so AI agents can track their own earnings.

I built deep Stellar integration with @stellar/stellar-sdk and real Horizon API. Not a badge. Real blockchain code. Every Stellar transaction in Pulse is a real testnet transaction verifiable on StellarChain.io.

Today I'm also:
- Submitting Pulse to the @StellarOrg Stellar Hacks: Agents hackathon
- Applying to the @HeyElsaAI Agentic Fellowship
- Registered for the @colosseum Solana Frontier hackathon (May 11)

The x402 Foundation just launched under the Linux Foundation with Google, Amazon, Visa, Stripe, Coinbase, Microsoft, and Solana Foundation. The timing couldn't be better.

This isn't a side project. This is KyvernLabs — the business layer for the x402 economy.

Check it out: kyvernlabs.com/pulse
Star us: github.com/shariqazeem/kyvernlabs

Proud to ship this. Let's build.

@KyvernLabs

---

## EXECUTION ORDER (Today, April 7)

1. **Record demo video** — follow `prompts/demo-video-script.md`. 6 scenes, 2:30 total.
2. **Upload to YouTube** — unlisted is fine, you'll share the link in submissions.
3. **Post @shariqshkt founder story** — gives the launch a human face first.
4. **Post @KyvernLabs short launch post** (optional) — sets up the Article.
5. **Post @KyvernLabs Article** — the main announcement. Pin it.
6. **Submit to Stellar Hacks** on DoraHacks — paste video link, link the Article, link the GitHub.
7. **Apply to Elsa Fellowship** on Tally — reference today's launch and submission as evidence of execution.
8. **Post Stellar Hacks submission tweet** from @KyvernLabs.
9. **Post Elsa Fellowship application tweet** from @KyvernLabs.

---

## FOLLOW-UP POSTS (Days 2-7, from @KyvernLabs)

**Day 2 — Stellar deep dive:**

How we built real Stellar testnet integration into Pulse:

- Installed @stellar/stellar-sdk v15
- Built src/lib/stellar.ts — keypair generation, Horizon submission, balance fetching
- Real PaymentOperations on testnet via Friendbot-funded accounts
- Every tx hash verifiable on testnet.stellarchain.io
- Multi-chain dashboard shows Stellar alongside Base in one view

This is how revenue intelligence should work — real blockchain, not labels.

**Day 3 — Copilot demo:**

The Pulse AI Copilot understands x402 revenue across chains.

Ask: "What's my Stellar revenue?" → real answer
Ask: "Compare Base vs Stellar" → cross-chain breakdown
Ask: "Which agents chain multiple services?" → workflow analysis

Not a ChatGPT wrapper. Real analytics queries against your x402 data.

Try it: kyvernlabs.com/pulse/dashboard/copilot

**Day 4 — MCP integration:**

17 MCP tools for AI agents to query their own x402 revenue.

Add @kyvernlabs/mcp to Claude Desktop or Cursor:

```
{
  "mcpServers": {
    "kyvernlabs-pulse": {
      "command": "npx",
      "args": ["@kyvernlabs/mcp"],
      "env": { "KYVERNLABS_API_KEY": "kv_live_..." }
    }
  }
}
```

Your AI can now ask about its own earnings.

**Day 5 — Setup speed:**

From zero to revenue dashboard in 30 seconds:

1. Sign in (email, Google, or wallet)
2. Get your kv_live_ API key
3. npm install @kyvernlabs/pulse
4. Wrap your x402 endpoint
5. See every payment in real-time

Works on Stellar, Base, and every x402 chain. One middleware, every network.

**Day 6 — Vision:**

The KyvernLabs roadmap:

1. Pulse — Revenue intelligence (live)
2. Vault — Smart contract wallets with per-agent budgets
3. Router — Smart routing to cheapest x402 service
4. Marketplace — Launch x402 APIs in minutes

Each product makes the x402 economy more functional. We're building all four.

**Day 7 — Day one recap:**

One week ago we launched KyvernLabs.

Since then:
- Live multi-chain dashboard (Base + Stellar)
- 17 MCP tools for AI agents
- Pulse Copilot understanding x402 revenue
- Real Stellar Horizon API integration
- Submitted to Stellar Hacks
- Applied to Elsa Fellowship
- Registered for Solana Frontier

The agent economy needs a Bloomberg Terminal. We're building it.

---

## TAGGING STRATEGY

**Always tag on launch:** @StellarOrg @HeyElsaAI @base @CoinbaseDev @colosseum
**Technical posts:** Tag the relevant chain (@StellarOrg, @SolanaFndn, @base)
**Hackathon submissions:** Tag the hackathon org and DoraHacks
**Limit:** Max 3-4 tags per post. Never spam.

---

## DM TEMPLATE — for x402 providers

Hey — saw your endpoint on the x402 leaderboard. I built a free analytics tool that shows you which agents pay you, how much you earn per endpoint, and your on-chain verification rate.

One line of middleware. Works on Stellar and Base. Takes 60 seconds.

kyvernlabs.com/pulse

Happy to help with setup if you want.

— Shariq
