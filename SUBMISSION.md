# Kyvern · Frontier submission package

Single source of truth for all submission copy: hero, narrative, tweet thread, Frontier form fields, demo cue cards. Lift any of this verbatim — the language has been tuned to match what we're shipping.

---

## Tagline

> *"A Solana device for your AI agent. The chain decides every dollar it spends."*

## Category-defining noun

*Chain-enforced conditional commerce.*

## The pitch (10 seconds)

We built the first chain-enforced agent commerce device on Solana. Workers do real jobs. Real chain rules enforce every spend. Pay.sh × Google Cloud is alive in every cycle.

## The pitch (30 seconds)

Three pre-installed workers — Bounty Scout, Position Watchtower, Conditional Trigger — do real jobs for you. They draft bounty applications, watch wallets, and fire chain-enforced swaps when your price conditions hit. Every dollar is decided by an on-chain Anchor program with budget caps, merchant allowlist, daily limits, and kill switch — all enforced inside Squads multisigs. Atlas, our reference agent, has been autonomous for 17+ days, settled 1,100+ txs, blocked 6,500+ adversarial attacks, $0 lost.

## The differentiation

Most teams built smarter agents. We built the device the agents live inside.

The chain isn't our backend. The chain is our referee.

---

## 90-second demo script (vertical · for X / Frontier)

```
0:00  ZOOM IN on Kyvern landing page — read headline aloud
       "A Solana device for your AI agent. The chain decides every dollar."
0:05  Click "Try a Kyvern" → /unbox cinematic plays (5s)
0:10  Land on /app → empty state strip visible
       "Your device is online. The vault is empty. + Top up vault"
0:13  Tap top up → drawer opens → click "Fund $5 USDC (devnet)" → confirms
0:20  Vault halo intensifies, workers light up, state strip changes:
       "Workers are running on starter settings. Make them yours."
0:25  Tap Pulse → see Conditional Trigger config
       "I'll fire chain-enforced swaps when your conditions hit."
0:30  Leave default trigger armed, return to /app
0:33  Within 5 seconds, Pulse fires (we set it to fire fast)
       Wire pulses, ticker row slides in:
       "Pulse · Pay.sh validated SOL breach · USDC → SOL via oracle · settled"
       Toast: "Pulse fired your first trigger — you have new SOL. → Findings"
0:42  Tap Findings tab → see fresh trigger_fired entry
       Tap the trigger → see swap details + tx signature
       Tap signature → opens Solana Explorer in new tab — REAL TX VISIBLE
0:55  Back to Findings → tap top entry: Sentinel drafted application
       Show the draft, tap "Submit application"
       Show success: "Submitted · receipt anchored" (memo tx + email)
1:10  Back to /app → tap "Use the device" → demo Buy ($1)
1:15  Tap "Drain attempt $50" → Anchor blocks — show error toast:
       "Daily cap exceeded · chain refused"
1:25  Cut to /atlas page — show 17-day uptime, real customer payments, live ticker
1:30  END card: "Kyvern. The chain decides every dollar."
       (URL: kyvernlabs.com)
```

## 2:30 horizontal demo (for accelerator)

Slower walk-through of the same flow with more architectural context. Includes:
- Anchor program tour (zoom on Solana Explorer showing program account + recent txs)
- SDK + docs flash
- Atlas observatory deep-dive
- Roadmap: "Mainnet Jupiter integration · Multi-vault devices · Open worker SDK"

---

## Tweet thread (pinned)

```
🧵 We're submitting Kyvern to @colosseum's Frontier hackathon.

A Solana device for your AI agent.
The chain decides every dollar it spends.

Try it without signup: app.kyvernlabs.com/try
[demo video attached]

1/

---

The pitch is simple:

Most agent products give your AI a credit card.
Kyvern gives it a vault with rules.

Budget caps. Merchant allowlist. Daily limits. Kill switch.
All enforced on-chain inside Squads multisigs.

Every dollar decided by the chain.

2/

---

Three workers, one device:

🎯 Bounty Scout · finds + drafts paid Solana bounty applications
🐋 Position Watchtower · monitors wallets, alerts on material moves
📈 Conditional Trigger · fires chain-enforced swaps via Pyth oracle

All powered by @paysh × Google Cloud Gemini reasoning.

3/

---

Our reference agent, Atlas, has been autonomous for 17+ days.

1,100+ settled txs.
6,500+ blocked attacks.
$0 lost.

The receipts are public. atlas runs at app.kyvernlabs.com/atlas

This is the moat: every claim verified on Solana Explorer.

4/

---

What we're betting on:

The agent economy isn't built on smarter models.
It's built on better constraints.

The chain isn't our backend.
The chain is our referee.

5/5
```

---

## Frontier form fields (cheat sheet)

| Field | Value |
|---|---|
| Project name | Kyvern |
| Tagline | A Solana device for your AI agent. The chain decides every dollar it spends. |
| Demo URL | https://app.kyvernlabs.com |
| Try-without-signup URL | https://app.kyvernlabs.com/try |
| Atlas observatory | https://app.kyvernlabs.com/atlas |
| GitHub | https://github.com/shariqazeem/kyvern-atlas |
| Anchor program | `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` (devnet) |
| Stack | Next.js 14 · Anchor (Rust) · Squads v4 · Pyth oracle · Pay.sh × Gemini · Privy |
| Track | Pakistan Frontier · Open Track |
| Team | Shariq Azeem (solo) — [@shariqshkt](https://x.com/shariqshkt) |
| Demo video (90s) | TBD — record before submit |
| Demo video (2:30) | TBD — record before submit |

---

## Pre-demo checklist (verify ≤6h before submit)

- [ ] Demo device has ≥$25 USDC pre-funded
- [ ] Pulse trigger armed at SOL `< current price + $2` so it fires within 30s
- [ ] Sentinel has at least one fresh `drafted_application` finding ready to submit
- [ ] Wren has at least one fresh `wallet_alert` to mirror
- [ ] Atlas's last-real-customer payment is within 1h
- [ ] All four PM2 processes online: kyvern-commerce, atlas, atlas-attacker, agent-pool
- [ ] `/`, `/app`, `/atlas`, `/try`, `/roadmap`, `/app/inbox`, `/app/settings` all 200
- [ ] Demo wallet keys saved + tested
- [ ] Recording app open + tested

---

## Risk register + fallbacks

| Risk | Mitigation | Fallback |
|---|---|---|
| Pyth devnet feed stale or down | `max_staleness_seconds` configurable | Hardcoded reference price + `oracle_fallback_used = true` flag in event |
| Squads cosign rejects new instruction | Verified in Phase 0 spike | Drop multisig wrapping for swap leg, document as "Phase 2 hardening" |
| Treasury PDA underfunded mid-demo | Pre-fund 50 SOL + 10M kBONK + 10K kJUP | Admin rebalance instruction ready, refill in 30s |
| Demo trigger doesn't fire when expected | Threshold set artificially close + manual nudge available | Pre-recorded backup video segment |
| Atlas subscriber Worker fails | Verified running 6h+ pre-submission | Manual hourly cron from a laptop as backup |
| Email send (Resend) doesn't arrive | Use a Kyvern-controlled relay address shown live in demo | On-chain memo alone is sufficient receipt |
| Submission form goes down | File earlier than deadline | KAST as alternate channel |
