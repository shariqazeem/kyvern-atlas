# Kyvern · Demo video · 3:00

Read each step top-to-bottom while you record. Three columns:
**ON SCREEN** = what you should see / click. **SAY** = read aloud,
verbatim. **HOLD** = silent beat.

Numbers refresh once before take 1:

```
DAYS    = ___   (uptime in days from /api/atlas/status)
PAID    = ___   (totalSettled)
BLOCKED = ___   (totalAttacksBlocked)
```

Use the same three values in `PITCH_SCRIPT.md` and `SUBMISSION_FRONTIER.md`.

Total: 3:00. Don't run over 3:05.

---

## STEP 1 · Landing + hook · 0:00 → 0:12

**ON SCREEN** — Open a clean Chrome tab to `kyvernlabs.com`. You see the landing hero with the live trust bar ticking on the right.

**SAY**

> AI agents shouldn't hold private keys. They should have budgets.
>
> On Solana, we built that.

**HOLD** — 3 seconds. The trust bar keeps ticking.

---

## STEP 2 · Atlas, the live proof · 0:12 → 0:42

**ON SCREEN** — Click **"Watch Atlas"** in the top nav. The /atlas page loads. You see the four hero stats: **alive · merchants paid · attacks blocked · funds lost**.

**SAY**

> This is Atlas. Our reference agent. It's been running on Solana devnet for [DAYS] days. Fully autonomous.
>
> *(pause one beat)*
>
> [PAID] real on-chain payments. [BLOCKED] attack attempts refused by the policy engine. Zero dollars lost.

**ON SCREEN** — Scroll down past the "Atlas earned" earnings card. The next section is **the economic ledger** — a list of Atlas's recent settled payments. Each row has a short signature like `3kR8…mN4v` and an arrow icon on the right.

Click any row.

**ON SCREEN** — Solana Explorer opens in a new tab. You see a real on-chain transaction, real signature, real timestamp.

**HOLD** — 2 seconds.

**SAY**

> Every settled payment is a real Solana transaction. Anyone can click through and verify.

---

## STEP 3 · Try Kyvern without signing in · 0:42 → 1:02

**ON SCREEN** — Close the Explorer tab. Back on the /atlas page, click the **back arrow** in the top-left to return to the landing page. Scroll up to the hero CTAs.

**SAY**

> You can try Kyvern yourself, no signup. Click here.

**ON SCREEN** — Click **"Try a Kyvern · no login"**. The /try page loads and shows four provisioning steps running in sequence:

1. Spinning up your sandbox device
2. Provisioning a Squads multisig vault on Solana devnet
3. Wiring the Kyvern policy program
4. Installing the three starter workers

**SAY** *(over the provisioning animation)*

> Real Squads multisig. Real policy program. About six seconds later, you're inside the app with your own on-chain vault.

**ON SCREEN** — `/app` loads automatically.

---

## STEP 4 · Inside /app · 1:02 → 1:20

**ON SCREEN** — The /app canvas is now visible. The top row has your worker name + identity stats on the left and your vault balance on the right. Below that, a three-column layout.

**SAY**

> This is your mission control. Your worker on the left, your vault balance up top. Live Atlas tape drifting at the bottom of the worker card.

**HOLD** — 2 seconds. Camera holds on the hero band.

**SAY**

> The chain decides every dollar that moves through this vault.

---

## STEP 5 · Mint a key, install the SDK · 1:20 → 1:42

**ON SCREEN** — Scroll down to the **SDK card** in the center column. It has a macOS-style title bar with traffic-light dots and four tabs: `vault.ts` · `policy.ts` · `.env` · `oracle.ts`.

Click the **`.env`** tab. You see your agent key on screen, prefixed with `kv_live_`.

**SAY**

> Mint a key. `kv_live_...` shows once. You paste it into your env.

**ON SCREEN** — Click the **Copy** button on the install row at the bottom of the SDK card.

**SAY**

> One npm install. The whole SDK is right here.

**ON SCREEN** — Click the **`vault.ts`** tab. The four-line snippet shows: import Vault, new Vault, await vault.pay, log the decision.

**SAY**

> Four lines. Import. Call vault dot pay. Get an on-chain decision before any USDC moves.

