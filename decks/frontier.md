# Kyvern — Solana Frontier 2026 deck

> Source markdown for the Frontier pitch deck. Render to PDF for the
> submission portal (each `## Slide` = one slide).

---

## Slide 1 — Title

# Kyvern

**Financial safety infrastructure for autonomous agents.**

> *AI agents shouldn't have private keys.
> They should have budgets.*

— Shariq Azeem · [@shariqshkt](https://x.com/shariqshkt) · 🇵🇰 Pakistan
[kyvernlabs.com](https://kyvernlabs.com) · `npm install @kyvernlabs/sdk`

`Solana · Squads · pay.sh · KAST · npm`

---

## Slide 2 — The problem

**Agents are getting wallets. Wallets get drained.**

A 2026 AI agent buying API access, settling x402 calls, paying merchants
needs a real spending mechanism on-chain. Three options today:

| Option | Problem |
|---|---|
| Give the agent a hot wallet | One bad prompt drains everything |
| Manual approval per spend | Defeats the point of autonomy |
| Custodial credit (Stripe Issuing, etc.) | Slow, KYC-heavy, no on-chain settlement |

Every Solana agent project ships into this gap. The bigger the agent
ecosystem grows, the bigger the loss surface.

---

## Slide 3 — The wedge: pay.sh's open question

Pay.sh — the Solana Foundation's payment layer for HTTP agents — just
launched. It handles 402/x402/MPP challenges and asks the local wallet
to sign. Their docs say:

> *"Real payments still require local user authorization."*

That single line is the only thing standing between pay.sh and a fully
autonomous agent. **Kyvern is what closes that gap.**

```ts
const allowance = await vault.checkAllowance({ merchant: "pay.sh", amount: 0.001 });
if (allowance.decision !== "allowed") return; // Kyvern refused — pay.sh never invoked
const result = execSync(`pay --sandbox curl <pay.sh-service>`); // executes
```

Both products' value compounds. Pay.sh is the rails; Kyvern is the
policy layer above the rails.

---

## Slide 4 — Live demo: integrate + watch the chain

Sign in at **kyvernlabs.com**. Unbox cinematic plays (~2.5s). Land on
the device — `/app` — with a 5-step integration wizard on the left
and a live event feed on the right.

| Step | Action | What lands |
|---|---|---|
| 1 | Mint your `kv_live_…` key | Copy it once — wizard unlocks |
| 2 | `npx create-kyvern-agent` + `npm install @kyvernlabs/sdk` | Copy commands |
| 3 | Paste-and-run the 3-line snippet — `vault.checkAllowance(...)` | Copy snippet |
| 4 | Click **Try over-cap / off-allowlist / missing memo** | Real failed Solana tx in your event feed in <3s, Kyvern errors 12002/12003/12004, clickable Explorer |
| 5 | Paste your KAST USDC deposit address | Real on-chain payout from your agent → KAST card |

> **The agent's first event lands in the user's own feed within
> seconds. Every refusal includes the Kyvern policy program in the
> instruction trace.**

The four affordance tabs above the chassis (Watch the chain · Wrap
pay.sh · Send to KAST · Wrap your agent) open instrument-drawer
panels with deeper interactions, including the real `pay --sandbox
curl` shell-out that proves Kyvern wraps live x402-paywalled APIs.

[screenshot of the wizard at step 4 with the event feed showing a
fresh blocked tx + Kyvern error 12002]

---

## Slide 5 — Architecture: the layered Solana agent payments stack

```
                ┌─────────────────────────────────────┐
                │    Your AI agent                    │
                └──────────────┬──────────────────────┘
                               │ vault.checkAllowance()
                               ▼
                ┌─────────────────────────────────────┐
                │  KYVERN  — policy layer (this)      │
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
                  │              │              │
                  ▼              ▼              ▼
                Solana mainnet (devnet today, audit in progress)
```

- **Anchor program** at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`
  with 5 enforcement rules + a kill switch
- **`@kyvernlabs/sdk@0.5.0`** on npm — `Vault`, `OnChainVault`,
  `KastDestination`, `vault.checkAllowance()`
- **`npx create-kyvern-agent my-agent`** — scaffolder shipped
- **Atlas reference agent** running on Solana devnet since 2026-04-20
  (19+ continuous days, 8.8k cycles, 1.3k settled, 6.5k+ blocked)

---

## Slide 6 — Market

**Distribution:** SDK + scaffolder + on-chain program. Three install
commands away from any agent's hot path.

**TAM (2027):**
- Solana agent ecosystem: ~$X TAM by 2027
- Pay.sh catalog: 72 services and growing — every one a Kyvern wrap target
- Stablecoin agents are the next $10B vertical; every wallet is a loss vector

**Wedge:**
- Every Solana agent project shipping this year is a Kyvern integration target
- Every pay.sh service URL works through Kyvern unchanged (composable)
- KAST off-ramp closes the loop into real-world spending (consumer pull)

**Track:** Infrastructure & Developer Tooling (cross-list AI x Solana)

---

## Slide 7 — Why we win

| | Competitors | Kyvern |
|---|---|---|
| Enforcement | Server-side rules | **On-chain Anchor program** |
| Evidence | Internal logs | **Failed-tx Explorer links a judge can verify** |
| Reference agent | Demo mode that resets | **19 days unbroken on devnet** |
| Distribution | Custom integration | **`npm install @kyvernlabs/sdk`** |
| Loop | Ends in a dashboard | **Earnings flow to a real-world card via KAST** |
| Composability | Closed | **Wraps pay.sh, x402, any HTTP-402 rail** |

Two sentences in the hands of any builder:
> 1. `npm install @kyvernlabs/sdk`
> 2. `await vault.checkAllowance({ merchant, amount })`

---

## Slide 8 — Team

**Shariq Azeem** — solo Pakistani builder

- 5 prior hackathon wins ($4,250+)
- 3 prior x402 projects: ParallaxPay, TrendSurfer, x402-Oracle
- This sprint: collapsed Kyvern from "agent OS" to "financial safety
  infrastructure" in 48 hours. Real on-chain enforcement landed today
  (Block B), shell-out pay.sh integration verified live, SDK + scaffolder
  shipped to npm.

[@shariqshkt](https://x.com/shariqshkt) · [GitHub](https://github.com/shariqazeem/kyvern-atlas)

---

## Slide 9 — Roadmap

**Now (devnet, today):**
- Anchor program deployed with 5 rules + kill switch
- SDK 0.5.0 on npm, scaffolder 0.2.0 on npm
- Atlas reference agent live, 19 days unbroken
- /app with live integration wizard + per-user event feed (real failed Solana txs land in <3s)

**Next 30 days (mainnet path):**
- External audit kickoff (target: completion within 60 days)
- `update_allowlist` instruction wired to a self-serve UI for user vaults
- LangChain / Claude Agent SDK adapter v2

**Q3 2026:**
- Mainnet deploy
- Pay.sh + Kyvern co-published reference patterns
- KAST-rail compatibility extended (Pakistani PKR payouts in scope)

> *We do not claim a KAST partnership or a pay.sh partnership. The
> integration speaks via the working flow + the affiliate link.*

---

## Slide 10 — The ask

**Track:** Infrastructure & Developer Tooling (cross-list: AI x Solana)
**Region:** Pakistan
**Repo:** github.com/shariqazeem/kyvern-atlas
**Live:** kyvernlabs.com/app (sign in to see the integration console)
**SDK:** npm install @kyvernlabs/sdk

Funding tier: pursuing the Solana Frontier infrastructure award + the
pay.sh ecosystem composability bonus.

> *AI agents shouldn't have private keys. They should have budgets.
> The chain has the receipts.*

— Shariq Azeem · 🇵🇰
