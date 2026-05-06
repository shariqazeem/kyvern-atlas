# Kyvern /app — visual + narrative spec

A read-it-once map of the entire `/app` surface. ASCII wireframes of every section, what each piece does, which file owns it, and how the device metaphor holds end-to-end. Use it to plan changes, share context, or just sketch in your head before touching code.

**Last updated:** 2026-05-07 · **Submission deadline:** 2026-05-09

---

## 0 · The journey wrapping the device

```
┌─────────────────────────────────────────────────────────────────────┐
│ /  (landing)                                                        │
│                                                                     │
│   "A Solana device for your AI agent."                              │
│   "The chain decides every dollar it spends."                       │
│                                                                     │
│   [ Try a Kyvern · no login ]   [ See Atlas live ]                  │
│                                                                     │
│   "Atlas alive 15 days · 6,557 attacks blocked · $0 drained.        │
│    Try to be the 6,558th."                                          │
└─────────────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
      ┌──────────────────┐    ┌──────────────────┐
      │ /try             │    │ /unbox           │
      │ guest sandbox    │    │ Privy login      │
      │ no login         │    │ + cinematic      │
      │ ~5s provisioning │    │ + key reveal     │
      └─────────┬────────┘    └─────────┬────────┘
                └─────────────┬─────────┘
                              ▼
                ┌──────────────────────────────┐
                │ /app                         │
                │ THE DEVICE                   │
                │ (3 tabs · top rail · rails)  │
                └──────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ /atlas   │  │ /docs    │  │ /app/    │
         │ public   │  │ SDK ref  │  │ agents/  │
         │ proof    │  │          │  │ [id]     │
         │ page     │  │          │  │ worker   │
         │          │  │          │  │ detail   │
         └──────────┘  └──────────┘  └──────────┘
```

**Two entry points to /app:**
- `/try` — synthetic wallet in localStorage, real Squads vault on devnet, no login. Sandbox banner persists on /app.
- `/unbox` — Privy auth + cinematic, real recoverable account, no sandbox banner.

Both lead to the same /app — same chassis, same workers, same tabs.

---

## 1 · The chassis (what wraps everything)

```
╔═════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║  [SANDBOX BANNER · only when guest]                                 ║
║                                                                     ║
║  ┌───────────────────────────────────────────────────────────────┐  ║
║  │  TOP RAIL                                                     │  ║
║  │  ● ONLINE   KVN-XXXXXXXX   ·   Solana devnet      Up 1h 33m   │  ║
║  │  ─────────────────────────────────────────────────────────    │  ║
║  │  VAULT   $0.00                            🛡 Squads secured   │  ║
║  └───────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  ┌───────────────────────────────────────────────────────────────┐  ║
║  │  TABS NAV                                                     │  ║
║  │  [ Live Inside ]  [ Deploy Worker ]  [ Pay & Enforce ]        │  ║
║  └───────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  ┌───────────────────────────────────────────────────────────────┐  ║
║  │                                                               │  ║
║  │              TAB CONTENT (one of three views)                 │  ║
║  │                                                               │  ║
║  └───────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  ┌───────────────────────────────────────────────────────────────┐  ║
║  │  BOTTOM RAIL                                                  │  ║
║  │  $0/$5 daily   ▓▓░░░░  ·   1 calls   ·   1 blocked            │  ║
║  │                              [ last tx · 5xK3…hjvx ↗ ]        │  ║
║  └───────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  $5/day cap · chain decides every dollar · everything else stops   ║
║                                                                     ║
║  [ View full activity ▲ ]                                           ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝

[Floating + ]   [ Tab bar at the bottom of the page · Home / Jobs / Findings / Settings ]
```

| Component | File | Role |
|---|---|---|
| `SandboxBanner` | `src/components/device/home/sandbox-banner.tsx` | Guest-mode strip with Sign-in CTA |
| `DeviceChassis` | `src/components/device/home/chassis.tsx` | The white card frame |
| `TopRail` | `src/components/device/home/top-rail.tsx` | Identity row (ONLINE · serial · network · uptime · vault · Squads) |
| `DeviceTabs` | `src/components/device/home/device-tabs.tsx` | Three-tab nav |
| `BottomRail` | `src/components/device/home/bottom-rail.tsx` | Daily-cap gauge + counters + last-tx pill |
| Manifesto line | inline in `/app/page.tsx` | *"$5/day cap · chain decides …"* always-visible |
| `ActivitySheet` | `src/components/device/home/activity-sheet.tsx` | Pull-up sheet housing the demoted dashboard |
| `DeviceFAB` | `src/components/device/home/device-fab.tsx` | Floating + (Top up · Hire) |

