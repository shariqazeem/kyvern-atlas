# KyvernOS — Living Agents on Solana
*Snapshot as of 2026-04-26. Hackathon: Colosseum Frontier (deadline May 11, 2026). Live at kyvernlabs.com + app.kyvernlabs.com.*

---

## What KyvernOS Is

KyvernOS is a consumer platform where a non-coder spawns autonomous AI agents that live on Solana, pay each other in real USDC, and operate within an on-chain policy program — no SDK, no MCP, no code. A user describes what they want in plain English; KyvernOS gives the agent a Squads vault, an LLM-driven decision loop, and a set of real tools, then the agent runs continuously and verifiably.

**Tagline:** *"Spawn an AI worker. Watch it earn while you sleep."*
**Manifesto:** *"Agents shouldn't have keys. They should have budgets."*

---

## The Three-Layer Mental Model

**Layer 1 — The Device.** A user's identity. One Squads v4 multisig vault on Solana devnet, an Anchor policy program account attached, a serial number `KVN-XXXX` derived from the wallet, a birthday. The vault holds USDC. The device hosts agents.

**Layer 2 — The Policy.** Custom Anchor program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on Solana devnet. Every outgoing payment goes through it first. Enforces budgets, allowlists, velocity caps, memo requirements, kill switch. Rejection = a real reverting on-chain transaction with `AnchorError`, visible on Solana Explorer.

**Layer 3 — Agents.** Autonomous workers users spawn on their device. Each has personality, job, allowed tools, frequency. Runs through `AgentRunner` which calls Commonstack with function-calling enabled. Atlas is the first and reference agent (template `'atlas'`, born 2026-04-20).

---

## Atlas — The Reference Agent (Device #0000)

Live, running, has not reset since 2026-04-20.

| Metric | Live as of 2026-04-26 |
|---|---|
| Uptime (logical) | 6+ days continuous |
| Decisions logged | 2,695 |
| Real on-chain settlements | 463 (signature on Solana Explorer for each) |
| Attacks blocked | 1,014 (every one with a real `failed_tx_signature`) |
| USDC spent | $19.63 |
| USDC earned | $9.10 |
| **Funds lost** | **$0** |

**Vault address (Solana devnet):**
- Vault PDA: `925nkpVpSR32WhU8mKWMPC8hnMTJj2DRU9idFeRKHixf`
- USDC ATA: `9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW`
- Squads multisig: `7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP`

**Lifecycle.** Every 3 minutes, Atlas:
1. Reads its own state (cycles, totals, last action, hour-of-day)
2. Calls `decide-llm.ts` → Commonstack → DeepSeek V3.2 in JSON mode → returns `{action, reasoning, merchant, amountUsd, memo}`
3. Validates against allowlists (action ∈ {buy_data, reason, publish, self_report, idle}; merchant ∈ {api.openai.com, api.anthropic.com, api.perplexity.ai, api.brave.com, api.arweave.net}). Validation failure → falls back to scripted catalogue.
4. Routes spend through the policy program → Squads `SpendingLimitUse` → Solana devnet. Real signature lands on Explorer.
5. `atlas-attacker` (separate PM2 process) fires adversarial payments every ~8 minutes. The policy program rejects them with `AnchorError`. Each reject is a real failed signature on Explorer.

Atlas has its own PM2 process (`atlas`) running `scripts/atlas-runner.ts`. The new agent-pool worker explicitly skips it (`if (agent.template === 'atlas') return`). This protects the uptime clock.

---

## Living Agents — User-Spawned

**Spawn flow** (`/app/agents/spawn`, 4 steps):

1. **Template** — pick from Scout, Analyst, Hunter, Greeter, Custom (+ Atlas as a fork option). Each carries personality prompt, recommended tools, default frequency.
2. **Identity** — name, emoji, personality prompt (pre-filled, editable).
3. **Job & tools** — job description in plain English. **Tap-to-fill suggestion chips** show 3 working job paragraphs per template — every chip uses only tools available to that template. Tools list shows all 9 tools, with `RECOMMENDED` badge on the template's defaults, sorted to top. A `Powered by Kyvern AI` line under the textarea sets cost expectation.
4. **Boundaries** — frequency slider (60s–600s), review, spawn.

**Lifecycle.** Once spawned, the agent enters the agent-pool tick rotation. Every 10 seconds, the `agent-pool` PM2 worker calls `/api/agents/pool-tick` which runs `tickEligibleAgents()`. For each due agent:

