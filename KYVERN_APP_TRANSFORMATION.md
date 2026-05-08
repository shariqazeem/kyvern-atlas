# Kyvern `/app` — Transformation Spec

**For Claude Code execution. Submission deadline: 2026-05-09. Allotted budget: ~10–11h.**

---

## 0 · Read this first

You are working on **Kyvern**, the Solana device for AI agents. The product currently ships as `/app` with three tabs (Live Inside · Deploy Worker · Pay & Enforce) and three pre-installed workers (Sentinel · Wren · Pulse). The Anchor policy program is deployed at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on Solana devnet. Atlas (the public reference agent) has been autonomous for 17+ days at `/atlas`.

This document specifies a transformation of `/app` only. You will:

1. **Kill the tabs.** Replace tabbed navigation with one persistent device view + three contextual slide-in panels.
2. **Reframe the three workers.** Same names, completely new job descriptions, schemas, and outputs that benefit the human owner directly.
3. **Add Genesis-device framing** that reads as v0.1 of a long-running product, not a hackathon artifact.

You will **NOT** touch: `/atlas`, the Anchor program, the policy engine, the Squads cosign path, the canvas (workers + wires + vault + ticker), `/try`, `/unbox`, `/recover`, `/login`. See §9 for the full preserve list.

Execute the phases in order (§8). Each phase has a checkpoint. Do not advance until the checkpoint passes.

---

## 1 · The transformation in one paragraph

`/app` becomes **one persistent device view** — workers wired to a vault, ticker streaming, chain enforcing every wire — with three contextual affordances (`+ Open a bay` · `↗ Use the device` · `</> Builder`) that open card-based slide-in panels *over* the device. The user is always at home. They never lose sight of the workers. Every panel feels like an instrument drawer in a futuristic OS, not a separate page. Workers stop posting tasks for each other (synthetic loop retired) and start doing real jobs the human wants done: Sentinel drafts paid bounty applications, Wren alerts on watched wallets, Pulse fires conditional spends on price triggers — all using Pay.sh / Gemini for AI work, all chain-budgeted.

---

## 2 · UI/UX system

### 2.1 Layout

The `/app` page is **one viewport-height device home** with the following stack (top to bottom):

1. **TopRail** (existing, ~64px) — `● ONLINE | KVN-XXX | network | uptime` · `VAULT $X.XX | 🛡 SQUADS SECURED`
2. **Whisper line** (~24px) — *"Three workers. One vault. The chain decides every wire."*
3. **Canvas** (existing, ~480px desktop / ~360px mobile) — workers + wires + vault + halo. **DO NOT MODIFY.** Already shipped as of git `94a2acb`.
4. **Live Ticker** (existing, ~200px) — six-row max, fades older.
5. **"Working for you this week" strip** (NEW, ~48px) — aggregate user-benefit counters.
6. **Bottom rail** (existing, ~80px) — daily-cap gauge + manifesto line.
7. **Affordance row** (NEW, ~64px) — three contextual buttons.
8. **Genesis strip** (NEW, ~32px) — `GENESIS DEVICE · v0.1 · ROADMAP →`

No tabs. No mode-switching. The device IS the page.

### 2.2 Card system

**Every panel is a card.** Cards have:

- **Background:** `bg-white`
- **Border:** `border border-zinc-200/60`
- **Corner radius:** `rounded-2xl` (16px)
- **Shadow:** `shadow-[0_8px_32px_rgba(0,0,0,0.06)]` for floating, `shadow-sm` for embedded
- **Padding:** `p-6` desktop, `p-4` mobile
- **Inner card spacing:** `space-y-4`

Cards within cards (e.g., a worker card inside the Open-a-Bay panel) drop one elevation level: lighter shadow, no border, `bg-zinc-50/60` to differentiate.

### 2.3 Motion

Use **Framer Motion** (already in your `package.json`). All panels open with spring physics, never CSS transitions:

```ts
const panelSpring = {
  type: "spring",
  stiffness: 280,
  damping: 30,
};

// Panel enter
<motion.div
  initial={{ y: "100%", opacity: 0 }}     // mobile sheet
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: "100%", opacity: 0 }}
  transition={panelSpring}
/>
```

Backdrop blur fades in 200ms ease-out. Card content inside the panel staggers 40ms between children.

