# SPEC_TO_WIN — Kyvern transformation for Frontier + Kast Pakistan

**Audience:** Claude Code Opus 4.7 executing the changes in this repo.
**Owner decision required:** read §0 and §1 first. Everything else flows from there.
**Submission deadline:** Frontier May 11. Kast Pakistan via Superteam Earn (deck + video + MVP).
**Constraint:** every change must serve the **60-second demo** in §3. Anything that doesn't get cut, hidden, or moved.

---

## 0. The decision (read this first, do not skip)

We are collapsing Kyvern from "consumer device + worker theater + dev infrastructure" into **one** thing:

> **Category:** *Financial safety infrastructure for autonomous agents.*
>
> **Manifesto:** *AI agents shouldn't have private keys. They should have budgets.*
>
> **The company sentence:** *Kyvern enforces agent spending policies on-chain using Solana smart accounts. The chain refuses every action that breaks the rules — before a single lamport moves.*
>
> **The consumer payoff:** *Agent earnings can flow directly into a KAST-funded card via USDC, so the loop ends in real-world spending.*

The first three lines define the company. The fourth grounds the loop. Every surface that doesn't serve them is cut or moved off the main path.

**Why this wins:**
- **Frontier judge** sees a real Anchor program, a real failed-tx Explorer link from a button they pressed themselves, a real npm SDK, a real reference agent running 19 days. Innovation + execution checked off in one click.
- **Kast Pakistan judge** sees a clear loop ("AI manages stablecoins safely, earnings end on a KAST card"), simple UX (one screen, one button, one outcome), real Pakistani-relevant economics ($100 USDC matters), and a clean, honest KAST-rail compatibility statement. Innovation & Impact, Execution, Design & UX, Clarity all earned by the same demo.
- **Same product, two framings.** No double work.

**The framing rule** (do not violate): we are *not* building "an AI experience" or "an agent OS" or "consumer AI." We are building **financial safety infrastructure**. Every word of marketing copy must register that category in the reader's brain on first read. Cinematics, device lore, "born" stamps, orbital workers — all categorize the wrong way and are out.

---

## 1. What's being cut (commit to this before writing code)

These are the cuts. Don't argue with them while implementing — they are the price of clarity.