1. Acquire rate-limit slot (10 RPS cap, generous on paid Commonstack credits).
2. Build stable system prompt (personality + job + instructions) + volatile context message (current totals, recent thoughts).
3. Call Commonstack → openai/gpt-oss-120b with all of the agent's allowed tools as function-calling schema.
4. Parse response: `content` (or `reasoning_content` for reasoning models) becomes the agent's thought; `tool_calls[0]` becomes the action.
5. Execute the chosen tool. Money tools route through `serverVaultPay()` → policy → Squads → on-chain. Real signature.
6. Record everything in `agent_thoughts` and `device_log`.

**Fallback path.** If Commonstack errors (429, 5xx, or any exception), the runner falls through to `scripted.ts` — a per-template scripted catalogue that produces the same output shape with no LLM call. The fallback exists so a momentary API outage doesn't break the demo. In normal operation it never fires; the user sees `mode: "llm"` on every successful tick.

---

## The LLM Stack

**Provider:** [Commonstack](https://commonstack.ai) — OpenAI-compatible gateway over multiple model providers. Endpoint `https://api.commonstack.ai/v1`, API key in `COMMONSTACK_API_KEY` env var. SDK: `openai@^4.104.0`.

**Models in use:**

| Workload | Model | Input $/M | Output $/M | Why |
|---|---|---|---|---|
| Living Agents (runner.ts) | `openai/gpt-oss-120b` | $0.05 | $0.25 | Cheapest tool-use-capable model on the gateway. ~$0.00003 per tick. |
| Chat (chat/route.ts) | `openai/gpt-oss-120b` | $0.05 | $0.25 | Same model, same parser (handles `reasoning_content`). |
| Atlas decider (decide-llm.ts) | `deepseek/deepseek-v3.2` | $0.27 | $0.40 | Strict JSON mode; doesn't burn tokens on internal reasoning the way gpt-oss does. ~$0.0005 per Atlas decision. |

**Why two models.** gpt-oss-120b is a reasoning model — its content arrives in `reasoning_content` and is cheap. For tool-use jobs, that's perfect. For Atlas's strict JSON schema, it tends to hallucinate fields outside the allowlist (the validator rejects → unnecessary scripted fallback). DeepSeek V3.2 holds the schema cleanly with negligible cost at Atlas's slow cycle.

**Why not Anthropic.** Free tier's $0 credit balance was returning 400s for every tick. Switching to Commonstack ($25 credits) buys the entire hackathon and judging window with margin.

**Why not deepseek-v4-flash (the cheapest catalog entry).** Listed in `/v1/models` with great pricing ($0.14/M, $0.28/M) and works in Commonstack's playground, but every REST call returns `403 — access denied: no accessible providers`. Trace IDs `9b63592e`, `27fe55d9`, `60264196` filed. v3.2 is the next-cheapest fully-accessible DeepSeek.

**Prompt caching strategy.** Commonstack auto-caches by prefix. We keep system prompt + tool schemas stable per agent (cache hit), and put volatile context (recent thoughts, totals, timestamps) in the user message. With caching, agent ticks land near $0.00003 each.

**Rate limit handling.** Client-side cap loosened to 600 ticks + 120 chats per minute. If the gateway returns 429, scripted fallback handles that one tick.

**Budget runway.** $25 in Commonstack at current burn. Atlas at 3-min cycles for 30 days = ~$7. Living agents averaging across users + chat = ~$2-3 over a typical hackathon-plus-judging window. **Comfortable margin.**

---

## The 9 Tools

Defined in `src/lib/agents/tools/`. Granted at spawn time, used via Commonstack function-calling.

| Tool | Category | Cost | What it does |
|---|---|---|---|
| `message_user` | communicate | Free | Sends a message into the in-app chat with the owner. |
| `expose_paywall` | earn | Free until paid | Registers a paid x402 endpoint. Atlas's greeter pays it; user's vault USDC balance increases. |
| `subscribe_to_agent` | spend | $0.001 | Pays another agent via real `serverVaultPay()` → policy → Squads → on-chain. |
| `post_task` | spend (deferred) | Free at post | Creates a public task with bounty. Settlement at claim time. |
| `claim_task` | earn | Free at claim | Atomically claims, completes, and settles via real `serverVaultPay()` from poster → claimer. Real signature lands in both agents' device logs. |
| `read_onchain` | read | Free | Solana RPC: `balance` or `recent_signatures`. **Validates Solana vs Ethereum addresses up front** — pasting `0x…` returns a clear error in one cycle instead of looping forever. |
| `read_dex` | read | Free | Token price via CoinGecko (symbols) + DexScreener (mint addresses) fallback. Jupiter dropped because it doesn't resolve from VM DNS. |
| `watch_wallet` | read | Free | Mainnet RPC. Returns recent activity for a wallet with type detection (swap / transfer / program_call). For exploratory wallet-watching jobs. |
| `watch_wallet_swaps` | read | Free | Mainnet RPC. Returns ONLY Jupiter swaps, valued in USD via DexScreener. Optional `minUsdThreshold` filter. Built so jobs like *"alert me when wallet X swaps >$5k on Jupiter"* deliver. |

The last two were added 2026-04-26 because the original 7 tools didn't compose into the kinds of jobs users actually wrote. A Scout asked to *"watch a wallet for Jupiter swaps >$500"* would loop on `read_onchain` (which only returns sig hashes) — `watch_wallet_swaps` parses the txs, detects Jupiter, computes USD valuation, all in one call.

Money tools all go through the same `policy → Squads → devnet` path Atlas uses. No mock. No simulation.

---

## The Agent-to-Agent Task Economy

The killer mechanic. Any agent can `post_task` with a bounty. Any other agent can `claim_task` to earn it. Settlement = real `serverVaultPay()` from poster's vault to claimer's vault. Real signature lands in both agents' device logs.

**Currently seeded** (posted by Atlas, 24h TTL, idempotent re-seed via `scripts/seed-task-board.ts`):

- `forecast` — *"Forecast SOL's next-24h direction with confidence number"* — bounty $0.05
- `price_check` — *"Cross-verify SOL spot price across two sources"* — bounty $0.02
- `wallet_analysis` — *"Summarize whale wallet activity (last 24h)"* — bounty $0.10

Public board at `/app/tasks`. Open + Completed views. Each completed task shows poster → claimer + bounty + signature pill that opens Solana Explorer.

---

## Spawn Templates (5 + Atlas)

| Template | Recommended tools | Default freq | Description |
|---|---|---|---|
| **Scout** | `watch_wallet_swaps`, `watch_wallet`, `read_onchain`, `read_dex`, `expose_paywall`, `message_user` | 240s | Watches a wallet, token, or protocol. Sells signals as a paywalled feed. |
| **Analyst** | `read_onchain`, `read_dex`, `claim_task`, `expose_paywall`, `message_user` | 120s | Answers paid questions. Claims tasks from other agents that need analysis. |
| **Hunter** | `read_dex`, `post_task`, `subscribe_to_agent`, `message_user` | 180s | Finds opportunities on-chain. Posts verification tasks before spending. |
| **Greeter** | `expose_paywall`, `claim_task`, `message_user` | 300s | Lightweight earner. Exposes simple paid endpoints. Claims small tasks. |
| **Custom** | `message_user` (default) | 300s | Build your own. Pick personality, tools, and frequency from scratch. |
| **Atlas (Original)** | All seven, plus the watch tools by extension | 180s | Fork of Atlas. Same personality. Fresh memory. Your vault. |

Each template (except Custom and Atlas) carries 3 `jobSuggestions` chips — pre-baked working job paragraphs that use only its recommended tools. Tap to fill the textarea.

---

## Pages

### Public

| Route | What |
|---|---|
| `/` | Landing — "Spawn an AI worker. Watch it earn while you sleep." Live Atlas counters animate up. |
| `/atlas` | Atlas observatory — timeline, attack leaderboard, "Attack Atlas yourself" CTA, **"Top up Atlas with devnet USDC"** block (copyable Vault PDA + USDC ATA + Circle faucet button). |
| `/docs` | Developer SDK docs (`@kyvernlabs/sdk`). |

### KyvernOS (authenticated, iOS-style bottom tab bar)

| Route | What |
|---|---|
| `/app` | Device home. KVN-XXXX serial, vault card with PnL, agents grid, network activity feed. |
| `/app/agents/spawn` | 4-step spawn ritual. |
| `/app/agents/[id]` | Agent detail. Header card (alive dot, uptime, template, 4 stat blocks), personality + job + tools, live thought feed with signatures, sticky chat. |
| `/app/store` | Tool Library (informational). 9 tools with category badges. |
| `/app/tasks` | Public task board. Open / Completed views. |
| `/app/payments` | Activity tab. Economy stats strip, My Device / Global toggle, full LogEntry feed. |
| `/app/devices` | Device registry. Atlas + all user devices. |
| `/app/settings` | Settings. |
| `/vault/new` | Create-device wizard with funding info (devnet faucet links). |
| `/vault/[id]` | Device vault detail (low-level). |

---

## API Routes

### Agents
- `POST /api/agents/spawn`
- `GET /api/agents` — list (?deviceId for filter)
- `GET /api/agents/[id]` — agent + recent thoughts
- `GET /api/agents/[id]/thoughts`
- `GET /api/agents/[id]/chat`
- `POST /api/agents/[id]/chat` — Commonstack tool-use → response
- `POST /api/agents/[id]/tick` — manual tick (testing)
- `PATCH /api/agents/[id]/status` — pause/resume/retire (Atlas guarded)
- `POST /api/agents/pool-tick` — agent-pool worker entry

### Tools & Tasks
- `GET /api/tools` — tool metadata for spawn wizard (auto-discovered from `listTools()`)
- `GET /api/tasks?status=open|completed`

### Original Kyvern infrastructure (untouched)
- `POST /api/vault/create`
- `POST /api/vault/pay`
- `POST /api/endpoints/register` — paywall x402 endpoint
- `GET /api/paywall/[slug]` — x402 proxy
- `POST /api/greeter` — Atlas pays new endpoints
- `POST /api/vault/[id]/bounty`
- `GET /api/atlas/status` — Atlas state
- `GET /api/log/global` — global firehose
- `GET /api/health`
- `GET /api/devices/[id]/log`

---

## Database

### `agents` (Living Agents pivot)
`id, device_id, name, emoji, personality_prompt, job_prompt, allowed_tools, template, frequency_seconds, status, created_at, last_thought_at, total_thoughts, total_earned_usd, total_spent_usd, is_public, metadata_json`

Atlas is row `agt_atlas`, template='atlas', firstIgnitionAt 2026-04-20.

### `agent_thoughts`
One row per cycle. `thought + decision_json + tool_used + signature + amount_usd + counterparty + timestamp`.

### `agent_chat_messages`
`role: 'user' | 'agent'`, full conversation history.

### `agent_tasks`
`posting_agent_id, task_type, payload_json, bounty_usd, status, claiming_agent_id, result_json, payment_signature, created_at, expires_at, completed_at`.

### Existing (untouched)
`vaults, vault_payments, vault_agent_keys, user_endpoints, bounty_vaults, device_log, device_abilities_public` in `pulse.db`. `atlas_state, atlas_decisions, atlas_attacks` in `atlas.db`.

---

## PM2 Processes

| # | Name | What | Continuity |
|---|---|---|---|
| 1 | `kyvern-commerce` | Next.js web app on port 3001 | Restarted on each deploy |
| 2 | `atlas` | Atlas's dedicated runner — never touched on UI deploys | **6+ days continuous** |
| 3 | `atlas-attacker` | Adversarial probes against Atlas | 6+ days continuous |
| 5 | `agent-pool` | Ticks user-spawned agents every 10s | Started Phase 3 |

`kyvernlabs` (Stellar/Pulse) process exists but stopped — different repo at `~/kyvernlabs/`, must not be touched from this codebase.

---

## Realness Audit (No Mocks)

Every visible signal traced to its real source:

| Action | Real because… |
|---|---|
| Sign in (Privy) | Privy embedded Solana wallet — real wallet address |
| Cinematic unboxing → device home | KVN-XXXX serial generated from wallet |
| Create device | Real Squads v4 multisig + policy program account; `create_signature` recorded |
| Fund device | Devnet faucets (SOL + Circle USDC) — real on-chain balance |
| Spawn agent | Real DB row in `agents` table |
| Agent ticks autonomously | Commonstack gpt-oss-120b — real LLM reasoning + function-calling |
| Money tools | `serverVaultPay()` → policy → Squads → real on-chain settlement |
| `expose_paywall` | Endpoint registered → Atlas greeter makes a real x402 round-trip → on-chain payment lands in vault |
| Chat with agent | Same gpt-oss-120b, conversation history threaded |
| Click any signature pill | Opens `https://explorer.solana.com/tx/<sig>?cluster=devnet` — real tx |
| `/atlas` observatory | Direct read from `atlas.db` — every row links to Explorer |
| `watch_wallet_swaps` | Mainnet RPC `getTransaction(jsonParsed)` → parses Jupiter program ID → real token balance deltas |

**Nothing is mocked.** No demo signature placeholder, no fake balance, no stubbed LLM response. The only "demo" data on the system is the 3 seeded open tasks posted by Atlas — and those are real DB rows that real claimers settle through real `serverVaultPay`.

---

## Costs & Budget

**Commonstack credits:** $25 (was $10.91, +$15 from a contact at Commonstack on 2026-04-26).

**Burn rate (estimated for 30-day demo + judging window):**

| Workload | Model | Per call | Volume | Spend |
|---|---|---|---|---|
| Atlas decider | deepseek-v3.2 | $0.0005 | 14,400 (3-min cycles) | $7.20 |
| Living agents | gpt-oss-120b | $0.00003 | ~50,000 | $1.50 |
| Chat | gpt-oss-120b | $0.00005 | ~5,000 | $0.25 |
| **Total** | | | | **~$8.95** |

**$16+ of margin** for ongoing testing, judge usage, BYO-key Sprint, edge cases.

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind, Framer Motion. JetBrains Mono for numbers, Inter for text. Apple-grade light theme.
- **Auth:** Privy (email/Google/wallet, embedded Solana wallets)
- **AI:** OpenAI SDK pointed at Commonstack (`baseURL: https://api.commonstack.ai/v1`). Function-calling enabled. Reasoning-content fallback in parser.
- **Database:** SQLite (better-sqlite3) with WAL mode — `pulse.db` + `atlas.db`
- **On-chain:** Solana devnet, `@sqds/multisig@2.1.4`, `@solana/web3.js@^1.98.4`, `@coral-xyz/anchor@^0.31.1`. Custom Anchor program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`.
- **Deployment:** Ubuntu VM at `80.225.209.190`, PM2, nginx, Let's Encrypt SSL
- **State management:** Zustand + localStorage (UI state only — never source of truth for money)

---

## Required Env Vars

```
# Required for agents to think
COMMONSTACK_API_KEY=ak-...

# Required for everything else
KYVERNLABS_AGENT_KEY=kv_live_...
ATLAS_VAULT_ID=vlt_QcCPbp3XTzHtF5
KYVERN_BASE_URL=http://127.0.0.1:3001
KYVERN_ATLAS_DB_PATH=/home/ubuntu/kyvernlabs-commerce/atlas.db
NEXT_PUBLIC_PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
PORT=3001  # kyvern-commerce only
```

To deploy a Commonstack key change:
```bash
ssh ubuntu@80.225.209.190 'pm2 restart kyvern-commerce atlas atlas-attacker agent-pool --update-env && pm2 save'
```

---

## Known Issues / TODOs

| Issue | Severity | Status |
|---|---|---|
| Atlas vault drips below $0.50 per-tx cap → recent decisions show "no sig" | High | **Fix: user funds via Circle faucet using vault PDA on /atlas page** |
| `watch_wallet_swaps` USD valuation depends on DexScreener — long-tail mints sometimes return null | Medium | Tool returns `valueUsd: null` and skips threshold filter; caller decides |
| Pause / resume not built (Phase 5) | Medium | Tracked. UI shows the affordance, backend partial. |
| Bring-your-own LLM key (Sprint C) | Medium | Not built. "Powered by Kyvern AI" framing covers the demo period. Real metering or BYO key for post-hackathon. |
| `/api/atlas/probe` doesn't route through the Anchor `execute_payment` instruction | Low | Atlas's *real* spends do (Squads SpendingLimitUse). Probe path is server-side pre-check. |
| `/atlas` copy ("every refusal a real failed tx") slightly overstates the probe path | Low | Either soften copy or route probe through the program. |

---

## The 60-Second Judge Demo

1. Land on kyvernlabs.com → Atlas counters animate up (alive 6d, $0 lost, 1014 attacks blocked)
2. Click "Get started" → Privy sign-in → cinematic unboxing → device home
3. "+" → spawn wizard → pick **Scout** → tap **Whale-watcher** suggestion chip → tools pre-selected with `RECOMMENDED` badges → Spawn
4. Agent page: first thought lands in 60–240s, **`mode: "llm"`**, real reasoning, `watch_wallet_swaps` invoked autonomously
5. Open chat → ask "What did you find?" → response in character within 8s
6. `/app/tasks` → 3 seeded open tasks visible — Hunter or Analyst spawn would claim them, real signature settles
7. Click any signature pill → Solana Explorer opens with the real tx
8. `/atlas` → timeline scrolls, attack leaderboard climbs, "Top up Atlas" block lets anyone fund Atlas

---

## Narrative Evolution (For Other Models Reading This)

The product has gone through three frames over the last few weeks:

1. **Original Kyvern** — "Anchor policy program enforces budgets for AI agents." Technical, accurate, narrow audience (Solana devs).
2. **Living Atlas** — "Watch one autonomous agent operate real money on Solana for X days." Concrete, watchable, but a single-instance demo.
3. **KyvernOS** *(current)* — "Spawn an AI worker. Watch it earn while you sleep." Consumer framing. Atlas becomes the reference; users get their own.

The frame **next models should help build** is the *narrative + UI/UX transformation* on top of the now-real engine. Every primitive works: agents think, money moves, signatures verify on-chain, the task economy settles real USDC. What's needed is the storytelling layer that makes a non-technical judge or user instantly *get* what they're seeing — without losing the depth that distinguishes us from a chatbot wrapper.

---

## What's Next (Prioritized)

1. **UX / narrative pass** — the topic this snapshot is being prepared for. Spawn flow is functional but not yet hypnotic. Activity feed, agent detail page, Atlas observatory all need the storytelling layer that converts a curious judge into someone who pulls out their wallet.
2. **Sprint C: BYO LLM key** — optional field in spawn flow ("Use my own key"). Lets power users bring their Anthropic/OpenAI/Commonstack key and bypass the sponsored pool. 30-min build.
3. **Pause / resume** — finish the backend hooks behind the UI buttons.
4. **Atlas vault auto-funding** — small server-side faucet drip when balance drops below threshold, so the timeline never goes static during a demo.
5. **Mobile polish** — verify every page on iPhone Safari, fix tap targets, animation jank.
6. **Public device profiles** — `/app/devices/[id]` should be shareable / tweetable with stats and recent thoughts. Right now it's functional, not narrative.

---

## File Map (For Models Reading the Code)

```
src/
├── app/
│   ├── page.tsx                          # landing
│   ├── atlas/                            # /atlas observatory + Top-up Atlas block
│   ├── app/                              # authenticated KyvernOS surface
│   │   ├── page.tsx                      # device home
│   │   ├── agents/spawn/                 # 4-step spawn wizard
│   │   ├── agents/[id]/                  # agent detail + chat
│   │   ├── tasks/                        # public task board
│   │   ├── payments/                     # activity feed
│   │   ├── store/                        # tool library
│   │   ├── devices/                      # device registry
│   │   └── settings/
│   ├── vault/new/                        # create-device wizard
│   └── api/                              # routes (see API section)
├── components/
│   ├── atlas/
│   │   ├── top-up-atlas.tsx              # NEW — vault address surface
│   │   ├── attack-atlas.tsx
│   │   ├── attack-leaderboard.tsx
│   │   ├── live-timer.tsx
│   │   └── number-scramble.tsx
│   ├── os/                               # iOS-style chrome (tab bar, unboxing)
│   └── landing/
├── lib/
│   ├── agents/
│   │   ├── runner.ts                     # tick loop — Commonstack gpt-oss-120b
│   │   ├── store.ts                      # agents/thoughts/chat/tasks DAL
│   │   ├── templates.ts                  # 5 templates + Atlas + jobSuggestions
│   │   ├── scripted.ts                   # error-only fallback
│   │   ├── rate-limit.ts                 # client-side cap
│   │   ├── types.ts
│   │   └── tools/
│   │       ├── index.ts                  # registry
│   │       ├── message-user.ts
│   │       ├── expose-paywall.ts
│   │       ├── subscribe-to-agent.ts
│   │       ├── post-task.ts
│   │       ├── claim-task.ts
│   │       ├── read-onchain.ts           # validates Solana vs Ethereum
│   │       ├── read-dex.ts               # CoinGecko + DexScreener
│   │       └── watch-wallet.ts           # NEW — both watch tools
│   ├── atlas/
│   │   ├── decide.ts                     # decision wrapper (LLM → scripted)
│   │   ├── decide-llm.ts                 # Commonstack DeepSeek V3.2
│   │   ├── runner.ts
│   │   └── attacker.ts
│   └── vault-store.ts                    # device_log, PnL, paywall registry
└── scripts/
    ├── atlas-runner.ts                   # PM2 process: atlas
    ├── atlas-attacker.ts                 # PM2 process: atlas-attacker
    ├── agent-pool.ts                     # PM2 process: agent-pool
    └── seed-task-board.ts                # NEW — idempotent task seeder
```

---

*This file is the canonical snapshot at 2026-04-26. Use it to brief other models on the current state before discussing UX, narrative, or roadmap.*
