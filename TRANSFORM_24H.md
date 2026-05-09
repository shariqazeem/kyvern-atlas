# TRANSFORM_24H — final sprint to submission

**Hour 0:** the moment you start executing this.
**Hour 24:** Frontier + Kast Pakistan submitted, final smoke pass complete.

This document supersedes `SPEC_TO_WIN.md` for the next 24 hours. The earlier spec optimized for clarity at the cost of soul; you correctly reverted, kept the premium chassis, kept the on-chain moat, kept the cinematic. This spec is about adding **aliveness** without breaking anything else.

---

## The single sentence we are betting on

> *A judge watches a Pakistani builder sign in, mint a key, integrate Kyvern in 4 lines, and watch their own agent's first on-chain event land in their device feed in real time — on a premium Kyvern device with the Anchor program in the trace.*

Every hour of the next 24 either advances that sentence or supports the submission of it. Nothing else.

---

## What stays untouched (do not refactor, do not "improve")

- Premium landing (`os-landing.tsx`, hero device, orbital workers, live economy, attack wall, trust bar). This is the hook. Don't touch it.
- `/unbox` cinematic at 2.5s. Don't lengthen it, don't shorten it.
- `/app` chassis: top rail, affordance row (4 tabs), bottom rail, pull-up activity sheet, vault-anchored frame, halo, dot-grid. **The chassis is the product.** What changes is what *fills* the slots.
- `/atlas` evidence page.
- `/docs` content (already good).
- Anchor program at `PpmZ…MSqc`, all 5 violation scenarios + settle, `/api/atlas/probe-scenarios`, `/api/atlas/probe-paysh`. Don't touch the moat.
- SDK code (`@kyvernlabs/sdk@0.5.0` local) and scaffolder template. Just publish them (one command, see §5).
- Atlas / atlas-attacker / agent-pool PM2 processes.
- Pitch decks markdown drafts in `decks/`.

If you find yourself wanting to "tighten" any of the above during this sprint, write the idea down for post-Frontier and walk away.

---

## What we transform (the alive console)

### Goal

Convert `/app` from "static dev playground" to **the user's own operational dashboard**, while preserving the chassis pixel-for-pixel. Same top rail, same 4 tabs, same bottom rail, same pull-up sheet — different content. The chassis is the body; we're putting blood in it.

### Hard scope (T1 + T2 + T3, in this order)

#### T1 — Live event feed (target ~1.5h)

**What:** the right half of the worker-stage slot becomes a live event feed for the user's vault. Polls every 3s. New rows fade in from the top. Empty state for fresh keys: *"Mint a key + run the snippet on the left. Your first event lands here in seconds."*

**Why first:** the feed is what makes everything else feel alive. The wizard, the violation buttons, the KAST payout — they all gain meaning the moment events land here. Build this first and every later step gets stronger.

**Backend:** new endpoint `GET /api/vault/[id]/events?limit=50&since=<timestamp>` reading from the existing `vault_payments` table (or whichever table records pay/refusal events — find via `grep`). Returns rows: `{ id, ts, merchant, amount, status, reason?, txSignature?, programError? }`.

**Frontend:** new component `src/components/device/feed/agent-event-feed.tsx`. Polls. Each row: timestamp · merchant · amount · status pill · click-to-expand → memo + signature + Explorer link. Status colors: green (settled) / red (blocked) / yellow (pending). Use the existing JetBrains Mono for numbers. Match the device aesthetic.

**Empty state matters more than the populated state for the video.** A fresh user sees the empty state. The line *"Mint a key + run the snippet on the left. Your first event lands here in seconds."* is the bridge into T2.

#### T2 — Integration wizard (target ~2h)

**What:** the left half of the worker-stage slot becomes a 5-step Apple-Settings-style wizard:

1. **Mint your key** — button reveals `kv_live_…` once with a Copy and a "regenerate" link. Marks the step complete on copy.
2. **Install** — two terminal-styled lines with Copy buttons:
   - `npx create-kyvern-agent my-agent`
   - `npm install @kyvernlabs/sdk` (or whichever combination matches the published versions)