The chassis is the **device frame**. Top rail = device header. Tab content = device interior. Bottom rail = scoreboard. Everything inside this frame reads as one cohesive "thing you own."

---

## 2 · Tab 1 — Live Inside

The default view. Where workers run. Tells the full product story in 8 seconds.

```
┌────────────────────────────────────────────────────────────────────┐
│  BANNER (white card)                                               │
│  LIVE INSIDE THE DEVICE                                            │
│  Three starter workers come pre-installed in every Kyvern          │
│  device. They earn, spend, and get blocked by the chain.           │
│  Deploy your own agent next to them.                               │
│                                                                    │
│  Deploy your own worker → · Use the device now →                   │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  [STARTER]       │  │  [STARTER]       │  │  [STARTER]       │
│                  │  │                  │  │                  │
│   ┌────────┐     │  │   ┌────────┐     │  │   ┌────────┐     │
│   │   🎯   │ ●   │  │   │   🐋   │ ●   │  │   │   📈   │ ●   │
│   └────────┘     │  │   └────────┘     │  │   └────────┘     │
│                  │  │                  │  │                  │
│  Sentinel        │  │  Wren            │  │  Pulse           │
│                  │  │                  │  │                  │
│  Found a         │  │  Tried to        │  │  Standing by     │
│  Superteam       │  │  complete a      │  │                  │
│  bounty —        │  │  paid task       │  │  ─────────       │
│  Solana Summit…  │  │                  │  │  Standing by     │
│  ─────────────   │  │  ─────────────   │  │                  │
│  ✓ Earned $0.15  │  │  ✗ Attempted     │  │                  │
│      → Settled   │  │   $0.10          │  │                  │
│                  │  │   → Blocked      │  │                  │
│                  │  │   (daily cap)    │  │                  │
│  ──────────────  │  │  ──────────────  │  │  ──────────────  │
│  LAST SETTLED    │  │  LIVE LOG        │  │  LIVE LOG        │
│  5xK3…hjvx ↗     │  │  View full log → │  │  View full log → │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

**Tile anatomy** (`src/components/device/home/worker-tile.tsx`):

1. **Top-right** STARTER pill + pulsing status LED (green/idle/blocked)
2. **Hero icon** — 56×56 emoji panel (the visual anchor)
3. **Worker name** — 17px / semibold
4. **Verb line** — what they're doing right now (subtle, 13px / 55% opacity)
5. **Outcome line — THE STAR** — pill-shaped, 12.5px / 500 weight:
   - Green ✓ "Earned $0.15 → Settled"
   - Amber ✗ "Attempted $0.40 → Blocked (daily cap)"
   - Neutral "Standing by"
6. **Tx footer** — clickable Solana Explorer pill ("LAST SETTLED · 5xK3…hjvx ↗") OR "LIVE LOG · View full log →" placeholder

**Tap anywhere → `/app/agents/[id]`** (worker detail page, see §6).

**Data flow:**
- `liveStatus.workers[]` for identity + isThinking
- `liveStatus.actionFeed[]` filtered by `worker.id` for verb + outcome + signature
- `lastFinding` (per-worker, from signals table) for fallback when no recent action

---

## 3 · Tab 2 — Deploy Worker

The ownership tab. Add tenants to the device.

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│       [ TOAST: ✓ Sentinel added to your device ]   ← post-deploy  │
│                                                                    │
│  DEPLOY WORKER                                                     │
│  ## Add a worker to this device                                    │
│  Every worker you add runs inside this device — under the same    │
│  Anchor policy program. Pick a preset or wrap your own agent.     │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│                  │  │                  │  │                  │
│   ┌────────┐     │  │   ┌────────┐     │  │   ┌────────┐     │
│   │        │     │  │   │        │     │  │   │        │     │
│   │   🎯   │     │  │   │   🐋   │     │  │   │   📈   │     │
│   │        │     │  │   │        │     │  │   │        │     │
│   └────────┘     │  │   └────────┘     │  │   └────────┘     │
│                  │  │                  │  │                  │
│  Sentinel        │  │  Wren            │  │  Pulse           │
│                  │  │                  │  │                  │
│  Scans 7         │  │  Tracks whale    │  │  Reads live      │
│  ecosystem       │  │  wallets. Posts  │  │  DEX prices.     │
│  feeds.          │  │  intel on $5k+   │  │  Stakes on band  │
│                  │  │  swaps.          │  │  breaches.       │
│                  │  │                  │  │                  │
│  Runs inside     │  │  Runs inside     │  │  Runs inside     │
│  your device ·   │  │  your device ·   │  │  your device ·   │
│  enforced by     │  │  enforced by     │  │  enforced by     │
│  the chain       │  │  the chain       │  │  the chain       │
│                  │  │                  │  │                  │
│  Deploy to       │  │  Deploy to       │  │  Deploy to       │
│  this device  →  │  │  this device  →  │  │  this device  →  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│  ⚙  Or bring your own    │  │  </>  Already have an    │
│      agent               │  │       agent?             │
│                          │  │                          │
│  Pick a template,        │  │  Wrap it in 5 lines ·    │
│  tweak prompt + tools    │  │  SDK + Pay.sh            │
│  + budget.            →  │  │                       →  │
└──────────────────────────┘  └──────────────────────────┘
   /app/agents/spawn               switches to Tab 3
```

