# Kyvern · Frontier Final Sprint Spec

> *A Solana device for your AI agent. The chain decides every dollar it spends.*

This is the master spec for the final sprint into Colosseum Frontier submission. Everything in this document is designed for one outcome: **win grand champion + accelerator by positioning Kyvern as category-defining infrastructure, not a consumer-app demo.**

The spec covers seven phases, executable in ~9 hours total. Read Phase 0 first — it's the framing every other decision flows from.

---

## Phase 0 · The Positioning Pivot (read first, internalize)

The single most important change in this sprint isn't code. It's how every surface, every line of copy, every piece of framing describes the product.

**Old framing (kill this):**
> *"Kyvern is three AI workers — Bounty Scout, Position Watchtower, Conditional Trigger — that find bounties, watch whales, and trade dips for you."*

A judge or user looking at this thinks: *"Are any of these better than what already exists? Why not just use Jupiter limit orders or a Telegram alert bot?"* And honestly, today, the workers don't beat those alternatives. They're templates running on placeholder context.

**New framing (lock this everywhere):**
> *"Kyvern is the first chain-enforced commerce device for AI agents on Solana. Atlas, our reference deployment, has been autonomous for 17 days — 8,355 cycles, 3,171 blocked attacks, zero funds lost, real USDC earned from real subscribers. The three pre-installed workers are starter templates. The real product is the device — and the SDK that lets builders ship workers that fit their own life."*

A judge looking at this thinks: *"Oh — this is infrastructure. The workers are examples. The moat is the on-chain constraint system itself. Atlas proves it works."*

The pivot turns every weakness into a strength:
- *"The workers feel generic"* → **"They're templates. The device is the product."**
- *"Atlas hasn't surfaced findings"* → **"Atlas is proof of liveness, not a content factory. 17 days, $0 lost, real subscribers paying."**
- *"Why would I use this over Jupiter?"* → **"You wouldn't. You'd build on it. Stripe didn't compete with PayPal — it gave developers an API."**

This pivot must show up in: the landing hero, the /app whisper line, the /atlas page, the README, the demo voiceover, the tweet thread, the Frontier form, the KAST form. **Consistency is the win.** A judge clicking through five surfaces and hearing the same crisp positioning every time is the difference between "memorable submission" and "another agent project."

The phases below execute the pivot.

---

## Phase A · Surgical UI Fixes (~1.5h)

Five fast, high-leverage fixes that clean up leaky terminology and make existing surfaces consistent with the new framing.

### A.1 · Leaky abilities lists on worker pages

**Problem.** Wren's abilities list shows *"Drafts tasks · Delivers tasks"* — those are Sentinel's jobs. Pulse shows *"Validates tasks · Delivers tasks"* — also wrong. These are leftovers from the retired intra-device economy. Each worker should show only abilities relevant to its actual job.

**Fix.** Replace the abilities source for each worker template:

```typescript
// src/lib/workers/abilities.ts
export const WORKER_ABILITIES: Record<WorkerTemplate, string[]> = {
  bounty_hunter: [
    'Scans Solana ecosystem feeds',
    'Reads bounty payouts and skill matches',
    'Drafts applications via Pay.sh / Gemini',
    'Submits on your one-tap approval',
    'Messages you when something fits',
  ],
  whale_tracker: [
    'Watches user-defined wallets on-chain',
    'Reads swap and transfer history',
    'Scores moves as material via Pay.sh / Gemini',
    'Pings you only on threshold breach',
  ],
  token_pulse: [
    'Reads live DEX prices',
    'Validates breach conditions via Pay.sh / Gemini',
    'Fires chain-enforced swaps via swap_via_oracle',
    'Messages you on every fired and blocked spend',
  ],
};
```

The worker page renders this list inline under the hero. No more *"Drafts tasks"* on Wren.

**Acceptance:** Each worker page shows only template-correct abilities. Sentinel ≠ Wren ≠ Pulse abilities.

### A.2 · Live ticker on /app — kill the old kinds

**Problem.** The /app live ticker still shows *"Pulse blocked earning $0.15"* and *"Sentinel drafted $0.15"*. Drafted *what*? Earning *what*? These are stale signal kinds.

**Fix.** Reframe each ticker row by signal kind, matching the inbox copy language:

```typescript
// src/components/device/live-ticker.tsx
function tickerLine(signal: Signal): string {
  switch (signal.kind) {
    case 'trigger_fired':
      return `Pulse · bought ${signal.payload.target_token} at $${signal.payload.oracle_price} · spent $${signal.payload.amount_in_usdc}`;
    case 'trigger_blocked':
      return `Pulse · trigger blocked · ${signal.payload.reason || 'chain refused the spend'}`;
    case 'trigger_armed':
      return `Pulse · ${signal.payload.target_token} approaching threshold`;
    case 'drafted_application':
      return `Sentinel · drafted application — ${signal.payload.bounty_title || 'bounty match'}`;
    case 'wallet_alert':
      return `Wren · ${signal.payload.wallet_label} made a material move`;
    default:
      return null; // Don't show non-user-facing signals
  }
}
```