3. **Make your first call** — a paste-and-run snippet with the user's actual `kv_live_…` inlined. Calls `vault.checkAllowance(...)`. Three lines max. The reader should feel the *click of integration* in their head.
4. **Try a violation** — three buttons (`Try over-cap`, `Try off-allowlist`, `Try missing memo`). Each fires `/api/atlas/probe-scenarios` **with the user's vault id**. The blocked tx lands in the event feed (T1) within seconds.
5. **Send earnings to KAST** — paste KAST USDC deposit address; allowlist as `MY_KAST`; "Test a $0.001 payout to MY_KAST" button performs a real on-chain transfer from the user's vault.

**State persistence:** add a JSON column `integration_state` on `vaults` (sqlite `tryAlter`). Steps move locked → active → complete and persist across refreshes. Mark a step complete when the user does the action that proves they did it (copied the key; clicked the install Copy; checkAllowance returned a result; a violation produced a real tx; KAST address validated and a $0.001 payout settled).

**Visual treatment:** locked steps are dimmed with a small lock icon; active step has a soft glow + "now" pill; complete steps collapse to a single row with a green check and the date. This is the spinal cord of the alive console — make it feel like Stripe's onboarding meets a piece of hardware.

**Backend additions:**
- `GET /api/vault/[id]/integration-progress` — returns the JSON column.
- `POST /api/vault/[id]/integration-progress/:step` — marks one step complete (called from the frontend on the proof-of-action event).

#### T3 — User-vault routing for probe scenarios (target ~1h)

**What:** today both probe endpoints (`/api/atlas/probe-scenarios` and `/api/atlas/probe-paysh`) hit Atlas's vault. Extend them to accept an optional `vaultId` parameter; when present, use the user's vault and the user's allowlist/policy. The user's blocked txs land in their feed (T1). The Watch-the-chain panel + Wrap-pay.sh panel switch from "demo against Atlas" to "demo against your own device."

**Migration safety:** keep Atlas as the default when no `vaultId` is passed. The `/atlas` evidence page must continue to work unchanged. The "Drain Atlas" attack wall on the landing must continue to work unchanged. Only the `/app` panels switch behavior.

**Auth:** the user's request to probe their own vault must be authenticated by their `kv_live_…` agent key (same auth pattern as `/api/vault/pay`). Don't let one user probe another's vault — this is a real safety bug if you skip it.

**Edge case:** a fresh user with default policy will pass the over-cap test (because they may not have set caps yet). Either ship sensible defaults at vault provisioning ($1 per-tx cap, $5 daily cap, no merchants allowlisted) so the violation buttons land properly, or auto-set defaults at the moment a user opens the Watch-the-chain panel.

### Soft scope (T4–T6, ship if T1–T3 land before hour 6)

- **T4 (~1h):** top rail line *"Your agent · `kv_live_a7b…` · last action 12s ago"* with a pulsing dot when an event lands. Bottom rail switches `Today: $X spent · N calls · M blocked` to user data.
- **T5 (~1h):** pull-up activity sheet replaces Atlas's ActionFeed cards with the user's full event ledger (paginated, filterable by status/merchant/range/time). Reuse the T1 component logic.
- **T6 (~30m):** polish, build, deploy, smoke.

If T1–T3 lands at hour 5, do T4. If at hour 4, do T4 + T5. If at hour 7, **stop adding** and move to submission work. The goal is shipping a complete experience, not a longer feature list.

---

## Hour-by-hour plan (24 hours, hard time-boxes)

