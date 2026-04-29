# Kyvern Post-Unboxing — Surface + Mechanism Audit

**Generated:** 2026-04-29
**Scope:** Everything the user touches from the moment `/unbox` hands off to `/app`. What's live, where it lives in the code, what's working, what's weak, what gaps a judging-window decision could fill.

This is an honest audit, not a marketing doc. Where I think a surface is fragile or a mechanism is shallow, I say so.

---

## 1. The flow at a glance

```
/login (two cards)
   │
   ├── "Get a Kyvern device" → Privy modal → /unbox
   │     └── box → device → serial → LEDs → reveal device key (Privy export modal)
   │            → paste-back verify → Open Kyvern (auto-provision Squads vault) → /app
   │
   └── "I own a Kyvern device" → /recover
         └── paste base58 device key → guest auth + importWallet → /app
              (or fallback: standard Privy login → /app)

/app (device home)
   ├── WorkersFoundStrip   ← findings come first (the daily reason to open the app)
   ├── BalanceOrbit        ← USDC + earnings/min + orbital workers
   ├── TodayStrip          ← earned · spent · signals · workers active
   ├── DeviceFAB           ← Top up / Hire worker
   └── (links: Watch Atlas →)

/app/agents/spawn (worker hire flow)
   ├── CartridgePicker    ← 5 templates: Bounty Hunter, Whale Tracker,
   │                        Token Pulse, Ecosystem Watcher, GitHub Watcher
   ├── Configure          ← name, emoji, job (chip-driven), tools, frequency,
   │                        Customize drawer for advanced
   └── InstallAnimation   ← cinematic install → router.push(/app/agents/[id]?fresh=true)

/app/agents/[id] (worker detail)
   ├── First-60s window   ← WelcomeNote · FirstMessage · BootSequence · LiveWorkerCard
   │                        + first-signal toast on totalThoughts 0→1
   ├── Hero chassis        ← LED + serial + name + status + uptime + 4 stats
   ├── Spec card           ← Personality · Job · Tools
   ├── Internal log        ← thought feed (cycle # · time · mode pill · tool footer)
   └── ChatDrawer          ← sticky talk-to-module surface

/app/inbox (findings inbox)
   └── signals from all workers, filterable, mark-read flow
```

---

## 2. /app — the device home (the surface that retains)

**File:** `src/app/app/page.tsx`

What the user sees, in order, top-to-bottom:

### LED status header (inside `DeviceChassis`)
- Online / paused dot · serial `KVN-XXXXXXXX` · live uptime since `bornAt`
- Pulled from `/api/devices/[id]/live-status` polled every 5s

### `WorkersFoundStrip` (the headline — added 2026-04-29)
- Horizontal swipeable strip, three cards across
- Each card: worker emoji + name (mono small) · subject summary clamped to 2 lines · time-ago + glowing green unread dot
- Tap → `/app/inbox`
- Empty state: *"Your workers haven't found anything yet · Spawn one →"* linking to `/app/agents/spawn`
- Polls `/api/devices/[id]/inbox?status=unread&limit=3` every 5s

### `BalanceOrbit`
- Hero: scrambling USDC balance · today's net P&L · earnings-per-minute pill
- Orbital ring: each worker rendered as a satellite, glowing if they ticked recently (< 90s window)
- "Hire worker" satellite slot when there's room → `/app/agents/spawn`

### `TodayStrip`
- Four mono numbers: earned · spent · signals · workers active
- Today = since UTC midnight

### `DeviceFAB`
- Floating physical-looking pill above the TabBar
- Expands to: Top up device (opens TopUpDrawer) · Hire worker (→ /app/agents/spawn)

### Footer
- "Watch Atlas →" (single mono link to `/atlas`)

### Empty state (no device yet)
- Currently mostly unreachable — `/unbox` auto-provisions a Squads vault
- Falls through if provisioning silently fails
- Copy: *"A device that finds you opportunities. Workers watch the world. Send you findings. Spend within budget."* + "Get started" → `/app/agents/spawn`

---

## 3. How a worker is hired

**File:** `src/app/app/agents/spawn/page.tsx`

Three screens, one cinematic.

### Screen 1 — `CartridgePicker`
Five tiles, each a "module" cartridge:

