# Kyvern — product state, locked 2026-05-09

Single canonical reference for the current state of the product, with
emphasis on `/app` (the protagonist surface). Self-contained — read
cold and you'll know what's live, what works, what doesn't, and where
every file lives.

> Updated: 2026-05-09 ~17:00.
> Submission window: Frontier May 11, Kast Pakistan via Superteam Earn.
> Current branch: `main` (everything merged from `t-block-alive`).
> Backup: `pre-spec-to-win-backup` on origin.

---

## 1. The product in one paragraph

Kyvern is **a Solana device for your AI agent.** It's a Squads v4
smart account wrapped in an on-chain Anchor policy program at
`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` that decides whether
every dollar an agent wants to spend should settle, before the chain
moves a single lamport. Five rules + a kill switch, six custom error
codes (`12000`-`12005`). SDK on npm. A reference agent (Atlas) has
been running continuously on devnet for 19+ days with $0 lost. The
new `/app` is a live integration console — five-step wizard on the
left, real-time event feed on the right — where a builder mints a
key, runs three lines, and watches their first on-chain event land
in <3 seconds.

**Live URL:** https://kyvernlabs.com
**Repo:** https://github.com/shariqazeem/kyvern-atlas
**Manifesto:** *"AI agents shouldn't have private keys. They should
have budgets."*

---

## 2. The full surface map

| Route | What it is | Status |
|---|---|---|
| `/` | Premium landing (3D device, orbital workers, attack wall, live trust bar) | Live |
| `/login` | Two-card picker (Get device / I own one), Privy auth | Live |
| `/unbox` | One-screen ~2.3s cinematic (closed → opening → serial → boot → claimed) | Live |
| `/app` | **The protagonist.** Live integration console. Detailed in §3. | Live |
| `/app?panel=bay\|use\|kast\|builder` | URL deep-links open instrument-drawer panels over `/app` | Live |
| `/app?classic=1` | Falls back to the old static DevTilesCanvas (was the brief alive-flag fallback) | Live |
| `/app/agents/[id]` | Per-worker detail page (legacy, unlinked from primary nav) | Resolves; not in nav |
| `/app/inbox` | Worker-era findings inbox | Resolves; not in nav |
| `/app/settings` | Legacy settings | Resolves; not in nav |
| `/atlas` | Public observatory: live earnings, attack wall, economic ledger | Live |
| `/docs` | Sticky-sidebar dev docs (install, vault.pay, checkAllowance, KAST, pay.sh, honesty) | Live |
| `/legacy/unbox` | The pre-tightened cinematic (kept for narrative video shots) | Resolves |
| `/recover` | Returning-user recovery flow | Live |
| `/try` | Guest sandbox (legacy, kept for direct links) | Live |
| `/demo` | The standalone demo page from the spec era | **Cut** — 404 |

### Routes that 301 to `/`

`/registry`, `/reports`, `/tools`, `/services`, `/launch`, `/provider`,
`/changelog` — all permanent redirects from the pre-pivot Pulse era.

---

## 3. `/app` deep-dive — design structure

`/app` is the device. The chassis is preserved from the Apple-grade
Phase-1–8 work — top rail, vault-anchored body, bottom rail, status
bar overlays. What changed for the T-block sprint is the **content
that fills the worker-stage slot.**

### 3.1 Top to bottom layout