---

## STEP 6 · Bring your own agent · 1:42 → 2:18

**This is the core proof beat. Don't rush it.**

**ON SCREEN** — Still on the SDK card, click the **`oracle.ts`** tab. The wrapped-fetch snippet shows.

**SAY**

> This is the wrap pattern. Any agent's fetch, gated by Kyvern.

**HOLD** — 3 seconds. Let the snippet sit on screen.

**SAY**

> Last quarter I built ParallaxPay, an x402 agent marketplace on Solana. Its market oracle ran free. Now it runs under Kyvern.

**ON SCREEN** — Scroll down one card. The **"Bring your own agent"** card is directly below the SDK card. BTC is selected by default. Click **"Run prediction agent"**.

**HOLD** — 3 seconds. The button shows "Polling chain…"

The result panel fills with the BTC price, a one-sentence prediction, a confidence number, and two settled payment rows.

**SAY**

> Two HTTP calls. Both gated by Kyvern on chain. Both settled as real Solana transactions.

**ON SCREEN** — Click the **Explorer** link on the `api.coingecko.com` row. A real Solana tx loads.

**HOLD** — 2 seconds.

**SAY**

> This agent was written before Kyvern existed. One import. One wrapped fetch. Now every call it makes is gated by consensus.

---

## STEP 7 · Watch the chain refuse · 2:18 → 2:38

**ON SCREEN** — Close the Explorer tab. Back on /app, scroll to the **right column**. You see a card titled **"Watch the chain refuse"** with three scenario buttons.

Click **"Try over-cap $5"**.

**HOLD** — 3 seconds. No narration.

A red refused-on-chain panel appears with error code `12002` and an Explorer link.

**SAY**

> Three seconds. Refused on chain. Error code twelve thousand two.

**ON SCREEN** — Click the Explorer link in the refused panel. Solana Explorer opens with the failed tx and `AmountExceedsPerTxMax` in the program logs.

**HOLD** — 2 seconds.

---

## STEP 8 · Close · 2:38 → 3:00

**ON SCREEN** — Close the Explorer tab. Cut back to the landing page one last time.

**SAY**

> AI agents are going to spend trillions of dollars on their own.
>
> *(pause one beat)*
>
> Kyvern is the authorization layer that makes that safe.
>
> *(pause one beat)*
>
> Today, Atlas runs on it. Today, the SDK ships.
>
> *(pause one beat)*
>
> We ship to mainnet next month.

**HOLD** — Fade on the tagline at the bottom of the landing: *"Agents shouldn't have keys. They should have budgets."*

**END** — 3:00 exactly.

---

## How to read this script

- Read every sentence as a complete sentence, the way you'd actually say it.
- Pauses are marked. Trust them. Don't speed up.
- "Polling chain..." and "Explorer opens" are the same thing happening at the same time — narration is over the loader, action follows.
- Don't try to memorise. Read it. The script is meant to be on a second screen below your camera.
- If a sentence stumbles, breathe, restart the step from "SAY". Editor can splice.

## If something breaks on camera

| What happens | What to do |
|---|---|
| **/try provisioning hangs > 12 seconds.** | Stop take. SSH and top up the server fee payer at `faucet.solana.com` (address: `GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ`). Retry. |
| **Step 6 "Run prediction agent" stuck on Polling chain > 8 seconds.** | Stop take. Refresh /app. If still slow, top up fee-payer SOL. Retry. |
| **Step 6 says "Refused on chain · merchant_not_allowed".** | The auto-allowlist failed. Manually add `api.coingecko.com` and `api.commonstack.ai` in /app's allowlist section, then retry. |
| **Step 6 prediction text is empty.** | Commonstack fallback engaged. The two settled payments still tell the story — just don't camera-pan to the prediction text in that take. Finish the rest. |
| **Step 7 refused panel doesn't appear in 5 seconds.** | Network slow. Take 2. |
| **Explorer link 404s.** | Fee-payer ran out of SOL during the submit. Top up, retry. |

## Take log

| Take | Started | Notes |
|------|---------|-------|
| 1    |         |       |
| 2    |         |       |
| 3    |         |       |