When the user taps a worker chip, the worker detail panel slides in from the right (desktop) or up (mobile) using the same spring. **Always preserve the device underneath** — do not blank the page.

### 2.4 Typography & color tokens

Use existing tokens from your design system:
- **Numbers / monospace:** `font-mono` (JetBrains Mono)
- **Prose:** `font-sans` (Inter)
- **Headings inside cards:** `text-base font-semibold tracking-tight`
- **Subtitles:** `text-sm text-zinc-500`
- **Outcome chips:** `text-xs font-mono uppercase tracking-wide`

State colors (existing, applied to chip rings, wires, ticker dots):
- **Settled / earned:** `text-emerald-500` `bg-emerald-50` `ring-emerald-200`
- **Blocked / failed:** `text-red-500` `bg-red-50` `ring-red-200`
- **Thinking / Pay.sh in flight:** `text-amber-500` `bg-amber-50` `ring-amber-200`
- **Idle:** `text-zinc-400` `bg-zinc-50` `ring-zinc-200`
- **Vault halo:** existing emerald glow, untouched

### 2.5 Mobile vs desktop

| Behavior | Mobile (<768px) | Desktop (≥768px) |
|---|---|---|
| Panel surface | Bottom sheet, drag handle, max-h `85vh` | Right-side drawer, fixed width `480px`, full height |
| Backdrop | Full-screen `bg-zinc-950/40 backdrop-blur-sm` | Same |
| Close interaction | Drag down past 30% / tap backdrop / `Esc` | Tap backdrop / `Esc` / close button |
| Affordance row | Two rows of buttons if cramped | Single row, equal width |

Use `useMediaQuery('(min-width: 768px)')` to switch. Never render both surfaces; pick one based on viewport.

---

## 3 · The unified `/app` surface

### 3.1 What the user sees

