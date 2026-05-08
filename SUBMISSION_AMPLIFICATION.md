# Submission Amplification — Tweets + Forms

Reference doc for the Frontier submission day. Copy-paste-ready.
Per project convention, all live URLs use `kyvernlabs.com` (not the
`app.` subdomain — the apex serves the same Next.js app).

---

## 1 · Pinned thread (post on submission day with the 90s vertical attached)

**1/**
> Most AI agent products give your agent a credit card.
>
> We built the alternative.
>
> Kyvern: a Solana device for your AI agent. The chain decides every dollar.
>
> Submitting to @colosseum Frontier hackathon today.
>
> [ATTACH: 90s vertical demo video]
>
> → kyvernlabs.com

**2/**
> The pitch is simple.
>
> Agents shouldn't have keys.
> They should have budgets.
>
> The chain decides what spends.
> The user keeps the kill switch.
> Every refusal verifiable on Explorer.

**3/**
> Our reference agent — Atlas — has been autonomous on @solana devnet for 17 days.
>
> 8,355 cycles
> 3,171 blocked attacks
> $0 lost
> $22.90 earned from real x402 subscribers
>
> You can watch the receipts: kyvernlabs.com/atlas

**4/**
> The mechanics:
>
> Squads multisig wraps the vault.
> Anchor program enforces the rules:
> · daily cap
> · merchant allowlist
> · kill switch
> · Pyth oracle bounds
> · slippage protection
>
> Every worker spend goes through vault.pay(). The chain decides.

**5/**
> Three pre-installed worker templates ship with every device:
>
> 🎯 Sentinel — drafts paid bounty applications
> 🐋 Wren — watches wallets, alerts on material moves
> 📈 Pulse — fires chain-enforced swaps on price triggers
>
> But the workers are templates.
> The device is the product.

**6/**
> Pulse fires a real on-chain swap when your trigger crosses:
>
> User sets: SOL below $88.12, spend $0.10
> @pyth_network prices the swap
> Anchor program validates + executes
> Squads cosigns
> USDC out, SOL in
>
> 3 transactions, ~4 seconds, every dollar enforced.

**7/**
> The Pay.sh × @solana × Google Cloud launch is alive in our product, not aspirational.
>
> Every worker cycle calls Pay.sh as the commerce rail and Gemini as the reasoning layer.
>
> Sentinel's drafting. Wren's scoring. Pulse's validation. All paid AI inference, all chain-enforced.

**8/**
> The SDK is shipping with submission.
>
> Workers are TypeScript modules. Anyone can write one.
>
> The vault enforces the rules.
> The worker writes the work.
>
> This is what we mean when we say "the device is the product."
>
> → kyvernlabs.com/docs

**9/**
> Roadmap:
>
> Now — Devnet · 3 templates · SDK · Atlas
> Next — Mainnet · Jupiter routing · Worker marketplace · Squads-native onboarding
> Far — Cross-chain Pay.sh · Hardware companion · KYV governance · Worker-to-worker negotiation
>
> The agent economy isn't built on smarter models. It's built on better constraints.

**10/**
> Try it now — no signup, runs in your browser, real on-chain devnet:
>
> → kyvernlabs.com/try
>
> Watch Atlas live:
> → kyvernlabs.com/atlas
>
> If you're judging Frontier — we'd love your eyes.
>
> @colosseum @solana @paysh_xyz @SquadsProtocol @pyth_network
>
> cc @shariqshkt

---

## 2 · Drip tweets (queue every 4–6h post-submission)

### T+4h · The Atlas attack wall flex
> 17 days running.
> 3,171 attempts to drain Atlas.
> 3,171 refused on-chain.
>
> Every red row below is a verifiable failed Solana transaction. Click any one.
>
> This is what "chain-enforced" actually looks like.
>
> [ATTACH: screenshot of attack wall]
>
> → kyvernlabs.com/atlas

### T+12h · The Pulse fire moment
> Watch the chain decide a dollar.
>
> User: "buy SOL when it drops below $88"
> Pulse: "SOL is at $88.06 — that's a breach"
> Pyth: "confirmed, here's the price"
> Anchor program: "spend approved"
> Squads: cosigned
> SOL: arrived
>
> 4 seconds. Every dollar enforced.
>
> [ATTACH: 15s clip of Pulse firing]

### T+20h · The thesis tweet
> The agent economy isn't a model problem.
> It's a constraint problem.
>
> Smart agents with weak constraints will lose your money.
> Dumb agents with strong constraints can be trusted with it.
>
> Kyvern is the constraint primitive.
>
> Read the pitch: github.com/shariqazeem/kyvern-atlas

### T+28h · The SDK invitation
> Workers are TypeScript modules.
>
> ```ts
> defineWorker({
>   id: 'my_worker',
>   abilities: ['read_url', 'vault_pay'],
>   cycle: async ({ vault, tools }) => {
>     // your worker
>     // chain enforces every spend
>   },
> });
> ```
>
> If you build agents on Solana, ship a Kyvern worker.
> DM us — we're shipping templates with you.
>
> → kyvernlabs.com/docs

### T+36h · The "for Solana, by Solana" close
> We built Kyvern in Lahore.
> On Solana devnet.
> For Frontier.
> Because we believe the agent economy lives or dies on whether the chain can keep its agents honest.
>
> It can.
>
> Kyvern proves it.
>
> @colosseum @solana
>
> → kyvernlabs.com

---

## 3 · Engagement strategy

- **Quote-tweet** any @colosseum or @solana announcement about Frontier with a Kyvern submission line
- **Reply** to @shariqshkt's quote-tweets from `@kyvernlabs` with technical depth
- **Tag thoughtfully** — @paysh_xyz, @SquadsProtocol, @pyth_network, @colosseum, @solana — never spam
- **Respond fast** to any judge or builder who replies — within 30 minutes during waking hours
- **Pin the thread** for the entire judging period (don't unpin for at least 7 days)

## 4 · DON'T tweets
- Don't beg for upvotes/RTs
- Don't tweet the same claim twice with different wording
- Don't reply with emoji-only or "thanks!" — every reply should add information
- Don't tag Anatoly, Toly, or other Solana leadership unsolicited

---

## 5 · Frontier form (canonical content)

| Field | Value |
|---|---|
| Project name | Kyvern |
| One-liner | A Solana device for your AI agent. The chain decides every dollar it spends. |
| Long description | (paste from README — "What we built" + "The proof: Atlas" + "How chain enforcement works") |
| Demo video URL | [YouTube unlisted link] |
| Live URL | https://kyvernlabs.com |
| Try URL | https://kyvernlabs.com/try |
| GitHub | https://github.com/shariqazeem/kyvern-atlas |
| Anchor program | PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc (devnet) |
| Team | Shariq Shaikh · Kyvern Labs · Lahore, Pakistan |
| Track | AI Agents / Infrastructure |

Screenshot the form before submit.

---

## 6 · KAST submission

Same content, mapped to KAST's fields. KAST is shorter — the long
description gets compressed to the README's "What we built" + "Atlas"
sections.

---

## 7 · Final pre-submit checklist

- [ ] /try works in incognito, no console errors
- [ ] /atlas Economic Ledger reads real numbers
- [ ] /app demo vault funded ≥ $25 USDC, demo trigger armed at threshold + $0.50 from spot
- [ ] All 5 PM2 processes running (kyvern-commerce, atlas, atlas-attacker, agent-pool, atlas-subscriber)
- [ ] Anchor program upgrade authority verified
- [ ] 90s vertical video uploaded, link tested from second device
- [ ] 2:30 horizontal video uploaded
- [ ] README pushed to GitHub main branch
- [ ] Pinned tweet thread drafted in X scheduler
- [ ] Frontier form filled
- [ ] KAST form filled
- [ ] Personal X account ready to amplify

---

## 8 · Submit timing

Aim for **T-6h before the May 9 deadline**. If your local time deadline
is 23:59 May 9, target submission by 17:59 May 9. Things go wrong at
the last minute. The thread can publish immediately on submission.
