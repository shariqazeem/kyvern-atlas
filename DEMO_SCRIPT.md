# Kyvern · Demo video · step-by-step (3:00)

Read this script while you go through the steps. Each beat is what
you say + what you do on screen, in order. Natural voice. You're
demoing your own product, not narrating an ad.

**Before recording, fill these in from `/api/atlas/status`:**

```
DAYS    = ____
PAID    = ____
BLOCKED = ____
```

Use the same numbers in `PITCH_SCRIPT.md` and `SUBMISSION_FRONTIER.md`.

**Pre-record checklist:**
- Logged into `/app` in one Chrome tab. Refresh once so the live tape is warm.
- Solana Explorer in a sibling tab, already loaded.
- Terminal in a sibling window (you won't actually use it on camera unless step 5 calls for it).
- Browser zoom 110%. Cursor visible. System audio muted. One tab.
- Take 1 at 8:00am after sleep. Three takes max.

Total target: **2:55–3:00**. If you run over 3:05 the YouTube upload will get truncated on some viewers.

---

## STEP 1 · 0:00–0:10 · Landing + hook

**DO** — Open `https://kyvernlabs.com/`. Hero card visible. Live trust bar ticking on the right.

**SAY**

> AI agents shouldn't hold private keys. They should have budgets.
>
> *(pause 1s)*
>
> On Solana, we built that.

**HOLD** — 2 seconds of silence. Trust bar ticks. Cut to next.

---

## STEP 2 · 0:10–0:32 · Proof (Atlas)

**DO** — Click into `/atlas` (or click "Watch Atlas" on the landing nav). Observatory loads.

**SAY**

> This is Atlas. Our reference agent. It's been autonomous on Solana devnet for [DAYS] days.
>
> *(pause 1s)*
>
> [PAID] merchants paid. [BLOCKED] attacks blocked. Zero dollars lost.

**DO** — Click any refused row in the timeline. Solana Explorer opens. The program logs show `AmountExceedsPerTxMax`.

**HOLD** — 2 seconds.

**SAY**

> Every refusal is a real Solana transaction. Anyone can verify on Explorer.

---

## STEP 3 · 0:32–0:50 · Try without login

**DO** — Click back to `kyvernlabs.com`. Scroll to the hero CTAs.

**SAY**

> You can try Kyvern without signing in. Click here.

**DO** — Click **"Try a Kyvern · no login"**. The /try page loads. Four provisioning stages run in sequence on screen:
> - Spinning up your sandbox device…
> - Provisioning a Squads multisig vault on Solana devnet…
> - Wiring the Kyvern policy program (PpmZ…MSqc)…
> - Installing the three starter workers…

**SAY** *(over the provisioning animation)*

> Real Squads multisig. Real policy program. About six seconds later, you're inside `/app` with an on-chain vault of your own.

**DO** — `/app` loads automatically. Sandbox vault active.

---

## STEP 4 · 0:50–1:15 · Inside /app

**SAY**

> Your worker on the left. Vault balance, top right.

**DO** — Camera traces the hero band (2 seconds).

**SAY**

> Live Atlas tape drifting at the top. Your runtime in the middle. Your policy on the right. The chain decides every dollar that moves through this vault.

**HOLD** — 2 seconds.

---

## STEP 5 · 1:15–1:40 · Mint key + install SDK

**DO** — Scroll down to the SDK card. Click the `.env` tab.

**SAY**

> Mint a key. `kv_live_…`, shown once.

**DO** — Click the **Copy** button on the npm install row in the SDK card footer.

**SAY**

> One install. `npm install at-kyvernlabs slash sdk`. That's the whole SDK.

**DO** — Click the `vault.ts` tab. The four-line `vault.pay()` snippet shows.

**SAY**

> Four lines. Import vault. Call vault.pay. Get an on-chain decision before any USDC moves.

---

## STEP 6 · 1:40–2:10 · Wrap a real third-party agent

**This is the core proof beat. Don't rush it.**

**DO** — Click the `oracle.ts` tab on the SDK card.

**SAY**

> This is the wrap pattern. Any agent's fetch, gated by Kyvern.

**HOLD** — 3 seconds. Let the snippet read.

**SAY**

> Last quarter I built ParallaxPay. An x402 agent marketplace on Solana. Its market oracle ran free. Now it runs under Kyvern.

**DO** — Scroll down to the "Bring your own agent" card. BTC is selected by default. Click **Run prediction agent**.

**HOLD** — 3 seconds. No narration. Button shows "Polling chain…"

Result panel fills with price + prediction + two settled payment rows.

**SAY**

> Two HTTP calls. Both gated by Kyvern on chain. Both settled. Real Solana transactions.

**DO** — Click **Explorer** on the `api.coingecko.com` row. Real Solana tx loads.

**HOLD** — 2 seconds.

**SAY**

> This agent was written before Kyvern existed. One import. One wrapped fetch. Now every call it makes is gated by consensus.

---

## STEP 7 · 2:10–2:35 · Watch the chain refuse

**DO** — Cut back to `/app`. Scroll up to the right column ("Watch the chain refuse" card).

**SAY**

> Here's a real refusal. The per-tx cap is fifty cents. We'll try a five-dollar payment.

**DO** — Click **Try over-cap $5**.

**HOLD** — 3 seconds of silence.

Refused panel appears.

**SAY**

> Three seconds. Refused on chain. Error code twelve thousand two.

**DO** — Click the Explorer link in the result panel. Show the failed tx with `AmountExceedsPerTxMax` in program logs.

**HOLD** — 2 seconds.

---

## STEP 8 · 2:35–2:50 · Pay.sh interop

**DO** — Cut back to `/app`. Scroll to the Pay.sh card.

**SAY**

> Pay.sh ships the x402 rail. Kyvern's the authorization layer above it.

**DO** — Click **Try $0.001 settled call**. Pulse traverses Your Code → Kyvern → Pay.sh. Settled signature appears.

**HOLD** — 2 seconds.

---

## STEP 9 · 2:50–3:00 · Close

**DO** — Cut to the landing page one last time. The manifesto frame visible.

**SAY**

> AI agents are going to spend trillions of dollars on their own.
>
> *(pause 1s)*
>
> Today, Atlas runs on it. Today, the SDK ships.
>
> *(pause 1s)*
>
> We ship to mainnet next month.

**HOLD** — Fade on the tagline: *"Agents shouldn't have keys. They should have budgets."*

**END** — 3:00 exactly.

---

## Reading discipline

- Speak the way you actually speak when you're walking someone through your own product. Not announcer voice, not corporate voice.
- ~140 wpm. Slow on the numbers in Step 2 (each one is a beat). Faster through the install + tab clicks in Step 5 (action carries the pace).
- The strongest line in the whole script is *"This agent was written before Kyvern existed. One import. One wrapped fetch. Now every call it makes is gated by consensus."* — land it slow. Lower register.
- Em-dashes don't appear in any spoken line. If you forget mid-take and add one, just continue with a period instead.
- If a take goes wrong: stop, breathe, restart the beat from the top, keep rolling. Editor splices.

## If a step goes wrong on camera

| Symptom | Action |
|---|---|
| Step 3 `/try` provisioning hangs > 12s | Stop take. Top up server fee-payer at faucet.solana.com (vault create costs ~5000 lamports). Retry. |
| Step 6 button stuck on "Polling chain…" > 8s | Stop take. Refresh `/app`, top up fee-payer, retry. |
| Step 6 returns "Refused on chain · merchant_not_allowed" | Auto-allowlist failed. Manually add `api.coingecko.com` + `api.commonstack.ai` in /app allowlist. Retry. |
| Step 6 prediction text empty (Commonstack fallback) | The 2 settled payments still tell the policy story. Cut the camera pan to the prediction text in that take, finish the rest. |
| Step 7 refused panel doesn't appear in 5s | Network slow. Take 2. |
| Explorer link 404s | Your fee-payer ran out of SOL during the tx submit. Top up. |

## Take log

| Take | Time start | Notes |
|------|------------|-------|
| 1    |            |       |
| 2    |            |       |
| 3    |            |       |
