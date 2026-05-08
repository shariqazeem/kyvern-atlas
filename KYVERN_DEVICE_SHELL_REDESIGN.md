# Kyvern `/app` — Device Shell Redesign

**For Claude Code execution. Continues from `KYVERN_APP_TRANSFORMATION.md` (Phases 1–5 already shipped, git `f46dbad`).**

**Submission deadline:** 2026-05-09 · **Allotted budget:** ≈8h hard timebox · **Risk:** medium

---

## 0 · Read this first

Phases 1–5 of the prior transformation are live and verified. Tabs killed. Three drawer panels shipping. Worker reframe in `agent.config_json`. New SignalKinds rendering. Genesis strip + roadmap. All preserved.

This spec replaces the **layout shell** of `/app` only. The current shell is a single white card (the chassis bezel) wrapping eleven vertically stacked sections. It reads as "webpage about a device." This redesign turns `/app` into an actual device screen: viewport-filling, three zones with fixed roles, no scroll on desktop, minimal scroll on mobile.

Everything inside zones is preserved. The canvas (workers · wires · vault halo) is **not modified**. The drawers (Open a bay · Use the device · Builder) are **not modified** — they continue to overlay this new shell. The worker detail pages, Inbox, Settings, `/atlas`, the Anchor program, all preserved.

You are reorganizing **how** the device home is composed, not what's in it.

---

## 1 · The architectural shift in one paragraph

`/app` becomes a **CSS Grid device shell** with four zones: an **identity strip** at the top (one line, full width — serial · network · uptime · vault balance · Squads), a **canvas zone** on the left (the existing workers + wires + vault visualization, untouched), a **control zone** on the right (live ticker · working-for-you · budget · affordances · genesis — stacked cards), and a **manifesto strip + tab bar** at the bottom (one line + three nav items). The outer chassis-bezel card is **removed entirely** — the device fills the viewport edge-to-edge. On desktop ≥1024px the layout fits in 100dvh with no scroll. On tablet/mobile it stacks vertically with each zone feeling complete.

---

## 2 · The new shell