| Window | Block | Output |
|---|---|---|
| **0–1h** | Setup | Branch from `main` to `t-block-alive`. Add the feature flag `?alive=1` (or `useAliveConsole` boolean in user state) — the new tiles only render when it's set. Smoke-test landing + `/atlas` are unbroken. Commit. |
| **1–2.5h** | T1 | Build event feed + endpoint. Smoke-test by manually inserting a `vault_payments` row and watching it appear. Commit. |
| **2.5–4.5h** | T2 | Build wizard, persistence, four of five steps wired. Last step (KAST payout) can ship in soft-T4. Commit. |
| **4.5–5.5h** | T3 | Route probe-scenarios through `vaultId`. Default policy at provisioning so violations behave. Auth check. Commit. |
| **5.5–6h** | Smoke | Sign in as a fresh test user end-to-end (private window). Unbox → /app → mint key → run snippet (use a tiny shell test) → watch events land → try violation → see real failed tx → click Explorer link. If anything breaks, fix or revert this commit and re-flag. |
| **6–7h** | Soft scope window | If smoke passes, do T4 (top rail live status + bottom rail user stats). If T2 wasn't fully done, finish step 5 (KAST payout in wizard). |
| **7–8h** | Soft scope window | T5 if time, otherwise polish — empty states, error states, accessibility on the wizard, focus rings, mobile responsive on the feed. |
| **8–9h** | Flip the flag default | Once smoke is clean, remove the feature flag — alive console becomes default for all users. Smoke again. **Critical: confirm Atlas's `/atlas` page and the landing attack wall are unchanged.** |
| **9–11h** | Video script + scene plan | Read §"The 60-second video" below. Plan your shots. Set up screen recording. Charge phone if filming yourself. Pick the cheapest pay.sh service from the catalog you'll use on camera. |
| **11–14h** | Record video — Frontier version | One take through the whole journey. Don't re-edit unless something visibly fails. Re-record only the broken moments. Final length 2:00–2:30. |
| **14–16h** | Record video — Kast Pakistan version | Same shots, different VO on the use-case beats (slide 6 in deck-mirror). If you're tight on time, use the SAME video for both with one re-recorded VO segment. Honestly, the same video for both is fine — the Pakistan flavor lives in the deck and in the on-screen narration. Worry about this less than you think. |
| **16–17h** | Deck PDFs | Render `decks/frontier.md` and `decks/kast-pakistan.md` to PDF. Use the `pdf` skill — read its SKILL.md, follow its docx-to-pdf or markdown-to-pdf path. Don't make this fancy; clean PDFs only. Save to `/decks/frontier.pdf` and `/decks/kast-pakistan.pdf`. |
| **17–19h** | Submission packaging | See §"Submission packaging" below. Frontier portal + Superteam Earn submission. Both forms filled, both videos uploaded (YouTube unlisted), both decks attached. KAST signup screenshot attached to the Earn submission. |
| **19–20h** | npm publish | `npm login`. `cd packages/sdk && npm publish`. `cd packages/create-kyvern-agent && npm publish`. Update the README + docs to reference 0.5.0 / 0.2.0 explicitly. Tag the repo `frontier-2026`. |
| **20–22h** | Final smoke pass in incognito | Use a private window. Click every link on the landing. Click every panel button on `/app`. Open every Explorer link. Verify the affiliate link. Refresh the trust bar. Have a stranger (a friend, a family member) do the same. Their first 90 seconds is the same first 90 seconds a judge will spend. |
| **22–24h** | Buffer | If something is broken, fix it. If nothing is broken, breathe. Top up the fee payer at faucet.solana.com. Sleep is allowed in this window if you're rested. |

If a block runs hot by >50%, drop the **next** soft-scope item, not the next hard-scope item.

---

## The 60-second video (what we record at hour 11)

This script replaces the one in SPEC_TO_WIN §9.3. The earlier script pitched infrastructure against Atlas. The new script tells one person's story.

**Open scene:** browser at `https://kyvernlabs.com/`. The premium landing with the 3D device, orbital workers, live trust bar.

