# Frontier submission — paste-ready fields

No em-dashes, no AI-tell words. Hand-tightened prose. Refresh the
Atlas numbers from `/api/atlas/status` 30 minutes before you click
Submit. The placeholders are marked.

---

## Project name (PUBLIC)

```
Kyvern
```

One word. No tagline, no colon, no dash. Strong submissions name themselves cleanly.

---

## Brief description (PUBLIC, 500 char limit)

```
Kyvern is the authorization layer for autonomous AI agents on Solana. Every agent gets a Squads v4 vault wrapped in a custom Anchor program that enforces budgets, allowlists, and a kill switch on chain, before any USDC moves. Agents shouldn't hold keys. They should have budgets. Our reference agent Atlas has been autonomous on devnet for [DAYS] days, paid [PAID] merchants on chain, refused [BLOCKED] attacks, and lost zero dollars. Every refusal is a real failed tx verifiable on Solana Explorer.
```

Length with current placeholders (`20` / `1591` / `3750`): 487 chars. Stays under 500 with any reasonable refresh.

---

## Project website (PUBLIC)

```
https://kyvernlabs.com
```

Just the root. Not `/app`, not `/atlas`. The landing handles framing; judges navigate from there.

---

## What are you building, and who is it for? (1000 char limit)

```
Kyvern is the authorization layer for autonomous AI commerce on Solana. Every agent gets a Squads v4 multisig vault wrapped in a custom Anchor program (PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc) that enforces budgets, allowlists, velocity caps, memo requirements, and a kill switch on chain, before any USDC moves. Refusals are real failed Solana transactions with 12 custom error codes, verifiable on Explorer.

For developers: a four-line SDK (@kyvernlabs/sdk) that wraps any agent. We proved this by porting the market oracle from my prior x402 project ParallaxPay. It now runs under Kyvern with on-chain authorization on every API call.

For end users: a 60-second flow to provision a chain-enforced vault for their AI agent. No private key custody required. Privy handles auth, the agent key is delegated.

For the agent commerce category: the missing piece that makes it safe to put agents on rails like x402 and Pay.sh.
```

Length: 982 chars. Three audience segments, each with one concrete proof point. No em-dashes.

---

## Why did you decide to build this, and why build it now? (1000 char limit)

```
By 2027 there will be more AI agents on the internet than humans. They are going to spend trillions of dollars autonomously. Today, every one of them holds a private key. One prompt injection drains the wallet. One jailbroken agent pays a scammer. The agent commerce thesis only survives if we solve this, and nobody has.

I have shipped three x402 agent projects on Solana over the past year. ParallaxPay (an x402 agent marketplace), Umanity (chain-enforced donations), and TrendSurfer (an autonomous on-chain trader). I watched the agent layer from inside. The same gap kept showing up. Agents need budgets, not keys. Squads gives us multisigs but they trust the agent. Pay.sh gives us a payment rail but it does not gate the agent. Nobody had built the authorization layer that sits between an autonomous agent and the chain.

Now is the moment because the rails are live. x402 shipped. Squads v4 shipped. Anchor lets us put policy in consensus. Kyvern is that primitive.
```

Length: 987 chars. Reconciled with the repo: ParallaxPay, Umanity, TrendSurfer. If a third project name is different, swap inline. If only two are public-facing, drop the third and replace the sentence with: *"I have shipped multiple x402 agent projects on Solana over the past year, including ParallaxPay and Umanity."*

---

## Technologies (one line)

```
Solana (Anchor 0.31.1 custom policy program, 4 instructions, 12 custom error codes), Squads v4 multisig CPI, @solana/web3.js, @coral-xyz/anchor, Next.js 14, TypeScript, Tailwind, framer-motion, SQLite WAL, Privy (auth and embedded Solana wallets), pm2, @kyvernlabs/sdk on npm, create-kyvern-agent scaffolder on npm, Commonstack (DeepSeek v4-flash with v3.2 fallback) for Atlas autonomous decisions and the ParallaxPay oracle inference, Pay.sh CLI for live x402 round-trips, and Claude Opus 4.7 as the primary engineering pair.
```

One paragraph, dense, declares Claude transparently at the end (Colosseum does not penalize AI-assisted submissions, only hidden ones).

---

## Category (PUBLIC)

```
AI Platforms / Agents
```

Direct verbatim match from the Frontier dropdown. Kyvern is the authorization layer for AI agents. Wallet Infrastructure and Security Tools are defensible alternates but describe the mechanism, not the category Kyvern serves.

---

## Is your project a mobile-focused dApp?

```
No
```

Desktop-first developer infrastructure. The `/app` canvas has a mobile vertical stack but the product targets developers writing agents in TypeScript on a laptop.

---

## Numbers refresh — run before you submit

```bash
curl -sS https://app.kyvernlabs.com/api/atlas/status \
  | jq '{days: (.uptimeMs/86400000|round), paid: .totalSettled, blocked: .totalAttacksBlocked, lost: .fundsLostUsd}'
```

Pin those three numbers. Use the **same values** in the brief description here, in the demo video voiceover (Beat 2 of `DEMO_SCRIPT.md`), and in the pitch (Beat 4 of `PITCH_SCRIPT.md`). A judge who watches both videos and reads the form catches any mismatch.

Last known snapshot at the time of writing: `days: 20, paid: 1591, blocked: 3750, lost: 0`. Numbers only grow.

---

## Submission order

1. Refresh Atlas numbers via the curl above. Paste into the `[DAYS] / [PAID] / [BLOCKED]` placeholders in the Brief description.
2. Have the YouTube unlisted demo + pitch links ready before you start filling. The form sometimes times out on a later step. Upload first.
3. Set the YouTube title to `Kyvern — Demo (Colosseum Frontier 2026)` and the description to your Brief description text. Judges sometimes share unlisted links with each other and tagged metadata reads finalist-tier.
4. Read every field aloud one time before clicking Submit. Your ear catches what your eye misses at hour 44.
5. Submit. Close the laptop. Do not reopen until after the result is announced.
