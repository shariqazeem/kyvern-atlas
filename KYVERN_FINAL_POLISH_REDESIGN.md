# Kyvern App — Final Polish + Multi-Surface Redesign

**For Claude Code execution. Continues from `KYVERN_DEVICE_SHELL_REDESIGN.md` (shipped at git `6a869aa`).**

**Submission deadline:** 2026-05-09 · **Allotted budget:** ≈8h hard timebox · **Risk:** medium

---

## 0 · Read this first

The device shell on `/app` is live. The next pass extends the same shell language to every other surface in the app — `/app/agents/[id]`, `/app/inbox`, `/app/settings` — *and* polishes five remaining items on `/app` itself. The end-state: every page in the Kyvern app feels like a **room in the same device**, not four different applications.

**Design philosophy (read before writing any code):**

This pass aims for **Apple-grade clarity** — not Apple imitation. The principles, applied:

- **Clarity** · text legible, hierarchy obvious, status visible at a glance
- **Deference** · UI yields to content; fewer borders, lighter shadows, more whitespace
- **Depth** · subtle motion + visual layering convey "this is alive," not "this is decorated"
- **Direct manipulation** · tap the thing to act on it; no extra click to "select then act"
- **Restrained color** · grays carry the layout; accents (emerald, amber, red) only signal state
- **Empty states** · inviting, not blank — every empty space teaches what goes there

Reference shapes (study these before starting):
- **iPadOS Mail** — for `/app/inbox` master/detail
- **iOS Settings** — for `/app/settings` information density
- **macOS Big Sur Control Center** — for the control zone aesthetic (already shipped)
- **Notion's nested page navigation** — for routing model
- Across all surfaces: spring physics, never CSS linear transitions

Execute Phase 1 (polish) first — it's 30 minutes and ships immediate quality. Then Phase 2 (worker page), Phase 3 (findings), Phase 4 (settings). Each phase has its own checkpoint.

You will **NOT** touch: `/atlas`, the Anchor program, the policy engine, the Squads cosign path, `/try`, `/unbox`, `/recover`, `/login`, the canvas internals on `/app`, the three drawer panels (Bay/Use/Builder), all Phase 3 worker-runner work. See §9 for the full preserve list.

---

## 1 · The architectural rhyme — shared shell language

Every /app surface follows this pattern:

```
┌──────────────────────────────────────────────────────────────────┐
│  PAGE HEADER (one line, h-14)                                    │  ← per-page context
├──────────────────────────────────────────┬───────────────────────┤
│                                          │                       │
│  PRIMARY ZONE (left, ~60%)               │  SECONDARY ZONE       │
│  The hero content for this surface       │  (right, ~40%)        │
│                                          │  Configure / metadata  │
│                                          │                       │
├──────────────────────────────────────────┴───────────────────────┤
│  STRIP (h-8) — manifesto on /app, page context elsewhere or none │
├──────────────────────────────────────────────────────────────────┤
│       Home              Findings              Settings           │  ← unchanged tab bar
└──────────────────────────────────────────────────────────────────┘
```

**On every surface:**
- Page header is **one line, hairline border bottom**, never a heavy block
- Two zones with `lg:grid-cols-[1fr_380px]` (or a different ratio per surface — specified below)
- Zones have **no outer card chrome** — content sits directly on the device surface
- Cards within zones have `bg-white border border-zinc-200/60 rounded-2xl` and only the *minimum* shadow needed (`shadow-[0_1px_3px_rgba(0,0,0,0.04)]`)
- Bottom tab bar is shared (preserved untouched)
- Each surface fits in 100dvh on desktop ≥1024px with no scroll
- On mobile <768px: vertical stack, tight, scroll acceptable

This consistency is the win. A judge tapping between Home → Findings → Settings sees the same architectural language. That's what makes it feel like a device, not a website.

---

## 2 · Phase 1 — `/app` polish (30 min)

Five fixes, all small. No new components. Each is a 5–10 minute change.

### 2.1 Slim the OS shell on /app

**Problem:** `kyvern-os.tsx` renders a top bar with `Kyvern · ● solana devnet · KVN-1LQOFFOU` *above* the new `IdentityStrip`. Device identity appears twice.

**Fix:** in `src/components/os/kyvern-os.tsx`, when on `/app` exact path (not sub-routes), render only the `Kyvern` wordmark on the left. The right-side network + serial pill is dropped because IdentityStrip owns that on `/app`. On all other paths (`/app/agents/[id]`, `/app/inbox`, `/app/settings`), the OS bar can keep its current treatment — those pages get their own `PageHeader` that owns identity (specified below).

```tsx
// pseudocode
const isAppHome = pathname === '/app';
return (
  <header className="...">
    <KyvernLogo />
    {!isAppHome && <NetworkSerialPill />}
  </header>
);
```

### 2.2 Delete the floating + ADD FAB