| Surface | Status | Disposition |
|---|---|---|
| Unboxing cinematic (`/unbox`, KVN serial typewriter, 3-LED boot, "Born" stamp) | **Cut from main path** | Move route to `/legacy/unbox`, unlink from nav. Keep code but it does not appear in the 60-second demo or any submission asset. |
| Worker trio as features (Sentinel, Wren, Pulse on `/app` worker stage) | **Demoted** | They become *example agents in `/docs/examples`*. Not on `/app`. The runner stays running on the VM (don't break Atlas). |
| 3D device hero on landing | **Cut** | Replace with a single live demo widget (the "Drain Atlas" button, see §3). |
| `/app` legacy 9-card dashboard (ActionFeed, RevenueTerminal, PolicyShield, etc.) | **Cut from main path** | Move to `/app/advanced`, unlink from primary nav. |
| Three tabs at top of `/app` (Live Engine, Deploy a worker, Pay & Enforce) | **Replaced** | Single-page developer console: vault details, allowlist, policy settings, decision log, agent key. See §6.3. |
| Pull-up sheet of legacy dashboards | **Cut** | Delete. |
| Pulse-era dashboards still in `/pulse/*` | **Cut** | Delete files; remove any remaining links. |
| "Atlas as feature" framing on `/atlas` | **Reframed as evidence** | Page title changes to *"Proof: 19 days on devnet, $0 lost."* Same data, repositioned as exhibit (see §6.4). |
| `kyvernlabs.com` separate brand from `app.kyvernlabs.com` | **Collapsed** | Both serve identical content. Pick `kyvernlabs.com` as canonical. `app.*` 301s to root or to `/app`. |
| Anything mentioning "device," "KVN serial," "Born," "your Kyvern device" in primary copy | **Cut from primary** | Metaphor stays in long-form blog/about, never on landing or demo. |

**Anti-goal:** if a Frontier judge or a Kast Pakistan judge would have to read more than two sentences before pressing a button that produces a real on-chain failed tx, we have failed.

---

## 2. What stays (and gets sharpened)

| Surface | Status | What happens |
|---|---|---|
| Anchor program at `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` | **Hold** | No code change required for spec. Already deployed, already in the hot path for allowed payments. |
| `@kyvernlabs/sdk` on npm | **Hold + version bump** | Bump to `0.5.0`, add `KastDestination` helper (see §7.2). |
| `npx create-kyvern-agent` scaffolder | **Hold + update default template** | Default scaffold becomes the "wealth manager" example (§7.4). |
| Atlas live runner (PM2 `atlas`) | **Hold** | Keep ticking. It's evidence, not product. Reframe page (§6.4) but do not stop the process. |
| Atlas attacker (PM2 `atlas-attacker`) | **Hold** | Same. Keeps the failed-tx wall populated. |
| Path-B real-failed-tx for cap violations (shipped May 9) | **Hold + extend** | Extend to merchant-allowlist violations too — see §7.5. The "judge clicks button, sees failed tx" moment depends on this. |
| `/api/atlas/probe` and `/api/atlas/status` | **Hold** | Used by the new landing widget. |
| `/docs` | **Hold + tighten** | Remove worker references, add Kast section, add "What this isn't" honesty section (§6.5). |
| Privy auth | **Hold** | Login still works. Just stops being theatrical. |
| Squads v4 vault provisioning | **Hold** | Real on-chain vault creation stays the unboxing. Just no cinematic. |

---

## 3. The 60-second demo (this is the product)

This is what a judge clicks through. Build everything else around it. The demo lives at **`/demo`** as a dedicated page, also embedded as the landing hero.

**State machine:**

| t | Surface | What the judge sees | What's actually happening |
|---|---|---|---|
| 0s | Landing hero | H1: *"AI agents shouldn't have private keys. They should have budgets."* Sub: *"Kyvern enforces agent spending policies on-chain using Solana smart accounts."* Three buttons: **`Launch live demo →`** (primary), `View Explorer proof` (ghost, → `/evidence`), `GitHub / SDK` (ghost). Live counter strip below: *"**19 days live · $0 lost · N attacks blocked** · Atlas reference agent on Solana devnet."* |
| 5s | `/demo` loads | Three-step strip at the top: **1. Watch a block · 2. Watch a settle · 3. Get the SDK.** Live vault tile shows Atlas's address, balance, last cycle. | SSR'd snapshot from `/api/atlas/status`. |
| 10s | Step 1: red button, **"Try to drain Atlas (\$50 to attacker wallet)"** | Judge clicks. Tx submitting modal appears with Solana logo spinner. | POST to `/api/atlas/probe` with a known off-allowlist destination + over-cap amount. **Path-B forces on-chain submission** with `skipPreflight: true`. Returns failed tx signature. |
| 18s | Modal flips to red **"BLOCKED on Solana"** with: tx signature, custom error code (`6026 SpendingLimitExceeded` or `6003 MerchantNotAllowlisted`), "View on Solana Explorer →" button. | Verifiable. Judge clicks Explorer link. Sees a finalized **failed** transaction with the Kyvern program in the instruction trace. **THIS IS THE PRODUCT EARNING ITS RIGHT TO EXIST.** |
| 25s | Step 2: green button, **"Pay an allowed merchant (\$0.05 to api.kast.example)"** | Judge clicks. Modal: "Settling on Solana…" Flips green to **"SETTLED"** with tx signature. "View on Solana Explorer →" | POST `/api/atlas/probe` with allowed merchant + small amount. Real Squads `spendingLimitUse` settles. ~3-5s confirmation. |
| 35s | Step 3: terminal block | One line: `npx create-kyvern-agent my-agent` and a "Copy" button. Beneath: 3-line code preview of `vault.pay(...)`. | Copy-to-clipboard. The scaffolder is real and on npm. |
| 45s | Below the demo: **"Send earnings to a KAST-funded card"** card. | Title: *"Where the loop ends in real life."* Body: *"Agent earnings can flow directly into a KAST-funded card via USDC. Paste your KAST Solana USDC deposit address; we'll allowlist it as `MY_KAST`. Every agent payout to that address is a real on-chain USDC transfer."* One input field, one button (`Allowlist as MY_KAST`). Affiliate link below. | Stores address in vault config; inserts allowlist row. (See §7.3.) |
| 55s | Footer of demo page | *"Built for Solana Frontier. Backed by the chain, not us. SDK on npm, program on devnet, mainnet auditing in progress."* Three logo strip: Solana · Squads · KAST. | Static. |
| 60s | Done. Judge has seen: real failed tx, real settled tx, real install command, real KAST hook. | | |

**Variants of step 1 the judge can pick:**
- "Try to drain $50" → blocked by per-tx cap (program error 6026)
- "Pay an unknown wallet" → blocked by allowlist (program error 6003 — requires §7.5)
- "Skip the memo" → blocked by missing-memo (program error)
- "Pay 10× in 10s" → blocked by velocity cap
- "Pause + try again" → blocked by paused state
- **"Buy Perplexity via pay.sh — over cap"** → real Solana Foundation pay.sh call, real Kyvern refusal, real failed on-chain tx. Ecosystem-grounded, judge instantly recognizes the pay.sh CLI.

Each is a button that posts to `/api/atlas/probe` with different parameters. Each must produce a **real failed Solana tx** with a clickable Explorer link. This is the part of §7 that matters most.

**Companion "settle" buttons in step 2:**
- "Pay an allowed merchant ($0.05)" → vanilla settle path, the existing one.
- **"Buy a $0.001 OCR call via pay.sh"** → real pay.sh paid call wrapped in Kyvern budget, settles on-chain. Pay.sh actually executes the call, the response data shows in the modal as proof. This is the moment the judge sees the *layered ecosystem* working.

---

## 4. Two framings, one product

The same demo is the centerpiece for both submissions. Only the deck and the 2-3 minute video differ.

### 4.1 Frontier framing

- **Headline framing:** *"Financial safety infrastructure for autonomous agents on Solana."*
- **Pitch order in deck/video:** problem (agents need budgets, not keys) → moat (Anchor program enforces every rule on-chain) → SDK (npm, scaffolder) → live demo (the 60s flow) → market (every Solana agent project is a Kyvern integration target).
- **What we emphasize:** technical depth, on-chain proof, ecosystem-level relevance, dev distribution.
- **Track:** *Infrastructure & Developer Tooling.* Cross-list under *AI x Solana.*
- **Banned phrases:** "AI experience," "agent OS," "consumer AI," "device." We're infra.

### 4.2 Kast Pakistan framing

- **Headline framing:** *"Financial safety infrastructure for autonomous agents — with a real-world payoff loop via KAST."*
- **Pitch order in deck/video:** problem (Pakistani freelancers earn in stablecoins, want safe automation, can't trust an AI with their wallet) → solution (Kyvern smart safe + chain-enforced budgets) → live demo (same 60s flow, end with the KAST card flow) → who it's for (Pakistani freelancers, students, remote workers).
- **What we emphasize:** clarity of the loop, real-world endpoint, real $ economics, Pakistan relevance, ecosystem alignment.
- **Track:** *Consumer Applications + AI x Solana + Infrastructure.*
- **Pakistan angle copy beats:**
  - "$100 USDC = ~PKR 28,000 — meaningful money for a student, freelancer, or family."
  - "KAST is the stablecoin card Pakistanis already trust."
  - "Built by a Pakistani solo founder for Pakistani builders."
- **KAST language rules (do not break):**
  - ✗ *"Integrated with KAST"* / *"KAST partner"* / *"KAST integration"*
  - ✓ *"Compatible with KAST deposit rails"*
  - ✓ *"Agent earnings can flow directly into a KAST-funded card via USDC"*
  - ✓ *"Kyvern-compatible payout flow using KAST's existing USDC deposit rail"*
  - The integration speaks via the working product flow + the affiliate link. The wording is honest and powerful precisely because it doesn't overclaim.

**Both decks share 80% of slides.** Slides 1 (problem), 2 (solution), 4 (live demo), 5 (architecture), 8 (team) are identical. Slides 3 (use case) and 6 (market) differ.

---

## 5. KAST compatibility spec (the consumer endpoint)

We are not building against a Kast B2B API (they don't publish one). We are building against the **public Kast surface anyone can use:** every Kast user has a Solana USDC deposit address that can be funded directly on-chain. Send USDC there → it tops up their Kast card → they spend at 150M+ merchants.

This is not a partnership and we never call it one. It's *Kyvern-compatible payout to a KAST-funded card via USDC.* That phrasing is technically accurate, ecosystem-aligned, and impossible to over-claim.

### 5.1 The compatibility in one sentence

A Kyvern vault can allowlist its owner's KAST Solana USDC deposit address as a labelled entry called `MY_KAST`. Every agent payout to that address is a real on-chain USDC transfer. The user spends with their KAST card anywhere VISA is accepted.

### 5.2 What we ship

1. **Kast deposit-address field** on the vault config (UI + DB column, see §6.3 and §7.1).
2. **Special allowlist label** `MY_KAST` shown with a KAST badge (logo, branded color).
3. **One-click "Withdraw earnings to my KAST"** button on `/app` that schedules an agent action to transfer X USDC to `MY_KAST`. (Real Squads tx; verifiable on Explorer.)
4. **Docs section** explaining how to find your Kast Solana USDC deposit address and paste it in (steps with a screenshot).
5. **Demo step** in §3 where the judge pastes any test address (or a pre-filled demo Kast address) and sees the allowlist update + a sample $0.10 payout to it on devnet.
6. **Affiliate link** to KAST signup using the affiliate URL the track provides: `https://go.kast.xyz/VqVO/STPAK`. Used in three places: docs, `/demo` page footer, "Get a KAST card" CTA on `/app`. **This is non-negotiable for the Kast Pakistan submission** — they explicitly request the affiliate link.

### 5.3 Honesty boundaries (write into the docs)

- The KAST deposit address is provided by the user; we don't generate it.
- We can't verify that the address belongs to a Kast account — it's an opaque Solana address from the user's perspective. This is fine; the user owns the address either way.
- KAST card spending happens off-chain, not in our scope. We just route on-chain to KAST's deposit infrastructure.

### 5.4 Bonus stretch (if time allows, do not block on this)

- Detect Kast deposit addresses by deriving them from the user's Kast app (would require an OAuth-style flow Kast doesn't publish — skip).
- Bridge KAST Tag → on-chain (skip, not in their public surface).
- Co-marketing copy ("KAST x Kyvern") — only if you can point to a real conversation with their team. Otherwise, integration speaks via the affiliate link and the visible product flow.

---

## 5B. Pay.sh compatibility spec (the developer-tools weapon)

### 5B.1 What pay.sh actually is

Pay.sh is the **Solana Foundation's** payment layer for HTTP agents. CLI (`pay`, `brew install pay`) plus npx (`@solana/pay`). Wraps any command-line HTTP tool, detects HTTP 402 / x402 / MPP payment challenges, asks the local wallet to sign, retries with payment proof. 72+ services in the catalog already (Quicknode, Perplexity, Wolfram Alpha, Gemini, Google Cloud APIs, fal.ai, weather, search, OCR, TTS, fact-check, etc.).

Their own docs say: *"Real payments still require local user authorization."* That's the only thing standing between their pitch and a fully autonomous agent. **It is exactly what Kyvern resolves.**

### 5B.2 The compatibility in one sentence

Kyvern is the **policy layer above the rails.** Pay.sh executes paid HTTP calls; Kyvern decides which ones the agent is allowed to make. Pay.sh + Kyvern lets an agent run autonomously across pay.sh's catalog without compromising safety — because the budget lives on Solana, not in the user's local wallet approval prompt.

### 5B.3 The strategic position (do not water down)

> Pay.sh lets your agent pay any API. Kyvern lets your agent pay autonomously.

Both companies' value compounds. We are not a pay.sh competitor — we are *the answer to the only line in their pitch that admits a weakness.* Frame it that way in copy and in the deck.

### 5B.4 What we ship

1. **Scaffolder default uses pay.sh.** The default `npx create-kyvern-agent` output makes a real paid pay.sh call wrapped in a Kyvern policy check. See §7.4 for the updated template.
2. **One new `/demo` button**: *"Agent buys a Perplexity search via pay.sh ($X) — exceeds cap, blocked on Solana."* Real x402 flow, real Kyvern refusal, real failed Solana tx. This is the ecosystem-grounded version of the over-cap moment.
3. **Companion `/demo` button**: *"Agent buys a $0.01 fact-check via pay.sh — within cap, settles."* Same plumbing, allowed payment.
4. **Docs section: "Wrap pay.sh with Kyvern in 4 lines."** Concrete code, ready-to-paste, both `brew install pay` and `npm install @kyvernlabs/sdk` shown.
5. **Landing logo strip** adds pay.sh between Squads and KAST.
6. **Slide 5 (architecture)** in both decks shows the layered stack: pay.sh (HTTP rails) + Squads (custody) + KAST (off-ramp) + Kyvern (policy on top of all). One diagram, devastating.
7. **Slide 1 logo bar** in both decks adds pay.sh.

### 5B.5 Language rules (do not break)

- ✗ *"Pay.sh integration"* / *"Pay.sh partner"* / *"Built on pay.sh"*
- ✓ *"Compatible with pay.sh and any HTTP 402 payment rail"*
- ✓ *"Kyvern wraps pay.sh calls in on-chain budgets"*
- ✓ *"The policy layer for the Solana agent payments stack"*

Pay.sh is Solana Foundation, so the ecosystem framing is implicitly aligned — but we never claim official endorsement we don't have. The composability speaks for itself.

### 5B.6 The four-line example (this is the docs section verbatim)

```bash
# 1. Install both tools.
brew install pay
npm install @kyvernlabs/sdk

# 2. Scaffold a Kyvern-protected agent that pays pay.sh APIs.
npx create-kyvern-agent my-agent

# 3. The scaffolded agent calls pay.sh through your Kyvern vault.
#    Every call passes through your on-chain policy. Drains, rogue endpoints,
#    over-cap purchases — all refused before pay.sh even sees them.
cd my-agent && npm start
```

### 5B.7 Verification step (don't skip)

Before shipping the demo button, manually:
1. `brew install pay` on the dev machine.
2. `pay --sandbox curl <a real pay.sh service URL>` — confirm sandbox mode works end-to-end.
3. Pick the cheapest meterable service in the pay.sh catalog (the Alibaba endpoints are $0.001 — perfect). Use that as the demo call.
4. From a Kyvern vault, attempt a payment to that pay.sh service URL with `forceOnChain: true`. Confirm the failed tx signature is real.
5. Run the same with an amount under cap to confirm the settle path works.

### 5B.8 What we don't build (anti-scope-creep)

- A pay.sh services browser inside `/app` — they have a catalog, link to it.
- A `kyvern-pay` wrapper SDK that re-implements pay.sh — pay.sh is the rail, we don't redo it.
- A pay.sh "credential vault" — pay.sh is keyless by design, that's the whole point.
- A custom 402 challenge implementation — defer to pay.sh's MPP/x402 spec.
- Co-marketing pages, "Pay.sh × Kyvern" branded surfaces, joint roadmap claims.

---

## 6. Surface-by-surface specification

### 6.1 Landing page (`/`, file `src/app/page.tsx` or wherever the root page lives — find via codebase search)

The landing page is **minimal**. Above the fold is one statement, one sub, three buttons, one live counter strip. That's it. No 3D, no animations beyond a subtle counter tick.

**Hero (above the fold, one viewport on desktop):**
- H1: `AI agents shouldn't have private keys. They should have budgets.`
- Sub: `Kyvern enforces agent spending policies on-chain using Solana smart accounts.`
- Three buttons (in this order, primary first):
  1. Primary: `Launch live demo →` → `/demo`
  2. Ghost: `View Explorer proof` → `/evidence`
  3. Ghost: `GitHub / SDK` → repo URL
- Live counter strip below buttons (white card, JetBrains Mono numbers, polls `/api/atlas/status` every 5s):
  *"19 days live · $0 lost · N attacks blocked · Atlas reference agent on Solana devnet."*

**Section 2 (below fold, one screen-height):**
- Three-column "How it works":
  1. **Fund a vault.** *"Real Squads multisig on Solana. You hold the keys; the agent gets a session pass."*
  2. **Set policy.** *"Caps, merchant allowlists, kill switch. Compiled to a Solana program at `PpmZ…MSqc`."*
  3. **Run autonomously.** *"Wraps pay.sh, x402, and any HTTP-402 rail with on-chain budgets. Agent earnings can flow to a KAST-funded card."*

**Section 3 (proof strip):**
- Logo strip: Solana · Squads · **pay.sh** · KAST · `npm`
- Below strip: *"Built for Solana Frontier 2026. Devnet today. Mainnet auditing in progress. Compatible with pay.sh and KAST deposit rails."*

**Cut from this page:** 3D device hero, orbital workers, "device serial," any worker mention, the unbox CTA, the entire pull-up sheet pattern. If you're tempted to add anything else above the fold, refer to the §15 filter.

### 6.2 `/demo` (NEW PAGE — `src/app/demo/page.tsx`)

This is the page judges land on. Every other page exists to support this one.

**Layout (top to bottom, single column, ≤900px max width):**
1. Title bar: `Live demo · Solana devnet · Kyvern policy program`
2. Three-step header (1. Block · 2. Settle · 3. Get the SDK)
3. **Vault tile** — Atlas vault info: address (truncated, copy button), balance (USDC), last cycle, last decision. Auto-polls `/api/atlas/status` every 5s.
4. **Step 1 box (red border)**: *"Watch a real attack get blocked on Solana."* Five buttons (one per scenario in §3 variants). Each button POSTs to `/api/atlas/probe` with a different scenario param. Shows a **transaction modal** that walks states: pending → submitting → blocked, with Solana Explorer link.
5. **Step 2 box (green border)**: *"Watch a real allowed payment settle."* One button: *"Pay api.kast.example $0.05."* Same modal pattern, ends in a settled tx.
6. **Step 3 box (white)**: terminal-style block with `npx create-kyvern-agent my-agent`, copy button, three lines of `vault.pay()` SDK code preview.
7. **KAST hook box (KAST brand color border)**: *"Connect your KAST card."* Input + button. Description copy in §5.2.
8. Footer: same as landing footer.

**Interaction details:**
- Each scenario button must show a *visible* Explorer URL after the tx completes. Not buried in a tooltip — directly in the result card.
- Modal must show the actual program-error code (6026, 6003, etc.) — not a generic "blocked" string.
- Use real Solana logos and the actual Solana Explorer favicon to make the link feel concrete.

### 6.3 `/app` (the developer console, replaces existing `/app`)

This becomes a focused control panel. Not theater. Not workers. Just the things a builder needs to manage their vault.

**Sections (single page, no tabs):**
1. **Header** — vault name, address (truncated, copy), USDC balance, "Pause vault" kill-switch button (with confirmation modal), "Resume" if paused.
2. **Policy settings** — daily cap, weekly cap, per-tx cap. Editable inline. "Save" button submits to `/api/vault/update-policy`.
3. **Allowlist** — table of allowed merchants/destinations. Each row: label, address (truncated, copy), badge if `MY_KAST`. "Add merchant" form below.
4. **`MY_KAST` setup** — special form, prominent. Input: KAST USDC deposit address. Button: "Allowlist as MY_KAST." Help text: link to docs section explaining how to find this in the KAST app.
5. **Agent keys** — list of issued `kv_live_...` keys. Show last-used, allow revoke. "Mint a new key" button.
6. **Decision log** — last 50 vault decisions, real-time. Each row: timestamp, agent, action, status (allowed/blocked), reason if blocked, Explorer link if there's a tx signature. Filter dropdown: All / Allowed / Blocked.
7. **Quick actions** — three buttons:
   - `Withdraw to MY_KAST` (only enabled if `MY_KAST` is set) → opens modal with amount input, sends a Squads tx.
   - `Try a policy violation` → opens the same demo modal as `/demo` step 1.
   - `Get a KAST card →` → opens `https://go.kast.xyz/VqVO/STPAK` in new tab.

**What is gone:**
- The 3-tab structure (Live Engine, Deploy a worker, Pay & Enforce). Cut.
- The worker stage. Cut. Move to `/docs/examples`.
- The 9-card legacy dashboard. Cut. Move to `/app/advanced` (still exists, unlinked).
- The pull-up sheet. Delete.

### 6.4 `/evidence` (was `/atlas`, renamed)

**Rename the route from `/atlas` to `/evidence`** (`src/app/atlas/` → `src/app/evidence/`). Add a 301 in `src/middleware.ts`: `/atlas → /evidence`. Every link from the new landing and `/demo` points to `/evidence`. The "Atlas" name remains internally as the *agent name*, but the page lives at `/evidence` because that's what it is psychologically.

Don't redesign the page contents — relabel and trim:

- **New H1:** `Proof — 19 days on devnet, $0 lost, N attacks blocked.`
- **New sub:** `Atlas is our reference agent. It's been running on Solana devnet continuously since April 20, 2026. Every block and every settle is a real on-chain transaction. Click any row to verify it on Solana Explorer.`
- **Cut:** the manifesto block, the device plinth, the "Drain Atlas dare" dare-language framing (the button stays — section heading becomes *"Try it yourself"*).
- **Keep:** earnings hero, economy stats, ledger table, attack wall (60 most-recent failed txs, each clickable to Explorer), three-layer diagram, "Top up Atlas" sponsor button.
- **Add at top:** breadcrumb back to `/demo` (`← Back to live demo`).

**Anti-apology rule for Atlas:** never describe Atlas's scripted decisions as a limitation. Atlas is a *reference agent that proves the infrastructure works.* The intelligence of the agent is not the moat — the **financial control layer** is. Even a deliberately minimal agent demonstrates the thesis. Copy on this page should be matter-of-fact, never defensive.

This page is the museum. Not the product page. Frontier judges arrive here from the landing's `View Explorer proof` button to verify the 19-day claim.

### 6.5 `/docs` (tighten + add KAST section + add honesty section)

Existing structure mostly fine. Edits:

- **Cut** any reference to workers, Sentinel, Wren, Pulse, "your Kyvern device," KVN serials.
- **Add new section: "Wrap pay.sh with Kyvern in 4 lines."** This is now the headline dev guide. Steps:
  1. `brew install pay` (or `npm i -g @solana/pay`). Pay.sh is the Solana Foundation's HTTP-402 payment layer for agents.
  2. `npm install @kyvernlabs/sdk` and create a vault.
  3. Before any `pay --sandbox curl …` call, ask the vault: `await vault.checkAllowance({ merchant: "pay.sh", amount })`. If `decision === "allowed"`, fire pay.sh. If not, log the reason.
  4. Done. Every pay.sh call now passes through your on-chain Kyvern policy. Drains, rogue endpoints, over-cap purchases — refused before pay.sh sees them.

  **Why this matters:** pay.sh's docs say *"Real payments still require local user authorization."* Kyvern is what lets your agent spend autonomously without that human-in-the-loop step — the vault budget on Solana takes the place of the wallet approval prompt.

  **Wording rule:** Kyvern is *compatible with pay.sh and any HTTP-402 payment rail.* We are not partnered with pay.sh. The composability is the integration.
- **Add new section: "Sending earnings to a KAST-funded card."** Steps:
  1. Open the KAST app. Go to `Deposit → Solana USDC`. Copy the address.
  2. In Kyvern `/app`, paste it under `MY_KAST setup`. Click `Allowlist as MY_KAST`.
  3. Done. Any agent payout to `MY_KAST` is a real on-chain USDC transfer that funds your KAST-funded card. [`Get a KAST card →`](https://go.kast.xyz/VqVO/STPAK)

  **Wording note (we follow this in copy):** Kyvern is *compatible with KAST deposit rails*. We are not a KAST partner; we route on-chain to a public deposit address that any KAST user owns. This wording is honest and intentional.
- **Add new section: "What this is, and what this isn't."** Frank list:
  - This is: financial safety infrastructure for autonomous agents — a Solana smart safe, an on-chain policy program, an SDK, and a scaffolder.
  - This isn't: a hardware device, an AI experience, a fully autonomous trading bot, mainnet-deployed, or a financial advisor. Mainnet audit in progress.
  - Atlas is a reference agent that proves the infrastructure works on real Solana devnet over 19+ continuous days. Its decisions are scripted by design — the moat is the financial control layer, not the intelligence. Mainnet readiness comes before agent intelligence; both are post-Frontier.
- **Update Quickstart** to a working 5-line example using the new `KastDestination` helper:
  ```ts
  import { Vault, KastDestination } from "@kyvernlabs/sdk";
  const vault = new Vault({ agentKey: process.env.KYVERNLABS_AGENT_KEY! });
  const myKast = KastDestination.fromAddress(process.env.MY_KAST_ADDRESS!);
  const res = await vault.pay({ ...myKast, amount: 1.50, memo: "weekly yield share" });
  if (res.decision !== "allowed") throw new Error(res.reason);
  ```

### 6.6 `/recover`, `/login`

Keep functional. Remove device/box framing in copy. Use plain language: "Sign in to your Kyvern account." That's it.

### 6.7 `/legacy/unbox` (NEW location for the unbox cinematic)

Move existing `/unbox` route to `/legacy/unbox`. Don't link it from anywhere primary. Keep it alive because the code is beautiful and we may still want it for narrative video shots, but it does not appear in the main funnel.

### 6.8 `/middleware.ts`

Add 301s:
- `/unbox → /legacy/unbox`
- `/app/*` rewrites to the new `/app` (with subpaths handled gracefully)

Keep existing 301s for `/registry`, `/reports`, `/tools`, `/services`, `/launch`, `/provider`, `/changelog`.

---

## 7. Technical changes (file-by-file, Claude-Code-actionable)

### 7.1 Database — vault config gets a Kast destination column

**Where:** `src/lib/atlas/db.ts` (or wherever `tryAlter` migrations live — search the repo for `tryAlter`).

**What:** add a column to the vault config table to store the Kast deposit address.

```ts
tryAlter("vault_config", "ADD COLUMN kast_destination_address TEXT");
tryAlter("vault_config", "ADD COLUMN kast_destination_label TEXT DEFAULT 'MY_KAST'");
tryAlter("vault_config", "ADD COLUMN kast_set_at INTEGER");
```

**Verification:** restart `kyvern-commerce`. Check schema with sqlite CLI on the VM. Confirm `MY_KAST` allowlist entry can be inserted.

### 7.2 SDK — `KastDestination` helper

**Where:** `packages/sdk/src/`. New file `kast.ts`. Export from package index.

**Behavior:**
```ts
export class KastDestination {
  static fromAddress(address: string): { merchant: string; recipientPubkey: string } {
    if (!isValidSolanaAddress(address)) {
      throw new Error("Invalid KAST deposit address (must be a Solana public key).");
    }
    return {
      merchant: "kast.xyz",
      recipientPubkey: address,
    };
  }
}
```

**Why a helper:** declares intent in user code (`KastDestination.fromAddress(...)`), keeps the merchant tag consistent (`kast.xyz`), and makes the docs example one line shorter. **Bump SDK to `0.5.0`** and republish to npm. Tag the release `frontier-2026`.

### 7.3 New API: `/api/vault/[id]/set-kast-destination`

**Where:** `src/app/api/vault/[id]/set-kast-destination/route.ts` (or matching path convention in this repo).

**Behavior:**
- POST. Body: `{ address: string }`.
- Validates address is a syntactically valid Solana pubkey.
- Updates `vault_config.kast_destination_address` and inserts/updates an allowlist entry labelled `MY_KAST` for the calling vault.
- Returns the updated allowlist row.
- **Auth:** owner-wallet-signed request, same pattern as existing vault config endpoints.

**Verification:** unit test or curl against devnet. Confirm `MY_KAST` shows in allowlist + payments to that address are allowed.

### 7.4 Scaffolder — update default template (now with pay.sh)

**Where:** `packages/create-kyvern-agent/templates/default/`.

**What:** the default template demonstrates the full layered story — agent calls a pay.sh API, Kyvern enforces the budget, earnings can route to a KAST-funded card. Replace the default `index.ts` with:

```ts
import { Vault, KastDestination } from "@kyvernlabs/sdk";
import { execSync } from "node:child_process";

const vault = new Vault({ agentKey: process.env.KYVERNLABS_AGENT_KEY! });

async function main() {
  const myKast = process.env.MY_KAST_ADDRESS
    ? KastDestination.fromAddress(process.env.MY_KAST_ADDRESS)
    : null;

  // 1. Buy a paid API call via pay.sh, but only if Kyvern says it's within policy.
  //    The Kyvern vault decides BEFORE pay.sh's local-wallet authorization fires —
  //    so a rogue, drained, or out-of-cap call never even reaches pay.sh.
  const allowance = await vault.checkAllowance({
    merchant: "pay.sh",
    amount: 0.001,
  });
  if (allowance.decision === "allowed") {
    // Pay.sh CLI handles the 402/x402 challenge end-to-end.
    // Replace this with a real pay.sh service URL from https://pay.sh/#catalog
    const result = execSync(
      `pay --sandbox curl <a-pay-sh-service-url> -d '{"prompt":"hello"}'`,
      { encoding: "utf-8" },
    );
    console.log("Pay.sh response:", result);
  } else {
    console.warn("Kyvern blocked the pay.sh call:", allowance.reason);
  }

  // 2. Once enough earnings accrue, route a share to KAST so the user can spend it.
  if (myKast) {
    const res = await vault.pay({
      ...myKast,
      amount: 0.10,
      memo: "weekly earnings share",
    });
    if (res.decision !== "allowed") {
      console.error("Blocked by Kyvern:", res.reason);
    } else {
      console.log("Sent to KAST:", res.txSignature);
    }
  }
}

main();
```

Notes for execution:
- `vault.checkAllowance()` is a new SDK method — see §7.11 to implement it. It evaluates the same policy that `vault.pay()` enforces, but without making a payment. Returns `{ decision, reason }`.
- The `<a-pay-sh-service-url>` placeholder must be substituted with a real service URL during scaffolder packaging — pick the cheapest meterable service from the catalog at `https://pay.sh/#catalog` (Alibaba endpoints at $0.001 are good).
- Bump scaffolder to `0.2.0`. Update `README.md` in scaffold output to point to `/docs`, the KAST guide, AND the pay.sh wrap section.
- `package.json` in the scaffold template should include `@kyvernlabs/sdk` as a runtime dep and document `brew install pay` (or `npm i -g @solana/pay`) as a peer requirement.

### 7.5 Path-B for allowlist violations — **THE HIGHEST-LEVERAGE TECHNICAL CHANGE IN THIS SPEC**

**Where:** `src/app/api/vault/pay/route.ts` (or `src/app/api/atlas/probe/route.ts` — find the actual path in the repo).

**What:** today's Path-B handles per-tx/daily/weekly cap violations on-chain. Extend it to **every other rule class** — merchant-allowlist (error 6003), missing-memo (relevant code), velocity-cap, and pause violations. When the off-chain pre-check fails AND `forceOnChain: true` is in the request, build the `spendingLimitUse` instruction with the offending parameters, submit with `skipPreflight: true`, capture the failed signature with the matching custom error from the program logs, return it.

**Why this matters more than any other change:**

Right now some attacks feel real (Explorer-verifiable) and others feel simulated (server-refused in 2ms with no on-chain trace). That inconsistency *quietly weakens the entire moat narrative.* The judge unconsciously discounts the demo because not every result feels equal in weight.

After this change: **every violation class produces a finalized failed Solana tx with a custom Kyvern program error code, clickable straight to Explorer.** That's the moment the product earns its category. "Cool AI dashboard" → "Holy shit, this is actual programmable financial enforcement."

**Order of priority (ship in this order):**
1. Allowlist violations (error 6003) — needed for the most common demo button.
2. Missing memo — needed for the second-most-common attack.
3. Velocity cap — needed to demonstrate temporal policy.
4. Paused state — easy win, judge can press the kill switch and immediately see chain-level enforcement.

**Verification (do not skip):** for each rule class, click the button on `/demo`, copy the returned signature, paste it into Solana Explorer (devnet), confirm the tx is **finalized**, **failed**, and shows the custom error in program logs. Screenshot each one for the deck (slide 4).

**Fee-payer note:** each failed on-chain attempt costs ~5000 lamports of SOL from the fee payer. The `/api/atlas/probe` endpoint is rate-limited (3/min, 10/hr per IP) per the May-9 ship; keep that limit. Top up the fee payer at [faucet.solana.com](https://faucet.solana.com) before submission so we have a comfortable buffer.

### 7.6 New API: `/api/atlas/probe-scenarios`

**Where:** `src/app/api/atlas/probe-scenarios/route.ts`.

**Behavior:** returns a JSON list of demo scenarios available for the `/demo` page (one per button). Each scenario has: id, label, description, expected error code, expected outcome ("blocked"/"settled"). The `/demo` page renders buttons from this list. This decouples the page from hardcoded demo content.

### 7.7 Landing widget — live attack-wall preview

**Where:** wherever the existing `/api/atlas/decisions?kind=attacks&limit=24` endpoint is queried for the landing.

**What:** keep the existing live preview but reduce to **6 most-recent blocks** instead of 24. Each row: timestamp, type (e.g. "over-cap"), Explorer link. Hover row → expands to show full reason. This widget is the only "Atlas" surface on the new landing.

### 7.8 Cut routes (delete or move)

| Route / file | Action |
|---|---|
| `src/app/unbox/page.tsx` | Move to `src/app/legacy/unbox/page.tsx`, add 301 in middleware. |
| `src/app/pulse/*` | Delete. |
| `src/app/atlas-deep/*` (if exists) | Audit — if not on the funnel, delete. |
| Any `src/components/Workers*.tsx`, `WorkerStage.tsx`, `Sentinel*.tsx`, `Wren*.tsx`, `Pulse*.tsx` | Move to `src/components/legacy/` or delete. Confirm no remaining imports outside `/legacy/`. |
| `src/app/app/page.tsx` | Replace per §6.3. |

### 7.9 Atlas runner — leave running, don't break

The PM2 processes `atlas`, `atlas-attacker`, `agent-pool`, `atlas-subscriber` keep running on the VM. The web app reframes them, but they continue writing to `atlas.db`. The agent-pool reload requirement from CLAUDE.md still applies — every deploy must `pm2 restart agent-pool`.

### 7.10 New environment variables

Add to `.env.example` and document in `/docs`:

```
NEXT_PUBLIC_KAST_AFFILIATE_URL=https://go.kast.xyz/VqVO/STPAK
NEXT_PUBLIC_DEMO_VAULT_ID=vlt_QcCPbp3XTzHtF5
NEXT_PUBLIC_PAYSH_DEMO_SERVICE_URL=<picked-from-pay.sh-catalog>
```

The demo vault id is Atlas. The demo page targets it for both the live tile and the scenario buttons. The pay.sh demo service URL is the one used by the new `/demo` pay.sh buttons (see §3) — pick a cheap metered endpoint, ideally a $0.001 Alibaba or Google service from `https://pay.sh/#catalog`.

### 7.11 SDK — `vault.checkAllowance()` method

**Where:** `packages/sdk/src/vault.ts` (or wherever `Vault.pay()` is defined).

**What:** new method that runs the same policy evaluation `vault.pay()` runs, but **without** submitting a payment. Returns `{ decision: "allowed" | "blocked", reason?: string }`.

```ts
async checkAllowance(opts: { merchant: string; amount: number; memo?: string }): Promise<{
  decision: "allowed" | "blocked";
  reason?: string;
}> {
  const res = await fetch(`${this.baseUrl}/api/vault/check-allowance`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${this.agentKey}` },
    body: JSON.stringify(opts),
  });
  return res.json();
}
```

**Why:** the scaffolder template (§7.4) calls `checkAllowance()` *before* invoking pay.sh. This is the architectural point — the vault decides **before** pay.sh's local-wallet prompt fires. Without this method the dev story is "wrap pay.sh's response in retry logic"; with it, the story is "Kyvern is the policy gate above pay.sh." Same plumbing, dramatically different framing.

**Server side:** add `/api/vault/check-allowance` route that runs `evaluatePayment()` (the existing off-chain pre-check) without performing any chain action.

### 7.12 New API: `/api/atlas/probe-paysh`

**Where:** `src/app/api/atlas/probe-paysh/route.ts`.

**What:** the demo-page pay.sh buttons hit this endpoint instead of the generic probe. It does:

1. `evaluatePayment()` on the vault for the requested amount/merchant.
2. If allowed: shell out to `pay --sandbox curl <NEXT_PUBLIC_PAYSH_DEMO_SERVICE_URL>`, capture the response, settle the on-chain payment via Squads, return `{ status: "settled", txSignature, paySh: { request, response } }`.
3. If blocked: with `forceOnChain: true`, build the failed `spendingLimitUse` instruction, return `{ status: "blocked", txSignature, programError, reason }`.

**Verification:** invoke from terminal first (`curl -X POST .../probe-paysh -d '{...}'`) before wiring the UI. Confirm both paths return real on-chain signatures.

---

## 8. Copy library (paste-ready)

### 8.1 Landing hero

> **AI agents shouldn't have private keys. They should have budgets.**
>
> Kyvern enforces agent spending policies on-chain using Solana smart accounts.
>
> [`Launch live demo →`] [`View Explorer proof`] [`GitHub / SDK`]
>
> *19 days live · $0 lost · N attacks blocked · Atlas reference agent on Solana devnet.*

### 8.2 Three-column "How it works"

> **Fund a vault.**
> Real Squads multisig on Solana. You hold the keys; the agent gets a session pass.
>
> **Set policy.**
> Caps, merchant allowlists, kill switch. Compiled to a Solana program at `PpmZ…MSqc`.
>
> **Loop ends in real life.**
> Agent earnings can flow directly into a KAST-funded card via USDC. Spend at 150M+ merchants worldwide.

### 8.3 `/demo` page header

> **Live demo · Solana devnet · Kyvern policy program**
>
> Pick a scenario. Watch a real on-chain transaction either settle or get refused by the chain. Every result is a verifiable Solana Explorer link.

### 8.4 Step 1 (block) header

> **1. Watch a real attack get blocked.**
> Each button below sends a real transaction to Solana devnet. The program at `PpmZ…MSqc` refuses it. The result is a finalized failed transaction you can verify on Explorer.

### 8.5 Step 2 (settle) header

> **2. Watch a real allowed payment settle.**
> Same plumbing, allowed merchant, ~3-5 seconds to confirmation.

### 8.6 KAST hook copy

> **Where the loop ends in real life.**
>
> Agent earnings can flow directly into a KAST-funded card via USDC. Paste your KAST Solana USDC deposit address; we'll allowlist it as `MY_KAST`. Every agent payout to that address is a real on-chain USDC transfer that funds your card. Spend at 150M+ merchants — coffee, groceries, flights, anywhere VISA works.
>
> Kyvern is *compatible with KAST deposit rails.* Not affiliated with KAST.
>
> [`Get a KAST card →`](https://go.kast.xyz/VqVO/STPAK)

### 8.7 Footer

> Built for Solana Frontier 2026. Devnet today. Mainnet auditing in progress.
> SDK: `npm install @kyvernlabs/sdk` · Program: `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`
> Made in Pakistan · Solana · Squads · KAST

### 8.8 X / social one-liner (for thread + video caption)

> AI agents shouldn't have private keys. They should have budgets.
>
> Built Kyvern: financial safety infrastructure for autonomous agents on Solana. Set a policy, the Anchor program at PpmZ…MSqc enforces every rule on-chain. Click a button, watch a real failed tx on devnet. Earnings can flow to a KAST-funded card.
>
> SDK on npm. /cc @solana @KASTxyz

---

## 9. Submission deliverables

Both submissions need: working MVP (live URL), pitch deck, 2-3 minute video. Below is the spec for each.

### 9.1 Live MVP

- URL: `https://kyvernlabs.com/` (canonical).
- Required surfaces working: `/`, `/demo`, `/app` (logged-in), `/atlas`, `/docs`. All scenarios in §3 must produce real failed/settled txs.
- Health check: every scenario button on `/demo` confirmed working in the 2 hours before submission. No "loading…" without a result. No surface saying "Coming soon."

