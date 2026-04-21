# KYVERN — The Agent CFO
## Frontier Hackathon Rebuild Plan (supersedes FRONTIER_PLAN.md)

**Decision locked:** Path A (Agent CFO / Vault-first) · Aggressive cut (60-70% of surface) · Single brand "Kyvern" · Pulse becomes internal module name
**Deadline:** May 11, 2026 (≈ 25 days from April 16)
**Submitter:** Shariq Azeem (solo)
**Optimize for:** Billion-dollar-category clarity → judge hypnosis → accelerator offer

---

## Part 1 — The new thesis (memorize this)

### The sentence

> **Kyvern is the agent CFO. We give every AI agent a wallet with budgets, policies, and a kill switch — so businesses can deploy them without losing their mind. Built on Solana.**

### The three-line pitch

> Every company deploying AI agents has the same nightmare: how do you give an agent money without it going insane? Today you either don't (which kills the use case) or you custody a full wallet (which is terrifying). Kyvern fixes it. One click, and your agent gets a Kyvern Vault — a Squads-backed smart wallet with hard budgets, per-merchant policies, velocity caps, and a kill switch you can hit from your phone. Every dollar the agent spends is logged, categorized, and auditable. We're the financial operating plane for the agent internet, and Solana is the only chain where this is economically possible.

### The repeatable analogies (use exactly these)

- **"Brex for AI agents."** — For VCs. Immediately fundable shape.
- **"A kill switch for every agent, on Solana."** — For builders. Emotional hook.
- **"Agents shouldn't have keys. They should have budgets."** — The manifesto line.

### Why this is the billion-dollar line

- **TAM:** Every Fortune 5000 + every AI-first startup that deploys agents = 100k+ companies by 2027 at $500-$5k/mo.
- **Moat:** Once you're the system of record for an org's agent spending, you're entrenched (like replacing Ramp).
- **Timing:** Agent-budget horror stories are starting to circulate. The category is forming right now.
- **Chain alignment:** Only Solana's fees make $1-budget micro-agents economical. This is a Solana-native product by economic necessity, not marketing.
- **Narrative clarity:** One sentence, VC repeats it to their partner unprompted.

### Why this beats "Stripe Dashboard" / "Business OS"

| | Old framing | Kyvern Vault |
|---|---|---|
| TAM | 200 x402 sellers today | Every enterprise deploying agents (100k+) |
| Defensibility | Analytics commoditize | System of record for agent spend = very sticky |
| Solana story | "We support Solana" | "Only possible on Solana" |
| Demo moment | Watch a dashboard update | Watch Kyvern stop a runaway agent in real time |
| VC analogy | "Segment for x402" (weak) | "Brex for AI agents" (fundable) |
| Competitive pressure | Coinbase/Cloudflare may ship this natively | Nobody else is building agent-budget infra |

---

## Part 2 — What Kyvern IS and IS NOT

**Kyvern v1 (Frontier submission) IS:**
- A product where an org creates one or more **Vaults** (Squads-backed smart accounts on Solana).
- Each Vault is funded in USDC, delegated to an **Agent** (a keypair Kyvern provisions), and governed by a **Policy** (budgets, whitelists, velocity caps, kill switch).
- Every outbound transaction from the agent passes through Kyvern's policy evaluator before co-signature; policy violations are blocked and logged.
- A dashboard surfaces: active vaults, live agent spending, violations, kill switches, audit log.
- Pulse-style analytics (already built) become the "Insights" tab inside every Vault.

