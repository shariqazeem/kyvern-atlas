# Kyvern — Kast Pakistan track deck (Superteam Earn)

> Source markdown for the Kast Pakistan pitch deck. Render to PDF for
> the submission portal. ~80% shared with the Frontier deck; slides 3
> and 6 differ to register the Pakistan-specific narrative.

---

## Slide 1 — Title

# Kyvern

**Financial safety infrastructure for autonomous agents.**

> *AI agents shouldn't have private keys.
> They should have budgets.
> Earnings should land on a card you can spend.*

— Shariq Azeem · [@shariqshkt](https://x.com/shariqshkt) · 🇵🇰 Made in Pakistan
[kyvernlabs.com](https://kyvernlabs.com) · `npx create-kyvern-agent`

`Solana · Squads · pay.sh · KAST · npm`

---

## Slide 2 — The problem

**Pakistani freelancers earn in stablecoins. They want safe automation.
They can't trust an AI with their wallet.**

A Pakistani student or freelancer earning $100 USDC/month off Solana
agents has to choose between:

| Option | Problem |
|---|---|
| Hot wallet for the agent | One bad prompt = a month's earnings gone |
| Manual approval per spend | Defeats the autonomy that lets it earn |
| Custodial credit | Slow, KYC-heavy, no Pakistani support |
| Not automating at all | Leave money on the table |

**$100 USDC = ~PKR 28,000.** That's a meaningful month for a student or
remote worker. It deserves a real safety primitive.

---

## Slide 3 — The user journey

**Maryam** is a freelance designer in Lahore. She runs a small Solana
agent that researches DeFi yield, executes via pay.sh-paywalled APIs,
and reinvests the surplus.

```
Monday morning:
  Maryam: $100 USDC in her Kyvern vault on Solana devnet
  Policy: $5/day cap, $25/week cap, allowlisted: api.openai.com,
          api.pay.sh, MY_KAST (her KAST card deposit address)

Monday all day:
  Agent makes 47 calls — 6 to pay.sh ($0.001 ea), 41 to api.openai.com
  Each call goes through vault.checkAllowance() FIRST
  Two over-cap attempts blocked on-chain (Custom error 12002)
  One off-allowlist attempt blocked on-chain (Custom error 12003)

Monday evening:
  Agent: "Routing $1.50 share to MY_KAST"
  Real on-chain USDC transfer — Maryam's KAST card balance increases
  Spends ~PKR 420 on dinner via her KAST card

Every refusal is a clickable Solana Explorer link Maryam can audit.
Every settle is a real on-chain receipt. The chain has the books.
```

**The loop ends in real life.** Her car ride, her groceries, her
dinner — all funded by an autonomous agent her wallet never had to
hot-key.

---

## Slide 4 — Live demo: Maryam's first event

Maryam signs in at **kyvernlabs.com**. Unbox plays (~2.5s). Lands on
her device — `/app` — with the 5-step integration wizard on the left
and her own live event feed on the right (empty, ready).

| Step | What Maryam does | What lands on her device |
|---|---|---|
| 1 | Mint key | `kv_live_…` shown once, copied |
| 2 | Install | Two `npm` commands copied |
| 3 | Run the snippet | `vault.checkAllowance(...)` — first call recorded |
| 4 | Click "Try over-cap" | **Real failed Solana tx** lands in her event feed in <3s. Custom Kyvern error 12002. Click → Solana Explorer. |
| 5 | Paste KAST USDC deposit address | "Test $0.001 payout" → real on-chain transfer to her KAST card |

> **The chain has the receipts.** Every refusal in Maryam's feed
> includes the Kyvern policy program at `PpmZ…MSqc` in the
> instruction trace. The chain decides. Maryam audits.

[screenshot of /app with Maryam's wizard at step 4 + a fresh
blocked-on-chain row in the event feed]

---

## Slide 5 — Architecture: the layered stack

```
                ┌─────────────────────────────────────┐
                │    Maryam's AI agent                │
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
                                              │
                                              ▼
                                    150M+ merchants worldwide
                                    (incl. Pakistan)
```

- **Anchor program** at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`
- **`@kyvernlabs/sdk@0.5.0`** with `KastDestination` helper
- **`npx create-kyvern-agent my-agent`** scaffolds a working pay.sh + KAST agent
- **Atlas reference agent** live since 2026-04-20

---

## Slide 6 — Why this for Pakistan

**The market:**
- 50M+ remote workers / freelancers in Pakistan (largest % growth in Asia)
- Solana adoption growing — local meetups, Superteam Pakistan active
- KAST is the stablecoin card Pakistanis already trust
- USDC remittance volume into Pakistan ~$X B/year and growing

**The Kyvern fit:**
- Pakistani builders are price-sensitive — `$100 USDC` is meaningful
- Safety infrastructure matters more, not less, when amounts are smaller
- KAST already solves the off-ramp; Kyvern closes the on-chain side
- Built by a Pakistani solo founder who lived this problem

**Roadmap to PKR:**
- Direct PKR payouts via additional Kyvern destinations (post-Frontier)
- Pakistani-language docs + tutorials
- Partnership conversations with KAST for native Kyvern UX (post-submission)

> *We do not claim a KAST partnership today. The integration speaks
> via the working product flow + the affiliate link.*

---

## Slide 7 — Why we win

| | Today's options for Pakistani agent builders | Kyvern |
|---|---|---|
| Custody | Hot wallet (drainable) | **Squads multisig** |
| Enforcement | Server-side rules | **On-chain Anchor program** |
| Evidence | Internal logs | **Failed-tx Explorer links anyone can verify** |
| Reference agent | None | **19 days unbroken on devnet** |
| Setup | Custom integration | **One npm command** |
| Loop | Ends in a dashboard | **Earnings flow to a KAST-funded card** |

Three commands away from any Pakistani builder's hot path:
1. `brew install pay` (or `npm install -g @solana/pay`)
2. `npx create-kyvern-agent my-agent`
3. Paste your KAST USDC deposit address into `.env` → run

---

## Slide 8 — Team

**Shariq Azeem** — solo Pakistani builder

- 5 prior hackathon wins ($4,250+)
- 3 prior x402 projects (Solana payment layer experience)
- Built Kyvern after losing time to AI-agent loss vectors firsthand
- This sprint: shipped real on-chain Kyvern enforcement, full pay.sh
  shell-out integration, KAST-rail compatibility, SDK 0.5.0 + scaffolder
  to npm — all in 48 hours

[@shariqshkt](https://x.com/shariqshkt) · [GitHub](https://github.com/shariqazeem/kyvern-atlas)

🇵🇰 *Built in Pakistan for Pakistani builders.*

---

## Slide 9 — Roadmap

**Now (devnet, today):**
- Anchor program deployed with 5 enforcement rules
- SDK 0.5.0 on npm, scaffolder 0.2.0 on npm
- Atlas reference agent live, 19 days unbroken
- /app with live integration wizard + per-user event feed (real failed Solana txs land in <3s)
- KAST-rail compatibility working in `/app`

**Next 30 days:**
- External Anchor program audit
- Pakistani-language docs + tutorial videos
- LangChain / Claude Agent SDK adapter v2

**Q3 2026:**
- Mainnet deploy
- Direct PKR payout helpers
- Outreach: partnership conversations with KAST + pay.sh

---

## Slide 10 — The ask

**Track:** Kast Pakistan via Superteam Earn (Consumer Applications +
AI x Solana + Infrastructure)
**Region:** Pakistan
**Repo:** github.com/shariqazeem/kyvern-atlas
**Live:** kyvernlabs.com/app (sign in to see the integration console)
**SDK:** npm install @kyvernlabs/sdk
**KAST signup:** [https://go.kast.xyz/VqVO/STPAK](https://go.kast.xyz/VqVO/STPAK)

> *AI agents shouldn't have private keys.
> They should have budgets.
> Earnings should land on a card you can spend.*

— Shariq Azeem · 🇵🇰