| Template | Emoji | Default freq | Watches | Pings on |
|---|---|---|---|---|
| Bounty Hunter | 🎯 | 600s | Bounty boards & hackathons | A fit drops |
| Ecosystem Watcher | 📡 | 600s | Solana accounts & feeds | Hackathons, grants, launches |
| Whale Tracker | 🐋 | 240s | Specific wallets | Big swaps & rotations |
| Token Pulse | 📈 | 180s | Token price + volume | Configured threshold breaks |
| GitHub Watcher | 🛠️ | 900s | Repos & orgs | Releases & fresh commits |

Plus a hidden 6th template: `custom` (advanced users only — never shows on the picker).

### Screen 2 — Configure
- Name (with reload-suggestion button — pool of 12 hand-picked names)
- Emoji palette (10 curated)
- Job prompt (with template-specific suggestion chips — typically 1-3 chips per template, each a fully-specified job string the runner can act on directly)
- Frequency dial
- Personality sliders (logical ↔ creative · cautious ↔ aggressive) — derives a `personalityPrompt` server-side
- "Customize ↗" drawer with advanced controls: tool checkboxes, exact frequency, daily-cost preview

### Screen 3 — `InstallAnimation`
- 4-step cartridge-install ritual: *Creating worker identity → Binding abilities → Setting on-chain budget → Activating intelligence*
- Per-tx + daily cap callout with `PpmZ…MSqc` short-address (Kyvern policy program ID) — the moat shot
- ~1.4s + 0.7s hold then `router.push(/app/agents/[id]?fresh=true)`

### Auto-vault provisioning (added 2026-04-29)
- If the user lands on `/app/agents/spawn` without a Squads vault, a silent provision runs first
- Defaults: daily $5, weekly $25, per-tx $0.50, velocity 60/h, devnet
- Inline spinner: *"Setting up your device on Solana — about 5 seconds"*
- Idempotent via `provisionAttemptedRef`

---

## 4. The 5 templates — ground truth

**File:** `src/lib/agents/templates.ts`

Each template is a complete in-character spec the LLM can act on. Below is the ground-truth job-prompt example each template ships with. These are the ones that actually fire on day one.

### 🎯 Bounty Hunter
- **Personality:** *"You hunt opportunities. You watch bounty boards and hackathon platforms with patience, then surface a clean finding the moment a fit drops. You don't speculate; you cite."*
- **Recommended tools:** `watch_url`, `read_dex`, `message_user`
- **Default frequency:** 600s (10 min)
- **Job example:** Watch `superteam.fun/api/listings?category=Development&order=desc&take=15` for new bounties >$500. For each new listing, surface as `kind="bounty"` finding with reward + deadline + skills, sourceUrl = listing URL.
- **3 chip jobs:** *Superteam Dev >$500* · *Superteam high-bar ≥$2k* · *All Superteam ≥$300*

### 📡 Ecosystem Watcher
- **Personality:** *"You watch the rooms where ecosystem news drops first. You don't speculate. You surface the announcement and the link."*
- **Recommended tools:** `watch_url`, `message_user`
- **Default frequency:** 600s
- **Job example:** Watch Solana RSS feed; surface every new post as `kind="ecosystem_announcement"`.
- **3 chip jobs:** *Multi-feed: Solana + Helius + Superteam* · *Solana Foundation blog* · *Colosseum blog (judge feed)*