```
┌─────────────────────────────────────────────────────────────┐
│  ● ONLINE  KVN-1LQOFFOU  ·  Solana devnet    Up 2h 3m       │
│  VAULT $12.40                          🛡 SQUADS SECURED    │
│                                                             │
│       Three workers. One vault. The chain decides           │
│                    every wire.                              │
│                                                             │
│  [ canvas — workers + wires + vault + ticker · UNCHANGED ]  │
│                                                             │
│  WORKING FOR YOU THIS WEEK                                  │
│  2 drafts · 14 alerts · 1 trigger · $0.18 AI · $5 cap       │
│                                                             │
│  ─────────────────────────────────────────────────────      │
│  $5/day cap · chain decides every dollar                    │
│                                                             │
│   [ + Open a bay ]  [ ↗ Use the device ]  [ </> Builder ]   │
│                                                             │
│             GENESIS DEVICE · v0.1 · ROADMAP →               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Component map

| Region | Component | File | Status |
|---|---|---|---|
| Frame | `DeviceChassis` | `src/components/device/home/chassis.tsx` | unchanged |
| Header | `TopRail` | `src/components/device/home/top-rail.tsx` | unchanged |
| Whisper | inline in `/app/page.tsx` | `src/app/app/page.tsx` | unchanged |
| Canvas | (existing canvas component) | `src/components/device/home/...` | **DO NOT MODIFY** |
| Ticker | (existing ticker) | `src/components/device/home/...` | format change only (§5) |
| Working-for-you strip | `WorkingForYouStrip` | `src/components/device/home/working-for-you-strip.tsx` | **NEW** |
| Bottom rail | `BottomRail` | `src/components/device/home/bottom-rail.tsx` | unchanged |
| Affordance row | `AffordanceRow` | `src/components/device/home/affordance-row.tsx` | **NEW** |
| Genesis strip | `GenesisStrip` | `src/components/device/home/genesis-strip.tsx` | **NEW** |
| Tabs nav | `DeviceTabs` | `src/components/device/home/device-tabs.tsx` | **DELETE** |

---

## 4 · The three slide-in panels

All three use the same `<DevicePanel>` shell component you will create.

### Panel shell — `src/components/device/panels/device-panel.tsx` (NEW)

```tsx
type DevicePanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};
```

Renders backdrop + sheet/drawer per §2.5. Header with title + close button. Children scroll if overflow. Optional footer (used by all three panels for the "more X coming" hints).

### 4.1 `+ Open a bay` panel

**Trigger:** affordance button, or tap on any empty bay slot inside the panel.

**Content:** existing logic from `src/components/device/home/deploy-tab.tsx` — 5 bay slots (3 occupied, 2 empty pulsing), inline `[Pick a preset | Wrap my own agent]` toggle, slot-fill ceremony on confirm.

**File:** `src/components/device/panels/open-bay-panel.tsx` (NEW). Move logic from `deploy-tab.tsx`. Wrap in `<DevicePanel>`.

**Footer hint:** *"More bays unlock as the network grows."*

**Backend:** unchanged. POST `/api/devices/[id]/deploy-preset` and `/api/agents/spawn` continue to power preset and BYO paths.

### 4.2 `↗ Use the device` panel

**Trigger:** affordance button, or tap directly on the vault card in the canvas.

**Content:** the two real on-chain demo actions, exactly as currently in the top half of `pay-enforce-tab.tsx`:

- **Card 1:** `Buy a signal from Atlas — $0.01 USDC` → POST `/api/devices/[id]/buy-atlas-signal` → render approved + Atlas signal text + Explorer pill
- **Card 2:** `Try to drain the vault — $50` → POST `/api/devices/[id]/drain-attempt` → render blocked + reason + real failed sig Explorer pill

Both cards have a subtle outcome footer that reveals after click (don't pre-render; result block appears with spring on resolution).

**File:** `src/components/device/panels/use-device-panel.tsx` (NEW). Extract from `pay-enforce-tab.tsx` top section. Wrap in `<DevicePanel>`.

**Footer hint:** *"Every dollar settled and every block is a real Solana devnet signature."*

**Backend:** unchanged. Both endpoints exist and work.

### 4.3 `</> Builder` panel

**Trigger:** affordance button only (not exposed in canvas; intentional — newbies skip).

**Content:** existing advanced section from `pay-enforce-tab.tsx`, organized as three stacked cards:

- **Card 1: Policy Playground** — merchant + amount + memo form, `[Pay.sh · Gemini]` `[$0.05 OpenAI]` `[$5 → over cap]` quick-fill chips, Run-through-policy button, result block. Existing `policy-playground.tsx` component.
- **Card 2: SDK** — code snippet with `OnChainVault` example. `[SDK · Any agent]` ↔ `[Pay.sh · Solana × GCP NEW]` toggle. Existing `integrate-card.tsx` component.
- **Card 3: Agent Key** — `kv_live_…` prefix + Mint-a-key button. Existing `/api/devices/[id]/agent-key` endpoint.

**File:** `src/components/device/panels/builder-panel.tsx` (NEW). Compose existing components inside `<DevicePanel>`.

**Footer hint:** *"More integrations coming: Jupiter · Drift · Marinade · MagicEden."*

**Backend:** unchanged.

---

## 5 · Worker reframe (path 1)

### 5.1 🎯 Sentinel — *Bounty Scout*

**Job description (user-facing):** *"I find paid Solana bounties matching your skills, draft your application with Pay.sh / Gemini, and queue it for one-tap submit."*

**Config schema (stored in `agent.config` jsonb):**
```ts
type SentinelConfig = {
  skills: string;          // textarea — feeds Gemini drafting prompt
  min_payout_usd: number;  // default 300
  cadence_minutes: number; // default 600
};
```

**Cycle (in `runner.ts`, `agent.template === 'bounty_hunter'` branch):**

1. Read `agent.config` for skills + thresholds.
2. Round-robin across the existing 7 ecosystem feeds via `watch_url`.
3. For each new bounty ≥ `min_payout_usd`:
   a. Call Pay.sh / Gemini via `serverVaultPay({ merchant: 'api.pay.sh/gemini', amountUsd: 0.005, memo: 'gemini-flash: draft application for {bountyTitle}' })`.
   b. Use the Gemini response as `draftText`.
   c. Emit `signal.kind = 'drafted_application'` with evidence:
      ```ts
      { bountyUrl, bountyTitle, payoutUsd, draftText, paySh_tx, source }
      ```

**Retire:** Sentinel's `post_task` action (no more synthetic-economy task posting).

**On-screen:**
- **Tab 1 chip subtitle:** *"2 drafts ready · est. $325 · [Review →]"*
- **Inbox card:** title = bounty name, body = first 100 chars of draft, buttons `[Submit] [Edit] [Skip]`
- **Ticker row:** `🎯 Sentinel · drafted: Helius RPC stress-test · $250 est · Pay.sh tx ↗ · 4m`

**Submit button:** stub for hackathon — marks signal `submitted=true`, increments a counter, optionally DMs poster contact via existing `message_user` tool. The *draft existing* is the value; full portal submission is post-Frontier.

### 5.2 🐋 Wren — *Position Watchtower*

**Job description:** *"Pick wallets or contracts to watch. I ping you when something material moves. Chain caps how often I check."*

**Config schema:**
```ts
type WrenConfig = {
  watchlist: Array<{
    address: string;
    label: string;
    threshold_usd: number;
  }>;
  cadence_minutes: number; // default 5
};
```

**Pre-seed for new devices:** 3 example whales so guests on `/try` see activity immediately:
```ts
[
  { address: 'BIG...WHALE1', label: 'Whale A', threshold_usd: 5000 },
  { address: 'BIG...WHALE2', label: 'Whale B', threshold_usd: 5000 },
  { address: 'BIG...WHALE3', label: 'Whale C', threshold_usd: 5000 },
]
```

**Cycle (in `runner.ts`, `agent.template === 'whale_tracker'` branch):**

1. Read `agent.config.watchlist`.
2. For each address: `watch_wallet_swaps(address)` — existing tool.
3. For each new swap ≥ that address's threshold:
   a. Call Pay.sh / Gemini: `memo: 'gemini-flash: materiality check {address}'`, amount `$0.003`.
   b. Parse Gemini's 1-line reason.
   c. If material: emit `signal.kind = 'wallet_alert'` with evidence:
      ```ts
      { address, label, swapDetails, materiality_reason, paySh_tx }
      ```

**Retire:** Wren's `claim_task` + `complete_task` + `post_task` actions on its own findings.

**On-screen:**
- **Tab 1 chip subtitle:** *"3 alerts today · last 14m ago · [View →]"*
- **Inbox card:** label, swap summary, materiality reason, `[Mute address] [View tx]`
- **Ticker row:** `🐋 Wren · alert: whale 0xABC swapped $850k SOL→USDC · "exit signal" · 14m`

### 5.3 📈 Pulse — *Conditional Trigger* **(killer worker)**

**Job description:** *"Set a price condition. I poll the market with Pay.sh / Gemini reasoning. The moment it triggers, I fire your pre-approved spend — and the chain checks every dollar."*

**Config schema:**
```ts
type PulseConfig = {
  triggers: Array<{
    asset: string;          // 'SOL', 'JUP', 'BONK', etc.
    direction: 'below' | 'above';
    threshold_usd: number;
    amount_usd: number;
    merchant: string;
    memo: string;
  }>;
  cadence_minutes: number;  // default 1
};
```

**Pre-seed:** one example trigger that uses the existing OpenAI merchant so it shares plumbing with the Tab 3 Playground:
```ts
{
  asset: 'SOL',
  direction: 'below',
  threshold_usd: 182.50,
  amount_usd: 5,
  merchant: 'api.openai.com',
  memo: 'test conditional spend',
}
```

**Cycle (in `runner.ts`, `agent.template === 'token_pulse'` branch):**

1. Read `agent.config.triggers`.
2. For each trigger: `read_dex(asset)` — existing tool.
3. If price within 5% of threshold:
   a. Call Pay.sh / Gemini: `memo: 'gemini-flash: validate breach for {asset} @ ${price}'`, amount `$0.003`.
   b. If Gemini confirms a real breach (not a wick):
      i. Call `vault.pay({ amount: amount_usd, merchant, memo: 'trigger fired: {memo} @ ${price}' })`.
      ii. Emit `signal.kind = 'trigger_fired'` with evidence:
         ```ts
         { triggerId, asset, breachPrice, paySh_tx, vaultPay_tx }
         ```
4. Else: emit `signal.kind = 'trigger_armed'` (dedup'd to once per cadence per trigger).

**Retire:** Pulse's `claim_task` + `complete_task` actions. Keep `stake_on_finding` infrastructure but route it through the trigger flow.

**On-screen:**
- **Tab 1 chip subtitle (armed):** *"1 trigger armed · SOL @ $186.02 → fires at $182.50 · [Edit →]"*
- **Tab 1 chip subtitle (5s flash on fire):** *"✓ TRIGGER FIRED · $5 spent · txid ↗"*
- **Inbox card:** trigger condition, breach price, two tx links (Pay.sh validation + actual conditional spend)
- **Ticker row:** `📈 Pulse · trigger fired: SOL hit $182.40 · spent $5 → api.openai.com · approved by chain · 0s`

### 5.4 Worker detail page (`/app/agents/[id]`)

Add a new top section *above* the existing economic timeline + chat drawer:

```tsx
<section>
  <Eyebrow>What this worker does for you</Eyebrow>
  <h2>{worker.jobDescription}</h2>
  <p>{worker.jobBody}</p>

  <Eyebrow className="mt-8">Configure</Eyebrow>
  {/* Worker-specific form: SkillsField | WatchlistEditor | TriggersEditor */}

  <ButtonGroup>
    <Button>Save</Button>
    <Button variant="ghost">Pause</Button>
    <Button variant="ghost">Retire</Button>
  </ButtonGroup>