**Kyvern v1 IS NOT:**
- An x402 analytics tool for service providers (that's the old narrative).
- A multi-chain product (Frontier = Solana only in the hero; Base/Stellar hidden).
- A "Stripe for x402" payment processor (different story, different product).
- A marketplace, a router, a service registry, a gap finder, or a public leaderboard.

This distinction is not cosmetic. Every surface that doesn't serve Vault must be deleted, hidden, or unlinked.

---

## Part 3 — The aggressive cut list

### DELETE / HIDE / UNLINK (remove from public site & main nav)

From `src/app`:

- [ ] `/registry` — hide from nav, 301 to `/`
- [ ] `/reports` — hide, may move to a blog post later
- [ ] `/tools` — delete (gap finder, etc.)
- [ ] `/services` — delete
- [ ] `/launch` — delete (appears to be a previous launch page)
- [ ] `/provider` — delete
- [ ] `/changelog` — optional, keep but unlink from nav
- [ ] `/pulse/dashboard/cohorts` — hide, fold into Vault Insights later
- [ ] `/pulse/dashboard/benchmarks` — hide
- [ ] `/pulse/dashboard/experiments` — hide (A/B pricing is off-thesis)
- [ ] `/pulse/dashboard/intelligence` — hide
- [ ] `/pulse/dashboard/badges` — delete
- [ ] `/pulse/dashboard/copilot` — defer (can become a Vault Insights feature in v1.1)
- [ ] `/pulse/dashboard/webhooks` — fold into Vault settings as "notify on policy violation"

From `src/components/landing`:

- [ ] `leaderboard.tsx` — delete from page, maybe keep file for future
- [ ] `revenue-simulator.tsx` — delete
- [ ] `waitlist-form.tsx` — delete (no more waitlists; product is live)
- [ ] `social-proof.tsx` — rewrite or delete (the Coinbase/Stripe/Google logos are a credibility red flag)
- [ ] `products-section.tsx` — rewrite entirely (one product now, not three)
- [ ] `developers-section.tsx` — rewrite for Vault SDK, not Pulse middleware

### KEEP (repurpose into Vault)

- Privy auth (`src/lib/auth.ts`) → still use for owner auth
- Solana lib (`src/lib/solana.ts`) → extend with Squads SDK
- DB (`src/lib/db.ts`, SQLite) → add vaults / agents / policies / events_v2 tables
- API rate-limit (`src/lib/rate-limit.ts`)
- Audit log (`src/lib/audit.ts`) → becomes policy-decision log
- Notifications (`src/lib/notifications.ts`) → policy-violation alerts
- Dashboard layout / card components → reuse UI primitives
- npm `@kyvernlabs/pulse` → rename package concept but keep existing analytics middleware as internal "Insights" collector
- MCP server (`packages/mcp`) → reposition from "query your revenue" to "query your agent's spend" — small rewrite, huge story upgrade

### BUILD NEW

New routes, components, lib, API:

```
src/app/
  page.tsx                              ← rewrite hero: Agent CFO
  vault/
    page.tsx                            ← rewrite: the list of my vaults
    new/page.tsx                        ← create a vault flow
    [id]/
      page.tsx                          ← single vault view (default tab: Activity)
      policy/page.tsx                   ← edit policies
      agents/page.tsx                   ← manage the agent(s) on this vault
      insights/page.tsx                 ← the old Pulse analytics, repositioned
      audit/page.tsx                    ← full policy decision log
  docs/
    page.tsx                            ← new, vault-focused docs

src/lib/
  squads.ts                             ← Squads v4 SDK integration
  policy-engine.ts                      ← budget / whitelist / velocity evaluator
  agent-provisioner.ts                  ← create agent keypair + Squads delegation
  vault-tx.ts                           ← x402 tx interception + policy gate

src/app/api/
  vault/
    create/route.ts
    [id]/fund/route.ts
    [id]/policy/route.ts
    [id]/pause/route.ts                 ← THE kill switch endpoint
    [id]/drain/route.ts
    [id]/activity/route.ts
    [id]/agents/route.ts
  agent/
    [id]/attempt/route.ts               ← agent calls here; Kyvern enforces policy
    [id]/rotate/route.ts
```

---

## Part 4 — Architecture

### The core primitive: Kyvern Vault

A Kyvern Vault is a **Squads v4 smart account** on Solana with:
- **Owner key:** the human / org (Privy-managed or connected wallet)
- **Kyvern co-signer:** a Kyvern-held key that co-signs all outbound txs after policy check
- **Agent delegate:** a Solana keypair provisioned per agent, delegated with Squads' delegated-signer feature

Every outbound USDC transfer is a Squads multisig proposal. The agent proposes; Kyvern co-signs only if policy passes. Owner can pause, rotate, or drain at any time via any wallet.

### The policy engine (off-chain v1, on-chain v2)

**v1 (Frontier):** Policy evaluated in Kyvern's backend before co-signing. Fast to build, infinitely flexible, iterable.

**v2 (post-Frontier):** Policies enforced by a custom Anchor program as a signer-hook. Slower to build, trust-minimized, the eventual moat.

For Frontier, this custodial v1 is fine because:
1. Squads provides the on-chain asset custody and real multisig security. Kyvern never holds funds.
2. Kyvern only holds a co-signer key. Worst-case compromise: an attacker can co-sign with a bad agent — but the Vault's base policies at the Squads level (Squads v4 *native* spending_limits) still cap damage.
3. The honest story: "Policy evaluation off-chain for v1 + Squads on-chain limits as a safety net. v2 migrates evaluation fully on-chain."

### Policy language (v1 minimum viable)

```typescript
type Policy = {
  daily_limit_usdc: number         // e.g., 50
  weekly_limit_usdc: number        // e.g., 200
  per_tx_max_usdc: number          // e.g., 5
  velocity_max_tx_per_hour: number // e.g., 10
  merchant_allowlist?: string[]    // domains or program IDs; null = all
  merchant_blocklist?: string[]
  time_windows?: { start: string; end: string; tz: string }[]  // e.g., only 9-5 UTC
  require_approval_above_usdc?: number  // async human-in-the-loop
  paused: boolean                  // THE kill switch
}
```

### Data model (additions to SQLite)

```sql
CREATE TABLE vaults (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  squads_multisig_pda TEXT NOT NULL,
  vault_pda TEXT NOT NULL,
  kyvern_cosigner_pubkey TEXT NOT NULL,
  usdc_balance_cached NUMERIC,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  vault_id TEXT REFERENCES vaults(id),
  label TEXT,
  pubkey TEXT NOT NULL,
  secret_encrypted BLOB,  -- optional if Kyvern provisions; omit if customer-provided key
  policy_json TEXT NOT NULL,
  paused BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attempts (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id),
  merchant TEXT,
  amount_usdc NUMERIC,
  policy_decision TEXT,  -- 'allow' | 'deny' | 'pending_approval'
  denial_reason TEXT,
  tx_sig TEXT,  -- null if denied
  at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  attempt_id TEXT REFERENCES attempts(id),
  requested_at DATETIME,
  decided_by TEXT,
  decided_at DATETIME,
  decision TEXT  -- 'approve' | 'reject'
);
```

### Key flows

**1. Create Vault (owner does this once):**
```
Owner → /vault/new → Fill form (name, initial policy, initial deposit amount)
  → Kyvern: create Squads multisig (owner + Kyvern co-signer)
  → Kyvern: create vault PDA
  → Owner signs to fund USDC into the vault PDA
  → Vault appears in dashboard, ready
```

**2. Deploy agent:**
```
Owner → /vault/[id]/agents → "Add Agent"
  → Kyvern generates keypair (or owner provides one)
  → Squads: add keypair as delegated signer with spending_limit matching policy
  → Return the agent credentials (public key + API key for Kyvern's tx endpoint)
```

**3. Agent attempts an x402 payment:**
```
Agent's code → POST /api/agent/[id]/attempt { merchant, amount, memo }
  → Kyvern: evaluate policy
    → If deny: log, return 403 with reason
    → If allow: build Squads tx, co-sign, submit to Solana, log tx_sig
  → Response: { signature, status, explorer_url } or { denied, reason }
```

**4. Owner hits kill switch:**
```
Owner → [KILL SWITCH] button on dashboard
  → POST /api/vault/[id]/pause
  → Kyvern: flip paused flag, refuse all future co-signs
  → (optional) Call Squads to revoke delegated signer
  → Real-time: kill in < 1 second
```

### Why Squads v4 is the right foundation

- **Audited 3x** (Trail of Bits, OtterSec, Neodyme) — you inherit this credibility.
- **Securing $10B+** across DAOs, VC funds, Helium/Jito/Pyth. Judges know the name.
- **Native spending_limit + time_lock + role primitives** — Kyvern becomes the policy language ON TOP, not a re-implementation.
- **SDK available** for TypeScript integration.
- **Instant credibility on the pitch:** "We don't custody. We're the agent-UX and policy layer on top of Squads."

Source: [Squads v4 GitHub](https://github.com/Squads-Protocol/v4) / [Squads Docs](https://docs.squads.so/main)

---

## Part 5 — UX spine (the screens that matter)

### The homepage (`/`)

**ONE section above the fold. Kill everything else.**

```
[KYVERN]                                              [Login] [Docs]

Agents shouldn't have keys.
They should have budgets.

Kyvern gives every AI agent a wallet with budgets,
policies, and a kill switch. Built on Solana.

[Get started — create a vault]    [See a live demo]

──────────────────────────────────────────
           [Animated demo: a terminal screen + a vault dashboard
            side-by-side. The agent tries to spend $500 on a loop.
            Kyvern's policy engine freezes it in real time.
            "BLOCKED: daily limit exceeded ($50)"
            Owner clicks KILL SWITCH. Agent stops.]
──────────────────────────────────────────

        Backed by Squads Protocol · $10B secured · 3 audits
```

That's the entire hero. No logo carousel, no revenue stats, no word-by-word reveal. One idea, one demo, one decision.

Below the fold (optional, collapsible):
- **How it works** (3 steps, 1 code snippet)
- **Why Solana** (fees enable micro-budgets; no other chain works)
- **Roadmap** (v1 → v2 on-chain policy)
- **Team** (Shariq, solo, x402 track record)
- **Footer** (docs, X, GitHub, contact)

**That's it.** 6 sections max, no simulators, no carousels.

### The dashboard (`/vault`)

```
┌─────────────────────────────────────────────────────┐
│ Your Vaults                          [+ New Vault]  │
├─────────────────────────────────────────────────────┤
│ ● Marketing Ops Agent Vault                         │
│   $847.12 USDC · 3 agents · 47 txs today            │
│   ━━━━━━━━━━━━░░░░░ 62% of daily budget             │
│                                                     │
│ ● Research Agent Vault                              │
│   $2,013.88 USDC · 1 agent · 2 violations today     │
│   ━━░░░░░░░░░░░░░░░ 12% of daily budget             │
│                                                     │
│ ● [PAUSED] Experimental Agent Vault                 │
│   $50.00 USDC · 1 agent · frozen by owner at 14:22  │
└─────────────────────────────────────────────────────┘
```

Cards, one per vault, glanceable, zero clutter.

### Single vault view (`/vault/[id]`)

Default tab: **Activity** (the visceral surface).

Live feed of attempts, color-coded:
- 🟢 Allowed: `$0.40 → weather-api.example.com (x402)`
- 🔴 Denied: `$250.00 → unknown-merchant.xyz → BLOCKED (per-tx max $5)`
- 🟡 Pending: `$75.00 → stripe.com → awaiting approval`

Sidebar always visible:
- **KILL SWITCH** (big red button, single click, confirms with modal)
- **Balance** (live USDC + gas SOL)
- **Policy summary** (daily limit, per-tx, velocity, paused status)
- **Agents** (list of delegates, last active)

Other tabs: **Policy · Agents · Insights (analytics) · Audit**

### The SDK / integration page (`/docs`)

Minimal, developer-focused, one path:

```bash
# 1. Create a vault in the dashboard, copy the agent API key

# 2. Install the SDK
npm install @kyvernlabs/sdk

# 3. Use it in your agent code
import { Kyvern } from '@kyvernlabs/sdk'

const kyvern = new Kyvern({ agentKey: process.env.KYVERN_AGENT_KEY })

// Agent tries to pay for an x402 service
const result = await kyvern.pay({
  merchant: 'https://weather-api.example.com',
  amount: 0.5,
  memo: 'fetching weather forecast'
})

if (result.denied) {
  console.log('Blocked:', result.reason)
} else {
  console.log('Paid:', result.signature)
}
```

One page. One paradigm. Done.

---

## Part 6 — The hypnotic demo (3 minutes, scripted to the second)

Judges watch hundreds of demos. Yours must **show the moment of control** — that's the whole product.

### 0:00-0:15 — The problem, stated cold
> *(On screen: a terminal. An agent is spending money. Fast.)*
> Narrator: "This is a real AI agent I deployed. Yesterday, it spent $4,800 in 11 minutes on a recursive bug. The wallet was drained before I saw the Slack alert."
> *(Agent terminal freezes. Cursor blinking.)*
> "Every company deploying AI agents has this story. Here's how Kyvern fixes it."

### 0:15-0:45 — Create a vault, live
> Screen: Kyvern dashboard, clean white UI.
> Click: [+ New Vault]
> Fill: Name = "Research Agent", Daily budget = $50, Per-tx max = $5, Velocity = 10/hr.
> Fund: $100 USDC from connected Solana wallet (show the tx signature on Solscan).
> Result: vault live, 15 seconds.

### 0:45-1:30 — Deploy agent, watch it work
> Click: [+ New Agent] → Copy the agent key.
> Switch to terminal: agent code with `@kyvernlabs/sdk`.
> Run it: agent makes 3 legitimate x402 payments (weather API, search API, LLM API).
> Dashboard updates live — green checks, running totals. Click a tx, opens Solscan.

### 1:30-2:15 — The moment. Buggy agent tries to drain.
> Toggle a flag, agent enters "runaway mode" — starts looping expensive calls.
> Watch dashboard: a few allowed, then
> **"BLOCKED: daily limit of $50 exceeded"**
> **"BLOCKED: velocity cap (10/hr)"**
> **"BLOCKED: per-tx max ($5)"**
> Red alerts stream in. Total loss: capped at $50 instead of $4,800.
> Narrator: "That's the product. Budgets the agent can't override."

### 2:15-2:45 — The kill switch (the emotional moment)
> Click: [KILL SWITCH] in the dashboard corner.
> Confirm modal → confirm.
> Agent's next attempt: `DENIED: vault paused by owner at 14:22 UTC`.
> Narrator: "One click. Every agent stops. Instantly."

### 2:45-3:00 — The ask
> Cuts: Squads logo, $10B secured badge, 3 audits, Solana logo.
> Narrator: "Kyvern is the financial operating plane for the agent internet. Built on Squads, secured by Solana. We're applying to Colosseum to give every company a safe way to deploy agents."
> End card: `kyvern.co · @kyvernco · shariq@kyvern.co`

**Production notes:**
- Clean white UI throughout (your brand already supports this).
- No music or very quiet ambient (the numbers are the drama).
- Subtitles in English.
- 1080p min, 4K if you can. YouTube + Loom both.
- Record once, cut tight. Target final runtime 2:50-3:00.

---

## Part 7 — Brand / narrative package

### New identity

- **Name:** Kyvern (drop "Labs" from product; KyvernLabs stays as company name if you want, but the product and domain become kyvern.co / kyvern.xyz — pick one based on availability)
- **Logo:** Keep your existing jpeg but make sure it reads at 16px favicon size.
- **Colors:** Stay with the white/light premium theme — it's working.
- **Mono font:** JetBrains Mono stays for numbers and code.

### Taglines (by surface)

| Surface | Tagline |
|---|---|
| Homepage H1 | Agents shouldn't have keys. They should have budgets. |
| Meta title | Kyvern — the agent CFO on Solana |
| X bio | Budgets, policies, and a kill switch for every AI agent. Built on Solana. |
| npm package description | Kyvern — per-agent smart wallets on Solana. Budgets, policies, kill switch. |
| Discord status | The financial operating plane for the agent internet |
| Investor deck title | Kyvern. The agent CFO. |

### The manifesto (for the About page + launch thread)

> We think the biggest unsolved problem in AI is not intelligence. It's trust.
>
> An agent that can pay for things is useful. An agent that can pay for things without bounds is a bomb. Today every company deploying agents picks between these two: no spend (useless) or full wallet (terrifying).
>
> Kyvern is a third option. Give your agent a vault, not a key. Set a budget, not a blank check. Keep the kill switch on your phone.
>
> The chain under it has to be fast and cheap — otherwise $1-budget agents are uneconomical. That's why Kyvern is a Solana-native product by necessity, not marketing.
>
> We're not building another agent. We're building the financial infrastructure that every agent needs.

### Anti-patterns to kill

- Delete any "as seen in" / "partnered with" that implies Coinbase/Stripe/Google relationships you don't have
- No more "Bloomberg Terminal" / "Shopify for x" / "OS" language in public copy
- No more multi-chain boasting on the Kyvern surface — Solana only
- No more "195+ services" or x402 volume stats front and center (off-thesis; those were seller-side)

---

## Part 8 — The 25-day rebuild schedule

**Guiding principle:** brand + narrative done in week 1 before a single line of new product code. Then 2 weeks of focused build. Final 4 days = demo, deck, video, submit.

### Week 1 (Apr 16-22) — BURN IT DOWN, REBRAND, SCAFFOLD

**Outcome: by end of week, homepage is Kyvern (not Pulse/Kyvern hybrid), 70% of current routes are deleted or hidden, Vault schema + Squads integration scaffolded.**

- **Day 1 (Wed 4/16):** Decisions locked. Write the new homepage copy (use the hero in §5). Push it. Take a screenshot; you now have the "before" for a later thread.
- **Day 2 (Thu 4/17):** Cut list (§3). Delete / 301 / unlink every off-thesis route. Update sitemap. Rename README to be Vault-focused.
- **Day 3 (Fri 4/18):** Scaffold: `/vault`, `/vault/new`, `/vault/[id]`, `/docs`. Wire up Privy for owner auth if not already. Add schema for vaults/agents/attempts.
- **Day 4 (Sat 4/19):** Install `@sqds/multisig` (Squads v4 SDK). Build `src/lib/squads.ts` helpers: create multisig, add member, set spending_limit, build transaction.
- **Day 5 (Sun 4/20):** Build `src/lib/policy-engine.ts`. Unit test it thoroughly — this is the heart of Kyvern.
- **Day 6 (Mon 4/21):** Build the create-vault flow end to end on devnet. Get to "I funded a vault and can see it."
- **Day 7 (Tue 4/22):** Build the agent provision flow: generate keypair, add to Squads multisig as delegated signer with spending_limit, return agent credentials.

### Week 2 (Apr 23-29) — THE CORE PRODUCT

**Outcome: agent can call Kyvern's tx endpoint, policy evaluates, Squads signs, tx lands on Solana devnet, dashboard shows it. Kill switch works.**

- **Day 8 (Wed 4/23):** Build `/api/agent/[id]/attempt`. Wire end-to-end: agent → policy check → Squads co-sign → submit → log.
- **Day 9 (Thu 4/24):** Build the single-vault Activity feed. Live updates via polling or websockets. This is the judge-demo surface — make it feel alive.
- **Day 10 (Fri 4/25):** Build the kill switch (`/api/vault/[id]/pause`). Trip it mid-stream during a test and verify instant cutoff.
- **Day 11 (Sat 4/26):** Build the Policy edit page. Sliders for limits, chip inputs for merchant allow/blocklist.
- **Day 12 (Sun 4/27):** Build the Agents tab — add/remove/rotate agent keys.
- **Day 13 (Mon 4/28):** Build Insights tab — recycle Pulse's chart components but scoped per-vault, per-agent.
- **Day 14 (Tue 4/29):** Build the Audit tab — full log of attempts, decisions, policy violations. CSV export.

### Week 3 (Apr 30-May 6) — POLISH, SDK, DOCS, MAINNET

**Outcome: SDK on npm, docs live, mainnet Vault works end to end, three design partners using it, dashboard feels premium.**

- **Day 15 (Wed 4/30):** Package `@kyvernlabs/sdk` as the new developer primitive. Publish to npm. Rewrite the MCP package as `@kyvernlabs/mcp-vault` with tools like `list_vaults`, `get_activity`, `set_policy`, `pause_vault`.
- **Day 16 (Thu 5/1):** Write the docs site (`/docs`) — one page is fine if it's clean. Include the 60-second quickstart and the policy reference.
- **Day 17 (Fri 5/2):** Migrate to Solana mainnet. Deploy a real Kyvern vault with real USDC ($20 is enough for the demo). Make sure every UI link opens Solscan mainnet.
- **Day 18 (Sat 5/3):** Visual polish pass on the hero and dashboard. Kill any remaining "Pulse" surfaces you missed. Make the KILL SWITCH button feel *right* — subtle shadow, red only on hover, satisfying click animation.
- **Day 19 (Sun 5/4):** Design-partner outreach — DM 5 friendly x402 builders or AI-agent devs you know, offer them a free Vault for 3 months in exchange for a quote. Goal: 3 quotes by Day 22.
- **Day 20 (Mon 5/5):** Bug bash. Load test the attempt endpoint. Make sure nothing 500s during demo.
- **Day 21 (Tue 5/6):** Record a SCRATCH version of the demo. Watch it. It'll be bad. That's fine, you'll redo it.

### Week 4 (May 7-11) — DEMO, DECK, SUBMIT

**Outcome: submitted by Friday May 9, one-day buffer built in, launch thread ready to fire Monday May 11.**

- **Day 22 (Wed 5/7):** Record the real 3-min demo (§6). Edit. Subtitle. Upload to YouTube + Loom.
- **Day 23 (Thu 5/8):** Write the investor deck (12 slides). Structure below.
- **Day 24 (Fri 5/9):** **SUBMIT to Frontier.** Also submit to the dedicated Solana x402 Hackathon (solana.com/x402/hackathon) — same product, one paragraph different. Same demo video, both submissions.
- **Day 25 (Sat 5/10):** Buffer day. Fix anything submission review surfaced. Sleep.
- **May 11:** Launch day. Post the new narrative thread on X. Tag @solana, @colosseum, @SquadsProtocol. Pin to profile.

---

## Part 9 — The investor deck (12 slides, for submission + interview)

1. **Title:** Kyvern. The agent CFO.
2. **The horror story:** A real case of an agent burning money (yours or a public one). Concrete dollar figure.
3. **The universal problem:** Every agent-deploying company has this fear. Today's options suck.
4. **Our insight:** Agents shouldn't have keys. They should have budgets.
5. **What Kyvern is:** Smart wallets on Solana with budgets, policies, kill switch. 3 bullet points + 1 screenshot.
6. **Live demo:** 10 seconds. The kill-switch moment. Loop this if possible.
7. **Built on:** Squads Protocol — $10B secured, 3 audits, Solana standard. We don't custody. Credibility through architecture.
8. **Why Solana:** Fees make $1-budget agents economical. Only chain this works on.
9. **Traction:** Live on mainnet. N design partners using. [quote] [quote] [quote].
10. **Business model:** Free tier (1 vault, $100 monthly volume) → Team $99/mo → Enterprise (% of secured volume, SSO, audit exports).
11. **Roadmap:** v1 custodial co-signer (now) → v2 on-chain Anchor policy program (Q3) → v3 team/workflow primitives (Q4).
12. **The ask:** Colosseum accelerator. 12-month runway to ship v2 and sign 100 design partners.

---

## Part 10 — Risk register (honest)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Squads SDK has a learning curve, slips Week 1 | Medium-High | Budget Day 4-5 specifically for SDK spiking. If blocked Friday, fall back to a simpler "Kyvern co-signer with a standard Solana keypair" architecture for v1, keep Squads as v1.1. The narrative still works. |
| Policy engine edge cases (races, double-spend) | Medium | Use SQLite transactions on attempt insertion + a serialized queue per vault. Don't optimize for parallelism pre-Frontier. |
| 25 days is too tight for a solo founder | High | Cut Week 2 days 13-14 (Insights, Audit UI) first if behind. Ship them post-Frontier. Never cut Kill Switch or Activity feed. |
| You can't find 3 design partners in Week 3 | Medium | Have fallback quotes from self-dogfooding your own agents. "I used Kyvern to deploy my own research agent and it saved me from a $400 bug" is a valid and honest quote. |
| The narrative confuses because you just pivoted publicly | Low-Medium | The flopped launch is actually protective — almost no one formed a strong prior. Treat May 11 as a new launch. Don't reference the old one. |
| Judges want more on-chain content | Medium | Plan around the story "we use Squads (on-chain) + policy (off-chain v1 → on-chain v2)." Credibility through the Squads dependency. |
| Burnout | Genuine | The plan has buffer days (25 / 10). Sleep and Yasira are not the variable to cut. A rested solo founder ships; a wrecked one doesn't. |

---

## Part 11 — What we are NOT doing in this cycle (important)

The following are all good ideas but OFF the plan for Frontier. Resist:

- Recurring subscription primitives (v2)
- Anchor program for on-chain policy (v2)
- Team / multi-user orgs (v2)
- Multi-agent fleet management UI (v1.1 at best)
- A/B pricing, revenue experiments (not our product anymore)
- Service registry / gap finder / reports (off-thesis entirely)
- Base, Stellar, multi-chain surfaces (hide from nav)
- Marketplace, Router (roadmap items, don't hint beyond one slide in the deck)
- User acquisition campaigns (3 design partners is enough — the product quality is the ticket)
- Twitter build-in-public from day 1 (save the reveal for Week 3, when the product is real)

If you find yourself adding scope mid-cycle, return to this list and ask: does this help the kill-switch demo land harder? If no, defer.

---

## Part 12 — The one-sentence test

At any point in the next 25 days, you should be able to say out loud, in one breath:

> "Kyvern is the agent CFO — smart wallets with budgets, policies, and a kill switch for every AI agent, built on Solana."

If what you're building doesn't make that sentence MORE true tomorrow than today, you're off the plan.

---

## Part 13 — About the stakes

You said you need this "at any cost." I want to be direct with you about that, because I care about the outcome more than the phrase.

The cost of winning the Frontier Hackathon is 25 focused days of building one beautiful thing. The cost of not winning is that you've spent 25 days sharpening a product, a narrative, and a founder voice that you can use for the next hackathon, the next raise, or the next conversation with a customer. Both outcomes compound. Neither requires you to break yourself.

Yasira would rather share a life with the version of you who built something he's proud of than the version who won a trophy and left himself shattered. The Kyvern in this plan is the product your best self would ship. Ship it.

Go.

---

## Appendix A — Sources for facts claimed in this plan

- [Squads Protocol v4 — GitHub](https://github.com/Squads-Protocol/v4)
- [Squads Docs](https://docs.squads.so/main)
- [Squads: From Zero to $10B on Solana](https://fystack.io/blog/squads-from-zero-to-the-multisig-protocol-securing-10b-on-solana)
- [Solana Smart Wallets explainer — Helius](https://www.helius.dev/blog/solana-smart-wallets)
- [Smart Account Basics — Squads Blog](https://squads.xyz/blog/smart-account-basics-why-smart-accounts-will-power-the-onchain-economy)
- [Announcing the Solana Frontier Hackathon — Colosseum](https://blog.colosseum.com/announcing-the-solana-frontier-hackathon/)
- [x402 on Solana](https://solana.com/x402)
- [Solana Foundation joins Linux Foundation x402](https://www.banklesstimes.com/articles/2026/04/02/solana-foundation-enters-linux-foundations-x402-initiative-for-web-native-payments/)
