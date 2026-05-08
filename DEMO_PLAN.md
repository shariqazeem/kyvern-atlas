# Kyvern · Live Demo Plan

The 2-minute working demo for Frontier submission. Every step is
verified live against production as of submission day. Atlas is the
side-proof you cut to once; the device + workers + SDK + drain refusal
are the centerpiece.

---

## Live state verified just before record

```
✓ kyvernlabs.com /app /try /atlas /docs       all 200
✓ SOL spot                                    ~$92 (Pulse trigger window is open)
✓ Atlas                                        18 d up · 8,700+ cycles · 3,300+ attacks blocked
✓ /api/atlas/revenue                           $24+ from 2,400+ real x402 payments · last <60 s ago
✓ /api/atlas/feed                              real HTTP 402 with x-payment-required headers
✓ /api/vault/pay drain                         decision:"blocked", code:"merchant_not_allowed"
✓ SDK Vault.pay() against live API             over-cap blocks at chain layer
✓ Pulse trigger pipeline                       fires real on-chain spends, anchors signal
```

Re-run the live probes on the morning of recording — paste the SOL
spot price into your trigger threshold so the fire happens within
seconds of saving.

---

## Pre-record checklist (1 hour before pressing record)

1. **Fund a fresh demo vault** — log into `/app`, fund $25+ devnet
   USDC via the Circle faucet. This is *your* device for the recording,
   not Atlas. Atlas is the side-proof you cut to once.

2. **Stage Pulse**: in Pulse Configure, set the trigger to
   `SOL below $X` where X is **$0.50–$1.00 above current spot** (so it
   fires within ~5–10s of saving). Spend `$0.10`, swap into `SOL`.
   Save and **clear the inbox** so the trigger fire is fresh on camera.

3. **Spawn target ready**: confirm "Open a bay" lands in the bay
   panel and Sentinel/Wren/Pulse are pickable. Pre-pick the template
   you'll spawn so you can hit Save fast on camera.

4. **Pay.sh sandbox pre-loaded**: have
   `https://payment-debugger.vercel.app/mpp/quote/AAPL` open in another
   tab so the 402 response is instant. Have a terminal ready with the
   `curl` command pre-typed.

5. **Drain button ready**: open `/atlas` in a tab, scroll to the
   drain callout. The chain refusal here is more reliable than
   `/api/vault/pay` mid-recording (Atlas's vault never has the
   spending-limit issue your demo vault might).

6. **Audio + recording prep**: screen recorder ready (vertical 9:16
   1080×1920 for X / Frontier showcase, horizontal 16:9 1920×1080 for
   accelerator track). Captions on for X. Music subtle, ambient,
   drum-machine — no melody. Voice-over post-recorded.

---

## The 2-minute flow

| Time | On screen | Voice / action |
|---|---|---|
| **0:00–0:08** | `/app` device — three starter workers in their bays | "This is Kyvern. A Solana device for your AI agent. Three workers in bays, one vault, an on-chain budget program enforcing every dollar." |
| **0:08–0:18** | Cut to `/atlas` hero + Economic Ledger ticking | "Our reference deployment has been autonomous for 18 days. 8,700 cycles. 3,300 attacks refused. Real x402 subscribers paying right now — last payment less than a minute ago." (point to timestamp ticking) |
| **0:18–0:35** | Back to `/app` → click into Pulse worker | "These workers ship as templates. Each is configurable — let's tune Pulse." Show the Configure card with the SOL trigger. |
| **0:35–0:55** | Hit Save with threshold below current spot · trigger fires on next tick · inbox slides in | "I just told the device: when SOL drops below $X, fire $0.10 into SOL." (within 5–10 sec the ticker animates a fire) "Chain validated. Swap settled. Receipt on Explorer." Click the ✓ ON-CHAIN finding → Explorer link opens. |
| **0:55–1:15** | Hit "Open a bay" → spawn picker → pick a template | "But the three workers are templates. The product is the device under them — and the SDK that lets builders ship workers their own life needs." Pick a template, save, new worker animates into the bay. |
| **1:15–1:40** | Switch to "Use the device" panel · Pay.sh tab on screen + terminal | "Here's how a builder hits a paywalled endpoint." Live `curl https://payment-debugger.vercel.app/mpp/quote/AAPL` → show the 402 response. Then run a Node one-liner: `vault.pay({...})` → real settled signature → retry the curl with `-H "X-PAYMENT: <sig>"` → 200 with the AAPL quote. **Live, not pre-recorded.** |
| **1:40–1:55** | Back to `/atlas` → drain attempt button | "What if your agent tries to drain $50?" Click drain. Red toast → Explorer link to a real failed Solana tx. "Chain refused. USDC stayed in the vault." |
| **1:55–2:00** | End card | "Kyvern. The chain decides every dollar. **kyvernlabs.com**." |

