# Kyvern — current state + proposed next move
### A self-contained advisor brief

> Written 2026-05-09, ~24 hours before Solana Frontier + Kast Pakistan
> submission. Paste this into a chat with whoever you're consulting and
> ask the question at the bottom.

---

## 0. The one-line context

Kyvern is **a Solana device for your AI agent** — a Squads v4 smart
account wrapped in an on-chain Anchor policy program (deployed at
`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on devnet) that decides
whether every dollar an agent wants to spend should settle, before the
chain moves a single lamport. SDK on npm. Reference agent ("Atlas")
running continuously since 2026-04-20 (19+ days, 8.8k+ cycles, 1.3k+
settled txs, 6.5k+ attacks blocked, **$0 lost**).

We are submitting to **two** tracks with the same product:
1. **Solana Frontier 2026** — infrastructure + AI x Solana
2. **Kast Pakistan via Superteam Earn** — consumer + AI x Solana, with
   a real-world payoff loop into a KAST-funded card

Live URL: **https://kyvernlabs.com**

---

## 1. What we did (Phase 1) — followed SPEC_TO_WIN.md

I (the founder) wrote a tight 48-hour execution plan with two AI
advisors called `SPEC_TO_WIN.md`. Strategy was: collapse Kyvern from
"consumer device + worker theatre + dev infra" into one thing —
**financial safety infrastructure for autonomous agents** — and design
every surface around a **60-second judge moment**: click a button, watch
a real failed Solana tx land on Explorer with a custom Kyvern program
error code in the logs.

Execution against the spec, all shipped:

**Block A — cuts**
- Moved unbox cinematic to `/legacy/unbox`
- Replaced `/app` (premium chassis with 3 tabs + worker stage) with a
  minimal single-page dev console
- Renamed primary positioning from "device" to "infrastructure"

**Block B — the highest-leverage technical change**
This was real. The Anchor program at `PpmZ…MSqc` was deployed before
the sprint but **not in the hot path** — `/api/vault/pay` called Squads
directly. We rewired it:
- Initialized Atlas's policy PDA on devnet (real init signature
  `2o3dRkN…YKwLZZeTwF1QgHHGjisnza13ohGkfMEt26c1aGLY5Vwr`)
- Wrote a complete Anchor client (`src/lib/kyvern-policy/client.ts`) —
  `initializePolicy`, `callExecutePayment`, `pausePolicy`, `resumePolicy`
- Built `/api/atlas/probe-scenarios` with 5 working scenarios:
  - `merchant_not_allowed` → real failed tx, custom error 12003 (`MerchantNotAllowlisted`)
  - `missing_memo` → real failed tx, custom error 12004 (`MissingMemo`)
  - `amount_exceeds_per_tx` → real failed tx, custom error 12002 (`AmountExceedsPerTxMax`)
  - `vault_paused` → pauses the policy, attempts payment, resumes — real failed tx with custom error 12000 (`VaultPaused`)
  - `settled_allowed` → real $0.001 USDC transfer through the policy
    program → Squads CPI → SPL Token transfer
- Submission uses `skipPreflight: true` so the cluster ingests the
  failing tx; we capture a real, finalized signature with the program
  in the instruction trace
- Each refusal is **clickable to Solana Explorer**

**Block C — `/demo`**
A focused page where judges land. Single column, ≤900px, three steps
(Block · Settle · SDK), the 4 violation buttons + the settle, plus a
KAST hook box.

**Block D — minimal landing**
Cut the 3D device + orbital workers + live-economy mock. Replaced with
a single H1 ("AI agents shouldn't have private keys. They should have
budgets."), three buttons, live counter strip.

**Block E — KAST-rail compatibility**
- DB column `kast_destination_address` on the vaults table
- `POST /api/vault/[id]/set-kast-destination` — validates Solana
  pubkey, persists, adds `kast.xyz` to allowlist
- MY_KAST setup form on `/app`
- KAST affiliate URL `https://go.kast.xyz/VqVO/STPAK` in three places
  (docs, `/demo` footer, `/app` quick action)

**Block E2 — pay.sh full shell-out integration**
The Solana Foundation's `pay` CLI is now installed on the VM
(`npm install -g @solana/pay`). Sandbox mode works headless (no
biometric auth) because it auto-creates an ephemeral local wallet. We
wrote `/api/atlas/probe-paysh` with two scenarios:
- `paysh_over_cap` — Kyvern refuses BEFORE pay.sh fires; pay.sh is
  *never invoked*. Real failed Solana tx with custom error 12002.
- `paysh_settled` — Kyvern allows; we shell out to `pay --sandbox curl
  https://debugger.pay.sh/mpp/quote/AAPL`, capture the real x402
  response data (e.g. `{"symbol":"AAPL","price":"5.02"}`), then settle
  $0.001 on-chain via `execute_payment` → Squads CPI.

The architectural moment per the spec: **Kyvern decides BEFORE pay.sh's
local-wallet prompt fires.** Pay.sh is the rails; Kyvern is the policy
layer above the rails. Both products' value compounds; we never claim
partnership.

**Block F — SDK 0.5.0 + scaffolder 0.2.0**
- `vault.checkAllowance({ merchant, amount, memo })` — non-mutating
  policy probe, returns `{ decision, reason?, code? }`
- `KastDestination.fromAddress(address)` — declares-intent helper that
  returns `{ merchant: "kast.xyz", recipientPubkey }` for `vault.pay()`
  spread
- `npx create-kyvern-agent my-agent` — template now demonstrates the
  layered story (checkAllowance → pay.sh shell-out → KAST payout)
  in ~50 lines
- Versions bumped locally; npm publish deferred until I re-login to npm

**Block G — docs**
- Added "Wrap pay.sh with Kyvern in 4 lines" — the new headline guide
- Added "Sending earnings to a KAST-funded card"
- Added `vault.checkAllowance()` reference
- Added "What this is, and what this isn't" honesty section that owns
  every limitation (no hardware, devnet only, no partnerships, Atlas's
  decisions are scripted by design)

**Block H — pitch decks**
Two 10-slide markdown decks (`decks/frontier.md` + `decks/kast-pakistan.md`).
~80% shared. Slides 3 and 6 differ — Frontier deck has the pay.sh wedge
+ market story; Kast deck has the Maryam-the-Pakistani-freelancer
journey + Pakistan-specific market.

**Block J — README rewrite**
Single-page README documenting what's live, the 60-second judge demo,
architecture diagram, quickstart, honesty section, submission links.

All committed and deployed to the live VM as we went.

---

## 2. Why we partially reverted (Phase 2)

After all of the above shipped, I (the founder) clicked through the
result and felt something was wrong. The premium UI we'd spent multiple
days building — the 3D device hero on landing, the orbital workers, the
unbox cinematic, the Apple-grade `/app` chassis with its three premium
tabs and pull-up activity sheet, the worker tiles — was gone. Replaced
with a clean infrastructure-first aesthetic that read as *commodity B2B
infra*, not a Kyvern device.

The spec wasn't wrong about the 60-second judge moment. But losing the
device aesthetic and the soul of the product was the wrong trade.

So we did a surgical revert:

1. **Restored** the full premium landing (3D device, orbital workers,
   live-economy mock, attack wall preview) — pulled
   `src/components/landing/os-landing.tsx` from the backup branch
   `pre-spec-to-win-backup`
2. **Restored** `/unbox` cinematic but tightened it — total animation
   shortened from ~4.7s to ~2.5s. Total login → unbox → /app journey
   lands in ~15s with vault provisioning
3. **Restored** the `/app` premium chassis (top rail · 4-tab affordance
   row · vault-anchored canvas · bottom rail · pull-up activity sheet),
   but replaced the worker stage with **4 dev playground tiles**
   instead of bringing back Sentinel/Wren/Pulse worker theatre
4. **Cut** `/demo` — the violation buttons live inside `/app` now, in
   the worker-stage slot
5. **Kept** every Block B / E / E2 / F / G / J substantive backend
   addition unchanged (Anchor client, all probe APIs, SDK 0.5.0,
   scaffolder, docs, decks)

The revert was clean — backup branch on origin meant nothing was lost
permanently, and the new on-chain enforcement work was independent of
the UI cuts so it slotted right back in.

---

## 3. Where we are right now (live state)

### 3.1 Surfaces (all 200 on https://kyvernlabs.com)

**`/`** — premium landing
- 3D-tilted device floats with orbital workers (SVG/CSS 3D), live
  Atlas earnings on the device screen
- Trust bar: 19 days live · $X earned · N on-chain actions · $0 lost · M attacks blocked
- Sections: Problem → Device (three-layer diagram) → Workers (template
  cards) → Live Economy demo → Drain Atlas dare (with attack wall —
  60 most-recent failed Solana txs, each clickable to Explorer) →
  Builders → Final CTA

**`/login`** — Privy auth
- Two cards: "Get a Kyvern device" (fresh) + "I own a Kyvern device"
  (returning, routes to `/recover`)
- sessionStorage flag persists picker mode through the Privy redirect

**`/unbox`** — cinematic, ~2.5s on screen
- Box opens (750ms) → device slides up → serial typewrites
  ("KVN-XXXXXXXX" derived from wallet, 50ms/char) → 3-LED boot (Auth →
  Vault → Ready, 500ms each) → reveal device with starter copy
- For embedded Privy wallets: "Reveal device key" → Privy modal →
  user pastes back, local validation
- For external wallets: skip reveal, "Managed by [wallet]" pill
- On "Open Kyvern" → `/app` → vault create + agent seed kicks in (5–15s
  network)

**`/app`** — the device. Premium chassis preserved. Inside the chassis:
- **Top rail**: KVN serial · uptime · live USDC balance polled every
  5s · "Secured by Squads" pill
- **Worker-stage slot**: now `DevTilesCanvas` — vault-anchored frame,
  dot-grid backdrop, soft green halo at the bottom, with 4 dev tiles
  in a 2x2 grid:
  - **Watch the chain** (red border, `policy` chip)
  - **Wrap pay.sh** (green border, `live` chip)
  - **Send to KAST** (orange border, `kast` chip)
  - **Wrap your agent** (black border, `build` chip)
  - Vault status pill at the bottom: "Vault · Live · devnet · $X.XX USDC"
- **Affordance row** (4-tab nav, `grid-cols-2 sm:grid-cols-4`): same 4
  labels — clicking a tab opens that tab's instrument-drawer panel
- **Bottom rail**: scoreboard (calls today · blocked today · daily-cap
  gauge · last-settled-tx pill)
- **Pull-up activity sheet**: legacy ActionFeed component still wired,
  shows Atlas's items currently (not the user's — see §4)

