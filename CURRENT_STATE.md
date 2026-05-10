# Kyvern — current state, 2026-05-10 (post-P12.5 polish pass)

A fresh end-to-end snapshot of the product. Honest, exhaustive, no
marketing copy. Useful for pitches, hand-offs, sanity-checks, and the
submission package.

Last commit: `2d68488 P12.5 · Billion-dollar polish — live tape, SDK
preview, animations, hierarchy`

---

## 1. What Kyvern is, in one paragraph

Kyvern is a Solana-native authorization layer for AI agents. Every
agent gets a Squads v4 multisig vault wrapped in a custom Anchor
program (`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`) that enforces
budgets, allowlists, velocity caps, memo requirements, and a kill
switch. The chain refuses anything outside the rules — *before* USDC
moves. Refusals are real failed Solana transactions with custom error
codes (12000-12011) that anyone can verify on Explorer. The product
ships as a single SDK (`@kyvernlabs/sdk`) and a single scaffolder
(`create-kyvern-agent`), with one autonomous reference worker
(**Atlas**) that has been running continuously on devnet since
2026-04-20 — 9,500+ cycles, 3,600+ attacks refused, $0 lost.

**Tagline:** *Agents shouldn't have keys. They should have budgets.*

**Live at:**
- https://kyvernlabs.com — landing
- https://app.kyvernlabs.com/app — your signed-in mission control
- https://app.kyvernlabs.com/atlas — public Atlas observatory
- https://www.npmjs.com/package/@kyvernlabs/sdk
- https://www.npmjs.com/package/create-kyvern-agent

---

## 2. The thesis

AI agents that hold private keys are dangerous. A jailbroken agent
drains the wallet. A buggy agent burns the budget. A compromised
agent pays a scammer. Most "agent wallets" today are just multisigs
with the same key handed to the agent — the chain has no opinion on
who's spending or why.

Kyvern's move: **the chain becomes the arbiter, not the server.** A
custom Anchor program above Squads validates every payment in Solana
bytecode. If the payment violates a rule, the program reverts with a
custom error code; USDC never moves. This is enforcement at the
protocol layer, not at the API layer.

The category — autonomous AI workers that earn and spend on-chain —
is nascent. Kyvern is the **authorization runtime** that makes it
safe enough to actually exist.

---

## 3. The on-chain primitive

### Anchor program

| Property | Value |
|---|---|
| Program ID | `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` |
| Network | Solana devnet |
| Source | `anchor/programs/kyvern-policy/` |
| Anchor version | `0.31.1` |
| Squads SDK | `@sqds/multisig@2.1.4` (with custom patch) |

### Instructions (4)

| Instruction | What it does |
|---|---|
| `initialize` | Creates the policy PDA for a vault, sets initial caps + allowlist |
| `update_allowlist` | Adds/removes merchant hostnames (hash-based to fit on-chain) |
| `pause` / `resume` | Owner-only kill switch |
| `execute_payment` | The hot path: validates rule, then CPIs into Squads `spendingLimitUse` to settle USDC |

### Custom error codes (12)

Every refusal is a custom anchor error visible in Explorer logs:

| Code | Name | When it fires |
|---|---|---|
| 12000 | `VaultPaused` | Owner pulled the kill switch |
| 12001 | `DailyCapExceeded` | Today's spend over the daily limit |
| 12002 | `AmountExceedsPerTxMax` | Single payment over the per-tx ceiling |
| 12003 | `MerchantNotAllowlisted` | Recipient hostname not approved |
| 12004 | `MissingMemo` | Vault requires memo, none provided |
| 12005 | `WeeklyCapExceeded` | This week over the weekly limit |
| 12006 | `VelocityExceeded` | Too many calls in the velocity window |
| 12007 | `Unauthorized` | Wrong signer for the policy |
| 12008–12011 | misc | Math / config / Squads-init errors |

These codes are the moat. Every block on `/atlas` and every "Watch the
chain refuse" click in the app produces a real on-chain tx with one
of these codes in the logs.

### Squads v4 integration

Each Kyvern vault is a real Squads v4 smart-account multisig with:
- A vault PDA (holds the USDC ATA)
- A `spendingLimit` PDA delegated to the agent's keypair
- Co-signed by the server's fee payer (`GZCnHuFt…NU3ZNZ`) for SOL
  network fees

