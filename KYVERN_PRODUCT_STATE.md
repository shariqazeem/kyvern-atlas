# Kyvern — product state, 2026-05-10

Single canonical reference for the product as it stands today. Written
to be self-contained: paste this into a chat with another AI model and
they'll have the full picture without needing the codebase.

> Last updated: 2026-05-10. Branch: `main`. Live at:
> https://kyvernlabs.com/ + https://app.kyvernlabs.com/ (same backend).
> The agent platform v1 (composer + graph executor + BYOK + canvas)
> shipped 2026-05-10 in commits `00b16ab` → `efb3786`.

---

## Table of contents

1. [What Kyvern is](#1-what-kyvern-is)
2. [Two eras coexisting](#2-two-eras-coexisting)
3. [/app design — every surface](#3-app-design--every-surface)
4. [How graph agents actually work (end-to-end)](#4-how-graph-agents-actually-work-end-to-end)
5. [Step types — every type, what it does](#5-step-types--every-type-what-it-does)
6. [Triggers](#6-triggers)
7. [Recipes — what ships in the gallery](#7-recipes--what-ships-in-the-gallery)
8. [SDK — `@kyvernlabs/sdk`](#8-sdk--kyvernlabssdk)
9. [On-chain layer — Anchor program + Squads](#9-on-chain-layer--anchor-program--squads)
10. [Database schema](#10-database-schema)
11. [API surface](#11-api-surface)
12. [Authentication + BYOK](#12-authentication--byok)
13. [What works / what's broken](#13-what-works--whats-broken)
14. [Open design questions](#14-open-design-questions)

---

## 1. What Kyvern is

**One sentence:** Kyvern gives every AI agent a Solana smart safe
(Squads vault) wrapped in an on-chain policy program that refuses any
action outside the rules — caps, allowlists, kill switch — *before* a
single USDC lamport moves.

**Tagline:** *"Let your AI agents run free."*
**Manifesto:** *"Agents shouldn't have keys. They should have budgets."*

The chain is the arbiter, not our server. Every refusal is verifiable
on Solana Explorer with a real failed-tx signature.

The Anchor program lives at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`
on Solana devnet. 4 instructions: `initialize_policy`, `update_allowlist`,
`pause/resume`, `execute_payment`. 12 custom error codes (12000–12011).

---

## 2. Two eras coexisting

Kyvern has two generations of agent infrastructure currently active:

### Era 1: Worker era (legacy, still running for Atlas + pre-v1.1 vaults)

- **Templates** baked into code: `bounty_hunter` (Sentinel),
  `whale_tracker` (Wren), `token_pulse` (Pulse), plus Atlas itself.
- Each template has hardcoded URGENT directives in `runner.ts` that
  drive an LLM agentic loop (Commonstack `gpt-oss-120b`, multi-step
  tool calls).
- Runs as a PM2 process called `agent-pool` that ticks every 10s and
  hits `/api/agents/pool-tick` to dispatch eligible agents.
- Atlas is a fixed reference agent at `agt_atlas`, runs on its own
  PM2 process (`atlas`), never paused via UI. Has been live on
  devnet since 2026-04-20 — 9k+ cycles, ~1.4k settled USDC transfers,
  ~6.5k attacks blocked.
- Pre-v1.1 user vaults (anyone unboxed before today) had Sentinel +
  Wren + Pulse auto-seeded by `/unbox`. Those keep running.

### Era 2: Graph platform v1 (new, the future)

- **No baked-in templates.** Users compose agents from a step-graph
  in the `/app` builder modal.
- 7 step types (llm, http, vault.pay, transfer.usdc, log, signal,
  branch, loop) → leaf executors return outputs that flow as
  variables to later steps via `{{interpolation}}`.
- 4 trigger types: manual, interval, cron, webhook.
- BYOK provider keys (Anthropic / OpenAI / DeepSeek / Commonstack)
  encrypted at rest (AES-256-GCM, scrypt-derived from
  `KYVERN_KEY_VAULT_SECRET`).
- New v1.1 users land on an empty canvas and compose from the
  recipe gallery. No legacy trio auto-seed.

The two eras share: the same SQLite DB (pulse.db), the same
`signals` table, the same `agent_thoughts` table for the per-vault
event feed, the same Anchor program for chain enforcement.

---

## 3. /app design — every surface

`/app` is the authenticated home. It uses `KyvernOS` (the auth
shell) which wraps every authenticated route.

### 3.1 KyvernOS shell (`src/components/os/kyvern-os.tsx`)

- **Top:** `StatusBar` — the device-OS-style status pill (battery,
  network, vault dot).
- **Middle:** `<main>` with route children. Padding `pb-28` to leave
  room for the bottom TabBar.
- **Bottom:** `TabBar` — iOS-style nav fixed at viewport bottom.
  3 tabs: Home / Findings / Settings. Findings has an unread badge
  dot when there are unread signals.

### 3.2 /app — the protagonist page

When a user is authenticated and has a vault, they land here. The
page renders `AliveConsole`.

**Top-down structure:**

| Element | What it shows |
|---|---|
| `AgentStatusLine` | "Your agent · `kv_live_…` · last action 2m ago" pill |
| `Keys` chip | Click to open BYOK keys modal |
| `GraphCanvas` (NEW v1.1) | Vault disc center · agent tiles on an arc above · animated SVG strings between |
| Whisper line | "Mint your key. Run three lines. Watch the chain decide every dollar." |
| Vault frame (existing) | Two-column: `IntegrationWizard` left · `AgentEventFeed` right |
| `TodayStats` | "$0.05 spent · 4 calls · 1 blocked" row |
| Vault anchor pill | "Vault · Live · devnet · $0.99 USDC" |
| Footnote | "Secured by Squads · enforced by `PpmZ…MSqc`" |

### 3.3 GraphCanvas (`src/components/device/graph-canvas/canvas.tsx`)

The premium chassis the user asked for ("workers attached with strings").

**Layout:**
- Vault disc at bottom-center (32px radius, paused=amber, alive=green).
- Up to N agent tiles arranged on a soft arc above the vault.
- SVG quadratic Bezier curves from each tile to the vault.
- Wire color/animation reflects most-recent run status:
  - idle → soft gray, no animation
  - running → amber dashes flowing toward vault
  - succeeded → green dashes (only for ~3s after finish)
  - failed → red brief pulse
- "+ Deploy your first agent" CTA tile:
  - Empty state: large center tile with pulsing green ring
  - Otherwise: small + chip at right end of arc

**Polling:**
- `GET /api/devices/[id]/graph-agents` every 8s.
- Refreshes on tab focus + visibilitychange (so post-delete navigation
  shows fresh state without a hard reload).
- `cache: "no-store"` to defeat browser caching.

### 3.4 Builder modal (`src/components/device/builder/`)

Triggered by canvas's "+ Deploy" CTA. Two-step flow:

**Step 1 — Pick (recipe gallery):** 8 recipe cards + a "Start blank"
tile. Click → seeds composer with a clone of that recipe's graph
(fresh step ids).

**Step 2 — Compose:** the actual editor.

```
┌────────────────────────────────────────┐
│ [emoji] [agent name input field]       │
├────────────────────────────────────────┤
│ TRIGGER                                │
│ [manual] [interval] [cron] [webhook]   │
│ (kind-specific config below)           │
├────────────────────────────────────────┤
│ STEPS · N                  [+ Add]     │
│ ┌──────────────────────────────────┐   │
│ │ [llm] Generate brief    [↑↓✏️🗑]│   │
│ │  ↓ when expanded: type-form     │   │
│ └──────────────────────────────────┘   │
│ ... more step cards ...                │
├────────────────────────────────────────┤
│ BUDGET                                 │
│ Max runs/day: 5  Max $/run: 0.10       │
├────────────────────────────────────────┤
│ [Test run]                  [Deploy]   │
└────────────────────────────────────────┘
```

Per-step forms (in `step-forms/index.tsx`):
- llm: provider dropdown, model field (with datalist suggestions),
  system prompt, prompt, max_tokens, temperature
- http: method, url, headers (JSON), body (JSON), payShWrap toggle, timeout
- vault.pay: merchant, to (Solana pubkey), amount, memo
- transfer.usdc: to, amount, memo
- log: message (interpolated), level
- signal: kind, subject, evidence (multi-line bullets), suggestion, sourceUrl
- branch: condition + then[] + else[] (currently nested-list as JSON for v1)
- loop: items, itemVar, body[] (JSON), maxIterations

Variable hint chips show available `{{varname}}` references from
prior steps' outputVars + `{{trigger.payload.*}}` + `{{vault.id}}`.

### 3.5 Agent detail page (`/app/agents/[id]`)

Routes to `GraphAgentDetail` when the agent has `graph_json` set
(the new platform); falls through to the legacy `AgentPageShell` for
worker-era agents.

**Header:**
- Back arrow
- Agent emoji + name
- Status pill (alive/paused/retired)
- Trigger summary pill
- **`⛓ Policy · PpmZ…MSqc` pill** (links to Anchor program on
  Explorer — at-a-glance reminder that money-moving steps go through
  the chain)
- "Run now" green button (top-right)

**Tabs:**

**runs** — paged history of `agent_runs` rows. Each card shows:
- Status dot (green/red/amber)
- "succeeded" / "failed" / "running" + timestamp
- ✓N / ✗N / —N step counts
- Wall-clock duration
- Total cost USD
- Click to expand → per-step output cards. Each shows:
  - status icon, type badge, label
  - **Inline preview of the actual output** (LLM .text, HTTP body
    excerpt, signal subject, log message, vault.pay sig+amount)
  - "chain settled" / "chain refused" badge for money-moving steps
  - Explorer link if signature present
  - error message if failed

**graph** — read-only render of the graph + Edit button.
- **`SdkPreview` panel at top** (collapsed) — toggles open to show
  the user's composed agent as equivalent `@kyvernlabs/sdk`
  pseudocode. Demystifies the composer: "this is a UI on top of
  the SDK, not a black box." Comments call out the policy program path.
- Step list (read-only) with type badges.

**settings** — pause/resume, budget readout, danger-zone delete.

### 3.6 Findings (`/app/inbox`)

Reads from `signals` table for the user's primary device. Now (v1.1)
includes graph-emitted signals (kinds outside the legacy
USER_FACING_KINDS set). Signal cards have icon/color/label
fallbacks for unknown kinds (default Sparkles, gray, "SIGNAL").

Inline actions per card: Mark read, Dismiss, Snooze 4h.
Filter dropdown: status (unread/read/all), agent (per-worker).

### 3.7 Settings (`/app/settings`)

Existing legacy page — vault config (caps, allowlist, paused).
Currently does NOT show graph-platform-specific settings (BYOK keys
modal lives in /app top, not in this page).

**v2 wishlist:** master "Pause all agents" toggle, BYOK keys promoted
to a sub-page, per-agent run-budget summary.

### 3.8 Bottom TabBar (`src/components/os/tab-bar.tsx`)

Fixed-position iOS-style nav:
- **Home** → `/app`
- **Findings** → `/app/inbox` (with unread badge)
- **Settings** → `/app/settings`

Polls device's `/api/devices/[id]/inbox?status=unread&limit=1` every
8s when not on inbox itself, optimistically clears badge on nav.

---

## 4. How graph agents actually work (end-to-end)

The full lifecycle of a user-deployed graph agent.

### 4.1 Compose

1. User clicks "+ Deploy" on canvas → `BuilderModal` opens.
2. Picks recipe (e.g. "Daily Solana brief") → composer seeded with
   a clone of the recipe's `AgentGraph` (fresh step ids).
3. Edits name, emoji, trigger, steps, budget.
4. Clicks Deploy → `POST /api/agents/spawn-graph`.

### 4.2 Persist

- `/api/agents/spawn-graph` validates body via `AgentGraphSchema` (Zod).
- Verifies `x-owner-wallet` header matches `vaults.owner_wallet`.
- Calls `createGraphAgent()` which inserts a row into `agents` table:
  - `template = 'custom'`
  - `graph_json = JSON.stringify(graph)`
  - `frequency_seconds = 0` (legacy field, inert for graph agents)
  - `status = 'alive'`
- Returns 201 with the new agent record.
- Client closes modal, bumps `canvasRefreshKey` — canvas remounts and
  fetches the new tile.

### 4.3 Schedule (interval/cron only)

- The `agent-pool` PM2 process ticks every ~10s, calling
  `POST /api/agents/pool-tick`.
- Inside that handler, `runner.tickEligibleAgents()` first calls
  `tickGraphAgents()` from `src/lib/agents/graph/scheduler.ts`.
- For each agent with `graph_json IS NOT NULL`:
  - Skip if trigger is `manual` or `webhook` (other paths handle)
  - Compute `lastRunStartedAt` from agent_runs MAX(started_at)
  - For `interval`: due if `now - lastStart >= ms`
  - For `cron`: parse expression with `cron-parser`, due if
    `prev() > lastStart`
  - If due: `dispatchRun()`
- Then the legacy loop runs for non-graph agents (Atlas, worker trio
  on pre-v1.1 vaults).

### 4.4 Dispatch (`src/lib/agents/graph/dispatcher.ts`)

`dispatchRun({ agentId, triggerKind, triggerPayload })` is the single
chokepoint. Called from:
- `tickGraphAgents()` for cron/interval
- `POST /api/agents/[id]/run` for manual
- `POST /api/agents/[id]/webhook/[secret]` for webhooks

Steps:
1. Load agent row → fail if `status != 'alive'` or `graph_json` missing.
2. Parse graph defensively via `safeParseGraph` → fail on invalid blob.
3. Load vault row → need `owner_wallet` for the run context.
4. Concurrency caps:
   - Per-vault: max 3 active runs (queued or running)
   - Global: max 30 active runs
5. Daily cap: count today's runs for this agent (UTC day window) →
   refuse if `>= graph.config.maxRunsPerDay`.
6. Insert `agent_runs` row with `status = 'queued'`.
7. Mark `running`.
8. Call `runGraph()`.
9. Finalize the run row with the resulting `RunContext`:
   - `step_outputs_json = JSON.stringify(ctx.outputs)`
   - `total_cost_usd = ctx.costUsd`
   - `status = ctx.abortReason ?? 'succeeded'`

### 4.5 Execute (`src/lib/agents/graph/executor.ts`)

`runGraph(input)` walks the graph:
1. Build initial `RunContext` with `vars = { trigger, vault }`.
2. For each step:
   - If `branch`: evaluate condition via `expression.ts` (safe parser
     + tree walk, no eval). Recurse into then/else branch.
   - If `loop`: resolve items array, iterate up to maxIterations,
     bind `itemVar` + `itemVar_index`, recurse into body. Restore
     prior bindings after.
   - Else: dispatch to leaf step executor.
3. Per-step lifecycle:
   - Cost ceiling check before
   - Execute (interpolate config strings, call provider/RPC)
   - Push `StepOutput` to `ctx.outputs`
   - Bind output to `ctx.vars[outputVar]` if step succeeded
   - Apply onError policy (`fail` aborts, `skip`/`continue` moves on)
4. Return final `RunContext`.

### 4.6 Surface

- Run row finalized → `agent_runs` updated.
- `log` step writes to `agent_thoughts` → appears in per-vault event
  feed (the right column in `AliveConsole`).
- `signal` step writes to `signals` → appears in `/app/inbox`.
- Money-moving steps (`vault.pay`, `transfer.usdc`) call
  `serverVaultPay()` which:
  - Off-chain pre-check (the policy engine in `policy-engine.ts`)
  - If allowed: signs Squads `spendingLimitUse` instruction, submits
    to chain, awaits confirmation.
  - If blocked AND violation is one Squads enforces (per-tx /
    daily / weekly cap): submits anyway with `skipPreflight` so the
    chain produces a real failed-tx signature.
  - Otherwise (off-chain-only violations like `merchant_not_allowed`):
    returns `blocked: true` with no signature.
- Returns the run, runs tab refreshes via 6s polling.

---

## 5. Step types — every type, what it does

All defined in `src/lib/agents/graph/types.ts` (TypeScript) and
`schemas.ts` (Zod). Executors in `src/lib/agents/graph/steps/`.

| Type | Config fields | What runs | Output |
|---|---|---|---|
| `llm` | provider, model, system, prompt, maxTokens, temperature | Multi-provider HTTP call (Anthropic native messages OR OpenAI-compat `/v1/chat/completions`). Reads BYOK key for that provider. Falls back to `reasoning_content` when `content` is empty (gpt-oss-120b is a reasoning model). | `{ text, tokens: { input, output }, provider, model }` |
| `http` | method, url, headers, body, payShWrap, timeoutMs, expectStatus | `fetch()` with SSRF protection (no localhost, no private IPs, http(s) only). 5MB response cap. Auto-parses JSON when content-type matches. | `{ status, body, headers }` |
| `vault.pay` | merchant, to (pubkey), amount, memo | Calls `serverVaultPay()` which routes through the on-chain policy program. Settles via Squads multisig OR fails on-chain with custom error code. | `{ signature, explorerUrl, amountUsd, merchant, to }` on success; `{ reason, blocked, signature, explorerUrl }` on fail |
| `transfer.usdc` | to, amount, memo | Sugar around `vault.pay` with synthetic merchant `self_transfer` — for KAST top-ups, allowlisted self-transfers. | Same shape as vault.pay |
| `log` | message, level | Inserts a row into `agent_thoughts` with the interpolated message. Appears in per-vault event feed. | `{ message, level }` |
| `signal` | kind, subject, evidence, suggestion, sourceUrl | Inserts a row into `signals` table. Subject is the inbox card title; evidence (newline-separated lines) becomes JSON array of bullets. | `{ id, kind, subject, evidenceCount }` |
| `branch` | condition, then[], else[] | Safe expression evaluator (numbers, strings, identifiers, comparisons, `&&`/`||`/`!`, parens, dotted paths, array indexing). NO `eval()`. Recursively executes the chosen branch. | `{ chosen: 'then'|'else', condition }` |
| `loop` | items (var path), itemVar, body[], maxIterations | Resolve `items` from vars, iterate up to cap. Local scope for itemVar + itemVar_index. | `{ iterations, capped }` |

### Variable interpolation

`{{path.to.value}}` substitution everywhere strings are accepted:
- Dotted paths: `{{step1.output.text}}`
- Array indexing: `{{items[0].id}}`
- Reserved: `{{trigger.payload.*}}`, `{{vault.id}}`, `{{vault.ownerWallet}}`
- Optional (returns "" on miss): `{{?optional.path}}`
- Strict (throws on miss): `{{required.path}}`

`interpolateDeep()` walks JSON-like values (HTTP headers, body) so
interpolation works at any depth.

---

## 6. Triggers

### Manual

`{ kind: 'manual' }`. Only fires when:
- User clicks "Run now" on the agent detail page
- Composer's "Test run" button (after first deploy)
- API client POSTs to `/api/agents/[id]/run`

### Interval

`{ kind: 'interval', ms: number }`. Bounds: 60_000 (1 min) – 86_400_000 (24h).

The scheduler dispatches when `now - lastRunStartedAt >= ms`. First
run fires immediately on next pool-tick if no prior runs.

### Cron

`{ kind: 'cron', expr: string }`. Standard 5-field expression, all UTC.
Parsed by `cron-parser` lib. Fires when `prev() > lastRunStartedAt`
(meaning a slot has elapsed since the most recent run).

### Webhook

`{ kind: 'webhook', secret: string }`. The secret is auto-generated
(uuid without dashes) and forms the auth in the URL:
`POST /api/agents/[id]/webhook/[secret]` → fires one run with the
request body as `trigger.payload`. Rate-limited 60/min/agent.

---

## 7. Recipes — what ships in the gallery

8 starter recipes in `src/lib/agents/graph/recipes.ts`. Each has an
emoji, name, description, longDescription, tag, and a complete
`AgentGraph`. All default to Commonstack `gpt-oss-120b` for LLM steps
(cheapest reliably-accessible model across BYOK tiers).

| # | Name | Tag | What it does |
|---|---|---|---|
| 1 | Daily Solana brief | ai | 8am UTC cron · LLM writes 3-bullet brief · log to feed · post to inbox |
| 2 | Subscription renewer | spend | Monday noon cron · vault.pay to allowlisted merchant · log |
| 3 | KAST auto-topup | spend | 1st-of-month cron · transfer.usdc to MY_KAST · log |
| 4 | Wallet watcher | watch | 15min interval · Solana RPC `getSignaturesForAddress` · LLM judges noteworthy · inbox alert |
| 5 | Yield rebalancer | spend | 6h interval · branch on threshold · vault.pay to yield venue or skip |
| 6 | Tip jar | earn | webhook trigger · vault.pay forward to recipient · log |
| 7 | Vault digest | ai | 9pm UTC cron · fetch vault events · LLM summarizes day · post to inbox |
| 8 | Quote and pay | ai | manual · LLM picks merchant from list · vault.pay · log |

All editable in the composer. Cloning a recipe regenerates step ids
so the user's copy is independent.

---

## 8. SDK — `@kyvernlabs/sdk`

Published at https://www.npmjs.com/package/@kyvernlabs/sdk
Latest: 0.5.0. Companion: `create-kyvern-agent` 0.2.0.

### Surface

```ts
import { Vault, OnChainVault, KastDestination } from "@kyvernlabs/sdk";

const vault = new Vault({
  key: process.env.KYVERN_KEY,
  baseUrl: "https://app.kyvernlabs.com", // optional
});

// Pay a merchant — chain-enforced
const tx = await vault.pay({
  merchant: "api.openai.com",
  to: "5KpVqXjCyRkLYBqtXUuzS45acGkKPG8DKB37CNhu7KGo",
  amount: 0.05,
  memo: "gpt-4o call",
});
// → { signature, explorerUrl, amountUsd } on success
// → throws PolicyError with code (12000-12011) on chain refusal

// Non-mutating policy probe (Phase 2 helper)
const allowed = await vault.checkAllowance({
  merchant: "api.openai.com",
  amount: 0.05,
});
// → { allowed: boolean, reason?: string, capCheck: {...} }

// Pause/resume the vault entirely
await vault.pause();
await vault.resume();

// On-chain helper (direct Anchor program calls)
const onChain = new OnChainVault({ ... });
await onChain.initializePolicy({ ... });

// KAST destination helper (Phase 2)
const kast = new KastDestination({
  vaultId: "vlt_...",
  destinationAddress: "...",
});
```

### Where the composer maps to SDK

The SdkPreview panel on the agent detail page shows this mapping
explicitly. Example for Daily Solana brief:

```ts
// Trigger: cron "0 8 * * *"
cron.schedule("0 8 * * *", async () => {
  // Generate brief
  const brief = await llm.call({
    provider: "commonstack",
    model: "openai/gpt-oss-120b",
    system: "Output exactly 3 bullets about Solana...",
    prompt: "3 bullets:",
  });
  // Log to feed
  log("📰 Solana brief · " + brief.text);
  // Post to inbox
  await inbox.emit({
    kind: "daily_brief",
    subject: "Today's Solana brief",
  });
});
```

Money-moving steps (vault.pay, transfer.usdc) include the comment:
`// ← chain refuses if rules don't pass`. Tells the user: this code
isn't a black box, the chain is the arbiter.

### create-kyvern-agent

`npx create-kyvern-agent my-agent` scaffolds a working pay.sh + KAST
agent in one command. Templates pin `@kyvernlabs/sdk@^0.5.0`.

---

## 9. On-chain layer — Anchor program + Squads

### Anchor program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`

Source: `anchor/programs/kyvern-policy/`. Deployed to Solana devnet.

**Instructions (4):**
1. `initialize_policy` — one-time per vault. Stores per-tx max,
   daily cap, weekly cap, merchant allowlist, memo requirement,
   paused flag. Authority = vault owner.
2. `update_allowlist` — add/remove merchants from allowlist.
3. `pause` / `resume` — kill switch.
4. `execute_payment` — the gate. Validates rules. Logs custom
   error and refuses the tx if any rule fails.

**Custom errors (12):**
```
12000 InvalidPolicy
12001 PolicyAlreadyInitialized
12002 AmountExceedsPerTxMax
12003 AmountExceedsDailyCap
12004 AmountExceedsWeeklyCap
12005 MerchantNotAllowlisted
12006 MissingMemo
12007 VaultPaused
12008 InvalidAuthority
12009 InvalidMint
12010 SlippageExceeded
12011 OracleStale
```

### Squads v4 multisig

Each user vault is a Squads smart account with:
- The user's wallet as the only multisig member
- A spending limit delegated to the agent's keypair
- USDC ATA owned by the vault PDA

`spendingLimitUse` is the on-chain instruction Squads enforces for
per-tx / daily / weekly caps. Routing through it means even a
compromised agent key can't drain beyond the cap.

### How a money-moving step actually settles

1. Step fires `serverVaultPay({ vaultId, merchant, recipientPubkey, amountUsd, memo })`
2. Off-chain pre-check via `policy-engine.ts`:
   - load vault config + spend snapshot
   - run rules (per-tx, daily, weekly, allowlist, memo, paused)
   - if any rule fails AND it's a Kyvern-only rule (allowlist, memo,
     paused): return `blocked` with no signature
   - if it fails on a Squads-enforced rule (per-tx/daily/weekly):
     proceed to chain so the chain produces a real failed-tx sig
3. Sign Squads `spendingLimitUse` with the agent keypair
4. Submit to chain (skipPreflight=false on success path,
   skipPreflight=true on forced-violation path)
5. Wait for confirmation (1.5–3s typical on devnet)
6. Return `{ success, signature, explorerUrl, blocked?, reason? }`

The Atlas reference agent has been doing this for 19 days straight.

---

## 10. Database schema

SQLite at `pulse.db` (default) or `process.env.PULSE_DB_PATH`. WAL mode.
Migrations via `tryAlter` in `src/lib/db.ts` — silently swallow
duplicate-column errors so re-running migrate is idempotent.

### Tables relevant to graph platform

**`agents`** — one row per agent (legacy + graph)
- `id` TEXT PK
- `device_id` TEXT (FK to vaults.id, ON DELETE CASCADE)
- `name`, `emoji`, `personality_prompt`, `job_prompt`, `allowed_tools`
- `template` TEXT (`custom` for graph, `bounty_hunter` etc for legacy)
- `frequency_seconds` (legacy field, 0 for graph)
- `status` TEXT (`alive` | `paused` | `retired`)
- `created_at`, `last_thought_at` INTEGER
- `total_thoughts`, `total_earned_usd`, `total_spent_usd`
- `is_public`, `metadata_json`, `config_json`
- **`graph_json` TEXT** (NULL for legacy, JSON for graph) ← v1 addition

**`agent_runs`** — one row per graph run (NEW v1)
- `id` TEXT PK
- `agent_id` TEXT
- `started_at`, `finished_at` INTEGER
- `status` TEXT (`queued` | `running` | `succeeded` | `failed` | `aborted_budget` | `aborted_concurrency`)
- `trigger_kind` TEXT
- `trigger_payload` TEXT (JSON)
- `step_outputs_json` TEXT (array of StepOutput records)
- `error_message` TEXT
- `total_cost_usd` REAL

Indexes: `(agent_id, started_at DESC)`, `(status, started_at DESC)`.

**`user_provider_keys`** — BYOK encrypted at rest (NEW v1)
- `id` TEXT PK
- `owner_wallet` TEXT
- `provider` TEXT (`anthropic`/`openai`/`deepseek`/`commonstack`)
- `label` TEXT
- `encrypted_key_blob` TEXT (AES-256-GCM, base64url)
- `key_last4` TEXT (for masked UI display)
- `created_at`, `last_used_at` INTEGER
- `last_test_status` TEXT (`ok`/`invalid`/`quota_exceeded`/`network_error`/`unknown`)
- `last_test_at` INTEGER

Index: `(owner_wallet, provider)`.

**`agent_thoughts`** — per-tick reasoning + signature (legacy + graph)
Used by:
- Legacy runner writes one row per agent tick
- Graph `log` step writes one row per log execution
- Both surface in the per-vault event feed via `/api/vault/[id]/events`

**`signals`** — inbox findings (legacy + graph)
Used by:
- Legacy runner writes signals via tools (`message_user`, `wallet_alert`, etc.)
- Graph `signal` step writes here too
- The `/app/inbox` UI reads from here. v1.1 dropped the kind filter
  so graph-emitted kinds (daily_brief, vault_digest, etc.) surface.

**`vaults`** — one per device
- `id`, `owner_wallet`
- `daily_limit_usd`, `weekly_limit_usd`, `per_tx_max_usd`
- `squads_address`, `spending_limit_pda`, `network`
- `paused_at`, `created_at`, `updated_at`
- `kast_destination_address` (Phase 2 KAST)

**`vault_agent_keys`** — kv_live_… API keys
- `id`, `vault_id`, `key_prefix`, `key_hash`
- `solana_pubkey`, `solana_secret_b58` (the agent's delegated keypair)

---

## 11. API surface

All endpoints under `/api/`. Auth pattern: `x-owner-wallet` header
must match the resource's owning wallet. Some legacy endpoints have
no auth — TODO to tighten.

### Agent platform v1 endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/devices/[id]/graph-agents` | List graph agents on a vault (auth) |
| POST | `/api/agents/spawn-graph` | Create new graph agent (auth) |
| GET | `/api/agents/[id]/graph` | Read graph (auth) |
| PATCH | `/api/agents/[id]/graph` | Replace graph (auth) |
| POST | `/api/agents/[id]/run` | Manual trigger (auth) |
| GET | `/api/agents/[id]/runs` | Paged run history (auth) |
| POST | `/api/agents/[id]/webhook/[secret]` | Webhook trigger (secret-in-path auth) |

### BYOK keys endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/keys/providers` | List masked keys for owner |
| POST | `/api/keys/providers` | Store new key (encrypts at rest) |
| GET | `/api/keys/providers/[id]` | Get one (masked) |
| DELETE | `/api/keys/providers/[id]` | Remove key |
| POST | `/api/keys/providers/[id]/test` | Verify key with 1-token request |

### Existing endpoints (still relevant)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/vault/create` | Provision Squads vault + Anchor policy + airdrop 1 USDC |
| GET | `/api/vault/list?ownerWallet=...` | List vaults for an owner |
| POST | `/api/vault/pay` | Direct payment (used by SDK) |
| POST | `/api/vault/check-allowance` | Non-mutating policy probe |
| GET | `/api/vault/[id]/events` | Per-vault event feed (auth) |
| POST | `/api/vault/[id]/test-payout` | Wizard step 5 (auth) |
| GET | `/api/vault/[id]/integration-progress` | Wizard state (auth) |
| GET | `/api/devices/[id]/inbox` | Findings list |
| GET | `/api/devices/[id]/live-status` | Top status pill data |
| GET | `/api/atlas/status` | Atlas counters (public) |
| POST | `/api/atlas/probe-scenarios` | Atlas attack probes |
| POST | `/api/atlas/probe-paysh` | Pay.sh wrapped probe |

---

## 12. Authentication + BYOK

### Privy auth

- `NEXT_PUBLIC_PRIVY_APP_ID = cmnlh7kpr01pn0clalxsuhq0s` (in env)
- Email / Google / wallet login methods
- Privy creates an embedded Solana wallet on first login (force-created
  via `createOnLogin: "all-users"` in providers.tsx)
- `useAuth()` hook (`src/hooks/use-auth.ts`) returns `wallet` (Solana
  base58 address) — picks `solanaWallets[0].address` first, falls back
  to `user.wallet` (if Solana), last resort `wallets[0].address`

Known race: on first render after sign-in, `wallet` may be null while
Privy hydrates. Components using it should guard with `if (!wallet) return`.

### x-owner-wallet header

Every authenticated API call sends:
```
x-owner-wallet: <user's Solana base58 pubkey>
```

The endpoint loads the resource (vault, agent, key), looks up its
owning wallet, compares strict-equal. Mismatch → 401 with specific
error code (`owner_mismatch` etc.).

This is NOT a cryptographic check. It trusts the client to send the
right value. Real security comes from:
- Privy's session JWT (the user can't fake their own wallet)
- Squads spending limit (even if API is bypassed, chain refuses)
- The agent's API key (separate auth for SDK callers)

### BYOK provider keys flow

1. User opens Keys modal in /app top.
2. Picks provider, label, pastes plaintext key, Save.
3. `POST /api/keys/providers`:
   - Validates body (provider enum, lengths)
   - Encrypts plaintext via `encryptKey()` (AES-256-GCM, scrypt-derived
     32-byte key from `KYVERN_KEY_VAULT_SECRET` env var, 12-byte IV
     per record, packed as base64url envelope)
   - Stores `encrypted_key_blob` + `key_last4` in `user_provider_keys`
4. UI shows row with masked last4 + "untested" badge.
5. Click Test → `POST /api/keys/providers/[id]/test`:
   - Loads + decrypts key in function scope (never logged)
   - Sends 1-token request to provider
   - Classifies status (ok / invalid / quota_exceeded / network_error / unknown)
   - Caches on row, returns to UI.
6. At LLM step execution time, `loadKeyForUse(ownerWallet, provider)`
   returns the most-recently-used or newest key for that provider.
   Plaintext is held in a function-scope variable, used in the
   provider call, then falls out of scope.

---

## 13. What works / what's broken

### What works (verified end-to-end on prod 2026-05-10)

- Sign in via Privy email → /unbox → vault provisioned with real Squads
  multisig + Anchor policy + 1 USDC seed airdrop
- /app loads with empty canvas (post-v1.1 users)
- Add Commonstack BYOK key → Test → ✓ ok
- Deploy "Daily Solana brief" recipe → tile lands on canvas
- Detail page shows policy program pill + step list + SdkPreview panel
- Run now → LLM step succeeds (with bumped maxTokens=2000) → log step
  writes to feed → signal step writes to inbox
- Findings tab shows the new daily_brief card (after v1.1.3 fix to
  drop USER_FACING_KINDS filter)
- Delete agent → tile disappears within ~8s (after v1.1.2 fix to
  filter retired in canvas query)
- Atlas continues running on its own pm2 process, unchanged

### What's known broken or partial

- **App-not-smooth / multiple refreshes:** Privy hydration race on
  first load. Fixed canvas to refresh on focus/visibilitychange. If
  it still happens, need a more specific repro to dig deeper.
- **Branch + loop nested step UI:** Currently edit nested step lists
  as raw JSON in the form. No drag-drop nested editor. v1.5 work.
- **Variable picker:** Current "available variables" hint is
  a passive chip strip. No autocomplete-on-typing-{{. v1.5.
- **Settings page:** Still the legacy version. No master pause
  toggle, no BYOK keys promoted from modal, no per-agent run-budget
  summary. v2 work.
- **Streaming Test Run:** Composer's "Test run" button is synchronous
  — awaits the full graph execution before showing results. For long
  graphs this can block 30s+. v1.5 will switch to SSE streaming.
- **Webhook URL display:** Webhook trigger generates a secret + shows
  the URL but only after the agent is saved (since agent id is part
  of the URL). The composer's draft state can't show the URL
  pre-save. Minor UX paper-cut.
- **Inbox kind filter dropdown:** Shows all kinds in DB, not just
  user-facing ones. Includes legacy worker kinds even on graph-only
  vaults. Worth scoping per-device or per-agent.
- **Old historic Pulse signals:** Pre-v1.1 vaults had Sentinel/Wren/Pulse
  auto-seeded. Their historical signals stay in the inbox forever
  unless dismissed. New v1.1 vaults don't get auto-seeded.
- **`scripted.ts` (2174 lines):** Still load-bearing for Atlas + the
  legacy trio. Won't be retired until those agents are migrated to
  graphs or sunset.
- **No "rerun from step N":** A failed run can only be re-run from
  the start. No partial replay.
- **No agent versioning:** Editing an agent's graph mutates in place.
  Old runs reference step ids that may no longer exist in the current
  graph. Run history is durable (stored as JSON in the run row) but
  the Edit flow can't show "what graph version produced this run."
- **No usage analytics:** No "how many times has this agent run this
  week / how much has it cost" summary anywhere.

### Known UX gaps (the user flagged these)

- Agent UX should make it clearer that **every money-moving step
  passes through the on-chain policy program**. Partly addressed by:
  - Header pill "⛓ Policy · PpmZ…MSqc"
  - Per-step "chain settled" / "chain refused" badges
  - `SdkPreview` panel showing equivalent SDK code with policy comments
- But the canvas itself doesn't visualize the chain. The strings go
  from tile to vault — they could go from tile through a "chain"
  glyph and then to vault. v2 polish.
- The composer doesn't preview the SDK code for the graph being
  composed (only the deployed agent's detail page does). Users learn
  the abstraction by deploying; would help to see it pre-deploy.

---

## 14. Open design questions

These are the things worth discussing with another AI model:

1. **Two-era coexistence: keep or migrate?** Atlas + the legacy trio
   give us 19 days of unbroken on-chain proof, but they live in a
   separate code path (`scripted.ts`, hardcoded URGENT directives).
   Do we sunset them in v1.2? Migrate them to graphs? Keep both forever?

2. **Worker page UX vs agent detail page UX.** The user wants the
   agent detail to feel "as good as the SDK shows." Concretely:
   - Should the canvas visualize the policy program (a chain glyph
     between tile and vault)?
   - Should the composer show real-time SDK preview as the user edits?
   - Should run output be streamed live (tokens, http chunks) instead
     of arriving at the end?

3. **Custom step types.** Right now the 7 step types are baked in.
   Should users be able to define their own (e.g. a Discord-post step,
   a Slack-notify step, a webhook-out step)? Adds significant complexity.

4. **Marketplace.** A Builder shares their agent recipe; Other users
   clone-and-deploy. Schema is straightforward (recipes are JSON).
   Authentication / spam control / monetization questions are not.

5. **Multi-LLM-step orchestration.** Current LLM steps return text.
   No native way to chain "LLM picks merchant → LLM evaluates → LLM
   summarizes." Possible via interpolation + multiple steps but the
   variable types are loosely typed (any `string | object`). Is a
   typed schema worth it?

6. **Agent-to-agent triggers.** The `agent.call` step type was sketched
   in the original design but not implemented. Would let one agent's
   output trigger another. Multi-agent orchestration territory.

7. **Public vs private agents.** `is_public` flag exists on the
   agents table but no UI toggle. Public agents could appear in a
   global feed (Atlas is public this way). Privacy-by-default is
   probably right but worth deciding.

8. **Pricing.** v1 is free (BYOK = user pays providers). At what
   point does Kyvern itself start charging? Per-vault subscription?
   Per-agent? Per-run? Take a slice of vault.pay flow?

9. **Mobile experience.** The whole UI is responsive but no native app.
   Push notifications for inbox would be valuable. Requires a server
   subscription model + notification credentials.

10. **Audit logging.** Every graph step is logged in agent_runs. Every
    chain action has a signature. But: what about admin actions on
    the vault (allowlist updates, pause/resume)? Not logged for
    inspection in the UI.

---

## File map (where things live)

```
src/
  app/
    app/                                  ← /app (the auth shell)
      page.tsx                            ← AliveConsole mount
      agents/[id]/page.tsx                ← detail page (routes to GraphAgentDetail)
      inbox/page.tsx                      ← Findings
      settings/page.tsx                   ← Settings (legacy)
    api/
      agents/
        spawn-graph/route.ts              ← POST create graph agent
        [id]/
          route.ts                        ← GET (with hasGraph flag)
          graph/route.ts                  ← GET/PATCH graph
          run/route.ts                    ← POST manual trigger
          runs/route.ts                   ← GET paged history
          webhook/[secret]/route.ts       ← POST external trigger
          status/route.ts                 ← PATCH alive/paused/retired
      devices/[id]/
        graph-agents/route.ts             ← GET tile list
        inbox/route.ts                    ← GET findings
        live-status/route.ts              ← GET top pill
      keys/providers/                     ← BYOK CRUD
      vault/[id]/                         ← vault config + payouts
  components/
    device/
      shell/alive-console.tsx             ← /app body
      graph-canvas/
        canvas.tsx                        ← N-tile + strings + vault
        tile.tsx                          ← single agent card
        add-tile.tsx                      ← + Deploy CTA
      builder/
        modal.tsx                         ← outer shell, pick→edit
        recipe-gallery.tsx                ← 8 cards + blank
        composer.tsx                      ← step list + forms + Deploy
        trigger-form.tsx                  ← manual/interval/cron/webhook
        test-run-panel.tsx                ← run results
        step-forms/index.tsx              ← per-type forms
      agent/
        graph-detail.tsx                  ← detail page (runs/graph/settings)
      keys/keys-modal.tsx                 ← BYOK manager
      wizard/integration-wizard.tsx       ← 5-step setup (existing)
      feed/agent-event-feed.tsx           ← per-vault thought feed
    inbox/                                ← inbox card components (legacy + new)
    os/
      kyvern-os.tsx                       ← auth shell (mounts TabBar)
      tab-bar.tsx                         ← Home/Findings/Settings
      status-bar.tsx                      ← top pill
  lib/
    agents/
      runner.ts                           ← legacy LLM tick path (Atlas)
      scripted.ts                         ← legacy fallback (2174 lines)
      templates.ts                        ← legacy template defs
      store.ts                            ← agent CRUD + listInbox + countSignals
      types.ts                            ← Agent, Signal, AgentTool types
      first-messages.ts                   ← legacy boot beats
      graph/                              ← v1 platform (NEW)
        types.ts                          ← AgentGraph, StepDef, RunContext
        schemas.ts                        ← Zod
        executor.ts                       ← walks the graph
        dispatcher.ts                     ← single chokepoint for runs
        scheduler.ts                      ← interval/cron eligibility
        runs-store.ts                     ← agent_runs CRUD
        agent-store.ts                    ← createGraphAgent, listGraphAgentsForDevice
        keys-crypto.ts                    ← AES-GCM
        keys-store.ts                     ← user_provider_keys CRUD
        recipes.ts                        ← 8 starter recipes
        expression.ts                     ← branch condition evaluator
        interpolate.ts                    ← {{var}} substitution
        steps/
          llm.ts                          ← multi-provider LLM step
          http.ts                         ← SSRF-safe fetch
          pay.ts                          ← vault.pay + transfer.usdc
          log.ts                          ← writes to agent_thoughts
          signal.ts                       ← writes to signals (NEW)
    server-pay.ts                         ← serverVaultPay (chain settlement)
    policy-engine.ts                      ← off-chain pre-check
    squads-v4.ts                          ← Squads multisig wrappers
    kyvern-policy/                        ← Anchor program client
    solana-keystore.ts                    ← server fee payer
    db.ts                                 ← migrations + getDb()

anchor/programs/kyvern-policy/            ← deployed Anchor source

decks/                                    ← Frontier + Kast Pakistan decks
```

---

## Summary for an outside reviewer

We built two things on top of Solana:

1. **A working policy primitive** — an Anchor program + Squads multisig
   pattern that means an agent can have a budget without a private key.
   Atlas (a reference agent) has been live 19 days, 9k+ cycles, every
   refusal verifiable on Explorer.

2. **A composer for ordinary users to build agents on top of that
   primitive** — drag-list-of-steps UI, 7 step types, 4 trigger types,
   BYOK keys, recipes that produce real findings on every run.

The composer was built in ~24h on 2026-05-10 in a single push (commits
`00b16ab` → `efb3786`). It's live on production. Several recipes work
end-to-end. The main remaining friction is UX polish: better
visualizations of chain enforcement, real-time run streaming, settings
page promoted from modal, signal kinds dropdown scoped per-device.

The bigger product question — should Kyvern be a vault SDK with a
chassis (current state) or evolve into a fuller agent platform (clear
direction we've started but haven't finished) — is open and worth
debating with another model.