### 9.2 Pitch deck (10 slides max, both versions share 80%)

**Slides shared by both versions:**
1. **Title** — Kyvern. *Financial safety infrastructure for autonomous agents.* "AI agents shouldn't have private keys. They should have budgets." Logo + URL + builder name (Shariq Azeem, @shariqshkt). Pakistani flag emoji.
2. **The problem** — Agents are getting wallets. Wallets get drained. Show 1-2 recent agent-loss headlines if you can find real ones; otherwise plot the trend ("agents controlling stablecoins is a ~$X TAM by 2027 — every wallet is a loss vector").
3. **The solution** — Kyvern smart safe. Three-layer defense: Squads multisig + Kyvern Anchor program + agent session pass. Diagram: agent → vault → policy program → chain. The chain refuses every action that breaks the rules — before a single lamport moves.
4. **Live demo** — screenshot of the `/demo` page with the failed-tx Explorer link visible. Caption: "Click any of these in the live demo. Real Solana txs. Verifiable on Explorer."
5. **The architecture (the layered stack)** — One diagram showing four boxes stacked: **pay.sh** (HTTP rails) + **Squads** (custody) + **KAST** (off-ramp) + **Kyvern** (policy on top of all three). Caption: *"The policy layer for the Solana agent payments stack."* Concrete details around the diagram: program ID `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`, npm package `@kyvernlabs/sdk@0.5.0`, scaffolder `npx create-kyvern-agent`, 19-day continuous devnet uptime, compatible with pay.sh + KAST deposit rails.
8. **The team / about** — solo Pakistani builder, prior wins, links.