**Click flow** (preset card):
1. POST `/api/devices/[id]/deploy-preset` with `{ template: "bounty_hunter" }`
2. Server resolves the spec from template registry (job, personality, tools, frequency, first-60s boot beats)
3. Card animates: ring → check → "Joined the device" badge (1.6s ceremony)
4. **Toast slides in at the top:** *"Sentinel added to your device ✓"*
5. Auto-tab-switches to Tab 1 — the new worker is on stage

**File:** `src/components/device/home/deploy-tab.tsx`

**Copy ban (locked):** never "hire", "marketplace", "catalog". Only "add to this device", "lives inside your device", "runs under your rules".

---

## 4 · Tab 3 — Pay & Enforce

Where you actually USE the device. Two-tier disclosure: newbies see only the moat moment, builders click to expand the toolkit.

### 4.1 — Default view (newbie)

```
┌────────────────────────────────────────────────────────────────────┐
│  [Empty-vault nudge if applicable: "Top up to fire approved spends"]│
│                                                                    │
│  USE YOUR DEVICE RIGHT NOW                                         │
│  ## See the chain decide.                                          │
│  Two real on-chain actions. One settles. One gets blocked.         │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐  ┌──────────────────────────────┐
│  Buy a signal from Atlas     │  │  Try to drain                │
│                  $0.01 USDC  │  │  $50 to disallowed merchant  │
│                              │  │                              │
│  Hits Atlas's public x402    │  │  The chain rejects this      │
│  feed. Routes through the    │  │  before any USDC moves —     │
│  policy program. Approved    │  │  over per-tx cap and         │
│  spends settle on Solana;    │  │  merchant not in allowlist.  │
│  Atlas returns its latest    │  │  Real failed Solana tx.      │
│  discovery.                  │  │                              │
│                              │  │                              │
│  [  ↗  Buy signal      ]     │  │  [  ⛨  Try to drain    ]     │
└──────────────────────────────┘  └──────────────────────────────┘

      ↓ on click → real on-chain → result block:

┌────────────────────────────────────────────────────────────────────┐
│  ✓ Approved · settled                                              │
│  Atlas surfaced: Solana Foundation Launches Pay.sh in              │
│  Collaboration with Google Cloud                                   │
│  53EUTs5u…khQsj3 ↗                                                 │
└────────────────────────────────────────────────────────────────────┘

OR

┌────────────────────────────────────────────────────────────────────┐
│  ✗ Blocked by chain                                                │
│  per-tx max $0.500                                                 │
│  [ real failed tx · 4Lkr…WpG5 ↗ ]                                  │
└────────────────────────────────────────────────────────────────────┘

   ─────────────────────────────────────────────────────

   </>  For builders · test + integrate ▼     ← click to expand
```

### 4.2 — Advanced (builders click to expand)