</section>
```

Existing live state, economic timeline, and chat drawer remain — demoted below the new section.

**New components:**
- `src/components/agents/configure/skills-field.tsx`
- `src/components/agents/configure/watchlist-editor.tsx`
- `src/components/agents/configure/triggers-editor.tsx`

**API route for saving config:**
- `POST /api/agents/[id]/config` — body `{ config: jsonb }`. Updates `agent.config`, broadcasts via existing live-status polling.

---

## 6 · Schema changes

### 6.1 Migration

```sql
-- Migration: add agent.config
ALTER TABLE agent
  ADD COLUMN config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill defaults for existing rows
UPDATE agent SET config = jsonb_build_object(
  'skills', 'Solana developer · Rust · TypeScript',
  'min_payout_usd', 300,
  'cadence_minutes', 600
) WHERE template = 'bounty_hunter';

UPDATE agent SET config = jsonb_build_object(
  'watchlist', '[]'::jsonb,
  'cadence_minutes', 5
) WHERE template = 'whale_tracker';

UPDATE agent SET config = jsonb_build_object(
  'triggers', '[]'::jsonb,
  'cadence_minutes', 1
) WHERE template = 'token_pulse';
```

### 6.2 SignalKind union extension

In `src/lib/signals/types.ts` (or wherever `SignalKind` lives):

```ts
export type SignalKind =
  // NEW
  | 'drafted_application'
  | 'wallet_alert'
  | 'trigger_armed'
  | 'trigger_fired'
  // EXISTING — kept for backward compat with historical rows; no longer emitted
  | 'opportunity'
  | 'market_intel'
  | 'price_trigger'
  | 'wallet_move'
  | 'bounty'
  | 'github_release'
  | 'ecosystem_announcement';