### 2.1 Desktop ≥1024px (the hero target)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ●  KVN-1LQOFFOU · Solana devnet · Up 8h 7m       VAULT $0.89 · 🛡   │  ← identity (56px)
├──────────────────────────────────────────────┬───────────────────────┤
│                                              │  ┌─────────────────┐  │
│   "Three workers. One vault.                 │  │ ● LIVE TICKER    │ │
│    The chain decides every wire."            │  │  Wren $0.10  ↗   │ │
│                                              │  │  Wren $0.15  ↗   │ │  ← ticker card
│      🎯           🐋           📈           │  │  …               │ │
│   Sentinel       Wren         Pulse          │  └─────────────────┘  │
│   2 drafts · 0   3 alerts     1 trigger      │                       │
│        ╲          │             ╱            │  ┌─────────────────┐  │
│         ╲   wires │   wires   ╱              │  │ THIS WEEK        │ │
│            $0.11 / $5 today                  │  │ 0 · 0 · 0 · $0.05│ │  ← working strip
│            ████░░░░░░                        │  └─────────────────┘  │
│                                              │                       │
│  ── below the canvas, optional dense ──      │  ┌─────────────────┐  │
│                                              │  │ BUDGET           │ │
│  CANVAS ZONE (~60–65%, full height of grid)  │  │ $0.11/$5 daily   │ │
│                                              │  │ 6 calls · 3 ✗    │ │  ← budget card
│                                              │  │ last fb8G…MWVU ↗ │ │
│                                              │  └─────────────────┘  │
│                                              │                       │
│                                              │  [+ Bay] [↗ Use]      │  ← affordances
│                                              │       [</> Builder]   │
│                                              │                       │
│                                              │  GENESIS · v0.1       │  ← genesis strip
│                                              │  ROADMAP →            │
│                                              │                       │
├──────────────────────────────────────────────┴───────────────────────┤
│  $5/day cap · chain decides every dollar · everything else stops    │  ← manifesto (32px)
├──────────────────────────────────────────────────────────────────────┤
│        Home                  Findings                  Settings      │  ← tab bar (64px)
└──────────────────────────────────────────────────────────────────────┘
```

**Everything fits in 100dvh.** Identity 56px + canvas/control flex 1 + manifesto 32px + tab bar 64px = 152px chrome, the rest is content.

### 2.2 Tablet 768–1023px

Identity full width. Below: canvas zone full width (~480px tall), control zone full width below it (stacks the four cards horizontally where possible). Manifesto + tab bar pinned bottom. Light scroll acceptable.

### 2.3 Mobile <768px

Pure vertical stack: identity → whisper line → canvas → ticker card → working card → budget card → affordances pill row → genesis strip → manifesto → tab bar. Each card is full width. The canvas height clamps to ~360px. Total page scrolls ~1.2× viewport.

---

## 3 · Zone-by-zone composition

### 3.1 Identity strip *(NEW component, replaces TopRail)*

**File:** `src/components/device/shell/identity-strip.tsx` (NEW)

**Renders one line** with three left-aligned items + two right-aligned items:

```
●  KVN-1LQOFFOU  ·  Solana devnet  ·  Up 8h 7m          VAULT $0.89  ·  🛡 Squads
```

- `●` is the existing online LED (green pulsing)
- Serial uses `font-mono`, network and uptime use prose, separators are `·`
- Right side: vault balance in `font-mono text-base font-semibold`, then Squads pill

**Replaces:** the existing `TopRail` component which has two stacked rows. Reuse the data, restructure the markup. Delete `src/components/device/home/top-rail.tsx` after migration.

### 3.2 Canvas zone

**File:** `src/components/device/shell/canvas-zone.tsx` (NEW — thin wrapper)

Renders:
1. **Whisper line** at top: *"Three workers. One vault. The chain decides every wire."*
2. **The existing canvas component** — workers + wires + vault halo. **DO NOT MODIFY THE CANVAS INTERNALS.** Just place it in this zone.

**Vault inside canvas changes:** the existing big vault card showing `$0.89 USDC` + Squads needs slimming because identity strip already owns balance and Squads attribution. Keep the vault as the wire-termination visual but:
- Drop the `$0.89` balance text (lives in identity now)
- Drop the `🛡 Squads · devnet` line (lives in identity now)
- Keep the daily-cap progress bar + `$0.11 / $5 today` label
- Keep the green halo (anchors the wires visually)

If the vault component isn't easily configurable to hide those fields, add a `compact?: boolean` prop and render the slim version when true.

### 3.3 Control zone *(NEW)*

**File:** `src/components/device/shell/control-zone.tsx` (NEW)

A vertical flex column holding five cards/blocks in this order:

#### 3.3.1 Live Ticker card *(top — hero of control zone)*

Existing live ticker logic, wrapped in a card. Header `● LIVE TICKER` left, `ON-CHAIN · SOLANA DEVNET` right. Up to 4 rows visible at a time (instead of 6, since we have less vertical space here). Older rows fade out the bottom.

#### 3.3.2 This Week card

The existing `WorkingForYouStrip` content, wrapped in a card. Compact one-line format: `0 · 0 · 0 · $0.05 AI · $5 cap` with tiny labels above each number. Header eyebrow: `THIS WEEK`.

#### 3.3.3 Budget card

The existing `BottomRail` content, repurposed as a card. Header eyebrow `BUDGET`. Three lines:
```
$0.11 / $5 daily      ████████░░░░
6 calls · 3 blocked
last tx fb8G…MWVU ↗
```

#### 3.3.4 Affordances row

Three buttons. **Compact pill style** (not full-width CTA). Layout: `+ Bay` and `↗ Use` side-by-side on top row, `</> Builder` full width below — OR three across if width allows.

```tsx
<div className="grid grid-cols-2 gap-2">
  <PillButton icon="plus">Bay</PillButton>
  <PillButton icon="arrow-up-right">Use</PillButton>
  <PillButton icon="code" className="col-span-2">Builder</PillButton>