**Problem:** `device-fab.tsx` still renders a floating `+ ADD` button in the bottom-right of `/app`. Redundant with the new `+ Open a bay` affordance pill in the control zone.

**Fix:** remove `<DeviceFAB />` from `src/app/app/page.tsx`. Delete `src/components/device/home/device-fab.tsx` if not used elsewhere.

### 2.3 Delete `VIEW FULL ACTIVITY ↑`

**Problem:** the vestigial pull-up trigger from the pre-canvas era still renders below the manifesto strip. Adds vertical scroll, no longer needed.

**Fix:** remove the `<ActivitySheet />` trigger row from `/app/page.tsx`. The `ActivitySheet` component itself can stay in the codebase if anything still references it; just unmount its trigger from `/app`.

### 2.4 Make affordance pill labels substantive

**Problem:** `+ Bay` and `↗ Use` are too cryptic on desktop. There's room.

**Fix:** in the `AffordancesBlock` component, change labels:
- `+ Bay` → `+ Open a bay`
- `↗ Use` → `↗ Use the device`
- `</> Builder` → `</> Builder` (unchanged)

Pill heights stay the same; text just fills more of the available width.

### 2.5 Pull the daily-cap card up to meet the wires

**Problem:** in the canvas, wires terminate ~20px above the daily-cap card. Visual disconnect.

**Fix:** in the canvas vault component (compact mode), reduce the top margin so the card sits flush against the wire end-points. Try `mt-0` and adjust SVG vertical extent if needed. Verify on desktop and mobile widths.

### Phase 1 checkpoint

- [ ] `/app` desktop: no duplicate identity, no FAB, no view-full-activity, affordance labels expanded
- [ ] Wires touch the daily-cap card
- [ ] No regressions on drawer behavior
- [ ] `next build` clean

---

## 3 · Phase 2 — `/app/agents/[id]` redesign (worker page) — 3.5h

The current worker page is a six-section vertical settings page with a big chassis card at top. It reads as a different application from `/app`. **Apply the same shell language.** The worker page becomes a "mini /app" for that specific worker.

### 3.1 Layout target

```
┌──────────────────────────────────────────────────────────────────┐
│ ← KVN-1LQOFFOU · Sentinel · Bounty Scout       Up 8h · 62 checks │  worker header (h-14)
├──────────────────────────────────────────┬───────────────────────┤
│                                          │  ┌─────────────────┐  │
│  ┌─────────────────────────────────────┐ │  │ CONFIGURE        │ │
│  │ ● LIVE STATE                         │ │  │ Skills           │ │
│  │ Spotted Metaplex release —           │ │  │ [textarea]       │ │
│  │ core v0.12.0                         │ │  │ Min payout · 300 │ │
│  └─────────────────────────────────────┘ │  │ Cadence · [10M]  │ │
│                                          │  │ [Save]           │ │
│  ┌─────────────────────────────────────┐ │  └─────────────────┘  │
│  │ WHAT I DO FOR YOU                    │ │                       │
│  │ Bounty Scout                         │ │  ┌─────────────────┐  │
│  │ I find paid Solana bounties matching │ │  │ TOOLS            │ │
│  │ your skills, draft your application  │ │  │ • watch_url      │ │
│  │ with Pay.sh / Gemini, and queue it   │ │  │ • post_task      │ │
│  │ for one-tap submit.                  │ │  │ • message_user   │ │
│  └─────────────────────────────────────┘ │  └─────────────────┘  │
│                                          │                       │
│  ┌─────────────────────────────────────┐ │  ┌─────────────────┐  │
│  │ WATCHING        CHECKED      STATE   │ │  │ TALK TO SENTINEL │ │
│  │ superteam.fun   8m ago       idle    │ │  │ Suggested:       │ │
│  │ /api/listings   runs 600s    $0.50/tx│ │  │ How are you?     │ │
│  │             ↗                         │ │  │ Show me what...  │ │
│  └─────────────────────────────────────┘ │  │ Take a break     │ │
│                                          │  │                  │ │
│  ┌─────────────────────────────────────┐ │  │ [Type message…]  │ │
│  │ GREETING                             │ │  └─────────────────┘  │
│  │ "Hi. I'm Sentinel. You told me to    │ │                       │
│  │  watch superteam.fun..."             │ │                       │
│  └─────────────────────────────────────┘ │                       │
├──────────────────────────────────────────┴───────────────────────┤
│  ● ECONOMIC TIMELINE                            0 actions today  │  bottom strip (h-12)
│  Still warming up — first economic actions will appear here.     │
├──────────────────────────────────────────────────────────────────┤
│        Home              Findings              Settings           │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Components

**Create:**
```
src/components/device/shell/page-header.tsx
  Generic page header with: optional back-button + breadcrumb left, page-context right.
  Replaces the worker page's heavy chassis-card header.

src/components/device/agent/agent-page-header.tsx
  Worker-specific instance: ← back · emoji · name · template-as-job · uptime · checks
  Wraps PageHeader; adds Pause + Retire icon buttons on far right.