```
┌──────────────────────────────────────────────────────────────────┐
│  IdentityStrip — KVN serial · uptime · network · vault USDC     │  ← src/components/device/shell/identity-strip.tsx
├──────────────────────────────────────────────────────────────────┤
│  StateStrip (only when state !== "active") — onboarding hint    │  ← src/components/device/state-strip.tsx
├──────────────────────────────────────────────────────────────────┤
│  AliveConsole — the worker-stage slot, replaces DevTilesCanvas  │  ← src/components/device/shell/alive-console.tsx
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ AgentStatusLine — "Your agent · kv_live_… · last 12s ago"  │ │
│  │ Whisper line — "Mint your key. Run three lines. Watch…"     │ │
│  │ ┌─────────────────────────┬──────────────────────────────┐ │ │
│  │ │ IntegrationWizard       │ AgentEventFeed                │ │ │  ← left+right cols inside chassis
│  │ │ 5 collapsible steps     │ Polls every 3s, fade-in,      │ │ │
│  │ │ Apple-Settings register │ status filter, Explorer link  │ │ │
│  │ └─────────────────────────┴──────────────────────────────┘ │ │
│  │ TodayStats — $X spent · N calls · M blocked                 │ │
│  │ Vault status pill — "Vault · Live · devnet · $X.XX USDC"    │ │
│  │ Footnote — "Secured by Squads · enforced by PpmZ…MSqc"      │ │
│  └────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│  ControlZone (bottom rail)                                       │  ← src/components/device/shell/control-zone.tsx
│  └─ AffordanceRow — chassis decoration: Open a bay · Use the    │     src/components/device/home/affordance-row.tsx
│     device · Builder. Click = soft scrollTo top, no panels.     │
├──────────────────────────────────────────────────────────────────┤
│  ManifestoStrip — thin "$5/day cap · chain decides…" footer     │
└──────────────────────────────────────────────────────────────────┘

Floating overlays (mounted alongside, conditionally rendered):
  · WatchChainPanel  (when ?panel=bay)
  · PayShPanel       (when ?panel=use)
  · KastPanel        (when ?panel=kast)
  · BuilderPanel     (when ?panel=builder)
  · TopUpDrawer      (when topUpOpen)
  · FirstFindingToast (one-time when first signal lands)
```

### 3.2 The Integration Wizard — 5 steps in detail

File: `src/components/device/wizard/integration-wizard.tsx`. Each
step has three visual states (locked / active / complete) and persists
completion in the `vaults.integration_state` JSON column.

**Step 1 — Mint your key**
- GET `/api/devices/[id]/agent-key` → returns `keyPrefix` (e.g. `kv_live_a7b2`)
- Click "Mint a key" or "Regenerate" → POST same endpoint → returns `{ rawKey, keyPrefix }`
- Reveals once in a black code block with Copy button
- Copies the key → marks step complete + auto-advances Step 2

**Step 2 — Install**
- Two terminal-style command lines: `npx create-kyvern-agent my-agent` + `npm install @kyvernlabs/sdk`
- Independent Copy buttons per command
- Auto-advances when **both** are copied; "Continue →" link appears after the first copy if user wants to skip the second
- (Earlier bug — auto-advanced on the first copy — fixed)

**Step 3 — Make your first call**
- Three-line snippet with the user's `keyPrefix` inlined in the `Vault` constructor:
  ```ts
  import { Vault } from "@kyvernlabs/sdk";
  const vault = new Vault({ agentKey: "kv_live_a7b…" });
  const ok = await vault.checkAllowance({ merchant: "api.openai.com", amount: 0.05 });
  ```
- Copy → marks complete + advances Step 4

**Step 4 — Try a violation**
- Three buttons: **Over-cap $5** · **Off-allowlist** · **Missing memo**
- Each fires POST `/api/atlas/probe-scenarios` with `{ scenario, vaultId }` + `x-owner-wallet` header
- Server runs the corresponding scenario through the user's own vault (lazy-inits the user's policy PDA on first call), submits with `skipPreflight: true`, captures the failed signature
- Resulting blocked tx is recorded against the user's `vault_payments` table → lands in the AgentEventFeed within ~3s with a green/red row flash
- Click marks step complete; Explorer link inline ("✓ 3svGZTsr…aHWp2 on Explorer")
- Disabled state: when `useAuth` hasn't hydrated yet, copy reads "Hydrating auth — buttons unlock in a second"

