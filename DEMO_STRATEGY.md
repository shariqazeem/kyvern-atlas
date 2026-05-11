# Kyvern — Frontier submission strategy

Two videos, one chain of evidence, zero slide decks.

This document is the canonical recording plan. Re-read once before
each take. Last update: P12.31 (Bring your own agent ships).

---

## What we're actually selling

Three sentences. Memorise them.

1. **The category.** Kyvern is the authorization layer for autonomous AI commerce on Solana.
2. **The insight.** Agents shouldn't have keys. They should have budgets.
3. **The proof.** Atlas has been autonomous for 20 days on devnet, 6,557+ refusals, $0 lost — every row verifiable on Explorer.

If a judge only remembers one line from either video, it's line 2.
If they remember two, it's lines 2 + 3.

---

## Why this submission can win

Frontier judges have watched fifty demos already. The pattern that loses:

- Slide decks pretending to be products.
- Future-tense talking points ("we will…", "in v2 we plan to…").
- Mock data dressed up as live data.
- A single demo agent that looks like it was built for the demo.

Kyvern's structural advantage:

- **Two real agents on the same surface.** Atlas (built into Kyvern, 20 days autonomous). The ParallaxPay market oracle (built _before_ Kyvern existed, now plugged in via SDK). One proves the product works. The other proves it works for outside developers.
- **Every action is a real Solana tx.** Refusals are real failed txs with custom error codes. Allowed payments are real `spendingLimitUse` settlements. Anyone can click Explorer.
- **Visible code-to-chain chain of evidence.** SDK card → button click → settled rows land → Explorer link. The viewer's eye traces the proof in real time.

Lean on those three things in both videos. Don't dilute.

---

## Demo video — 3 minutes, live product only

### The shape

```
0:00 ── HOOK ────────────────── 10s
0:10 ── ATLAS PROOF ─────────── 30s
0:40 ── CATEGORY ─────────────── 15s
0:55 ── SCENARIO REFUSAL ────── 30s
1:25 ── BYOA: MINT + WRAP ───── 60s   ★ the new beat ★
2:25 ── PAY.SH INTEROP ──────── 20s
2:45 ── CLOSE ─────────────────  15s
                                ─────
                                3:00
```

### Beat 1 — Hook (0:00–0:10)

**Screen:** `https://kyvernlabs.com/` landing page. Hero card. Live Atlas trust bar ticking on the right.

**Voiceover:**
> "AI agents shouldn't hold private keys. They should have budgets."
>
> "On Solana, we built that."

**Direction:** No movement on screen for 3 seconds after the line lands. Let the live ticker do the talking. Cut at 0:10.

### Beat 2 — Atlas proof (0:10–0:40)

**Screen:** `https://app.kyvernlabs.com/atlas`. Observatory loads.

**Voiceover:**
> "Meet Atlas. A reference AI agent that's been running autonomously on Solana devnet for [DAYS] days."
>
> "[PAID_COUNT] merchants — paid."
>
> "[BLOCKED_COUNT] refusals — blocked on-chain."
>
> "[DAYS] days autonomous. Zero dollars lost."

**Number rule.** `[DAYS]`, `[PAID_COUNT]`, `[BLOCKED_COUNT]` are snapshots from `/api/atlas/status` taken 30 minutes before recording. Lock those numbers and use the **exact same values** in the demo, the pitch ("Beat 4 — Proof"), and the submission writeup. A viewer who watches both videos will catch any discrepancy and lose trust. Write the snapshot values into the script file at the top before each recording session.

**Direction:**
- Pause one second per number. Slow.
- After the last line, **click one refused row** in the timeline → Solana Explorer opens in a new tab → show `AmountExceedsPerTxMax` in the program logs. Hold 2 seconds.
- Cut back, click one settled row → real on-chain payment. Hold 1 second.

This is the most important block in the demo. Stretch the four numbers.
Each one is a beat. The chain of evidence starts here.

### Beat 3 — Category line (0:40–0:55)

**Screen:** Sign in cleanly to `/app`. Hero card loads. Atlas live tape drifts at top.

**Voiceover:**
> "The agent has economic agency. The chain decides every dollar."
>
> "This is what autonomous AI commerce looks like under policy."
>
> "Kyvern is the authorization layer that makes this safe."

Short money phrase first (anchoring). Longer framing second (consolidation). The chain-decides line earns the most attention at the start of the beat.

**Direction:** Don't narrate the UI elements. Let the page breathe for 3 full seconds after the third sentence. Camera holds steady on the worker card.

This is THE thesis line of the entire submission. Land it slowly,
lower register. If you only land one sentence with conviction in
the whole 5 minutes of video, land *"The chain decides every dollar."*

