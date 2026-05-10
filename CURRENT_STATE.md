# Kyvern — current state, 2026-05-10 (post-composer-revert)

A snapshot of where the product actually stands tonight. Honest, no
marketing. Useful for pitches, hand-offs, or just sanity-checking
your own picture of the surface area.

---

## What Kyvern is

Kyvern is a Solana-native authorization layer for AI agents. Every
agent gets a Squads multisig vault wrapped in a custom Anchor program
that enforces budgets, allowlists, and a kill switch. The chain refuses
any action outside the rules — *before* USDC moves. Refusals are real
failed Solana txs with custom error codes you can verify on Explorer.

**Tagline:** *Agents shouldn't have keys. They should have budgets.*

---

## What's actually built and verifiable on-chain

| Piece | State | Address / location |
|---|---|---|
| Anchor program | Deployed on devnet | `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` |
| Custom errors | 12 codes, 12000–12011 | `anchor/programs/kyvern-policy/` |
| Squads v4 integration | Live, multisig per vault, spending limits delegated to agent keys | `src/lib/squads-v4.ts` |
| Atlas reference agent | Live since 2026-04-20 (~20 days) | `agt_atlas` on `vlt_QcCPbp3XTzHtF5` |
| Atlas counters | ~9,400 cycles · ~1,400 settled USDC · ~6,500 attacks blocked · $0 lost · ~$24 earned from real x402 subscribers | `/api/atlas/status` |
| SDK | Published | [`@kyvernlabs/sdk@0.5.0`](https://www.npmjs.com/package/@kyvernlabs/sdk) |
| Scaffolder | Published | [`create-kyvern-agent@0.2.0`](https://www.npmjs.com/package/create-kyvern-agent) |
| Pay.sh demo | Working — chain settles → `pay --sandbox curl` shells out → real x402 quote | `/api/atlas/probe-paysh` |

These are all real, observable artifacts. None of them are mocks.

---

## What a user sees on /app today

After Privy login → /unbox cinematic → /app:

1. **Identity strip** — device serial (`KVN-…`), birth date, vault badge, "Solana devnet" pill.
2. **AgentStatusLine** — "Your agent · `kv_live_…` · last action 2m ago" pill.
3. **Two-column body**:
   - **Left:** `IntegrationWizard` — 5 steps (mint key → install SDK → first call → try a violation → KAST payout). Step 4's "Try over-cap / Try off-allowlist" buttons hit the chain and produce real failed-tx signatures in the right column.
   - **Right:** `AgentEventFeed` — live polling of the user's vault events. Settled payments and chain-refused attempts both surface here with Explorer links.
4. **Today stats** — calls, blocked, $ spent today.
5. **Vault anchor** — `Vault · Live · devnet · $0.99 USDC` pill.
6. **Footnote** — `Secured by Squads · enforced by PpmZ…MSqc`.
7. **Bottom TabBar** — Home / Findings / Settings.

What's NOT on /app home (deliberately, post-Path-A pivot):
- The graph composer (BuilderModal). Code preserved; entry point removed.
- The graph canvas with vault disc + tile arc + chain glyph. Code preserved.
- BYOK keys chip. Code preserved.
- Recipe gallery. Code preserved.

What still resolves but isn't surfaced from /app:
- `/app/agents/[id]` — detail page (renders for legacy graph agents, e.g. Atlas — still works for direct links)
- `/app/inbox` — findings (signals from Atlas + any historical worker era)
- `/app/settings` — vault config (caps, allowlist, paused, KAST destination)

---

## Other live surfaces

| URL | What it is |
|---|---|
| `/` | Landing page · 3D device hero · live trust bar pulled from `/api/atlas/status` |
| `/atlas` | Public observatory · timeline, attack wall, leaderboard. Each row links to Solana Explorer |
| `/vault/new` | Standalone vault deploy wizard ("Clone Atlas" path) |
| `/docs` | SDK docs · install, vault.pay, vault.pause, errors |
| `/unbox` | The 2-second cinematic between sign-in and /app |

---

## The technical story (what's actually novel)

What Kyvern has that other Solana-AI hackathon projects don't:

1. **An Anchor program that says no.** Most Solana agent demos route
   payments through a vanilla Squads multisig. Kyvern adds a policy
   layer above Squads — `execute_payment` validates rules in Solana
   bytecode, returns custom error codes if anything fails. The chain
   is the arbiter, not a server.

2. **20 days of unbroken on-chain proof.** Atlas has been autonomous
   since April 20. Every cycle is a settled or refused tx on devnet.
   Anyone can verify by clicking through the timeline.

3. **A clean SDK surface.** Four lines from `npm install` to a
   chain-enforced payment:
   ```ts
   import { Vault } from "@kyvernlabs/sdk";
   const vault = new Vault({ key: process.env.KYVERN_KEY });
   const tx = await vault.pay({ merchant, to, amount, memo });
   // tx.signature OR PolicyError with chain code 12000-12011
   ```

4. **A pay.sh client that's chain-gated.** The first integration that
   puts the policy layer above x402 — every paid API call passes
   through the Anchor program before the pay.sh facilitator is
   invoked at all.

---

## What's demo-shaped (be honest)

Things that work mechanically but don't yet have real users:

- **Atlas's behavior is scripted.** It's a reference agent, not a
  product. Real autonomous agents using Kyvern as their authorization
  layer haven't shipped yet (besides Atlas itself).
- **The wizard's KAST payout step** is real ($0.001 USDC transfer to
  an allowlisted address) but the user has to set up KAST themselves.
- **The "Watch the chain refuse" panel** in the wizard works. Click
  "Try over-cap $5" → real failed tx with code `12002` in 3s.
  Useful for demos, not a use case in itself.
- **Real-world consumer use cases haven't landed.** Tipbots, refund
  bots, treasury bots — all theoretically possible, none deployed yet.

This is honest hackathon-stage state. The primitive is real; the
ecosystem on top of it is sparse because the agentic-economy category
is itself nascent.

---

## Open questions / what we deferred

1. **Composer (no-code agent builder).** Built it, then hidden. Took
   ~36 hours of work. Mechanically working, not a load-bearing
   surface. Lives in code; v1.2 either resurrects it as the "build
   your own Atlas" path or retires it entirely.
2. **Branch + loop nested step UI.** Currently raw JSON inside the
   composer. Drag-and-drop nested editing is v1.2.
3. **Real x402 client integration.** The `payShWrap` HTTP step works
   via the `pay --sandbox curl` binary path. Native TS x402 client
   (no shell-out) is a v1.2 polish.
4. **Mainnet deploy.** Devnet only today. Mainnet needs a security
   audit pass.
5. **"What do users do with this?"** Not a Kyvern problem alone —
   the AI-agents-spending-money category is itself early. Atlas is
   a single proof of concept; the broader use cases follow from
   developer adoption of the SDK.

---

## How to pitch in 30 seconds

> "AI agents shouldn't have private keys — they should have budgets.
> Kyvern is a Solana Anchor program that enforces caps, allowlists,
> and a kill switch on every payment an agent makes, before USDC
> moves. We have a reference agent, Atlas, that's been autonomous
> for 20 days — 9,000 cycles, 6,500 attacks refused on-chain, zero
> dollars lost. The SDK ships in 4 lines. It's the authorization
> layer the agentic economy doesn't have yet."

That's the entire story. Atlas is the proof. SDK is the surface.
Anchor program is the moat.

---

## File map (where the load-bearing pieces live)

```
anchor/programs/kyvern-policy/           ← deployed Anchor source
src/lib/
  squads-v4.ts                           ← Squads v4 integration (createSmartAccount, setSpendingLimit, coSignPayment)
  server-pay.ts                          ← serverVaultPay — the chain settlement chokepoint
  policy-engine.ts                       ← off-chain pre-check (matches the Anchor program's rules 1:1)
  kyvern-policy/                         ← Anchor program client
  solana-keystore.ts                     ← server fee payer
  agents/
    runner.ts                            ← legacy LLM tick path (Atlas)
    scripted.ts                          ← legacy fallback when LLM rate-limited
    pulse-fire.ts                        ← Pulse trigger → vault.pay (the original "swap" pattern)
    treasury.ts                          ← Atlas as the platform anchor

src/app/
  app/                                   ← /app — the protagonist surface
    page.tsx                             ← AliveConsole mount
    agents/[id]/page.tsx                 ← detail page (still resolves)
    inbox/page.tsx                       ← Findings (still resolves)
    settings/page.tsx                    ← Settings (still resolves)
  api/
    atlas/
      status/route.ts                    ← public counters
      probe-scenarios/route.ts           ← the 5 chain-attack scenarios used by Try a violation
      probe-paysh/route.ts               ← the pay.sh chain+shell flow
    vault/
      create/route.ts                    ← Privy login → real Squads provision
      [id]/test-payout/route.ts          ← wizard step 5 KAST payout
      check-allowance/route.ts           ← non-mutating policy probe (SDK helper)
    agents/spawn-graph/route.ts          ← composer endpoint (kept, no UI surfacing it)

src/components/device/
  shell/alive-console.tsx                ← /app body
  wizard/integration-wizard.tsx          ← 5-step wizard (the load-bearing UX of /app)
  feed/agent-event-feed.tsx              ← per-vault event feed
  builder/                               ← composer (preserved, hidden)
  graph-canvas/                          ← canvas (preserved, hidden)
  agent/graph-detail.tsx                 ← /app/agents/[id] body (still resolves for direct links)

packages/
  sdk/                                   ← @kyvernlabs/sdk source
  create-kyvern-agent/                   ← scaffolder source

decks/                                   ← Frontier + Kast Pakistan pitch decks
```

---

## Bottom line

Kyvern is real infrastructure for a category that's nascent. The
Anchor program is novel. Atlas is durable proof. The SDK ships.

What's missing isn't the product — it's the *application layer*
on top of it (real apps, real users, real spend). That's a
post-launch growth problem, not a pre-submission build problem.

For the next 24 hours: polish the existing surfaces, record the
demo, write the submission. The thing exists.