src/components/device/agent/live-state-card.tsx
  Shows the worker's current "live state" string with a pulsing green dot.
  Hero card at top of canvas zone — full width of zone, prominent typography.

src/components/device/agent/about-card.tsx
  WHAT I DO FOR YOU eyebrow + Bounty Scout / Position Watchtower / Conditional Trigger
  + 2-3 line job description (per worker template).

src/components/device/agent/observability-card.tsx
  WATCHING | CHECKED | STATE in a 3-column grid inside one card.
  Includes the budget fragment ($0.50/tx · $5/day) at the bottom right.

src/components/device/agent/greeting-card.tsx
  GREETING eyebrow + the worker's intro message in italicized prose.

src/components/device/agent/configure-card.tsx
  Wraps existing SkillsField / WatchlistEditor / TriggersEditor (Phase 3).
  Adds eyebrow header CONFIGURE. Save button moves into card footer.

src/components/device/agent/tools-card.tsx
  TOOLS eyebrow + bulleted list of tools (replaces the chip-row of tools).

src/components/device/agent/chat-card.tsx
  TALK TO {WORKER_NAME} eyebrow + suggested prompts as pills + input field.
  Replaces the floating chat drawer at the bottom of the page.
  Uses the existing chat handlers; just repositions the UI.

src/components/device/agent/economic-timeline-strip.tsx
  Bottom horizontal strip showing the last 3-5 economic actions.
  Or empty state with the "still warming up" message.

src/components/device/agent/agent-page-shell.tsx
  Composes all of the above into the device-shell layout.
```

### 3.3 What dies

- The big chassis card at top (`KVN-MOD-BOUNTY-HUNTER · UP 8H · stats · runs every 600s`) — its info splits between the new agent header (uptime, checks) + observability card (cadence) + economic timeline (stats).
- The floating right-side worker info card (it duplicated chassis + live state info).
- The `SPECS · PERSONALITY + JOB` collapsible — empty disclosure that adds vertical noise. Cut it.
- The floating chat drawer at the very bottom — promoted to a permanent pane in the right column.
- All inline tool chips (`watch_url`, `post_task`, `message_user`) — they live in the new TOOLS card.

### 3.4 What's preserved

- All Phase 3 Configure form components (`SkillsField`, `WatchlistEditor`, `TriggersEditor`) — drop into `configure-card.tsx` unchanged.
- All chat handlers (`message_user`, talk-to-worker API) — `chat-card.tsx` calls them unchanged.
- Live state data feed.
- Economic timeline data source.
- Pause / Retire button handlers.

### 3.5 Motion + interaction

- **On enter:** the page transitions in with a soft slide+fade (200ms spring). Cards stagger in 40ms apart.
- **Configure save:** button shows a brief loading spinner, then transforms to a green checkmark for 1.2s, then back to "Save". Spring physics on the transform.
- **Chat send:** input clears with a subtle fade, message appears in chat thread above with a slide-in-from-bottom (spring).
- **Pause toggle:** button color shifts amber → emerald with a 200ms transition; a subtle pulse on the live-state card to confirm.
- **Retire:** opens a confirm modal (use the same `<DevicePanel>` shell so it feels consistent — drawer-style on mobile, dialog on desktop).

### 3.6 Mobile

Below 1024px the layout collapses to single column. Order:
1. Worker header
2. Live state card
3. About card
4. Observability card
5. Greeting card
6. Configure card
7. Tools card
8. Chat card
9. Economic timeline strip
10. Tab bar

Each card fits viewport width. Total scroll ~1.4× viewport on mobile, acceptable.

### Phase 2 checkpoint

- [ ] `/app/agents/[id]` shows worker page header with back link to `/app`
- [ ] No big chassis card at the top
- [ ] Two-column on desktop ≥1024px
- [ ] Live state card is hero
- [ ] Configure form saves correctly (no Phase 3 regression)
- [ ] Chat works (existing handlers untouched)
- [ ] Pause + Retire buttons work
- [ ] Tap Sentinel chip on `/app` → smooth transition to detail
- [ ] Back button → smooth transition back to `/app`

---

## 4 · Phase 3 — `/app/inbox` redesign (Findings) — 2.5h

The current inbox is seven cards stacked vertically with a heavy header block. **Apply iPadOS Mail master/detail pattern.** On desktop, list left + selected detail right. On mobile, list view, tap pushes detail screen.

### 4.1 Layout target — desktop

```
┌──────────────────────────────────────────────────────────────────┐
│ ●  KVN-1LQOFFOU · Solana devnet              FINDINGS · 7 unread │  page header
├────────────────────────────┬─────────────────────────────────────┤
│  FILTERS                   │  ┌─ Selected finding ──────────┐    │
│  [All 7] [Unread 7]        │  │ INFO · ANNOUNCEMENT          │    │
│  [All workers ▼]           │  │ Solana Foundation Launches   │    │
│                            │  │ Pay.sh in Collaboration      │    │
│  ─────                     │  │ with Google Cloud            │    │
│                            │  │                              │    │
│  ● core v0.12.0            │  │ 🎯 Sentinel · 8h ago         │    │
│  RELEASE · Sentinel · 7h   │  │                              │    │
│  ───                       │  │ Source: solana.com           │    │
│                            │  │                              │    │
│  ● Release v4.0.0-rc.0     │  │ Solana Foundation in         │    │
│  RELEASE · Sentinel · 7h   │  │ collaboration with Google    │    │
│  ───                       │  │ Cloud introduced Pay.sh,     │    │
│                            │  │ a gateway service designed   │    │
│  ● v1.0.2                  │  │ to bridge the gap between... │    │
│  RELEASE · Sentinel · 8h   │  │                              │    │
│  ───                       │  │ Recently published           │    │
│                            │  │                              │    │
│  ● getTransfersByAddress   │  │ ┌──────────────────────────┐ │    │
│  ANNOUNCEMENT · 8h         │  │ │  [↗ Read more]            │ │    │
│  ───                       │  │ │  [✓ Mark read]            │ │    │
│                            │  │ │  [✕ Dismiss]              │ │    │
│  ● Solana Foundation...    │  │ │  [⏰ Snooze 4h]            │ │    │
│  ANNOUNCEMENT · 8h  ✓      │  │ └──────────────────────────┘ │    │
│  ───                       │  │                              │    │
│                            │  └──────────────────────────────┘    │
│  ● Colosseum Codex         │                                      │
│  ANNOUNCEMENT · 8h         │                                      │
│  ───                       │                                      │
│                            │                                      │
│  ● Solana Summit Kazakh.   │                                      │
│  OBSERVATION · 8h          │                                      │
│                            │                                      │
├────────────────────────────┴─────────────────────────────────────┤
│        Home              Findings              Settings           │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 List column (left, ~360px)

