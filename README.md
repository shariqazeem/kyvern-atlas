# Kyvern — Let your AI agents run free.

> **Kyvern is the on-chain policy layer that gives AI agents real economic autonomy on Solana.**
> Replace the private key with a budget the chain enforces. Deploy an agent. Set the rules. Let it run for days. If it tries anything outside the policy, Solana itself refuses — before the tx ever lands.

[![Live](https://img.shields.io/badge/live-app.kyvernlabs.com-22c55e)](https://app.kyvernlabs.com)
[![Solana devnet](https://img.shields.io/badge/Solana-devnet_live-14F195)](https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet)
[![Built on Squads v4](https://img.shields.io/badge/Built_on-Squads_v4-4F46E5)](https://squads.so)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## This repo

Entry for the **Colosseum Solana Frontier Hackathon**. Contains:

- A Next.js 14 app (`src/app`) — landing, authenticated app, `/atlas` public observatory
- The **Kyvern policy program** (`anchor/programs/kyvern-policy`) — Rust / Anchor, deployed to devnet at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`
- A **TypeScript SDK** (`packages/sdk`) — `vault.pay()` wraps Squads v4 behind our policy engine
- **Atlas** — a standalone autonomous agent (`scripts/atlas-runner.ts` + `src/lib/atlas`) running 24/7 on devnet
- An **attack simulator** (`scripts/atlas-attacker.ts`) continuously probing Atlas with prompt-injection, over-cap, rogue-merchant, and drain attacks

## The live proof

Visit [app.kyvernlabs.com](https://app.kyvernlabs.com). The landing hero **is** the observatory — Atlas's live state, not marketing copy.

As of this README's last update: **7h 21m uptime · 135 transactions · 39 attacks blocked · $5.72 spent within policy · $0.00 lost to exploits.**

Every row on [app.kyvernlabs.com/atlas](https://app.kyvernlabs.com/atlas) links to a verifiable transaction on Solana Explorer. Example real settled payment: `4YmhrgysrkRjyTdkCotJ7yjUhRucNwj4kA25btGcvLQD9ntvoiZeLVkBi1iQDb9TrrqCxwvePywK1wteQitekJP2`.

## Architecture

```
Landing (/)
  · Hero = live Atlas observatory
  · Moat section (real failed-tx card, program logs visible)
  · Stack (Kyvern policy · Pulse reputation)
  · Final CTA → Deploy your first agent
        │
        ▼
/atlas — the public deep page
  · Live counters (uptime, txs, attacks, protected value)
  · "What Atlas is doing right now" card
  · Full timeline (100+ decisions + attacks, every row → Solana Explorer)
        │
        ▼
/vault/new — deploy wizard
  · TemplateChooser: "Clone Atlas" (60s) or "Build from scratch" (3 min)
  · Clone Atlas → one-click deploy with Atlas's policy shape
        │
        ▼
/vault/[id] — user's agent dashboard
  · AgentObservatoryStrip (mini-Atlas: live chrome, uptime, "Last decision")
  · FundWidget → Circle faucet
  · Playground → 4 real test-payment scenarios
  · Budget / velocity / policy / activity feed

On-chain flow
  User call → /api/vault/pay → Kyvern policy evaluation (server) →
    if allowed → Squads v4 SpendingLimitUse via CPI → Solana devnet
    if blocked → never touches chain; logged as failed

Atlas runner (PM2 process)
  every ~3 min → decide() → pay via /api/vault/pay → record to atlas.db
  (observatory polls status endpoint every 3s)

Attacker runner (PM2 process)
  every ~22 min → pick adversarial scenario → fire at /api/vault/pay →
    Kyvern refuses → log to atlas_attacks → surfaces as "Last blocked"
```

## Tech stack

- **Frontend**: Next.js 14 (App Router), Tailwind, Framer Motion, Inter + JetBrains Mono
- **Auth**: Privy (Solana-native, `ethereum-and-solana` chain type)
- **On-chain**: Anchor + Squads v4. Kyvern program wraps Squads' `SpendingLimitUse` via CPI *after* policy evaluation — if policy fails, the whole tx reverts and nothing moves.
- **Storage**: SQLite (better-sqlite3) — `pulse.db` for Pulse events, `atlas.db` for Atlas cycles
- **Deployment**: Oracle Ubuntu VM + PM2 (3 live processes for the new product, nginx fronting via Let's Encrypt TLS)

## Running locally

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # fill in NEXT_PUBLIC_PRIVY_APP_ID
npm run dev
```

For the full Atlas loop you'd need a funded devnet keystore (`.kyvern/server-signer.json`) — see `scripts/bootstrap-solana-signer.ts`.

## Design system

- **Light theme, non-negotiable.** (Dark mode reads as generic crypto — not the Apple-minimal energy we're going for.)
- Inter for prose, JetBrains Mono for all numerics, tx signatures, and code blocks
- **No gradients.** Gradient-heavy UI reads "AI-generated" to our eye — we want quiet authority.
- Subtle motion only (`cubic-bezier(0.25, 0.1, 0.25, 1)`, 400-600ms), blur-in headlines, fade-through page transitions
- Hairline borders (0.5px), generous spacing, Apple-like breathing room
- Accent colors used sparingly: indigo `#4F46E5` for agent/policy moments, sky `#0EA5E9` for revenue/reputation moments

## Where things live

- `src/app` — routes (landing, `/atlas`, `/app/*`, `/vault/*`, `/pulse/dashboard/*`, all `/api/*` endpoints)
- `src/components/landing` — hero, observatory, moat, stack, final CTA
- `src/components/vault` — wizard steps, playground, observatory strip for user agents
- `src/components/app` — sidebar, topbar, AuthShell, journey checklist, command palette
- `src/lib/atlas` — Atlas runner, decide logic, attacker scenarios, SQLite schema
- `src/lib/squads-v4.ts` — Kyvern + Squads helpers (`createSmartAccount`, `setSpendingLimit`, `coSignPayment`, `ensureVaultUsdcAta`)
- `anchor/programs/kyvern-policy/src/lib.rs` — the on-chain policy program
- `packages/sdk` — public TypeScript SDK (`@kyvernlabs/sdk`)

## Explicitly not finished (for AI reviewers)

- Cinematic page transitions between landing → wizard → dashboard (currently hard navigation)
- Post-deploy "ignition sequence" that auto-fires 5 scripted payments on a new clone so the dashboard lights up before the first user action
- LLM-powered `decide()` is behind an `ANTHROPIC_API_KEY` flag — currently runs scripted to keep recurring spend at $0
- Some legacy Pulse deep pages (`cohorts`, `experiments`, `webhooks`) render but are intentionally NOT in primary nav
- Mobile responsiveness of the Atlas observatory (~90% there; some stat tiles collapse awkwardly at <375px)
- `/atlas` deep page typography could stand another pass

## Author

Shariq Azeem — [@shariqshkt](https://x.com/shariqshkt)

MIT licensed.