**Slides specific to Frontier deck (3, 6):**
3. **Use case (the pay.sh wedge)** — Solana Foundation just launched pay.sh. Their docs say *"Real payments still require local user authorization."* That's the only thing standing between pay.sh and a fully autonomous agent. **Kyvern is what closes that gap.** Show: a one-line `pay --sandbox curl …` call wrapped in `vault.checkAllowance()`. The chain decides. The agent runs unattended. Both products' value compounds.
6. **Market** — every Solana agent project in 2026-2027 is a Kyvern integration target. Pay.sh has 72 services and growing. Every one of them is a place an agent might overspend or get tricked — every one of them is a Kyvern wrap target. Distribution: SDK + scaffolder. Show npm install count growing.

**Slides specific to Kast Pakistan deck (3, 6):**
3. **Use case** — Pakistani freelancer, $100 USDC stablecoins, AI manages it, spends with KAST card. Walk through one user journey end-to-end.
6. **Why this for Pakistan** — 50M+ remote workers / freelancers, growing Solana adoption, KAST already trusted. Roadmap to PKR payouts.

**Slide 9 (both):**
9. **Roadmap** — mainnet audit (June), expand KAST-rail compatibility (deeper UX, optional bridges), real yield protocols (Q3), more scaffolder templates. *Do not write "KAST partnership" — we don't have one.*