- Filter chips at top: `[All N]` `[Unread N]` `[All workers ▼]`
- Below: list of findings as **single-line rows** with hairline dividers
- Each row: severity dot (left) · title · `KIND · WORKER · ago` (subtitle) · unread indicator (right)
- Row height ~60px, padding generous, hover state with subtle background change
- Selected row: subtle accent background + accent left border
- Click → updates selected detail in right pane (desktop) / pushes to `/app/inbox/[id]` (mobile)

### 4.3 Detail column (right, fills remaining)

- One scrollable card with the selected finding's full content
- Title at top (text-xl semibold)
- Worker chip + ago + KIND chip below title
- Source meta as monospace text
- Body content (LLM-generated summary if present, or evidence list)
- Action buttons at the bottom: `Read more` / `Mark read` / `Dismiss` / `Snooze 4h` (where applicable)
- Empty state when nothing selected: *"Select a finding to read it here."* with an arrow pointing left

### 4.4 Page header

Use the new `<PageHeader>` component:
```
●  KVN-1LQOFFOU · Solana devnet              FINDINGS · 7 unread
```

Right side shows page context: `FINDINGS · 7 unread`. On the today indicator (`0 new today · 273 checks`), move that into a subtle subtitle line under the page-context label, or drop entirely (it's not load-bearing).

### 4.5 Mobile

Below 768px:
1. Page header
2. Filter chips
3. List of finding rows (full width)
4. Tab bar

Tap a row → push to `/app/inbox/[id]` route. That page renders detail-only with `← Findings` back button at top. iOS Mail mobile pattern.

### 4.6 Components

**Create:**
```
src/components/device/inbox/inbox-page-shell.tsx
src/components/device/inbox/findings-list.tsx
src/components/device/inbox/finding-row.tsx           — compact single-line row
src/components/device/inbox/finding-detail.tsx        — full detail panel
src/components/device/inbox/inbox-empty-state.tsx     — for desktop right pane when nothing selected
src/components/device/inbox/filters-bar.tsx           — filter chips
src/app/app/inbox/[id]/page.tsx                       — mobile detail route
```

**Modify:**
```
src/app/app/inbox/page.tsx
  Compose: PageHeader + (desktop: master+detail | mobile: list-only)
```

### 4.7 What dies

- The big "Findings" title block + "Read-only feed of what your workers surfaced" description (page context now lives in PageHeader)
- The split stat row (7 total · 7 unread) — folded into PageHeader subtitle
- The "TODAY · 0 new findings · 273 checks" pill row — drop or move to subtitle
- The bulky cards with full evidence shown by default — compressed to single-line rows
- The action buttons-per-card — they live in detail pane only

### 4.8 Motion

- Row tap: 200ms spring, accent slides in
- Detail pane: 150ms fade-in for content swap
- Mobile push: standard iOS push transition
- Action buttons: subtle press feedback (scale 0.98)

### Phase 3 checkpoint

- [ ] `/app/inbox` desktop: master/detail side-by-side
- [ ] List rows compact, single line, dividers hairline
- [ ] Tap a row → detail updates in right pane
- [ ] Detail shows full content + action buttons
- [ ] Filter chips work
- [ ] Mobile: list view, tap pushes to `/app/inbox/[id]`
- [ ] `← Findings` back button on mobile detail
- [ ] All Mark read / Dismiss / Snooze handlers work (existing API)

---

## 5 · Phase 4 — `/app/settings` redesign — 1.5h

The current settings page has heavy card-on-page chrome with nested device list and a 2x2 account sub-grid. **Apply same shell language; flatten the chrome.**

### 5.1 Layout target

```
┌──────────────────────────────────────────────────────────────────┐
│ ●  KVN-1LQOFFOU · Solana devnet                       SETTINGS   │  page header
├──────────────────────────────────────────┬───────────────────────┤
│                                          │                       │
│  DEVICES · 3 yours · plus Atlas          │  ACCOUNT              │
│                                          │                       │
│  ┌──────────────────────────────────────┐│  WALLET               │
│  │ Atlas KVN-0000 · alive               ││  AqJv3q…iyU6aj  📋    │
│  │ Reference device · running since     ││                       │
│  │ Apr 20 · 1124 settled · 3004 attacks ││  NETWORK              │
│  │ blocked · $0 lost                  → ││  ● Solana devnet      │
│  └──────────────────────────────────────┘│                       │
│                                          │  ─────                │
│  ┌──────────────────────────────────────┐│                       │
│  │ Kyvern AQJV3QQ7 KVN-1LQOFFOU · alive ││  PROGRAMS             │
│  │ devnet                              →││  Budget               │
│  └──────────────────────────────────────┘│  PpmZEr…MSqc ↗        │
│                                          │                       │
│  ┌──────────────────────────────────────┐│  Squads               │
│  │ Kyvern AQJV3QQ7 KVN-FGE_0BQN · alive ││  SQDS4e…2pCf ↗        │
│  │ devnet                              →││                       │
│  └──────────────────────────────────────┘│  ─────                │
│                                          │                       │
│  ┌──────────────────────────────────────┐│  SIGN OUT             │
│  │ Kyvern AQJV3QQ7 KVN-3PSE66A9 · alive ││  Ends Privy session.  │
│  │ devnet                              →││  Devices stay         │
│  └──────────────────────────────────────┘│  on-chain.            │
│                                          │  [Sign out →]         │
│                                          │                       │
│                                          │  ─────                │
│                                          │                       │
│                                          │  ⓘ Pre-alpha. Devnet  │
│                                          │  only. Squads v4 is   │
│                                          │  audited 3× and       │
│                                          │  secures $10B+ today. │
│                                          │                       │
├──────────────────────────────────────────┴───────────────────────┤
│        Home              Findings              Settings           │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Devices column (left)

- Eyebrow header: `DEVICES · 3 yours · plus Atlas`
- List of device rows as cards (one card per device)
- Atlas row: subtle accent border (it's the reference, slightly distinguished)
- User device rows: standard treatment
- Each row clickable → navigates to that device (eventually; can be a no-op for now if multi-device switching isn't shipped)

### 5.3 Account column (right)

- `WALLET` block: address (monospace, truncated middle), inline copy button with ✓ feedback on copy
- `NETWORK` block: green dot + "Solana devnet"
- `PROGRAMS` block: Budget + Squads, each as a label + monospace truncated address with ↗ Solana Explorer link
- `SIGN OUT` block: 1-line description + button (red accent button, secondary visual weight)
- Pre-alpha disclaimer at the bottom: muted text, info icon, no card chrome — just inline text

### 5.4 Components

**Create:**
```
src/components/device/settings/settings-page-shell.tsx
src/components/device/settings/devices-list.tsx
src/components/device/settings/device-row.tsx           — Atlas variant + user variant
src/components/device/settings/account-panel.tsx
src/components/device/settings/wallet-block.tsx
src/components/device/settings/network-block.tsx
src/components/device/settings/programs-block.tsx
src/components/device/settings/sign-out-block.tsx
src/components/device/settings/disclaimer-strip.tsx
```

**Modify:**
```
src/app/app/settings/page.tsx
  Compose with new components and shell layout.
```

### 5.5 What dies

- Big "Settings" title block with `YOUR KYVERN · SETTINGS` eyebrow (page context lives in header)
- The outer `Devices` and `Account` cards (sections become flat columns, no card chrome)
- The 2x2 account sub-grid (becomes a single panel of stacked blocks)
- The standalone disclaimer card (becomes inline muted text)

### 5.6 Mobile

Below 768px: stack — devices column first, account column below. Each block is full width. Standard.

### Phase 4 checkpoint

- [ ] `/app/settings` desktop: two-column, no big card chrome
- [ ] Devices list shows Atlas accent + 3 user devices
- [ ] Account panel: wallet (with copy), network, programs, sign out
- [ ] Pre-alpha disclaimer is inline text, not a card
- [ ] Mobile: stacks cleanly
- [ ] All existing handlers work (wallet copy, sign out, program links)

---

## 6 · Shared shell components

These are used across phases 2–4. Build them once in Phase 2 and reuse.

### 6.1 `<PageHeader>` — `src/components/device/shell/page-header.tsx`

Generic page header. Replaces the big page titles + eyebrows on every non-`/app` page. Hairline border bottom, h-14, full width.

```tsx
type PageHeaderProps = {
  /** Optional back button */
  back?: { href: string; label: string };
  /** Left side identity / context — e.g., serial · network · uptime */
  left: React.ReactNode;
  /** Right side page context — e.g., 'FINDINGS · 7 unread' or 'SETTINGS' */
  right?: React.ReactNode;
};
```

Uses same typography as `<IdentityStrip>` for visual continuity.

### 6.2 `<PageShell>` — `src/components/device/shell/page-shell.tsx`

Generic shell wrapper. Replaces the page-level layout for /app sub-pages.

```tsx
type PageShellProps = {
  header: React.ReactNode;
  primaryZone: React.ReactNode;
  secondaryZone?: React.ReactNode;
  bottomStrip?: React.ReactNode;
  /** Override default 1fr_380px on desktop */
  gridCols?: string;
};
```

Renders the standard CSS Grid layout (§1) with header, two zones, bottom strip, and tab bar (the bottom tab bar mounts at the OS level, so PageShell doesn't need to render it).

### 6.3 Card primitives

Already established in prior specs. Use:

```tsx
const cardClassName = `
  bg-white
  border border-zinc-200/60
  rounded-2xl
  p-5
  shadow-[0_1px_3px_rgba(0,0,0,0.04)]
`;
```

Eyebrow header inside cards:
```tsx
<div className="text-xs font-mono uppercase tracking-wide text-zinc-500 mb-3">
  EYEBROW
</div>
```

---

## 7 · Files to create / modify / delete

### 7.1 CREATE (≈30 files)

```
src/components/device/shell/page-header.tsx
src/components/device/shell/page-shell.tsx

src/components/device/agent/agent-page-shell.tsx
src/components/device/agent/agent-page-header.tsx
src/components/device/agent/live-state-card.tsx
src/components/device/agent/about-card.tsx
src/components/device/agent/observability-card.tsx
src/components/device/agent/greeting-card.tsx
src/components/device/agent/configure-card.tsx
src/components/device/agent/tools-card.tsx
src/components/device/agent/chat-card.tsx
src/components/device/agent/economic-timeline-strip.tsx

src/components/device/inbox/inbox-page-shell.tsx
src/components/device/inbox/findings-list.tsx
src/components/device/inbox/finding-row.tsx
src/components/device/inbox/finding-detail.tsx
src/components/device/inbox/inbox-empty-state.tsx
src/components/device/inbox/filters-bar.tsx
src/app/app/inbox/[id]/page.tsx

src/components/device/settings/settings-page-shell.tsx
src/components/device/settings/devices-list.tsx
src/components/device/settings/device-row.tsx
src/components/device/settings/account-panel.tsx
src/components/device/settings/wallet-block.tsx
src/components/device/settings/network-block.tsx
src/components/device/settings/programs-block.tsx
src/components/device/settings/sign-out-block.tsx
src/components/device/settings/disclaimer-strip.tsx
```

### 7.2 MODIFY

```
src/app/app/page.tsx
  - Phase 1: drop DeviceFAB import + render
  - Phase 1: drop ActivitySheet trigger row
  - Phase 1: pass new affordance labels

src/app/app/agents/[id]/page.tsx
  - Phase 2: full rewrite using AgentPageShell

src/app/app/inbox/page.tsx
  - Phase 3: full rewrite using InboxPageShell (master+detail on desktop, list-only on mobile)

src/app/app/settings/page.tsx
  - Phase 4: full rewrite using SettingsPageShell

src/components/os/kyvern-os.tsx
  - Phase 1: conditional rendering — drop network/serial pill on /app exact path

src/components/device/shell/affordances-block.tsx (or wherever affordances are)
  - Phase 1: expand pill labels

src/components/device/home/worker-canvas.tsx (or wherever the canvas lives)
  - Phase 1: pull daily-cap card up to wires
```

### 7.3 DELETE

```
src/components/device/home/device-fab.tsx              (Phase 1)
```

### 7.4 PRESERVE — DO NOT TOUCH

- Canvas internals on `/app` (workers + wires + halo) — already shipped, don't re-touch
- Three drawer panels (`OpenBayPanel`, `UseDevicePanel`, `BuilderPanel`) and `<DevicePanel>` shell
- `IdentityStrip` on `/app` (it's the home page header; sub-pages use new `PageHeader`)
- All Phase 3 worker-runner work (`runner.ts`, `agent.config_json`, signal kinds)
- All Phase 3 configure form components (`SkillsField`, `WatchlistEditor`, `TriggersEditor`)
- All API routes (`live-status`, `playground-pay`, `buy-atlas-signal`, `drain-attempt`, `agent/[id]/config`, etc.)
- `/atlas`, the Anchor program, the policy engine, Squads cosign
- `/try`, `/unbox`, `/recover`, `/login`
- The bottom tab bar (Home · Findings · Settings)
- The `/roadmap` page
- All chat handlers (worker chat API)

---

## 8 · Phased execution plan (in order)

### Phase 0 — Preparation (10m)

1. `git status` clean.
2. `git checkout -b feat/multi-surface-redesign`.
3. `pm2 status` — verify all four processes online (no runner work in this pass; just confirm health).
4. Take screenshots of current `/app`, `/app/agents/[id]`, `/app/inbox`, `/app/settings`.

**Checkpoint:** branch created, baseline captured.

### Phase 1 — `/app` polish (30m)

Execute §2 in order. After each fix, eyeball the result. Final check after all five.

**Checkpoint:** all five fixes shipped, no regressions.

### Phase 2 — Worker page redesign (3.5h)

1. Build `<PageHeader>` and `<PageShell>` (§6) — these are reused in phases 3 + 4.
2. Build the eight `agent/*` components per §3.2.
3. Compose `agent-page-shell.tsx`.
4. Rewrite `src/app/app/agents/[id]/page.tsx` to use the new shell.
5. Verify: tap any worker chip on `/app` → smooth nav → new layout renders → all data populated → configure form saves → chat works → back button returns to `/app`.

**Checkpoint:** all bullets in §3 acceptance criteria pass.

### Phase 3 — Findings redesign (2.5h)

1. Build `inbox/*` components per §4.6.
2. Compose `inbox-page-shell.tsx`.
3. Rewrite `src/app/app/inbox/page.tsx` (desktop master+detail, mobile list-only).
4. Build `src/app/app/inbox/[id]/page.tsx` (mobile detail route).
5. Verify: list renders on desktop, tap row updates detail; mobile list renders, tap pushes to detail; back button returns; all action handlers work.

**Checkpoint:** all bullets in §4 acceptance criteria pass.

### Phase 4 — Settings redesign (1.5h)

1. Build `settings/*` components per §5.4.
2. Compose `settings-page-shell.tsx`.
3. Rewrite `src/app/app/settings/page.tsx`.
4. Verify: desktop two-column, mobile stacks, all handlers work.

**Checkpoint:** all bullets in §5 acceptance criteria pass.

### Phase 5 — Final verification (45m)

1. Walk the full 60-second judge journey (§11 below) on a real iPhone.
2. Run `next build` clean.
3. Cross-page smoke: `/app` → tap Sentinel → worker page → back → tap Findings tab → tap a row → detail → back → Settings tab → smoke check.
4. Cross-page **visual** smoke: every page has the same identity-strip-shaped header, same card treatment, same tab bar. The architectural rhyme is intact.
5. Deploy to production VM.
6. Pull final screenshots for submission.

**Checkpoint:** ready to ship.

---

## 9 · What you must NOT touch (consolidated preserve list)

- Canvas internals on `/app` (wires, halo, worker chip motion, vault SVG positioning)
- The three drawer panels: `OpenBayPanel`, `UseDevicePanel`, `BuilderPanel`
- `<DevicePanel>` shell (the drawer/sheet container)
- `IdentityStrip` on `/app` (home page header, already shipped)
- All Phase 3 worker runner work (`runner.ts`, `store.ts`, `tools/*`)
- `agent.config_json` schema and config form components (`SkillsField`, `WatchlistEditor`, `TriggersEditor`)
- All SignalKind handlers and severity rules
- `/atlas` (entire surface)
- The Anchor policy program, off-chain policy engine, Squads cosign path
- `/try`, `/unbox`, `/recover`, `/login`
- The bottom tab bar (Home · Findings · Settings — Jobs entry stays gone)
- `/roadmap`
- Chat API endpoints
- All PM2 processes — **no runner restarts needed** (this is layout-only work; only Next.js process restart on deploy)

---

## 10 · Critical operational notes

1. **No runner changes.** Only the Next.js / kyvern-commerce process needs restart on deploy. **Do not** `pm2 restart agent-pool` or `atlas` or `atlas-attacker` — they're untouched.

2. **Drawer overlay z-index.** Drawers use `z-50` over `z-40` backdrop. On the new pages (worker / inbox / settings), confirm drawers still cover the entire viewport when opened. Test by triggering any drawer (e.g., a future Retire confirm modal on worker page) and verifying coverage.

3. **Mobile push transitions.** For the inbox `/[id]` route on mobile, use Next.js client-side navigation. Standard `Link` from `next/link` is fine; don't over-engineer with custom transitions unless you have time.

4. **Master/detail state on desktop.** Use a URL search param (`/app/inbox?id=signal_xyz`) for the selected finding so refreshes preserve state and the URL is shareable. On mobile, use the route segment (`/app/inbox/[id]`).

5. **Wallet copy feedback.** When user clicks the copy icon on the wallet address, swap the icon to a green checkmark for 1.5s, then back. Use `navigator.clipboard.writeText`.

6. **Loading states everywhere.** Every async action (config save, chat send, sign out, etc.) should show a loading state. Never freeze the UI. Use a small inline spinner or button transformation.

7. **Empty states are mandatory.** Findings empty state (when 0 findings): friendly illustration or icon + line of copy. Settings empty state isn't applicable. Worker page economic timeline empty state: already specced as *"Still warming up — first economic actions will appear here."*

8. **Test on real iPhone.** Devtools mobile emulation lies about safe areas. Real device testing catches the iOS Safari URL bar issues, the home indicator zone, and drag-to-dismiss feel.

9. **Respect 100dvh, not 100vh.** All shell layouts use `h-[100dvh]` — handles iOS Safari URL bar collapsing.

10. **Time discipline.** This is an 8h hard timebox. If at hour 7 you're still in Phase 4, **revert Phase 4 only** and ship phases 1–3 (settings can be the existing version for one more day; nobody demos settings). Phases 1–3 are non-negotiable.

11. **Don't rebuild what's already abstracted.** `<PageHeader>` and `<PageShell>` are intentionally generic. Worker page, inbox, and settings should all use them. Resist the urge to make per-page shells.

---

## 11 · Final 60-second judge journey (post all changes)

```
0:00  Land on /                 →  hero device + dare
0:05  "Try a Kyvern · no login"
0:15  Land on /app — clean device home, no scroll on desktop:
       ✓ Identity strip top: serial · network · uptime · vault · Squads
       ✓ Canvas left: workers + wires + halo
       ✓ Control right: ticker streaming · this-week · budget · 3 pills · genesis
       ✓ Manifesto strip + tab bar pinned bottom
0:25  Tap "↗ Use the device" pill → drawer slides up
       ✓ Buy a signal $0.01 → ✓ Approved · settled · Atlas signal · Explorer ↗
0:35  Same drawer: Try drain $50 → ✗ Blocked · failed sig ↗
0:45  Close drawer — back to device, ticker has new row
0:50  Tap Sentinel chip → worker page slides in
       ✓ Same shell language: header + canvas-zone + control-zone
       ✓ Live state card hero: "Spotted Metaplex release — core v0.12.0"
       ✓ About card: "Bounty Scout · I find paid Solana bounties..."
       ✓ Configure form on right: skills · min payout · cadence
       ✓ Chat card: "Talk to Sentinel..."
       ✓ Bottom strip: economic timeline
1:00  Tap Findings tab → Inbox renders
       ✓ Master/detail on desktop, list-only on mobile
       ✓ Compact rows · severity dots · tap to read
       ✓ Detail pane shows full evidence + action buttons
1:10  Tap Settings tab → Settings renders
       ✓ Two columns: devices left, account right
       ✓ Atlas accent, user devices, wallet copy, programs link to Explorer
1:15  Judge has now: created device, watched chain decide twice, configured
      a worker, browsed findings, peeked at settings — and every screen
      felt like a room in the same device. Architectural rhyme intact.
```

If this passes in ≤75 seconds on an iPhone, you're done.

---

## 12 · Hand-off

After Phase 5 checkpoint:

1. Walk the journey three times. Record the cleanest as the demo clip.
2. Take screenshots of each surface (desktop + mobile = 8 screenshots total).
3. Update README hero with the best `/app` desktop screenshot.
4. Update Frontier submission with: hero screenshot · 90s vertical demo · 2:30 horizontal demo · `/atlas` link · `/try` link · GitHub.
5. Push to main, deploy production, smoke-test.
6. Submit.

---

## 13 · One last thing

The reason this pass matters most: the prior spec made **`/app`** feel like a device. This pass makes **the entire app** feel like a device. A judge who tabs between Home / Findings / Settings sees the same architectural language repeating. That repetition is what tells them "this team understands their product." It's the single biggest hackathon-judging signal you can send without saying a word.

The polish items in §2 are 30 minutes and they prevent a judge from noticing the duplicate identity / vestigial buttons / cryptic labels. Don't cut them in the final hour to save time. They're cheap and they're what tells the judge this is finished.

Phases 2–4 are where the win compounds. Worker page is the second-most-visited surface in the demo flow (after `/app` itself). Findings is where bounty discovery shows. Settings is the only one a judge might skip — but if they do peek and it looks the same as the rest, the perception locks in.

8 hours. Hard timebox. Phase 5 verification mandatory. Revert Phase 4 only if you must. Don't ship without the §11 journey passing on a real iPhone.

Ship it.
