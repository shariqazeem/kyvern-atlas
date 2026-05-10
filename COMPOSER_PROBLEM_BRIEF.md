# Kyvern composer — problem brief for outside review

A self-contained brief for AI models / advisors. Written 2026-05-10
with ~24 hours of dev time left. Honest framing — the goal is
better feedback, not validation.

---

## What Kyvern is, in one paragraph

Kyvern is a Solana-native authorization layer for AI agents. Every
agent gets a Squads multisig vault wrapped in a custom Anchor program
(`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`, devnet) that enforces
five rules: per-tx max, daily cap, weekly cap, merchant allowlist,
memo requirement, plus a kill switch. The chain refuses any action
outside the rules — *before* USDC moves. Refusals are real failed
Solana txs with custom error codes you can verify on Explorer.
Tagline: *"Agents shouldn't have keys. They should have budgets."*

## What's actually built and demonstrably works

- **The Anchor program** is deployed and live on devnet. 4 instructions,
  12 custom error codes (12000–12011).
- **Atlas** — a reference agent that's been running autonomously on
  the platform for 19 days. ~9,400 cycles, ~1,400 settled USDC
  transfers, ~6,500 attempted attacks all refused on-chain. Every
  refusal has a verifiable failed-tx signature.
- **`/app` home surface** — a single-page device shell where a user
  signs in with Privy, gets a vault provisioned (real Squads multisig
  + on-chain Anchor policy + 1 USDC seed airdrop), walks a 5-step
  integration wizard, and can fire a real on-chain payment. Shows a
  per-vault event feed in real time. Premium-feeling UI.
- **SDK** — `@kyvernlabs/sdk@0.5.0` on npm. `vault.pay(...)` returns
  a settled signature or throws a `PolicyError` with a chain error
  code. 4 lines of code from npm install to a chain-enforced payment.
- **Pay.sh wrap demo** — wraps the Solana Foundation's pay.sh x402
  protocol calls through the policy program, so any pay.sh-paid
  endpoint becomes budget-enforced.
- **Agent composer (this is the problem surface)** — see below.

## The composer — what we built

Over the last ~36 hours we shipped a no-code agent platform on top
of the vault primitive:

- **8 step types**: `llm` (multi-provider BYOK — Anthropic, OpenAI,
  DeepSeek, Commonstack), `http` (SSRF-safe fetch), `vault.pay`
  (chain-enforced merchant payment), `transfer.usdc` (chain-enforced
  self-transfer), `log` (writes to event feed), `signal` (writes to
  inbox), `branch` (if/else), `loop` (over array).
- **4 trigger types**: manual, interval, cron, webhook.
- **Variable interpolation** with `{{step1.text}}` / `{{trigger.payload.foo}}`
  / `{{vault.id}}`. Now with `{{`-typeahead in every form field.
- **Recipes**: ship 3 working ones (Daily Solana brief, Wallet watcher,
  Vault digest). Trimmed from 8 — 5 had placeholder pubkeys / required
  user-specific config that crashed at runtime on first deploy.
- **React Flow canvas** on the agent detail page — vault disc anchor,
  step nodes, animated SVG strings, a black-with-green-stroke "chain
  glyph" between every money step and the vault that tells the policy-
  program story visually.
- **Pre-deploy linter** that catches placeholder strings, invalid
  base58 pubkeys, per-tx-max overflows, missing provider keys, etc —
  so deploys don't fail at runtime.
- **BYOK provider keys**, encrypted at rest with AES-GCM.
- **Run history with playback** — selecting a run repaints the canvas
  with that run's step states.
- **Recipe → quick-deploy review screen** — one-tap deploy after
  picking a recipe, "Customize" drops into the full composer.

Everything technically works. Builds clean. Atlas didn't break.
Premium UI tokens consistent across surfaces.

## The problem

Shariq (the founder) just said: *"i really don't find them useful
bro... neither i find policy programs working and useful, even the
direction i don't find clearly the flow."*

Concretely:

1. **The recipes don't deliver real value.** "Generic LLM bullets
   posted to your inbox once a day" is not a thing anyone wants. The
   wallet watcher LLM-summarizes RPC noise. The vault digest is
   purely hallucinated. Users either trust the recipe (then why
   compose) or compose from scratch (then they want the SDK, not a UI).

2. **The chain enforcement is invisible to composer users.** A user
   has to construct a graph that *intentionally* violates rules
   (over-cap amount or non-allowlisted merchant) before the chain
   refusal narrative shows up. That's not a natural part of "deploy
   this recipe."

3. **The composer is competing with the SDK story.** Kyvern's
   strongest pitch is "4 lines of TypeScript and your agent has a
   budget." Adding a no-code builder dilutes that.

4. **Atlas vs composer split.** Atlas (the reference agent) has 19
   days of unbroken on-chain proof. The composer agents have hours
   of activity. The home page shows both, which divides attention.

5. **No "killer app" recipe.** Every working recipe is "generate
   text → log it." None solves a problem a real user has on day one.

## What's NOT broken (worth preserving)

- Atlas + the policy program enforcement story
- The 5-step integration wizard
- The SDK + npm publish
- Pay.sh wrap demo
- The premium UI tokens (vault disc, chain glyph, segmented tabs)

## Three paths I (Claude) proposed

**Path A · Kill the composer entirely.** Hide the canvas + builder.
Restore /app to: wizard left, event feed right, Atlas live below.
Pitch becomes *"AI agents on Solana that can't drain your wallet.
Here's Atlas — autonomous 19 days. Here's the SDK — 4 lines."*
Tight, demoable, defensible. ~3 hours.

**Path B · Keep composer, ship one killer agent.** Not 3 mediocre
recipes. One agent that does something a real human wants — e.g. a
Twitter tip-back bot, a GitHub-star-to-NFT-mint bot, a "pay all my
allowlisted SaaS subscriptions on the 1st of every month" bot.
Single visceral hook, everything else hidden. ~8 hours.

**Path C · Pivot direction.** Stop and decide what the actual target
is — Frontier submission? Investor demo? Twitter virality? PMF
hunt? — and let *that* determine what to cut. Right now we don't
know what beats what.

## Constraints

- ~24 hours of dev time left.
- Solo founder building, single Claude pair-programming.
- Real Solana devnet deployment, real Privy auth, ~$5 of LLM credits
  left for any further LLM-driven work.
- Can't ship more than ~10 hours of focused new work without
  burning the founder out.
- Deadline target unclear — was Frontier May 11, founder previously
  said "skip Frontier, deeper product," now wants something to land
  in 24h.

## The question for outside review

Given the above:

1. Is the composer dead weight? Is Path A (cut it, refocus on
   Atlas + SDK + wizard) the honest call? Or is there a Path B angle
   that earns the 36 hours of composer code?

2. **Specifically: what would a "killer app" recipe look like that
   makes the on-chain enforcement story visceral on first run?**
   Most ideas I generate (tip bot, subscription renewer) require the
   user to have a counterparty allowlisted and aren't a 2-tap deploy.

3. The founder said *"neither i find policy programs working and
   useful."* Atlas has 6,500 chain refusals. If that's not
   demonstrating value, what would? Is the issue the program itself,
   or the *narrative* around it? How would you tell that story to a
   developer in 30 seconds?

4. With 24 hours left, and given what's described above, what's the
   single sharpest thing to ship?

Be brutal. The founder is more interested in honest direction than
validation.
