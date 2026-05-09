# Kyvern submission checklist

Single document with everything left to do before Frontier + Kast
Pakistan submissions, with paste-ready content per portal.

> Status as of 2026-05-09 ~16:00. T-block code is shipped + deployed
> + verified server-side. Remaining work is video, npm publish, and
> the two portal submissions.

---

## 1. Smoke pass (30 min in incognito)

Open a fresh private/incognito browser window. Run through the 14
checks below. If all green, proceed to video. If anything is broken,
fix or ask Claude to fix before recording.

```
[ ] 1. https://kyvernlabs.com/ loads in <3s. Trust bar shows live numbers.
[ ] 2. Attack wall on landing shows recent failed txs.
[ ] 3. Click any wall row → real Solana Explorer page.
[ ] 4. Click "Get a Kyvern device" → /login (or /try) → Privy auth → /unbox.
[ ] 5. Unbox plays in ~2.5s. Land on /app.
[ ] 6. Top of /app: live agent status pill ("Your agent · kv_live_… · last action …").
[ ] 7. Wizard step 1: click "Mint a key" → reveal block appears → Copy → Step 1 marks ✓.
[ ] 8. Wizard step 2: copy either install command → Step 2 marks ✓.
[ ] 9. Wizard step 3: copy snippet → Step 3 marks ✓.
[ ] 10. Wizard step 4: click "Try over-cap $5". Wait ~3-8s. Real failed Solana
       tx appears in the right column event feed. Click row → expand →
       Explorer link → finalized failed tx with Kyvern program in trace.
[ ] 11. Today stats row updated: 1 calls / 1 blocked.
[ ] 12. Wizard step 5: paste a valid Solana address → "Allowlist as MY_KAST".
       Step 5 marks ✓.
[ ] 13. Click each of the 4 affordance row tabs (Watch chain, Wrap pay.sh,
       Send to KAST, Wrap your agent). Each panel opens.
[ ] 14. /atlas + /docs unchanged from before — both load, both show
       Atlas's data.
```

If anything fails, paste the failure to Claude and ask to fix.

---

## 2. npm publish · ✅ DONE 2026-05-09

