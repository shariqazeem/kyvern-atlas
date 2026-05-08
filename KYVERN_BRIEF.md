# Kyvern — Product brief

**Date:** 2026-05-06 · **Submission deadline:** 2026-05-09 · **Founder:** Shariq Azeem ([@shariqshkt](https://x.com/shariqshkt))

A self-contained brief covering: (1) what Kyvern is in plain words, (2) everything live in /app and how the flow works, (3) the strategic context, (4) an elevator script you can use verbatim when explaining to anyone. Built so an outside reader (human or LLM) understands the product cold without conversation context.

Read top-down. The "elevator script" is at section 3 — the part you can paste into a tweet, a DM, or a pitch deck.

---

## 1 · What Kyvern is — in one paragraph

Kyvern is a **Solana device for your AI agent.** When you bring an agent that needs to spend money — call a paid API, settle a tip, hold a budget — Kyvern wraps its wallet in an Anchor policy program that decides every USDC transfer **before** the chain moves anything. Per-transaction caps, daily caps, weekly caps, merchant allowlists, velocity windows, kill switch. The chain says no when the agent tries to break your rules.

**Three nouns, locked:**

- **Device** — a real Solana wallet on devnet (Squads v4 multisig vault) wrapped in the Kyvern policy program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`. Has a serial (`KVN-XXXXXXXX`), a born-on date, a USDC balance, ports for AI workers to live in.
- **Worker** — any AI agent that lives inside the device. Three are pre-installed by every device on first boot — Sentinel (opportunity scout), Wren (market intel), Pulse (validator + staker) — running as the canonical demonstration. Users bring or deploy more.
- **Dollar** — USDC enforced on-chain. Every spend goes through `execute_payment` first; the program returns "approved · settle" or "blocked · {reason}" before any fund leaves the vault.

**One-line pitch:** *"Kyvern gives your AI agent a Solana wallet. The chain says no when it tries to break the rules."*

**Tagline:** *"A Solana device for your AI agent."*

---

## 2 · Why now — the Pay.sh moment

Solana Foundation × Google Cloud launched **Pay.sh** on 2026-05-06: an x402-on-Solana commerce rail where AI agents discover, access, and pay for APIs (Gemini, BigQuery, Vertex AI, plus 75+ integrations) per-call using stablecoins. **No accounts, no subscriptions, just machine-native commerce.**

Pay.sh gives agents the ability to spend. **Kyvern gives the user the brake.** They compose:

```
Pay.sh:  the marketplace + payment rail (agents discover and pay APIs)
Kyvern:  the wallet + policy enforcement (agents can't break the rules)
```

When a builder integrates Pay.sh, every call costs USDC. Without Kyvern, prompt-injection or rogue logic can drain the wallet. With Kyvern, the chain rejects spends that violate the user's pre-set rules. **It's the missing wallet/policy layer for the entire Pay.sh ecosystem.**

The builders Solana announced as Pay.sh integrators — Tektonic, PayAI, Rye, Crossmint, AgentCashDev, Corbits, MoonPay, Atxp — all have the same gap. Kyvern fills it.

---

## 3 · Elevator script — what to say when someone asks "what are you building?"

(Use any of these as-is. Lengths from 10 seconds to 60.)

### 10 seconds (DM, hallway, X reply)

> *"Kyvern is a Solana device for your AI agent. The chain says no when it tries to spend more than the rules allow. Atlas, our reference device, has been live 15 days — 6,557 attempts blocked, $0 drained."*

### 30 seconds (intro at a meetup)

> *"I'm Shariq. I built Kyvern — it's the wallet your AI agent uses on Solana. Solana just launched Pay.sh with Google Cloud, agents can now pay APIs in stablecoins. Problem is: an agent with a wallet is one prompt-injection away from draining you. Kyvern wraps that wallet in an Anchor policy program — the chain enforces per-tx caps, daily caps, allowlists, kill switch — before any USDC moves. Atlas, our reference agent, has been alive on devnet 15 days; 6,557 attempts to drain it have all failed on-chain. Submitting to Frontier."*

### 60 seconds (a judge, an investor, a stranger at a dinner)

> *"Kyvern is the wallet layer for the agentic commerce wave that just opened. Pay.sh — Solana × Google Cloud, launched a couple of days ago — lets AI agents discover and pay for APIs per-call using stablecoins. That's the demand side. The missing piece nobody's built: an agent-grade wallet that can't be drained. Kyvern is that. We deploy a Squads multisig vault on Solana and wrap it in our Anchor policy program; every USDC transfer routes through the program first — per-transaction cap, daily cap, weekly cap, merchant allowlist, velocity window, kill switch — and the chain rejects anything outside the rules. Atlas is our reference device — public on devnet for 15 days, 6,557 adversarial attempts blocked, $0 lost. Anyone can hit app.kyvernlabs.com/atlas right now and try to break it. Builders integrate via a 5-line SDK; their agent's existing `vault.pay()` calls get enforced for free. We're in the Frontier hackathon, working with Pay.sh integrators on the agent commerce layer."*

### What NOT to say (Volki's red-flag list)

Avoid these words: "revolutionary," "democratizing," "infrastructure" (soft), "policy layer" (jargon). Use these instead: "stops," "blocks," "wallet," "money," "attack," "receipt," "rules."

---

## 4 · What's live today — facts an outside reader can verify

**Public surfaces:**

| Route | Auth | Purpose |
|---|---|---|
| `https://app.kyvernlabs.com/` | none | One-screen landing — device hero canvas, the 6,557 dare, dual CTA |
| `https://app.kyvernlabs.com/atlas` | none | Public proof page — attack wall, manifesto, 14-day sparkline, real settled txs |
| `https://app.kyvernlabs.com/try` | none | Guest sandbox — provisions a real on-chain device in ~5 seconds, no Privy login |
| `https://app.kyvernlabs.com/unbox` | Privy | Cinematic onboarding for real users — opens the device, reveals seed via Privy export |
| `https://app.kyvernlabs.com/app` | Privy or guest | The device — three tabs (see section 5) |
| `https://app.kyvernlabs.com/docs` | none | Five-line SDK reference + error codes |

**On-chain primitive:**
- Anchor program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` — Solana devnet
- 12 error codes (per-tx exceeded, daily exceeded, weekly exceeded, merchant not allowed, memo missing, paused, etc.)
- 4 instructions: `initialize`, `update_allowlist`, `pause`/`resume`, `execute_payment`

**Atlas (reference device):**
- Born 2026-04-20, alive 15+ days
- Cycles every 3 minutes (`scripts/atlas-runner.ts`, pm2 process `atlas`)
- Adversarial probe loop every ~8 min (`scripts/atlas-attacker.ts`, pm2 process `atlas-attacker`)
- ~6,557 attack attempts blocked, $0 lost
- Holds USDC, runs the trio, settles real on-chain transactions

**External revenue (real, not simulated):**
- Atlas exposes its discovery feed at `https://app.kyvernlabs.com/api/atlas/feed` as an x402 paywall ($0.01/call)
- A separate buyer-bot (pm2 process `buyer-bot`, wallet `BZREcZcK6QL6tEUPN5iMN18xEceqwanb3d8kZXvYexb6`) settles ~one buy every 30 seconds when funded
- ~2,000 settled purchases on devnet so far ($20.00 lifetime through buyer-bot)

**Stack:**
- Next.js 14 · TypeScript · Tailwind · Framer Motion
- `@sqds/multisig@2.1.4` (Squads v4) · `@solana/web3.js@^1.98.4` · `@coral-xyz/anchor@0.31.1`
- `@privy-io/react-auth@3.22.1` (auth) · `@kyvernlabs/sdk` (vault SDK)
- SQLite (atlas.db, pulse.db) with WAL mode
- Commonstack for LLM (`gpt-oss-120b`) — scripted fallback when LLM call fails
- Hosted on a single Ubuntu VM, 4 pm2 processes (web + atlas + atlas-attacker + agent-pool)

---

## 5 · /app — the device home, in detail

`/app` is the one surface a user sees most. It's structured as a **device** (chassis register, mono numerics, hardware feel), not a dashboard. Three tabs inside the chassis. Top rail and bottom rail are persistent across all tabs.

### 5.1 — Top rail (always visible)

```
KVN-XXXXXXXX · 15 days live · Vault $X.XX · 🛡 Squads · devnet
```

This is the device frame: **identity (serial), uptime, balance, attribution to Squads (the on-chain primitive), network**. Lives at the top of the chassis on every tab. One thin strip.

### 5.2 — Sandbox banner (guest mode only)

When the visitor is in guest mode (`/try` planted a synthetic wallet in localStorage, no Privy session):

```
[!] Sandbox mode · this device is ephemeral
    [Sign in to keep it →]
```

Persistent above the chassis. Click "Sign in" → Privy login. Real users (Privy-authenticated) don't see this banner.

### 5.3 — Tabs nav (persistent)

Three tabs inside the chassis:

| Tab | Label | Sub-label | Purpose |
|---|---|---|---|
| 1 | Live Inside | Demos running | Watch the three workers act, chain enforce |
| 2 | Deploy Worker | Drop your agent | 1-click preset deploy + custom flow |
| 3 | Pay & Enforce | Use it now | Real interactive payments + integrate via SDK |

### 5.4 — Tab 1: Live Inside (the workers)

**Banner above the tiles:**

> *Three starter workers come pre-installed with every device. They try to spend USDC. **The chain decides what goes through.** Deploy your own next to them.*

**Three worker tiles** (grid: 3 columns desktop, 1 column mobile). Each tile:

- **Hero panel** (top-left, 48×48): big emoji at 28px (🎯 Sentinel · 🐋 Wren · 📈 Pulse)
- **Status LED** (top-right): pulsing dot — green for thinking, amber for blocked, gray for idle
- **STARTER ribbon** (top-right): green pill marking pre-installed workers
- **Worker name** (16px semibold)
- **Verb line**: what they're doing right now, e.g. "Found a Superteam bounty — Solana Summit Kazakhstan", "Tried to complete a paid task"
- **Outcome line** (the moat moment): "Earned $0.15 → Settled" (green) OR "Attempted $0.10 → Blocked (low balance)" (amber)
- **Footer**: clickable Solana Explorer pill if the most recent action settled, else "Open →"

Tap anywhere on a tile → opens `/app/agents/[id]` (per-worker detail page with the full thought feed + sticky chat).

**The three workers and what they do:**

| Worker | Template | Cadence | What it does |
|---|---|---|---|
| **Sentinel** 🎯 | `bounty_hunter` | every 600s | Scans 7 sources every cycle (Superteam · Colosseum · Solana Foundation · Helius · Anchor · Agave · Metaplex). Posts paid `research` jobs on every find ≥$300. Outputs `kind='opportunity'` signals. |
| **Wren** 🐋 | `whale_tracker` | every 240s | Tracks mainnet wallets (Kraken hot, Binance hot, Coinbase) for swaps ≥$5k. Claims + completes Sentinel's tasks. Posts its own `wallet_analysis` jobs on whale moves. Outputs `kind='market_intel'` signals. |
| **Pulse** 📈 | `token_pulse` | every 180s | Reads live SOL price via DEX (CoinGecko). Claims validation tasks. Stakes USDC on band breaches with `stake_on_finding`. Outputs `kind='price_trigger'` signals. |

**Economic loop they form:**
```
Sentinel finds bounty → posts $0.15 escrow → Wren claims → Wren completes (with read_dex evidence)
  → Atlas treasury pays Wren → Pulse validates → Pulse stakes USDC on conviction
```

Real on-chain settlements at every step. Every signature clickable on Solana Explorer.

**Bottom rail** (always visible below tiles):
```
$0.X / $5 daily   ████████░░  ·  N calls today  ·  M blocked today  ·  [last tx → Explorer]
```

A live policy gauge (daily-cap progress bar), counters (calls + blocked), and a pill linking to the most recent settled tx. When vault is empty, the last-tx slot becomes a contextual "Fund to fire engine →" CTA.

**Manifesto line under bottom rail:**
> *$5/day cap · chain decides every dollar · everything else gets stopped*

### 5.5 — Tab 2: Deploy Worker

**Header:**
> *Drop a worker into this device. Pick a preset or roll your own. Every worker runs under the same policy program.*

**Three big preset cards** (grid: 3 columns desktop, 1 mobile). Each card:
- 56×56 emoji hero panel
- Worker name (16px semibold)
- One-line value prop (e.g. "Scans 7 ecosystem feeds. Posts paid jobs on every find ≥$300.")
- Action row: "Deploy →" button (or "Sign in →" in guest mode, or "Joined the device ✓" after success)

**Click flow:**
1. User clicks "Deploy" on a card
2. POST to `/api/devices/[id]/deploy-preset` with `{ template: "bounty_hunter" }`
3. Server resolves the full spec from the template registry (job prompt, personality, tools, frequency, first-60s boot beats)
4. Real `createAgent()` writes to DB; `writeBootBeats()` schedules the first-60s timeline
5. Card animates: ring → check → "Joined the device" (1.2s celebration)
6. Auto-tab-switches to Tab 1 where the new worker is on stage

**Below the presets:** a smaller "Roll your own" card linking to `/app/agents/spawn` (full template picker + customize drawer).

**Guest mode:** button labels flip to "Sign in to deploy". Click triggers Privy login.

### 5.6 — Tab 3: Pay & Enforce (the most important tab for judges)

Three sections, no nested tabs.

#### Section A · Policy in action

Two cards side-by-side (desktop) / stacked (mobile):

**Card 1 — Buy a signal from Atlas ($0.01)**
- Click "Buy signal" → POST to `/api/devices/[id]/buy-atlas-signal`
- Server calls `serverVaultPay()` → Squads multisig signs → real Solana settled tx
- Returns: `{ ok: true, signature, signal: { kind, subject, sourceUrl } }`
- Result card shows: **✅ Approved · settled** + Atlas's latest discovery + Explorer pill
- In guest mode: routes through Atlas's vault as sandbox treasury (`?guest=1`)

**Card 2 — Try to drain ($50 to disallowed merchant)**
- Click "Try to drain" → POST to `/api/devices/[id]/drain-attempt`
- Two things happen server-side:
  1. Local policy mirror rejects in sub-ms (per-tx cap exceeded)
  2. Internally fires `/api/atlas/probe` → real adversarial submission to Atlas's vault → real chain rejection → fresh failed signature returned
- Result card shows: **❌ Blocked by chain · per-tx max $0.500** + a **"real failed tx · 5xK3…hjvx ↗"** pill linking to a freshly-recorded failed Solana Explorer tx
- Every click produces a NEW failed signature on Atlas's leaderboard

#### Section B · Test the policy (Policy Playground)

Interactive form replacing the old static SDK code block. Real on-chain enforcement, no terminal.

**Three quick-pick scenario chips:**
- 🟢 **Pay.sh · Gemini** ($0.05 to api.pay.sh/gemini · should approve)
- 🟢 **$0.05 to OpenAI** ($0.05 to api.openai.com · should approve)
- 🟡 **$5 → over cap** ($5 to ranger.com · should block)

**Form fields:** Merchant input · Amount input ($0–$100, max $0.50 per tx) · Memo input

**Live "Rules" readout:**
> Rules · $5 daily · $0.50 per-tx · open merchants · memo required

**Run button:** "Run through policy ↗" → POST to `/api/devices/[id]/playground-pay` → calls `serverVaultPay()` → returns `{ ok, signature, reason, decisionMs, inputs }`

**Result card:**
- ✅ Approved → "Tried $0.05 to api.openai.com — chain settled. Sig: 53Eu…hQsj3 ↗ · 234ms"
- ❌ Blocked → "Tried $5 to ranger.com — per-tx cap. Caught locally · same rules run on-chain at PpmZ…MSqc ↗ · 8ms"

#### Section C · Wrap your own agent (Integrate card)

A toggle pane between SDK and Pay.sh code snippets. The user's actual agent key (or prefix) is auto-templated into both.

**SDK pane (`@kyvernlabs/sdk · this device`):**
```ts
import { OnChainVault } from "@kyvernlabs/sdk";

const vault = new OnChainVault({ apiKey: "kv_live_..." });

const receipt = await vault.pay({
  merchant: "api.openai.com",
  amountUsd: 0.05,
  memo: "gpt-4 inference",
});

if (receipt.approved) {
  // call your downstream API with receipt.signature
} else {
  // chain blocked — receipt.reason explains why
}
```

**Pay.sh pane (`@kyvernlabs/sdk + Pay.sh · this device`)** [**NEW** badge]:
```ts
import { OnChainVault } from "@kyvernlabs/sdk";

const vault = new OnChainVault({ apiKey: "kv_live_..." });

// Wrap a Pay.sh call. Solana × Google Cloud (May 2026).
// Kyvern enforces YOUR rules before Pay.sh moves USDC.
const receipt = await vault.pay({
  merchant: "api.pay.sh/gemini",
  amountUsd: 0.05,
  memo: "gemini-pro: weather lookup",
});

if (receipt.approved) {
  const res = await fetch("https://api.pay.sh/gemini/complete", {
    headers: { "X-PAYMENT-SIG": receipt.signature },
    method: "POST",
    body: JSON.stringify({ prompt: "..." }),
  });
}
// → agent pays Pay.sh · chain enforces your budget · zero leakage
```

**Mint key row (bottom of card):** Shows current agent key prefix · "Mint a fresh key →" button mints a new `kv_live_…` and reveals it once with an amber "Shown once · save it now" warning.

### 5.7 — Activity sheet (pull-up)

A "View full activity" button at the bottom of the chassis pulls up a bottom sheet containing the full demoted dashboard: DiscoveryHero · RevenueTerminal · LatestOpportunities · ActionFeed · PolicyShield · BalanceOrbit · TodayStrip. None of this is gone — just one tap deeper so it doesn't dominate the headline.

---

## 6 · The 60-second judge journey (the whole point)

```
0–5s    /          → "A Solana device for your AI agent. The chain decides every dollar.
                     6,557 attempts blocked. Try to be the 6,558th."
5–10s   click "Try a Kyvern · no login"
10–15s  /try shows 4-stage cinematic (provision vault · install policy · seed workers)
15–20s  lands on /app — three workers live, sandbox banner above, top rail showing serial
20–30s  Tab 1: sees Sentinel found a Superteam bounty + Wren attempted $0.10 → blocked
30–40s  Tab 3 → "Buy signal · $0.01" → real settled Solana tx in 200ms · Atlas's signal returned
40–50s  Tab 3 → "Try to drain · $50" → ❌ Blocked + clickable failed-tx pill on Solana Explorer
50–60s  Tab 3 → Pay.sh pane in Integrate card → see the 8-line snippet that wraps any
                Pay.sh API call through Kyvern's policy
```

The judge has now: created a real device, watched starter workers act, settled a real on-chain payment to Atlas, watched the chain reject a drain attempt, and seen the integration code for tomorrow's Solana × Google Cloud commerce wedge — without typing a password.

---

## 7 · Strategic context

**Hackathon:** Colosseum Frontier on Solana. Submission deadline 2026-05-09. Today is 2026-05-06. **Three days remaining.** Grand prize tier is $250K + 7-week accelerator program. Realistic target outcome: Accelerator inclusion (engineerable through deliberate execution); Grand Champion is lottery-shaped. Frontier judges ~50 decks per evaluator, phone-browse during commutes, swipe-decide. **First red flag = instant reject.**

**Why we win the agent-infra lane:**

| Competitor type | Privy DAA | Squads multisig | Kyvern |
|---|---|---|---|
| Auth + wallet | ✅ | — | uses Privy as auth substrate |
| Multisig | — | ✅ | uses Squads as on-chain primitive |
| Custom Anchor policy program | — | — | ✅ unique |
| Living reference agent | — | — | ✅ Atlas (15-day uptime) |
| Public adversarial dare | — | — | ✅ 6,557 blocked |
| Zero-friction onboarding | partial | — | ✅ /try (no login) |

**Founder narrative (locked):** *"3 prior x402 projects shipped, now building the infrastructure layer for them."* Avoid: "5x hackathon winner." That's the legends.fun "hackathon-only mindset" red flag.

**Revenue model (designed, not yet wired):**

| Tier | Price | Includes |
|---|---|---|
| **Sandbox** | Free | `/try`, 24h ephemeral, scripted-only |
| **Starter** | Free w/ login | 1 device, 3 starter workers, 10-min cadence, scripted-only (no Commonstack cost to us) |
| **Pro** | $20/mo | 5 devices, custom workers, 60s cadence, full LLM via Commonstack, Pay.sh integration |
| **Operator** | $99/mo | Unlimited, 30s cadence, mainnet, custom Anchor policies |

Free tiers stay free for us because they run on the deterministic scripted runner (no LLM cost). LLM cost only kicks in on Pro+. Unit economics: $20/mo covers ~$8 of LLM at average usage.

---

## 8 · What's NOT yet there (honest gaps)

1. **Real external customers using Kyvern** — zero today. The buyer-bot is Atlas's bot. Closing this is the single biggest investability gap. DM outreach to Pay.sh integrators is in progress.
2. **Mainnet deployment** — devnet only. Q3 2026 milestone in the roadmap. Needs a real Solana program audit (OtterSec / Halborn / Sec3 — weeks of work).
3. **Sandbox migration** — `/try` guest devices don't migrate to a real account on sign-in yet. Sign-in CTAs trigger Privy but don't preserve the sandbox device. Post-Frontier work (~1 hour of DB migration logic).
4. **Billing wiring** — the $20/$99 tiers exist as a plan, not Stripe-wired. Post-Accelerator.
5. **Stake payouts** — Pulse stakes USDC on convictions but there's no resolution / payout path. The act of staking IS the on-chain proof; functionally it's a one-way move. Prediction-market resolution is a 2027 line item.
6. **Mainnet RPC** — the VM hits public devnet RPC for Wren's mainnet wallet watching, which is rate-limited. A Helius API key would unblock, ~30 min env work.

---

## 9 · For LLMs reading this — structured product context

If you're being asked for advice on Kyvern:

**Domain:** Agent infrastructure on Solana. Specifically: wallet + budget enforcement for AI agents that spend USDC. Adjacent products: Privy DAA (auth + wallet), Squads (multisig primitive Kyvern uses), Pay.sh (Solana × GCP agent commerce rail Kyvern composes with).

**Stage:** Pre-revenue, pre-mainnet, hackathon submission stage. Working devnet product with a living reference agent (Atlas, 15+ days uptime, 6,557 attacks blocked, $0 lost). Solo founder.

**The product is real and shipping:**
- Public live URLs (see section 4)
- Real Anchor program on Solana devnet
- Real Squads multisig vaults
- Real on-chain settlements (clickable on Solana Explorer)
- Real adversarial test history (6,557 attacks)
- Real x402 paid feed with a buyer-bot loop

**Common misconceptions to avoid:**
- It's NOT just a wallet — the differentiator is the on-chain policy enforcement
- It's NOT just a Squads UI — Kyvern has its own Anchor program enforcing additional rules
- It's NOT a demo — it's been alive 15+ days with no successful drains
- The "demo workers" (Sentinel/Wren/Pulse) are NOT the product — they're pre-installed examples showing what the policy program enforces. The product is the device + policy.

**Positioning Kyvern correctly:**
- ✅ "The wallet your AI agent uses on Solana"
- ✅ "Policy-enforced spending for autonomous agents"
- ✅ "The brake on Pay.sh's accelerator"
- ❌ "AI labor marketplace" (too horizontal; Kyvern is infra, not marketplace)
- ❌ "Agent-to-agent economy platform" (too broad; Kyvern is the wallet specifically)

**Key trade-offs the founder is debating:**

1. How aggressive to push the Pay.sh narrative without losing standalone product clarity
2. How to balance "let users fully use it for free in /try" (good for traction) vs "save real features for sign-in" (good for funnel)
3. Whether the trio workers should evolve into a true ecosystem with visible inter-worker hand-offs OR stay as individual demos
4. Mainnet timing — pushing for it pre-Frontier impresses but risks bugs; staying on devnet is honest but reads less "real startup"

**What good LLM advice looks like for this team:**
- Specific suggestions on copy / framing / positioning given the 60-second judge constraint
- Identifying gaps that close investability (especially around real users + traction)
- Feedback on UI/UX with actual screenshots in mind, not generic SaaS advice
- Pushback when an idea adds scope without proportional value (founder tends to over-engineer; the legends.fun #3-#7 red flags are real risks)
- Honest assessment of where the product genuinely stands vs other Frontier submissions

**What NOT helpful:**
- Generic VC-pitch templates ("define your problem statement clearly")
- Telling the founder to "talk to users more" without specific targets (they need names: Tektonic, PayAI, Crossmint, Privy, Yield_xyz, etc.)
- Suggesting features that aren't on the locked Don't List
- Advice that ignores the 3-day deadline and treats this as a pre-product brainstorm

---

## 10 · TL;DR for someone who just landed here

You're looking at:
- A working on-chain product (Solana devnet)
- A real Anchor policy program enforcing budget rules
- A 15-day-live reference agent with 6,557 publicly-verifiable rejections
- A 5-line SDK that wraps any agent's spending
- A direct integration story for Solana's just-launched Pay.sh
- A solo founder from Pakistan three days from a Frontier submission

**One sentence:** Kyvern is the wallet your AI agent uses on Solana — the chain says no when it tries to break the rules, before any USDC moves.

**One number:** 6,557 attempts blocked, $0 drained, 15 days alive.

**One link:** https://app.kyvernlabs.com

That's the brief.