Every step in that table is verified working as of recording day.

---

## What's rare about this demo

Most Frontier submissions show an idea. You're showing receipts. You
will be one of very few teams who can:

- Show the chain refusing a real drain mid-recording (real failed
  Solana tx, clickable Explorer link)
- Show a real x402 protocol round-trip from a paywalled endpoint to
  a settled signature, end-to-end, on screen
- Cut to 18 days of unbroken on-chain receipts that no one can fake
  between submission and judging

That's the unfakeable moat. Lean on it.

---

## Failure-mode contingencies

If something goes sideways during recording, don't try to fix on
camera — switch to the contingency, finish the take, edit clean.

- **SOL pumps above your trigger threshold**:
  Flip the direction. `SOL above $X` works the same. Real fire, real
  receipt, no narrative loss.

- **Pulse doesn't fire within ~10 seconds**:
  Cut. Re-record from the Configure save. Don't narrate the wait.

- **Atlas economic ledger looks flat / stale**:
  Refresh the page. atlas-subscriber pays every 5 minutes — there
  will always be a recent row within ~5 min. If pm2 has glitched,
  `pm2 restart atlas-subscriber` pulls it back.

- **Drain on `/api/vault/pay` returns 502 squads_cosign_failed**
  (Squads period cap exhausted on demo vault):
  Use `/atlas` drain button instead. That route uses Atlas's vault
  with a fresh probe call — never has the period issue.

- **Pay.sh sandbox is down** (rare — Vercel-hosted):
  Use `kyvernlabs.com/api/atlas/feed` instead. Same x402 protocol,
  our own publisher. Same demo, slightly different URL.

- **Browser dev console errors during /app screen capture**:
  Open in incognito. No extensions. Pre-clear `localStorage`. Devnet
  USDC funded fresh.

---

## What to say on camera (script blocks for narration)

Keep narration short, declarative, no hedge. Voice-over post-recorded.

**Hook (0:00–0:08)**
> "This is Kyvern. A Solana device for your AI agent. Three workers
> in bays, one vault, an on-chain budget program enforcing every dollar."

**Atlas proof (0:08–0:18)**
> "Our reference deployment has been autonomous for 18 days. 8,700
> cycles. 3,300 attacks refused. Real x402 subscribers paying right
> now — last payment was less than a minute ago."

**Configure Pulse (0:18–0:35)**
> "These workers ship as templates. Each is configurable. Let's tune
> Pulse — the conditional trigger worker."

**Pulse fires (0:35–0:55)**
> "I told the device: when SOL drops below ninety-three, fire ten
> cents into SOL. SOL is at ninety-two right now. Chain validates.
> Swap settles. Receipt on Solana Explorer."

**Spawn (0:55–1:15)**
> "But the three workers are templates. The product is the device
> under them — and the SDK that lets builders ship workers their own
> life needs."

**SDK + Pay.sh (1:15–1:40)**
> "Here's how a builder pays a paywalled endpoint. The server returns
> a four-oh-two challenge. The vault signs the payment. The chain
> enforces your budget. Retry with the receipt — paid."

**Drain (1:40–1:55)**
> "What if your agent tries to drain fifty dollars to a merchant the
> chain doesn't know? Refused. USDC stays in the vault."

**Close (1:55–2:00)**
> "Kyvern. The chain decides every dollar. Kyvernlabs dot com."

---

## Where you can lose

The infographic is right that the demo is the deck. Your three risk
points:

1. **Hook flat in first 10s** → judge scrolls past. Mitigation: open
   on the live device, *not* a title card. Movement on screen from
   second one (the live ticker, the Atlas pulse).
2. **Live moment fails on camera** → don't try to repair. Cut, retry,
   edit. Two takes minimum.
3. **Audio bad** → most submissions sound like a Zoom call. Voice-over
   post-recorded with a quiet room and a real mic if you have one.

---

## After-record checklist

- [ ] Trim to under 2 minutes (90s vertical, 2:30 horizontal track)
- [ ] Captions burned in (most viewers watch X muted)
- [ ] Both videos uploaded to YouTube (unlisted) for stable URLs
- [ ] Test the YouTube link from a different device
- [ ] Pinned thread drafted in `SUBMISSION_AMPLIFICATION.md` ready to fire
- [ ] Submit to Frontier T-6h before deadline (target 17:59 if 23:59 hard cutoff)
- [ ] KAST submission queued
- [ ] Personal X account ready to amplify from `@shariqshkt`

You've built more than the average winner. Two takes, pick the second,
ship.
