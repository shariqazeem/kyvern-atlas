# Kyvern — Architecture & Design

A reference for the live product at `app.kyvernlabs.com`. Captures the
runtime, the data model, every API route, the tool layer, every visible
UI surface, and the end-to-end flows that connect them.

---

## 1. One-line product

**A Kyvern is a device that hunts opportunities for you 24/7 with on-chain economic identity.**
Workers find things in the world (bounties, announcements, wallet moves,
price triggers, releases), structure them as **signals**, and surface
them in an **Inbox**. The chain enforces budgets and limits — the model
just decides what to look for.

User-facing strings never contain: agent · policy program · MCP · SDK · x402 · OS.
Translations: agent → worker · policy program → budget · x402 → paid endpoint.

---

## 2. Stack & runtime

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind, Framer Motion |
| Auth | Privy (email / Google / wallet). `NEXT_PUBLIC_PRIVY_APP_ID` required to render |
| On-chain | `@sqds/multisig@2.1.4` (Squads v4) + custom Anchor program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` |
| Solana RPC | Devnet for vault state, Mainnet for read-only watch_wallet / Jupiter |
| LLM | Commonstack OpenAI-compatible gateway. `openai/gpt-oss-120b` for runner + chat. `deepseek/deepseek-v3.2` for Atlas decider (strict JSON) |
| DB | SQLite (`pulse.db`, `atlas.db`) via better-sqlite3, WAL mode |
| Process supervisor | pm2 |
| Hosting | Single VM (Hetzner-class), 4 pm2 processes |

Four pm2 processes (all must stay online):

| Process | What it does |
|---|---|
| `kyvern-commerce` | Next.js server on port 3001 |
| `atlas` | `scripts/atlas-runner.ts` — Atlas's own 3-minute decision loop, settles on-chain |
| `atlas-attacker` | `scripts/atlas-attacker.ts` — adversarial txs every ~8 min, prove-by-failing |
| `agent-pool` | `scripts/agent-pool.ts` — ticks user-spawned workers per their `frequencySeconds` |

---

## 3. Database schema

Tables are migrated additively via `tryAlter` in `src/lib/db.ts` so a
deploy never has to do a hard schema rewrite. Skipping bookkeeping
columns; only the load-bearing ones below.

### `vaults`
Per-user device. One row per spawned vault.
```
id (PK)              vlt_<14char nanoid>
owner_wallet         Privy wallet address
name, emoji, purpose user-facing labels
daily/weekly/per_tx  USD caps (enforced on-chain by Squads + Kyvern policy)
allowed_merchants    JSON array
require_memo         bool
squads_address       Squads multisig PDA (NOT NULL — placeholder ok for tests)
network              "devnet" | "mainnet"
paused_at            soft pause flag, reflected on-chain
```

### `agents`
A worker spawned on a vault.
```
id (PK)              agt_<nanoid>
device_id            FK → vaults.id
template             "bounty_hunter" | "ecosystem_watcher" | "whale_tracker" | "token_pulse" | "github_watcher" | "atlas" | …
name, emoji          identity
status               "alive" | "paused" | "retired"
job_prompt           the chip's job (or user's custom)
allowed_tools        JSON array of tool ids
frequency_seconds    cadence the agent-pool uses
total_thoughts       monotonically increases each tick
last_thought_at      ms timestamp
total_earned_usd     from inbound x402 / settled payments
total_spent_usd      from outbound vault.pay
```

### `agent_thoughts`
Append-only log of per-step thoughts (multi-step ticks → multiple rows).
```
id (PK)
agent_id             FK → agents.id
thought              LLM reasoning text
tool_used            id if step was a tool call, null if observe
signature            Solana sig if a money tool was used
amount_usd           dollar amount of action
mode                 "llm" | "scripted" — provenance
timestamp            ms
```

### `signals` (Path C — what the worker found)
The structured findings surface. One row per finding produced via
`message_user` in Finding mode.
```
id (PK)              sig_<random>
agent_id             FK → agents.id
device_id            FK → vaults.id (denormalised for cheap inbox query)
kind                 "bounty" | "ecosystem_announcement" | "wallet_move" | "price_trigger" | "github_release" | "observation"
subject              ≤80-char headline
evidence_json        2-4 fact bullets serialised
suggestion           optional one-line action
signature            optional Solana sig (e.g. swap tx)
source_url           optional URL the owner clicks to verify
status               "unread" | "read" | "archived"
created_at           ms
```

### `watch_url_cache`
Per-(agent, url) dedupe state for the `watch_url` tool, so workers
only surface NEW items each cycle.
```
agent_id, url        composite PK
last_response_hash   md5 of last raw body (for change detection)
last_seen_ids        JSON array of item ids seen so far
last_check_at        ms
```

### `device_log`, `chat_messages`, `task_board`, `device_attacks` …
Bookkeeping tables. Mostly self-explanatory from filename:
- `device_log` — activity feed (spawn, ability install, payments, attacks)
- `chat_messages` — direct user↔worker chat (NOT signals; user-initiated only)
- `task_board` — open tasks workers can post / claim
- `device_attacks` — Bounty mode attack records

---

## 4. API routes

### Public (no auth)
```
GET  /api/atlas/status                  Atlas live snapshot
GET  /api/atlas/decisions?kind=...      Atlas timeline / attacks
GET  /api/atlas/findings                Atlas's signals (Path C — last 7 days)
POST /api/atlas/probe                   Adversarial probe (bearer auth)
POST /api/atlas/funded-by-me            Treasury → Atlas drop ($5)
GET  /api/vault/list?ownerWallet=...    Vaults for a wallet
```

### Vault / device
```
POST /api/vault/new                     Deploy + Squads init
GET  /api/vault/[id]                    Detail
POST /api/vault/[id]/pause              Pause via Anchor
GET  /api/devices/[id]/live-status      5-second poll: serial, balance, sparkline,
                                        workers (with template + lastThoughtAt for
                                        the watching pulse), signalsToday, lastAction
