# KyvernOS — Complete Build Summary (as of April 25, 2026)

This document describes everything that exists in the KyvernOS product right now. Use it to understand the full scope before suggesting changes, additions, or strategies.

---

## What KyvernOS Is

KyvernOS is an "iOS for autonomous money on Solana." Users deploy a **Device** (a Squads v4 multisig vault with an on-chain Kyvern policy program), then install **Abilities** from an **Ability Store** — self-contained capabilities that earn, protect, or monitor — all without writing code.

**The product claim:** A non-coder can own, operate, and profit from an autonomous agent device on Solana in 60 seconds.

**Hackathon:** Colosseum Frontier (Solana's largest hackathon, 1,500+ submissions, $200K+ prizes, $250K pre-seed for winners). Deadline: May 11, 2026.

---

## Architecture: Three Layers

### Layer 1: The Device
An identity with a name, serial number (KVN-XXXX), birthday, and a Squads v4 vault on Solana devnet. The vault holds USDC. The identity holds everything else — installed abilities, event logs, stats, public registry page. Users currently have one device.

### Layer 2: The Policy
A custom Anchor program (`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`) deployed on Solana devnet. Sits between the vault and the outside world. Every outgoing transaction hits the policy first. Enforces: budgets (daily/weekly/per-tx), merchant allowlists, velocity caps (calls per window), memo requirements, and a kill switch. All on-chain — if the policy rejects, the tx reverts with an AnchorError visible on Solana Explorer.

### Layer 3: Abilities
Self-contained capabilities installed with one tap. Each ability can: read data, spend through the vault (filtered by policy), earn via x402 endpoints, and write to the device log. The Ability Store is how users discover them.

---

## What's Live & Running

### Atlas — Device #0000
An autonomous AI agent that has been running continuously on Solana devnet since **April 20, 2026**. As of now:
- **2,200+ cycles** (decisions made every ~3 minutes)
- **400+ settled transactions** (real USDC transfers on Solana)
- **700+ attacks blocked** (real policy rejections)
- **$17+ safely spent**, **$7+ earned**, **$0 lost**
- Every decision uses Claude API for reasoning
- Every payment goes through the real vault.pay → Squads v4 → Solana path
- Every attack is a real policy evaluation
- All data in a separate `atlas.db` SQLite database

Atlas runs as a PM2 process (`atlas`) alongside an `atlas-attacker` process that fires adversarial probes (prompt injection, over-cap, rogue merchant, missing memo) every few minutes.

### The Web App (Next.js 14)
Deployed at both **kyvernlabs.com** and **app.kyvernlabs.com** (same app). Served by PM2 process `kyvern-commerce` on port 3001 behind nginx with SSL.

### VM Setup
- **Server:** ubuntu@80.225.209.190
- **PM2 processes:** kyvern-commerce (web, port 3001), atlas (runner), atlas-attacker (adversary). Old Stellar process stopped.
- **Databases:** `pulse.db` (vaults, payments, device_log, endpoints) + `atlas.db` (Atlas-specific decisions, attacks, state)
- **Env vars:** KYVERNLABS_AGENT_KEY, ATLAS_VAULT_ID, KYVERN_BASE_URL, NEXT_PUBLIC_PRIVY_APP_ID, etc.

---

## Pages & Routes

### Public Pages
| Route | What |
|---|---|
| `/` | Landing page — white, Apple-grade. Hero with headline + dark matte KyvernDevice showing live Atlas data. How It Works (3 steps), SDK code block, Why Solana stats, CTA. Dynamic Atlas stats from SSR. |
| `/atlas` | Public Atlas observatory — full timeline of decisions + attacks, counters, "Attack Atlas" button, leaderboard. |
| `/docs` | Developer SDK documentation — install, quickstart, vault.pay(), errors, REST API. |

### Authenticated Pages (KyvernOS shell with bottom tab bar)
| Route | What |
|---|---|
| `/app` | **Device Home Screen** — network pulse strip (live uptime + cycle count), device identity card (name, serial, emoji, PnL: earned/spent/net/blocked), ability icon grid (3-column, iOS-style), device log feed, Atlas network activity feed. |
| `/app/store` | **Ability Store** — 3 abilities in a filterable grid (All/Earn/Protect/Monitor). Each card shows emoji, name, description, category badge, install status. |
| `/app/store/[id]` | **Ability Detail + Install** — full description, on-chain proof badge, dynamic config fields (slider, toggle, text), install button. On install: registers server-side, writes to device_log, redirects to home. |
| `/app/ability/[id]` | **Installed Ability Management** — status, pause/resume, uninstall, config editing, per-ability activity feed. Atlas Intelligence shows real Atlas decision feed. |
| `/app/payments` | **Activity Tab** — economy stats strip (devices, earned, blocked, volume), toggle between "My Device" (device_log) and "Global" (firehose merging all device events + Atlas decisions + Atlas attacks). Polls every 6s. |
| `/app/settings` | Settings page (API keys, account). |
| `/app/devices` | **Public Device Registry** — Atlas (KVN-0000) always first with live stats, then all user devices. |
| `/vault/new` | **Deploy Wizard** — 5-step cinematic flow: name → budgets → policies → review/deploy → success. "Clone Atlas" fast path. Success screen shows funding section with vault address + faucet links. |
| `/vault/[id]` | **Device Detail** — budget card with progress bar, action buttons (Pause/Resume, Fund, Policy), payment activity feed, integration info (vault ID, Squads address, SDK snippet). Fund button shows vault address + faucet links. |

### KyvernOS Shell
- **Status bar** at top: network pill (Solana devnet), live green dot, greeting
- **Bottom tab bar** (iOS-style, frosted glass): Home, Store, Activity, Settings
- **Cinematic unboxing** on first login: box drops with spring physics → lid tilts open (3D) → device floats out → screen shows ability icons + PnL → camera zooms INTO screen → you're inside the OS. Skip button available. localStorage flag so it plays once.

---

## The 3 Abilities

### 1. Paywall Any URL (Category: Earn)
**What it does:** User pastes any API URL, sets a price ($0.001–$1.00). Kyvern creates an x402 proxy endpoint at `/api/paywall/[slug]`. When anyone hits the proxy without payment, they get HTTP 402 with payment requirements. When paid, the request is forwarded to the real URL and the payment is logged.

**Server-side on install:**
- `POST /api/endpoints/register` — creates endpoint in `user_endpoints` table with a slug
- Triggers the Atlas Greeter immediately
- Atlas Greeter calls real `POST /api/vault/pay` using Atlas's agent key with `merchant: "kyvern-devices"` to pay the user's vault
- Writes `earning_received` to `device_log` with the real signature (or fallback if payment fails)

**Config:** URL input, price slider (log scale)

### 2. Public Drain Bounty (Category: Protect)
**What it does:** Publishes the device's policy publicly. Challenges anyone to drain it. Fires a welcome attack immediately on enable (counter goes 0→1 within 5 seconds), then schedules 2 follow-up probes at 8s and 20s.

**Server-side on install:**
- `POST /api/vault/[id]/bounty` — adds to `bounty_vaults` table
- Fires 3 deterministic attacks logged as `attack_blocked` in `device_log`
- Each attack has a type (rogue_merchant, over_cap, prompt_injection) and a signature

**Config:** Toggle public/private

### 3. Atlas Intelligence (Category: Earn — spends to receive)
**What it does:** User's device pays Atlas $0.001 per update to receive its live decision feed. Proves the spending side of the economy.

**Server-side on install:**
- `POST /api/devices/[id]/subscribe` — calls `serverVaultPay()` which uses the user's agent key from the DB to execute a real vault.pay() through Squads
- Writes `spending_sent` to `device_log`
- Ability detail page shows Atlas's real decision feed from `/api/atlas/decisions`

**Config:** Auto-refresh toggle

---

## Backend Infrastructure

### API Routes
| Route | Method | What |
|---|---|---|
| `/api/vault/create` | POST | Creates Squads v4 multisig + policy + agent key |
| `/api/vault/pay` | POST | The hot path: agent key auth → policy check → Squads co-sign → Solana tx |
| `/api/vault/[id]` | GET | Vault state + budget snapshot + payments |
| `/api/vault/[id]/pause` | POST/DELETE | Kill switch (pause/resume) |
| `/api/vault/[id]/bounty` | POST/GET | Enable bounty + fire welcome attack / check status |
| `/api/vault/list` | GET | List all vaults for an owner |
| `/api/atlas/status` | GET | Live Atlas state (cycles, spent, earned, blocked, uptime) |
| `/api/atlas/decisions` | GET | Recent decisions + attacks feed |
| `/api/atlas/probe` | POST | Public attack — fire a probe against Atlas |
| `/api/atlas/leaderboard` | GET | Top attackers |
| `/api/endpoints/register` | POST | Register x402 proxy endpoint (Paywall ability) |
| `/api/endpoints/list` | GET | List all active endpoints |
| `/api/paywall/[slug]` | GET | x402 proxy: 402 without payment, forward with payment |
| `/api/greeter` | POST | Atlas Greeter: pays ungreeted Paywall endpoints |
| `/api/devices/[id]/log` | GET | Device's unified event log + PnL + attack count |
| `/api/devices/[id]/install` | POST | Log ability install to device_log + public mirror |
| `/api/devices/[id]/subscribe` | POST | Atlas Intelligence payment via serverVaultPay() |
| `/api/log/global` | GET | Global firehose: all events across all devices + Atlas |
| `/api/health` | GET | Process health: web/atlas/attacker status, economy stats |
| `/api/x402/*` | Various | x402 protocol endpoints (price, oracle, demos) |

### Database Tables (pulse.db)
- `vaults` — device identity, budgets, policies, Squads addresses, kill switch
- `vault_payments` — every payment attempt (allowed/blocked/settled/failed) with signatures
- `vault_agent_keys` — agent credentials with Solana keypairs (server-side)
- `user_endpoints` — Paywall x402 proxy endpoints with slugs, prices, greeter status
- `bounty_vaults` — devices with Drain Bounty enabled + attack counts
- `device_log` — **unified event feed** for all devices (ability_installed, earning_received, spending_sent, attack_blocked, etc.) with signatures, amounts, counterparties
- `device_abilities_public` — mirror of installed abilities for public registry display
- Plus: accounts, sessions, api_keys, webhooks, alerts, subscriptions, etc.

### Database Tables (atlas.db — separate)
- `atlas_state` — singleton with uptime, totals (cycles, spent, earned, blocked, lost)
- `atlas_decisions` — every decision with reasoning, action, merchant, amount, outcome, signature
- `atlas_attacks` — every attack with type, description, blocked_reason, signature
- `atlas_cycles` — cycle timing

### Core Libraries
- `src/lib/vault-store.ts` — CRUD for vaults, payments, agent keys, spend snapshots, PnL, device log, endpoints
- `src/lib/policy-engine.ts` — pure function `evaluatePayment()`: kill switch → amount → merchant → per-tx → daily → weekly → velocity → memo
- `src/lib/squads-v4.ts` — Squads Protocol v4 adapter: create vault, set spending limit, co-sign payment, ensure recipient ATA
- `src/lib/server-pay.ts` — `serverVaultPay()`: executes vault.pay using stored agent credentials from DB (same Squads path, no HTTP)
- `src/lib/atlas/runner.ts` — Atlas decision loop (every ~3min: decide → pay → log)
- `src/lib/atlas/attacker.ts` — adversarial probe loop
- `src/lib/atlas/decide.ts` — Claude API reasoning or scripted fallback
- `src/lib/atlas/db.ts` — Atlas-specific SQLite operations

### Design System
- **Theme:** White (#FAFAFA background, #FFFFFF cards)
- **Typography:** Inter (text), JetBrains Mono (numbers/signatures)
- **Colors:** #0A0A0A (primary ink), #00A86B (success/earned), #D92D20 (danger/blocked), #0052FF (accent)
- **Radii:** 8px (chips), 12px (buttons), 20px (cards), 28px (hero cards), 16px (icons)
- **Primitives built:** StatBlock (number > label, 3 sizes), SignaturePill (mono truncated, click → Explorer), LogEntry (full activity row)
- **Motion:** Framer Motion, spring physics, staggered entrances

### SDK
`@kyvernlabs/sdk` published on npm (v0.4.0):
- `Vault` class: `.pay()`, `.status()`, `.pause()`, `.resume()`
- `OnChainVault` class: direct Solana interaction via Anchor
- Adapters for LangChain, ElizaOS
- Zero runtime dependencies

### On-Chain Program
Anchor program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on Solana devnet:
- `initialize_policy` — create policy PDA for a Squads multisig
- `update_allowlist` — replace merchant allowlist
- `pause` / `resume` — kill switch
- `execute_payment` — validates all policy rules, CPIs into Squads v4 for settlement
- 12 error codes for each block reason

---

## What's Real vs What's Still Wired Through Logs

### Real (on-chain, Squads, Solana):
- Atlas's own payments (vault.pay → Squads → devnet tx → real signatures)
- Atlas's own attacks (policy rejections with AnchorErrors)
- Vault creation (real Squads multisig + spending limit on devnet)
- Agent key delegation (real Solana keypairs)
- The greeter's payment to Paywall endpoints (calls real vault.pay with Atlas's key)
- Intelligence subscription payment (calls serverVaultPay with user's stored credentials)

### Logged but not yet producing Explorer-verifiable signatures:
- Bounty welcome attacks (deterministic log entries, not raw Solana txs yet)
- Greeter payments when Atlas vault has insufficient USDC (logs the attempt)
- Intelligence payments when user vault has insufficient USDC (logs the attempt)

### What makes signatures real:
Vaults need to be funded with devnet USDC. The deploy success screen and device detail page now show the vault address with copy button + links to SOL faucet and Circle USDC faucet.

---

## The User Journey (60-second flow)

1. Land on kyvernlabs.com → see hero + dark device with live Atlas data
2. Click "Get started" → sign in with Privy (email/Google/wallet)
3. First visit: cinematic unboxing (box drop → device float → zoom into screen)
4. Land on device home → "Create your device" if no vault
5. Deploy wizard → name, budgets, policies → deploy on Solana → success with funding info
6. Home shows device card + empty ability grid → "Open Store" CTA
7. Ability Store → install Paywall → configure URL + price → install
8. Greeter pays within seconds → "earning_received" appears in device log
9. Install Bounty → counter starts climbing (attack_blocked events)
10. Install Intelligence → payment to Atlas logged
11. Activity tab → Global view shows all devices + Atlas events flowing
12. Device registry → see Atlas + your device listed

---

## Tech Stack
- **Frontend:** Next.js 14, React, Tailwind CSS, Framer Motion
- **Auth:** Privy (email/Google/wallet with embedded Solana wallets)
- **Database:** SQLite (better-sqlite3) with WAL mode — pulse.db + atlas.db
- **On-chain:** Solana devnet, Squads Protocol v4, custom Anchor program
- **SDK:** @kyvernlabs/sdk on npm, @solana/web3.js, @coral-xyz/anchor
- **AI:** Claude API (Atlas reasoning), scripted fallback
- **Deployment:** Ubuntu VM, PM2, nginx, Let's Encrypt SSL
- **State management:** Zustand + localStorage (ability install state)

---

## Repo Structure
```
kyvern-atlas/
  src/
    app/                    # Next.js App Router pages
      app/                  # Authenticated KyvernOS pages
        page.tsx            # Device home screen
        store/              # Ability Store
        ability/            # Installed ability management
        payments/           # Activity tab
        devices/            # Public device registry
        settings/           # Settings
      vault/                # Vault creation + detail
      atlas/                # Public Atlas observatory
      docs/                 # SDK documentation
      api/                  # All API routes
    components/
      os/                   # KyvernOS shell (tab bar, status bar, unboxing)
      device/               # Device components (ability icons, grid, PnL)
      store/                # Store components (cards, config fields, tabs)
      primitives/           # Design system (StatBlock, SignaturePill, LogEntry)
      landing/              # Landing page components
      vault/                # Vault wizard components
      atlas/                # Atlas observatory components
    lib/
      vault-store.ts        # Core data operations
      policy-engine.ts      # Payment policy evaluation
      squads-v4.ts          # Squads Protocol adapter
      server-pay.ts         # Server-side vault payments
      db.ts                 # SQLite schema + migrations
      abilities/            # Ability types + registry
      atlas/                # Atlas runner, attacker, DB, schema
    hooks/
      use-device-store.ts   # Zustand + localStorage for abilities
      use-auth.ts           # Privy auth hook
  anchor/                   # Anchor program source (Rust)
  packages/sdk/             # @kyvernlabs/sdk source
  scripts/                  # Atlas runner + attacker entry points
  patches/                  # @sqds/multisig patch for web3.js compat
```

---

## What's Next (Remaining Work)

1. **UI polish to design spec** — numbers always > labels, spacing scale (powers of 4), motion language (3 patterns), apply primitives everywhere
2. **Economy stats on landing page** — live ticker showing total devices, earned, blocked, volume
3. **Landing page activity ticker** — scrolling global firehose on the landing page
4. **Public device profiles with real log data** — each device has a shareable page
5. **Fork mechanism** — "Fork this device" deploys a new device with same abilities
6. **Mainnet Atlas Prime** — $5 real USDC on mainnet for credibility
7. **Pitch video** — 3-minute Loom
8. **Submission package** — GitHub, videos, description