- [`@kyvernlabs/sdk@0.5.0`](https://www.npmjs.com/package/@kyvernlabs/sdk) — published
- [`create-kyvern-agent@0.2.0`](https://www.npmjs.com/package/create-kyvern-agent) — published
- `frontier-2026` git tag pushed to origin

`npx create-kyvern-agent my-agent` now scaffolds a project that pulls
SDK 0.5.0 (with `KastDestination` + `vault.checkAllowance`).

---

## 3. Record video (1–2 hours, follow TRANSFORM_24H §"60-second video")

The script is in `TRANSFORM_24H.md` lines ~280–330. Paste it into a
teleprompter or stick it on a second monitor.

**Recording state to pre-warm:**
1. Sign in with a fresh test wallet (so the device starts empty, the
   wizard is at step 1, the event feed says "your first event lands here")
2. Have terminal open in a side window with `cd ~/demo-agent && pwd`
3. Have your KAST USDC deposit address copied to clipboard (paste-ready)
4. Have Solana Explorer open in a separate tab (you'll click into it)

**Failure modes to expect on camera:**
- Wizard step 4 violation might take >5s — keep talking
- pay.sh `--sandbox curl` first call sometimes 10s — keep talking
- If anything 500s, restart pm2 and re-record from that point only

**Output:** `frontier-demo.mp4` (or YouTube unlisted URL).

If time-tight: ONE video for both submissions. The Pakistan flavor
lives in the open + close VO; middle is identical.

---

## 4. Frontier portal submission (30 min)

URL: https://www.colosseum.org/frontier (or whatever Solana
Foundation's actual portal is).

| Field | Value |
|---|---|
| Project name | Kyvern |
| Tagline | Financial safety infrastructure for autonomous agents on Solana |
| One-liner | AI agents shouldn't have private keys. They should have budgets. |
| Region | Pakistan |
| Tracks | Infrastructure & Developer Tooling, AI x Solana, Consumer Applications |
| Live URL | https://kyvernlabs.com |
| Demo URL | https://kyvernlabs.com/app (sign in to see the integration console) |
| Repo | https://github.com/shariqazeem/kyvern-atlas |
| Deck | Attach `decks/frontier.pdf` |
| Video | YouTube unlisted URL from §3 |
| Builder | Shariq Azeem · @shariqshkt |

**Description (paste into the long-form field):**

```
Kyvern is financial safety infrastructure for autonomous agents on
Solana. AI agents shouldn't have private keys — they should have
budgets. Caps, allowlists, kill switch — decided by the chain BEFORE
a single lamport moves.

What's live on devnet:
- Anchor program at PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc with 5
  enforcement rules + a kill switch (12000-12005 custom error codes)
- Atlas reference agent running continuously since 2026-04-20 (19+
  days, 8.8k+ cycles, 1.3k+ settled USDC transfers, 6.5k+ attacks
  blocked, $0 lost)
- @kyvernlabs/sdk on npm (0.5.0 — Vault, OnChainVault, KastDestination,
  vault.checkAllowance)
- create-kyvern-agent on npm (0.2.0 — scaffolds a working pay.sh +
  KAST agent in one command)
- Live integration console at /app — 5-step wizard + per-user event
  feed; the user's first failed Solana tx lands in their device feed
  in <3 seconds, with the Kyvern program in the instruction trace

The wedge: Solana Foundation's pay.sh just launched. Their docs say
"Real payments still require local user authorization." Kyvern is
what closes that gap — the chain takes the place of the wallet
approval prompt so an agent can run autonomously without compromising
safety. Kyvern is the policy layer above the rails.

Compatible with pay.sh and KAST deposit rails. Made in Pakistan by a
solo Pakistani builder (5 prior hackathon wins). Mainnet audit in
progress.
```

---

## 5. Superteam Earn (Kast Pakistan) submission (30 min)

URL: superteam.fun/listings (find the Kast Pakistan listing).

| Field | Value |
|---|---|
| Region | Pakistan |
| Project | Kyvern |
| Demo MVP URL | https://kyvernlabs.com/app |
| Deck | Attach `decks/kast-pakistan.pdf` |
| Video | Same YouTube URL from §3 |
| KAST signup | Sign up at https://go.kast.xyz/VqVO/STPAK, screenshot the confirmation email or the in-app account, attach |

**Description (paste into the long-form field):**

```
Kyvern gives Pakistani freelancers a Solana smart safe for their AI
agents. Every payment runs through an on-chain policy program that
refuses anything outside the rules — caps, allowlists, kill switch —
before a single lamport moves.

The loop ends in real life: agent earnings can flow directly into a
KAST-funded card via USDC. Paste your KAST Solana USDC deposit
address on the Kyvern device, allowlist it as MY_KAST, every agent
payout is a real on-chain USDC transfer that tops up your card. Spend
at 150M+ merchants worldwide.

$100 USDC = ~PKR 28,000. That's a meaningful month for a student or
remote worker. It deserves a real safety primitive.

Built by a solo Pakistani founder (5 prior hackathon wins). Real
on-chain enforcement live on devnet for 19+ days. Compatible with
KAST deposit rails (not partnered — we route on-chain to a public
deposit address that any KAST user owns). Kast affiliate signup
referral: https://go.kast.xyz/VqVO/STPAK

Built in Pakistan. Made for Pakistani builders.
```

---

## 6. Final smoke (15 min, ideally with one stranger)

After submitting both:

```
[ ] 1. Open https://kyvernlabs.com in incognito on a different device.
[ ] 2. Hand it to a friend / family member. "Click around for 90 seconds. Tell me what you see."
[ ] 3. Their first 90 seconds is a judge's first 90 seconds. Listen
       for confusion or "what does this do?" — those are bugs even
       if nothing 500s.
[ ] 4. Top up the server fee payer at https://faucet.solana.com if
       it's below 1 SOL. Current balance ~2.33 SOL = ~466k attempts.
       Fine for now but a daily cap window matters.
[ ] 5. Verify both submissions appear in the portals (sometimes there's
       a delay before they show up in your account).
```

---

## What's intentionally NOT in this checklist

- /atlas → /evidence URL rename (skipped — current URL works fine)
- pull-up activity sheet rebuild (T5, skipped — right column already covers)
- mainnet deploy (post-Frontier track per the honesty section)
- KAST or pay.sh co-marketing outreach (do AFTER submission, not before)
- new merchants in the on-chain allowlist (the demo set is enough)
- npm publish workflow polish (manual is fine for two packages)
- pitch deck slide-per-page rendering (the document-flow PDFs work for portals)

If a judge asks about any of these in their feedback, the answer is
"post-Frontier track."

---

## What's at the top of the checklist if you reset right now

1. **Smoke** (the 14-step list at the top)
2. **Video** (the script in TRANSFORM_24H + pre-warmed device)
3. **Frontier submit** (deck + video URL + repo)
4. **Kast submit** (same deck shape, KAST signup screenshot)
5. **npm publish** (after smoke confirms version refs are consistent)