**Slide 10 (both):**
10. **Ask** — funding tier or grant request, contact info.

### 9.3 2-3 minute video

**Same script for both versions, except slide 6 voiceover differs.**

**Script (target 2:30):**

```
[0:00-0:10] Hi, I'm Shariq. I built Kyvern for Solana Frontier and the KAST Pakistan track.

[0:10-0:25] Here's the problem. AI agents need to spend money. Today the only options are: give them a wallet (and risk a drain) or build your own custody (and pay an audit). Both suck.

[0:25-0:40] Here's Kyvern. Every agent gets a Solana smart safe — a Squads vault wrapped in a policy program I deployed to devnet at PpmZ…MSqc. The chain refuses every action that breaks the rules.

[0:40-1:30] Live demo time. I'm on the live site, I'll click a button. [click "Try to drain $50"] — submits to Solana, fails on-chain in 4 seconds, here's the Explorer link, custom error 6026. The program refused it. [click] Here's an allowed payment — $0.05 to a known merchant — settles in 3 seconds, real tx hash. The chain made the call, not my server.

[1:30-1:50] Where does the loop end? In real life. Agent earnings can flow directly into a KAST-funded card via USDC. Paste your KAST Solana USDC deposit address, we allowlist it as MY_KAST, every agent payout to that address is a real on-chain transfer that funds your card. Spend at 150 million merchants worldwide. We're compatible with KAST deposit rails — not a KAST partner, just a clean public on-chain rail.

[1:50-2:10] Get the SDK: npm install @kyvernlabs/sdk. Or scaffold a working agent in 60 seconds: npx create-kyvern-agent my-agent — the default scaffold calls a real Solana Foundation pay.sh API, wrapped in your Kyvern budget. Pay.sh just launched and their docs say "real payments still require local user authorization." Kyvern is what makes pay.sh autonomous without compromising safety. We are the policy layer for the Solana agent payments stack.

[2:10-2:30] That's Kyvern — financial safety infrastructure for autonomous agents on Solana. Built for Frontier, built for Pakistani builders. AI agents shouldn't have private keys. They should have budgets. The chain has the receipts. Thank you.
```