### Beat 4 — Scenario refusal (0:55–1:25)

**Screen:** `/app`. Camera moves to the right column ("Watch the chain refuse" card).

**Voiceover:**
> "Here's a real test. We attempt a five-dollar payment. The per-tx cap is fifty cents."

**Direction:**
- Click **"Try over-cap $5"**.
- **Silence for 3 seconds.** No narration. Trust the product to land its own moment.
- Refused panel appears.

**Voiceover (after panel):**
> "Three seconds. Real Solana tx. Refused on-chain by the policy program with error code twelve thousand two. Anyone can click through to Explorer."

**Direction:** Click the Explorer link in the result panel. Show the failed tx with the error code in program logs. Hold 2 seconds.

### Beat 5 ★ — Bring your own agent (1:25–2:25)

**This is the new block.** It's where ParallaxPay's oracle earns its keep.
Live wrap, live mint, live settled txs. Sixty seconds.

**Screen:** Cut back to `/app`. Scroll down to the SDK card.

**Voiceover:**
> "Kyvern isn't just for our agents. Any agent fits in four lines."

**Direction:** Click the **`oracle.ts` tab** on the SDK card. The wrapped-fetch snippet shows. Hold 4 seconds — long enough that a fast reader catches the `vault.pay` line.

> "I built ParallaxPay last quarter — an x402 agent marketplace.
> Its market oracle predicts crypto prices using CoinGecko and DeepSeek.
> It used to run free. Now it runs under Kyvern."

**Direction:** Scroll down to the "Bring your own agent" card directly below the SDK card. Pick BTC (default).

**Voiceover:**
> "Live. Right now."

**Direction:** Click **"Run prediction agent"**. No narration for 2 seconds while it polls.

When the result panel fills:

> "Two HTTP calls. Both routed through Kyvern's policy program. Both settled on-chain. Both visible right here."

**Direction:**
- Camera traces the result panel: the prediction text, the confidence, the two Explorer-linked payment rows.
- Click **"Explorer"** on the `api.coingecko.com` row. Real Solana tx opens. Hold 2 seconds.
- Cut back. Point at the new row that just landed in Recent SDK Calls.

> "This agent didn't know Kyvern existed when it was written. One import. One wrapped fetch. Now every call it makes is gated by consensus."

This is the killer 60 seconds. The viewer just watched a third-party
agent get governed by Kyvern in real time. Code → click → on-chain.
You don't need to claim it; the screen claims it for you.

### Beat 6 — Pay.sh interop (2:25–2:45)

**Screen:** Scroll to Pay.sh card on the right column.

**Voiceover:**
> "Kyvern is the authorization layer above the x402 rail."

**Direction:** Click **"Try $0.001 settled call"**. Pulse traverses Your Code → Kyvern → Pay.sh API. Settled signature appears. Trimmed copy here buys 4 seconds of buffer for any chain latency in Beat 5.

### Beat 7 — Close (2:45–3:00)

**Screen:** Cut to landing one last time. The manifesto frame.

**Voiceover:**
> "AI agents are going to spend trillions of dollars autonomously."
>
> "Kyvern is the authorization layer that makes that safe."
>
> "Atlas runs on it today. The SDK ships today."

**Direction:** Fade on the tagline *"Agents shouldn't have keys. They should have budgets."* End on specifics, not flourish.

---

## Pitch video — 2 minutes, founder to camera

Different shape from the demo. No product screen. Just you, talking.
Phone or laptop webcam, natural light, no music. Colosseum cares
about how you think — not production polish.

### Beat 1 — Problem (0:00–0:30)

> "By 2027, there will be more AI agents on the internet than humans.
>
> They're going to spend trillions of dollars autonomously.
>
> And today, every one of them holds a private key.
>
> One prompt injection drains the wallet. One jailbroken agent pays a scammer."

Open on the problem. Earned authority, not claimed authority. Lean slightly forward on the last line. No smile.

### Beat 2 — Who (0:30–0:50)

> "I'm Shariq Shaukat. I'm building from Pakistan.
>
> I've shipped three x402 agent projects on Solana — I've watched this problem from inside the agent layer for a year. Kyvern is the missing piece I've been preparing to build."

Credentials sit in the middle, after the problem has already pulled the judge in. "Three x402 projects" is the only credential that matters here because it positions you inside the exact category.

### Beat 3 — Insight (0:50–1:20)

> "Agents shouldn't have keys. They should have budgets.
>
> Kyvern wraps every agent in a Squads v4 smart account with a custom Solana policy program that enforces budgets, allowlists, velocity caps, and a kill switch — on-chain, before any USDC moves.
>
> Not a server. Not a heuristic. Consensus."