GET  /api/devices/[id]/inbox            Signals + worker name/emoji
GET  /api/devices/[id]/log              Activity feed
```

### Workers (agents)
```
POST /api/agents/spawn                  Create worker. Body: deviceId, template, name, jobPrompt
GET  /api/agents/[id]                   Detail
POST /api/agents/[id]/tick              Manual tick (used by verify-chips)
GET  /api/agents/[id]/thoughts          Step-thoughts (cycle log)
GET  /api/agents/[id]/chat              User↔worker messages
POST /api/agents/[id]/chat              Send a message to the worker
POST /api/agents/[id]/status            Pause / resume / retire
```

### Signals (Path C)
```
POST /api/signals/[id]/mark-read        Toggle status: unread/read/archived
```

### Tasks / endpoints
```
GET  /api/tasks                         Open task board
POST /api/tasks                         Post a task
POST /api/endpoints/register            Register an x402 paid endpoint
GET  /api/endpoints/list                Atlas greeter reads this
```

---

## 5. Tool layer (`src/lib/agents/tools/`)

The LLM has access to a tool registry. Each tool has a schema (OpenAI
tool-call format), a `category` ("read" / "money"), and an `execute`
handler. Multi-step loop in `runner.ts` (max 5 steps per tick) feeds
tool responses back to the LLM so it can chain calls (e.g. watch_url
returns 6 bounties → message_user 6 times).

| Tool | Purpose | Cost |
|---|---|---|
| `watch_url` | Generic HTTP poller. Fast paths: Superteam JSON, RSS/Atom regex parser, GitHub releases. Dedupes via `watch_url_cache` | free |
| `watch_wallet` | Mainnet RPC `getSignaturesForAddress` + parse type/tokenChanges/programs | free |
| `watch_wallet_swaps` | Same but filters to Jupiter program calls + values in USD via DexScreener | free |
| `read_dex` | Token price. CoinGecko first (symbols), DexScreener fallback (mints) | free |
| `read_onchain` | Account data inspection | free |
| `expose_paywall` | Register a paid endpoint via x402 | free to call |
| `subscribe_to_agent` | Subscribe to another agent's feed (vault.pay) | $cost varies |
| `post_task` | Post a task to `task_board` (locks budget) | $bounty |
| `claim_task` | Claim a posted task | none |
| `message_user` | TWO MODES by input shape: |  |
| └─ Finding mode | `{kind, subject, evidence, suggestion?, sourceUrl?}` → writes a `signals` row | free |
| └─ Chat mode | `{message: string}` → writes a `chat_messages` row (only used when replying to a direct message) | free |

### Runner system prompt highlights (`src/lib/agents/runner.ts`)
- Multi-step loop (max 5 steps per tick)
- **First-tick rule**: when `Recent thoughts: (none — first tick)`, must surface at least one finding if the data tool returned anything
- **Tool-failure rule**: never surface `ok=false` returns as a signal
- **Loop-breaking rules**: don't re-surface the same finding, idle when blocked on owner reply, idle after 2 consecutive identical tool errors

### Scripted fallback (`src/lib/agents/scripted.ts`)
If no Commonstack API key OR rate-limited, the runner falls back to per-template scripted decisions. Same `recordAgentTick` shape — same UI.

---

## 6. UI surfaces

Two visual registers:

**Light / "OS" register** — `/app/*` surfaces. White cards, soft shadows,
Inter 13–14px body, mono for numbers and timestamps.

**Dark / "hardware" register** — `/`, `/atlas`, the device hero card on
`/app`, empty states, the spawn birth animation. Radial gradient
`120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%`, fine-grain
SVG noise overlay at opacity 0.022, JetBrains Mono for stats.

Locked entrance ease: `cubic-bezier(0.16, 1, 0.3, 1)`.

### 6.1 `/` — Landing
- Single-brand Kyvern hero
- Live Atlas observatory mini-card embedded
- Manifesto block · "Agents shouldn't have keys. They should have budgets."
- Chip cards for the 5 templates
- "See all devices" link

### 6.2 `/atlas` — Public deep page (museum exhibit)
Dark hardware register. SSR'd snapshot, then 5-second poll.

Sections (top to bottom):
1. **Manifesto block** — "Agents shouldn't have keys…"
2. **Hero stats** — uptime since first ignition · funds lost ($0) · attacks blocked
3. **Micro stats + 24h sparkline** — total settled · earned · spent · cumulative-net line
4. **Atlas Findings** (Path C) — last 7 days of structured signals from Atlas itself, polled every 8s
5. **Attack Wall** — last 60 reverting on-chain txs. Each pill is a real failed signature on Solana Explorer
6. **Three-layer diagram** — Device · Budget · Workers
7. **Sponsor Atlas** (top-up affordance)
8. Quiet footer with `KVN-0000 · SOLANA DEVNET · POLICY PpmZ…MSqc` + Explorer link

### 6.3 `/docs` — Developer docs
Static MDX. Install snippet, vault.pay, vault.pause, error codes.

### 6.4 `/vault/new` — Deploy-a-vault wizard
Three-step Privy + Squads + on-chain init. "Clone Atlas" is the 60-second path.

### 6.5 `/app` — Logged-in home (the device card)
Dark hardware register. The whole card is the **device**.

- USDC balance live from on-chain (`/api/devices/[id]/live-status` every 5s)
- Vault PDA + USDC ATA pills (Explorer links)
- Worker avatars in orbit around a center emoji
  - Each avatar has a `isThinking` ring when alive AND ticked within last 90s
- Last-action chip — "Sentinel · 🎯 found a bounty · 12s ago" (verb logic in live-status route)
- 24h PnL sparkline + earningPerMinUsd
- **Path C row**: "Today  N signals · M actionable · K read" — links to `/app/inbox`
- Tab bar at bottom: Home · Inbox · Tasks · Settings

### 6.6 `/app/inbox` — The Path C heart
Light register. Polls every 5s (signals + worker briefs from live-status).

- Header: "Inbox · {total} total · {unread} unread"
- Filter pills: All / Unread
- Signal cards (component: `SignalCard`)
  - Top row: kind icon + label · worker emoji + name · "Ns ago" · unread dot
  - Subject (Inter 18px bold)
  - 2–4 mono evidence bullets
  - Optional italic suggestion
  - Footer: short-sig pill (if any) + dark "Open source ↗" pill + Mark-read button
- Empty state (truly empty): dark hardware card "Your workers haven't found anything yet" + "Hire a worker" CTA
- **Watching strip** — when any whale-tracker worker on the device has zero signals, render below the empty card:
  - "Still on watch" mono header
  - Per worker: emoji + name + animated green pulse + "watching · last check Ns ago"

### 6.7 `/app/agents/spawn` — 2-screen spawn flow
**Screen 1 — Pick:** five picker tiles (Bounty Hunter, Ecosystem Watcher, Whale Tracker, Token Pulse, GitHub Watcher). Each tile shows emoji + name + 2-line description + "Watches X · Pings on Y".

**Screen 2 — Configure:**
- Identity: name + emoji (palette of 10 + reload button for name)
- "What's the job?" with chip suggestions + always-present **"Custom job →"** affordance (clears textarea)
- Live Ethereum-address detector: yellow warning pill if `0x…` pasted
- Collapsible "Abilities granted" drawer with the recommended tool set + cadence override
- Spawn button → 4-step birth animation → navigate to detail

### 6.8 `/app/agents/[id]` — Worker detail
Light register.
- Back link
- **Header card**: avatar + name + status (Alive/Paused) + uptime + template tag + Pause/Retire buttons
- **Stats**: thoughts · earned · spent · net
- "Last thought: 2m ago · ticks every 600s"
- **Activation banner** — appears between header and feed when totalThoughts === 0 and worker is alive ("waking up · first thought arriving" with a 60-second progress bar)
- **Thought feed** — `ThoughtCard` per row. Shows reasoning text + tool-used pill + signature pill (if money tool) + money delta (if any) + mode pill (llm/scripted)
- **Sticky chat** at bottom (`fixed bottom-[72px]`):
  - Bubble stack (last 6, max-h 280px, auto-scroll to bottom)
  - Quick-reply chips ("How are you doing?", "Show me what you found", "Take a break")
  - Input + send button
  - Page wrapper has `pb-[480px]` so the thought feed scrolls fully clear of the chat overlay

### 6.9 `/app/tasks`
Open task board. Workers post tasks here; other workers can claim.

### 6.10 `/app/settings`
Vault settings — daily/weekly caps, allowed merchants, pause toggle.

---

## 7. End-to-end flows

### 7.1 Onboarding (cold → first signal)
1. Open `/` → "Get your Kyvern" → Privy modal
2. Sign in → `/vault/new` → wizard provisions Squads + funds devnet vault
3. Land on `/app` → empty device card with "Hire a worker" CTA
4. Tap "Hire a worker" → `/app/agents/spawn` → pick **Bounty Hunter** tile
5. Tap **Superteam Dev >$500** chip → name auto-fills "Sentinel" → tap Spawn
6. Birth animation (4 steps × ~300ms) → "First finding incoming…"
7. Detail page renders with activation banner, 60-second progress bar
8. Within 30–60s the agent-pool ticks → `/app/inbox` shows 1 unread bounty signal
9. Click "Open source ↗" → real Superteam listing opens in new tab

### 7.2 Whale tracker ("quiet watching" UX)
1. Spawn **Whale Tracker → Major exchange wallets** chip
2. `/app/inbox` is empty (no signal yet — wallet hasn't moved)
3. Empty state's dark card renders, AND below it the **Watching strip** renders:
   - Worker emoji + name + green pulse · "watching · last check 12s ago"
4. Pulse refreshes every 5s; "last check" updates when worker re-ticks
5. When the wallet does move → strip disappears for that worker, signal appears in feed

### 7.3 Atlas observatory (no-login)
1. Open `/atlas`
2. SSR'd snapshot pre-fills (uptime, attacks blocked, sparkline, findings)
3. Client polls `/api/atlas/status` and `/api/atlas/decisions?kind=attacks` every 5s
4. Findings panel polls `/api/atlas/findings` every 8s — Atlas's own signals (real GitHub releases, blog posts)
5. Attack wall: each pill is a clickable Explorer link to a real failed devnet tx with AnchorError

### 7.4 Chat with a worker
1. `/app/agents/[id]` → scroll to bottom (sticky chat)
2. Tap a quick-reply chip OR type a message
3. POST `/api/agents/[id]/chat` with the user message
4. Server records user message, then triggers an LLM call in **chat mode** (uses the worker's personality + recent thoughts as context)
5. Reply lands in chat_messages; UI polls every 5s and slides the new bubble in
6. Pages's `pb-[480px]` ensures thought feed above remains visible/scrollable

### 7.5 Pause / retire
1. Header card has Pause + Retire buttons
2. Pause → POST `/api/agents/[id]/status` with `{action: "pause"}` → status becomes "paused", pulse turns grey, agent-pool stops ticking it
3. Resume → reverse
4. Retire → permanent. Status "retired"; agent disappears from active workers list but rows remain in DB for history

### 7.6 Bounty mode (drain bounty)
1. From `/app` or settings, enable Bounty on the vault
2. Server fires ONE immediate reverting on-chain tx → counter 0→1 in 5s
3. atlas-attacker adds vault to its target list → ~8-min cycle of probes
4. Each failed probe lands as a real signature with AnchorError on Explorer

### 7.7 Cycle for a watch_url worker
Per tick (multi-step loop, max 5 steps):
1. LLM sees system prompt + recent thoughts + current status
2. LLM emits tool_call → `watch_url` with the chip's URL
3. Server runs `fetchSuperteam` / `fetchRss` / `fetchGenericJson` based on host or format
4. Tool result → LLM (assistant + tool messages appended)
5. LLM emits second tool_call → `message_user` Finding mode with kind, subject, evidence, sourceUrl
6. Server writes signals row + chat-row mirror
7. LLM stops emitting tool calls → loop exits
8. Each step is recorded as its own `agent_thoughts` row

---

## 8. Performance + caching

- **5-second polling** budget on the home device card and inbox — no websockets in v1
- Tool-result payloads capped at 4 KB before re-feeding to LLM (`JSON.stringify(toolResult).slice(0, 4000)`)
- watch_url tracks `last_seen_ids` per (agent, url) to dedupe across ticks
- LLM prompt is split: stable system prefix + tool schemas (cached) + volatile user message — keeps token cost low on Commonstack
- SSR snapshot on `/atlas` so first paint is real numbers, not skeleton

---

## 9. Visual design system

### Type
- **Inter** — body, headings (300/400/500/600). `tracking-tight` on display sizes, `tracking-[-0.025em]` on the largest
- **JetBrains Mono** — numbers, timestamps, labels. Lowercase on labels with `letterSpacing: 0.12em` and `uppercase`

### Colour
- **Light**: `#FAFAFA` page · `#fff` cards · `#0A0A0A` text · `#6B7280` secondary · `#9CA3AF` tertiary
- **Dark register**: radial gradient (above) + `rgba(255,255,255,0.92)` text · `rgba(255,255,255,0.55)` secondary · `rgba(255,255,255,0.4)` tertiary
- **Accents**: green `#22C55E` (alive/unread) · red `#B91C1C` (retire) · amber `#FCD34D` (warnings) · kind colours per signal type

### Motion
- Locked entrance: `cubic-bezier(0.16, 1, 0.3, 1)`, 0.4s
- Pulses: 1.6–2s opacity loops `[0.4, 1, 0.4]`
- Page transitions: opacity + 8px y, no horizontal movement
- Birth animation: 4 steps × ~300ms each, sit on "alive" 700ms, then onComplete

### Components reused everywhere
- `StatBlock` (`src/components/device/...`)
- `SignaturePill`, `MoneyDelta`, `LogEntry` (design primitives)
- `SignalCard` (light) and `AtlasFindings` (dark)
- `ChatBubble`, `TypingBubble` (sticky chat)
- `WatchingStrip` (inbox)
- `BirthAnimation` (spawn)

---

## 10. Known limitations (ship-acceptable)

- **WT-1 variance**: Major exchange wallets idles ~5/6 cycles. Watching strip covers this UX-wise.
- **GW-1, GW-3 variance**: GitHub releases sometimes idle on first tick. Pool re-ticks on cadence.
- **Treasury wallet** `Gs9bvUxDJSyt82dWGKa5hbzWJEwgMYtTjFqRuotdJJQW` not yet funded — auto-drip dormant. Atlas has standalone budget so this doesn't block normal demo.
- `category` and `type` filters on Superteam API return the same default set (server-side bug). Chip prompts compensate with `minPrize` filtering on the client.
- `nitter.net/*` is dead from VM — replaced everywhere with real RSS feeds (Solana News, Helius, Colosseum).

---

## 11. Files of interest

```
src/lib/agents/templates.ts        — 5 picker templates + 13 chips
src/lib/agents/runner.ts           — multi-step LLM tick loop + system prompt
src/lib/agents/tools/              — watch_url, watch_wallet*, read_dex, message_user, …
src/lib/agents/store.ts            — agents/thoughts/signals CRUD
src/lib/atlas/findings.ts          — Atlas's two-birds finding loop
src/lib/atlas/auto-drip.ts         — treasury → vault auto-top-up

src/app/atlas/atlas-client.tsx     — public observatory page
src/app/app/page.tsx               — logged-in home / device card
src/app/app/inbox/page.tsx         — Path C inbox + Watching strip
src/app/app/agents/spawn/page.tsx  — pick + configure + Custom job → affordance
src/app/app/agents/[id]/page.tsx   — worker detail + sticky chat (pb-[480px])

src/components/inbox/signal-card.tsx
src/components/atlas/atlas-findings.tsx
src/components/device/hero-card.tsx
src/components/spawn/birth-animation.tsx

src/app/api/devices/[id]/live-status/route.ts   — the 5-second poll
src/app/api/devices/[id]/inbox/route.ts         — signals + worker join
src/app/api/agents/spawn/route.ts               — POST creates worker
src/app/api/agents/[id]/tick/route.ts           — manual tick (verify-chips)

scripts/atlas-runner.ts            — Atlas's pm2 process
scripts/agent-pool.ts              — user-worker pm2 process
scripts/verify-chips.ts            — end-to-end chip verification harness
```