**Recording specifics:**
- Use the live site, not a mock. Camera in a browser corner, screen as the focus.
- Click the demo buttons live. Don't pre-record the failures.
- Keep cursor visible. Slow your clicks.
- Final 5 seconds: cut to a black slide with logos (Solana, Squads, KAST, npm) + URL.

### 9.4 README.md (top of repo)

Replace whatever exists. Single page. Sections:
1. **What this is** (one sentence)
2. **What's live** (URL + screenshot + 30-second loom)
3. **The 60-second judge demo** (link to `/demo`, list the 5 scenarios)
4. **Architecture** (diagram + program ID + Squads version + SDK package)
5. **Local dev** (clone, install, env vars, run)
6. **Honest gaps** (1 paragraph — yield is simulated on devnet, mainnet pending)
7. **Submissions** (Frontier link, Kast Pakistan link, deck PDFs in `/decks/`)

### 9.5 Frontier submission portal

- Region: Pakistan.
- Tracks (multi-select): Infrastructure & Developer Tooling, AI x Solana, optionally Consumer.
- Submission must include: Colosseum-required deck, demo URL, video URL, repo link.
- Builder: Shariq Azeem.

### 9.6 Superteam Earn submission

Per the listing requirements:
- Project deck (problem, solution, roadmap) — use the Kast version.
- Product demo or MVP — `https://kyvernlabs.com/demo`.
- 2-3 minute video demo — Kast version.
- KAST Wallet signup confirmation — sign up, screenshot, attach.
- Mark region: Pakistan.