</div>
```

Each button opens its existing drawer (no logic change — just visual treatment). Subtitle text under each button removed for compactness.

#### 3.3.5 Genesis strip

The existing `GenesisStrip` component, but visually integrated into the control zone (smaller, no extra padding above). Two lines:
```
GENESIS DEVICE · v0.1
ROADMAP →
```

### 3.4 Manifesto strip

**File:** `src/components/device/shell/manifesto-strip.tsx` (NEW)

One line, full width, centered, low-emphasis:
```
$5/day cap · chain decides every dollar · everything else stops
```

Replaces the multi-line manifesto block in current `BottomRail`.

### 3.5 Tab bar

**Existing component**, no change. Keep `Home · Findings · Settings`. Already removed Jobs.

---

## 4 · The grid system

### 4.1 Page-level CSS

In `src/app/app/page.tsx`, replace the current chassis-wrapped layout with:

```tsx
<div className="device-shell">
  <IdentityStrip />
  <main className="device-grid">
    <CanvasZone />
    <ControlZone />
  </main>
  <ManifestoStrip />
  <TabBar />
</div>
```

### 4.2 Tailwind config additions

In `tailwind.config.ts`, add custom utilities or use arbitrary values inline. Example with arbitrary values:

```tsx
<div className="
  h-[100dvh] flex flex-col
  bg-zinc-50/50
  max-w-[1440px] mx-auto
">
  <IdentityStrip className="h-14 px-6 border-b border-zinc-200/60" />

  <main className="
    flex-1 min-h-0
    grid gap-6 p-6
    grid-cols-1
    lg:grid-cols-[1fr_380px]
    grid-rows-[1fr_auto] lg:grid-rows-1
  ">
    <CanvasZone className="min-h-0 lg:row-span-1" />
    <ControlZone className="min-h-0 lg:row-span-1 overflow-y-auto" />
  </main>

  <ManifestoStrip className="h-8 text-center text-xs text-zinc-500" />
  <TabBar className="h-16 border-t border-zinc-200/60" />
</div>
```

### 4.3 Critical sizing rules

- **`100dvh` not `100vh`** — handles iOS Safari URL bar.
- **`min-h-0` on grid children** — required for `overflow-y-auto` to actually work inside a grid cell.
- **`max-w-[1440px] mx-auto`** — the device has a max width on huge displays; centered. (Not full-bleed — that breaks the device feeling on 4K monitors.)
- **No outer chassis bezel.** No rounded card. No shadow on the page-level container. The device IS the viewport.

### 4.4 Background

`bg-zinc-50/50` — slightly off-white, NOT a separate "page background with card on top." This is the device's own ambient surface.

---

## 5 · Files to create / modify / delete

### 5.1 CREATE

```
src/components/device/shell/identity-strip.tsx
src/components/device/shell/canvas-zone.tsx
src/components/device/shell/control-zone.tsx
src/components/device/shell/manifesto-strip.tsx
src/components/device/shell/control-cards/ticker-card.tsx
src/components/device/shell/control-cards/this-week-card.tsx
src/components/device/shell/control-cards/budget-card.tsx
src/components/device/shell/control-cards/affordances-block.tsx
```

### 5.2 MODIFY

```
src/app/app/page.tsx
  - Replace entire chassis composition with new device-shell layout (§4.2)
  - Remove DeviceChassis wrapper
  - Compose IdentityStrip + CanvasZone + ControlZone + ManifestoStrip
  - Drawer mounts unchanged

[existing canvas component file]
  - Add `compact?: boolean` prop OR
  - Inside the canvas, hide the balance text + Squads attribution when rendering inside the new shell
  - Keep wires, vault halo, daily-cap progress bar
  - DO NOT touch wire animations, halo glow, worker chip motion, or any SVG positioning

src/components/device/home/working-for-you-strip.tsx
  - Refactor into ThisWeekCard format (compact card, eyebrow header)
  - Keep data-fetching unchanged

src/components/device/home/genesis-strip.tsx
  - Tighten styling for in-control-zone use (smaller padding, two-line max)
  - Same data + roadmap link