**Step 5 — Send earnings to KAST**
- Input field for KAST USDC deposit address; "Allowlist as MY_KAST" button
- Hits POST `/api/vault/[id]/set-kast-destination` → adds `kast.xyz` to the off-chain allowlist + persists the address
- After save, a green "Verify the rail" subcard appears with **Test $0.001 payout** button
- Test payout: POST `/api/vault/[id]/test-payout` → real on-chain Squads tx via `serverVaultPay()`
- Step marks complete on a real settled payout (not just the allowlist save)
- Honest failure mode: if the user's vault has $0 USDC, the chain refuses with "no record of prior credit" — surfaced cleanly
- Affiliate link to `https://go.kast.xyz/VqVO/STPAK`

### 3.3 The Live Event Feed

File: `src/components/device/feed/agent-event-feed.tsx`. The right
column of the AliveConsole.

- Polls GET `/api/vault/[id]/events?limit=50&since=<latestTs>` every 3s
- Delta polling — only fetches events created after the last seen timestamp
- New rows fade in at the top with a 1.6s **green/red background pulse**
  matching the row's status (settled = green, blocked = red)
- Filter chips: All / Allowed / Blocked
- Each row click expands to: memo, signature, Solana Explorer link
- Empty state copy: *"Mint a key + run the snippet on the left. Your
  first event lands here in seconds."*
- 401 race fix: first-poll auth failures swallowed silently (the 3s
  retry succeeds once useAuth hydrates)

### 3.4 The chassis decoration (affordance row)

File: `src/components/device/home/affordance-row.tsx`. Three labeled
buttons under the device:

| Label | Sub | Click behavior |
|---|---|---|
| Open a bay | "deploy your agent" | Soft scrollTo top |
| Use the device | "watch the chain decide" | Soft scrollTo top |
| Builder | "sdk · scaffolder · key" | Soft scrollTo top |

These used to open instrument-drawer panels. Per the user's
chassis-decoration request, click is now a no-op-with-scroll. Panels
remain accessible via URL deep-link (`?panel=bay|use|kast|builder`)
for power users + video-narration shots.

### 3.5 The four instrument-drawer panels (deep-link only)

| Panel | URL | What's inside |
|---|---|---|
| WatchChainPanel | `/app?panel=bay` | 5 violation scenarios + 1 settle, real failed-tx Explorer links, custom error codes |
| PayShPanel | `/app?panel=use` | 2 scenarios — over-cap (Kyvern refuses, pay.sh never invoked) + settled (real `pay --sandbox curl` shell-out + Kyvern settles) |
| KastPanel | `/app?panel=kast` | KAST address paste + allowlist as MY_KAST |
| BuilderPanel | `/app?panel=builder` | IntegrateCard with full SDK + pay.sh code panes, agent key reveal/mint |

All four extend `<DevicePanel>` (mobile bottom sheet, desktop right
drawer) with esc-to-close + focus management.

### 3.6 What's mounted on `/app` but currently inert

- `FirstFindingToast` — fires once per device when the first signal
  lands. Still mounted as backward-compat with the older Phase-6
  toast pattern. Safe to remove post-Frontier.
- `lastActionByWorker` map — was used by the old WorkerCanvas. Already
  deleted, but the older codebase had it.

---

## 4. What works (verified live, server-side smoke 2026-05-09)