---

## 10. Schedule (48 hours from kickoff)

This is aggressive but doable. Hours are counted from the moment Claude Code starts executing this spec.

| Block | Window | Output |
|---|---|---|
| **A. Cuts and routing** | 0–3h | Move `/unbox`, delete `/pulse/*`, replace `/app`, redirect rewrites. Verify nothing 500s. |
| **B. Path-B for allowlist + scenarios endpoint** | 3–8h | `/api/atlas/probe-scenarios`, allowlist on-chain refusal extension. Verify each scenario produces a real failed tx with the right custom error. |
| **C. `/demo` page** | 8–14h | Build the page per §6.2. Each button hits the scenarios endpoint. Modal flips to result with Explorer link. |
| **D. Landing rework** | 14–18h | Hero, three-col how-it-works, live attack preview, footer. Cut the 3D device. Cut worker mentions. |
| **E. KAST-rail compatibility** | 18–24h | DB column, set-kast-destination API, allowlist UI on `/app`, docs section, affiliate link in three places. |
| **E2. Pay.sh wrap (parallel with E if possible)** | 18–26h | `vault.checkAllowance()` SDK method, `/api/atlas/probe-paysh` endpoint, two new `/demo` buttons (pay.sh blocked + pay.sh settled), pay.sh logo in landing strip, scaffolder template uses pay.sh. Verify locally via `pay --sandbox curl` before wiring UI. |
| **F. SDK + scaffolder bumps** | 24–28h | `KastDestination` helper + `checkAllowance` method, version bumps, npm publish (don't publish until E + E2 are in main). |
| **G. Docs cleanup + honesty section** | 28–32h | Cut worker mentions, add KAST guide, **add pay.sh wrap section as the headline dev guide**, add "what this isn't" section. |
| **H. Deck (both versions)** | 32–38h | 10-slide decks, both versions. Slide 4 = real `/demo` screenshot. Export PDFs to `/decks/`. |
| **I. Video recording** | 38–44h | Record 2:30 video, both versions if pitch differs (it does, slide 6). Edit, upload to YouTube unlisted, get URLs. |
| **J. Submission packaging** | 44–47h | README rewrite, repo cleanup, both submission portals, screenshots, attached deliverables. |
| **K. Final smoke test + buffer** | 47–48h | Click every demo button. Confirm Explorer links work. Submit. |

If any block runs over by >50%, drop the *next* block's lowest-priority item. Keep the demo bulletproof at all costs.

---

## 11. Decisions deferred (do NOT do these now)

These are good ideas. They are not in scope for the next 48 hours.

- LLM-driven Atlas reasoning. Atlas decisions stay scripted; honesty section in `/docs` discloses this.
- Real yield protocol integration (Kamino/Marginfi). Scaffolder template uses simulated yield with a clear comment.
- Attack-attacker fuzzing. Stays the four scripted scenarios.
- Mainnet deploy. Devnet only. README + footer disclose.
- Co-marketing with KAST team. Affiliate link is the integration; reach out post-submission.
- Branded KAST card UI in `/app`. Plain text + KAST logo is enough.
- Multi-tenant agent-pool scaling. Single PM2 process for the demo.
- Removing legacy `pulse.db`. Stays on disk, unread.

---

## 12. Verification gate (before declaring done)

A senior dev or you, with a fresh browser, should be able to do all of the following in <90 seconds without help:

1. Visit `kyvernlabs.com`. Read the hero. Understand what Kyvern is.
2. Click `Launch live demo →`. Land on `/demo`.
3. Click "Try to drain $50." See a real failed tx hash and Solana Explorer link. Open it. Verify it's a finalized failed tx.
4. Click "Pay api.kast.example $0.05." See a real settled tx hash. Verify on Explorer.
5. Click "Buy Perplexity via pay.sh — over cap." See a real failed tx hash, the pay.sh service URL in the modal, and the on-chain refusal. Verify on Explorer.
6. Click "Buy a $0.001 OCR call via pay.sh." See the actual pay.sh response data inline AND a real settled tx hash. This is the layered-stack proof.
7. Click "Connect your KAST card." Paste a Solana address. See it appear in the allowlist.
8. Copy the `npx create-kyvern-agent my-agent` command. Run it locally. Verify it scaffolds a working project that includes the pay.sh wrap.
9. Read the `/docs` "Wrap pay.sh with Kyvern" section. The 4 steps make sense at a glance.

If any of these fail or take longer than 90 seconds, the spec is not done.

---

## 13. Notes for Claude Code executing this

- Do **A and B (routing cuts + Path-B extension)** before anything else, since the demo depends on Path-B. Don't start `/demo` page work until you can produce a real failed tx with custom error 6003 by curl.
- When in doubt about copy, use exactly the strings in §8. Do not "improve" them on the fly.
- If a file path in §7 doesn't match what you find in the repo, search for the closest equivalent and proceed. Don't block on naming mismatches.
- For deck slides, build them in `decks/frontier.md` and `decks/kast-pakistan.md` as Markdown first, then convert to PDF (use the `docx`/`pdf` skills if needed).
- The repo's `CLAUDE.md` deploy section (nohup + `/tmp/kyvern-build-done`) **must** be followed for any VM deploy. Don't skip the SSH-flake-resilient build pattern.
- After each significant change, smoke-test both `kyvernlabs.com` and `app.kyvernlabs.com` since they share a backend.
- **Always** include `agent-pool` in the `pm2 restart` list per the gotcha in `CLAUDE.md`. The user-spawned-agent runner won't pick up code changes otherwise.
- Atlas DB schema migrations sometimes silently skip under WAL lock. If a column you added in §7.1 isn't visible after restart, apply it manually with the `node -e` snippet from `CLAUDE.md`.
- After SDK 0.5.0 publishes, also `git tag frontier-2026` on the repo.
- Before submission, **verify the Explorer links from the deployed demo work in an incognito browser** — public RPC sometimes rate-limits, and a broken Explorer link in front of a judge is the worst failure mode.

---

## 14. The bet

We are betting that:
- A judge clicking a real failed Solana tx with a custom program error code, in 30 seconds, beats five minutes of polished UI.
- The right category for Kyvern is **financial safety infrastructure for autonomous agents** — not "AI experience," not "agent OS," not "consumer AI." That category framing is venture-scale; the others are hobby-scale.
- A loop with a real-world endpoint (KAST-funded card) beats one that ends in the void.
- **Composability over competition.** Pay.sh is the rails; we are the policy layer above. Their pitch admits "real payments still require local user authorization" — Kyvern is the answer to that exact line. Both products' value compounds; we never frame them as competitors.
- Cutting half of what we built — and being honest about what's left — is more impressive than shipping more theater.
- The intelligence of Atlas is irrelevant. The financial control layer is the moat. Even a deliberately minimal agent proves the thesis.

If we're wrong, the worst case is the same demo plus some legacy pages still in the repo. If we're right, both submissions land hard. The cost of cutting is mostly emotional. The cost of not cutting is losing.

Ship the spec.

---

## 15. The 60-second realization filter (use this to kill scope creep)

Every proposed feature, every new UI element, every paragraph of marketing copy, every "wouldn't it be cool if…" — must pass this single filter:

> **Does this strengthen the moment a judge realizes "Holy shit, this is actual programmable financial enforcement"?**

If the answer is yes, ship it. If the answer is no or "kind of," cut it. Don't argue. Don't compromise. Don't move it to a hidden tab. Cut it.

**The realization arc the judge needs to experience, in order:**

| Within | The judge understands… |
|---|---|
| 20s | …the problem (agents need budgets, not keys) and sees a real failed Solana tx they triggered themselves. |
| 60s | …the differentiation (chain enforces, not us) and the category (financial safety infrastructure). |
| 3 min | …the loop (earnings end on a KAST-funded card) and the company potential (every Solana agent is an integration target). |

Anything that delays the 20-second moment is a strategic enemy of this spec. That includes:
- Animations longer than 250ms on the landing.
- Modal "intro" steps before the first demo button.
- Marketing copy that requires the reader to "set up context" before the click.
- Any reference to "device," "unbox," "worker," "KVN serial" anywhere on the funnel.
- "Loading" spinners on the live counter strip — pre-render with SSR.

**Self-discipline for the builder (Shariq, you):** your natural instincts pull toward systems, lore, simulation, dashboards, ecosystems. They are real strengths. They are also strategic enemies for the next 48 hours. Every time you feel the pull to add a layer, run the filter above. If you can't honestly say it strengthens the 20-second moment, the answer is no.

Clarity > artistry, until the demo lands. Then artistry can come back.