```
[0:00–0:08] "I'm Shariq. I built Kyvern for Pakistani builders who
want AI to help them earn and spend stablecoins — without giving the
AI their wallet."

[0:08–0:18] "Here's the problem. AI agents need to spend money. The
options today are: give them a private key (and risk a drain) or build
your own custody (and pay an audit). Both suck. So most agents just…
don't spend money. The agentic economy waits."

[0:18–0:28] "Kyvern's answer: every agent gets a Solana smart safe.
A Squads vault wrapped in an Anchor program I deployed at PpmZ…MSqc.
The chain refuses every action that breaks the rules — before a
single lamport moves. Watch."
[click "Get a Kyvern device" / sign in flow]

[0:28–0:40] [unbox cinematic plays — KVN serial typewrites,
3-LED boot, device reveals]
"This is your device. Real Squads multisig provisioned on devnet, took
three seconds. Right now I have my own vault, my own agent key. Let
me integrate."

[0:40–1:20] [terminal split-screen with the device on the left]
"Two commands."
$ npx create-kyvern-agent my-vault
$ npm install @kyvernlabs/sdk
"Three lines of code in agent.ts. Paste my key. Run."
[run: vault.checkAllowance({ merchant: 'pay.sh', amount: 0.001 })]
"And — there it is. My device just lit up. That's a real on-chain
allowance check. Note the live event feed on the right."

[1:20–1:45] "Now the dangerous part. Let me try to drain my own vault."
[click "Try over-cap" — wizard step 4]
"Submitting to Solana… and rejected. Custom Kyvern error 12002:
amount exceeds per-tx max. Click into Solana Explorer — that's a real
finalized failed tx with my Anchor program in the instruction trace.
The chain made the call, not my server."

[1:45–2:00] "Now the loop ends in real life. I paste my KAST Solana
USDC deposit address — KAST is the stablecoin card a million Solana
users spend with — and Kyvern allowlists it as MY_KAST."
[click "Test a $0.001 payout" — real tx settles]
"Real on-chain transfer. KAST card tops up. I can spend at 150 million
merchants worldwide. We are compatible with KAST deposit rails — not
a partner, just a clean public on-chain rail."

[2:00–2:15] "And one more — the Solana Foundation just launched
pay.sh. Their docs say real payments still require local user
authorization. Kyvern is what removes that bottleneck. Pay.sh is the
rails; Kyvern is the policy layer above the rails."
[click pay.sh wizard step — real x402 call settles]

[2:15–2:30] "That's Kyvern. Financial safety infrastructure for
autonomous agents on Solana. Built by a solo Pakistani founder, for
solo Pakistani builders. AI agents shouldn't have private keys. They
should have budgets. The chain has the receipts."
[final slide — logo strip + URL]
```

**Recording notes:**
- One take through the whole journey if possible. Real failures happen, real successes happen, real Explorer links open.
- Cursor must be visible. Slow the clicks.
- If a real call fails on camera, *keep going.* The premise of the product is that things fail safely. A real failed call live is more compelling than a re-shoot.
- Final 5 seconds: cut to a black slide with logos (Solana, Squads, pay.sh, KAST, npm) + URL.

The Pakistan-specific framing lives mostly in the open and close. The middle is the same product video. If you only have time for one video, ship this one — it's already Pakistan-flavored.

---

## Submission packaging

### Frontier (Colosseum)
- Region: Pakistan.
- Tracks: Infrastructure & Developer Tooling, AI x Solana, Consumer Applications.
- Required: deck PDF, demo URL, video URL, repo link.
- Demo URL: `https://kyvernlabs.com/`.
- Video URL: YouTube unlisted from hour 14.
- Deck: `/decks/frontier.pdf`.

### Superteam Earn (Kast Pakistan)
- Mark region: Pakistan.
- Required: deck (problem, solution, roadmap), product MVP/demo, 2–3 minute video, KAST signup confirmation.
- Demo MVP URL: `https://kyvernlabs.com/`.
- Video URL: same YouTube unlisted.
- Deck: `/decks/kast-pakistan.pdf`.
- KAST signup: sign up at `https://go.kast.xyz/VqVO/STPAK`, screenshot the confirmation email or the in-app account screen, attach.