### 🐋 Whale Tracker
- **Personality:** *"You track wallets. You watch their on-chain moves with patience and surface the moments they move size. Your evidence is the signature, the tokens, the dollar amount, the time. No commentary unless asked."*
- **Recommended tools:** `watch_wallet_swaps`, `watch_wallet`, `read_dex`, `message_user`
- **Default frequency:** 240s (4 min)
- **Job example:** Watch Kraken's Solana hot wallet `FWznb…ouN5`. Surface each transfer/swap as `kind="wallet_move"` with signature + tokenChanges + programs + sourceUrl pointing to Solana Explorer.
- **1 chip job:** *Major exchange wallets* (currently just Kraken's hot wallet)

### 📈 Token Pulse
- **Personality:** *"You watch a token's heartbeat — price + volume. You ping the owner only on configured threshold breaks."*
- **Recommended tools:** `read_dex`, `watch_wallet_swaps`, `message_user`
- **Default frequency:** 180s (3 min)
- **Job example:** `read_dex('SOL')` each cycle. If price moves >5% over 30 minutes, surface a `kind="price_trigger"` with start/end price + window.
- **3 chip jobs:** *SOL outside $140–$160 band* · *BONK outside $0.0000180–$0.0000300* · *JUP outside $0.30–$0.80*

### 🛠️ GitHub Watcher
- **Personality:** *"You watch repositories with the patience of a long-time contributor. You only ping the owner when something they'd care about ships."*
- **Recommended tools:** `watch_url`, `message_user`
- **Default frequency:** 900s (15 min)
- **Job example:** Watch `api.github.com/repos/coral-xyz/anchor/releases`. For each new release, surface a `kind="github_release"` with tag + body excerpt + sourceUrl.
- **3 chip jobs:** *solana-labs/solana releases* · *coral-xyz/anchor releases* · *metaplex/mpl-core releases*

---

## 5. The agent detail page — `/app/agents/[id]`

**File:** `src/app/app/agents/[id]/page.tsx`

Two render modes. Same page, same components — only the surface composition differs based on `agent.totalThoughts === 0`.

### First-60s mode (when `?fresh=true` and totalThoughts === 0)

The five components I shipped earlier in the session:

1. **`WelcomeNote`** — top of page, single mono line: *"Sentinel · KVN-XXXXXXXX · hired 14s ago by you"*. Hire-time-ago ticks live; flips to *"hired Xm ago · alive"* once the first thought lands.
2. **`FirstMessage`** — typewriter chat bubble, ~30 ch/s, hand-written per template (file: `src/lib/agents/first-messages.ts`). Five distinct in-character intros (Bounty Hunter sounds eager, Whale Tracker patient, Token Pulse vigilant, Ecosystem Watcher curious, GitHub Watcher technical).
3. **`BootSequence`** — seven beats unfolding over ~45s, polled from `/api/agents/[id]/status-stream`. Server pre-writes 7 rows with future timestamps at spawn; client polls and reveals as time elapses.
4. **`LiveWorkerCard`** — sticky right-rail (desktop) / collapsible pill (mobile). Shows: emoji+name+template, watching target (parsed from job_prompt), last checked, state pill, vault budget, on-chain enforcement link to `PpmZ…MSqc`. Polls `/api/agents/[id]/live-card`.
5. **`FirstSignalToast`** — fires on `totalThoughts 0→1`. Auto-dismiss 6s. Bottom-right desktop, top-banner mobile. Click → `/app/inbox`.

When the first thought lands, the boot sequence dissolves and the page shifts into steady-state mode.

### Steady-state mode

- Hero chassis (chassis bezel matching device home — LED + serial + name + status + uptime + 4 stat blocks: Thoughts, Earned, Spent, Net)
- Spec card: Personality · Job · Tools
- Internal log: the thought feed (`agent_thoughts` table). Each row: `#0001` cycle gutter · timestamp · LLM/scripted mode pill · reasoning text · tool footer with signature pill (clickable to Solana Explorer) + money-delta if there was one
- ChatDrawer at bottom-72 — fixed/sticky, polls every 5s

### Pause / Retire
- Pause button (PATCH `/api/agents/[id]/status` with `paused`) — agent stops ticking
- Retire button — destructive, with `window.confirm`. Status set to `retired`, agent never tickens again

---

## 6. The inbox — `/app/inbox`

**File:** `src/app/app/inbox/page.tsx`

Findings (signals) live separately from thoughts. A signal is a structured finding the worker has decided is worth surfacing to the owner. A thought is the raw cycle-by-cycle reasoning. Most thoughts produce no signal; the worker idles or read-only.

### 6 signal kinds (`src/lib/agents/types.ts`)

| Kind | Producer | Cardinal example |
|---|---|---|
| `bounty` | Bounty Hunter | "Solana ecosystem call: $1,500 frontend dev" |
| `ecosystem_announcement` | Ecosystem Watcher | "Helius launches Photon RPC v2" |
| `wallet_move` | Whale Tracker | "Kraken hot wallet: 50k SOL → Jupiter" |
| `price_trigger` | Token Pulse | "JUP outside band: $0.92" |
| `github_release` | GitHub Watcher | "anchor v0.31.2 — security fix" |
| `observation` | Any | Catch-all for fuzzy findings |

### Signal shape
- `id` · `agentId` · `deviceId` · `kind` · `subject` (≤80 char) · `evidence` (2-4 short bullets joined by ` || `) · `suggestion` (optional) · `signature` · `sourceUrl` · `status` (unread / read / archived) · `createdAt`

### Inbox page surface
- Today / This week / All filter pills
- Signal cards with worker chip + kind icon + subject + evidence bullets + sourceUrl click-through + mark-read action

---

## 7. How a tick actually fires — the runner

**File:** `src/lib/agents/runner.ts`

The most load-bearing file in the product. Two paths, same output shape.

### Path A — LLM (preferred when available)
- Provider: Commonstack (OpenAI-compatible)
- Model: `openai/gpt-oss-120b` — $0.05/M in, $0.25/M out, ~10× cheaper than DeepSeek v3.2
- Cached prefix (system prompt + tool schemas) → only volatile context costs tokens
- Multi-step loop (`MAX_STEPS_PER_TICK = 5`): one LLM call per step, executes any returned tool, appends result to context, asks again, until LLM stops asking for tools or step cap hit.

**Key constraints (post 2026-04-29 fix):**
- **`tool_choice: "required"` on step 0** — the LLM cannot emit a reasoning-only response on the first step. Sentinel's 189-ticks-zero-actions failure mode is now structurally impossible.
- **System prompt forbids no-tool ticks** — *"Each tick is ONE tool call followed by optional follow-ups. 'Idle' only happens AFTER a tool returned no qualifying matches."*
- **Step 0 with no tool call → return `ok: false`** → falls through to scripted path so the tick still produces real work.
- **First-tick rule:** if `totalThoughts === 0` and the data-gathering tool returned any qualifying matches, the worker MUST surface the first one as a finding before idling. No "wait for something more notable" on the spawn moment.
- **Loop-breaking rules in the prompt:** don't re-surface findings the owner hasn't acted on; if the job references something unresolvable (e.g. an Ethereum 0x address on Solana), send one explainer finding then idle; never surface tool failures as findings.

### Path B — Scripted (fallback)
- File: `src/lib/agents/scripted.ts`
- Per-template deterministic decision: pick a tool, call it, emit a finding if the tool returned something interesting
- Used when: no Commonstack key set, rate-limit slot exhausted, or LLM path errored
- Same output shape as LLM path — same `agent_thoughts` row, same signature, same signal
- Tagged `mode: "scripted"` (vs `mode: "llm"`) — rendered as a muted pill in the thought feed

### Pool worker
- File: same module's `tickEligibleAgents()`
- Called by the `agent-pool` pm2 process
- Iterates alive agents, respects per-agent frequency, with two warmup-mode shortcuts:
  - **First-thought priority:** `total_thoughts === 0` → tick on the next pool cycle, no wait
  - **Warmup:** `total_thoughts < 3` → cap frequency at 60s regardless of user's chosen cadence (so the agent feels alive in the first few minutes)

### Atlas
- Atlas (`agt_atlas`, `vlt_QcCPbp3XTzHtF5`) is **NOT** ticked through this runner — it has its own dedicated `atlas` pm2 process running `scripts/atlas-runner.ts`. Defensive guard in `tickAgent()` skips it.

---

## 8. The 10-tool layer

**Files:** `src/lib/agents/tools/*.ts`

| Tool ID | Category | Description | Notes |
|---|---|---|---|
| `message_user` | communicate | Surface a finding (signal) or chat reply to the owner | Both finding-mode and chat-mode in one tool |
| `expose_paywall` | earn | Expose a paid x402 endpoint a slug other agents can subscribe to | Pulse-era, still wired |
| `subscribe_to_agent` | spend | Pay another worker for their data feed | Goes through `vault.pay()` — real on-chain settlement |
| `post_task` | spend | Post a bounty for another worker to claim | Cross-agent task economy |
| `claim_task` | earn | Claim and complete an open task for the bounty | Atomic claim against TTL |
| `read_onchain` | read | Read on-chain Solana data (RPC) | Uses public devnet RPC |
| `read_dex` | read | Read DEX price for a token symbol | CoinGecko + DexScreener fallback |
| `watch_wallet` | read | Watch a wallet for any new transactions | Helius indexer or RPC |
| `watch_wallet_swaps` | read | Detect Jupiter swaps for a wallet, with `minUsdThreshold` | More targeted than `watch_wallet` |
| `watch_url` | read | Fetch & diff a JSON/RSS/HTML URL, return only NEW items since last check | The cornerstone of bounty/ecosystem/github templates |

**`watch_url` is the workhorse.** It supports `format='json'`, `'rss'`, or `'html'`. It hashes responses, dedups items via stable IDs (`id`/`slug`/`html_url`), and returns only items NOT seen in the previous check. The cache lives in `watch_url_cache` keyed by `(agent_id, url)`.

---

## 9. Database tables involved

**File:** `src/lib/db.ts`

| Table | Purpose | Notes |
|---|---|---|
| `vaults` | Squads multisig per device — owner_wallet, budgets, allowlist, velocity, paused_at | The on-chain device |
| `vault_agent_keys` | API key + delegated Solana keypair per agent | Server holds the secret |
| `vault_payments` | Every allowed/blocked/settled/failed payment attempt | The audit log — also feeds the attack wall |
| `agents` | One row per worker — name, personality, job, tools, freq, totals | `metadata_json` carries `firstMessage` + `watchingTarget` |
| `agent_thoughts` | One row per tick — reasoning, tool_used, signature, mode (llm/scripted) | The thought feed source |
| `agent_chat_messages` | User ↔ worker chat | Synchronous, separate from thoughts |
| `agent_status_updates` | Ephemeral boot beats + tick statuses | 5-min GC, drives BootSequence + LiveWorkerCard |
| `signals` | Findings from workers — kind, subject, evidence, status | The inbox source |
| `agent_tasks` | Cross-agent task economy — open / claimed / completed | post_task + claim_task settle here |
| `watch_url_cache` | Per-(agent, url) seen-IDs cache for sinceLastCheck | Makes watch_url stateful across cycles |
| `device_log` | Unified event feed for the device home | Powers the today-strip and PnL |

---

## 10. What's working

**The first-60s window.** Spawn → unbox-style cinematic → boot sequence → first finding → toast → inbox handoff. End-to-end on desktop and mobile. Bypass paths handle every degenerate case (no embedded wallet, modal won't open, etc.).

**Auto-vault on sign-up.** No vault wizard detour. User sees device → workers, the Squads vault is invisible plumbing.

**The runner-loop fix.** `tool_choice: "required"` on step 0 + scripted fallback if LLM bails. Demo-stuck failure mode is gone.

**Atlas as the proof.** Continuously running on devnet since 2026-04-20. ~3,730 cycles, 463 settled, 486 blocked, 1,408 attacks blocked, $0 lost as of this audit. Independent process, independent data, independent up-time.

**The on-chain moat.** Anchor program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` enforces budgets/allowlist/velocity/memo/pause on the chain. The Moat section of the landing page links to real failed-tx Explorer pages. This is the part competitors with "agent has the keys" architectures can't easily build.

**`watch_url` is genuinely useful.** Three of the five templates lean on it (Bounty Hunter, Ecosystem Watcher, GitHub Watcher) and it produces real findings out of real APIs (Superteam, Solana Foundation, GitHub releases).

**The agent detail page in steady state.** Hero chassis + spec card + thought feed + chat drawer composes into a screenshot that reads as "an employee on duty" rather than "a row in a dashboard."

---

## 11. What's weak

**Worker → owner chat is one-directional in practice.** ChatDrawer exists, but workers don't proactively chat — they post findings. The chat surface is mostly for *user → worker* questions. This is fine for v1 but not load-bearing.

**Findings are static once posted.** A bounty surfaced today shows the same evidence forever, even if the bounty closed or got claimed. No expiry, no re-check, no "this is now stale" framing.

**The personality sliders in spawn-configure don't feel observable.** They derive a personality prompt that goes into the system prompt, but the user can't see *how* the slider position changed the worker's behavior. This is design theater unless we surface the difference.

**Atlas is on devnet, not mainnet.** Every screenshot says devnet. For Frontier judging that's fine; for any post-Frontier conversation, mainnet is the gate.

**The agent-pool runner runs blind.** No metrics surface for "how many ticks have errored vs succeeded today" or "which template's runner is healthiest." Operationally we'd want to know if a template is broken at the runner level.

**`signals` table has no de-dup beyond what `watch_url` provides.** If two different agents point at the same Superteam listing, both surface it. We don't merge across-agent.

**The thought feed shows raw reasoning.** The LLM's first-step reasoning sometimes reads as "let me think about whether to call watch_url..." — this is brain-leak, not what an owner wants to read. The first-message and finding card are polished; the cycle-by-cycle reasoning is not.

**The spec card on the agent detail page is plain.** Personality / Job / Tools is text-on-text. The full job prompt is dumped verbatim, including the LLM-instruction-style language ("Every cycle, call `watch_url` on..."). Owners shouldn't see system-prompt language in a hero surface.

**Pause and retire have no consequences in the UI.** A paused worker doesn't say *"paused at 2:14pm — last tick was 8 minutes ago — resume to continue"* — it just dims slightly.

**No "your worker did X" historical view.** The agent detail page shows the *internal log* (raw thoughts), but there's no clean *output history* — "in the last 7 days this worker surfaced 12 findings, $0.04 spent, 2 actioned by you."

**`/app/inbox` is functional but not pretty.** I haven't audited it line-by-line in this session, but per memory it's a basic list. Premium polish matches the rest of the app at ~70%, not 100%.

**External-wallet path on /unbox skips the device-key reveal entirely.** ManagedCard says "Managed by Phantom" and routes to /app. That's correct architecturally (Phantom owns the key, not Privy) but it's a less satisfying narrative arc — they don't get the unboxing climax.

---

## 12. Gaps the judging window could fill

In rough leverage order. None of these are required for submission; all are genuine product upgrades vs. fluff.

**A.** **Findings expire / refresh.** A bounty signal older than its deadline shows "expired" badge and the worker can re-surface a fresher version. ~3 hr.

**B.** **Output history on agent detail.** A "what this worker has done" stripe — last 7 days of findings, spend, P&L. Visible at-a-glance instead of buried in inbox. Could even live on the Live Worker Card. ~3 hr.

**C.** **Cross-agent dedup on signals.** Hash signals by (kind + sourceUrl + day-of), share read-state across workers so a Bounty Hunter and an Ecosystem Watcher don't both surface the same Solana Foundation grant. ~2 hr.

**D.** **Pause/retire UX with consequence.** Paused workers visibly dim, show a "paused 14m ago" stamp, and the orbital ring removes them. Retired workers move to a "graveyard" section with their stats frozen. ~1.5 hr.

**E.** **Reasoning cleanup.** Run a regex/post-process on first-step LLM reasoning before persisting to `agent_thoughts.thought` to strip "let me think about whether to..." style brain-leak. Or display only the FINDING in the feed and tuck reasoning behind a "show reasoning" toggle. ~1 hr.

**F.** **Worker-says-hello chat.** When a worker surfaces a particularly notable finding, also drop a one-line message in the chat drawer ("Hey — bounty I just sent you is unusually well-funded"). Makes the chat surface feel alive. ~2 hr.

**G.** **Sentinel + Wren + Pulse demo trio pre-spawned on every fresh device.** When the user lands on /app from /unbox, three workers are already running (a Bounty Hunter watching Superteam, a Whale Tracker watching Kraken, a Token Pulse on SOL). The first finding lands in <90s without the user having to click anything. This is the WAVE-1 demo. ~3 hr.

**H.** **Mainnet preview mode for Atlas.** Atlas keeps running on devnet, but the homepage shows a cloned mainnet Atlas with $5 budget, on real USDC, on the live attack wall. This is the response to "you're on devnet." ~1 day.

**I.** **`/atlas` polish.** Every blocked tx clickable to Explorer, manifesto in first viewport, attack-wall numbers stand alone, sponsor-attack callouts (Garrett @ Squads tries to break it). ~2 hr.

**J.** **A "live worker" 30s reel on the home page.** A pre-recorded loop of an actual worker spawning + finding + sending. Plays muted on hover. Makes the empty state on /app look populated. ~2 hr to record + ~1 hr to embed.

---

## 13. What I would NOT add

To save you the spiral when the next idea hits:

- ❌ Personality upgrades / level-up / streaks (game theater — Frontier judges don't reward)
- ❌ A second LLM provider (Commonstack works, swapping mid-build risks the runner)
- ❌ A third on-chain rule (per-tx, daily, allowlist, velocity, memo are enough — the moat is the existence, not the count)
- ❌ A morning-summary banner / notifications opt-in (mobile push is post-Frontier)
- ❌ Public agent profiles (deferred; not a moat)
- ❌ A 6th template (5 is the right cardinal number — covers bounty / wallet / token / news / code, the four canonical "things people watch on Solana")
- ❌ A 3D rendered hardware device floating on screen
- ❌ A device "health" meter or any UI-as-toy
- ❌ Browser push notifications

---

## 14. The honest read

The post-unboxing surface is **80% of a premium product** with a **20% gap that's all polish, not architecture**. The hard parts (on-chain enforcement, runner reliability, real findings from real APIs, premium chassis, first-60s ritual) are done. What's left is making the steady state feel as alive as the first 60 seconds.

If you have ~6 hours of polish runway between now and submission, my pick:

1. **Pre-spawn three workers on /unbox completion** (gap G). That single change makes /app go from empty-with-CTA to alive-with-findings on first load. Highest leverage screenshot for the demo video.
2. **Reasoning cleanup** (gap E). Cleans up the thought feed so the screenshot looks intentional, not chatty.
3. **/atlas polish** (gap I). The page judges spend the most time on.

Stop after those three. The rest is post-Frontier.

— end of audit