```

### 6.3 Severity rules (in `signal-severity.ts`)

```ts
case 'drafted_application':
  return payoutUsd >= 1000 ? 'critical'
       : payoutUsd >= 500  ? 'important'
       : 'info';
case 'wallet_alert':
  return swapValueUsd >= 500_000 ? 'critical'
       : swapValueUsd >= 100_000 ? 'important'
       : 'info';
case 'trigger_fired':
  return 'important';
case 'trigger_armed':
  return 'routine';
```

---

## 7 · File-level changes

### 7.1 Files to CREATE

```
src/components/device/home/affordance-row.tsx
src/components/device/home/working-for-you-strip.tsx
src/components/device/home/genesis-strip.tsx
src/components/device/panels/device-panel.tsx
src/components/device/panels/open-bay-panel.tsx
src/components/device/panels/use-device-panel.tsx
src/components/device/panels/builder-panel.tsx
src/components/agents/configure/skills-field.tsx
src/components/agents/configure/watchlist-editor.tsx
src/components/agents/configure/triggers-editor.tsx
src/app/api/agents/[id]/config/route.ts
src/app/roadmap/page.tsx
db/migrations/{timestamp}_add_agent_config.sql
```

### 7.2 Files to MODIFY

```
src/app/app/page.tsx
  - Remove DeviceTabs import + render
  - Add AffordanceRow with three handlers + open-state
  - Render <OpenBayPanel /> <UseDevicePanel /> <BuilderPanel /> via <AnimatePresence>
  - Add <WorkingForYouStrip /> between ticker and bottom rail
  - Add <GenesisStrip /> below affordance row