```

### 5.3 DELETE (after migration)

```
src/components/device/home/chassis.tsx
src/components/device/home/top-rail.tsx
src/components/device/home/bottom-rail.tsx
```

The `BottomRail` content (budget gauge + manifesto) splits across the new `BudgetCard` and `ManifestoStrip`.

### 5.4 PRESERVE — DO NOT TOUCH

- Canvas internals (workers + wires + vault halo)
- All three drawer components (`OpenBayPanel`, `UseDevicePanel`, `BuilderPanel`)
- The `<DevicePanel>` shell
- `/atlas`, the Anchor program, the policy engine
- Worker detail pages (`/app/agents/[id]`)
- Inbox, Settings, `/try`, `/unbox`, `/recover`, `/login`
- Bottom tab bar component
- All SignalKind handlers and Phase 3 worker reframe work

---

## 6 · Phased execution plan

### Phase 0 — Preparation (15m)

1. `git status` — confirm clean tree (or stash existing work).
2. `git checkout -b feat/device-shell-redesign`.
3. `git log -1` — note current HEAD (should be at or after `f46dbad`).
4. Take screenshots of current `/app` desktop + mobile for before/after.
5. `pm2 status` — confirm all four processes online (this is layout-only work, no runner restart needed at the end, but verify state first).

**Checkpoint:** branch created, current state captured.

### Phase 1 — Identity strip (1h)

1. Create `identity-strip.tsx` rendering single-line layout per §3.1.
2. Wire to existing `liveStatus` data source (serial, network, uptime, vault balance, Squads).
3. Render in isolation at top of `/app/page.tsx`, above the existing chassis (temporarily — chassis still rendered for now).
4. Verify it shows correct data on desktop and mobile widths.

**Checkpoint:** identity strip renders correct data, looks clean at all widths, doesn't break existing layout.

### Phase 2 — Grid scaffold (1h)

1. In `app/page.tsx`, build the new shell skeleton per §4.2 with empty placeholder divs for `CanvasZone` and `ControlZone`.
2. Place the new `IdentityStrip` + placeholder zones + `ManifestoStrip` (placeholder) + `TabBar`.
3. **Comment out** the existing chassis temporarily (don't delete yet — fallback).
4. Verify the grid lays out correctly: 100dvh, two columns on desktop, stacked on mobile, no overflow.

**Checkpoint:** page is now device-shell shaped. Identity at top, tab bar at bottom, two empty zones in the middle. No scroll on desktop.

### Phase 3 — Canvas zone (1h)

1. Create `canvas-zone.tsx`. Render whisper line + existing canvas component.
2. Move existing canvas into the canvas-zone slot.
3. Apply the `compact` prop (or inline conditional) to the canvas's vault visualization to hide balance + Squads attribution. Keep daily-cap progress bar + halo.
4. Verify the canvas wires + halo + worker chips still animate correctly.

**Checkpoint:** canvas renders inside the left grid cell. Wires animate. Vault is slimmer. Workers still tappable → drawer still opens.

### Phase 4 — Control zone (2.5h)

1. Create `control-zone.tsx` as a vertical flex column with `gap-4`.
2. Build `TickerCard` — wrap existing ticker logic in a card, cap visible rows at 4.
3. Build `ThisWeekCard` — compact rendering of `weeklyBenefit` data with eyebrow header.
4. Build `BudgetCard` — repurpose the existing `BottomRail` data (daily progress, calls, blocked, last tx).
5. Build `AffordancesBlock` — three pill buttons in a 2-column grid (Bay + Use top row, Builder full-width bottom).
6. Refactor `GenesisStrip` for in-zone rendering (tighter, two-line).
7. Compose all five blocks in `ControlZone` in the order specified.
8. Verify drawer panels still open from the affordance buttons.

**Checkpoint:** control zone shows ticker (live), this-week, budget, affordances, genesis. All five render. Affordances open correct drawers. Live data updates via existing polling.

### Phase 5 — Manifesto + cleanup (45m)

1. Create `manifesto-strip.tsx` with one-line centered text per §3.4.
2. Render below `<main>` in the page.
3. Remove the commented-out chassis composition.
4. Delete `chassis.tsx`, `top-rail.tsx`, `bottom-rail.tsx`.
5. Run `next build` to confirm no broken imports.

**Checkpoint:** clean build. No legacy chassis components remain. Page renders the new shell only.

### Phase 6 — Mobile responsive (1h)

1. Test at 375px, 414px, 768px, 1024px, 1280px viewports (Chrome devtools).
2. At <1024px, grid should collapse to single column. Canvas zone first, control zone below.
3. Identity strip — items wrap or shorten gracefully; vault might move to second line on narrow.
4. Affordance pills — verify usable touch targets (min 44px tall).
5. Tab bar pinned bottom doesn't cover content (use `pb-[env(safe-area-inset-bottom)]` if needed for iOS).

**Checkpoint:** all breakpoints render cleanly. Mobile is stacked but tight. iOS safe areas respected.

### Phase 7 — Polish + verification (45m)

1. Borders + dividers — subtle `border-zinc-200/60`, no heavy shadows on the shell-level elements (cards inside still have shadows).
2. Spacing — visual rhythm between control-zone cards (gap-4 = 16px feels right).
3. Motion — affordance buttons get a subtle hover scale + drawer open transition (already works from Phase 1 of prior spec).
4. Run `next build` once more.
5. Deploy to staging or production VM via your usual flow.
6. Smoke test on actual iPhone — open `/app`, tap each affordance, tap each worker chip, verify drawers, verify scroll behavior.

**Checkpoint:** production-deployed. Real iPhone test passed. No regressions.

---

## 7 · Visual + motion fidelity targets

### 7.1 Cards inside control zone

```tsx
className="
  bg-white
  border border-zinc-200/60
  rounded-2xl
  p-5
  shadow-[0_1px_3px_rgba(0,0,0,0.04)]