| Surface / feature | Endpoint or component | Verified |
|---|---|---|
| Premium landing renders, trust bar polls every 5s | `/` | ✓ |
| Atlas attack wall loads with 24 most-recent failed txs | `/api/atlas/decisions?kind=attacks&limit=24` | ✓ |
| `/login` two-card picker + Privy auth | Privy SDK | ✓ |
| `/unbox` plays in ~2.3s, no key-reveal step, lands on `/app` | local timings | ✓ |
| `/app` renders alive console (default — was `?alive=1` opt-in, now flag-off) | `searchParams.get("classic") !== "1"` | ✓ |
| Wizard step 1 mint key returns `rawKey + keyPrefix` and reveals in code block | POST `/api/devices/[id]/agent-key` | ✓ |
| Wizard step 2 dual-copy with Continue link | client-side | ✓ |
| Wizard step 3 snippet inlines `keyPrefix` | client-side | ✓ |
| Wizard step 4 violations produce real failed Solana txs against user's vault | POST `/api/atlas/probe-scenarios` w/ vaultId | ✓ |
| Lazy policy PDA init for fresh user vaults | `initializePolicy()` inside probe-scenarios | ✓ |
| Wizard step 5 allowlist persists + Test Payout fires real tx | POST `/api/vault/[id]/set-kast-destination` + POST `/api/vault/[id]/test-payout` | ✓ |
| Live event feed polls 3s, filters by status, expands rows | GET `/api/vault/[id]/events` | ✓ |
| Event feed 401 race swallowed silently | client guard on `r.status === 401` | ✓ |
| Event row pulses green/red on landing | `freshIds` Set in feed | ✓ |
| Today stats counter (spent / calls / blocked) live updates | derived from `/events` poll | ✓ |
| Agent status pill — pulsing dot when last event timestamp set | `AgentStatusLine` | ✓ |
| Affordance row chassis tabs — soft-scroll, no panel | `AffordanceRow.handleClick` | ✓ |
| URL deep-links open panels (`?panel=bay\|use\|kast\|builder`) | `panel` state from search params | ✓ |
| `/api/atlas/probe-scenarios` against Atlas's vault still works (no vaultId) | curl smoke confirmed sig `5gAq4Ra8…` | ✓ |
| `/api/atlas/probe-paysh` settled scenario fires real `pay --sandbox curl` | sig `4wSAJ5a3…` returned AAPL quote | ✓ |
| `/api/atlas/probe-paysh` over-cap refused before pay.sh fires | sig `3svGZTsr…` w/ 12002 | ✓ |
| `/atlas` evidence page unchanged from before T-block | route + content | ✓ |
| `/docs` sections (Quickstart with KastDestination, Wrap pay.sh, KAST guide, Honesty) | route + content | ✓ |
| Atlas runner ticking continuously | `/api/atlas/status` returned `cycle 8966, $0 lost` | ✓ |
| 5 PM2 processes online: kyvern-commerce, atlas, atlas-attacker, agent-pool, atlas-subscriber | `pm2 list` | ✓ |
| Anchor program at `PpmZ…MSqc` initialized for Atlas | init sig `2o3dRkN…` finalized | ✓ |
| Custom error codes 12000 (Paused), 12002 (PerTxMax), 12003 (MerchantNotAllowlisted), 12004 (MissingMemo) | each verified via failed-tx logs | ✓ |
| Real settled payment through Kyvern → Squads CPI → SPL Token | settled sig `4vWSAu84…` confirmed | ✓ |

---

## 5. What doesn't work / known issues

### 5.1 Genuinely broken

- **`npm publish` 0.5.0 + 0.2.0 still pending.** SDK `dist/` is built
  locally but `@kyvernlabs/sdk@0.4.0` is the public version on npm.
  Until republished, `npx create-kyvern-agent` (currently `0.1.1` on
  npm) scaffolds a project that pins `@kyvernlabs/sdk@^0.4.0` — the
  `KastDestination` and `vault.checkAllowance` features the docs and
  scaffolder demo reference don't exist in 0.4.0. **User action:
  `npm login`, then `npm publish` in both `packages/sdk` and
  `packages/create-kyvern-agent`.**
- **Test Payout requires vault USDC.** A fresh user provisioned at
  `/unbox` has $0 in their vault. The Test Payout button surfaces
  "no record of prior credit" cleanly, but until the user funds the
  vault the loop doesn't visibly close. Mitigations: (a) have a
  "Top up vault" CTA next to Test Payout, (b) airdrop $0.01 USDC at
  vault provisioning. Neither is in. Post-Frontier.

### 5.2 Honest limitations (intentional, documented)

- **Atlas decisions are scripted, not LLM.** `scripts/atlas-runner.ts`
  rotates through a hardcoded `ACTIONS` array. The on-chain spending
  is real; the reasoning is theatrical. Documented in `/docs`'s
  honesty section.
- **Atlas merchant destinations are fictional.** When Atlas "pays
  api.openai.com", the actual on-chain destination is a fixed devnet
  test recipient. The merchant name lives in the memo + decision log.