```
┌────────────────────────────────────────────────────────────────────┐
│  TEST THE POLICY                                                   │
│  ## Punch in any payment. Watch the chain decide.                  │
│  No code. No docs. Real on-chain enforcement of the rules below.   │
│                                                                    │
│  POLICY PLAYGROUND ✨                                              │
│                                                                    │
│  [● Pay.sh · Gemini]  [● $0.05 OpenAI]  [○ $5 → over cap]          │
│                                                                    │
│  Merchant       [ api.openai.com                       ]           │
│  Amount         [ $0.05 ]   max $0.50                              │
│  Memo           [ gpt-4 inference                      ]           │
│                                                                    │
│  RULES   $5 daily · $0.50 per-tx · open merchants · memo required  │
│                                                                    │
│  [ Run through policy ↗ ]                                          │
│                                                                    │
│  Result:                                                           │
│  ✓ Approved · settled · 234ms                                      │
│  Tried $0.05 to api.openai.com — chain settled.                    │
│  53EUTs5u…khQsj3 ↗                                                 │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  INTEGRATE                                                         │
│  ## Wrap your own agent in five lines.                             │
│  The same SDK works with Pay.sh — Solana × Google Cloud's agent    │
│  commerce rail.                                                    │
│                                                                    │
│  Wrap your own agent · Five lines, your chain, your rules.    ✨   │
│                                                                    │
│  [ SDK · Any agent ]   [ Pay.sh · Solana × GCP   NEW ]             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ @kyvernlabs/sdk · this device                       [Copy]  │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ import { OnChainVault } from "@kyvernlabs/sdk";              │  │
│  │                                                              │  │
│  │ const vault = new OnChainVault({                             │  │
│  │   apiKey: "kv_live_5be1d6b…"                                 │  │
│  │ });                                                          │  │
│  │                                                              │  │
│  │ const receipt = await vault.pay({                            │  │
│  │   merchant: "api.openai.com",                                │  │
│  │   amountUsd: 0.05,                                           │  │
│  │   memo: "gpt-4 inference",                                   │  │
│  │ });                                                          │  │
│  │                                                              │  │
│  │ if (receipt.approved) { /* call your downstream API */ }     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  AGENT KEY  kv_live_5be1d6b… [Copy]   [ Mint a key → ]             │
└────────────────────────────────────────────────────────────────────┘
```

**Pay.sh pane (when toggled):**

```
import { OnChainVault } from "@kyvernlabs/sdk";

const vault = new OnChainVault({ apiKey: "kv_live_..." });

// Wrap a Pay.sh call. Solana × Google Cloud (May 2026).
// Kyvern enforces YOUR rules before Pay.sh moves USDC.
const receipt = await vault.pay({
  merchant: "api.pay.sh/gemini",
  amountUsd: 0.05,
  memo: "gemini-pro: weather lookup",
});

if (receipt.approved) {
  const res = await fetch("https://api.pay.sh/gemini/complete", {
    headers: { "X-PAYMENT-SIG": receipt.signature },
    method: "POST",
    body: JSON.stringify({ prompt: "..." }),
  });
}
```

**Files:**
- `src/components/device/home/pay-enforce-tab.tsx` — section orchestration + expander state
- `src/components/device/home/policy-playground.tsx` — the form
- `src/components/device/home/integrate-card.tsx` — SDK + Pay.sh code panes
- `src/app/api/devices/[id]/buy-atlas-signal/route.ts` — backend for Buy
- `src/app/api/devices/[id]/drain-attempt/route.ts` — backend for Drain (also fires `/api/atlas/probe` for fresh failed sigs)
- `src/app/api/devices/[id]/playground-pay/route.ts` — backend for Playground
- `src/app/api/devices/[id]/agent-key/route.ts` — mint + read key prefix

---

## 5 · Bottom rail + manifesto + activity sheet

```
┌────────────────────────────────────────────────────────────────────┐
│  BOTTOM RAIL (always visible across tabs)                          │
│                                                                    │
│  $0.00 / $5 DAILY   ████████░░░░    1 calls    1 blocked    [pill]│
│                                                                    │
│  When vault empty: pill becomes "Fund to fire engine ↗"            │
└────────────────────────────────────────────────────────────────────┘

   $5/day cap · chain decides every dollar · everything else stopped

                  [ View full activity ▲ ]
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │  PULL-UP SHEET (activity-sheet.tsx)     │
        │                                         │
        │  · DiscoveryHero (today's findings)     │
        │  · RevenueTerminal (x402 income feed)   │
        │  · LatestOpportunities (signal preview) │
        │  · ActionFeed (every economic event)    │
        │  · PolicyShield (policy decisions log)  │
        │  · BalanceOrbit (workers around USDC)   │
        │  · TodayStrip (5-cell stat grid)        │
        └─────────────────────────────────────────┘
```

The bottom rail is the live scoreboard. The manifesto line is the brand promise. The activity sheet houses everything that used to clutter Tab 1 in the pre-Live-Engine era.

---