src/components/device/home/worker-tile.tsx (or wherever chip renders)
  - Replace verb-line ("WATCHING FEEDS") with user-outcome line ("2 drafts ready")
  - Read live values from `liveStatus.workers[i].userOutcome` (NEW field)

src/lib/agents/runner.ts
  - bounty_hunter branch → drafted_application flow
  - whale_tracker branch → wallet_alert flow
  - token_pulse branch → trigger_armed / trigger_fired flow

src/lib/agents/store.ts
  - Read agent.config in worker context
  - Persist new SignalKinds correctly

src/app/api/devices/[id]/live-status/route.ts
  - Add userOutcome string per worker (computed from recent signals)
  - Add weeklyBenefit aggregate object for the strip

src/app/app/inbox/page.tsx (or wherever inbox renders)
  - Add three new SignalCard components for new kinds

src/app/app/agents/[id]/page.tsx
  - Add "What this worker does for you" + Configure section above existing content
  - Add config save handler hitting /api/agents/[id]/config
```

### 7.3 Files to DELETE

```
src/components/device/home/device-tabs.tsx
src/components/device/home/deploy-tab.tsx       (after extracting logic to open-bay-panel.tsx)
src/components/device/home/pay-enforce-tab.tsx  (after extracting logic to use-device-panel.tsx + builder-panel.tsx)
```

Delete the bottom-nav entry for `/app/tasks` (keep the page accessible at the URL but unlink). In `src/components/os/tab-bar.tsx` (or equivalent), remove the Jobs item. Three remain: Home · Findings · Settings.

---

## 8 · Phased execution plan

### 8.1 Phase 0 — Preparation (15 min)

1. `git status` — confirm clean tree.
2. `git checkout -b feat/device-os-transformation`.
3. `git log -1` — note current HEAD.
4. Smoke-test current `/app` once: open Tab 1, Tab 2, Tab 3, verify each works.
5. Take screenshots of all three tabs for before/after comparison.
6. `pm2 status` — confirm `kyvern-commerce`, `atlas`, `atlas-attacker`, `agent-pool` all online.

**Checkpoint:** branch created, current state captured, all PM2 processes online.

### 8.2 Phase 1 — Kill the tabs (1.5h)

1. Create `affordance-row.tsx` with three buttons + open-state (`useState<'bay' | 'use' | 'builder' | null>`).
2. Create `device-panel.tsx` shell per §4 (mobile sheet + desktop drawer + backdrop).
3. Modify `src/app/app/page.tsx`: remove `DeviceTabs`, add `AffordanceRow` and the three panels (initially empty placeholders).
4. Confirm `/app` renders with one device home + three buttons that open empty panels.

**Checkpoint:** `/app` shows no tabs. Affordance buttons open empty card panels with correct mobile/desktop behavior. Backdrop blur works. Esc closes.

### 8.3 Phase 2 — Migrate panels (2.5h)

1. Move `deploy-tab.tsx` logic → `open-bay-panel.tsx`. Wrap in `<DevicePanel>`. Verify deploy still works end-to-end.
2. Move `pay-enforce-tab.tsx` top section (Buy/Drain) → `use-device-panel.tsx`. Verify both buttons fire real on-chain.
3. Move `pay-enforce-tab.tsx` advanced section (Playground + Integrate) → `builder-panel.tsx`. Verify Playground returns real signatures.
4. Delete `device-tabs.tsx`, `deploy-tab.tsx`, `pay-enforce-tab.tsx`.

**Checkpoint:** all three panels fully functional. Deploy works. Buy fires. Drain blocks. Playground returns. SDK code copies.

### 8.4 Phase 3 — Reframe workers (5h)

1. Run migration `add_agent_config.sql`. Confirm `agent.config` column exists with backfilled defaults.
2. Update `SignalKind` union and severity rules.
3. Modify `runner.ts` `bounty_hunter` branch — drafted_application flow with Pay.sh draft generation.
4. Modify `runner.ts` `whale_tracker` branch — watchlist + materiality check via Pay.sh.
5. Modify `runner.ts` `token_pulse` branch — trigger flow (already 80% there).
6. Add three new SignalCard components in inbox.
7. Add three configure-form components on `/app/agents/[id]`.
8. Add `POST /api/agents/[id]/config` endpoint.
9. **`pm2 restart agent-pool`** — critical, runner code is loaded once at process start.
10. Watch logs: each worker should emit at least one new SignalKind within 10 minutes.

**Checkpoint:** each worker has emitted its new SignalKind at least once. Inbox renders new cards correctly. Configure forms save and persist. **DO NOT advance until you have confirmed `pm2 restart agent-pool` and seen new SignalKinds in logs.**

### 8.5 Phase 4 — Surface user benefit (1h)

1. Update `live-status/route.ts` to compute `userOutcome` per worker (from recent signals) and `weeklyBenefit` aggregate.
2. Update `worker-tile.tsx` chip to render the user-outcome subtitle.
3. Update ticker row format — include user-outcome verbs ("Sentinel drafted: ..." not "Wren earned $0.10").
4. Create `working-for-you-strip.tsx` — render aggregate.
5. Wire it between the existing canvas/ticker block and the bottom rail in `app/page.tsx`.

**Checkpoint:** chip subtitles read as user benefits, not internal verbs. Ticker rows are user-outcome-shaped. Strip renders with correct aggregates.

### 8.6 Phase 5 — Genesis framing (45m)

1. Create `genesis-strip.tsx` — `GENESIS DEVICE · v0.1 · ROADMAP →` with subtle styling.
2. Render it below the affordance row in `app/page.tsx`.
3. Create `src/app/roadmap/page.tsx` with three sections:
   - **Shipping at Frontier:** the trio (Bounty Scout, Position Watchtower, Conditional Trigger) · Pay.sh / Gemini · Squads-cosigned device · Anchor policy program
   - **Next:** more bays · more worker presets · more integrations (Jupiter swap, Drift trading, Marinade staking)
   - **Far:** mainnet · cross-device leaderboards · agent reputation
4. Add hint footers in panels: *"More bays unlock as the network grows."* (Open a bay), *"More integrations coming: Jupiter · Drift · Marinade · MagicEden."* (Builder).
5. Final smoke test: 60-second judge journey per §11.

**Checkpoint:** Genesis strip renders. Roadmap link works. Both panel hints show. Judge journey completes in ≤60s.

---

## 9 · What you must NOT touch

- **The canvas.** Workers + wires + vault + halo. Already shipped in `94a2acb`. Do not modify SVG positions, wire colors, vault card, or halo glow.
- **`/atlas`.** Public moat surface. Atlas runner has its own catalogue and cycle. Do not edit.
- **The Anchor policy program.** Deployed at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`. Do not redeploy.
- **`src/lib/policy-engine.ts`.** Pure function, shared across SDK + playground + runner. Do not change signatures or rules.
- **`serverVaultPay` path.** Squads cosign flow. Do not refactor.
- **`/try`, `/unbox`, `/recover`, `/login`.** Auth + onboarding. Do not touch.
- **TopRail + bottom rail + manifesto line + sandbox banner.** Cosmetics shipped in prior phases.
- **Tab 3 backend endpoints.** `buy-atlas-signal`, `drain-attempt`, `playground-pay`, `agent-key`. UI moves into panels; endpoints stay.
- **Atlas's two Pay.sh actions.** Already shipped in catalogue. Do not deduplicate or alter.

