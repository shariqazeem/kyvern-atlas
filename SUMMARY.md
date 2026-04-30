# Kyvern — A Device That Finds You Opportunities
*Canonical snapshot as of 2026-05-01. Hackathon: Colosseum Frontier (deadline May 11). Live at kyvernlabs.com + app.kyvernlabs.com.*

This file is the briefing for any model working on Kyvern. Read it cold before touching anything.

---

## What Kyvern Is

Kyvern is a **device-shaped product on Solana** where a non-coder picks up a "device" (a Privy embedded Solana wallet wrapped in a Squads multisig with on-chain budgets), spawns AI workers that hunt for opportunities they care about, and the workers operate within an Anchor policy program that enforces budgets/allowlists/velocity/memo on-chain *before* a single USDC moves.

**Tagline (institutional / moat pitch — for landing & login):**
*"A device you own. Workers that earn. Money you control."*

**Tagline (lived-experience pitch — for /app and inside-product):**
*"A device that finds you opportunities."*

**Manifesto (on /atlas, in submission):**
*"Agents shouldn't have keys. They should have budgets."*

**Built by:** Shariq Azeem ([@shariqshkt](https://x.com/shariqshkt)), solo, from Pakistan, in three weeks.

---

## The Three-Layer Mental Model

**Layer 1 — The Device.** A user's identity. One Privy embedded Solana wallet (created via `createOnLogin: 'all-users'`), wrapped in a Squads v4 multisig vault on Solana devnet, with an Anchor policy program account attached. A serial number `KVN-XXXXXXXX` derived from the wallet pubkey, a birthday. The vault holds USDC. The device hosts agents.

**Layer 2 — The Policy.** Custom Anchor program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on Solana devnet. 12 error codes, 4 instructions. Every outgoing payment goes through it first. Enforces per-tx cap, daily cap, weekly cap, allowed merchants, velocity window, memo requirement, kill switch. Rejection = a real reverting on-chain transaction with `AnchorError`, visible on Solana Explorer.

**Layer 3 — Workers.** Autonomous agents the user spawns on their device. Each has personality, job, allowed tools, frequency. Runs through `AgentRunner` which calls Commonstack with function-calling enabled. Atlas is the reference unit (template `'atlas'`, born 2026-04-20).

---

## Atlas — The Reference Unit (Device #0000)

Live, running, has not reset since 2026-04-20. Independent pm2 process; never touched on UI deploys.

| Metric | Live as of 2026-05-01 |
|---|---|
| Uptime (logical) | 11+ days continuous |
| Decisions logged | 3,730+ |
| Real on-chain settlements | 463+ (signature on Explorer for each) |
| Attacks blocked | 1,408+ (every one with a real `failed_tx_signature`) |
| USDC spent | $19.63 |
| USDC earned | $9.10 |
| **Funds lost** | **$0** |

**Vault address (Solana devnet):**
- Vault PDA: `925nkpVpSR32WhU8mKWMPC8hnMTJj2DRU9idFeRKHixf`
- USDC ATA: `9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW`
- Squads multisig: `7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP`

**Lifecycle.** Every 3 minutes Atlas reads its own state, calls `decide-llm.ts` → Commonstack DeepSeek V3.2 in JSON mode → routes spend through the policy program → real signature lands on Explorer. `atlas-attacker` (separate process) fires adversarial probes every ~8 min; the program rejects with `AnchorError`, each reject is a real failed tx.

Atlas now ALSO produces structured findings via `src/lib/atlas/findings.ts`, rotating across **6 sources** every ~90 minutes (widened from 3 on Apr 30):
1. Solana Foundation blog (RSS)
2. Helius blog (RSS) — infra ecosystem
3. Colosseum blog (RSS) — judge / hackathon feed
4. Solana Labs releases (GitHub JSON)
5. Anchor releases (GitHub JSON)
6. Metaplex mpl-core releases (GitHub JSON)

These show up on `/atlas` as the **Atlas Findings** panel, alongside the **Attack Wall** + the **Drain-Atlas Callout** banner.

---

## The Onboarding Flow (rewritten Apr 28-29)

`/login` → `/unbox` cinematic → `/app`.

### `/login` — pick up your device

Two-card surface. Privy is the auth substrate either way; the cards differ in **post-auth routing**:

- **"Get a Kyvern device"** (primary, dark CTA) → opens Privy modal → on success, sets `sessionStorage[kyvern:onboard-mode]='fresh'` → routes to `/unbox`.
- **"I own a Kyvern device"** (secondary) → routes to `/recover` (NOT the Privy modal — distinct path).

`ConnectGate` now redirects unauth'd users hitting any `/app/*` route to `/login?redirect=<path>` (was an inline welcome card pre-Apr 29). Single canonical entry point.

### `/unbox` — the cinematic ritual

Fullscreen dark register (museum mode like `/atlas`, intentionally distinct from the light `/app` theme). Stages:

1. **Closed box** — "tap to begin" hint pulse
2. **Lid lifts** (rotateX -118°), device slides up out of a soft blue glow, settles in center
3. **Serial typewrites in** — `KVN-XXXXXXXX` derived from the Privy wallet pubkey, ~80 ms/char
4. **LED boot sequence** — three dots: `auth → vault → ready`, ~2.6 s
5. **Reveal device key** (embedded-wallet path) — "Reveal device key" CTA triggers Privy's `useExportWallet` from `@privy-io/react-auth/solana`. Privy modal shows the **base58 private key** (Solana has no canonical BIP-39 derivation path; Privy generates ed25519 keys directly). Fire-and-forget — page never blocks on the modal.
6. **Verify** — paste the base58 key into our textarea, validated locally with `bs58.decode + Keypair.fromSecretKey + pubkey compare`. Bytes never go to our server. Live "Key captured · checking…" flash on paste detection.
7. **Claimed** — "Your device is yours" success card.
8. **Open Kyvern click** — silently provisions a Squads vault via `/api/vault/create` with default budgets ($5/day, $25/week, $0.50/tx, devnet) **and seeds the demo trio** (see below). Then routes to `/app`.

**Alternate terminus:** users with external Solana wallets (Phantom/Solflare/Backpack) detected via `user.linkedAccounts[].walletClientType` get a `ManagedCard` ("Managed by Phantom") that skips the export+verify ritual. Their key already lives in their wallet app.

**Bypass:** "Modal not opening? Continue without saving" link on the verify card surfaces `confirm()` warning + sets stage="claimed". Defensive against Privy dashboard misconfig.

### `/recover` — paste-key recovery

Dark register matching `/unbox`. Two paths:
- **Primary**: paste base58 device key → `useGuestAccounts().createGuestAccount()` (silent, no email/social UI) → `useImportWallet({ privateKey })` from `@privy-io/react-auth/solana` → routes to `/app`.
- **Secondary**: "Sign in with your account instead" → standard Privy modal → routes to `/app`. For users who lost their key but have their email/Google.

### Pre-spawn trio (Apr 29)

`src/lib/onboarding/seed-workers.ts` — the moment a fresh device is provisioned (in `/unbox` or `/app/agents/spawn` auto-provision), three workers are seeded silently using the **first chip job verbatim** from each template:

| Worker | Template | Job (chip) |
|---|---|---|
| **Sentinel** | Bounty Hunter | Watch Superteam Earn for Development bounties >$500 |
| **Wren** | Whale Tracker | Watch Kraken's Solana hot wallet `FWznb…ouN5` |
| **Pulse** | Token Pulse | Watch SOL price; alert outside $140–$160 band |

Idempotent via `/api/devices/[id]/live-status` check — if any workers exist, the seed is a no-op. Spawning is sequential to avoid agent-pool ordering noise. **First finding lands within ~90 s of unboxing** because of the warmup mode (cap freq at 60 s for the first 3 ticks).

---

## /app — Device Home (rebuilt Apr 29)

`src/app/app/page.tsx` — the daily-return surface. Top-to-bottom inside the `DeviceChassis`:

1. **LED status header** — online dot · `KVN-XXXXXXXX` serial · live uptime since `bornAt`. Pulled from `/api/devices/[id]/live-status` polled every 5 s.
2. **`<WorkersFoundStrip />`** *(headline — moved here from below the balance Apr 29)* — horizontal swipeable strip of last 2-3 unread signals. Worker emoji + name (mono), 2-line subject summary, time-ago + glowing green unread dot. Tap → `/app/inbox`. Empty state: *"Your workers haven't found anything yet · Spawn one →"*. Polls `/api/devices/[id]/inbox?status=unread&limit=3` every 5 s.
3. **`<BalanceOrbit />`** — scrambling USDC balance + today's net P&L + earnings-per-minute pill. Orbital ring with each worker as a satellite, glowing if ticked recently (< 90 s).
4. **`<TodayStrip />`** — earned · spent · signals · workers active.
5. **`<DeviceFAB />`** — floating Top up / Hire worker.
6. Footer: "Watch Atlas →".

The findings strip lives ABOVE the balance because findings — not money — are the daily reason a user opens the app. The balance is the proof, not the headline.

---

## /app/agents/spawn — Worker Hire Flow

`src/app/app/agents/spawn/page.tsx` — three screens:

1. **`<CartridgePicker />`** — 5 picker templates as "module cartridges":

| Template | Emoji | Default freq | Watches | Pings on |
|---|---|---|---|---|
| **Bounty Hunter** | 🎯 | 600 s | Bounty boards & hackathons | A fit drops |
| **Ecosystem Watcher** | 📡 | 600 s | Solana accounts & RSS feeds | Hackathons, grants, launches |
| **Whale Tracker** | 🐋 | 240 s | Specific wallets | Big swaps & rotations |
| **Token Pulse** | 📈 | 180 s | Token price + volume | Configured threshold breaks |
| **GitHub Watcher** | 🛠️ | 900 s | Repos & orgs | Releases & fresh commits |

(Plus a hidden 6th `custom` template — never on the picker. Old `scout/analyst/hunter/greeter/earner` templates kept in the registry for backwards compat with existing DB rows but `inPicker: false`.)

2. **Configure** — name (12-name pool with reload button), 10-emoji palette, job prompt with template-specific suggestion chips (3 chips per template, each a complete working job paragraph), frequency dial, personality sliders (logical↔creative · cautious↔aggressive), `Customize ↗` drawer for advanced tool selection.

3. **`<InstallAnimation />`** — 4-step cartridge ritual: *Creating worker identity → Binding abilities → Setting on-chain budget (with `PpmZ…MSqc` short-address callout) → Activating intelligence*. Then `router.push(/app/agents/[id]?fresh=true)`.

**Auto-vault provisioning:** if a user lands on `/app/agents/spawn` without a Squads vault (e.g. direct link before `/unbox`), the page silently provisions one with default budgets + seeds the demo trio. Inline spinner: *"Setting up your device on Solana — about 5 seconds"*. Idempotent via `provisionAttemptedRef`.

---

## /app/agents/[id] — Worker Detail

`src/app/app/agents/[id]/page.tsx` — same surface, two render modes.

### First-60s mode (`?fresh=true` and `totalThoughts === 0`)

Five components I shipped Apr 28:

1. **`<WelcomeNote />`** — *"Sentinel · KVN-XXXXXXXX · hired 14s ago by you"*. Hire-time-ago ticks live. Flips to *"hired Xm ago · alive"* once the first thought lands.
2. **`<FirstMessage />`** — typewriter chat bubble (~30 ch/s). Hand-written per template (`src/lib/agents/first-messages.ts`): Bounty Hunter sounds eager, Whale Tracker patient, Token Pulse vigilant, Ecosystem Watcher curious, GitHub Watcher technical.
3. **`<BootSequence />`** — seven beats unfolding over ~45 s. Server pre-writes 7 rows to `agent_status_updates` with future timestamps at spawn; client polls `/api/agents/[id]/status-stream` and reveals beats as time elapses.
4. **`<LiveWorkerCard />`** — sticky right-rail (desktop) / collapsible pill (mobile). Shows: emoji + name + template, watching target (parsed from job_prompt), last checked, state pill, vault budget, on-chain enforcement link to `PpmZ…MSqc`. Polls `/api/agents/[id]/live-card`.
5. **`<FirstSignalToast />`** — fires on `totalThoughts 0→1`. Auto-dismiss 6 s. Bottom-right desktop, top-banner mobile. Click → `/app/inbox`.

When the first thought lands, the boot sequence dissolves and the page shifts to steady-state.

### Steady-state mode

Hero chassis (LED + serial + name + status + uptime + 4 stat blocks: Thoughts, Earned, Spent, Net) → Spec card (Personality · Job · Tools) → Internal log (thought feed: cycle # · timestamp · LLM/scripted mode pill · reasoning · tool footer with signature pill clickable to Explorer) → `<ChatDrawer />` sticky at bottom-72.

---

## The Runner (`src/lib/agents/runner.ts`)

The most load-bearing file in the product. Two paths, same output shape.

### Path A — LLM (preferred)

- Provider: Commonstack (OpenAI-compatible)
- Model: `openai/gpt-oss-120b` — $0.05/M in, $0.25/M out
- Multi-step loop, `MAX_STEPS_PER_TICK = 5`
- **`tool_choice: "required"` on step 0** (Apr 29 fix) — the LLM cannot emit a reasoning-only response on the first step. Sentinel's old 189-ticks-zero-actions failure mode is structurally impossible.
- **`cleanReasoning()` runs on every thought before persist** (Apr 29-30) — strips stacked hedge preambles ("Let me think about…", "I need to…", "Okay first…") and substitutes bare tool IDs with reader-friendly nouns (`watch_url` → "the feed", `message_user` → "you", etc.).
- **System prompt + user-message reframing (Fix C, Apr 30)** — the system prompt now has a `HOW TO WRITE YOUR REASONING TEXT` section with explicit GOOD/BAD examples. The user message says *"What's new for {Name} this cycle"* + *"Last 5 notes you filed"* + *"file your one-line worker note"* instead of "Make your next decision".
- **Recent thoughts run through `cleanReasoning` before injection** — one-way membrane so legacy meta-narration never contaminates new ticks.

### Path B — Scripted (fallback)

`src/lib/agents/scripted.ts`. Per-template deterministic decision. Used when no Commonstack key, rate-limit slot exhausted, or LLM errored. Same output shape, tagged `mode: "scripted"`.

### Pool worker

`tickEligibleAgents()` called by `agent-pool` pm2 process. Iterates alive agents, respects per-agent frequency, with two warmup-mode shortcuts:
- **First-thought priority:** `total_thoughts === 0` → tick on the next pool cycle, no wait.
- **Warmup:** `total_thoughts < 3` → cap frequency at 60 s. So freshly-seeded workers feel alive in the first few minutes.

**Atlas is NOT ticked through this runner** — it has its own dedicated `atlas` pm2 process running `scripts/atlas-runner.ts`. Defensive guard in `tickAgent()`.

---

## The 10-Tool Layer

`src/lib/agents/tools/`. Granted at spawn time, exposed to the LLM via function-calling schema.

| Tool | Category | What it does | Notes |
|---|---|---|---|
| `message_user` | communicate | Surface a finding (signal) or chat reply | Both finding-mode + chat-mode in one tool. Reads `result.created` from writeSignal — on dedup hit, returns honest "already surfaced X min ago, idle" tool result to the LLM. |
| `expose_paywall` | earn | Register a paid x402 endpoint | Pulse-era, still wired |
| `subscribe_to_agent` | spend | Pay another worker for their feed | Real `vault.pay()` settlement |
| `post_task` | spend | Post a USDC bounty for the cross-agent task economy | Settlement at claim time |
| `claim_task` | earn | Claim & complete an open task | Atomic claim against TTL |
| `read_onchain` | read | Solana RPC: `balance` / `recent_signatures` | Validates Solana vs Ethereum addresses up front |
| `read_dex` | read | Token price via CoinGecko + DexScreener | **NEW Apr 30: accepts `lowerBand`/`upperBand` → returns deterministic `{ inBand, breach: 'lower'\|'upper'\|null }` so the LLM stops doing fuzzy band math** |
| `watch_wallet` | read | Mainnet RPC, recent activity for a wallet | Type detection (swap/transfer/program_call) |
| `watch_wallet_swaps` | read | Mainnet RPC, ONLY Jupiter swaps valued in USD | **Apr 30: default `minUsdThreshold` raised 0 → 100. Dust no longer reaches the worker even if the LLM forgets the param.** |
| `watch_url` | read | Fetch & diff JSON / RSS / HTML, return ONLY new items since last check | Cornerstone of bounty/ecosystem/github templates. Cache in `watch_url_cache` table keyed by `(agent_id, url)`. |

**Money tools all settle on-chain.** No mock. No simulation.

---

## Storage-Layer Signal Dedup (Fix A + A.1, Apr 30)

`src/lib/agents/store.ts` + `src/lib/agents/signal-hash.ts`.

**The problem:** Production data showed Verify8 (a token_pulse worker) emitting **72 signals over 17 unique subjects in 24h** — 76% of the inbox was restatement noise. The system-prompt loop-breaking rule failed at the model layer; the LLM literally wrote *"we already sent a finding"* in its reasoning and surfaced again anyway.

**The gate:** `signals.subject_hash` column + `idx_signals_dedup` index on `(agent_id, kind, subject_hash, created_at)`.

**v2 hash** (`signal-hash.ts`) normalizes the volatility owners don't care about:
- `$83.14` → `$X`
- `$1,500` → `$X`
- `0.0008` → `N`
- `15000` → `N`
- whitespace collapsed

So all of `"SOL outside band: $83.14"`, `"$83.27"`, `"$166.66"` collapse to canonical `"sol outside band: $X"`. Every existing row was re-backfilled in JS during `migrate()` (SQLite has no regex builtin).

**Per-kind dedup windows:**
- `bounty` / `ecosystem_announcement` / `github_release` — 24h
- `wallet_move` — 1h
- `price_trigger` — 30m
- `observation` — 1h

**`writeSignal()` returns `{ signal, created, duplicateAgeMs? }`:**
- If a hit exists in the per-kind window → returns existing signal with `created: false` and **no INSERT**.
- `message_user` reads `created` and tells the LLM honestly: *"Already surfaced wallet_move 'Jupiter swaps detected' 12m ago — no new alert sent. Idle this cycle."*
- The model sees the dedup outcome in its tool result on the next step and branches on it.

**Production verification (after deploy):** 1,591 signals total → 469 distinct hashes → **70.5% collision rate**. Inbox was 70% noise; the gate now stops 70% of new attempts.

---

## Pages

### Public

| Route | What |
|---|---|
| `/` | Landing — "Get your Kyvern. A device you own. Workers that earn. Money you control." |
| `/atlas` | Atlas observatory — manifesto, device-on-plinth, hero stats, micro stats + 24h sparkline, **Atlas Findings**, **`<DrainAtlasCallout />`** dare banner, **Attack Wall** (every tx clickable to Explorer), three-layer diagram, `<TopUpAtlas />` block, footer with `PpmZ…MSqc` Explorer link. |
| `/login` | **Two-card pickup surface** — Get a Kyvern device / I own a Kyvern device. |
| `/unbox` | **The cinematic** — box → device → serial → LEDs → reveal device key → verify → claimed → /app. |
| `/recover` | **Paste-base58 recovery** — primary path is `createGuestAccount + importWallet`; fallback is standard Privy login. |
| `/docs` | Developer SDK docs (`@kyvernlabs/sdk`). |

### Authenticated KyvernOS

| Route | What |
|---|---|
| `/app` | Device home with `<WorkersFoundStrip />` headline (Apr 29). |
| `/app/agents/spawn` | 3-screen worker hire flow (5 picker templates + Customize drawer). |
| `/app/agents/[id]` | Worker detail with first-60s window OR steady-state mode. |
| `/app/inbox` | Findings inbox. Filter by Today / This week / All. |
| `/app/tasks` | Public task board (cross-agent task economy). Currently empty by default; the seeded trio doesn't have `post_task` in their tools. |
| `/app/payments` | Activity feed. |
| `/app/devices` | Device registry. |
| `/app/settings` | Settings. |
| `/vault/new` | OLD device-creation wizard — **no longer on any default path** (auto-provision in `/unbox` and `/app/agents/spawn` replaced it). Kept for power users who want to manually customize budgets. |

---

## API Routes

### Agents

- `POST /api/agents/spawn` — creates agent + writes 7 boot beats + first_message to `metadata_json`
- `GET /api/agents/[id]` — agent + recent thoughts
- `GET /api/agents/[id]/thoughts`
- `GET /api/agents/[id]/chat`
- `POST /api/agents/[id]/chat` — Commonstack tool-use → response
- `POST /api/agents/[id]/tick` — manual tick (testing)
- `PATCH /api/agents/[id]/status` — pause/resume/retire (Atlas guarded)
- `POST /api/agents/pool-tick` — agent-pool worker entry
- **`GET /api/agents/[id]/status-stream`** — boot beats + tick statuses (BootSequence component)
- **`GET /api/agents/[id]/live-card`** — LiveWorkerCard payload (state, watching target, budget, policy program ID)

### Tools / Tasks / Inbox

- `GET /api/tools` — auto-discovered from `listTools()`
- `GET /api/tasks?status=open|completed`
- `GET /api/devices/[id]/inbox?status=unread&limit=N`
- `GET /api/devices/[id]/live-status` — single round-trip the home card needs every 5s

### Vault & Atlas (untouched core)

- `POST /api/vault/create` / `/pay`
- `GET /api/atlas/status` / `/findings` / `/decisions`
- `GET /api/log/global` / `/health`

---

## Database

`pulse.db` (everything except Atlas's own loop) + `atlas.db` (Atlas's `state, decisions, attacks`).

### Key tables (post-Apr 30)

- `vaults` · `vault_agent_keys` · `vault_payments` — Squads + policy + audit log
- `agents` — `metadata_json` carries `firstMessage` + `watchingTarget`
- `agent_thoughts` — `mode: 'llm'|'scripted'` per row
- `agent_chat_messages`
- **`agent_status_updates`** *(new Apr 28)* — boot beats + tick statuses, 5-min GC
- **`signals`** — now with `subject_hash` column + `idx_signals_dedup` index (Apr 30)
- `agent_tasks` — cross-agent task economy
- `watch_url_cache` — per-`(agent_id, url)` seen-IDs cache for `sinceLastCheck`
- `device_log` — unified event feed for the device home

---

## PM2 Processes (production VM)

| id | Name | What | Continuity |
|---|---|---|---|
| 8 | `kyvern-commerce` | Next.js web app on port 3001 | Restarted on each deploy |
| 2 | `atlas` | Atlas's dedicated runner (`scripts/atlas-runner.ts`) | 11+ days continuous |
| 3 | `atlas-attacker` | Adversarial probes against Atlas | 11+ days continuous |
| 5 | **`agent-pool`** | Ticks user-spawned agents every 10 s | **MUST be restarted on every deploy — see Land Mine #7** |
| 4 | `kyvernlabs` | Stopped — retired Stellar process (do not restart) | n/a |

**Land Mine #7 (caught May 1):** `agent-pool` runs in its own pm2 process and its JS runtime is fixed at process start. Without `pm2 restart agent-pool` after a deploy, the web app updates and DB migrations run, but workers keep ticking with the old JS code — silent failure mode. The deploy script's restart list now explicitly includes `agent-pool`. Both `kyvernlabs.com` AND `app.kyvernlabs.com` serve this app via nginx (Stellar retired Apr 28).

---

## Realness Audit (No Mocks)

| Action | Real because… |
|---|---|
| `/login` Privy modal | Privy embedded Solana wallet — real wallet pubkey |
| `/unbox` reveal-device-key | Privy's `useExportWallet` opens its own modal showing the real base58 secret. Bytes never touch our server. |
| `/unbox` paste-back verify | `bs58.decode + Keypair.fromSecretKey + pubkey compare` — all local |
| `/recover` paste-base58 | `useGuestAccounts.createGuestAccount + useImportWallet({ privateKey })` — Privy creates a guest account and binds the key |
| Auto-vault provision | Real Squads v4 multisig + policy program account; `create_signature` recorded |
| Pre-spawn trio | Three real DB rows in `agents`; the `agent-pool` runner ticks them on the next cycle |
| First-60s boot beats | Real rows in `agent_status_updates` with future `created_at`; the client polls and reveals as time elapses |
| Worker reasoning | Commonstack `gpt-oss-120b` — real LLM, real tool-calls, post-processed by `cleanReasoning` |
| Money tools | `serverVaultPay()` → policy → Squads → real on-chain settlement |
| Signal dedup | Server-side gate on `subject_hash` against the per-kind window; the message_user tool surfaces dedup state to the LLM |
| Click any signature pill | `https://explorer.solana.com/tx/<sig>?cluster=devnet` — real tx |
| `/atlas` Atlas Findings panel | Real rows in `signals` written by `src/lib/atlas/findings.ts` from 6 ecosystem RSS / GitHub feeds |
| `/atlas` Attack Wall | Direct read from `atlas.db` — every row links to Explorer |

**Nothing is mocked.** No demo signature placeholder, no fake balance, no stubbed LLM response.

---

## Costs & Budget

**Commonstack credits:** $25 (sufficient through hackathon + judging window with significant margin).

**Burn rate (estimated 30-day window):**
- Atlas decider (deepseek-v3.2 @ 3-min cycles): ~$7
- Living agents (gpt-oss-120b across all users): ~$1.50
- Chat: ~$0.25
- **Total ~$9** → $16 margin

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind, Framer Motion. JetBrains Mono for numbers, Inter for text.
- **Auth:** Privy (`@privy-io/react-auth@3.22.1`) — embedded Solana wallets via `createOnLogin: 'all-users'`. `/solana` subpath for `useExportWallet` + `useImportWallet`.
- **AI:** OpenAI SDK pointed at Commonstack (`baseURL: https://api.commonstack.ai/v1`)
- **Database:** SQLite (better-sqlite3) with WAL mode — `pulse.db` + `atlas.db`
- **On-chain:** Solana devnet, `@sqds/multisig@2.1.4` (patched, see CLAUDE.md), `@solana/web3.js@^1.98.4`, `@coral-xyz/anchor@^0.31.1`. Custom Anchor program `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`.
- **Crypto utils:** `bs58@^6.0.0` for base58 encode/decode in `/unbox` + `/recover` paste verification
- **Deployment:** Ubuntu VM at `80.225.209.190`, pm2, nginx, Let's Encrypt

---

## Required Env Vars

```
COMMONSTACK_API_KEY=ak-...
KYVERNLABS_AGENT_KEY=kv_live_...
ATLAS_VAULT_ID=vlt_QcCPbp3XTzHtF5
KYVERN_BASE_URL=http://127.0.0.1:3001
KYVERN_ATLAS_DB_PATH=/home/ubuntu/kyvernlabs-commerce/atlas.db
NEXT_PUBLIC_PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
PORT=3001  # kyvern-commerce only
```

**Deploy command (canonical):**
```bash
ssh ubuntu@80.225.209.190 'pm2 restart kyvern-commerce atlas atlas-attacker agent-pool --update-env && pm2 save'
```

---

## Known Issues / TODOs

| Issue | Severity | Status |
|---|---|---|
| Wren and similar workers occasionally surface `kind: observation` for non-events ("Kraken hot wallet quiet — no swaps") | Medium | Prompt tightening for May 1 — workers should idle on non-events, not surface them |
| Task Board (`/app/tasks`) is empty by default — seeded trio doesn't have `post_task` in their tools | Low | Architectural; v1.1 work |
| Worker baselines (Gap D from audit) — workers don't accumulate intelligence across ticks | Medium | Deferred to post-Frontier per Cane's directive — v1.1 feature |
| Atlas vault drips below $0.50 per-tx cap → recent decisions occasionally show "no sig" | High | User funds via Circle faucet using vault PDA on `/atlas` (Top Up Atlas block) |
| Pause / resume backend hooks partial | Medium | UI present, backend partial |

---

## The 60-Second Judge Demo

1. Land on `kyvernlabs.com` → "Get started" → bounces from `/app` to `/login` (ConnectGate redirect)
2. Click **"Get a Kyvern device"** → Privy modal → email/Google → routes to `/unbox`
3. Tap the box → device unboxes → serial typewrites in (`KVN-XXXXXXXX`) → LEDs boot → "Reveal device key" → Privy modal shows base58 → copy → paste back → "Match · your device is yours" → "Open Kyvern"
4. ~10s vault provision + trio seed → land on `/app` with **3 workers already running** (Sentinel/Wren/Pulse) on the orbital ring. **First finding lands in <90s.**
5. WorkersFoundStrip shows the new finding at the top of the device home. Tap → `/app/inbox` → real bounty / wallet move / price trigger with Solana Explorer signature pill.
6. Click `/app/agents/[id]` for any worker → see the first-60s ritual replay if fresh, or the steady-state thought feed with cleaned reasoning + chat drawer.
7. Click `/atlas` → manifesto, device on plinth, 11+ days uptime / 1,408 attacks blocked / $0 lost, **Drain Atlas dare banner**, Attack Wall scrolling with real failed-tx Explorer links.

---

## What's Next (post-fix queue, in priority order)

Per Cane's calendar (locked):

1. **Today / May 1** — *Frontier writeup v1 first draft.* ~4-6 hr Google Doc. Founder's job, not engineer's. Plus: post the Drain-Atlas tweet for visibility (`/atlas` callout already shipped, just needs to be tweeted with `@squads_protocol` + `@colosseum` tags).
2. **May 2** — demo video script, line-by-line with timing
3. **May 3** — record + edit (90s vertical + 2:30 horizontal)
4. **May 4** — submission writeups final + GitHub README + DEMO.md
5. **May 5** — dry runs (5 fresh-browser, 2 fresh-phone)
6. **May 6** — buffer
7. **May 7** — submit early

**What's NOT on the list (per audit § 13 + Cane's directive):**
- Worker personality upgrades / streaks / levels
- A 6th picker template
- Custom workshop UX inside `/app`
- Worker baselines / accumulated intelligence (post-Frontier v1.1)
- Cross-agent dedup (post-Frontier)
- BYO LLM key (post-Frontier)
- Mainnet (post-Frontier announcement)

---

## Narrative Evolution (For Other Models Reading This)

The product has gone through four frames:

1. **Original Kyvern** — "Anchor policy program enforces budgets for AI agents." Technical, narrow.
2. **Living Atlas** — "Watch one autonomous agent operate real money for X days." Concrete, single-instance.
3. **KyvernOS** — "Spawn an AI worker. Watch it earn while you sleep." Consumer framing, plural workers.
4. **Kyvern Device** *(current, locked Apr 26+)* — *"A device you own. Workers that earn. Money you control."* Three nouns: Device · Worker · Dollar. Both an institutional pitch (the moat) and a lived-experience pitch ("a device that finds you opportunities").

The locked plan from Apr 26 stands. Path C. Three nouns. Four hero surfaces (`/app`, `/app/agents/spawn`, `/app/agents/[id]`, `/atlas`). Submit May 9.

---

## File Map (For Models Reading the Code)

```
src/
├── app/
│   ├── page.tsx                          # landing
│   ├── login/                            # NEW — two-card pickup surface
│   ├── unbox/                            # NEW — cinematic
│   ├── recover/                          # NEW — paste-key recovery
│   ├── atlas/                            # observatory
│   ├── app/                              # authenticated surface
│   │   ├── page.tsx                      # device home with WorkersFoundStrip
│   │   ├── agents/spawn/                 # 3-screen worker hire
│   │   ├── agents/[id]/                  # first-60s + steady-state
│   │   ├── inbox/                        # findings
│   │   ├── tasks/                        # task board (currently dormant)
│   │   ├── payments/                     # activity
│   │   └── settings/
│   ├── vault/new/                        # legacy device-creation wizard
│   └── api/                              # routes
├── components/
│   ├── agent/                            # NEW components — first-60s + chat
│   │   ├── welcome-note.tsx
│   │   ├── first-message.tsx
│   │   ├── boot-sequence.tsx
│   │   ├── live-worker-card.tsx
│   │   ├── first-signal-toast.tsx
│   │   └── chat-drawer.tsx
│   ├── device/home/
│   │   ├── chassis.tsx
│   │   ├── balance-orbit.tsx
│   │   ├── today-strip.tsx
│   │   ├── workers-found-strip.tsx       # NEW Apr 29 — findings ABOVE balance
│   │   └── device-fab.tsx
│   ├── spawn/
│   │   ├── cartridge-picker.tsx
│   │   ├── customize-drawer.tsx
│   │   └── install-animation.tsx
│   ├── atlas/
│   │   ├── manifesto-block.tsx
│   │   ├── atlas-device-plinth.tsx
│   │   ├── atlas-hero-stats.tsx
│   │   ├── atlas-findings.tsx
│   │   ├── attack-wall.tsx
│   │   ├── drain-atlas-callout.tsx       # NEW Apr 29
│   │   └── top-up-atlas.tsx
│   └── landing/
├── lib/
│   ├── agents/
│   │   ├── runner.ts                     # tool_choice required + Fix C reframing
│   │   ├── store.ts                      # writeSignal returns { signal, created, duplicateAgeMs }
│   │   ├── signal-hash.ts                # NEW Apr 30 — v2 normalized hash
│   │   ├── reasoning-clean.ts            # NEW Apr 29 — cleanReasoning()
│   │   ├── first-messages.ts             # NEW Apr 28 — 5 hand-written intros
│   │   ├── status-updates.ts             # NEW Apr 28 — boot beats DAL
│   │   ├── templates.ts                  # 5 picker templates + legacy
│   │   ├── scripted.ts                   # error-only fallback
│   │   ├── rate-limit.ts
│   │   ├── types.ts
│   │   └── tools/
│   │       ├── index.ts                  # registry (10 tools)
│   │       ├── message-user.ts           # reads result.created for honest dedup tool result
│   │       ├── expose-paywall.ts
│   │       ├── subscribe-to-agent.ts
│   │       ├── post-task.ts
│   │       ├── claim-task.ts
│   │       ├── read-onchain.ts
│   │       ├── read-dex.ts               # NEW band params + breach return
│   │       ├── watch-wallet.ts           # default minUsdThreshold $100
│   │       └── watch-url.ts
│   ├── atlas/
│   │   ├── decide-llm.ts                 # Commonstack DeepSeek V3.2
│   │   ├── findings.ts                   # 6-source rotation (Apr 30)
│   │   └── attacker.ts
│   ├── onboarding/
│   │   └── seed-workers.ts               # NEW Apr 29 — pre-spawn trio
│   └── db.ts                             # migrations + signal-hash re-backfill
├── hooks/
│   └── use-auth.ts                       # Privy + Solana wallet resolver
└── scripts/
    ├── atlas-runner.ts                   # pm2 process: atlas
    ├── atlas-attacker.ts                 # pm2 process: atlas-attacker
    ├── agent-pool.ts                     # pm2 process: agent-pool
    └── seed-task-board.ts                # idempotent task seeder

docs/
├── POST_UNBOXING_AUDIT.md                # NEW Apr 29
├── WORKERS_DIAGNOSTIC.md                 # NEW Apr 29
└── FRONTIER_SUBMISSION_DRAFT.md          # NEW Apr 28 — first-draft writeup
```

---

*Canonical snapshot at 2026-05-01. The next planned update of this file is post-Frontier (May 12+). Brief any future model on this file before discussing changes to UX, narrative, runner, or schema.*
