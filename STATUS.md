# Kyvern — Build Status

*Snapshot: 2026-04-27. 13 days to submission deadline (May 11). We submit May 9.*

---

## North Star (locked, do not negotiate)

**A Kyvern is a device you own. You spawn workers on it. They earn USDC. You spend it.**

Three nouns: **Device · Worker · Dollar.**

One-line pitch: *"A device you own. Workers that earn. Money you control."*

User-facing translations: agent → worker, policy program → budget, x402 → paid endpoint, OS → (drop, keep in logo wink), MCP / SDK → (drop).

---

## Calendar — done vs left

| Date | Sprint | Status |
|---|---|---|
| Apr 26–28 | Home device card + status pills + activity feed | ✅ Live, iterated on user feedback (decimals, sparkline, orbital rings, status bar serial) |
| Apr 28–29 | Backend: priority queue (3A) + countdown (3C) + live-status (3D) | ✅ Live |
| Apr 28–29 | Atlas auto-drip + admin fail-safe (3B) | ✅ Code shipped; treasury keypair generated; **awaiting one-time treasury funding** |
| Apr 30–May 2 | Spawn flow 2-screen + Customize drawer + birth animation (2B) | ✅ Live |
| May 2–4 | Thought cards visual + chat polish (2C) | ✅ Live |
| Apr 28–29 | **Atlas observatory rebuild (2D)** | ✅ Live (museum exhibit) |
| Apr 30 | **Consistency sweep + Don't List enforcement** | ✅ Live |
| May 1 | **Mobile guardrails + landing page minimal pass** | ✅ Live (real-device QA still pending) |
| May 2–3 | Demo video (90s vertical + 2:30 horizontal) | ⏳ Not started — record + edit work |
| May 4–5 | Submissions: Frontier + KAST + GitHub README + DEMO.md | ⏳ Not started |
| May 6 | Dry runs (5 fresh-browser, 2 fresh-phone) | ⏳ Not started |
| May 7–8 | Buffer | — |
| **May 9** | **SUBMIT BOTH** | ⏳ |

---

## The four hero surfaces — UI/UX state

The brief locks four surfaces that get polish; everything else stays functional but un-touched. All four are shipped and visually consistent.

### 2A — Home device card (`/app/page.tsx`)

**Visual register:** dark hardware. Charcoal → deep-navy radial gradient with fine-grain noise overlay, 1px white-at-8% border, soft top-edge highlight, drop shadow.

**Live components:**
- `KVN-XXXXXXXX` serial top-right · pulsing green `ONLINE` top-left
- Hero balance, JetBrains Mono ~80px desktop / ~56px mobile, `$0.00` (2 dp), scrambles on every change via the `NumberScramble` component
- Born timestamp in Inter 13px directly beneath
- Three live status pills polled every 5s: workers active · earning rate $/min · last action (`{worker} {verb} · Xs ago`)
- Worker avatars (32px circles) with always-on subtle ring + brighter rotating dashed ring + green glow when `isThinking` (last thought < 90s)
- `+ Top up KVN-XXXXXXXX` pill — green-tinted when USDC=0, subtle gray once funded; tap → drawer with vault PDA + USDC ATA + Circle faucet button + SOL faucet button
- PnL today + 24h sparkline (160×36, 1.5px stroke + 35→0% area gradient)
- 5-row activity feed beneath, monospace, `HH:MM:SS · {worker} · {verb} · {sig}…hash ↗`, slides in from top, clickable to Solana Explorer
- Status bar above reads `Solana devnet · Good evening · KVN-XXXXXXXX online`

**Backed by:** `/api/devices/[id]/live-status` polled every 5s; serves USDC balance from on-chain (Solana RPC `getParsedTokenAccountsByOwner`), SOL balance via `getBalance`, vault PDA + USDC ATA, sparkline buckets, last action.

### 2B — Spawn flow (`/app/agents/spawn`)

Two screens + Customize drawer + birth animation.

**Screen 1** (`screen: "template"`): "Hire a worker for KVN-XXXXXXXX". 2×2 picker grid — Scout 🔭 · Earner 💰 · Hunter 🎯 · Custom 🧬. Each card has emoji + role + one-liner + two pills (earning style: Steady/Opportunistic/Hands-on/Your call · activity level: Chill/Balanced/Aggressive/Your call). Tap → Screen 2.

