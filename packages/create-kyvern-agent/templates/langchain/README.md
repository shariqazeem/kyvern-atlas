# my-kyvern-agent

A working Solana AI agent wired to a [Kyvern vault](https://kyvernlabs.com),
[pay.sh](https://pay.sh), and a [KAST-funded card](https://go.kast.xyz/VqVO/STPAK)
payout. Created by `npx create-kyvern-agent`.

## What this is

A 100-line TypeScript agent that demonstrates the layered story:

1. **`vault.checkAllowance()` + over-cap pay.sh call** — agent asks the
   vault FIRST. Kyvern refuses. Pay.sh is never called. The local-wallet
   prompt would never have fired. The chain decided before any rail did.
2. **`vault.checkAllowance()` + allowed pay.sh call** — Kyvern allows
   the spend, pay.sh's CLI handles the 402 challenge, returns real API
   response data, and Kyvern settles the budgeted spend on Solana.
3. **KAST-funded card payout** *(optional)* — if `MY_KAST_ADDRESS` is
   set, the agent routes a share of accrued earnings to the user's
   KAST card. Real on-chain USDC transfer, real card top-up.

Pay.sh is the Solana Foundation's HTTP-402 payment layer. Their docs
say *"Real payments still require local user authorization."* Kyvern
is what closes that gap — the chain takes the place of the wallet
approval prompt so an agent can run autonomously without compromising
safety.

## Run it (60 seconds)

```bash
# 1. Install pay.sh CLI
brew install pay                  # macOS
# or
npm install -g @solana/pay        # Linux/Windows

# 2. Install deps
npm install

# 3. Mint a Kyvern agent key from kyvernlabs.com/app · Agent keys ·
#    Mint a key. Shown ONCE. Paste it into .env:
cp .env.example .env
# fill in KYVERN_AGENT_KEY (and optionally MY_KAST_ADDRESS)

# 4. Run
npm run agent
```

Console output: Kyvern's verdict on each scenario, the real pay.sh API
response when allowed, and a Solana Explorer link to the on-chain
settlement.

## The architecture, in one diagram

```
            ┌────────────────────────────────────────────────────┐
            │   Your agent code                                  │
            │     ↓                                              │
            │   await vault.checkAllowance({ merchant, amount }) │
            └─────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
            ┌────────────────────────────────────────────────────┐
            │   Kyvern policy gate (allowed / blocked)           │
            │   Same rules deployed on-chain at PpmZ…MSqc        │
            └────────┬─────────────────────────┬─────────────────┘
                     │ allowed                 │ blocked
                     ▼                         ▼
              pay --sandbox curl        Kyvern logs the refusal —
                <pay.sh url>            pay.sh is never invoked.
                     │
                     ▼
              Real x402 / MPP API response
                     │
                     ▼
            await vault.pay({ ... })  →  on-chain settlement
                                         (Squads CPI, USDC moves)
```

## Why this matters

Pay.sh lets your agent pay any API. Kyvern lets your agent pay
**autonomously**. Both products' value compounds. Pay.sh is the rails;
Kyvern is the policy layer above the rails.

Same pattern works with any 402-paywalled HTTP service — x402, MPP,
or anything else that returns 402 with payment requirements.

## Send earnings to a KAST-funded card

Open the KAST app → Deposit → Solana USDC → copy the address. Paste
into `MY_KAST_ADDRESS` in `.env`. The sample's step 3 routes a $0.10
share to your KAST card via a real on-chain USDC transfer. Spend at
150M+ merchants worldwide.

Don't have a KAST card? [Get one →](https://go.kast.xyz/VqVO/STPAK)

Kyvern is *compatible with KAST deposit rails*. Not affiliated with KAST.

## Why Kyvern

Agents with hot wallets get drained. Agents with custodial credit
primitives are slow and KYC-heavy. Kyvern gives your agent a Solana
smart safe whose spending policy is enforced by an on-chain program
(`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`) atomically composing
with Squads v4.

The worst an agent can do in a day is spend its daily allowance.
Everything else fails on-chain — clickable failed-tx receipts on
Solana Explorer.

Read the full story at [kyvernlabs.com](https://kyvernlabs.com).

## License

MIT