The 4 panels (each is a slide-in drawer over the device — bottom sheet
on mobile, right drawer on desktop):
- **WatchChainPanel** — 5 violation scenarios, each fires
  `/api/atlas/probe-scenarios`, result modal shows custom Kyvern error
  code + Explorer link. **Currently fires against Atlas's vault, not
  the user's.**
- **PayShPanel** — 2 scenarios, fires `/api/atlas/probe-paysh`, result
  modal shows pay.sh response data (when allowed) + Explorer link.
  **Also currently against Atlas.**
- **KastPanel** — paste KAST USDC deposit address, allowlist as
  `MY_KAST`. **This one DOES touch the user's vault.**
- **BuilderPanel** — `IntegrateCard` (SDK + pay.sh code panes with
  user's actual agent key inlined) + agent key reveal/mint. **Also
  user-vault.**

**`/atlas`** — public evidence page (the "observatory")
- Manifesto + device plinth + earnings hero + 14-day sparkline
- Economic ledger (real x402 subscriber payments)
- "Drain Atlas" attack wall — 60 real failed Solana txs scrolling

**`/docs`** — sticky-sidebar developer docs
- Install · Quickstart (5-line `KastDestination` example) ·
  `vault.pay()` · `vault.checkAllowance()` · `vault.status()` · Kill
  switch · Errors · Wrap pay.sh in 4 lines · Sending earnings to KAST ·
  REST API · "What this is and what this isn't" · What's next

### 3.2 The on-chain layer (the moat)

The Kyvern policy program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`
is in the hot path. Every settled payment from the user's vault — and
every refused one when `forceOnChain: true` — has the program in its
instruction trace.

Five rules + a kill switch:
- `VaultPaused` (custom error 12000)
- `InvalidAmount` (12001)
- `AmountExceedsPerTxMax` (12002)
- `MerchantNotAllowlisted` (12003)
- `MissingMemo` (12004)
- `VelocityCapExceeded` (12005)

Two-layer enforcement:
- Kyvern policy program: merchant allowlist (SHA-256 hash compare),
  memo presence, velocity (rolling per-slot window), pause state
- Squads v4 spending limit: per-tx cap, daily cap, weekly cap (CPI'd
  from the Kyvern program's `execute_payment` instruction)

Failure at either layer reverts the whole tx. No middle state. No
off-chain trust.

### 3.3 Backend / API surface

**Real on-chain integration:**
- `/api/vault/pay` — primary spending endpoint (off-chain pre-check →
  Squads CPI)
- `/api/vault/check-allowance` — non-mutating policy probe (the
  `checkAllowance` SDK method)
- `/api/vault/[id]/pause` — kill-switch toggle
- `/api/vault/[id]/set-kast-destination` — store user's KAST address +
  add `kast.xyz` to allowlist
- `/api/atlas/probe-scenarios` — 5 violation + 1 settle scenarios
  against Atlas's vault, real failed-tx generation
- `/api/atlas/probe-paysh` — pay.sh shell-out (real `pay --sandbox
  curl`) wrapped in Kyvern policy
- `/api/atlas/status` — Atlas runner state for the trust bar

**Live system processes (PM2 on the VM):**
- `kyvern-commerce` — Next.js 14 app on port 3001
- `atlas` — Atlas runner, cycles every 120s, makes real on-chain spends
- `atlas-attacker` — adversary loop, fires canned scenarios every 22m
- `agent-pool` — generic runner for user-spawned agents (currently
  unused since workers are gone from the user-facing flow)
- `atlas-subscriber` — x402 subscriber that calls `/api/atlas/feed`

**SDK + scaffolder:**
- `@kyvernlabs/sdk@0.5.0` (built locally, not yet republished post-bump)
  - `Vault` (HTTP client)
  - `OnChainVault` (direct Anchor CPI)
  - `KastDestination` (helper)
  - `vault.checkAllowance()` method
- `create-kyvern-agent@0.2.0` (locally bumped)
  - Default template demonstrates pay.sh + KAST + checkAllowance

### 3.4 Repository file map (the parts that matter)

```
src/
  app/
    page.tsx                             ← landing route, metadata
    unbox/page.tsx                       ← ~2.5s cinematic + Privy reveal
    login/page.tsx                       ← two-card picker
    app/page.tsx                         ← THE DEVICE (premium chassis)
    atlas/page.tsx + atlas-client.tsx    ← public evidence page
    docs/page.tsx                        ← sticky-sidebar dev docs
    api/
      atlas/
        status/route.ts                  ← live trust-bar data
        decisions/route.ts               ← attack-wall data
        economy/route.ts                 ← 14-day rollup
        probe-scenarios/route.ts         ← 5 violation scenarios
        probe-paysh/route.ts             ← pay.sh shell-out wrap
      vault/
        pay/route.ts                     ← primary spending endpoint
        check-allowance/route.ts         ← non-mutating policy probe
        [id]/pause/route.ts              ← kill switch
        [id]/set-kast-destination/route.ts ← KAST setup
      devices/
        [id]/live-status/route.ts        ← /app polling endpoint
        [id]/agent-key/route.ts          ← mint + reveal-once

  components/
    landing/
      os-landing.tsx                     ← premium landing (1262 lines)
      hero-device.tsx                    ← 3D device + orbital workers
      live-economy-demo.tsx              ← /app preview slideshow
      attack-wall-preview.tsx            ← real failed-tx ticker
      landing-trust-bar.tsx              ← live counter strip
      cursor-halo.tsx                    ← cursor follow halo
      scroll-aware-nav.tsx               ← transparent → solid navbar
    device/
      home/
        affordance-row.tsx               ← 4-tab nav (PanelKind type)
      shell/
        canvas-zone.tsx                  ← (legacy) worker arc layout
        dev-tiles-canvas.tsx             ← NEW: 4 dev tiles, vault-anchor
        control-zone.tsx                 ← bottom rail + panel router
        identity-strip.tsx               ← top rail
        manifesto-strip.tsx              ← thin manifesto bar
      panels/
        device-panel.tsx                 ← shared shell for all panels
        watch-chain-panel.tsx            ← NEW: 5 violation scenarios
        paysh-panel.tsx                  ← NEW: pay.sh shell-out
        kast-panel.tsx                   ← NEW: KAST setup
        builder-panel.tsx                ← (kept) SDK + agent key

  lib/
    kyvern-policy/
      client.ts                          ← Anchor program client
      idl.json                           ← copy of the IDL
    policy-engine.ts                     ← off-chain policy evaluator
    server-pay.ts                        ← server-side vault.pay()
    squads-v4.ts                         ← Squads CPI helpers
    vault-store.ts                       ← SQLite vault model

scripts/
  init-atlas-policy.ts                   ← one-shot to init Atlas's PDA
  atlas-runner.ts                        ← Atlas's PM2 process loop
  atlas-attacker.ts                      ← adversary loop

packages/
  sdk/
    src/
      index.ts                           ← Vault + checkAllowance + ...
      onchain.ts                         ← OnChainVault
      kast.ts                            ← KastDestination helper
  create-kyvern-agent/
    bin/cli.mjs                          ← scaffolder CLI
    templates/langchain/
      src/agent.ts                       ← demonstrates pay.sh + KAST

anchor/programs/kyvern-policy/           ← deployed program source
```

### 3.5 What's preserved from before SPEC_TO_WIN

- Landing premium aesthetic (3D, orbital, live-economy)
- Unbox cinematic
- /app premium chassis (top rail, tabs, bottom rail, pull-up sheet)
- Cursor halo + bezel-flash + all the polish
- Squads v4 vault provisioning
- Privy auth
- Atlas runner + attack wall
- All the device-shell plumbing

### 3.6 What's NEW from SPEC_TO_WIN that we kept

- Anchor program in the hot path (was deployed but not invoked before)
- All 5 violation scenarios producing real failed Solana txs with the
  Kyvern program in the trace
- pay.sh full shell-out integration (`pay --sandbox curl`)
- `vault.checkAllowance()` SDK method
- `KastDestination` SDK helper
- KAST destination setup in DB + UI + endpoint
- Updated docs
- Pitch decks
- Updated scaffolder template
- Updated README

---

## 4. The honest "alive" gap

This is where I want the advice.

**The product looks beautiful. The plumbing is real. But `/app` doesn't
currently feel like the user's own device.** The 4 dev tiles fire
buttons that demo Kyvern's enforcement against **Atlas's vault, not
the user's**. The pull-up activity sheet shows Atlas's events. The
bottom rail shows synthetic numbers.

A user signs in, gets their own vault provisioned (real Squads
multisig on devnet), gets their own agent key — and then sits on a
dashboard that shows... nothing they've done yet, because it's all
demonstrating Atlas. The buttons are real on the wire but they don't
feel *theirs*.

For a Frontier judge clicking through, this is fine — they want to see
the moat moment, the failed-tx Explorer link. But for a Pakistani
builder evaluating whether to actually use Kyvern, the dashboard isn't
operational. They can't see their own agent's activity. They can't
follow integration steps. They can't watch their key come alive when
they hook it into their code.

This is the gap I want to close before submission.

---

## 5. The proposed next move (T-block)

Transform `/app` from "static dev playground" into **a live operational
console for the user's actual agent**, like Stripe Dashboard or
Linear's project view.

Premium UI is preserved exactly. The 4-tile chassis stays. What
changes:

### 5.1 Top rail gets a live agent status line

Below the existing KVN serial / USDC balance, add:
> *"Your agent · `kv_live_a7b…` · last action 12s ago"*

with a pulsing dot that goes green when an event lands. Updates every
5s. Click expands to a 30-day sparkline.

### 5.2 Worker-stage slot — replace 4 static tiles with the **Live Integration Console**

Two columns inside the existing vault-anchored chassis:

**Left half — 5-step integration wizard** (Apple-Settings register):

```
Step 1 · Mint your key                    ✓
        kv_live_a7b… (Shown once, Copy)

Step 2 · Install                          ← unlocks after Step 1
        $ npx create-kyvern-agent my-agent  [Copy]
        $ npm install @kyvernlabs/sdk       [Copy]

Step 3 · Make your first call             ← unlocks after Step 2
        await vault.checkAllowance({...})
        [paste-and-run snippet, key inlined]

Step 4 · Try a violation                  ← unlocks after Step 3 lands
        [Try over-cap]  [Try off-allowlist]  [Try missing memo]
        Each fires a probe AGAINST YOUR VAULT with YOUR KEY.
        The blocked tx lands in your event feed →

Step 5 · Send earnings to KAST            ← unlocks last
        Paste KAST USDC deposit address
        [Allowlist as MY_KAST]
```

Three states per step (locked / active / complete). Progress persists
in the DB so it survives refreshes.

**Right half — live event feed:**

```
┌──────────────────────────────────────────────┐
│ Your agent's events                          │
│ All · Allowed · Blocked · Failed             │
├──────────────────────────────────────────────┤
│ 12s ago    api.openai.com  $0.04  ✓ settled │
│ 2m ago     api.pay.sh      $0.001 ✓ settled │
│ 5m ago     ranger.com      $0.05  ✗ blocked │
│            merchant_not_allowed              │
│            view on Explorer →                │
│ 21m ago    api.openai.com  $5.00  ✗ blocked │
│            amount_exceeds_per_tx             │
│            view on Explorer →                │
└──────────────────────────────────────────────┘
```

Polls `vault_payments` table for the user's vault every 3s. New events
fade in from the top. Each row expands on click → memo + signature +
Explorer link. Empty state for fresh keys: *"Mint a key + run the
snippet above. Your first event lands here in seconds."*

### 5.3 Affordance row (4 panels) — same labels, deeper content

- **Watch the chain** → 5 violation buttons hit USER's vault with
  USER's key, not Atlas. Their blocked txs land in their event feed.
  Atlas's attacks become a "see what others tried" link to /atlas.
- **Wrap pay.sh** → existing 2 buttons + a paste-your-own-pay.sh-URL
  field for any service in the catalog.
- **Send to KAST** → address paste + a "Test a $0.001 payout to MY_KAST"
  button that produces a real on-chain transfer the user can verify.
- **Wrap your agent** → SDK pane + scaffolder + REST cURL + a live
  "API health" indicator showing whether their key has been used in
  the last hour.

### 5.4 Bottom rail — the user's stats, not Atlas's

- *Today: $X spent · N calls · M blocked*
- Daily-cap remaining gauge (filled by user's actual spend)
- 7-day mini sparkline
- *"Last settled: 12s ago — view on Explorer"*

### 5.5 Pull-up activity sheet — full filterable event ledger

Currently has Atlas-era cards. Replace with:
- 30 days of user's vault decisions
- Filters: status × merchant × amount range × time
- Each row click → drill into transaction details + program logs +
  Explorer link
- Export CSV button

### 5.6 Backend additions needed

| Endpoint | Purpose | Source |
|---|---|---|
| `GET /api/vault/[id]/events?limit=50&since=...` | Paginated user events for live feed | `vault_payments` table |
| `GET /api/vault/[id]/integration-progress` | Which wizard steps user has completed | new `integration_state JSON` column on `vaults` |
| `POST /api/vault/[id]/integration-progress/:step` | Mark step complete | same |
| `POST /api/atlas/probe-scenarios` (extended) | Accept `vaultId` + use user's vault | small change |
| `POST /api/vault/[id]/test-payout` | Send $0.001 from user's vault to MY_KAST (real on-chain) | wraps `serverVaultPay` |

### 5.7 Estimated time

~6–8 focused hours, broken into:
- T1 (~1.5h): Live event feed component + `/api/vault/[id]/events`
- T2 (~2h): Integration wizard component (5 steps, persisted progress)
- T3 (~1h): User-vault routing for probe-scenarios (currently hardcoded Atlas)
- T4 (~1h): Top rail live status + bottom rail user stats
- T5 (~1h): Pull-up activity sheet rewire
- T6 (~30m): Polish, build, deploy, smoke

If time-boxed: T1 + T2 + T3 give the "alive" feel fastest. T4–T6 are
polish layered on top.

---

## 6. The strategic question

We are ~24 hours from submission. The Frontier-judge demo flow already
works bulletproof — they click an Explorer link, see a real failed
tx, win. The 60-second moment is solved.

**Should we invest 6–8 hours rebuilding `/app` into a live integration
console, or keep that bandwidth for video recording, deck PDFs, and
the actual submission steps (which are also ~6–8 hours)?**

Arguments for going hard on the live console:
- The Pakistani consumer judge (Kast track) will value "I can see my
  own agent working" much more than "I clicked a button and saw a
  failed tx"
- It transforms the product from "infra demo" to "real operational
  tool" — venture-scale category vs hackathon-trick category
- The plumbing is all there; this is just UI on top of existing APIs
  and data

Arguments against:
- Submission will get rougher — less time for the video, decks PDF
  conversion, double-checking the Explorer links work in incognito,
  filling the portal forms
- The Frontier judge won't mint a key and integrate; they want the
  60-second proof
- Risk of shipping something half-built that breaks the existing live
  flow

What would you do? Specifically:
1. Should we ship T1+T2+T3 only (live feed + wizard + user-vault routing,
   ~4.5h) and bank the rest for video/submission?
2. Or ship the full T1–T6 and let the video be a 90% effort?
3. Or skip it entirely, polish the existing flow, and double down on
   the deck + video + submission packaging?

Be specific. Tell us which surfaces should win the next 8 hours and
which we should explicitly skip.

---

## Appendix A — current commits / branch state

Branch `main` (active): all of the above
Branch `pre-spec-to-win-backup` (origin): the pre-execution snapshot,
preserved as a safety net

Latest commits on main (most recent first):
```
94b7d63 Restoration · premium device experience back, dev playground integrated
3dff090 Block J · README rewrite — single-page, what's live, 60-second judge demo
5b32162 Block H · pitch decks (Frontier + Kast Pakistan, ~80% shared)
e0f5218 Block G · docs — pay.sh wrap, KAST guide, checkAllowance ref, honesty section
69fc738 Block F · SDK 0.5.0 + create-kyvern-agent 0.2.0
6df6f36 Block E2 · pay.sh wrap — full shell-out integration
b0adeb6 Block E · KAST-rail compatibility — DB migration, set-kast API, /app form wiring
49f2cdd Block D · landing rework (later reverted by 94b7d63)
7730c83 Block C · /demo page (later removed by 94b7d63)
44dc64e Block B · pause/resume Anchor instructions + vault_paused scenario
1df7d2e Block B · /api/atlas/probe-scenarios endpoint
bbad672 Block B · Anchor client for kyvern-policy + Atlas init script
01d30d4 Block A · cuts and routing (later partially reverted by 94b7d63)
bf6f955 spec · SPEC_TO_WIN.md + raw-reality writeup
be1af82 playground-pay · blocked attempts produce real failed Solana tx
e82fcdd demo prep · paste-and-run Pay.sh snippet + builder demo materials
...
```

## Appendix B — npm publish status

Both packages are bumped + built locally but not yet published:
- `@kyvernlabs/sdk@0.5.0` (current published: 0.4.0)
- `create-kyvern-agent@0.2.0` (current published: 0.1.1)

Will publish once npm login is re-done. The `0.4.0` SDK works for the
existing scaffolder; new features (`KastDestination`, `checkAllowance`)
need 0.5.0 to be live.

## Appendix C — what's left independent of /app rebuild

Whether we go T1–T6 or skip:
1. Render `decks/frontier.md` + `decks/kast-pakistan.md` to PDF
2. Record 2–3 minute video (Frontier + Kast versions)
3. Submit to Frontier portal (region: Pakistan, tracks: Infra + AI + Consumer)
4. Submit to Superteam Earn (Kast track) — deck + demo URL + video +
   KAST signup confirmation screenshot
5. Run a final smoke pass in incognito on `kyvernlabs.com` — every link
   on the landing, every panel button, every Explorer link, before the
   submission window
6. Top up the server fee payer at faucet.solana.com (it's at 2.33 SOL,
   ~466k attempts of headroom, but new daily cap window matters)
7. `npm publish` SDK 0.5.0 + scaffolder 0.2.0