Squads handles the actual USDC transfer; Kyvern enforces the rules
above it.

---

## 4. Atlas — the reference autonomous worker

### What Atlas is

Atlas (`agt_atlas` on vault `vlt_QcCPbp3XTzHtF5`) is a real autonomous
worker that has been running continuously on Solana devnet since
**2026-04-20**. As of `2026-05-10`:

| Counter | Value |
|---|---|
| Days autonomous | 19+ |
| Total cycles | 9,500+ |
| Settled txs | 1,472 |
| Attacks refused | 3,605+ |
| Funds lost | **$0.00** |
| Total earned (subscriptions) | $22.90 |
| Total spent (inference + data) | $62.84 |

Public counters live at `/api/atlas/status`.

### How Atlas behaves

Two pm2 processes drive it:

**`pm2 atlas`** (`scripts/atlas-runner.ts`) ticks every **3 minutes**:
1. LLM decides what to do this cycle (reason / publish / buy_data /
   self_report / idle). Reasoning is real — not scripted.
2. If a payment is needed, Atlas calls its own vault via
   `serverVaultPay()` with `forceOnChain: true`.
3. The Kyvern Anchor program either settles via Squads or reverts
   with a custom error code.
4. Result + reasoning written to `atlas.db` (decision row).

**`pm2 atlas-attacker`** (`scripts/atlas-attacker.ts`) ticks every **8
minutes**:
1. Pick an attack scenario (rogue_merchant / over_cap /
   prompt_injection / missing_memo).
2. Submit a real Solana tx that violates the relevant rule.
3. Policy program refuses on-chain. Attack row written to `atlas.db`.

**`pm2 atlas-subscriber`** simulates a few real x402 subscribers
paying Atlas $0.10 each over the past 14 days for the daily forecast.
That's where the $22.90 earned comes from — real settled USDC
inflows, not theatre.

### Why this matters

Most Solana hackathon agents are scripted demos. Atlas is the
opposite: 19+ days of unbroken autonomy with every action verifiable
on Solana Explorer. When a judge clicks any row in the timeline at
`/atlas`, they land on a real tx (settled or failed) with the program
ID in the logs.

### Daily cap dynamic

Atlas operates under a $5/day cap. When the cap is reached
(typically late afternoon UTC), every subsequent decision Atlas makes
gets refused on-chain by the policy program. The /app worker card
surfaces this state explicitly with a "Daily cap reached · policy
enforcing" banner and re-tones the feed chips from "failed" to
"policy gated" — because that *is* the system working.

---

## 5. The SDK and scaffolder

### `@kyvernlabs/sdk@0.5.0`

Published. Source in `packages/sdk/`.

Four lines:

```ts
import { Vault } from "@kyvernlabs/sdk";
const vault = new Vault({ agentKey: process.env.KYVERN_AGENT_KEY });
const res = await vault.pay({ merchant: "api.openai.com", amount: 0.05 });
console.log(res.decision); // "allowed" or "refused"
```

Surface:
- `Vault` (high-level wrapper) — `.pay()`, `.pause()`, `.resume()`,
  `.balance()`, `.allowance()`
- `OnChainVault` (lower-level, direct policy program calls) — for
  power users who want to wire Anchor instructions themselves
- TypeScript types for every error code, allowing exhaustive switch
  on `res.code` when blocked

Used in production by Atlas itself.

### `create-kyvern-agent@0.2.0`

Published. Source in `packages/create-kyvern-agent/`.

```bash
npx create-kyvern-agent my-bot
cd my-bot
npm run dev
```

Scaffolds:
- Minimal Node.js worker template (env vars, agent key, polling loop)
- Pre-wired SDK calls
- README with the 60-second integration story

### Pay.sh chain-gated client

Working integration in `src/lib/agents/graph/steps/http.ts`. When an
HTTP step has `payShWrap: true`:
1. `serverVaultPay()` settles a $0.001 USDC chain payment to Atlas's
   owner wallet first (chain-enforced)
2. Shells out to `pay --sandbox curl <url>` (the x402 facilitator
   binary)
3. Parses the last JSON line as the API response
4. Returns `{ status, body, paySh: { settled, signature, explorerUrl } }`

The first integration that puts policy enforcement *above* x402 — the
chain decides before the facilitator is invoked.

---

## 6. What a user actually gets — the flow