The last three words are a beat. Pause between each one.

### Beat 4 — Proof (1:20–1:40)

> "Atlas, our reference agent, has been autonomous on Solana devnet for twenty days.
>
> [BLOCKED_COUNT] attacks blocked. Zero dollars lost. Every refusal verifiable on Explorer.
>
> The product works. Today."

`[BLOCKED_COUNT]` = snapshot from `/api/atlas/status` 30 min before recording. Use that **exact number** here, in the demo, and in the writeup. Reconcile before you start.

### Beat 5 — ParallaxPay + close (1:40–2:00)

> "I built ParallaxPay — an x402 agent marketplace — last quarter on Solana. It works fine, but every agent in it holds keys.
>
> Kyvern is the authorization layer underneath. Now ParallaxPay's market oracle runs under Kyvern. Same chain, no keys.
>
> Mainnet next month."

This beat now carries the BYOA story for pitch-only viewers. Both videos become independently complete. End on "Mainnet next month." Don't add a flourish.

---

## How to make the BYOA flow look real (recording detail)

This is the section the viewer will rewatch. Get the details right.

### Pre-recording state

Use a **fresh logged-in account** for the demo recording so judges see the canonical "I just deployed this" flow, not a pre-warmed playground:

1. SSH to VM. Confirm the user has a vault. If not, deploy a Custom vault named `Oracle agent · v1` with:
   - Daily cap $5
   - Per-tx $0.10
   - Allowlist: leave empty (the oracle endpoint auto-adds the two it needs)
   - Velocity: 120 calls/hour
2. Fund that vault with ~$0.10 devnet USDC (faucet, or via the funding row that appears after deploy).
3. Hard-refresh `/app` so caches are warm.
4. Confirm `COMMONSTACK_ORACLE_KEY` is set (`pm2 show kyvern-commerce` shows env vars), or accept fallback to terminal key.

### Screen choreography during Beat 5

The viewer needs to see **four artifacts** in sequence so the claim "real third-party agent under Kyvern" is undeniable:

1. **The agent key** — flash the SDK card's `.env` tab for one second. The key prefix (`kv_live_…`) tells judges this is unique to this vault.
2. **The wrapper code** — `oracle.ts` tab, four seconds. Long enough to read line 5 (`vault.pay`).
3. **The on-chain settled rows** — result panel + Recent SDK Calls both showing the two fresh payments with timestamps within the last 5 seconds.
4. **The Solana Explorer page** — click "Explorer" on one row, real tx loads with the agent's pubkey as signer, the vault's PDA as source.

If even one of those four is missing or fake-looking, the beat collapses. Hit all four. In order. Don't rush.

### If something goes wrong on take 1

- **Button stays in "Polling chain…" longer than 8 seconds:** abort the take. Either RPC is slow or fee-payer is out of SOL. Top up via `https://faucet.solana.com` (devnet) and retry.
- **Result panel shows "Refused on-chain · merchant_not_allowed":** the auto-allowlist path failed. SSH and confirm `setVaultAllowedMerchants` ran. Or manually add the two merchants on `/app` allowlist UI before retrying.
- **Prediction text returns empty:** Commonstack model unavailable. The endpoint auto-falls back to v3.2; if that also fails, the result panel still shows the two settled txs (the policy enforcement story still holds). Just don't pan to the prediction text in that take.

### Recording resolution + browser state

- **1920×1080 at 60fps.** Frontier portal compresses uploads; lower res reads as low effort.
- **Browser zoom 110%** so the smallest text (line numbers, signature prefixes) is readable on YouTube compression.
- **Single Chrome tab.** Quit Slack, iMessage, every notification source. Mute system audio so accidental sounds don't bleed in.
- **Solana Explorer pre-warmed.** Open it once before recording to avoid the spinner on first click.

---

## Submission writeup (Frontier portal, ~200 words)

Paste this as-is. Tweak the numbers from `/api/atlas/status` 30 minutes before submit so they're current.

> **Kyvern is the authorization layer for autonomous AI commerce on Solana.**
>
> AI agents are going to spend trillions of dollars autonomously. Today, they do that by holding private keys — a jailbroken agent drains the wallet, a prompt-injected agent pays a scammer. Most agent wallets today are vanilla multisigs that trust the agent.
>
> Kyvern flips that. Every agent gets a Squads v4 multisig vault wrapped in a custom Anchor program (`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`) that enforces budgets, allowlists, velocity, memo requirements, and a kill switch — on-chain, before USDC moves. Refusals are real failed Solana transactions with twelve custom error codes verifiable on Explorer.
>
> Our reference worker Atlas has been autonomous on devnet since 2026-04-20. In 20 days it has paid 1,591 real merchants on-chain, refused 3,700+ attacks, earned $22.90 from real subscribers, and lost zero dollars. Every tx is on Explorer.
>
> The SDK (`@kyvernlabs/sdk`) ships in four lines. To prove it works for outside developers, we ported the market oracle from my prior x402 project ParallaxPay — it now runs under Kyvern with on-chain authorization on every API call.
>
> Live at https://app.kyvernlabs.com. Atlas at /atlas. Mainnet next month.