## 6 · Inside a worker (`/app/agents/[id]`)

Tap any tile on Tab 1 → land here.

```
←  Home

┌────────────────────────────────────────────────────────────────────┐
│  CHASSIS HEADER                                                    │
│  ● ONLINE   KVN-MOD-BOUNTY-HUNTER   ·   docked in KVN-XXXXXXXX     │
│  ┌────┐                                                            │
│  │ 🎯 │  Sentinel                                          [⏸] [✕] │
│  └────┘  bounty_hunter · docked into KVN-XXXXXXXX                  │
│                                                                    │
│  +$0.00 earned · $0.00 spent · +$0.00 net      ·    7 checks       │
│  Last check 0m ago · runs every 600s                               │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  LIVE STATE  ✨                                                    │
│  Found a Anchor bounty — core v0.12.0                              │
│  [ ✓ Earned $0.15 → Settled ]   [ 5xK3…hjvx ↗ ]                    │
└────────────────────────────────────────────────────────────────────┘

TOOLS  [ watch_url ] [ post_task ] [ message_user ]

┌────────────────────────────────────────────────────────────────────┐
│  SPECS · personality + job                          [ Show / Hide ]│
│                                                                    │
│  (collapsed by default — power users expand to read system prompts)│
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  ECONOMIC TIMELINE                                                 │
│  · post_task → escrowed $0.15 · 12m ago · UV9j…ppY ↗               │
│  · message_user (kind=opportunity) · 12m ago                       │
│  · watch_url scan · 600s ago                                       │
│  · …                                                               │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  CHAT DRAWER  (sticky bottom)                                      │
│                                                                    │
│  Talk to module · Sentinel                                         │
│  [ How are you doing? ]  [ Show me what you found ]  [ Take a break]│
│                                                                    │
│  [ Talk to Sentinel…                                            →] │
└────────────────────────────────────────────────────────────────────┘
```

**File:** `src/app/app/agents/[id]/page.tsx`

The detail page is a **zoom-in of the home tile** — same emoji, same name, same verb + outcome (now in the bigger LiveStateStrip). Specs + economic timeline + chat add the depth. No marketplace feel.

---

## 7 · The journey end-to-end (60-second judge test)

```
0:00  Land on /  →  hero headline + 6,557 dare
0:05  Click "Try a Kyvern · no login"
0:10  /try plays 4-stage cinematic (~5s)
0:15  Lands on /app — sandbox banner + chassis + 3 tiles
0:20  See Sentinel "Found a Superteam bounty — Solana Summit $10k"
0:25  See Wren "Attempted $0.10 → Blocked (daily cap)"
0:30  Tap Tab 3 → 2 cards (Buy + Drain)
0:35  Click "Buy signal · $0.01" → ✓ Approved · 53EUTs5u…hQsj3 ↗
0:45  Click "Try to drain · $50" → ✗ Blocked + real failed tx pill ↗
0:50  Click "For builders · test + integrate" → playground + Pay.sh code
0:55  Click Pay.sh pane in Integrate card → 8-line snippet
1:00  Judge has now: created device, bought a signal, watched the chain
      reject a drain, seen Pay.sh integration code. Without typing a
      password.
```

That's the entire pitch in 60 seconds. Three real on-chain transactions. Three "I touched the chain" moments. One takeaway code snippet that ties to Solana × Google Cloud's most recent launch.

---

## 8 · The device metaphor — what wraps what

```
                        ┌─────────────────────┐
                        │   /try   /unbox     │
                        │  ENTRY POINTS       │
                        └──────────┬──────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │  /app  =  THE DEVICE             │
                  │                                  │
                  │  ┌────────────────────────────┐  │
                  │  │ TopRail · DEVICE HEADER    │  │
                  │  └────────────────────────────┘  │
                  │  ┌────────────────────────────┐  │
                  │  │ DeviceTabs · DEVICE MODES  │  │
                  │  └────────────────────────────┘  │
                  │  ┌────────────────────────────┐  │
                  │  │                            │  │
                  │  │  THREE WORKERS             │  │
                  │  │  (tenants inside)          │  │
                  │  │                            │  │
                  │  │  🎯  🐋  📈                │  │
                  │  │                            │  │
                  │  └────────────────────────────┘  │
                  │  ┌────────────────────────────┐  │
                  │  │ BottomRail · SCOREBOARD    │  │
                  │  └────────────────────────────┘  │
                  │                                  │
                  │  ANCHOR POLICY PROGRAM            │
                  │  PpmZErWfT5zpeo1fJtTbpqezFGb…   │
                  │  (under everything · enforces)   │
                  └──────────────────────────────────┘
                                   │
                  ┌────────────────┴───────────────┐
                  ▼                                ▼
        ┌──────────────────┐           ┌──────────────────┐
        │ /app/agents/[id] │           │ /atlas           │
        │ ZOOM-IN OF TILE  │           │ PUBLIC PROOF     │
        └──────────────────┘           └──────────────────┘
```