### What both submissions need from the README
A clean README at the top of the repo with:
- One-sentence what-this-is.
- Live URL with screenshot.
- 60-second judge demo (3 bullet points + the video link).
- Architecture diagram (or link to deck slide 5).
- Quickstart (4 lines).
- Honest gaps section.
- Submission links.

The current README from Block J is already close. Just verify the URLs and the 0.5.0 / 0.2.0 npm version refs are current.

---

## Smoke test checklist (hours 5.5, 8, 17, 22)

Run a fresh private window each time. The whole pass should take <5 minutes.

1. `https://kyvernlabs.com/` loads in <3s. Trust bar shows live numbers. Attack wall shows recent failed txs. Click any wall row → real Solana Explorer page.
2. Sign in (use a test wallet). Unbox plays in ~2.5s. Land on `/app`.
3. Top rail shows your KVN serial + your vault USDC balance + Atlas pulse.
4. Wizard step 1 reveals a key. Copy it. Wizard step 1 marks complete.
5. Wizard step 2 shows the install commands. Copy. Wizard step 2 marks complete.
6. Wizard step 3 shows the snippet with the key inlined. Run it from terminal (or copy and inspect for correctness).
7. Wizard step 4 — click "Try over-cap." Modal shows pending → blocked. Real tx signature. Click Explorer → real finalized failed tx with Kyvern program error in logs.
8. Watch the event feed (right half of the slot). The blocked event appeared.
9. Wizard step 5 — paste a Solana address. Allowlist. Click "Test $0.001 payout." Real settled tx. Event feed shows it.
10. Click each of the 4 affordance row tabs. Each panel opens. Each panel's primary button works. (Watch chain panel does the same as wizard step 4. Wrap pay.sh panel makes a real `pay --sandbox curl`. KAST panel does the same as wizard step 5. Builder panel shows the SDK code with key inlined.)
11. Pull-up the activity sheet. Events listed.
12. Open `/atlas` in a separate tab. Page renders. Attack wall populated. Earnings hero shows numbers.
13. Open `/docs`. Quickstart loads. "Wrap pay.sh in 4 lines" section is there.
14. Open `https://www.npmjs.com/package/@kyvernlabs/sdk` and `https://www.npmjs.com/package/create-kyvern-agent` after hour 19 — confirm 0.5.0 / 0.2.0 published.

If any of the above fails at hour 22, you have hour 23 to fix. If it fails at hour 23, decide if it's a blocker for submission or cosmetic. Submit anyway if cosmetic.

---

## What we explicitly do NOT do in the next 24 hours

- Build T4–T6 if T1–T3 ships at hour 7+.
- Touch the landing or `/atlas` page contents.
- Add any new pay.sh services or KAST features beyond what's already wired.
- Polish the unbox cinematic.
- Refactor the chassis.
- Write any new docs sections beyond updating version numbers.
- Try to ship mainnet.
- Attempt a co-marketing reach-out to KAST or pay.sh during the build window. (After submission, sure.)
- Add new metrics, sentry, analytics, observability.
- Optimize bundle size, Lighthouse scores, or anything Web Vitals-flavored.
- Reach out to journalists, Twitter influencers, or "make it go viral" before submission. After submission, fine.

---

## Anti-spec-creep guardrail

Every hour, ask: *"Did I just do something that advances the single sentence at the top, or did I do something else?"* If something else, walk back, commit what works, and pick the next bullet from the hour-by-hour plan. If you find yourself wanting to "improve" something not in this doc — write it in `IDEAS_POST_FRONTIER.md` and stop.

---

## The bet

We are betting that:
- A premium device + an alive integration console + a bulletproof on-chain demo beats either of the three alone.
- A judge watching the new video — fresh user, real journey, real failed tx, real KAST payout — feels the product viscerally in a way that `Atlas's vault did this thing` never could.
- The premium chassis was always the right answer; the previous spec was wrong to cut it.
- Six hours of console work + two hours of polish + a real video tells the story; eight hours of polish without the alive console tells half the story twice.
- The Pakistani angle wins on emotion, not on infrastructure jargon. The video carries that emotion.

Ship.
