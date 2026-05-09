# Kyvern — raw reality, May 9 2026

This is what the product *actually* is right now, not the marketing. Written for a strategy chat. No flourishes.

---

## The one-sentence claim

Every AI agent gets a Solana smart account (Squads v4) with an on-chain Kyvern policy program that enforces budgets, merchant allowlists, velocity caps, memo requirements, and a kill switch — *before* a single USDC lamport moves.

**Tagline:** "Let your AI agents run free." **Manifesto:** "Agents shouldn't have keys. They should have budgets."

---

## Verified facts (real, on-chain, today)

- **Atlas reference agent live since 2026-04-20** — 19 days continuous on Solana devnet
- **8,859 cycles** completed (one every 2 minutes via `scripts/atlas-runner.ts`, separate PM2 process)
- **1,356 settled payments**, $57.84 spent, $22.90 earned (cumulative, real Squads txs)
- **6,557+ attack attempts blocked**, $0 drained
- **Kyvern Anchor program deployed** at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` — 4 instructions, 16 error codes (`VaultPaused`, `AmountExceedsPerTxMax`, `MerchantNotAllowlisted`, `MissingMemo`, `VelocityCapExceeded`, plus oracle-mode codes)
- **`@kyvernlabs/sdk@0.4.0`** published to npm — `Vault` (HTTP) + `OnChainVault` (Anchor CPI direct)
- **`create-kyvern-agent@0.1.1`** published to npm — `npx create-kyvern-agent my-agent` scaffolds a working demo
- **VM:** single Hetzner box, 4 PM2 processes (kyvern-commerce :3001, atlas, atlas-attacker, agent-pool, atlas-subscriber). Both `kyvernlabs.com` and `app.kyvernlabs.com` route to it.

---

## Surface walkthrough

### 1. Landing (`kyvernlabs.com/`)

**What you see:** Hero device with orbital workers (CSS 3D + Framer Motion), eyebrow `Atlas · 19 live · Solana devnet`, headline *"A Solana device for your AI agent. The chain decides every dollar it spends."*, two CTAs (`Try a Kyvern · no login` → `/try`, `See Atlas live` → `/atlas`), trust bar with live numbers (days live, total earned, total on-chain actions, attacks blocked).

**Real:** Trust bar polls `/api/atlas/status` every 5s. Earnings, blocked count, days-live are real DB queries against `atlas.db`. The attack-wall preview pulls 24 most-recent failed txs from `/api/atlas/decisions?kind=attacks&limit=24`, each clickable to Solana Explorer.

**Theater:** The orbital "workers" are pure CSS animation. The 3D device is a mock of a hardware concept that doesn't exist. The "Live Economy" section preview is a static screenshot of `/app`, not a live mount.

---

### 2. Login → Unbox → /app

**Login (`/login`)** — Two cards: "Get a Kyvern device" (fresh) or "I own a Kyvern device" (returning, routes to `/recover`). Privy modal handles auth (email / Google / wallet). Picker mode held in `sessionStorage` to survive Privy's redirect cycle.

**Unbox (`/unbox`)** — A 30–60s cinematic. Stages: closed box → opening (1.3s) → serial typewriter ("KVN-XXXXXXXX" derived from wallet address, ~0.7s) → "Born · [date]" stamp → 3-LED boot sequence (Auth → Vault → Ready, 2.6s) → device "screen" with three worker rows (Sentinel, Wren, Pulse).

**What's actually happening behind the cinematic:**
1. `/api/vault/list?ownerWallet=...` → check existing
2. `/api/vault/create` → **creates a real Squads v4 multisig on Solana devnet** (5–15s), provisions USDC ATA, sets daily/weekly/per-tx caps, issues server-signed agent key (`kv_live_...`)
3. `/api/agents/spawn` ×3 → seeds the starter trio (Sentinel, Wren, Pulse) with template-specific prompts + tool allowlists into the SQLite `agents` table

For Privy embedded wallets there's an extra "device key reveal" ritual: user clicks "Reveal device key" → Privy `exportWallet()` modal shows the base58 secret → user pastes it back into a textarea → local `Keypair.fromSecretKey()` validation, no bytes sent to server. For external wallets (Phantom/Solflare/Backpack), this whole reveal step is skipped — their key already lives in the wallet app.

**Theater:** Box geometry, LED animations, serial typewriter, and "Born" stamp are pure CSS/Framer. The boot sequence LEDs aren't reading actual provisioning state — they're timed animations running in parallel with the real provisioning calls.

**Real:** Real Squads multisig, real USDC ATA, real agent key issuance, real persisted agents, real device key reveal (when applicable).

---

### 3. The device dashboard (`/app`)

Three layers:
- **Top rail** — KVN serial, uptime, vault USDC balance, "Secured by Squads" pill
- **Worker stage** — three vertical tiles (one per worker), each with: status LED, emoji + name, latest action (`Tried $0.05 → ✓ Settled` or `Tried $5.00 → ❌ Blocked`), and a clickable tx-signature pill
- **Bottom rail** — daily-cap gauge, calls today / blocked today, last settled tx

**Below the fold (hidden in pull-up sheet):** the legacy 9-card dashboard (ActionFeed, RevenueTerminal, PolicyShield, etc.) — kept for power users, surface ritual prioritized.

**Three tabs at the top:**

- **Tab 1 — Live Engine.** Living canvas: vault at center, workers as orbiting nodes with animated "wires" between them and the vault. Reads from `/api/devices/[id]/live-status` every 5s.
- **Tab 2 — Deploy a worker.** 3+2 bay slots (3 occupied with starter trio, 2 empty "click-to-fill"). Picks a template, fills frequency, hits Deploy → `/api/agents/spawn`. Celebration toast on success.
- **Tab 3 — Pay & Enforce.** Two sub-sections:
  - **Policy in action** — 1-click drain ("Try to drain $5") fires `/api/atlas/probe` against Atlas's vault, returns a real failed tx hash + Explorer link.
  - **Policy playground** (collapsed under "Advanced") — a form with merchant + amount + memo. Click "Run through policy" → `/api/devices/[id]/playground-pay`. **As of today (Path B shipped):** Squads-enforceable violations (per-tx cap, daily cap, weekly cap) submit to chain with `skipPreflight: true` and produce a *real failed tx signature* with Squads error code `Custom 6026` (`SpendingLimitExceeded`). Other violations (merchant allowlist, missing memo, velocity, paused) stay off-chain in ~2ms with a clickable link to the deployed Anchor program at `PpmZ…MSqc`.
  - **Wrap your own agent** — interactive code pane, two tabs (SDK + Pay.sh/x402). Shows the user's actual `kv_live_...` agent key inline, "Mint a key" button reveals once.

---

### 4. /atlas (the public "observatory")

The proof page. Sections:

1. **Manifesto** — *"Agents shouldn't have keys. They should be policy programs."*
2. **Device plinth** — same CSS 3D device
3. **Hero stats** — uptime, funds lost (always 0), attacks blocked
4. **Earnings hero** — real cumulative earned + 14-day daily sparkline from `/api/atlas/economy`
5. **Economy stats** — settlements, earned, spent, average payout, success rate (computed off `atlas_decisions` table)
6. **Economic ledger** — table of real x402 subscriber `feed_purchases` (real payments routed through Atlas's vault when a third party calls `/api/atlas/feed`)
7. **"Drain Atlas" dare** — Try to drain it. Real failed-tx wall: 60 most-recent attack attempts, each one a real Solana failed tx, each clickable to Explorer
8. **Three-layer diagram** — Device · Budget · Workers
9. **Top-up Atlas** — manual sponsor button

All numbers polled every 5s from real DB queries. Initial render is SSR'd via `readInitialAtlasSnapshot()` so no "loading" flash.

---

### 5. /docs

Sticky-sidebar dev docs. Sections: Install, Quickstart, `vault.pay()`, `vault.status()`, kill switch, error codes table, REST API, what's next.

Install is `npm install @kyvernlabs/sdk` (zero runtime deps). Quickstart is the canonical 3-line wrap:
```typescript
const vault = new Vault({ agentKey: process.env.KYVERNLABS_AGENT_KEY! });
const res = await vault.pay({ merchant, recipientPubkey, amount, memo });
if (res.decision !== "allowed") throw new Error(res.reason);
```

The error-codes table is one-to-one with the Anchor program error codes (`vault_paused`, `amount_exceeds_per_tx`, `amount_exceeds_daily`, `amount_exceeds_weekly`, `merchant_not_allowed`, `velocity_cap`, `missing_memo`).

---

## What runs in the background

Four PM2 processes on the VM, all live:

### `kyvern-commerce` (port 3001)
The Next.js app. Serves both domains. Hosts `/api/vault/pay`, `/api/atlas/*`, `/api/devices/[id]/*`, `/api/agents/*`. SQLite for app state (`vault_store.db`), separate SQLite for Atlas (`atlas.db`).

### `atlas` — `scripts/atlas-runner.ts`
Atlas's own dedicated tick loop. Cycle every 120s (`ATLAS_CYCLE_MS`). Per cycle:
1. Increment counter
2. `decide()` returns `{ reasoning, action, merchant, amountUsd, memo }` — **this is currently scripted, not LLM** (rotates through a hardcoded `ACTIONS` array in `src/lib/atlas/decide.ts`: pay api.perplexity.ai $0.04, api.brave.com $0.02, api.openai.com $0.07, api.anthropic.com $0.09, pay.sh $0.01–$0.15, Arweave for publish). The code comment says *"Next session we swap this implementation for a real LLM call."*
3. POST `/api/vault/pay` with Bearer `KYVERNLABS_AGENT_KEY`, vault `vlt_QcCPbp3XTzHtF5`
4. Real Squads CPI fires — payment settles or refuses on-chain
5. Write to `atlas_decisions` + `atlas_cycles` tables

Side loops: every 30 cycles → auto-drip USDC top-up if balance < $1; every 5 cycles → rotate ecosystem sources (Superteam, Solana Foundation) and surface signals to Inbox; every 15s → heartbeat.

**Honest gap:** The merchant names ("api.openai.com" etc.) appear in the decision narrative + memo, but the actual on-chain destination is a fixed devnet test recipient, not the named merchant's wallet. Real chain settlement, theatrical destination.

### `atlas-attacker` — `scripts/atlas-attacker.ts`
Adversary loop. Cycle every 22 minutes ± 20% jitter. Picks one of four canned scenarios from `src/lib/atlas/attack-catalog.ts`:
- `rogue_merchant` — pay $0.05 to off-allowlist wallet
- `prompt_injection` — memo with injection attempt
- `over_cap` — request $25 (way past per-tx cap)
- `missing_memo` — payment without required memo

Fires same path as Atlas: POST `/api/vault/pay` with Bearer key. Off-chain policy refuses most. Outcomes recorded in `atlas_attacks` table (id, type, blocked_reason, failed_tx_signature). The `/atlas` attack wall reads from this table.

**Honest gap:** Catalog is deterministic, not organic. "Attacks blocked: 6,557+" includes off-chain refusals. After today's Path B shipping, the over-cap scenario produces a real failed Solana tx. The other three (rogue merchant, prompt injection, missing memo) still get caught in ~2ms server-side. Anchor program has the rules; the hot path doesn't currently route blocked-by-allowlist through it.

### `agent-pool` — `src/lib/agents/runner.ts`
The runner for *user-spawned* agents (everyone except Atlas). Generic loop, agent-template-driven via `personalityPrompt` + `jobPrompt` + `allowedTools`. Two execution paths:
- **LLM path:** DeepSeek-v4-flash via Commonstack (OpenAI-compatible, $0.05/M in, $0.25/M out), if API key set + global rate-limit slot available
- **Scripted fallback:** template-specific hardcoded decisions

Every tick: load agent → build system prompt → call LLM (or script) with tools → execute tool calls (`vault.pay()`, web search, post task, stake) → write `device_log` + tick row.

**This is what runs Sentinel, Wren, Pulse, and any worker the user spawns.** The three "starter workers" are just three rows in the `agents` table with different templates. The runner is generic.

---

## The pre-installed worker trio (real story)

All three are **real agents** — they tick on the agent-pool runner, hit external APIs, write signals, spend USDC. The "worker type" distinction is narrative; the code is one engine.

| Worker | Template | Frequency | What it claims | What it actually does |
|---|---|---|---|---|
| **Sentinel** | `bounty_hunter` | 600s | Scans Solana bounties, drafts applications via Pay.sh/Gemini | Polls Superteam Earn + Solana Foundation grant sources, drafts application via cheap LLM, writes a signal of kind `drafted_application` to the inbox |
| **Wren** | `whale_tracker` | 240s | Watches whale wallets, pings on material moves | Reads recent on-chain Solana history for a list of whale addresses, scores material moves via LLM, writes signal of kind `wallet_alert` |
| **Pulse** | `token_pulse` | 180s | Fires conditional swap on price-band trigger | Reads SOL price from CoinGecko (DexScreener fallback when CoinGecko 429s), evaluates threshold rules, writes `trigger_armed` / `trigger_fired` / `trigger_blocked` signals; the "swap" path goes through `swap_via_oracle` (Anchor program Phase 1 feature, oracle signer hardcoded at `Aa4MMPqeTxg3M11RdiRngX9QDBuKmgB5MjRdp9TmxDc`) |

All three call `vault.pay()` (the LLM tool layer wraps it) → real Squads CPI → real or refused on-chain settlement.

---

## The chain plumbing (the heart of the claim)

When `vault.pay()` is called (from SDK, Atlas runner, or any agent):

1. **HTTP** — POST `/api/vault/pay` with `Authorization: Bearer kv_live_...`
2. **Server policy pre-check** — `evaluatePayment()` runs in ~1ms. Reads vault config + 24h spending snapshot. Checks: paused, amount > 0 ≤ per-tx cap, merchant allowlisted, memo required, velocity cap.
3. **If blocked off-chain** — record `status: "blocked"`, return 402 with `code` + `reason`. **As of today's Path B fix:** if the violation is per-tx/daily/weekly cap AND `forceOnChain: true` is passed, the route bypasses the early return, builds the Squads `spendingLimitUse` instruction, submits with `skipPreflight: true`, captures the resulting failed signature, returns it in the response. Verified live with sig `2DgGDG728Ji7sGVmWU1sz5F8PkziarqpSJCZChXyUP8dWQBF4wZgdo3f5nwc9dAtFhyW9C6wrGNQbnKPWAm2fGaw` finalized on devnet, custom error 6026.
4. **If allowed** — `coSignPayment()` builds the Squads `spendingLimitUse` instruction. Squads multisig CPIs into the Kyvern Anchor program's `execute_payment`. The Anchor program checks merchant allowlist (SHA-256 hashes), memo presence, velocity (rolling per-slot window), pause state. If passes, Squads's own daily/weekly caps apply, USDC moves on-chain. `confirmOrThrow()` waits for confirmation. Returns 200 with tx signature + Explorer URL.
5. **If chain refuses** — exception bubbles, server scans program logs, decodes the friendly error message, returns 502 with the error.

**Three layers of defense:**
- Off-chain server policy (fast pre-check, all rules)
- On-chain Kyvern policy program (merchant + memo + velocity + pause)
- On-chain Squads spending limit (daily + weekly + per-tx caps)

The Anchor program **is in the hot path** for allowed payments. Every settled tx on devnet has the Kyvern program in its instruction trace.

---

## Honest gaps (the strategy advisor needs these)

1. **Atlas decisions are scripted, not LLM.** The narrative reasoning is templated rotation through hardcoded actions. The *spending* is real; the *judgment* is theatrical. Open TODO in code.

2. **Atlas merchant destinations are fictional.** "Atlas paid api.openai.com $0.05" is a real $0.05 USDC tx, but to a fixed devnet test recipient. The merchant name lives in the memo + decision log, not the destination wallet.

3. **The off-chain policy is a gatekeeper.** Most attacks (rogue merchant, missing memo, prompt injection) are caught in ~2ms server-side and never touch the chain. The Anchor program *can* enforce these rules — `MerchantNotAllowlisted` is error 6003 — but the hot path short-circuits to off-chain to save fee-payer SOL on spam. As of today, Squads-enforceable cap violations now route on-chain. The other three rule classes don't yet.

4. **Attack catalog is deterministic.** Four hardcoded scenarios on a 22-minute schedule with 20% jitter. Not organic adversarial pressure. The `/atlas` attack wall makes this read as continuous siege; reality is curated.

5. **The "worker types" are narrative skin.** Sentinel/Wren/Pulse are three rows in the `agents` table with different templates. The runner is one generic loop. A judge looking for "different agent architectures" would find one runner with three prompts.

6. **Demo vaults are server-custodied.** The agent secret key for Atlas is held in env vars (`KYVERNLABS_AGENT_KEY`). In production, each user's vault would have its own server-issued agent key (this exists, mints from `/app`), but the *server is still the gatekeeper*. The decentralization claim is "the chain enforces, not us" — true at chain-settle time, but the server can refuse before submitting. Both are valid models; the framing matters.

7. **Pay.sh integration is shape-correct, not yet a real partner integration.** The Pay.sh snippet in `/app` Tab 3 hits `kyvernlabs.com/api/atlas/feed` (our own x402-paywalled signal endpoint, real 402 challenges). The "Pay.sh × Gemini" copy is positioning — Pay.sh is a real Solana×GCP wallet/protocol, but Kyvern hasn't done a co-marketing integration with them. The plumbing works against any x402 endpoint.

8. **The board-and-room ("DePIN device for AI agents") narrative is metaphor, not hardware.** There is no physical Kyvern device. The 3D rendering is brand metaphor. The product is a vault + policy program + runner. This is fine to be honest about — the metaphor is doing real work — but a judge expecting actual silicon would be confused.

9. **No mainnet.** Devnet only. Mainnet readiness is post-Frontier track per `CLAUDE.md` (audit + key rotation + monitoring).

10. **One PM2 process for thousands of agents.** Scale story is unproven. Agent-pool is a single Node process. Holds up at hackathon scale; not a SaaS yet.

---

## The strategic asymmetry

What Kyvern has that competitors typically don't:

- **A real on-chain enforcement program**, deployed, with a devnet history and clean error codes. Most "agent wallet" projects use server-side rules with no chain anchoring.
- **A reference agent that's been live 19 days unbroken.** No demo-mode reset cycle. Every refresh of `/atlas` shows the cumulative cycle counter ticking.
- **Real failed-tx evidence on Explorer.** As of today, every Squads-enforceable violation in the playground produces a clickable Explorer link to a finalized failed tx with custom program error codes. Judges can verify the moat themselves with one click.
- **A shipped npm SDK + scaffolder.** `npm install @kyvernlabs/sdk` and `npx create-kyvern-agent my-agent` both work end-to-end against the live API and produce real Solana txs.
- **A coherent product story.** One product (Kyvern device), one user (solo Solana agent builder), one SDK, one program. No tab-explosion, no "we also do X."

What Kyvern doesn't have:

- LLM-driven Atlas reasoning
- Real merchant-destination wiring
- Deterministic attacks replaced with adversarial fuzzing
- Mainnet deployment
- A scale story
- Integrations with brand-name partners (Pay.sh, etc.) — only protocol-shape compatibility

---

## What today (May 9) shipped

- **Path B for the playground:** per-tx/daily/weekly cap blocks now produce real failed Solana txs. Verified live with one finalized failed sig at the time of writing.
- The `/api/devices/[id]/playground-pay` endpoint is rate-limited (3/min, 10/hr per IP) to protect the fee payer (~5000 lamports per failed attempt; current balance 2.33 SOL, so ~466k attempts of headroom).
- Other-violation blocks (merchant/memo/velocity/pause) now show a clickable link to the deployed Anchor program at `PpmZ…MSqc` instead of a dead "caught locally" string.

---

## TL;DR for the advisor

Kyvern is a **real Solana smart-account-with-policy-enforcement infrastructure** (Squads v4 + a deployed Anchor program + a published SDK) wrapped in a **device metaphor and an unboxing cinematic**. The chain plumbing is genuinely real and verifiable on Explorer. The narrative layer (workers reasoning, merchants being named, attacks being organic, a physical device) is theater in service of demonstrating the technology to humans.

The Frontier judge clicks the over-cap demo, sees a real failed Solana tx with a custom program error code, clicks through to Explorer, and that single click is the moment the product earns the right to its tagline. Everything else on the surfaces is staging for that moment.