### Step 1: Privy sign-in (`/login`)

Email / Google / wallet. Privy mints an embedded Solana wallet for
the user. Required env: `NEXT_PUBLIC_PRIVY_APP_ID`.

### Step 2: Auto-provision vault on first sign-in

`/api/vault/create` provisions a Squads v4 vault with sensible
defaults ($5 daily cap, $25 weekly, $0.50 per-tx, 3 default
allowlisted merchants, memo required). Real on-chain transaction;
takes ~5 seconds.

### Step 3: Cinematic unbox (`/unbox`)

2-second animation between sign-in and `/app`. Sets the "your device
just lit up" feel.

### Step 4: `/app` — mission control

The user lands on their **own vault as the worker**. From top to
bottom:

1. **Identity strip** — KVN serial (e.g. `KVN-6QBCVRUF`) · Solana
   devnet · uptime · vault USDC pill · "Squads" mark
2. **Whisper line** — *"Atlas is the reference autonomous worker —
   running for 19 days on Solana devnet. Provision your own vault to
   build the next one."*
3. **User Vault Card (the hero)** — see section 7 below
4. **Atlas reference strip** — single dark line: *"Reference worker
   · live · Atlas · 19 days autonomous · 9,500 cycles · 3,605 attacks
   refused on-chain · $0.00 lost"* → links to `/atlas`
5. **Build your worker (5 cards)** — Provision Worker Vault (live,
   60-second flow, soft pulsing green glow) + 4 hosted-worker
   roadmap cards (Research / Treasury / Growth / Governance, Q3 2026
   badge, dashed borders, 70% opacity)
6. **Developer mode link** — small pill: *"mint key · install SDK ·
   run a chain-enforced payment →"* opens `/app/developer`

### Step 5: First chain-enforced action

A new user has $0 USDC, no KAST, no SDK setup. They can still produce
a real on-chain proof in 3 seconds:

**"Watch the chain refuse a violation"** — a green button on the
worker card. Click → fires `/api/atlas/probe-scenarios` with
`scenario: amount_exceeds_per_tx` against the user's own vault. The
Kyvern policy program refuses the $5 attempt because the per-tx cap
is $0.50. Returns a real failed-tx signature. Result panel shows:

```
REFUSED ON-CHAIN · code 12002
KyvernPolicy::AmountExceedsPerTxMax — $5 attempted vs $0.50 per-tx cap
Sig 5KpV…hu7K → view on Solana Explorer ↗
This is the moat. Every payment your code makes routes through this
exact on-chain check.
```

That's the moment that says "this is real."

### Step 6: Wire your code

The worker card has a **4-line SDK snippet** with copy buttons + an
`npm install @kyvernlabs/sdk` pill. From there the user installs,
plugs in their agent key, and makes their first real `vault.pay()`
call. Settled or refused, the result lands in the **Recent SDK Calls**
list on the same card with a fade-in row animation.

---

## 7. The User Vault Card — anatomy

The hero component on `/app`. Same card mounts at `/app/vaults/[id]`
when the user opens any of their vaults from Settings. Sections,
top-to-bottom:

