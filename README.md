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
- **Atlas reference agent** running continuously since 2026-04-20 (19+ days, 8.8k+ cycles, 1.3k+ settlements, 6.5k+ attacks blocked, **$0 lost**)

## The 60-second judge demo

Sign in at [kyvernlabs.com](https://kyvernlabs.com) → unbox plays
(2.5s) → land on `/app`, the live integration console.

Inside the device chassis you get **a 5-step integration wizard on
the left and a live event feed on the right**:

1. **Mint your key** — copy `kv_live_…` once
2. **Install** — `npx create-kyvern-agent my-agent` + `npm install @kyvernlabs/sdk`
3. **Make your first call** — paste-and-run snippet with your key inlined
4. **Try a violation** — three buttons (over-cap / off-allowlist / missing memo) fire real Solana txs against your own vault. The Kyvern Anchor program at `PpmZ…MSqc` rejects each with a custom error code (12002 / 12003 / 12004). Real failed-tx Explorer links land in your event feed in under 3 seconds.
5. **Send earnings to KAST** — paste your KAST USDC deposit address; allowlist as `MY_KAST`; agent payouts route there as real on-chain transfers.

Above the wizard: live agent status pill (`Your agent · kv_live_… · last action 12s ago`) with a pulsing dot when an event lands. Below the wizard: today stats (`$X spent · N calls · M blocked`) live-polled from your vault.

The four affordance tabs above the chassis (Watch the chain · Wrap pay.sh · Send to KAST · Wrap your agent) open instrument-drawer panels with deeper interactions, including the `pay --sandbox curl` shell-out that proves Kyvern wraps real x402-paywalled APIs.

Each "blocked" outcome is a finalized failed Solana transaction. The Kyvern policy program is in every instruction trace.

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

- **Solana Frontier:** [`decks/frontier.md`](decks/frontier.md) (render to PDF)
- **Kast Pakistan via Superteam Earn:** [`decks/kast-pakistan.md`](decks/kast-pakistan.md) (render to PDF)
- **Spec:** [`SPEC_TO_WIN.md`](SPEC_TO_WIN.md) — the 48-hour execution plan we shipped against
- **Honest audit:** [`KYVERN_RAW_REALITY.md`](KYVERN_RAW_REALITY.md) — pre-execution writeup of real-vs-theatre across every surface

## Built by

[Shariq Azeem](https://x.com/shariqshkt) · solo Pakistani builder · 5
prior hackathon wins · Made in Pakistan 🇵🇰 for Solana Frontier 2026.

## License

MIT
