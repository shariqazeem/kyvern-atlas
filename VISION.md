# KyvernLabs — Vision

> Agents shouldn't have keys. They should have budgets.

This is the doc I go back to when the work gets noisy. When I'm about to chase a shiny thing. When an investor asks "why you." When a hackathon win tempts me into a feature sprint instead of a company. Read it hard. Disagree with it harder.

---

## What we are building

A programmable money layer for autonomous software.

Not a wallet. Not analytics. Not a dashboard. A **primitive** — the thing every agent framework will eventually call when it wants to spend money, the way every web app calls Stripe when it wants to accept it.

The product name is Kyvern Vault. The company name is KyvernLabs. The category we are creating is **agent financial operations** — the CFO layer for a world where software spends money on its own.

---

## The bet

Three things are true at the same time in 2026:

1. **Agents are getting wallets.** Every AI lab, every agent framework, every autonomous-workflow platform is converging on this. It is inevitable. It happens this year.
2. **No one has solved the control problem.** The industry's answer today is "give the agent a private key and hope." That is not a product. That is a gap.
3. **The gap is structural, not temporary.** A language model cannot be trusted with unbounded authority. Not now, not in five years, not with better training. The solution is architectural — budgets, allowlists, kill switches, audit trails. Not prompts.

We are the architectural answer. The company that owns this layer is the company that every agent, every framework, every enterprise goes through when they want to let software spend money safely.

---

## Why we win

**We are building a primitive, not a product.** Primitives compound. Products decay. Stripe won because developers reached for `stripe.charge()`. Twilio won because developers reached for `twilio.send()`. We win when developers reach for `kv.pay()`.

**We are closer to the spending problem than anyone else.** Turnkey, Privy, Dynamic — they do key management. Coinbase, Circle — they do custody. None of them have a policy engine, a kill switch, a merchant allowlist, or an audit trail designed specifically for how autonomous agents misbehave. We do. That difference is the moat.

**We are thinking in integrations from day one.** The billion-dollar version of this company has `@kyvernlabs/sdk` imported by every agent framework on earth. LangChain, CrewAI, Eliza, AutoGPT, Mastra, n8n — each one a distribution channel that, once wired, is hard to rip out. We go integration-first. We do not wait for demand.

**We are moving at hackathon speed with product thinking.** Day 1 of KyvernLabs shipped with a policy engine that has 29 unit tests, a dashboard that looks like Linear, and an SDK that reads like Stripe. Most projects at this stage have one of those three. We have all three.

---

## What the billion-dollar version looks like

It is not a wallet dashboard. It is a four-layer stack that maps to how real finance teams operate, translated into agent-native primitives.

**Layer 1 — The wallet.** Budgets, limits, merchant rules, kill switch. Today. This is the wedge. It is not the product.

**Layer 2 — The brain.** Real-time anomaly detection. "Agent X is spending 3× its baseline this hour — pause?" Invoice parsing on outgoing payments. Reconciliation between what the agent says it did and what actually hit the chain. This is where we stop being a wrapper and start being a CFO.

**Layer 3 — The reporting.** Agent-level P&L. Cohort analysis across agent types. Budget reallocation recommendations. Forecasting. The weekly email that says "you spent $47,000 across 312 agents, here is where you are leaking money." A CFO reads this. A founder reads this. An ops lead reads this.

**Layer 4 — The compliance plane.** SOC2. Role-based access. Approval workflows. Audit logs that hold up in court. This is where enterprise deals become six- and seven-figure ARR. This is where a $500/mo dev tool becomes a $500,000/yr contract.

We walk this ladder in order. We do not skip rungs. Each one increases the take per agent by 10×.

---

## The comp that matters

We are not the next Stripe. Stripe is a $90B company with a two-sided network effect we cannot replicate. Stop using that comp.

We are the next **Rippling**. $13B. Started with a narrow wedge (payroll). Grew into infrastructure (HR, IT, finance). Used that infrastructure to climb into adjacent workflows. Won because every entry point made the next one cheaper to sell.

Kyvern's equivalent playbook:

- **Wedge:** spending limits for agents (today)
- **Infrastructure:** the SDK that every agent framework uses
- **Expansion:** reconciliation, anomaly detection, reporting
- **Enterprise:** compliance plane for Fortune 500 agent deployments

Every layer makes the next layer's sales motion easier. Every integration we win in layer two gives us distribution for layers three and four. That is the compound curve.

Rippling had $1B revenue in seven years. We are not asking permission to be the same.

---

## What we refuse to be

