# Kyvern — State of the Product

Date: 2026-05-07 · Git HEAD: `94a2acb` (Canvas v2 + Atlas fires Pay.sh / Gemini) · Submission window: 2026-05-09

A concise, brutally honest snapshot of what's shipping today. Replaces every prior `STATE_OF_*` doc — the surfaces, the engine, the policy program, the findings layer, the API, what's strong, what's still open. Read top to bottom in 8 minutes.

---

## 0 · Executive summary

**The pitch:** *Your device hires AI workers that earn real USDC. The chain decides every spend.*

Kyvern is an on-chain budget program for AI agents on Solana. Every agent runs inside a Squads v4 multisig vault gated by the **Kyvern Anchor program** (`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on devnet) — per-tx caps, daily/weekly limits, merchant allowlist, memo requirements, kill switch, all enforced before a single USDC lamport moves. **Atlas**, the public reference agent, has been autonomous on devnet since 2026-04-20: 7,700+ cycles, 1,100+ settled txs, 6,500+ adversarial attacks blocked, $0 lost.

**Demo readiness:** 9/10. Both domains 200. All 4 pm2 processes online (kyvern-commerce, atlas, atlas-attacker, agent-pool). Build clean. Atlas naturally fires Pay.sh / Gemini calls on every cycle now (Solana × Google Cloud narrative is *running live*, not aspirational).

**Narrative readiness:** 8.5/10. The Live Engine `/app` is now a working machine, not a card grid: workers connect to the vault by SVG wires that encode each cycle's state in colour and dash flow; a live ticker pairs every wire pulse with a clickable Solana Explorer signature. The "real on-chain enforcement" claim is self-evident from the home page.

**The single open gap:** Atlas's *external* customer is still simulated (`addEarning($0.10)` per `publish` action). The on-chain leg, the policy enforcement, the discovery output, and now the Pay.sh integration are all real.

---

## 1 · Surface map

### Public

| Route | Role |
|---|---|
| `/` | Landing — hero device canvas, three-worker showcase, live `/app` preview, Atlas-as-moat section, builders SDK CTA |
| `/atlas` | Public observatory — Atlas earnings hero · 14-day sparkline · economy stats · attack wall · drain-Atlas button · timeline of every settled + blocked tx with Explorer links |
| `/docs` | Developer docs — `npm i @kyvernlabs/sdk`, `vault.pay()` / `vault.pause()` reference, REST cURL, error codes table |
| `/login` | Fresh-vs-returning picker |
| `/recover` | Paste base58 device key → Privy guest login → `importWallet()` → re-attach existing vault |
| `/unbox` | Onboarding cinematic — box-open, serial typewriter, LED boot, Privy seed reveal |
| `/try` | Guest sandbox — ephemeral dev-wallet, real Squads multisig + 3 starter workers, no Privy required |
| `/vault/new` | 5-step wizard — Clone Atlas (60s path) or Build from scratch (identity / budgets / policies / review) |

### Logged-in (`/app`)

The device home is a **single chassis** with three tabs. Top rail = Vault $X.XX + Squads attribution. Chassis bezel = ONLINE chip + serial + uptime. Bottom rail = daily-cap gauge + calls + blocked + last-tx pill. Persistent across all tabs.

| Tab | What's inside |
|---|---|
| **Tab 1 — Live Inside** | The Living Canvas. Workers sit in a tight arc above a substantial Vault card (USDC balance · daily-cap progress bar · Squads · devnet). SVG wires between every worker and the vault encode state in colour + dash flow: green flowing dashes = settled, red pulse ring = blocked, amber breath = thinking, soft gray = idle. Whole worker chip glows with state colour (no LED dot). Below the canvas: **Live Ticker** (max 6 rows, fades older) — every wire pulse paired with worker · verb · amount · outcome dot · clickable Explorer pill · age. |
| **Tab 2 — Deploy Worker** | Bay-slot chassis. 5 bays in a row — 3 occupied (your starter trio) + 2 empty pulsing. Tap an empty bay → inline panel with a co-equal toggle: **Pick a preset** (Sentinel · Wren · Pulse cards) or **Wrap my own agent** (BYO form: emoji + name + jobPrompt textarea + cadence chips). Slot-fill spring animation + bay-online toast on success. SDK shortcut at the bottom. |
| **Tab 3 — Pay & Enforce** | Two sections. **Buy a signal / Try to drain** side-by-side — buy fires real x402 to Atlas's paid feed; drain fires `serverVaultPay` for $0.50+ that gets blocked by policy AND a fresh `/api/atlas/probe` that produces a real failed signature on Atlas's vault. Below, an **Advanced** disclosure: **Policy Playground** (merchant + amount + memo form, real verdict, real signature) + **Integrate** (SDK ↔ Pay.sh code-snippet toggle with the user's actual agent key, mint-key flow inline). |

### Per-page surfaces

| Route | Role |
|---|---|
| `/app/agents/[id]` | Worker zoom-in — chassis + spec card + first-60s region + Economic Timeline (every settled/blocked tx) + sticky chat drawer + pause/retire controls |
| `/app/inbox` | **Findings** — every signal grouped by `(agent, kind, subject_hash)`. Severity-coloured cards (critical / important / info / routine). Inline action buttons (Apply / Post / Snooze / Dismiss). Daily digest banner. Worker filter. |
| `/app/tasks` | Jobs feed — 3 tabs (Open / In progress / Completed) · "Total paid out" hero in SummaryBar · per-job escrow + payout signatures · Post-a-task modal |
| `/app/payments` | On-chain enforcement feed — every approval and every block with reason code, decision time in ms, Explorer link |
| `/app/settings` | Devices · account (wallet copy · network · program IDs · sign-out) · pre-alpha disclaimer |

---

## 2 · The engine — workers, Atlas, attacker

### The Trio (every device gets these three pre-installed)

- **Sentinel — Opportunity Scout** (template `bounty_hunter`). 3-tool lock: `watch_url`, `post_task`, `message_user`. Scans **7 ecosystem sources** with round-robin rotation: Superteam · Colosseum · Solana Foundation · Helius · Anchor · Agave · Metaplex Core. On finds ≥$300 (or any GitHub release / ecosystem announcement) it posts a paid research task + emits `kind='opportunity'` (or `bounty` / `github_release` / `ecosystem_announcement` per the source family).
- **Wren — Market Intelligence Worker** (template `whale_tracker`). 6-tool lock: `watch_wallet_swaps` + `watch_wallet` + `claim_task` + `complete_task` + `post_task` + `message_user`. Claims+completes open validation tasks first, then watches whale wallets. Swaps ≥$5k → posts its own `wallet_analysis` task + emits `kind='market_intel'`.
- **Pulse — Validation & Staking Worker** (template `token_pulse`). 5-tool lock: `read_dex` + `claim_task` + `complete_task` + `stake_on_finding` + `message_user`. Claims validations and embeds **live CoinGecko price evidence** in every result string. On band breach → fires `stake_on_finding` which now routes through **`merchant: api.pay.sh/gemini`** with memo `gemini-flash: validate <subject>` — every Pulse stake renders in Solana Explorer as a Pay.sh inference call.

### Atlas (the public reference agent)

Lives at `/atlas`. PM2 process `atlas` runs `scripts/atlas-runner.ts` on a 3-min cadence (`ATLAS_CYCLE_MS=180000`) since 2026-04-20. Every cycle picks one action from a catalogue of 8: `buy_data` (Perplexity / Brave / **Pay.sh / Gemini-flash**), `reason` (OpenAI / Anthropic / **Pay.sh / Gemini-flash**), `publish` (Arweave), `self_report` (OpenAI). LLM path uses Commonstack `gpt-oss-120b` with the catalogue listed in the system prompt; scripted fallback when no key. **Two Pay.sh actions are now in the rotation** — every settled Pay.sh tx is a real on-chain Solana devnet signature (e.g. `2aHFK9um…otc3jdJ`).

### Atlas Attacker (the moat-maker)

PM2 process `atlas-attacker` runs `scripts/atlas-attacker.ts` on an 8-min cadence (`ATLAS_ATTACK_MS=480000`). Tries to drain Atlas via merchant-not-on-allowlist, amount-over-cap, paused-vault, missing-memo, etc. Each attempt is a real `vault.pay()` that the policy program rejects → recorded in `/atlas` AttackWall with the on-chain failure signature. **6,500+ blocks logged**, $0 lost.

### Agent Pool (user-deployed workers)

PM2 process `agent-pool` runs `scripts/agent-pool.ts`. Loads runner code **once at process start** — every code change in `runner.ts` / `store.ts` / `tools/*` requires `pm2 restart agent-pool`. This is the silent failure mode if you forget to restart it after a deploy. (Captured in CLAUDE.md.)

---

## 3 · Policy enforcement

### Off-chain pre-check (`src/lib/policy-engine.ts`)

A pure function. Inputs: vault config + spend snapshot + payment attempt. Output: `decision` (allowed / blocked) + `code`. **Block codes:** `vault_paused`, `invalid_amount`, `invalid_merchant`, `merchant_not_allowed`, `amount_exceeds_per_tx`, `amount_exceeds_daily`, `amount_exceeds_weekly`, `velocity_cap`, `memo_required`. No DB, no side effects. Same function feeds the SDK, the playground, and the runner.

### On-chain Anchor program (`anchor/programs/kyvern-policy/src/lib.rs`)

Deployed at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on Solana devnet.

- **4 instructions:** `initialize_policy` (create policy PDA for a Squads multisig — authority, per-tx-max, merchant allowlist, velocity window, memo flag, paused flag) · `execute_payment` (validate everything against policy, CPI into Squads `spending_limit_use`, settle or revert) · `update_policy` (owner updates rules) · `pause` (kill switch).
- **12 error codes** including `MerchantNotAllowed`, `AmountExceedsPerTx`, `VelocityCapExceeded`, `MemoRequired`, `VaultPaused`, `Unauthorized`.

The `/atlas` Moat section uses the on-chain enforcement directly. `/api/vault/pay` and `/api/atlas/probe` go through the off-chain pre-check + Squads cosign — same policy logic, faster path. (Documented narrative gap, see §6.)

---

## 4 · Findings + Inbox

The discovery layer. Workers don't just *spend* — they *find* things. Every find is a **signal** persisted in the `signals` table with: `agentId`, `kind`, `subject`, `subject_hash`, `evidence`, `sourceUrl`, `severity`, `read`, `createdAt`, optional `onChainSignature`.

### SignalKinds

| Kind | Worker | Severity rules |
|---|---|---|
| `opportunity` | Sentinel | ≥$500 → important · ≥$500 + near-deadline → critical |
| `bounty` | Sentinel (Superteam paid jobs) | Reward ≥$1000 → important |
| `github_release` | Sentinel (Anchor / Agave / Metaplex) | Major version bump → important |
| `ecosystem_announcement` | Sentinel (Helius / SF / Colosseum) | Default info |
| `market_intel` | Wren | Swap ≥$10k → critical · ≥$5k → important |
| `wallet_move` | Wren | Mirrors `market_intel` 1h dedup |
| `price_trigger` | Pulse | Stake-amount-based |

### Surfaces

- **`/app` Tab 1** doesn't render the inbox — it shows the *live wire state*. Findings flow into the **Live Ticker** below the canvas as economic actions and into the activity feed.
- **`/app/inbox`** is the dedicated findings view. Signals are grouped server-side by `(agent, kind, subject_hash)` (the `signal-group-card.tsx` collapses noise from repeated breaches). Each group shows severity stripe + kind chip + worker chip + subject + ago + Apply button.
- **`DiscoveryHero`** + **`LatestOpportunities`** components live in the legacy `/app` Activity Sheet pull-up — preserved for the deep view but not the headline.
- **Per-worker Findings strip** appears on `/app/agents/[id]` showing that worker's last 5 signals.

Dedup: `signal-hash.ts` hashes the subject; `store.ts` enforces a 24h dedup window per `(agent, hash)` for `opportunity` and 1h for `market_intel` / `wallet_move`. Stake dedup mirrors this so Pulse never burns USDC on the same breach twice.

---

## 5 · API contract

### Atlas (public)

| Endpoint | Returns |
|---|---|
| `GET /api/atlas/status` | `{ running, totalCycles, firstIgnitionAt, uptimeMs, totalSettled, totalSpentUsd, totalEarnedUsd, totalBlocked, totalAttacks, lastAction, network }` |
| `GET /api/atlas/feed` | x402-protected paid feed — recent decisions sorted newest-first, with reasoning + merchant + amount + decision + signature |
| `POST /api/atlas/probe` | Live attack endpoint — auth via `kv_live_…` key. Returns blocked decision + reason + signature. Used by Tab 3 drain button to produce a *fresh* failed sig per click. |
| `GET /api/atlas/decisions` | Filtered decision history (`?kind=attacks&limit=24` etc.) |

### Per-device (`/api/devices/[id]/...`)

| Endpoint | Role |
|---|---|
| `GET /live-status` | Polled every 5s. Returns serial, network, paused, bornAt, balances, PnL, workers list (with `lastFinding` per worker), `discoveryToday` block, `actionFeed`, `policySummary` (daily-cap + calls + blocked + last settled sig). |
| `GET /inbox` | Signals paginated, with daily digest + worker filter. |
| `POST /playground-pay` | The Tab 3 Policy Playground endpoint. POST `{merchant, amountUsd, memo}` → real `serverVaultPay` → returns `{ok, signature, reason, decisionMs}`. |
| `POST /drain-attempt` | Tab 3 drain button. Local block + fires fresh `/api/atlas/probe` for the on-chain failed sig. |
| `POST /deploy-preset` | Spawn a starter worker on this device by template name. |

### Agents

| Endpoint | Role |
|---|---|
| `POST /api/agents/spawn` | Spawn a custom worker (BYO form). |
| `GET /api/agents/[id]` | Worker record + last action + last finding. |
| `GET /api/agents/[id]/thoughts` | Reasoning + tool-call history. |
| `POST /api/agents/[id]/chat` | Owner ↔ worker chat. |

### Vault

| Endpoint | Role |
|---|---|
| `POST /api/vault/create` | Squads multisig + Kyvern policy PDA. Returns vault metadata + one-time agent key. |
| `POST /api/vault/pay` | The SDK's main path. `Authorization: Bearer kv_…` → policy pre-check → Squads cosign → real signature. |
| `POST /api/vault/pause` | Owner kill-switch. |

---

## 6 · What's strong (verified live)

1. **Real on-chain proof verifiable in front of judges.** Every Explorer pill on every surface clicks through to a real settled signature on devnet.
2. **Atlas's 17+ day uptime** is the credential. No competitor has it.
3. **6,500+ blocked attacks** logged. Moat is empirical, not aspirational.
4. **The trio's economic loop closes in real-time.** Sentinel posts → Wren claims+completes → Pulse stakes — within ~10s of `/unbox` when funded.
5. **Pay.sh integration is alive.** Atlas's catalogue rotates two Pay.sh / Gemini actions naturally; Pulse's stake routes through `api.pay.sh/gemini` automatically. Manual fires confirmed (e.g. `2aHFK9um…otc3jdJ`, `55xByEkm…cGeUfef`).
6. **Anchor program is real** — 4 instructions, 12 error codes, deployed and gating.
7. **Policy engine is one pure function** shared between SDK, playground, runner, atlas-attacker — proves "same enforcement, every path."
8. **`/app` Tab 1 = Live Engine.** Wires + ticker convert the dashboard into a working machine; chip-IS-the-state legible from across a room.
9. **Tab 2 = bay-slot chassis.** Empty bays pulse and click to fill; the device metaphor is preserved at the deploy moment, not just in copy.
10. **Tab 3 = Pay & Enforce.** Real x402 buy-a-signal + real on-chain drain attempt + Policy Playground all on the same surface.
11. **Findings layer.** 7 signal kinds, server-side grouping by `subject_hash`, per-worker dedup, severity scoring.
12. **Light premium register everywhere** — JetBrains Mono for numbers, Inter for prose, white chassis with subtle bezel shadow.
13. **Sandbox banner + guest mode** (`/try`) — anyone can poke the device end-to-end with zero login.
14. **Recovery flow** — paste a base58 key on `/recover` → Privy guest login → `importWallet()` → device returns. Zero seed leaves the browser.

---

## 7 · What's still rough or open

### Hard limitations

1. **Atlas's external customer is simulated.** `state.totalEarnedUsd` ticks via `addEarning($0.10)` on every settled `publish`. A judge who reads `atlas-runner.ts` will catch this. *Mitigation:* the signatures are real; only the *who paid Atlas* leg is symbolic.
2. **User vaults default to empty USDC.** Pulse stakes (now Pay.sh-shaped) fail with `vault has insufficient USDC` until the user tops up. Atlas's vault is funded; user vaults need the Circle faucet.
3. **/api/vault/pay and /api/atlas/probe go through the off-chain pre-check + Squads cosign**, not the Anchor program's `execute_payment`. Off-chain enforcement matches the on-chain rules exactly, but a careful judge could push on this. The Moat section on `/` does route through the Anchor program directly; the runner doesn't.
4. **Treasury direction asymmetry** — `serverVaultPay` for escrow + stake credits owner-wallet ATA; `complete_task` payout drains vault-PDA ATA. Different on-chain accounts. Atlas's vault-PDA ATA can drain even when escrow side is being topped up.
5. **Mainnet RPC rate-limit** on the VM IP. `watch_wallet_swaps` calls to public `api.mainnet-beta.solana.com` are throttled. Wren's mainnet data layer is starved without a Helius API key.

### Medium

6. Float-precision drift in `pnlToday.earned` (`.toFixed(2)` masks). 
7. No PTR on mobile.
8. iOS keyboard auto-scroll missing on Post-a-task modal + chat drawer.
9. `/atlas` first paint heavy on slow connections.

### Soft / explicitly deferred

10. LLM meta-narration occasionally leaks despite `cleanReasoning()`.
11. Stake payout / prediction-market resolution — `stake_on_finding` is one-way today.
12. Cross-device leaderboards.
13. Mobile push notifications on first-finding.
14. Mainnet deployment.
15. Real reader-payment integration (Atlas paid feed actually charges).

---

## 8 · Submission-readiness checklist

### Done
- [x] On-chain Anchor program deployed
- [x] Atlas live since 2026-04-20
- [x] Atlas Attacker live, 6,500+ blocks
- [x] All 4 pm2 processes online
- [x] Both domains 200, smoke-tested
- [x] Trio in final form (Phase 1–3 BD edition)
- [x] Multi-source Sentinel (7 sources)
- [x] Findings layer with grouping + dedup + 7 kinds
- [x] Live Engine `/app` (Tab 1 canvas + ticker, Tab 2 bay slots, Tab 3 Pay & Enforce)
- [x] Pay.sh integration alive (Atlas catalogue + Pulse stakes + manual confirmation txs)
- [x] Sandbox `/try` flow
- [x] Recovery `/recover` flow
- [x] Top-up drawer with USDC ATA primary
- [x] SDK published (`@kyvernlabs/sdk` — `Vault`, `OnChainVault`, `vault.pay()`, `vault.pause()`)
- [x] Docs page (`/docs`) — install, quickstart, error codes, REST cURL

### Open before May 9
- [ ] Tab 1 motion verified on a real iPhone (recording artifact)
- [ ] One demo user vault pre-funded ≥ $5 USDC for the recording
- [ ] Atlas's daily/weekly spending limit reset window cleared
- [ ] Helius / paid Solana RPC env var on the VM (unblock Wren's mainnet swaps)
- [ ] 90s vertical demo recorded
- [ ] 2:30 horizontal demo recorded
- [ ] Frontier submission form filled
- [ ] KAST submission filled
- [ ] Twitter pinned tweet drafted

### Post-Frontier
- [ ] Real external revenue channel (close the simulated-earnings gap)
- [ ] Route `/api/vault/pay` through the Anchor program's `execute_payment` instruction
- [ ] Stake payout / prediction-market resolution
- [ ] Mainnet deployment
- [ ] Audit + mainnet readiness pass

---

## 9 · One-paragraph elevator

Kyvern is the device where AI workers find real opportunities and the chain enforces every spend, on Solana devnet. Three pre-installed workers — Sentinel scans 7 ecosystem sources and posts paid research jobs on every find ≥$300; Wren claims and completes those jobs and posts its own market-intelligence tasks on whale moves ≥$5k; Pulse claims validations and stakes USDC on conviction with live read_dex price evidence — and every Pulse stake now routes through Pay.sh / Gemini, surfacing the Solana × Google Cloud rail on every cycle. Atlas, our reference agent, has been autonomous for 17+ days, settled 1,100+ txs, blocked 6,500+ adversarial attacks, and lost zero. The home page leads with a Living Canvas — workers wired to a vault that breathes; a live ticker pairs every wire pulse with a clickable Solana Explorer signature. The on-chain leg is real; the policy enforcement is real; the discovery output is real. The single open gap is Atlas's customer-side leg (currently simulated). Submission window: May 9.
