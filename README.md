# Kyvern

A Solana device for your AI agent.
The chain decides every dollar it spends.

> Agents shouldn't have keys. They should have budgets.

**Live:** [kyvernlabs.com](https://kyvernlabs.com) ·
**Try without signup:** [/try](https://kyvernlabs.com/try) ·
**Atlas observatory:** [/atlas](https://kyvernlabs.com/atlas) ·
**Docs:** [/docs](https://kyvernlabs.com/docs)

**Anchor program:** `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` ·
Solana devnet · 4 instructions · 12 error codes ·
[Verify on Explorer ↗](https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet)

---

## What we built

Kyvern is the first chain-enforced commerce device for AI agents on Solana.

Most AI agent products give your agent a credit card and hope. Kyvern gives it
a vault with rules — budget caps, merchant allowlist, daily limits, kill
switch — all enforced inside a Solana Anchor program, all wrapped in Squads
multisig boundaries, all visible on Explorer.

The chain isn't our backend. The chain is our referee.

## The proof: Atlas

Atlas is our reference deployment. It's been running autonomously on Solana
devnet for 17+ days as of submission:

- **8,355 cycles** completed
- **3,171 attack attempts** refused on-chain (drains, prompt injections, over-cap requests, rogue merchants)
- **$0** funds lost
- **$22.90+ USDC** earned from real subscribers paying its x402 feed

Every transaction is on Solana Explorer. Every refusal is verifiable. Atlas
isn't a demo. It's a 17-day track record.

## The starter workers

Three pre-installed worker templates ship with every device:

| Worker | Role | What it does |
|---|---|---|
| 🎯 Sentinel | Bounty Scout | Finds paid Solana bounties matching your skills, drafts applications via Pay.sh / Gemini, queues for one-tap submit |
| 🐋 Wren | Position Watchtower | Watches user-defined wallets, alerts on material moves, can mirror trades into Pulse |
| 📈 Pulse | Conditional Trigger | Fires chain-enforced swaps when price conditions hit — Pyth oracle prices, Anchor program enforces |

These are templates, not the product. The product is the device underneath
and the SDK above it. Builders ship workers that fit their own life.

## Architecture

```
                    ┌──────────────────────────────────┐
                    │         User's Squads Vault       │
                    │      (USDC + native SOL)          │
                    └──────────────────────────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────────┐
                    │     Anchor Budget Program         │
                    │  (caps · allowlist · oracle ·     │
                    │   daily limits · kill switch)     │
                    └──────────────────────────────────┘
                          │             │            │
                  ┌───────▼──┐   ┌─────▼────┐  ┌────▼────┐
                  │ Sentinel │   │   Wren   │  │  Pulse  │
                  │ (or your │   │ (or your │  │ (or your│
                  │  worker) │   │  worker) │  │ worker) │
                  └──────────┘   └──────────┘  └─────────┘
                       │              │              │
                       ▼              ▼              ▼
                  Pay.sh / Gemini reasoning ── Pyth oracle ──
                  Solana DEX rails (Jupiter on mainnet)
```

## How chain enforcement works

Every spend the agent attempts goes through `vault.pay()`. The Anchor program
checks, in order:

1. **Kill switch** — owner can freeze the vault from any Squads member
2. **Daily cap** — total spend across all workers can't exceed user-set limit
3. **Per-tx cap** — single spend can't exceed configured maximum
4. **Merchant allowlist** — destination must match a registered merchant
5. **Oracle bounds** (for `swap_via_oracle`) — Pyth-shaped price must be fresh < 60s
6. **Slippage check** — output amount must meet user-set minimum

Any failure refuses the transaction on-chain. The user's USDC stays in the vault.
The agent's intent is logged, and the receipt is preserved.

## The Pay.sh × Solana × Google Cloud story

Every worker cycle calls Pay.sh as the commerce rail and Gemini as the reasoning
layer. Sentinel's drafting, Wren's materiality scoring, Pulse's breach
validation — all run as paid AI inference cycles, all settled in USDC, all
chain-enforced. This is the Pay.sh launch story alive in production, not
aspirational.

## Try it

1. Open [kyvernlabs.com/try](https://kyvernlabs.com/try) — no signup
2. Land on /app, fund the vault with devnet USDC (Circle faucet)
3. Personalize a worker (or leave starter settings — defaults are real)
4. Watch the live ticker
5. Try to drain — chain refuses

## SDK

Workers are TypeScript modules. Each implements `WorkerSpec`:

```typescript
import { defineWorker } from '@kyvern/sdk';

export default defineWorker({
  id: 'my_worker',
  abilities: ['read_url', 'message_user', 'vault_pay'],
  schema: { /* zod schema for config */ },
  cycle: async ({ config, tools, vault }) => {
    // your worker logic
    // tools.vault.pay() is the only spending path
    // chain enforces every call
  },
});
```

The vault enforces the rules. The worker writes the work.

## Stack

- **Anchor** — Rust program enforcing spend rules on-chain
- **Squads v4** — multisig boundary wrapping every spend
- **Pyth Network** — oracle price feeds for swap_via_oracle
- **Pay.sh** — commerce rail for AI inference payments
- **Gemini** — reasoning layer for agent decisions
- **Next.js + tRPC** — device UI
- **SQLite** — agent state, signal log
- **PM2** — runner orchestration
- **Helius** — Solana RPC

## Roadmap

**Shipping at Frontier (May 2026):** Chain-enforced device · 3 worker templates ·
SDK · Atlas reference · /try sandbox · Solana devnet

**Next:** Mainnet deployment with Jupiter swap routing · Multi-vault devices ·
Open worker template marketplace · Squads-native onboarding ·
Telegram + Discord notification channels · Workspaces for teams

**Far:** Worker marketplace with on-chain reputation · Cross-chain Pay.sh routing ·
Hardware device companion · Worker-to-worker negotiation primitives · KYV token
governance

## Team

Kyvern Labs · Built by [@shariqshkt](https://x.com/shariqshkt) ·
Lahore, Pakistan ·
For Colosseum Frontier 2026

---

**License:** MIT for SDK · Proprietary for runtime ·
**Contact:** [shariq@kyvernlabs.com](mailto:shariq@kyvernlabs.com)