"
```

Lighter shadow than drawer panels (those were heavier because they float). Cards in the control zone are embedded, not floating.

### 7.2 Affordance pills

```tsx
className="
  inline-flex items-center justify-center gap-2
  h-12 px-4
  bg-white border border-zinc-200/60
  rounded-xl
  font-medium text-sm
  hover:bg-zinc-50 hover:border-zinc-300
  active:scale-[0.98]
  transition-[background,border,transform] duration-150
"
```

### 7.3 Identity strip typography

```tsx
// serial
<span className="font-mono text-sm font-medium text-zinc-900">KVN-1LQOFFOU</span>

// separators + meta
<span className="text-sm text-zinc-500">Solana devnet · Up 8h 7m</span>

// vault balance
<span className="font-mono text-base font-semibold text-zinc-900">VAULT $0.89</span>
```

### 7.4 No motion changes

The canvas wire animations, halo glow, ticker row entry, drawer slide-ins — all stay exactly as they are. Don't touch motion in this redesign.

---

## 8 · Critical operational notes

1. **No runner changes.** This is layout-only. You do **not** need to `pm2 restart agent-pool` after this work — runners are unaffected. (Restart only kyvern-commerce / Next.js process.)

2. **Drawer overlay stacking.** Drawers currently use `z-50` with `z-40` backdrop (per prior spec §10). These continue to work over the new shell because they're position-absolute/fixed. Verify after Phase 4 — open each drawer and confirm it covers the entire viewport including the new identity strip and tab bar.

3. **Tab bar overlap.** On mobile, when a drawer is open, the tab bar should be hidden behind the drawer's backdrop. Verify by opening Builder drawer on mobile — tab bar must not poke through.

4. **Canvas vault prop.** If you can't easily add a `compact` prop, the fallback is to wrap the canvas in a parent that uses CSS to hide the balance + Squads with `display: none` via a class. Pragmatic, keeps you out of touching canvas internals.

5. **Don't recreate the chassis.** When deleting `chassis.tsx`, resist the urge to rebuild it as a "device frame card." The whole point is no frame — the viewport IS the frame.

6. **Identity strip on very narrow screens.** Below ~360px the identity content might overflow. Use `truncate` on the meta items and `flex-shrink-0` on the vault to keep balance visible.

7. **Time discipline.** This is an 8h hard timebox. If at hour 6 you're still in Phase 4, **revert to `f46dbad` and ship the prior spec's output**. The current state is shippable; this redesign is upside, not necessity.

8. **Test the 60-second judge journey before declaring done.** Same journey as prior spec §11 — should still pass cleanly. If anything regressed, fix or revert.

---

## 9 · Acceptance criteria

You're done when ALL of these are true on a real iPhone + a desktop browser at 1280px:

- [ ] No outer chassis bezel. Device fills viewport.
- [ ] Identity strip is one line at top, shows serial · network · uptime · vault · Squads.
- [ ] Vault balance appears ONCE (in identity strip). Not duplicated inside canvas.
- [ ] Canvas zone takes left column on desktop, full width on mobile.
- [ ] Whisper line renders above canvas: *"Three workers. One vault. The chain decides every wire."*
- [ ] Workers + wires + halo render and animate correctly.
- [ ] Vault inside canvas shows daily cap + progress bar only (no balance, no Squads label).
- [ ] Control zone on desktop shows: ticker → this-week → budget → affordances → genesis (top to bottom).
- [ ] Control zone scrolls within itself if content exceeds height (rare).
- [ ] All three affordance pills open their correct drawers.
- [ ] Drawers cover the full viewport (including identity + tab bar).
- [ ] Manifesto strip shows below main grid, single line.
- [ ] Tab bar at bottom shows Home · Findings · Settings (no Jobs).
- [ ] On desktop ≥1024px: NO vertical scroll on `/app` itself.
- [ ] On mobile <768px: vertical stack works, no horizontal scroll, content reads top-to-bottom cleanly.
- [ ] No regressions on `/app/agents/[id]`, `/app/inbox`, `/app/settings`, `/atlas`, `/try`.
- [ ] `next build` clean, no TS errors, no missing imports.

---

## 10 · 60-second judge journey (post-shell)

```
0:00  Land on /  →  hero device + dare
0:05  "Try a Kyvern · no login"
0:15  Land on /app — see ONE DEVICE SCREEN, no scroll on desktop:
       ✓ Identity strip top: serial + balance + Squads
       ✓ Canvas left: three workers, wires breathing, vault halo
       ✓ Control right: live ticker streaming, this-week, budget, three pills, genesis
       ✓ Manifesto strip + tab bar pinned bottom
