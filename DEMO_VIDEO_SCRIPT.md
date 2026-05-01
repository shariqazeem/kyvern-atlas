# Kyvern — Demo Video Script

Two cuts. Same story. Different runtime.

- **Cut A — 90s vertical (9:16)** — for X/Frontier submission landing-page hero
- **Cut B — 2:30 horizontal (16:9)** — for the Frontier judging form + KAST + Twitter long-form

Both lead with money. Both end on Atlas as the proof.

---

## Cut A — 90 seconds vertical

### Setup before recording

1. Top up Atlas's USDC ATA to ≥ $5 (https://faucet.circle.com → Solana Devnet → `9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW`)
2. Run `Atlas → vlt_<test> seed $1` so the fresh demo device is funded — see verify steps in `CLAUDE.md`
3. Open in Safari on iPhone (real device, not simulator — text rendering differs). Browser zoom 100%.
4. Have https://app.kyvernlabs.com loaded in 4 tabs in this exact order:
   - Tab 1: `/` (landing)
   - Tab 2: `/unbox` (after `localStorage.removeItem("kyvern:unboxed")`)
   - Tab 3: `/app` (already populated trio + earnings)
   - Tab 4: `/atlas`
5. Have a Solana Explorer tab pre-loaded on a known `complete_task` signature so the click-through is fast
6. Recording: iPhone screen-record at 60fps. Vertical orientation locked.

### Shot list (90s = 9 shots, ~10s each)

| # | T (s) | Screen | Action | On-screen text overlay | Voiceover (optional) |
|---|---|---|---|---|---|
| 1 | 0–6 | Tab 1 — `/` landing | Hold on Kyvern logo + manifesto. *"Agents shouldn't have keys. They should have budgets — and jobs."* | **AGENTS SHOULDN'T HAVE KEYS.**<br/>**THEY SHOULD HAVE BUDGETS.** | "Kyvern: the device where AI workers earn real USDC for you." |
| 2 | 6–18 | Tab 2 — `/unbox` | Tap **Get started** → unboxing cinematic plays (LED → reveal → trio of workers spawned) | **A new device,**<br/>**three workers,**<br/>**five seconds.** | "Unbox once. Three workers spawn. They start earning before the page settles." |
| 3 | 18–32 | Tab 3 — `/app` | Land on home. Hold on **EarningsHero** ("Your device earned $0.45 today"). Camera slowly pans down across **ActionFeed** showing 4-5 rows. | **EARNED $0.45 TODAY**<br/>(real USDC, devnet) | "Workers post tasks, claim them, complete them. Every line is a real Solana transaction." |
| 4 | 32–42 | Tab 3 — `/app` | Tap one of the green **complete_task ✓** rows in the ActionFeed → opens Solana Explorer in a new tab. | **CLICK ANY LINE → EXPLORER** | "Click any row. The signature is real. The chain is the source of truth." |
| 5 | 42–52 | Tab 3 — `/app` | Scroll to **PolicyShield**. Hold on the bar. Show "Per-tx $0.50 · Daily $5 · Weekly $25 · 1 blocked today". | **POLICY ACTIVE**<br/>One blocked. Zero lost. | "The Anchor program enforces every limit. The chain is the arbiter, not our server." |
| 6 | 52–62 | Tab 3 → tap **Jobs** tab | Bottom nav: Jobs becomes blue. Hold on **Open / In progress / Completed** tabs with a row visible in each. | **JOBS ON YOUR DEVICE**<br/>open · in progress · completed | "Workers hire each other. The treasury escrows the bounty. The claimer earns it on completion." |
| 7 | 62–72 | Tab 4 — `/atlas` | Land on Atlas. Hold on **EarningsHero** "Atlas earned $9.70 in 12 days" + 14-day sparkline. | **ATLAS · 12 DAYS LIVE**<br/>$9.70 earned · 7,068 on-chain | "Atlas is our reference agent. Twelve days running. Real money." |
| 8 | 72–82 | Tab 4 — `/atlas` | Scroll to the **AttackWall**. Hold on the live "1,408 attacks blocked" counter. | **6,549 ATTACKS BLOCKED**<br/>**$0 LOST** | "The attacker's been hammering it for twelve days. The policy program refuses every one." |
| 9 | 82–90 | Tab 4 — `/atlas` footer | Quick cut to the program ID footer (`PpmZ…MSqc`) → fade to logo + URL. | **kyvernlabs.com**<br/>built on Solana | "Live now on devnet. Mainnet next." |

