# Kyvern · Demo Day Checklist

**Date:** Tuesday, 2 June 2026
**Venue:** NICAT, Old Airport, Rawalpindi, Islamabad
**Slot:** 2:00 PM onwards · 3 minutes strict · Q&A after
**Submit:** Pitch deck via the form by **Sunday 31 May**

---

## Files in this folder

All files live inside this `decks/` folder.

| File | Use |
|---|---|
| `kyvern-pitch-deck.pptx` | The 7-slide deck. Upload via the registration form. |
| `REHEARSAL-SCRIPT.md` | Full natural-sentence pitch + Q&A answers — memorize this. |
| `demo-cue-card.pdf` | 1-page cue card — print A4 landscape, keep on the lectern. |
| `kyvern-backup-demo.mp4` | 60-second silent backup demo. Cue in a second browser tab. |
| `DEMO-DAY-CHECKLIST.md` | This file. |

---

## T-3 days · Friday 30 May (rehearsal in your room)

- [ ] Run the deck end-to-end **10 times out loud** with a timer. Land at 2:55–3:00 every time.
- [ ] Run the live demo flow **20 times**. Each click should be muscle memory.
  - Click 1: ParallaxPay → `Run prediction agent` → wait for 2 settled txs → click Explorer
  - Click 2: Pay.sh card → `Try $5 over-cap` → wait 3s → click the failed sig Explorer
  - Click 3: Tab → `kyvernlabs.com/app/developer` → point at the live SDK events
- [ ] Read the **anticipated Q&A** answers out loud. Memorise the killer one-liners.
- [ ] Watch the backup `kyvern-backup-demo.mp4` once. Know what each scene shows.

## T-1 day · Monday 1 June (in Islamabad, hotel)

- [ ] **Top up the Atlas vault** via faucet.circle.com (Solana Devnet) — get to ≥ $20 USDC. The 3:30 UTC nightly maintenance is idempotent so this should be fine, but double-check `kyvernlabs.com/atlas` shows funded.
- [ ] **Top up your /app demo vault** to ≥ $5 USDC. ParallaxPay calls cost $0.002 per run; you'll do 3–5 runs.
- [ ] **Restart pm2 processes** on the VM if anything looks degraded:
  ```
  ssh -i ~/Documents/ssh-key3.key ubuntu@80.225.209.190 \
    'pm2 restart kyvern-commerce atlas atlas-attacker agent-pool && pm2 list'
  ```
- [ ] **Verify all surfaces are 200 OK:**
  ```
  curl -sS -o /dev/null -w "%{http_code}\n" \
    https://kyvernlabs.com/ \
    https://kyvernlabs.com/app \
    https://kyvernlabs.com/app/developer \
    https://app.kyvernlabs.com/api/atlas/status
  ```
- [ ] **Test ParallaxPay once** on the real vault. Confirm two Explorer links work.
- [ ] **Charge laptop to 100%.** Pack the charger and a USB-C to HDMI adapter.

## Morning of · Tuesday 2 June

- [ ] **08:00** — restart pm2 stack once more on the VM (clean state for the show).
- [ ] **09:00** — coffee. Read the cue card top to bottom.
- [ ] **10:00** — run the live demo flow 3 times in a row.
- [ ] **12:00** — lunch (light), arrive at NICAT by 13:30.

## At the venue (T-30 min)

- [ ] Connect to venue wifi. **Test live:** open `kyvernlabs.com/app`, click `Run prediction agent`, verify Explorer link opens.
- [ ] **Open three browser tabs in this order** (left to right):
  1. `kyvernlabs.com/app` — logged in, vault loaded, scroll position on ParallaxPay card
  2. `kyvernlabs.com/app/developer` — Live events panel visible
  3. `kyvern-backup-demo.mp4` open in a media player, paused on frame 0
- [ ] **Browser settings:**
  - Hide bookmarks bar (`Cmd+Shift+B`)
  - Zoom level: 100% on /app, 125% if the projector is small
  - Cursor highlighter on (System Settings → Accessibility → Pointer)
- [ ] **OS settings:**
  - Do Not Disturb ON (no Slack pings on stage)
  - Brightness: maximum
  - Plug in charger if possible
- [ ] **Mute Mac audio** (the backup demo is silent so no problem, but better safe).
- [ ] Open `demo-cue-card.pdf` on your phone for one last glance.

## When you're called up

- [ ] **Walk slow.** Don't rush the laptop hook-up.
- [ ] **Connect to projector.** Confirm the screen mirrors before you say a word.
- [ ] **Open deck full-screen.** Press `Cmd+Enter` (Keynote) / `F5` (PowerPoint).
- [ ] Take **one breath**.
- [ ] **Start with the cover slide and the opening line:**
  > "I'm Shariq. I built Kyvern. We give AI agents a wallet that can't go rogue."

## During the demo

- [ ] When you switch to the live `/app` tab, **say it out loud**: *"Let me show you instead of telling you."*
- [ ] When you click `Run prediction agent`, **narrate while waiting**: *"This is calling CoinGecko, then DeepSeek. But before each call, a Solana transaction. Watch."*
- [ ] When the Explorer links appear, **click one of them**: *"Real signature. Real Solana tx."*
- [ ] When you click `Try $5 over-cap`, **count out loud**: *"Three seconds. Refused. Not by my server — by the program."*
- [ ] Switch to Developer mode tab: *"Every `vault.pay()` from any agent lands here in real time. Four lines of SDK code."*
- [ ] Switch back to deck for slides 5–7.

## If wifi flakes

> "Let me show you the same thing pre-recorded."

- Click the backup video tab. Play. No apology, no explanation.
- Narrate over the silent video using the same script.
- Resume on the deck when it ends.

## Q&A (judges ask 1–3 questions)

Anticipate these — answer in ≤ 25 seconds each. **One sentence, one breath, one pause.**

| Q | A |
|---|---|
| What stops someone copying you? | "The Solana program. Anyone can write an SDK. The hard part is the policy program — 39 days, 17,000 attempts, zero failures." |
| Why Solana, not Ethereum? | "400ms finality, 1¢ fees. An agent making 100 metering calls a day on Ethereum costs more than the calls themselves. Solana is the only place this is structurally clean." |
| How do you make money? | "SaaS dashboard, SDK take-rate on mainnet metering, Kyvern Shield as a premium upsell. SDK free forever to feed the developer flywheel." |
| Who's the first customer? | "Solana agent builders today — x402, KAST, pay.sh. ParallaxPay is already integrated. Atlas shows the rest what good looks like." |
| Why should *you* win? | "Because this isn't vibe-coded. Six months of architecture before a line of code. Two on-chain programs. Three framework adapters. A reference agent running for a month with zero losses. I shipped infrastructure, not a hackathon project." |

## After

- [ ] **Stay through dinner.** Talk to every judge and every other founder.
- [ ] Give business card or direct people to `kyvernlabs.com`.
- [ ] Follow up via the WhatsApp group.

---

**Submit by Sunday 31 May:**
- Pitch deck → upload `kyvern-pitch-deck.pptx` to https://forms.gle/dTbSmKtEfjqY8HCY8
- Mode of pitch → **onsite** (recommended)

**You've got this. Inshallah, first place.**