---

## 10 · Critical operational notes

1. **`pm2 restart agent-pool` is mandatory after any change to `runner.ts`, `store.ts`, or `tools/*`.** This is the single silent failure mode in this codebase. Code looks deployed; runner is on old code. Bake a restart into every Phase 3 commit.

2. **User vaults default to empty USDC.** Pulse's trigger flow will fail with `vault has insufficient USDC` until topped up. Atlas's vault is funded; pre-fund one demo user vault to ≥$5 USDC for the recording.

3. **Pay.sh inference cost compounds.** Each worker calls Pay.sh / Gemini per cycle. Sentinel @ 10min cadence = ~$0.005/cycle. Wren @ 5min = ~$0.003/material swap. Pulse @ 1min = ~$0.003/poll. Atlas's vault should sustain a day of activity; sanity-check balance before submission.

4. **`trigger_armed` dedup.** Pulse polls every 1 minute. Without dedup, you'll spam the inbox. Emit `trigger_armed` only on state transitions (not-armed → armed), not every poll.

5. **`agent.config` schema is per-template.** `runner.ts` must read the correct shape per `agent.template`. Add a TypeScript discriminated union and a runtime validator (Zod is already in `package.json`).

6. **Pre-seed configs for `/try` guests.** First-time guest devices have empty configs. Inject sensible defaults at vault-creation time so guests see workers doing real things in 30 seconds:
   - Sentinel: `skills = "Solana developer · Rust · TypeScript"`, threshold $300
   - Wren: 3 example whale wallets (use Solana ecosystem-known whales — e.g., DAC Labs, Alameda residual, etc., not memes)
   - Pulse: one trigger on SOL @ $182.50 → $5 to `api.openai.com`