**The pure form of the metaphor:**
- The chassis IS the device frame.
- The tabs ARE the device's modes.
- The workers ARE tenants inside the device.
- The Anchor policy program IS the device's firmware.
- The bottom rail IS the scoreboard.

Every word in the UI either reinforces this metaphor or gets cut. Never "marketplace." Never "hire." Never "agent platform." Always "device," "lives inside," "runs under your rules," "the chain decides."

---

## 9 · What's NOT yet there (be honest)

1. **Tab bar at the bottom of the page** — currently labels are Home / Jobs / Findings / Settings. Could be relabeled to Home / Workers / Activity / Settings for clarity. (`src/components/os/tab-bar.tsx`)
2. **Guided tour overlay on first /app visit** — would walk newbies through the three tabs. Not yet built.
3. **Empty-state CTAs everywhere** — when vault is empty, the bottom rail shows "Fund to fire engine" but other empty states (no opportunities yet, no recent action) don't have friendly nudges.
4. **Migration from /try sandbox to real account on sign-in** — the synthetic guest device doesn't carry over to a Privy account when the user signs in. Post-Frontier work.
5. **Pay.sh "wrap a real call" interactive test** — currently the Playground tests against any merchant string but doesn't actually fire a Pay.sh API call. The Integrate card has the snippet; an interactive "test against api.pay.sh/gemini end-to-end" would close the loop.

---

## 10 · Component map (one-stop reference)

```
src/app/app/page.tsx                         · /app orchestration
src/app/try/page.tsx                          · /try guest sandbox
src/app/unbox/page.tsx                        · /unbox cinematic
src/app/recover/page.tsx                      · /recover paste-key flow
src/app/login/page.tsx                        · /login two-card auth
src/app/atlas/page.tsx                        · /atlas public proof

src/components/device/home/
  ├── chassis.tsx              · device frame
  ├── top-rail.tsx             · ONLINE chip + identity row
  ├── bottom-rail.tsx          · scoreboard
  ├── device-tabs.tsx          · tab nav
  ├── sandbox-banner.tsx       · guest-mode strip
  ├── worker-tile.tsx          · Tab 1 protagonist
  ├── deploy-tab.tsx           · Tab 2 ownership
  ├── pay-enforce-tab.tsx      · Tab 3 orchestration
  ├── policy-playground.tsx    · Tab 3 advanced form
  ├── integrate-card.tsx       · Tab 3 advanced SDK + Pay.sh
  ├── activity-sheet.tsx       · pull-up dashboard
  ├── device-fab.tsx           · floating + button
  └── (legacy: discovery-hero · revenue-terminal · etc — live in sheet)

src/app/api/devices/[id]/
  ├── live-status/route.ts        · the canonical /app polling endpoint
  ├── policy-shield/route.ts      · 15s budget poll
  ├── buy-atlas-signal/route.ts   · Tab 3 Buy (with guest sandbox-treasury support)
  ├── drain-attempt/route.ts      · Tab 3 Drain (fires fresh Atlas probe per click)
  ├── playground-pay/route.ts     · Tab 3 Playground form
  ├── deploy-preset/route.ts      · Tab 2 1-click preset
  └── agent-key/route.ts          · Tab 3 mint + read key prefix
```

---

## 11 · TL;DR for someone landing here cold

`/app` is structured as a real ownable Solana device. Top rail = identity. Bottom rail = scoreboard. Three tabs in between:

- **Tab 1 (Live Inside)** — three pre-installed worker tiles showing live chain enforcement
- **Tab 2 (Deploy Worker)** — add more tenants to the device, animated deploy ceremony
- **Tab 3 (Pay & Enforce)** — use it right now (Buy + Drain hero) + builder toolkit (Playground + SDK + Pay.sh) behind a toggle

The device metaphor is pure. Every word reinforces ownership. Newbies can use it without reading a single technical term. Builders can paste-and-go from any code block in Tab 3.

That's `/app`.