---

## Twitter thread for submission day (4 tweets)

**Tweet 1**
> AI agents shouldn't hold private keys. They should have budgets.
>
> I built that on Solana for @colosseum's Frontier hackathon.
>
> Atlas, my reference agent, has been autonomous for 20 days. 6,557+ attacks blocked. $0 lost.
>
> Kyvern. Devnet today. ↓
>
> [demo video link]

**Tweet 2**
> Every refusal is a real failed Solana tx with a custom error code.
>
> Click any row in /atlas — Solana Explorer opens, real on-chain proof.
>
> The chain is the arbiter, not our server.

**Tweet 3**
> To prove the SDK works for outside developers, I ported the market oracle from my prior x402 project (@parallaxpay) into Kyvern.
>
> Four lines. One wrapped fetch. Every CoinGecko + DeepSeek call now gates on-chain before firing.
>
> Third-party agent. Same chain.

**Tweet 4**
> Mainnet ships next month after audit pass.
>
> Until then: deploy your own agent in 60 seconds at https://app.kyvernlabs.com/vault/new
>
> Try it. Watch the chain refuse.

---

## Recording order

Pitch first, demo second. Two reasons:

1. Pitch is the easier video. Lets your voice and confidence warm up.
2. If the pitch take is rough at 8am, you have 6 more hours to nail it before deadline. If the demo take is rough, you're debugging Kyvern, not re-shooting yourself.

### Tonight (after sleep)

- Pitch take 1 at 7:30am.
- Pitch take 2 at 7:50am.
- Pitch take 3 at 8:10am if neither felt right.

### Tomorrow morning

- Demo take 1 at 8:40am.
- Demo take 2 at 9:15am.
- Demo take 3 at 10:00am if needed.

**Three takes max per video.** If you're past three, stop, walk around the block, come back. Past five is sleep deprivation, not refinement.

---

## Pre-recording checklist (run T-30 minutes before each session)

### Server
- [ ] `curl https://app.kyvernlabs.com/api/atlas/status` returns running, totalCycles > 9800, uptimeMs > 1.7e9
- [ ] pm2 list shows kyvern-commerce, atlas, atlas-attacker, agent-pool all online with ≥ 5m uptime
- [ ] Fee-payer SOL balance > 0.05 SOL (check `https://explorer.solana.com/address/GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ?cluster=devnet`)
- [ ] `COMMONSTACK_ORACLE_KEY` or `COMMONSTACK_TERMINAL_KEY` set in pm2 env

### Client
- [ ] Demo vault deployed, named `Oracle agent · v1`
- [ ] Demo vault funded with ≥ $0.10 devnet USDC (covers ~50 metering calls)
- [ ] Browser zoom 110%
- [ ] Solana Explorer pre-warmed in a sibling tab
- [ ] Quit every other Chrome tab, every other app
- [ ] System audio muted

### Founder
- [ ] Slept ≥ 5 hours (6+ better)
- [ ] Water, no coffee until after take 1
- [ ] Re-read the three sentences in the **What we're selling** section
- [ ] Re-read **Beat 5** of this doc verbatim
- [ ] **Silent dry-run of Beat 5** — just the clicks, no narration. Catches three things: (1) RPC slowness that would make the beat drag, (2) whether the result panel renders the way you expect at recording resolution, (3) whether Explorer opens fast enough on first click. Three minutes here prevents thirty minutes of failed takes.

---

## Don't list

If any of these tempt you in the last 24 hours before submit, the answer is no.

- Adding a second user-facing scenario button before recording.
- Changing the demo script while wired in to caffeine.
- Re-deploying the policy program on mainnet "just to have it."
- Animating the Atlas live tape faster "so it pops more."
- Writing a fourth video.
- Refactoring `alive-console.tsx` because something feels off-by-2px.
- Engaging anyone who claims your category is taken.
- Engaging anyone who claims you should pivot.
- **Re-recording either video after submitting.** The temptation will be enormous — you'll watch the submission at 1pm and see a 50ms hitch and want to re-shoot. Don't. The hitch you see is invisible to judges. Re-recording introduces variance; the second take is usually worse because anxiety compounds. Submitted is submitted.

The plan is locked. Trust the plan. Record, submit, sleep.
