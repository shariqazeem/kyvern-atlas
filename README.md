# Kyvern

**Financial safety infrastructure for autonomous agents.**

> AI agents shouldn't have private keys. They should have budgets.

Kyvern enforces agent spending policies on-chain using Solana smart
accounts. Caps, allowlists, kill switch — all decided by the chain
before a single lamport moves.

`Solana · Squads · pay.sh · KAST · npm`

**Live:** [kyvernlabs.com](https://kyvernlabs.com) ·
**App (live integration console):** [kyvernlabs.com/app](https://kyvernlabs.com/app) ·
**Docs:** [kyvernlabs.com/docs](https://kyvernlabs.com/docs) ·
**Evidence:** [kyvernlabs.com/atlas](https://kyvernlabs.com/atlas)

---

## What's live

- **Anchor program** at [`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`](https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet) on Solana devnet
- **`@kyvernlabs/sdk@0.5.0`** on npm — `Vault.pay()`, `Vault.checkAllowance()`, `KastDestination`, `OnChainVault`
- **`create-kyvern-agent@0.2.0`** on npm — scaffolds a working pay.sh + KAST agent in one command
- **Atlas reference agent** running continuously since 2026-04-20 (20+ days, 9.8k+ cycles, 1.5k+ settlements, 3.7k+ attacks blocked, **$0 lost**)
- **Bring your own agent** — the [ParallaxPay](https://github.com/shariqazeem/parallaxpay_x402) market oracle (built in a prior hackathon, *before* Kyvern existed) is wired into `/app` via the four-line wrapped-fetch pattern. Click *Run prediction agent* to fire it: CoinGecko + Commonstack DeepSeek calls, both gated on-chain.

## The 90-second judge demo

Sign in at [kyvernlabs.com](https://kyvernlabs.com) → land on `/app`,
the live canvas. Three things to click, in order:

1. **Hero band** — your worker card (identity, 4-stat bar, lede) sits left; vault balance with daily-cap utilization sits right.
2. **"Try over-cap $5"** in the right column → real Solana tx → refused on-chain by the policy program with custom error code 12002 → Explorer link in the result panel.
3. **"Run prediction agent"** in the center column (Bring your own agent card) → the ParallaxPay market oracle (third-party, prior hackathon) runs through Kyvern in real time: 2 metering payments settle on-chain, then the prediction text + confidence render. Click Explorer on either payment row → real tx, real signature, real `spendingLimitUse` instruction.

Above all of this: live Atlas tape (real on-chain decisions, drifting
left). Below: the 5-step integration wizard (mint key → install SDK →
first call → trigger refusal → wire KAST payout).

Each refusal is a finalized failed Solana transaction. The Kyvern
policy program is in every instruction trace.

## Architecture

```
              ┌─────────────────────────────────────┐
              │    Your AI agent                    │
              └──────────────┬──────────────────────┘
                             │ vault.checkAllowance()
                             ▼
              ┌─────────────────────────────────────┐
              │  KYVERN — policy layer (this)       │
              │  Caps, allowlists, kill switch      │
              │  PpmZErWfT5zpeo1fJtTbpqezFGbRUama…  │
              └──────────────┬──────────────────────┘
                             │ allowed
                             ▼
      ┌──────────────────┬───────────┬──────────────────┐
      │   pay.sh         │  Squads   │   KAST           │
      │   HTTP rails     │  custody  │   off-ramp       │
      │   x402 / MPP     │  v4       │   Solana USDC →  │
      │                  │           │   real card      │
      └──────────────────┴───────────┴──────────────────┘
```

- Agent calls `vault.checkAllowance()` — Kyvern decides BEFORE any rail fires
- If allowed: agent invokes pay.sh (or any HTTP-402 service)
- Kyvern's `vault.pay()` settles the budgeted spend on-chain via the policy program → Squads CPI → SPL Token transfer
- Earnings can route to a KAST-funded card via `KastDestination` (real on-chain USDC transfer to the user's KAST deposit address)

## Quickstart

```bash
# Install pay.sh CLI (one of)
brew install pay                 # macOS
npm install -g @solana/pay       # Linux/Windows

# Scaffold a working agent
npx create-kyvern-agent my-agent
cd my-agent
cp .env.example .env             # paste KYVERN_AGENT_KEY (mint at /app)
npm install
npm run agent
```

Five-line wrap pattern:

```ts
import { Vault, KastDestination } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: process.env.KYVERN_AGENT_KEY! });
const myKast = KastDestination.fromAddress(process.env.MY_KAST_ADDRESS!);
const res = await vault.pay({ ...myKast, amount: 1.50, memo: "weekly yield share" });
if (res.decision !== "allowed") throw new Error(res.reason);
```

Full docs at [kyvernlabs.com/docs](https://kyvernlabs.com/docs).

## Local development

```bash
git clone https://github.com/shariqazeem/kyvern-atlas
cd kyvern-atlas
npm install --legacy-peer-deps
cp .env.example .env             # see CLAUDE.md for the required env vars
npm run build
npm start                        # serves on :3001
```

The Anchor program source is in `anchor/programs/kyvern-policy/`. To
re-deploy or initialize the program for a new vault, see the script at
`scripts/init-atlas-policy.ts` (one-shot, idempotent).

## What this is, and what this isn't

**This is** financial safety infrastructure for autonomous agents on
Solana — a smart safe, an on-chain policy program enforcing 5 rule
classes + a kill switch, an SDK, and a scaffolder.

**This isn't:**
- A hardware device. The 3D iconography is metaphor.
- A KAST partner or pay.sh partner. We're *compatible with* their
  rails — the integrations speak via the working flow + the affiliate
  link.
- Mainnet-deployed. Devnet today, audit in progress.
- A fully autonomous trading bot. Atlas's decisions are scripted by
  design. The moat is the financial control layer, not the
  intelligence — even a deliberately minimal agent demonstrates the
  thesis. LLM-driven Atlas is post-Frontier.

## Submissions

- **Solana Frontier:** [`decks/frontier.md`](decks/frontier.md) (render to PDF) · [`decks/frontier.pdf`](decks/frontier.pdf)
- **Kast Pakistan via Superteam Earn:** [`decks/kast-pakistan.md`](decks/kast-pakistan.md) (render to PDF) · [`decks/kast-pakistan.pdf`](decks/kast-pakistan.pdf)
- **Recording strategy + checklist:** [`DEMO_STRATEGY.md`](DEMO_STRATEGY.md) — why each beat exists, T-30 pre-record checklist, Don't list
- **Demo video script:** [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) — 3:00 read-aloud format with [SCREEN], [DO], [SAY], [HOLD] stage directions
- **Pitch video script:** [`PITCH_SCRIPT.md`](PITCH_SCRIPT.md) — 2:00 founder-to-camera script

## Built by

[Shariq Shaukat](https://x.com/shariqshkt) · solo Pakistani builder · 3 prior x402 agent projects shipped on Solana · Made in Pakistan for Solana Frontier 2026.

## License

MIT