0:25  Tap "↗ Use" pill → drawer slides up over the entire device
       ✓ Buy a signal $0.01 → ✓ Approved · settled · Atlas signal · Explorer ↗
0:35  Same drawer: Try drain $50 → ✗ Blocked · failed sig ↗
0:45  Close drawer — back to device screen, ticker has new row
0:50  Tap Sentinel chip → worker detail page
       ✓ Bounty Scout · Configure form · Skills + cadence + min payout
1:00  Judge has now: created device, watched chain decide twice,
      configured a worker, seen the Solana × GCP Pay.sh rail in motion,
      and never lost sight of the device.
```

If this passes in ≤60s on an iPhone, you're done.

---

## 11 · Hand-off

After Phase 7 checkpoint:

1. Run the 60-second journey three times. Record the third as the demo clip.
2. Take fresh `/app` screenshots (desktop + mobile).
3. Update README hero with one of the new screenshots.
4. Push to main, deploy production, smoke-test once more.
5. Submit.

---

## 12 · One last thing

The reason this redesign matters: judges have ~5 seconds when they land on `/app` to decide whether to keep watching. The prior shell makes them think *"oh, a webpage about a device."* The new shell makes them think *"wait, am I inside it?"*

That's not polish. That's the difference between a hackathon submission and a product. Don't let exhaustion in hour 7 cut the manifesto strip or the genesis line — they're 30 seconds of work and they're what tells the judge this is v0.1, not a final form.

8 hours. Hard timebox. Revert at hour 6 if you're stuck. Otherwise — ship it.