7. **Mobile slide-up sheets need drag-to-close.** Use `@use-gesture/react` (check if already in `package.json`; if not, add it). Without drag, the panel feels modal-trapped.

8. **Focus management.** When a panel opens, move focus to its first interactive element. When it closes, return focus to the affordance button that opened it.

9. **Z-index discipline.** Panels: `z-50`. Backdrop: `z-40`. Affordance row: `z-30`. Canvas: `z-10`. Don't compete.

10. **Don't use `localStorage` or `sessionStorage`** in panel state. Use React state + URL params (`?panel=builder`) so deep-links work.

---

## 11 · Acceptance test (60-second judge journey)

This is the test that says you're done. Run it on a real iPhone, screen-recording.

```
0:00  Land on /  →  hero device + dare
0:05  "Try a Kyvern · no login"
0:15  Land on /app — see:
       ✓ no tabs
       ✓ three workers wired to vault
       ✓ chip subtitles show user-outcomes:
         "2 drafts ready · $325 est"
         "3 alerts today"
         "1 trigger armed · SOL"
       ✓ ticker streaming with worker-named rows
       ✓ "Working for you this week" strip visible
       ✓ three affordance buttons + Genesis strip below
0:25  Tap "↗ Use the device" → panel slides up
       ✓ "Buy a signal $0.01" → ✓ Approved · settled · Atlas signal text · Explorer ↗
0:35  Same panel: "Try to drain $50" → ✗ Blocked · per-tx max · failed sig ↗
0:45  Close panel — back to canvas
       ✓ A new ticker row has appeared from the buy
0:50  Tap Sentinel chip → worker detail panel slides in
       ✓ "What this worker does for you" reads cleanly
       ✓ See actual Gemini draft text
       ✓ Configure form shows skills + threshold + cadence
1:00  Tap "</> Builder" → builder panel slides up
       ✓ Playground form
       ✓ SDK code with Pay.sh toggle
       ✓ Agent key visible
       ✓ "More integrations coming: Jupiter · Drift · ..." footer
```

If every checkpoint passes in ≤60 seconds without typing a password, you're done.

---

## 12 · Hand-off

After Phase 5 checkpoint passes:

1. Run the 60-second journey three times. Record the third one as the demo clip.
2. Take fresh screenshots of `/app` (canvas + ticker filled, chip subtitles populated).
3. Update README.md hero section: lead with *"A Solana device for AI agents. Workers do real jobs. The chain decides every dollar. Solana × Google Cloud Pay.sh runs through every cycle."*
4. Add the demo clip + screenshots to the Frontier submission form.
5. Atlas's `/atlas` page is the second submission artifact — confirm at least one Pay.sh-labeled tx is visible in its timeline.
6. `git push origin feat/device-os-transformation` → merge to main → deploy to `app.kyvernlabs.com`.
7. Smoke-test production once more.
8. Submit.

---

**Build budget reminder:** ≈10–11h total across phases 1–5. If you exceed Phase 3's 5h budget by more than 30 minutes, stop and check in — the worker reframe is the riskiest piece and "almost working" runners ship better than "fully redesigned but broken" ones.

**One last thing.** This product is `v0.1`. Every footer hint, the Genesis strip, the Roadmap page — they all exist to tell the judge *"this is the start, not the end."* That framing is the difference between a hackathon submission and a fundable foundation. Don't let polish-fatigue cut those bits in the final hour. They're cheap and they matter most.

Ship it.