- **Devnet only.** Mainnet audit is on the post-Frontier track.
- **Kyvern is not a KAST or pay.sh partner.** Compatible-with framing
  only. The KAST integration speaks via the working flow + the
  affiliate signup link.

### 5.3 Minor cleanup ideas (post-Frontier)

- `/app/inbox` and `/app/settings` resolve but show legacy worker-era
  UIs. Either redirect to `/app` or rebuild for the new theme.
- The 4 instrument-drawer panels duplicate some wizard content
  (e.g. the violation buttons exist both in WatchChainPanel and the
  wizard step 4). Could consolidate, but the panels offer richer
  views (e.g. BuilderPanel has full SDK + pay.sh code tabs).
- Pull-up activity sheet (`ActivitySheet` component) is in the
  codebase but not mounted. Could surface the user's full event
  ledger with filters/CSV export.
- AffordanceRow click is a no-op-with-scroll. If users find the click
  feedback unclear, swap to disabled-with-tooltip.

---

## 6. Backend / API surface

### 6.1 The vault hot-path

| Endpoint | Auth | Purpose |
|---|---|---|
| POST `/api/vault/pay` | `Authorization: Bearer kv_live_…` | Primary spending — off-chain pre-check → Squads CPI |
| POST `/api/vault/check-allowance` | Bearer | Non-mutating policy probe (the SDK's `checkAllowance` method) |
| POST `/api/vault/[id]/pause` | `x-owner-wallet` header | Kill switch |
| POST `/api/vault/[id]/set-kast-destination` | `x-owner-wallet` | Persist KAST address + add `kast.xyz` to allowlist |
| GET `/api/vault/[id]/set-kast-destination` | `x-owner-wallet` | Read current MY_KAST setting |
| POST `/api/vault/[id]/test-payout` | `x-owner-wallet` | Fire $0.001 from user vault to MY_KAST (real Squads tx) |
| GET `/api/vault/[id]/events` | `x-owner-wallet` | Paginated decision log for the live feed (limit=50, since=…) |
| GET `/api/vault/[id]/integration-progress` | `x-owner-wallet` | Wizard step state (which steps complete) |
| POST `/api/vault/[id]/integration-progress` | `x-owner-wallet` | Mark step complete |
| POST `/api/vault/list?ownerWallet=…` | none | List user's vaults (used by /unbox, /app to resolve deviceId) |
| POST `/api/vault/create` | none | Create a Squads multisig + spending limit (called from /unbox) |

### 6.2 The Atlas / public layer

| Endpoint | Purpose |
|---|---|
| GET `/api/atlas/status` | Live Atlas runner state (uptime, totals, $0 lost) — polls landing trust bar |
| GET `/api/atlas/decisions?kind=attacks&limit=N` | Recent attack txs for the wall |
| GET `/api/atlas/economy` | 14-day rollup + sparkline |
| POST `/api/atlas/probe-scenarios` | Demo violations — accepts optional `vaultId` to route through user's vault |
| POST `/api/atlas/probe-paysh` | pay.sh wrap demo — same vaultId support |
| GET `/api/atlas/probe-scenarios` | Scenario catalogue |
| GET `/api/atlas/probe-paysh` | pay.sh scenario catalogue |
| POST `/api/atlas/probe` | Legacy public attack endpoint, used by `/atlas` |

### 6.3 The devices layer

| Endpoint | Purpose |
|---|---|
| GET `/api/devices/[id]/live-status` | Top-rail polling (KVN serial, USDC, network, paused) |
| GET `/api/devices/[id]/agent-key` | Agent key prefix (display) |
| POST `/api/devices/[id]/agent-key` | Mint a fresh key (returns `rawKey` once) |
| POST `/api/devices/[id]/buy-atlas-signal` | Purchase Atlas's x402 feed |
| POST `/api/devices/[id]/playground-pay` | Old policy-playground endpoint (kept for /app/advanced direct links) |

### 6.4 Auth model summary

- **Bearer kv_live_…** — agent-level auth. The agent does the action.
  Used by SDK calls (`vault.pay`, `vault.checkAllowance`).
- **x-owner-wallet** — owner-level auth. The owner does the action.
  Used by per-vault management (set-kast, test-payout, events,
  pause, integration-progress).
- This is MVP auth. Mainnet replaces with signed-challenge.

---

## 7. The on-chain layer

### 7.1 Kyvern policy program

- **Program ID:** `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`
- **Cluster:** Solana devnet
- **Source:** `anchor/programs/kyvern-policy/src/lib.rs`
- **IDL copy in app:** `src/lib/kyvern-policy/idl.json`
- **Anchor client:** `src/lib/kyvern-policy/client.ts`

**Instructions:**
- `initialize_policy` — one-time per vault. Stores per-tx cap,
  memo requirement, velocity window, allowlist of SHA-256 merchant
  hashes
- `update_allowlist` — authority-only
- `pause` / `resume` — kill switch (authority-only)
- `execute_payment` — main hot path. Validates all 5 rules in order,
  then CPIs into Squads `spending_limit_use`. Fails atomically if
  any rule or the Squads check rejects.
- `swap_via_oracle` — Phase 1 feature for oracle-priced USDC→token
  swaps. Not used by the demo flows.

**Custom error codes:**
- `12000 VaultPaused`
- `12001 InvalidAmount`
- `12002 AmountExceedsPerTxMax`
- `12003 MerchantNotAllowlisted`
- `12004 MissingMemo`
- `12005 VelocityCapExceeded`
- `12006 MemoTooLong`
- (12007–12015 for swap-mode and admin errors)

### 7.2 Squads v4 integration

- Program: `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`
- Each vault is a Squads smart account with a spending limit delegated
  to the agent member
- Atlas's vault: multisig `7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP`,
  spending limit `12QEujvJNyA15Sjao4x1rYoxGRJMUrVceiArZj8NW4B7`
- The Kyvern policy program's `execute_payment` instruction CPIs into
  `spending_limit_use` after its own checks pass

### 7.3 Two-layer enforcement

```
Agent → vault.pay()
         │
         ▼
  Off-chain pre-check (server, ~1ms)
  · merchant allowlist · memo · velocity · pause · cap
         │
         ▼ (if pass)
  Build spendingLimitUse tx → submit to chain
         │
         ▼
  Squads v4 → CPI into Kyvern policy program
              · merchant SHA-256 allowlist
              · memo presence
              · velocity (rolling per-slot)
              · pause state
              · per-tx cap
         │
         ▼ (if pass)
  Squads enforces daily/weekly cap
         │
         ▼
  USDC moves on-chain
```

Failure at any layer reverts the whole tx. No middle state, no
off-chain trust. With `forceOnChain: true` (used by probe-scenarios)
the off-chain pre-check is bypassed and the policy program rejects
on-chain — producing a real failed Solana tx with the custom error
code in the trace.

---

## 8. Repository file map

```
src/
  app/
    page.tsx                                ← landing route + metadata
    unbox/page.tsx                          ← one-screen cinematic
    login/page.tsx                          ← Privy auth picker
    app/
      page.tsx                              ← /app — the device protagonist
      layout.tsx                            ← KyvernOS shell wrapper
      agents/[id]/page.tsx                  ← legacy worker detail (unlinked)
      inbox/page.tsx                        ← legacy findings (unlinked)
      settings/page.tsx                     ← legacy settings (unlinked)
      tasks/, payments/, vaults/, keys/     ← legacy subroutes (unlinked)
    atlas/page.tsx                          ← public observatory
    docs/page.tsx                           ← sticky-sidebar dev docs
    api/
      vault/
        pay/route.ts                        ← primary spending endpoint
        check-allowance/route.ts            ← non-mutating policy probe
        [id]/pause/route.ts                 ← kill switch
        [id]/set-kast-destination/route.ts  ← KAST setup + read
        [id]/test-payout/route.ts           ← real $0.001 payout to MY_KAST
        [id]/events/route.ts                ← live feed source
        [id]/integration-progress/route.ts  ← wizard state persistence
      atlas/
        status/route.ts                     ← live trust-bar data
        decisions/route.ts                  ← attack-wall data
        economy/route.ts                    ← 14-day rollup
        probe-scenarios/route.ts            ← 5 violations + 1 settle (vaultId support)
        probe-paysh/route.ts                ← pay.sh wrap (vaultId support)
      devices/
        [id]/live-status/route.ts           ← top-rail polling
        [id]/agent-key/route.ts             ← mint + reveal
    legacy/unbox/page.tsx                   ← pre-tightened cinematic, kept

  components/
    landing/
      os-landing.tsx                        ← premium 1262-line landing
      hero-device.tsx                       ← 3D device + orbital workers
      live-economy-demo.tsx                 ← /app preview slideshow
      attack-wall-preview.tsx               ← real failed-tx ticker
      landing-trust-bar.tsx                 ← live counter strip
      cursor-halo.tsx                       ← cursor-follow halo
      scroll-aware-nav.tsx                  ← transparent → solid navbar
    device/
      home/
        affordance-row.tsx                  ← chassis decoration tabs
      shell/
        canvas-zone.tsx                     ← legacy worker arc layout (kept)
        dev-tiles-canvas.tsx                ← static 4-tile fallback (?classic=1)
        alive-console.tsx                   ← protagonist canvas (wizard + feed)
        control-zone.tsx                    ← bottom rail + affordance row
        identity-strip.tsx                  ← top rail
        manifesto-strip.tsx                 ← thin manifesto bar
      wizard/
        integration-wizard.tsx              ← 5-step wizard (left col)
      feed/
        agent-event-feed.tsx                ← live event feed (right col)
      panels/
        device-panel.tsx                    ← shared shell for all panels
        watch-chain-panel.tsx               ← ?panel=bay
        paysh-panel.tsx                     ← ?panel=use
        kast-panel.tsx                      ← ?panel=kast
        builder-panel.tsx                   ← ?panel=builder
      state-strip.tsx                       ← onboarding hint banner
      first-finding-toast.tsx               ← one-time signal toast
    os/
      kyvern-os.tsx                         ← /app shell wrapper (StatusBar only — TabBar + Unboxing both retired)
      status-bar.tsx                        ← top status bar
      unboxing.tsx                          ← retired OS-level cinematic (no longer mounted)

  lib/
    kyvern-policy/
      client.ts                             ← Anchor client (initialize, executePayment, pause, resume)
      idl.json                              ← copy of the on-chain IDL
    policy-engine.ts                        ← off-chain policy evaluator
    server-pay.ts                           ← server-side vault.pay() helper
    squads-v4.ts                            ← Squads CPI helpers
    vault-store.ts                          ← SQLite vault model
    db.ts                                   ← schema + migrations (tryAlter pattern)

scripts/
  init-atlas-policy.ts                      ← one-shot: initialize Atlas's policy PDA
  atlas-runner.ts                           ← Atlas's PM2 cycle loop
  atlas-attacker.ts                         ← adversary loop

packages/
  sdk/
    src/
      index.ts                              ← Vault HTTP class + checkAllowance + pay
      onchain.ts                            ← OnChainVault (direct Anchor CPI)
      kast.ts                               ← KastDestination helper
  create-kyvern-agent/
    bin/cli.mjs                             ← scaffolder CLI
    templates/langchain/
      src/agent.ts                          ← demonstrates pay.sh + KAST + checkAllowance
      package.json                          ← references @kyvernlabs/sdk@^0.5.0

anchor/programs/kyvern-policy/              ← deployed program source

decks/
  frontier.md                               ← Frontier deck source
  frontier.pdf                              ← rendered (4 pages)
  kast-pakistan.md                          ← Kast Pakistan deck source
  kast-pakistan.pdf                         ← rendered (5 pages)

# Top-level docs
KYVERN_PRODUCT_STATE.md                     ← this file
KYVERN_RAW_REALITY.md                       ← pre-execution audit
KYVERN_ADVISOR_BRIEF.md                     ← advisor handoff brief
TRANSFORM_24H.md                            ← final-sprint plan
SPEC_TO_WIN.md                              ← original 48h spec
SUBMISSION_CHECKLIST.md                     ← paste-ready portal content
README.md                                   ← repo readme
CLAUDE.md                                   ← project conventions
```

---

## 9. SDK + scaffolder state

### `@kyvernlabs/sdk@0.5.0` (built locally, npm publish pending)

```ts
import { Vault, OnChainVault, KastDestination } from "@kyvernlabs/sdk";

// HTTP client
const vault = new Vault({ agentKey: process.env.KYVERN_AGENT_KEY! });
await vault.pay({ merchant, recipientPubkey, amount, memo });
await vault.checkAllowance({ merchant, amount });    // NEW in 0.5.0
await vault.status({ vaultId });
await vault.pause({ vaultId });

// KAST helper                                        // NEW in 0.5.0
const myKast = KastDestination.fromAddress(process.env.MY_KAST_ADDRESS!);
await vault.pay({ ...myKast, amount: 0.10, memo: "weekly share" });

// Direct Anchor CPI (for builders who want zero HTTP roundtrip)
const onChain = new OnChainVault({ cluster, connection, multisig, spendingLimit });
await onChain.pay({ agent, recipient, amount, merchant, memo });
```

### `create-kyvern-agent@0.2.0` (built locally, npm publish pending)

`npx create-kyvern-agent my-agent` scaffolds a project that:
1. Pins `@kyvernlabs/sdk@^0.5.0` and `dotenv`
2. `src/agent.ts` demonstrates the layered story:
   - `vault.checkAllowance({ merchant: "api.pay.sh", amount: 5 })` → over-cap rejected
   - `vault.checkAllowance({ amount: 0.001 })` → allowed → shells out to `pay --sandbox curl <demo url>` → real x402 response data
   - Optional KAST payout if `MY_KAST_ADDRESS` env is set
3. README walks through `brew install pay` (or `npm i -g @solana/pay`) prerequisite, install, env setup, run

---

## 10. Submission status

### Done
- Live MVP at https://kyvernlabs.com — every primary surface 200
- README rewritten for the alive-console flow
- Both pitch decks rendered to PDF (`decks/frontier.pdf`, `decks/kast-pakistan.pdf`)
- `SUBMISSION_CHECKLIST.md` with paste-ready content for both portals
- Atlas runner ticking, $0 lost
- All 5 PM2 processes online
- Backup branch `pre-spec-to-win-backup` preserved on origin

### User-led (still pending)
- **`npm publish`** SDK 0.5.0 + scaffolder 0.2.0 (~15 min, requires `npm login`)
- **Smoke pass** in fresh incognito (~30 min, 14 steps in `SUBMISSION_CHECKLIST.md` §1)
- **Record video** 2:00–2:30 (~1–2 hours, script in `TRANSFORM_24H.md`)
- **Submit Frontier portal** (~30 min, paste-ready content in `SUBMISSION_CHECKLIST.md` §4)
- **Submit Superteam Earn / Kast Pakistan** (~30 min, paste-ready content in `SUBMISSION_CHECKLIST.md` §5)
- **Final smoke** in incognito on a stranger's first 90 seconds (~15 min)

Total user-side time: ~3-4 hours.

---

## 11. The bet

A judge clicks `kyvernlabs.com`, sees the premium device hero, signs
in, watches a 2.3s cinematic, lands on `/app` — and within 30 seconds
of arriving at the wizard, has minted a key, copied a snippet, fired
a violation, and watched their own agent's first failed Solana tx
land in the feed with the Kyvern program's custom error code,
clickable to Explorer.

That single click-to-Explorer moment is the whole product earning
its category. Everything else on the surfaces is staging for it.

---

*This document is locked at 2026-05-09 ~17:00. If anything changes,
update both this file and `SUBMISSION_CHECKLIST.md`.*