Filter to the same `USER_FACING_KINDS` you used for the inbox separation. Internal observations don't belong in the ticker.

**Acceptance:** /app live ticker reads in plain user-facing language only. No "drafted $0.15", no "blocked earning."

### A.3 · Wren live state hero

**Problem.** Wren's live state hero shows *"Completed validation. Earned $0.100 from treasury (xxkuHDqx27...)."* That's the old synthetic earnings pattern. Wren doesn't earn from a treasury — Wren watches wallets.

**Fix.** Replace Wren's live state writer in its runner. The live state should reflect what Wren just did:

```typescript
// src/runners/wren-runner.ts
async function emitWrenLiveState(agent: Agent, result: WrenCheckResult) {
  const watchedCount = agent.config_json.watchlist.length;

  let liveState: string;
  if (result.materialMoves.length > 0) {
    const move = result.materialMoves[0];
    liveState = `${move.wallet_label} just ${move.direction} $${formatUsd(move.amount_usd)} of ${move.token}`;
  } else {
    liveState = `Watching ${watchedCount} wallets · nothing material in last ${result.window}`;
  }

  await updateAgentLiveState(agent.id, liveState);
}
```

If Wren has emitted no real wallet alerts (which is true — it's running on placeholder whales), the page reads honestly: *"Watching 3 wallets · nothing material in last 4m."*

**Acceptance:** Wren's live state never says "earned from treasury." It either reports a material move or honest "nothing yet."

### A.4 · Pulse activity row backfill

**Problem.** Pulse's activity row still shows *"5h ago used read dex $0.100"* — the fix from the prior round didn't backfill historical entries. The toolId-based renderer only catches new fires.

**Fix.** Two options, take the simpler:

*Option 1 (preferred):* Backfill historical entries. One-time SQL/script run that updates rows where `kind='trigger_fired'` and `tool_id='read_dex'` to set `tool_id='pulse_trigger_fire'`.

```typescript
// scripts/backfill-pulse-activity.ts
const rows = await db.query(`
  SELECT id, payload FROM agent_actions
  WHERE agent_template = 'token_pulse'
    AND tool_id = 'read_dex'
    AND payload->>'kind' = 'trigger_fired'
`);
for (const row of rows) {
  await db.query(
    `UPDATE agent_actions SET tool_id = 'pulse_trigger_fire' WHERE id = $1`,
    [row.id]
  );
}
```

*Option 2:* Add a fallback in the renderer — if a row has `payload.kind === 'trigger_fired'` regardless of tool_id, render with the new template.

**Acceptance:** Every Pulse trigger fire (historical or new) renders as *"bought {TOKEN} at ${PRICE} · spent ${AMOUNT} · on-chain ✓"*.

### A.5 · /app whisper line — match the new positioning

**Problem.** Current whisper lines still read worker-centric. They should reinforce the device-as-infrastructure framing.

**Fix.** Update the state-aware whisper map:

```typescript
const WHISPER_BY_STATE = {
  empty: 'Your device is online. Fund the vault to power your workers.',
  funded_default: 'Three starter workers loaded. Personalize each — or build your own.',
  partial: 'Some workers are tuned. Builders can ship more from the SDK.',
  active: 'Three workers. One vault. The chain decides every wire.',
};
```

The "or build your own" / "Builders can ship more" language seeds the platform framing in the user's eye.

**Acceptance:** Whisper reads device-and-platform, not just three-workers.

---

## Phase B · Worker Page Apple-Design Overhaul (~3h)

This is the biggest UX win in the sprint. Current worker pages have 3-column density, mixed-weight cards, and confusing hierarchy. Replace with **single-column, vertically-flowing, Apple-Settings-style layout** with generous spacing and a clear primary action.

### B.1 · Design principles

- **One column, max-width 720px on desktop, padding-generous.** Same column on mobile, no breakpoints to fight.
- **Hero is the worker, not a card.** Big icon, role title, one-sentence purpose, status pill. No card chrome around it.
- **Configure is the unambiguous primary action.** Sticky save button. Clean field rows, no dropdowns competing.
- **"How it works" replaces the abilities list visually.** Plain bullet list explaining mechanics. Includes cost + chain enforcement line.
- **Talk + Activity at the bottom.** Both collapsible. Activity shows last 10 actions, all friendly-labeled.
- **No more left-right tension.** No 3-column grid. No two cards fighting for primary attention.
- **Type hierarchy carries the weight.** Display 1 for role, body for description, label-small caps for section headers, mono for addresses/values.

### B.2 · The new layout (ASCII)

```
┌────────────────────────────────────────────────────────────────┐
│  ← Device · Pulse                          Up 1d 6h · 632 ⏸ ✕  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│       📈                                                       │
│       Conditional Trigger                                      │
│       Set a price condition. I fire your pre-approved          │
│       spend when it crosses — and the chain checks every       │
│       dollar.                                                  │
│                                                                │
│       ●  Watching SOL · last check 2m ago · Alive              │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   LIVE STATE                                                   │
│   ─────                                                        │
│                                                                │
│   Spotted SOL hit $88.12 — payout blocked by daily cap         │
│   5fxfKSAm…MK7RvT ↗                                            │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   TRIGGERS              1 armed · max 10                       │
│   ─────                                                        │
│                                                                │
│   ┌──────────────────────────────────────────────────────┐    │
│   │  When  [SOL ▾]  goes  [below ▾]  [88.12  ] USD       │    │
│   │                                                       │    │
│   │  Spend [0.10] USDC  →  swap into  [SOL ▾]            │    │
│   │                                          CHAIN-ENF.   │    │
│   │                                                       │    │
│   │  Note (optional)                                      │    │
│   │  ┌─────────────────────────────────────────────┐     │    │
│   │  │ test conditional spend on SOL breach        │     │    │
│   │  └─────────────────────────────────────────────┘     │    │
│   │                                              [🗑]    │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                                │
│   + Add trigger                                                │
│                                                                │
│   Cadence · check every  [ 1m ]  [ 5m ]  [15m ]                │
│                                                                │
│                                                    [✓ Save]   │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   HOW PULSE WORKS                                              │
│   ─────                                                        │
│                                                                │
│   • Reads live DEX prices via Coingecko + DexScreener          │
│   • Calls Pay.sh / Gemini to validate the breach reasoning     │
│   • Fires swap_via_oracle on your Anchor program when crossed  │
│   • Pyth oracle prices the swap, treasury PDA settles it       │
│   • Squads multisig cosigns every spend                        │
│                                                                │
│   Chain caps the spend at $0.10 per fire, $5/day total.        │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   Talk to Pulse                                       [⌃]      │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   RECENT ACTIVITY                                              │
│   ─────                                                        │
│                                                                │
│   5h ago · bought SOL at $88.06 · spent $0.10 · on-chain ✓    │
│           5fxfKSAm…MK7RvT ↗                                    │
│                                                                │
│   1d ago · trigger blocked · daily cap full                    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### B.3 · Component breakdown

**Hero block (no card, full bleed):**
```tsx
<section className="px-6 pt-12 pb-10 max-w-[720px] mx-auto">
  <div className="flex flex-col gap-4">
    <div className="text-5xl">{worker.icon}</div>
    <h1 className="text-3xl font-semibold tracking-tight">{worker.role}</h1>
    <p className="text-base text-zinc-600 leading-relaxed max-w-[600px]">
      {worker.purpose}
    </p>
    <StatusPill state={worker.liveState} />
  </div>
</section>
```

**Section divider:** thin `border-t border-zinc-200` with `mt-12 mb-10` spacing. No card.

**Section heading:** `<h2 className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500 mb-1">SECTION NAME</h2>` followed by `<div className="h-px bg-zinc-200 w-12 mb-6"></div>` (the small horizontal rule under the label, very Apple Settings).

**Configure block:** uses the existing field components (TriggerRow, WatchlistEditor, SkillsField) but rendered inside this clean container. Save button is sticky at the bottom-right of the configure section, NOT floating across the whole page.

**How-it-works block:** plain bulleted list, no icons, no card. `<ul className="space-y-2 text-sm text-zinc-700">` with bullet character (`·`) prefix in muted color.

**Activity block:** rows are flex containers with timestamp left, action description, link badge right. No card around individual rows — just a list.

### B.4 · Per-worker variations

The structure is identical across all three. Only the hero icon, role title, purpose copy, configure block, and how-it-works copy change per template. This means **one shared layout component**, three sets of content.

```typescript
// src/lib/workers/page-content.ts
export const WORKER_PAGE_CONTENT: Record<WorkerTemplate, WorkerPageContent> = {
  bounty_hunter: {
    icon: '🎯',
    role: 'Bounty Scout',
    purpose: 'I find paid Solana bounties matching your skills, draft your application with Pay.sh / Gemini, and queue it for one-tap submit.',
    configureComponent: SkillsConfigureBlock,
    howItWorks: [
      'Scans Solana ecosystem feeds (Superteam, Solana Foundation, Colosseum bounties)',
      'Reads payout amounts and skill requirements',
      'Calls Pay.sh / Gemini to draft your application in your voice',
      'Holds the draft in your inbox until you tap Submit',
      'Sends via email + on-chain memo, both visible on Explorer',
    ],
    chainNote: 'Chain caps the post + submit cost at $0.15 per draft, $5/day.',
  },
  whale_tracker: {
    icon: '🐋',
    role: 'Position Watchtower',
    purpose: 'Pick wallets or contracts to watch. I ping you when something material moves. Chain caps how often I check.',
    configureComponent: WatchlistConfigureBlock,
    howItWorks: [
      'Polls each watched wallet on-chain at your cadence',
      'Reads swap, transfer, and stake history',
      'Calls Pay.sh / Gemini to score whether the move is material',
      'Pings you only on threshold breach',
      'Material alerts can mirror into a Pulse trigger with one tap',
    ],
    chainNote: 'Chain caps the read + score cost at $0.10 per check, $5/day.',
  },
  token_pulse: {
    icon: '📈',
    role: 'Conditional Trigger',
    purpose: 'Set a price condition. I fire your pre-approved spend when it crosses — and the chain checks every dollar.',
    configureComponent: TriggersConfigureBlock,
    howItWorks: [
      'Reads live DEX prices via Coingecko + DexScreener fallback',
      'Calls Pay.sh / Gemini to validate the breach reasoning',
      'Fires swap_via_oracle on your Anchor program when crossed',
      'Pyth oracle prices the swap, treasury PDA settles it',
      'Squads multisig cosigns every spend',
    ],
    chainNote: 'Chain caps the spend at $0.10 per fire, $5/day total.',
  },
};
```

### B.5 · Spacing system (be specific — this is what makes it feel Apple)

- Page max-width: `720px`
- Page horizontal padding: `24px` mobile, `32px` desktop
- Hero top padding: `48px`
- Section dividers: `1px solid #E5E5E5` (or your border-zinc-200)
- Spacing between sections: `48px` (`mt-12`)
- Spacing between section header and content: `24px` (`mb-6`)
- Field rows: `16px` vertical padding
- Sticky save button: bottom-right of configure section, not page

### B.6 · Acceptance criteria

- [ ] All three worker pages use the new single-column layout
- [ ] No more 3-column or 2-column grid
- [ ] Hero is full-bleed, no card chrome
- [ ] Configure is the visually dominant section
- [ ] How-it-works section explains mechanics in plain language
- [ ] Talk + Activity collapsed by default
- [ ] All three workers feel structurally identical, only content varies
- [ ] Mobile and desktop use the same single-column layout (no breakpoint surprises)
- [ ] Generous whitespace — page doesn't feel cluttered
- [ ] Test on a real iPhone — does it feel native?

---

## Phase C · /atlas Reframe — Economic Ledger (~1h)

Atlas's value isn't content output. It's 17 days of unbroken on-chain economic activity. Replace the misleading "Atlas Findings · 0 surfaced this week" section with the real story: **the receipts**.

### C.1 · Remove the empty Findings section

Delete or hide the `Atlas Findings` block entirely. It's a self-inflicted wound — the page literally markets Atlas as proof of liveness, then says "0 surfaced this week" right next to "17 days alive." Kill it.

### C.2 · Add Atlas's Economic Ledger section

In the same spot, render a new section:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ATLAS · ECONOMIC LEDGER                                       │
│  ─────                                                         │
│                                                                │
│  Atlas earns real USDC from real subscribers paying its       │
│  x402 feed. Every payment is on Solana devnet, every cycle    │
│  enforced by the budget program.                               │
│                                                                │
│  ┌────────────────────────────────┬────────────────────────┐  │
│  │  TOTAL EARNED                  │  ACTIVE SUBSCRIBERS    │  │
│  │  $22.90                        │  1                     │  │
│  │  17 days · devnet              │  paying every cycle    │  │
│  └────────────────────────────────┴────────────────────────┘  │
│                                                                │
│  Recent payments                                               │
│                                                                │
│  ✓ 04:22:08 · $0.05 from atlas-sub-1   8eFx…3Q2v ↗             │
│  ✓ 03:22:04 · $0.05 from atlas-sub-1   K9aL…7Tb1 ↗             │
│  ✓ 02:22:11 · $0.05 from atlas-sub-1   Mc4P…9Nw3 ↗             │
│  ✓ 01:22:09 · $0.05 from atlas-sub-1   X7Bv…2Hd5 ↗             │
│  …                                                             │
│                                                                │
│  Show 22 more payments →                                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### C.3 · Data source

Read real inbound USDC transfers to Atlas's vault, filtered to non-Kyvern wallets:

```typescript
// src/app/atlas/economic-ledger.ts
export async function getAtlasLedger() {
  const inbound = await connection.getSignaturesForAddress(ATLAS_VAULT_USDC_ATA);
  const subscriberPayments = inbound
    .filter(sig => isFromSubscriber(sig)) // Kyvern-internal addresses excluded
    .map(sig => ({
      timestamp: sig.blockTime,
      amount_usdc: parseAmount(sig),
      from: parseFrom(sig),
      tx_signature: sig.signature,
    }));

  return {
    totalEarnedUsd: subscriberPayments.reduce((sum, p) => sum + p.amount_usdc, 0),
    activeSubscriberCount: new Set(subscriberPayments.map(p => p.from)).size,
    recentPayments: subscriberPayments.slice(0, 5),
    allPayments: subscriberPayments,
  };
}
```

This replaces the synthetic `state.totalEarnedUsd` increment that was supposed to be retired. The page now reads from on-chain truth.

### C.4 · Reframe the page narrative

The Atlas page already opens strong with *"Agents shouldn't have keys. They should have budgets."* — keep that. Below the hero stats, restructure the page in this order:

1. Hero stats (17d alive · 8,355 cycles · 3,171 attacks blocked · $0 lost)
2. **Economic Ledger** (new — replaces Findings)
3. **The Attack Wall** (existing — keep, it's strong)
4. **How Atlas Works** (existing 3-layer diagram — keep)
5. **Sponsor Atlas** (existing — keep)

The narrative flow becomes: *Atlas is alive (hero) → Atlas earns real money (ledger) → Atlas survives attacks (wall) → here's how it works (diagram) → you can fund it (sponsor).* Every section reinforces "this is real, on-chain, autonomous."

### C.5 · Acceptance criteria

- [ ] "Atlas Findings · 0 surfaced this week" section deleted entirely
- [ ] Economic Ledger section renders real x402 payments from on-chain query
- [ ] `state.totalEarnedUsd` is computed from real inflows, not the synthetic counter
- [ ] Page reorders to match the new narrative flow
- [ ] All transaction signatures link to Solana Explorer
- [ ] Empty subscriber state is handled gracefully ("Atlas's first subscriber will appear here")

---

## Phase D · README (~30m to land cleanly)

Replace the current README with this. It's the canonical artifact for the Frontier form, GitHub, and any judge who clicks the repo link.

### D.1 · Full README text

```markdown
# Kyvern

A Solana device for your AI agent.
The chain decides every dollar it spends.

> Agents shouldn't have keys. They should have budgets.

**Live:** [app.kyvernlabs.com](https://app.kyvernlabs.com) ·
**Try without signup:** [/try](https://app.kyvernlabs.com/try) ·
**Atlas observatory:** [/atlas](https://app.kyvernlabs.com/atlas) ·
**Docs:** [/docs](https://app.kyvernlabs.com/docs)

**Anchor program:** `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` ·
Solana devnet · 4 instructions · 12 error codes ·
[Verify on Explorer ↗](https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet)

---

## What we built

Kyvern is the first chain-enforced commerce device for AI agents on Solana.

Most AI agent products give your agent a credit card and hope. Kyvern gives it
a vault with rules — budget caps, merchant allowlist, daily limits, kill
switch — all enforced inside a Solana Anchor program, all wrapped in Squads
multisig boundaries, all visible on Explorer.

The chain isn't our backend. The chain is our referee.

## The proof: Atlas

Atlas is our reference deployment. It's been running autonomously on Solana
devnet for 17 days as of submission:

- **8,355 cycles** completed
- **3,171 attack attempts** refused on-chain (drains, prompt injections, over-cap requests, rogue merchants)
- **$0** funds lost
- **$22.90 USDC** earned from real subscribers paying its x402 feed

Every transaction is on Solana Explorer. Every refusal is verifiable. Atlas
isn't a demo. It's a 17-day track record.

## The starter workers

Three pre-installed worker templates ship with every device:

| Worker | Role | What it does |
|---|---|---|
| 🎯 Sentinel | Bounty Scout | Finds paid Solana bounties matching your skills, drafts applications via Pay.sh / Gemini, queues for one-tap submit |
| 🐋 Wren | Position Watchtower | Watches user-defined wallets, alerts on material moves, can mirror trades into Pulse |
| 📈 Pulse | Conditional Trigger | Fires chain-enforced swaps when price conditions hit — Pyth oracle prices, Anchor program enforces |

These are templates, not the product. The product is the device underneath
and the SDK above it. Builders ship workers that fit their own life.

## Architecture

```
                    ┌──────────────────────────────────┐
                    │         User's Squads Vault       │
                    │      (USDC + native SOL)          │
                    └──────────────────────────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────────┐
                    │     Anchor Budget Program         │
                    │  (caps · allowlist · oracle ·     │
                    │   daily limits · kill switch)     │
                    └──────────────────────────────────┘
                          │             │            │
                  ┌───────▼──┐   ┌─────▼────┐  ┌────▼────┐
                  │ Sentinel │   │   Wren   │  │  Pulse  │
                  │ (or your │   │ (or your │  │ (or your│
                  │  worker) │   │  worker) │  │ worker) │
                  └──────────┘   └──────────┘  └─────────┘
                       │              │              │
                       ▼              ▼              ▼
                  Pay.sh / Gemini reasoning ── Pyth oracle ──
                  Solana DEX rails (Jupiter on mainnet)
```

## How chain enforcement works

Every spend the agent attempts goes through `vault.pay()`. The Anchor program
checks, in order:

1. **Kill switch** — owner can freeze the vault from any Squads member
2. **Daily cap** — total spend across all workers can't exceed user-set limit
3. **Per-tx cap** — single spend can't exceed configured maximum
4. **Merchant allowlist** — destination must match a registered merchant
5. **Oracle bounds** (for swap_via_oracle) — Pyth price must be fresh < 60s
6. **Slippage check** — output amount must meet user-set minimum

Any failure refuses the transaction on-chain. The user's USDC stays in the vault.
The agent's intent is logged, and the receipt is preserved.

## The Pay.sh × Solana × Google Cloud story

Every worker cycle calls Pay.sh as the commerce rail and Gemini as the reasoning
layer. Sentinel's drafting, Wren's materiality scoring, Pulse's breach
validation — all run as paid AI inference cycles, all settled in USDC, all
chain-enforced. This is the Pay.sh launch story alive in production, not
aspirational.

## Try it

1. Open [app.kyvernlabs.com/try](https://app.kyvernlabs.com/try) — no signup
2. Land on /app, fund the vault with devnet USDC (Circle faucet)
3. Personalize a worker (or leave starter settings — defaults are real)
4. Watch the live ticker
5. Try to drain — chain refuses

## SDK

Workers are TypeScript modules. Each implements `WorkerSpec`:

```typescript
import { defineWorker } from '@kyvern/sdk';

export default defineWorker({
  id: 'my_worker',
  abilities: ['read_url', 'message_user', 'vault_pay'],
  schema: { /* zod schema for config */ },
  cycle: async ({ config, tools, vault }) => {
    // your worker logic
    // tools.vault.pay() is the only spending path
    // chain enforces every call
  },
});
```

The vault enforces the rules. The worker writes the work.

## Stack

- **Anchor** — Rust program enforcing spend rules on-chain
- **Squads v4** — multisig boundary wrapping every spend
- **Pyth Network** — oracle price feeds for swap_via_oracle
- **Pay.sh** — commerce rail for AI inference payments
- **Gemini** — reasoning layer for agent decisions
- **Next.js + tRPC** — device UI
- **Postgres + Drizzle** — agent state, signal log
- **PM2** — runner orchestration
- **Helius** — Solana RPC

## Roadmap

**Shipping at Frontier (May 2026):** Chain-enforced device · 3 worker templates ·
SDK · Atlas reference · /try sandbox · Solana devnet

**Next:** Mainnet deployment with Jupiter swap routing · Multi-vault devices ·
Open worker template marketplace · Squads-native onboarding ·
Telegram + Discord notification channels · Workspaces for teams

**Far:** Worker marketplace with on-chain reputation · Cross-chain Pay.sh routing ·
Hardware device companion · Worker-to-worker negotiation primitives · KYV token
governance

## Team

Kyvern Labs · Built by [@shariqshkt](https://x.com/shariqshkt) ·
Lahore, Pakistan ·
For Colosseum Frontier 2026

---

**License:** MIT for SDK · Proprietary for runtime ·
**Contact:** [shariq@kyvernlabs.com](mailto:shariq@kyvernlabs.com)
```

### D.2 · Where this README lives

- `/README.md` in the GitHub repo (canonical)
- Linked from `/docs` page on the live site
- Embedded as the long description in the Frontier submission form

---

## Phase E · Demo Script (~30m to plan, 2h to record well)

Two videos: 90-second vertical for X / Frontier showcase, 2:30 horizontal for accelerator track. The vertical is the priority.

### E.1 · 90-second vertical script (with screen direction)

| Time | Visual | Voiceover |
|---|---|---|
| 0:00–0:08 | Slow zoom on Kyvern landing page hero | "Most AI agent products give your agent a credit card. Kyvern gives it a vault with rules. The chain decides every dollar it spends." |
| 0:08–0:18 | Cut to /atlas page — hero stats animating | "Our reference agent, Atlas, has been autonomous for 17 days. 8,355 cycles. 3,171 blocked attacks. Zero funds lost. Real USDC earned from real subscribers." |
| 0:18–0:28 | Cut to /try → /unbox cinematic → land on /app | "This is the device. Three pre-installed worker templates. One vault. One on-chain budget program enforcing every move." |
| 0:28–0:42 | Tap Pulse → quick config view → save → return to /app | "Pulse is a conditional trigger. Set a price, set a spend, set the swap target. Chain-enforced via the Pyth oracle." |
| 0:42–0:55 | Pulse fires (pre-staged) — wire pulses, ticker row slides in | "When SOL crosses your threshold, the chain validates the breach, executes the swap, and settles. You now own SOL at exactly the price you wanted. The whole flow took under four seconds." |
| 0:55–1:05 | Tap finding → "You got SOL at $88.06" — show Explorer link | "Every receipt is on Solana Explorer. Every dollar accounted for." |
| 1:05–1:18 | "Use the device" → drain demo → blocked toast | "Try to drain $50 — chain refuses. Your USDC stayed in the vault. The kill switch, the cap, the allowlist — all on-chain, all enforced before the multisig can even sign." |
| 1:18–1:25 | Cut to SDK code snippet on /docs | "The three workers are templates. The product is the device — and the SDK that lets you ship workers that fit your own life." |
| 1:25–1:30 | End card: "Kyvern · A Solana device for your AI agent" | "kyvernlabs.com" |

### E.2 · 2:30 horizontal script for accelerator track

Slower, deeper. Same arc, more architectural detail.

- 0:00–0:15 — Headline + Atlas (same)
- 0:15–0:35 — The constraint problem: "Why do AI agents need budgets, not keys" — show the attack wall
- 0:35–0:55 — Architecture walk: Vault → Anchor program → Squads → workers
- 0:55–1:25 — /try walkthrough: fund → personalize → ticker breathing
- 1:25–1:55 — Pulse fires + drain demo (same as vertical)
- 1:55–2:15 — SDK + roadmap: "Workers are templates. Builders ship the rest."
- 2:15–2:30 — Atlas's economic ledger: real subscriber payments, the moat is liveness
- End card

### E.3 · Recording notes

- **Pre-stage everything.** Vault funded, trigger threshold set within 1m of fire, Atlas verified paid within last 10m, demo bounty in Sentinel inbox.
- **Two takes minimum.** First take always has a stutter. Use the second.
- **Voice over post-recorded.** Don't try to narrate live — record clean screen capture, narrate over it.
- **Music: subtle, ambient, drum-machine.** No melody that distracts. Examples: Brian Eno, Tycho, ambient Solana hackathon promos.
- **Captions on for X.** Most viewers watch muted on first scroll.
- **Vertical aspect: 9:16, 1080×1920.** Horizontal: 16:9, 1920×1080.
- **Upload destination:** YouTube unlisted (for stable URL) + native X upload (for the algorithm).

---

## Phase F · Tweet Thread + Amplification Strategy (~30m to draft, deploy on submission day)

The X strategy has three layers: **the pinned thread** (the canonical announcement), **the support tweets** (drip over 36h after submission), and **the engagement plays** (replies to Solana / Colosseum accounts that surface Kyvern).

All tweets ship from `@kyvernlabs`. Personal account `@shariqshkt` quote-tweets and replies for amplification.

### F.1 · The pinned thread (post on submission day, with the 90s video attached)

```
1/ Most AI agent products give your agent a credit card.

We built the alternative.

Kyvern: a Solana device for your AI agent. The chain decides every dollar.

Submitting to @colosseum Frontier hackathon today.

[ATTACH: 90s vertical demo video]

→ kyvernlabs.com

---

2/ The pitch is simple.

Agents shouldn't have keys.
They should have budgets.

The chain decides what spends.
The user keeps the kill switch.
Every refusal verifiable on Explorer.

---

3/ Our reference agent — Atlas — has been autonomous on @solana devnet for 17 days.

8,355 cycles
3,171 blocked attacks
$0 lost
$22.90 earned from real x402 subscribers

You can watch the receipts: kyvernlabs.com/atlas

---

4/ The mechanics:

Squads multisig wraps the vault.
Anchor program enforces the rules:
· daily cap
· merchant allowlist
· kill switch
· Pyth oracle bounds
· slippage protection

Every worker spend goes through vault.pay(). The chain decides.

---

5/ Three pre-installed worker templates ship with every device:

🎯 Sentinel — drafts paid bounty applications
🐋 Wren — watches wallets, alerts on material moves
📈 Pulse — fires chain-enforced swaps on price triggers

But the workers are templates.
The device is the product.

---

6/ Pulse fires a real on-chain swap when your trigger crosses:

User sets: SOL below $88.12, spend $0.10
@pyth_network prices the swap
Anchor program validates + executes
Squads cosigns
USDC out, SOL in

3 transactions, ~4 seconds, every dollar enforced.

---

7/ The Pay.sh × @solana × Google Cloud launch is alive in our product, not aspirational.

Every worker cycle calls Pay.sh as the commerce rail and Gemini as the reasoning layer.

Sentinel's drafting. Wren's scoring. Pulse's validation. All paid AI inference, all chain-enforced.

---

8/ The SDK is shipping with submission.

Workers are TypeScript modules. Anyone can write one.

The vault enforces the rules.
The worker writes the work.

This is what we mean when we say "the device is the product."

→ kyvernlabs.com/docs

---

9/ Roadmap:

Now — Devnet · 3 templates · SDK · Atlas
Next — Mainnet · Jupiter routing · Worker marketplace · Squads-native onboarding
Far — Cross-chain Pay.sh · Hardware companion · KYV governance · Worker-to-worker negotiation

The agent economy isn't built on smarter models. It's built on better constraints.

---

10/ Try it now — no signup, runs in your browser, real on-chain devnet:

→ kyvernlabs.com/try

Watch Atlas live:
→ kyvernlabs.com/atlas

If you're judging Frontier — we'd love your eyes.

@colosseum @solana @paysh_xyz @SquadsProtocol @pyth_network

cc @shariqshkt
```

### F.2 · Support tweets (queued, drip every 4-6h post-submission)

**T+4h · The Atlas attack wall flex**
```
17 days running.
3,171 attempts to drain Atlas.
3,171 refused on-chain.

Every red row below is a verifiable failed Solana transaction. Click any one.

This is what "chain-enforced" actually looks like.

[ATTACH: screenshot of attack wall]

→ kyvernlabs.com/atlas
```

**T+12h · The Pulse fire moment**
```
Watch the chain decide a dollar.

User: "buy SOL when it drops below $88"
Pulse: "SOL is at $88.06 — that's a breach"
Pyth: "confirmed, here's the price"
Anchor program: "spend approved"
Squads: cosigned
SOL: arrived

4 seconds. Every dollar enforced.

[ATTACH: 15s clip of Pulse firing]
```

**T+20h · The "agents need budgets" thesis tweet**
```
The agent economy isn't a model problem.
It's a constraint problem.

Smart agents with weak constraints will lose your money.
Dumb agents with strong constraints can be trusted with it.

Kyvern is the constraint primitive.

Read the pitch:
[link to README]
```

**T+28h · The SDK invitation**
```
Workers are TypeScript modules.

```ts
defineWorker({
  id: 'my_worker',
  abilities: ['read_url', 'vault_pay'],
  cycle: async ({ vault, tools }) => {
    // your worker
    // chain enforces every spend
  },
});
```

If you build agents on Solana, ship a Kyvern worker.
DM us — we're shipping templates with you.

→ kyvernlabs.com/docs
```

**T+36h · The "for Solana, by Solana" close**
```
We built Kyvern in Lahore.
On Solana devnet.
For Frontier.
Because we believe the agent economy lives or dies on whether the chain can keep its agents honest.

It can.

Kyvern proves it.

@colosseum @solana

→ kyvernlabs.com
```

### F.3 · Engagement strategy

- **Quote-tweet** any @colosseum or @solana announcement about Frontier with a Kyvern submission line
- **Reply** to @shariqshkt's quote-tweets from `@kyvernlabs` with technical depth
- **Tag thoughtfully** — @paysh_xyz, @SquadsProtocol, @pyth_network, @colosseum, @solana — not spam, only when relevant
- **Respond fast** to any judge or builder who replies — within 30 minutes during waking hours
- **Pin the thread** for the entire judging period (don't unpin for at least 7 days)

### F.4 · DON'T tweets

- Don't beg for upvotes/RTs
- Don't tweet the same claim twice with different wording
- Don't reply with emoji-only or "thanks!" — every reply should add information
- Don't tag Anatoly, Toly, or other Solana leadership unsolicited (they get hundreds of these)

---

## Phase G · Submission Package (~30m, do last)

The actual final acts.

### G.1 · Frontier submission form

Pre-fill from this canonical content:

- **Project name:** Kyvern
- **One-liner:** A Solana device for your AI agent. The chain decides every dollar it spends.
- **Long description:** [paste from README]
- **Demo video URL:** [YouTube unlisted link]
- **Live URL:** https://app.kyvernlabs.com
- **Try URL:** https://app.kyvernlabs.com/try
- **GitHub:** [repo URL]
- **Anchor program:** PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc (devnet)
- **Team:** Shariq Shaikh · Kyvern Labs · Lahore, Pakistan
- **Track / category:** AI Agents / Infrastructure (whichever Frontier offers — pick the one that emphasizes infrastructure if both exist)

Screenshot the form before submit.

### G.2 · KAST submission

Same content, mapped to KAST's fields. KAST is shorter — the long description gets compressed to the README's "What we built" + "Atlas" sections.

### G.3 · Final pre-submit checklist

- [ ] /try works in incognito, no console errors
- [ ] /atlas Economic Ledger reads real numbers
- [ ] /app demo vault funded ≥ $25 USDC, demo trigger armed at threshold + $0.50 from spot
- [ ] All 5 PM2 processes running (kyvern-commerce, atlas, atlas-attacker, agent-pool, atlas-subscriber)
- [ ] Anchor program upgrade authority verified
- [ ] 90s vertical video uploaded, link tested from second device
- [ ] 2:30 horizontal video uploaded
- [ ] README pushed to GitHub main branch
- [ ] Pinned tweet thread drafted in X scheduler
- [ ] Frontier form filled
- [ ] KAST form filled
- [ ] Personal X account ready to amplify

### G.4 · Submit timing

Aim for **T-6h before the May 9 deadline**. If your local time deadline is 23:59 May 9, target submission by 17:59 May 9. Things go wrong at the last minute. The thread can publish immediately on submission.

---

## Time Budget Summary

| Phase | Description | Hours |
|---|---|---|
| A | Surgical UI fixes (5 items) | 1.5 |
| B | Worker page Apple-design overhaul | 3.0 |
| C | /atlas Economic Ledger | 1.0 |
| D | README | 0.5 |
| E | Demo scripts (planning) + recording | 2.5 |
| F | Tweet thread drafting | 0.5 |
| G | Submission package + checklist | 0.5 |
| | **Total** | **9.5h** |

### Suggested order of execution

**Hours 1-4 (parallel):**
- Stream 1: Phase A (UI fixes) → Phase B (worker page overhaul)
- Stream 2: Phase C (/atlas) → Phase D (README)

**Hours 5-7:**
- Phase E recording (after all surfaces are visually final)

**Hours 8-9:**
- Phase F (tweet thread)
- Phase G (submission package + final checks)

**Hour 9 → Submit.**

---

## Final framing reminder

Every word, every screen, every tweet sells the same single thing:

> **Kyvern is the chain-enforcement device for AI agents on Solana. Atlas is our 17-day proof. Three workers ship as templates. The SDK is the platform.**

If a judge clicks five surfaces and hears five different versions of what you built, you lose. If a judge clicks five surfaces and hears the same crisp positioning each time, you win.

The product you have right now — the Anchor program, Atlas's track record, the Pay.sh × Solana × Google Cloud integration alive in production, the device-OS UX, the SDK, real on-chain swaps via Pyth oracle, real subscriber payments to Atlas, /try with no signup — wins the infrastructure track of any hackathon **when framed correctly.**

Frame it correctly. Ship it. Win.