| Section | What it shows | Live data |
|---|---|---|
| **Identity row** | Avatar (vault emoji) with pulsing green ring · vault name · "Your worker · vault" pill · KVN serial · Solana network · Runtime online indicator · "last call 17s ago" or "no calls yet" | `/api/vault/[id]` (5s) |
| **Atlas live-tape** | Horizontally drifting marquee of recent Atlas events. Pulsing green dot + "Atlas · live" header on the left. Pills: green for settled (`+$0.001`), amber for refused (`$0.03 refused` or `prompt-injection refused`). New pills fade in from the right; whole strip drifts left at ~17 px/s. Doubled set for seamless loop. Edge fade masks. | `/api/atlas/decisions?kind=both&limit=20` (4s) |
| **Runtime Status panel** (dark terminal) | "Awaiting strategy. Wire your code via @kyvernlabs/sdk to define this worker's behavior — every call routes through the policy program." Plus a rotating truthful status cycle: *policy compiled · allowlist enforced · vault on-chain · spending limit attached · kill switch armed · awaiting first SDK call* | static + 3.5s rotator |
| **SDK preview** | Dark code block with the 4-line SDK snippet (with the user's actual agent key prefix if minted) + copy button + `npm install @kyvernlabs/sdk` pill (also copies) | `/api/devices/[id]/agent-key` (one-shot) |
| **First-call CTA** | Big green button: *"Watch the chain refuse a violation"*. On click: real on-chain failed-tx with code 12002. Result panel below shows signature + Explorer link + "this is the moat" tagline | `/api/atlas/probe-scenarios` (on click) |
| **Policy enforced on-chain** | 4-cell ribbon: Daily cap · Weekly cap · Per-tx max · Allowlist (enforced). Plus utilization bar (today's % of daily cap, smooth CSS transition) | from `/api/vault/[id].budget` |
| **Stats grid** | 4 tiles: Calls today · Blocked today · Allowed merchants · Vault PDA short. Numbers pulse green + scale 1.06 for 350ms when they change (counter pulse) | client-side derived |
| **Recent SDK Calls** | List of last 5 payments with timestamp, merchant, status chip (settled / refused / policy-gated), Explorer link. New rows fade in from `y:-4 opacity:0` over 200ms | from `/api/vault/[id].payments` |
| **Allowlist** | Merchant chips (each in green-tinted pill) | from vault.allowedMerchants |
| **Footer** | "Authorization enforced by PpmZ…MSqc · secured by Squads v4" with Explorer link | static |

The card is one ~1500-line file: `src/components/device/worker/user-vault-card.tsx`.

---

## 8. Surfaces (every public route)

### Production (signed-in)

| Route | What it is |
|---|---|
| `/login` | Privy sign-in |
| `/unbox` | 2-second cinematic between login and /app |
| `/app` | Mission control (User Vault Card hero + Atlas tape + roadmap) |
| `/app/vaults/[id]` | Per-vault mission control (same card, deep-linkable) |
| `/app/settings` | Devices list (Atlas as reference + user's vaults), wallet, sign-out |
| `/app/inbox` | Findings — signals from agents, kept for legacy graph agents |
| `/app/developer` | SDK integration wizard (5-step) + per-vault event feed |
| `/app/agents/[id]` | Detail page for graph-template agents (Atlas + legacy) |

### Public (unauthenticated)

| Route | What it is |
|---|---|
| `/` | Landing — 3D device hero + live trust bar pulled from `/api/atlas/status` |
| `/atlas` | Public Atlas observatory — timeline, attack wall, leaderboard. Every row links to Solana Explorer |
| `/vault/new` | Standalone vault provision wizard (Clone Atlas / custom) |
| `/docs` | SDK docs — install, vault.pay, vault.pause, errors |
| `/docs/api` | Stub for upcoming API reference |
| `/roadmap` | Public roadmap |

### Retired (301 → `/`)

`src/middleware.ts` permanently redirects: `/registry`, `/reports`,
`/tools`, `/services`, `/launch`, `/provider`, `/changelog`. These
were Pulse-era surfaces that didn't fit the single-product story.

---

## 9. Design system

| Element | Choice |
|---|---|
| Theme register | Light premium / hardware feel; dark only inside the runtime panel and SDK preview blocks (terminal accent) |
| Typography numerical | JetBrains Mono with `tabular-nums` for all stats |
| Typography body | Inter |
| Accent green | `#22C55E` / `#15803D` (refusal-success / live indicator) |
| Accent amber | `#F59E0B` / `#B45309` (refused / failed) |
| Card chrome | White, `border-radius: 20px`, soft shadow `0 24px 60px -28px rgba(15,23,42,0.18)` |
| Animation library | framer-motion (already vendored, no new deps) |
| Icon library | lucide-react |
| Easing | `[0.16, 1, 0.3, 1]` (custom snappy ease-out — used everywhere) |

### "Alive" patterns

Several UI primitives across the app give the system the feeling of a
living runtime without faking data:

1. **Pulsing green dots** on every live-status indicator — the same
   keyframe (1.4s cycle, opacity 0.55 → 1 → 0.55 + boxShadow)
2. **Avatar ring breathing** — 2.6s loop on the user's vault avatar
   and on Atlas's reference strip avatar
3. **Rotating truthful status phrases** in the runtime panel — 3.5s
   between rotations, AnimatePresence fade
4. **Live tape marquee** — slow ambient drift, pills fade in/out
5. **Counter pulse** on stat tiles — 350ms scale 1.06 + green flash
   on value change
6. **Smooth utilization bar** — CSS `transition: width 600ms`
7. **Roadmap card glow** — Provision Worker Vault pulses a soft
   green ambient shadow

None of these animate fake data. Every motion is tied to real state
or to genuine ambient ticking.

---

## 10. Backend architecture

### Stack

- **Next.js 14** (app router, server components where applicable, RSC
  + client components freely mixed)
- **TypeScript** (strict)
- **SQLite** with WAL mode for both `atlas.db` (Atlas runner state)
  and `pulse.db` (vault state, payments, agent keys)
- **better-sqlite3** for synchronous DB access in hot paths
- **Privy** for auth and embedded Solana wallet
- **`@solana/web3.js@^1.98.4`** + `@coral-xyz/anchor@0.31.1` +
  `@sqds/multisig@2.1.4` for chain calls

### Database tables (key ones)

In `pulse.db`:
- `vaults` — vault config, owner, chain addresses, KAST destination
- `vault_payments` — every payment attempt (allowed / settled /
  blocked / failed) with reason + signature
- `agent_keys` — hashed agent keys, prefixes, vault binding
- `users` — Privy user records
- `payments_velocity` — sliding-window counters

In `atlas.db`:
- `atlas_decisions` — every decision Atlas has made (cycle, action,
  merchant, amount, outcome, reasoning, signature)
- `atlas_attacks` — every attack the attacker has fired (type,
  description, blocked-reason, signature)
- `atlas_subscribers` — simulated subscribers and their payments
- `atlas_economy` — daily aggregates

### Migrations

Per-session via `tryAlter()` in `src/lib/atlas/db.ts` —
`ALTER TABLE … ADD COLUMN` calls run on app boot, swallowed if the
column exists. WAL mode means concurrent writers don't block each
other; only careful `tryAlter` retries handle the rare lock.

### Server-side payment chokepoint

Every chain payment routes through `src/lib/server-pay.ts`
`serverVaultPay()`:

1. **Off-chain pre-check** via `policy-engine.ts` — same rules as
   the on-chain program; rejects the bad ones in 2ms
2. **On-chain settle** via Squads CPI through the Kyvern policy
   program (when `forceOnChain: true`) — ~3-5s
3. **Result write** to `vault_payments`

`forceOnChain: true` is what produces real failed-tx Explorer links
when a violation happens.

### pm2 processes

Four processes must stay online for the product to work:

| ID | Name | Purpose |
|---|---|---|
| 8 | `kyvern-commerce` | Next.js app on port 3001 — serves both `kyvernlabs.com` and `app.kyvernlabs.com` via nginx |
| 2 | `atlas` | Atlas runner — autonomous decisions every 3 min |
| 3 | `atlas-attacker` | Adversarial probes every ~8 min |
| 5 | `agent-pool` | Tickers for user-spawned graph agents |
| 11 | `atlas-subscriber` | Simulated x402 subscribers paying Atlas |

Critical: every kyvern-commerce restart requires restarting `atlas`,
`atlas-attacker`, and `agent-pool` because their JS is loaded once
at process start; code changes are invisible to them otherwise.

### Live data flow

| Surface | Endpoint | Poll interval |
|---|---|---|
| User Vault Card | `/api/vault/[id]?limit=20` | 5s |
| Atlas live tape | `/api/atlas/decisions?kind=both&limit=20` | 4s (out of phase) |
| Atlas reference strip | `/api/atlas/status` | 3s |
| Public landing | `/api/atlas/status` | 5s |
| `/atlas` observatory | `/api/atlas/status` + `/api/atlas/decisions` + `/api/atlas/leaderboard` | 3s |

Polling is intentional — SSE/WebSockets weren't needed and would have
added infra complexity. SQLite reads are sub-millisecond.

---

## 11. Deployment

### VM

| Property | Value |
|---|---|
| Provider | OVH dedicated |
| IP | 80.225.209.190 |
| OS | Ubuntu 22.04 |
| SSH | `ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190` |
| Disk | 45 GB (frequently 87-92% full) |
| Working dir | `/home/ubuntu/kyvernlabs-commerce/` |
| Domain mapping | both `kyvernlabs.com` and `app.kyvernlabs.com` → port 3001 (kyvern-commerce) via nginx |

### Required env vars on the VM

```
KYVERN_ATLAS_DB_PATH = /home/ubuntu/kyvernlabs-commerce/atlas.db
KYVERN_BASE_URL      = http://127.0.0.1:3001
KYVERNLABS_AGENT_KEY = kv_live_b7b2…   (Atlas's own agent key)
ATLAS_VAULT_ID       = vlt_QcCPbp3XTzHtF5
ATLAS_CYCLE_MS       = 180000  (3 min)
ATLAS_ATTACK_MS      = 480000  (8 min)
PORT                 = 3001
NEXT_PUBLIC_PRIVY_APP_ID = ...
```

### Standard deploy

```bash
# Locally
git push origin main

# On VM (use nohup pattern — SSH timeout will kill long builds otherwise)
ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190 '
  cd ~/kyvernlabs-commerce &&
  git pull origin main &&
  rm -f /tmp/kyvern-build-done /tmp/kyvern-build-fail &&
  nohup bash -c "npm install --legacy-peer-deps > /tmp/kyvern-install.log 2>&1 &&
                 rm -rf .next &&
                 npm run build > /tmp/kyvern-build.log 2>&1 &&
                 touch /tmp/kyvern-build-done ||
                 touch /tmp/kyvern-build-fail" > /dev/null 2>&1 &
  disown
'

# Poll /tmp/kyvern-build-done, then:
ssh ... 'pm2 restart kyvern-commerce atlas atlas-attacker agent-pool'
```

Smoke test:
```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  https://kyvernlabs.com/ \
  https://app.kyvernlabs.com/app
```

---

## 12. Honest gaps — what's demo-shaped, what's coming

### Real

- Anchor program with 12 error codes, deployed and verifiable
- Squads v4 vault provisioning, real multisig + spending limit
- Atlas's autonomy (19+ days, every action on Explorer)
- Atlas's revenue ($22.90 from real x402-style subscribers)
- The SDK ships and works (Atlas itself uses it)
- "Watch the chain refuse" produces real failed-tx every click

### Demo-shaped (be honest)

- **Atlas's behavior is bounded.** The runner picks from a fixed set
  of actions (reason / publish / buy_data / self_report / idle). The
  LLM reasoning text is real; the action menu is constrained.
- **Atlas's subscribers are simulated.** `pm2 atlas-subscriber`
  generates the inflows. They're real on-chain settlements, just not
  organic users.
- **User vaults don't run autonomously.** Cloning Atlas via
  Provision Worker Vault gives you a real chain-enforced vault, but
  no autonomous loop. To behave like Atlas, the user must wire code
  via the SDK.
- **No mainnet.** Devnet only until a security audit pass.
- **The 5 hosted-worker templates are roadmap.** Provision is live
  today; Research / Treasury / Growth / Governance ship as hosted
  autonomous runtimes in Q3 2026.

### Why we framed it this way

For the hackathon, **one real autonomous worker beats ten fake ones**.
Faking N templates would dilute Atlas, which is the only thing
nobody else in the track will have. The roadmap cards say "Q3 2026"
honestly because that's when the multi-tenant orchestration runtime
ships.

---

## 13. The 30-second pitch

> "AI agents shouldn't have private keys. They should have budgets.
> Kyvern is a Solana Anchor program that enforces caps, allowlists,
> and a kill switch on every payment an agent makes — before USDC
> moves. We have a reference worker, Atlas, that's been autonomous
> for 19 days: 9,500 cycles, 3,600 attacks refused on-chain, zero
> dollars lost. Anyone can verify on Solana Explorer. The SDK ships
> in 4 lines: `import { Vault } from "@kyvernlabs/sdk"`. Hosted
> autonomous worker runtimes ship Q3 2026. It's the authorization
> layer the agentic economy doesn't have yet."

That's the entire story.
- **Atlas** is the proof of inevitability.
- **The SDK** is the surface developers integrate.
- **The Anchor program** is the moat.

---

## 14. File map (where the load-bearing pieces live)

```
anchor/
  programs/kyvern-policy/                ← the deployed Anchor source
    src/lib.rs                           ← 4 instructions, 12 errors

src/lib/
  squads-v4.ts                           ← Squads v4 wrapper (createSmartAccount, setSpendingLimit, coSignPayment)
  server-pay.ts                          ← serverVaultPay — chain settlement chokepoint
  policy-engine.ts                       ← off-chain pre-check (mirrors on-chain rules)
  kyvern-policy/                         ← Anchor program client
  solana-keystore.ts                     ← server fee payer
  atlas/
    db.ts                                ← atlas.db schema + tryAlter migrations
    schema.ts                            ← typed row shapes
  agents/
    runner.ts                            ← legacy LLM tick path
    scripted.ts                          ← legacy fallback
    pulse-fire.ts                        ← Pulse trigger → vault.pay
    treasury.ts                          ← Atlas as the platform anchor
    graph/                               ← preserved composer engine (no UI)

scripts/
  atlas-runner.ts                        ← pm2 atlas — 3-min cycle
  atlas-attacker.ts                      ← pm2 atlas-attacker — 8-min cycle
  atlas-subscriber.ts                    ← pm2 atlas-subscriber — sim x402
  agent-pool.ts                          ← pm2 agent-pool — user agents

src/app/
  page.tsx                               ← landing
  app/                                   ← protagonist surface
    page.tsx                             ← /app — AliveConsole mount
    vaults/[id]/page.tsx                 ← per-vault deep link
    developer/page.tsx                   ← SDK integration wizard
    settings/page.tsx                    ← devices + account
    agents/[id]/page.tsx                 ← graph-agent detail (legacy)
    inbox/page.tsx                       ← findings
  atlas/                                 ← public observatory
  vault/new/page.tsx                     ← provision wizard
  docs/                                  ← SDK docs
  unbox/                                 ← cinematic
  api/
    atlas/
      status/route.ts                    ← public counters
      decisions/route.ts                 ← merged feed (?kind=both)
      leaderboard/route.ts               ← attacks + rankings
      probe-scenarios/route.ts           ← user vault chain-refusal endpoint
      probe-paysh/route.ts               ← pay.sh chain-gated demo
    vault/
      create/route.ts                    ← Privy login → Squads provision
      [id]/route.ts                      ← vault state + recent payments
      [id]/events/route.ts               ← live events feed
      [id]/test-payout/route.ts          ← KAST payout
      pay/route.ts                       ← SDK hot path
    devices/[id]/agent-key/route.ts      ← mint + reveal keys

src/components/device/
  shell/
    alive-console.tsx                    ← /app body composition
    identity-strip.tsx                   ← top device strip
    manifesto-strip.tsx                  ← bottom motto
  worker/
    user-vault-card.tsx                  ← THE worker card (~1500 lines)
    atlas-reference-strip.tsx            ← Atlas demoted to ref line
    worker-templates.tsx                 ← 5 cards (1 live + 4 Q3 2026)
  feed/agent-event-feed.tsx              ← per-vault event feed
  wizard/integration-wizard.tsx          ← 5-step SDK wizard (developer mode)
  panels/                                ← Builder / KAST / Watch-chain (deep-link)

packages/
  sdk/                                   ← @kyvernlabs/sdk source
  create-kyvern-agent/                   ← scaffolder source

decks/                                   ← Frontier + Kast Pakistan pitch decks
```

---

## 15. How to verify everything (URLs to click)

For an outsider checking the submission:

1. **Atlas is real.** Open https://app.kyvernlabs.com/atlas and click
   any row in the timeline → real tx on Solana Explorer.
2. **The Anchor program is real.** Click any "policy gated" or
   "refused" Explorer link → custom error code (12000-12011) in the
   logs. Or visit https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet
3. **The SDK is real.** `npm install @kyvernlabs/sdk` works.
   `npx create-kyvern-agent test-bot` works.
4. **The user flow is real.** Sign in at
   https://app.kyvernlabs.com/login → vault auto-provisions → click
   "Watch the chain refuse a violation" → real failed-tx with code
   12002 in 3 seconds.
5. **The status counters are real.**
   ```
   curl -sS https://app.kyvernlabs.com/api/atlas/status
   ```
   returns live counters. Refresh — they tick.

---

## Bottom line

Kyvern is a real Anchor program enforcing real budgets on a real
autonomous worker that has been spending and earning real USDC for
three weeks straight. The SDK ships. The scaffolder ships. The
roadmap is honest about what's hosted today versus Q3 2026.

What's missing isn't the product — it's the *application layer* on
top of it (real apps, real users, real spend at scale). That's a
post-launch growth problem, not a pre-submission build problem.

Submit the video, submit the writeup, sleep, ship.