**We are not an analytics tool.** Pulse was a lesson. Analytics is downstream of infrastructure. We are infrastructure.

**We are not a chain.** We are chain-agnostic by design. Solana today because Squads is there and it is the fastest place to ship. Base in six months. Stellar in twelve. Ethereum mainnet when an enterprise contract pays for it. The agent does not care what chain it is on. Neither do we.

**We are not a wallet UX company.** Privy and Dynamic are good at key management. We are good at what happens after the key exists. When a user asks "how do I log in," we send them to Privy. When they ask "how do I let my agent spend," we are the answer.

**We are not a crypto company dressed up for AI.** We are an AI infrastructure company that happens to use crypto rails because crypto rails are the only programmable money that exists today. If Stripe ships an agent-native API tomorrow, we wrap it and ship support in a week. The primitive is policy, not chain.

---

## The concerns we take seriously

This is not cheerleading. These are the things that can kill the company.

**Squads can ship this themselves.** They see what we see. If Squads launches "Squads for Agents," we are the middle layer that got squeezed. Mitigation: go multi-chain fast so we are not Squads-dependent, and own the developer SDK so switching cost protects us even if the underlying primitive commoditizes.

**The incumbents move.** Circle, Coinbase, Stripe are not stupid. The moment agentic payments hit real volume, one of them ships a competing product. We have a ~12-month window before serious incumbents arrive. Mitigation: become the de-facto default in the open-source agent framework ecosystem before they wake up. Developers pick defaults; enterprises inherit them.

**"Agent CFO" is an aspirational name.** Today the product is a spending-limit wrapper. Calling it a CFO is a promise we have to earn. Mitigation: ship layer two (the brain) within two quarters or downgrade the name.

**Agent infrastructure might take longer than we think.** Crypto timelines are optimistic by default. If agent-native commerce is still niche in 2028, we are early-and-right, which is the same as wrong for a startup. Mitigation: have a revenue plan that does not require 2028 volume — enterprise contracts in 2026-27 with early adopters, not retail dev tools.

**We do not have a network effect.** Stripe has one (more merchants pull more customers). We do not. Our moat is integration depth, not network density. That is a weaker moat. We have to make it work with speed, quality, and distribution.

---

## The eighteen-month plan

**Months 0-3 (now → summer 2026).** Win the hackathon. Launch `@kyvernlabs/sdk`. Ship adapters for one major agent framework. Get 10 external developers using it in production. Raise a pre-seed or seed on this momentum.

**Months 3-6.** Solana → Base. Second framework adapter. First ten paying pilots. Layer-two brain (anomaly detection, reconciliation) in beta. Hire one engineer, one DevRel.

**Months 6-12.** Multi-chain live. Five framework adapters. First enterprise pilot (target: one of the AI labs, a Fortune 1000 IT team deploying agents, or a mid-market ops automation company). Full CFO dashboard shipped. $500K-$1M ARR run rate.

**Months 12-18.** Compliance plane shipped. First enterprise contract >$100K. Series A. $3-5M ARR. Hiring to 10-15 people. Narrative locked in the industry: "when you deploy an agent that spends money, you use Kyvern."

If we hit this, Series B at $50M+ ARR becomes realistic within 30 months of founding. That is the billion-dollar trajectory.

---

## What I will not do

- I will not pivot again. This is the thesis. If it is wrong, the answer is to sharpen execution, not chase a new narrative. Reading this doc is a commitment not to drift.
- I will not over-engineer. Every feature has to earn its place by pulling in either a user or a dollar. No "just because it's cool."
- I will not build what an incumbent can easily bolt on. If Circle can add this in two weeks, it's not a company — it's a feature. Every new thing I build has to pass this test.
- I will not apologize for being aggressive on language. "Agent CFO" is what we are becoming. Calling ourselves a "spending limit tool" loses the mandate to build the full stack. We name the ambition.

---

## How to use this doc

Read it when:
- I'm about to add a feature that doesn't fit Layer 1 → 4. If it doesn't, kill it.
- An investor asks why we win. The answer is in here — pick one paragraph.
- A cofounder or hire asks what we're really doing. Send them this doc. If they don't get excited, they're not right for the company.
- I'm tired and thinking about quitting. Read the bet section. The gap is real. The timing is right. Keep going.

---

## The one-sentence version

Every AI agent in five years will spend money through a policy layer. That policy layer is Kyvern — or it is an incumbent that moved faster than us. The job is to make sure it's us.

---

*Last revised: April 2026.*
*Next review: before the next major feature ship.*
*Author: Shariq Azeem, founder.*