**Screen 2** (`screen: "configure"`): name field with refresh button (cycles through `Sentinel`, `Atlas Jr`, `Shadow`, `Pulse`, `Echo`, `Drift`, `Forge`, `Beacon`, `Dax`, `Nova`, `Wren`, `Juno`); 10-emoji palette pill row; three tap-to-fill suggestion chips (every chip uses only that template's recommended tools); textarea with inline 0x… address warning if the user pastes an Ethereum address; "{N} abilities granted" summary that opens the drawer; primary button "Spawn — costs ~$X.XX/day".

**Customize drawer** (slides up from bottom on mobile, modal on desktop): four sections —
1. **Personality** — two sliders (Logical↔Creative, Cautious↔Aggressive), live preview line in italics that changes as the sliders move
2. **Abilities** — all 9 tools grouped by category (Observe / Earn / Act) with one-line "why it matters" hints, RECOMMENDED badge on template defaults
3. **Work cadence** — three named options (Chill 10min / Balanced 4min / Aggressive 1min) with daily-cost estimates
4. **On-chain budget** — read-only per-tx cap + daily limit, with the killer black panel: *"These limits are enforced by your policy program at PpmZ…MSqc on Solana. No worker can exceed them. Verified on-chain."* with an Explorer deep-link

**Birth animation** (overlay on Spawn): four steps tick through (Creating worker identity → Binding abilities → Setting on-chain budget → Activating intelligence), then "{Name} is alive · First thought in 0:0X" sits for 700ms, then redirect to `/app/agents/[id]?fresh=true`.

### 2C — Agent detail (`/app/agents/[id]`)

**Visual register:** light OS / workspace.

**Hero card** (light, top): emoji avatar, name, alive dot + status, uptime, template, four stat blocks (thoughts · earned · spent · net). Two icon buttons in the header — pause/resume (gray) and retire (red ✕ with confirm dialog).

**Activation banner** (Section 3C): when the URL has `?fresh=true` and `total_thoughts === 0`, an animated dark banner appears between hero and thought feed: *"{Name} is waking up · first thought arriving"* with a pulsing green Sparkles icon and a 60s progress bar. Polling drops to 2s while showing; the banner auto-dissolves the moment the first thought lands.

**Thought feed** (each entry is its own card now):
- Top row: JetBrains Mono `HH:MM:SS` · green `● mode: llm` pill (or muted gray `mode: scripted`) · cycle number `#42`
- Body: Inter 16px, line-height 1.6 — **the reasoning is the hero**
- Footer: hairline divider, mono tool chip, signature pill, money delta in colour:
  - Green `+$0.05 earned` for `claim_task`
  - Amber `−$0.001 spent` for `subscribe_to_agent` / `post_task`
- New cards slide in from the top with cubic-bezier(0.16, 1, 0.3, 1) over 250ms

**Sticky chat** at bottom:
- Bubble-style, agent messages get the worker's emoji avatar in a 28px circle
- Breathing avatar (1→1.06×→1 over 1.5s) + three bouncing typing dots while waiting for reply
- Quick-reply chips above the input: *"How are you doing?" · "Show me what you found" · "Take a break"* — tap to fill
- Tool calls now narrate naturally: *"Claimed a task and earned $0.05. Settled — 5Kj7…fN2x"* instead of *"✓ claim_task: { ok: true, ... }"*

### 2D — Atlas observatory (`/atlas`)

**Visual register:** dark hardware (matches the home device card).

Built top-to-bottom in six beats:
1. **Manifesto** — JetBrains Mono, *"Agents shouldn't have keys. They should have **budgets**."* The word `budgets` rendered in green (`#86EFAC`), with a thin gradient underline beneath.
2. **Three hero stats** — JetBrains Mono ~72px / ~44px responsive: alive (LiveTimer ticking from `firstIgnitionAt`) · funds lost ($0.00 in green) · attacks blocked (live count, NumberScramble on update).
3. **Micro stat strip** — settled · earned · spent — beneath the heroes.
4. **24h PnL sparkline** — single thin line, 1.5px stroke + soft area gradient, right-aligned next to a "24h" label.
5. **Attack Wall** — the killer visual. 60 most recent failed Solana txs in a vertical scroll, each pill formatted: `❌ FAILED · HH:MM:SS · $XX.XX → merchant.tld · sig…hash ↗`. New pills slide in from the top with the locked entrance ease. Each clickable to Solana Explorer.
6. **Three-layer SVG diagram** — Device · Budget · Workers, hand-illustrated, soft glow on the centre node. Caption: *"The device holds the money. The budget enforces the rules. The workers do the work."*
7. **Sponsor Atlas footer** — TopUpAtlas re-skinned dark; never removed; the public layer of the funding-redundancy stack.

**Backed by:** SSR snapshot (`readInitialAtlasSnapshot`) extended to ship state + 60 attacks + 24-bucket PnL series so first paint is fully populated. Client polls every 5s.

---

## Section 3 — Critical backend

| Item | Status | Notes |
|---|---|---|
| **3A — First-thought priority queue** | ✅ Live | Workers with `total_thoughts === 0` tick on the next agent-pool cycle (no wait), bypass the RPS cap on the very first call. First 3 ticks cap effective frequency at 60s for warmup. |
| **3B — Atlas auto-drip + admin fail-safe** | ✅ Code shipped, awaiting bootstrap | Treasury keypair installed: public address `Gs9bvUxDJSyt82dWGKa5hbzWJEwgMYtTjFqRuotdJJQW`. Auto-drip checks vault every 30 cycles; transfers $5 from treasury if balance < $1. Admin endpoint `POST /api/atlas/funded-by-me` (bearer auth) drops $5 immediately. Public Sponsor button on /atlas. **Bootstrap pending: send 0.5 SOL + $30–50 USDC to the treasury address.** |
| **3C — Spawn → first-thought countdown** | ✅ Live | Spawn redirects with `?fresh=true`. Detail page renders dark activation banner with 60s progress bar; polling 2s while banner is visible; banner dissolves the moment `totalThoughts > 0`. |
| **3D — Live status endpoint** | ✅ Live | `GET /api/devices/[id]/live-status` returns serial, network, paused, bornAt, usdcBalance, solBalance, vaultPda, usdcAta, pnlToday, pnlSparkline, workersActive, earningPerMinUsd, lastAction, workers. Polled by the home device card every 5s. |

---

## Don't List — enforcement state

| Don't | Status |
|---|---|
| Tool Library page (`/app/store`) | ✅ Route deleted, components in `src/components/store/` deleted, all imports cleaned |
| Devices registry (`/app/devices`) | ✅ Route deleted, content collapsed into a "Devices" section at the top of `/app/settings` (Atlas reference + the owner's KVN-XXXXs, each linking to its detail page) |
| Pause/resume backend | ⚠️ User explicitly asked for this — wired pause/resume/retire on agent detail page after a worker looped (Percival incident). Diverged from brief on purpose; user-confirmed. |
| BYO LLM key | ✅ Not built (correct) |
| 5th and 6th templates | ✅ Templates collapsed: Scout, Earner, Hunter, Custom in the picker; Greeter and Analyst hidden via `inPicker: false` for backwards-compat with existing DB rows |
| `/app/store` route | ✅ 404 |
| User-facing strings: "agent" | Partially scrubbed — done on landing hero, page metadata, /app/tasks, /app/settings; **deeper landing sections still contain "agent" copy** (deferred from minimal pass) |
| User-facing strings: "policy program" | ✅ Translated to "budget" / "Budget program" everywhere user-facing |
| User-facing strings: "MCP", "SDK", "OS" | Mostly clean; deeper landing copy may contain a few residuals — see Sprint 5 deferred items |
| User-facing strings: "x402" | One residual on landing (`products-section.tsx` line 88) — deferred |
| Bottom nav at four items | ✅ Home / Tasks / Activity / Settings |
| New tools, new templates, new features | ✅ None added during sprint cycle |

**Tab bar:** `src/components/os/tab-bar.tsx` already enforces the four-item nav; no orphaned tab links anywhere.

**Orphan components killed:** `src/app/app/ability/`, `src/components/store/`, `src/components/device/ability-grid.tsx`, `src/components/device/ability-icon.tsx`. All were dead surfaces from the pre-pivot Pulse era.

---

## Visual register (locked at top of `globals.css`)

```
DARK = hardware. The device card, /atlas, the birth animation,
the Customize drawer, the top-up drawer — anywhere we are showing
the device itself doing work. Surfaces use the charcoal→deep-navy
radial gradient.

LIGHT = OS / workspace. The agent detail page, spawn screens,
chat, tasks, activity, settings — anywhere the owner is doing
something on top of the device. Surfaces use the light tokens.

Don't mix them.
```

## Animation curves (locked)

```
Entrance:  cubic-bezier(0.16, 1, 0.3, 1)   200–300ms
Exit:      cubic-bezier(0.7,  0, 0.84, 0)  200–300ms
Number scramble: 520ms (existing component)
No springs, no Framer Motion defaults outside scrambles.
```

## Typography (locked)

```
JetBrains Mono — 11 / 14 / 18 / 24 / 36 / 48 / 72 px
Inter         — 13 / 16 / 22 px
```

Clamp() is used on hero stats (mobile→desktop scaling) but the endpoints snap to these steps.

## Color tokens

**Dark surfaces:**
- Background: `radial-gradient(120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)`
- Border: `rgba(255,255,255,0.08)`
- Text primary: `rgba(255,255,255,0.92)`
- Text secondary: `rgba(255,255,255,0.55)`
- Text tertiary: `rgba(255,255,255,0.4)`
- Accent green: `#4ADE80` (live), `#86EFAC` (success/budget callout), `#16A34A` (positive money)
- Accent red: `#F87171` (attacks), `#FCA5A5` (failed pill text)
- Accent amber: `#F59E0B`, `#FCD34D` (spend / costs USDC)

**Light surfaces (CSS vars in `globals.css`):**
- `--background`: `#FAFAFA`
- `--surface`: `#FFFFFF`
- `--surface-2`: `#F5F5F7`
- `--text-primary`: `#000000`
- `--text-secondary`: `#6E6E73`
- `--text-tertiary`: `#AEAEB2`
- `--border-subtle`: `#F0F0F0`

---

## Mobile guardrails (Sprint 4 code-side)

Applied globally in `globals.css`:

```css
button, a, [role="button"], input[type="button"], input[type="submit"], input[type="reset"] {
  touch-action: manipulation;             /* no double-tap zoom on tap targets */
  -webkit-tap-highlight-color: transparent;
}
```

Plus per-component:
- Tab bar uses `pb-[env(safe-area-inset-bottom)]`
- Customize drawer uses bottom-sheet on `<sm`, modal on `>=sm`
- Top-up drawer: same pattern
- Birth animation uses `clamp()` on every hero size
- Atlas hero stats use `clamp()` for the 72→44px scale

**Real-device QA still pending** (calendar Sprint 4 includes hands-on iPhone Safari pass that I can't do).

---

## Tech stack snapshot

| Layer | What |
|---|---|
| **Frontend** | Next.js 14 App Router, React, Tailwind, Framer Motion |
| **Auth** | Privy (email / Google / wallet, embedded Solana wallets) |
| **AI provider** | Commonstack ($25 credits) — OpenAI-compatible gateway |
| **Models** | `openai/gpt-oss-120b` for runner + chat (~$0.00003/tick); `deepseek/deepseek-v3.2` for Atlas's strict-JSON decider (~$0.0005/decision) |
| **Database** | SQLite (better-sqlite3) with WAL — `pulse.db` + `atlas.db` |
| **On-chain** | Solana devnet, Squads v4 multisig, custom Anchor budget program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` |
| **Deployment** | Ubuntu VM at `80.225.209.190`, PM2 (kyvern-commerce / atlas / atlas-attacker / agent-pool), nginx, Let's Encrypt |

---

## Database — recent additions

- `agent_thoughts.mode` column (TEXT, default `'llm'`) — drives the green `mode: llm` pill on thought cards. `recordAgentTick()` persists; legacy rows render `llm` correctly.
- All other tables unchanged from pre-sprint state.

---

## Worker tools (9 total — DO NOT add more)

Defined in `src/lib/agents/tools/`. Granted at spawn, executed via Commonstack function-calling.

| Tool | Cat | Cost | What |
|---|---|---|---|
| `message_user` | comm | Free | Sends message to owner |
| `expose_paywall` | earn | Free until paid | Registers paid endpoint; greeter pays |
| `subscribe_to_agent` | spend | $0.001 | Pays another worker via real `serverVaultPay()` |
| `post_task` | spend (deferred) | Free at post | Public bounty; settles at claim |
| `claim_task` | earn | Free at claim | Atomic claim + complete + settle |
| `read_onchain` | read | Free | Solana RPC; validates Solana vs Ethereum addresses |
| `read_dex` | read | Free | CoinGecko + DexScreener (Jupiter dropped — DNS failed from VM) |
| `watch_wallet` | read | Free | Mainnet RPC, parsed activity with type detection |
| `watch_wallet_swaps` | read | Free | Mainnet RPC, Jupiter swaps with USD valuation, optional minUsdThreshold |

---

## Treasury bootstrap (one-time human task — pending)

The treasury keypair is generated and installed in env (`KYVERN_TREASURY_SECRET`). To activate:

```
Public address: Gs9bvUxDJSyt82dWGKa5hbzWJEwgMYtTjFqRuotdJJQW

1. https://faucet.solana.com    → ~0.5 SOL (paste address, 1 SOL is fine)
2. https://faucet.circle.com    → Solana Devnet, USDC, $30-50 (3-5 hits @ $10 ea)
3. Test: curl -X POST https://app.kyvernlabs.com/api/atlas/funded-by-me \
           -H "Authorization: Bearer kv_live_b7b2001e8afa5de06c592a217852f2ca8fe78a60d4b3a49cdedb409665336075"
```

Auto-drip fires within 90 min of treasury funding (next 30-cycle boundary).

---

## What's NOT in the calendar but shipped (extras)

- `pause / resume / retire` UI on agent detail page (after the Percival looping incident)
- Spawn-time `0x…` Ethereum-address warning in the job textarea
- Loop-breaking system prompt — workers idle when blocked on owner reply, stop calling failing tools
- `read_onchain` graceful Ethereum-vs-Solana address validation
- Top-up drawer integrated into the home device card
- `agent_thoughts.mode` column + scripted-vs-llm pill differentiation
- 6 new components for /atlas (manifesto-block, atlas-hero-stats, atlas-micro-stats, atlas-pnl-sparkline, attack-wall, three-layer-diagram)

---

## What's NOT yet shipped

| Item | Where it lives in the calendar |
|---|---|
| Treasury funded with devnet SOL + USDC | One-time human task, pending |
| Demo video — 90s vertical + 2:30 horizontal | May 2-3 |
| Frontier submission writeup | May 4-5 |
| KAST / Superteam Pakistan submission | May 4-5 |
| GitHub README polish + DEMO.md for judges | May 4-5 |
| Real-device iPhone Safari QA pass | May 6 (dry runs) |
| 5 fresh-browser end-to-end tests + 2 fresh-phone tests | May 6 |
| Submit | May 9 |
| Deeper landing-page string scrub (below-fold sections still contain "agent" / "x402" / "SDK" residuals) | Defer or let video set the tone |

---

## Known issues / risks

| Issue | Severity | Mitigation |
|---|---|---|
| Atlas vault dry of USDC → recent decisions show "no sig" | High while treasury unfunded | Once treasury funded, auto-drip + admin fail-safe + public Sponsor button — three layers |
| Real-device mobile pass not done | Medium | Code-side guardrails are in (touch-action + safe-area). Visual jank on iPhone Safari unverified. |
| Deeper landing-page sections (`products-section.tsx`, `device-sections.tsx`, `how-it-works.tsx`, `device-hero.tsx`, `atlas-observatory.tsx` landing variant) still contain "agent" / "SDK" / "x402" copy | Medium | Below the fold; minimal-pass scope was above-fold only; demo video can avoid them |
| `/api/atlas/probe` doesn't route through the Anchor `execute_payment` instruction | Low | Atlas's *real* spends do route through it (Squads SpendingLimitUse). Probe is a server-side pre-check. Copy on /atlas accurate to the real path. |
| Submission writeups + video are sequential single-developer work | Medium | Buffer days May 7-8 absorb slips |

---

## File map (for handoff to other models)

```
src/
├── app/
│   ├── page.tsx                      # landing — Sprint 5 minimal pass done above-fold
│   ├── globals.css                   # design tokens + locked rules at top
│   ├── atlas/
│   │   ├── page.tsx                  # SSR shell
│   │   └── atlas-client.tsx          # /atlas observatory — 2D museum exhibit (rebuilt Sprint 1)
│   ├── app/
│   │   ├── page.tsx                  # 2A home device card
│   │   ├── agents/
│   │   │   ├── spawn/page.tsx        # 2B 2-screen spawn + Customize + birth
│   │   │   └── [id]/page.tsx         # 2C agent detail + thought cards + chat
│   │   ├── tasks/                    # public board (strings scrubbed)
│   │   ├── payments/                 # activity feed (untouched, no scrub needed)
│   │   ├── settings/page.tsx         # Devices + Account + Network + disclaimer
│   │   └── layout.tsx                # tab bar + status bar wrapper
│   └── api/
│       ├── atlas/
│       │   ├── status/route.ts
│       │   ├── decisions/route.ts
│       │   ├── probe/route.ts
│       │   ├── leaderboard/route.ts
│       │   └── funded-by-me/route.ts # NEW — admin fail-safe
│       ├── devices/[id]/
│       │   ├── live-status/route.ts  # NEW — home card data source (5s poll)
│       │   └── log/route.ts
│       └── agents/...
├── components/
│   ├── atlas/
│   │   ├── manifesto-block.tsx       # NEW — Sprint 1
│   │   ├── atlas-hero-stats.tsx      # NEW
│   │   ├── atlas-micro-stats.tsx     # NEW
│   │   ├── atlas-pnl-sparkline.tsx   # NEW
│   │   ├── attack-wall.tsx           # NEW — killer visual
│   │   ├── three-layer-diagram.tsx   # NEW
│   │   ├── top-up-atlas.tsx          # re-skinned dark
│   │   ├── live-timer.tsx            # reused
│   │   └── number-scramble.tsx       # reused
│   ├── device/
│   │   ├── hero-card.tsx             # 2A device card
│   │   ├── activity-feed.tsx
│   │   └── top-up-drawer.tsx
│   ├── spawn/
│   │   ├── customize-drawer.tsx      # depth — sliders + abilities + cadence + budget
│   │   └── birth-animation.tsx       # 4-step rite
│   └── os/
│       ├── tab-bar.tsx               # locked at four items
│       └── status-bar.tsx            # serial-aware greeting
├── lib/
│   ├── agents/
│   │   ├── runner.ts                 # priority queue (3A) + loop-breaker prompt
│   │   ├── store.ts                  # mode column persisted
│   │   ├── templates.ts              # 4 picker tiles + 2 hidden + Atlas
│   │   ├── scripted.ts
│   │   ├── rate-limit.ts
│   │   └── tools/                    # 9 tools, no new ones
│   └── atlas/
│       ├── decide.ts
│       ├── decide-llm.ts             # Commonstack DeepSeek V3.2
│       ├── runner.ts                 # auto-drip every 30 cycles
│       ├── auto-drip.ts              # NEW — getAtlasUsdcBalance + transferUsdcFromTreasury
│       └── ssr.ts                    # extended for 60 attacks + pnl24h
└── scripts/
    ├── atlas-runner.ts               # PM2 process: atlas
    ├── atlas-attacker.ts             # PM2 process: atlas-attacker
    ├── agent-pool.ts                 # PM2 process: agent-pool
    └── seed-task-board.ts            # idempotent task seeder
```

---

## Submission tracker

### Frontier (Devpost / arena.colosseum.org)

- [ ] Title: "Kyvern — A device you own. Workers that earn. Money you control."
- [ ] Tagline: "The first consumer device for autonomous AI labor on Solana."
- [ ] Section: The problem
- [ ] Section: What Kyvern is
- [ ] Section: Why Solana specifically
- [ ] Section: The proof — Atlas (live since April 20, 463 settlements, 1,014 attacks blocked, $0 lost)
- [ ] Section: Architecture (Device → Budget → Workers)
- [ ] Section: The agent-to-agent economy
- [ ] Section: Founder note
- [ ] Sponsor tags: Squads, Privy, Solana Foundation devnet, Circle USDC
- [ ] 90s demo video embedded
- [ ] GitHub link, live URL, Atlas observatory link

### KAST (Superteam Pakistan)

- [ ] Title: "Kyvern — AI workers that earn the stablecoins your KAST card spends."
- [ ] Opening frame about KAST rails + Kyvern engine
- [ ] Earn → vault → off-ramp loop
- [ ] Pakistani freelancer / remote worker context
- [ ] Demo video link

### Repo polish

- [ ] GitHub README — clean, matches submission narrative
- [ ] `.env.example` — no real keys
- [ ] Anchor program source visible
- [ ] Agent runner well-commented (already is)
- [ ] `DEMO.md` — step-by-step for judges (sign in → spawn → first thought → check Explorer)

---

## Daily mantras (unchanged)

1. **Three nouns: Device · Worker · Dollar.** Anything else dies.
2. **Atlas is the proof. Workers are the product.** Don't blur them.
3. **The 5% who click Customize must be rewarded with depth.** That's where judges live.
4. **`mode: "llm"` on every fresh worker's first thought.** Non-negotiable.
5. **The screenshot test.** If today's work doesn't produce one Tweet-worthy screenshot, today's work isn't done.

---

*Updated 2026-04-27 after Sprints 1–5 ship. Next file action: commit + push.*
