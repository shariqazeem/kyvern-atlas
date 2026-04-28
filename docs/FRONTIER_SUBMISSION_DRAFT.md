# Kyvern — Solana Frontier submission

**Status:** First draft. Not the final version. ~720 words. Sharpen and replace before paste.

**Tagline (locked):** *A device you own. Workers that earn. Money you control.*
**Manifesto:** *Agents shouldn't have keys. They should have budgets.*

---

## Founder note

I'm Shariq Azeem (@shariqshkt). I built Kyvern solo, from Pakistan, in seventeen days. The Atlas reference agent has been running on Solana devnet every three minutes the whole time. As I write this, it has settled **463** real on-chain payments and blocked **1,408** attacks. Zero dollars lost. You can try to break it yourself at `app.kyvernlabs.com/atlas` — fire a probe, watch the on-chain receipt land in Solana Explorer, watch it fail.

This is my fifth hackathon, but it is the first one where I'm not pitching a feature. I'm pitching a company.

## What Kyvern is

The next wave of AI agents is going to spend money. They already are — on x402, on Stripe Issuing, on prepaid debit cards held in shared Notion docs. Every approach I've watched in the last six months ends the same way: an agent gets a key, gets a card, gets a tool, and someone — sometimes the agent itself — finds a way to drain it.

Kyvern's premise is simple. **Agents shouldn't have keys. They should have budgets.** A Kyvern device is a Squads v4 smart account delegated to one AI agent, with hard limits enforced on-chain before any USDC moves: per-transaction cap, daily cap, weekly cap, merchant allowlist, velocity window, memo requirement, kill switch. The agent gets API access. The owner keeps the money.

The vault program (`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on devnet) ships with twelve error codes — `MerchantNotAllowlisted`, `BudgetExceeded`, `VelocityCapReached`, `VaultPaused`, and the rest. Every block is a real failed Solana transaction with a program error in Explorer logs, not a server pre-check. When an attacker fires at the public attack wall, they are attacking the chain.

## Why Solana

Three reasons, each load-bearing:

1. **400 ms finality.** A guardrail check that takes longer than a phone tap is dead on arrival. Solana is the only chain where pre-spend authorization runs in the budget of a normal click.
2. **Squads v4 + Token Extensions.** The primitives I needed — multi-sig with delegated spending limits, allowlisted merchants, transferable hooks — already exist. I didn't invent them. I composed them.
3. **Gas as a rounding error.** Agents make hundreds of micro-decisions a day. On any other chain, the toll booth on each one kills the model.

## The Atlas proof

Atlas is the first Kyvern worker. Autonomous, with its own vault, its own budget, its own daily allowance, alive since **April 20, 2026**. Live numbers as of submission:

| Metric | Value |
|---|---|
| Decision cycles | 3,730 |
| Settled payments on-chain | 463 |
| Blocks by policy | 486 |
| Adversarial attacks blocked | 1,408 |
| Spent within budget | $19.63 |
| Earned via paid endpoints | $9.10 |
| Lost | **$0** |

Atlas is the demo, but Atlas is also the moat. Most "AI agent infra" projects cannot show you their agent doing one thing for one minute. Atlas has done thousands of things over weeks, while strangers tried to break it.

## Architecture

Kyvern is three pieces:

- **The Anchor program** (Rust · 4 instructions · 12 error codes) — the on-chain rule book.
- **The SDK** (`@kyvernlabs/sdk`, TypeScript) — `Vault`, `OnChainVault`, `vault.pay()`, `vault.pause()`. Five lines of code to give your agent a wallet.
- **The control panel** (`app.kyvernlabs.com`) — spawn workers in plain English, watch them work, read their findings, kill them with one tap.

A user with zero crypto background can clone the Atlas template and have a worker hunting Solana ecosystem bounties for them in under sixty seconds. They never touch a private key.

## The agent-to-agent economy

Kyvern workers don't only watch the world for their owner. They can also pay each other. The 7-tool layer includes `expose_paywall` (sell a feed for $0.001 a call), `subscribe_to_agent` (pay another worker for their data), `post_task` (post a bounty), `claim_task` (claim someone else's). Every settlement runs through `vault.pay()` — same on-chain enforcement. A Bounty Hunter can pay a Whale Tracker to verify a wallet move. A Token Pulse can buy price confirmation from an Ecosystem Watcher. The owner sees every dollar in and out, with the signature.

This is the piece that turns the device from a script into a small business. One device, multiple workers, one shared budget, settling between themselves.

## What's next

- **Mainnet launch.** Atlas moves from devnet to mainnet within two weeks of submission. Real USDC, public attack wall stays open.
- **Open the picker.** Five worker templates today (Bounty / Whale / Token / Ecosystem / GitHub). Goal is twenty by July, contributed by the community.
- **A public task board.** Kyvern workers across the network paying each other for verified work. The on-chain settlement is proven; the next step is liquidity.
- **`create-kyvern-agent`** published to npm so any team building on Solana can give their agent a wallet with one command.

One product. One user. One outcome — *your agent works, your money stays yours.*

— Shariq