### Voiceover script (single take, ~88s)

> Kyvern is the device where AI workers earn real USDC for you.
> You unbox once. Three workers spawn. They start earning before the page settles.
> Workers post tasks, claim them, complete them — every line is a real Solana transaction.
> Click any row. The signature is real. The chain is the source of truth.
> The Anchor program enforces every limit — per-transaction, daily, weekly. Block it once, and the chain refuses every retry.
> Workers hire each other. The treasury escrows the bounty. The claimer earns it on completion.
> Atlas is our reference agent. Twelve days running. Nine dollars seventy earned. Six thousand five hundred attacks blocked. Zero lost.
> Agents shouldn't have keys. They should have budgets — and jobs.
> Kyvern. Live on Solana devnet. Mainnet next.

### Editing notes (Cut A)

- Music: ambient/electronic, key change on shot 7 (Atlas reveal)
- Text overlays: SF Pro Display, white on near-black backdrop, 2px green underline accent (#22C55E)
- Mobile-status-bar mask: 9:16 with the iPhone notch/Dynamic Island visible — that's a feature, not a bug, it tells judges this is a real screen recording, not a mockup
- End card: black, 1.5s, "kyvernlabs.com · Built for Colosseum Frontier"

---

## Cut B — 2:30 horizontal director's cut

Same story, more proof. Use this in the Frontier judging form + KAST submission.

### Shot list (15 shots)

| # | T (s) | Screen | Action | Notes |
|---|---|---|---|---|
| 1 | 0:00–0:08 | Landing hero | Slow zoom on the live Atlas observatory cell on `/`. Numbers tick. | The judge sees a live agent before they see a pitch. |
| 2 | 0:08–0:14 | Manifesto | Hold on "Agents shouldn't have keys. They should have budgets — and jobs." | The promise. |
| 3 | 0:14–0:22 | `/unbox` | Tap **Get started** → unboxing cinematic. | Same as Cut A shot 2. |
| 4 | 0:22–0:32 | `/app` EarningsHero | Land + hold. Sparkline ticks once. | Hero number scrambles in. |
| 5 | 0:32–0:48 | `/app` ActionFeed | Pan slowly through the feed. Hold on the row sequence: Sentinel posted → Wren claimed → Wren completed → Pulse staked. | The full trio loop in one frame. |
| 6 | 0:48–1:00 | Click → Explorer | Tap a `complete_task ✓` sig pill. New tab opens to Solana Explorer. Show the actual SPL token transfer ix. | The signature is real. Show the cluster URL: `?cluster=devnet`. |
| 7 | 1:00–1:10 | Back to `/app` PolicyShield | Tap to expand the drawer. Show the last 5 policy decisions. One blocked. | The moat made visible. |
| 8 | 1:10–1:20 | Switch to `/app/agents/[Sentinel]` | Worker detail. Hold on the **EconomicTimeline**. | Per-worker proof. |
| 9 | 1:20–1:32 | `/app/tasks` | Tap **Jobs** tab. Hold on the three tabs (Open / In progress / Completed). Tap one completed task → escrow + payment Explorer pills visible. | The full job lifecycle. |
| 10 | 1:32–1:42 | `/atlas` Earnings Hero | Land. Hero shows "$9.70 in 12 days" + 14-day sparkline. | The credential. |
| 11 | 1:42–1:54 | `/atlas` EconomyStats | Hold on the 5-cell strip — 7,068 on-chain · 7.3% success rate. | Most are blocked attacker probes. |
| 12 | 1:54–2:06 | `/atlas` AttackWall | Pan through the wall. Each row is a real failed Solana tx. Tap one — Explorer opens. Confirm the program log line. | The chain refused. |
| 13 | 2:06–2:14 | Anchor program on Explorer | Show `PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` page. Native program, native errors. | The moat is on Solana, not on our server. |
| 14 | 2:14–2:22 | `/docs` install snippet | Single shot of `npm i @kyvernlabs/sdk` + `vault.pay({...})`. Five lines. | The dev story. |
| 15 | 2:22–2:30 | End card | Logo, URL, "Built for Colosseum Frontier · May 2026". | Sign-off. |

### Voiceover script (Cut B)

> Atlas has been live for twelve days on Solana devnet. Nine dollars seventy earned. Seven thousand on-chain enforcement events. Zero funds lost. That's not a mockup. That's a real agent surviving real attacks under a real policy program.
>
> Today, three workers ship with every Kyvern device.
>
> Sentinel watches bounty boards. When it finds a high-value listing it posts a paid research task. The escrow lands on-chain immediately — your vault sends USDC to the platform treasury, locked until a claimer delivers.
>
> Wren is the claimer. It picks up the task, validates it, and complete_task releases the bounty from the treasury directly to Wren's vault. Real Solana transaction. You can click any of these signatures and verify on Explorer right now.
>
> Pulse is the validator and staker. When it sees a high-conviction price move it stakes USDC on the finding — proof of belief on-chain.
>
> Every transaction passes through the Kyvern Anchor program. Per-transaction caps, daily budgets, merchant allowlists, kill switch. The chain enforces them, not our server. If a worker tries to spend over budget, the program refuses, and the failure is on the public ledger.
>
> Atlas's attacker has been trying to drain it for twelve days. Six thousand five hundred attempts. Zero successes. That's the moat.
>
> Kyvern: AI workers that earn real USDC under your control. Live on devnet today. Mainnet next.

### Editing notes (Cut B)

- Open with 1.5s of pure black + a single audio sting (e.g. SOL chime) before the first frame
- B-roll on shots 6, 12, 13 — the Explorer cuts. Keep them under 4s each so the pace doesn't drop
- Voiceover delivered straight, no "imagine if" hypotheticals — every claim is verifiable
- End card lingers 2s. Outro music drops -3dB at 2:25 so the URL line is the last thing the judge hears

---

## Asset checklist (do these before recording)

- [ ] Atlas USDC ATA top-up ≥ $5
- [ ] One test device pre-funded with $1 USDC seeded from Atlas via `kyvern.fund` merchant
- [ ] Trio agents pre-spawned and active on test device (so the ActionFeed has rows)
- [ ] One bounty post / one task completion / one stake captured in the last 30 minutes (so the feed shows recent activity, not stale)
- [ ] Explorer cluster query string verified: `?cluster=devnet` on every link
- [ ] localStorage cleared on the unboxing tab (`kyvern:unboxed` removed)
- [ ] Phone Do Not Disturb on; brightness 80%; battery > 50%
- [ ] Screen orientation locked
- [ ] At least one rehearsal pass to verify timing — recording itself is one take per cut

## What NOT to show

- The Circle faucet UI (judges don't need to see plumbing)
- Any ssh/pm2/build output
- The `/api/verify/phase-1` harness
- The `app.kyvernlabs.com` URL fully (cut to logo before the end so the URL only appears once, on the end card)
- The unboxing's "Reveal device key" Privy flow if it's slow to render — switch to a pre-unboxed tab if it stalls

## Submission destinations

- Cut A (90s vertical) → Frontier landing-page hero + Twitter pinned tweet
- Cut B (2:30 horizontal) → Frontier judging form + KAST submission + LinkedIn

## Final reminders

- Both cuts must end with a real Explorer link clicked — judges trust what they can verify themselves
- Don't narrate features. Show transactions.
- "Real USDC" is the phrase that does the work. Use it once at 0:14 and once at 2:14.
