# Kyvern · Demo video · read-aloud script (3:00)

**Before recording — fill these in from `/api/atlas/status` ≤ 30 min before take 1:**

```
DAYS          = ____
PAID_COUNT    = ____
BLOCKED_COUNT = ____
```

Use these **exact numbers** in the pitch script + Devpost writeup too.
A viewer who watches both videos will catch any mismatch.

Three takes max. Stopwatch every sentence.

---

## BEAT 1 · HOOK · 0:00–0:10

**SCREEN** — `https://kyvernlabs.com/` (landing page). Hero card, live trust bar ticking on the right. Hold steady, no scroll.

**SAY**

> AI agents shouldn't hold private keys. They should have budgets.
>
> *(pause 1s)*
>
> On Solana, we built that.

**HOLD** — 3 seconds of silence. Let the trust bar tick.

---

## BEAT 2 · ATLAS PROOF · 0:10–0:40

**DO** — Click to `https://app.kyvernlabs.com/atlas`. Observatory loads.

**SAY**

> Meet Atlas. A reference AI agent that's been running autonomously on Solana devnet for [DAYS] days.
>
> *(pause 1s · land each line as its own breath)*
>
> [PAID_COUNT] merchants paid.
>
> [BLOCKED_COUNT] attacks blocked on-chain.
>
> [DAYS] days autonomous.
>
> Zero dollars lost.

**DO** — Click **one refused row** in the timeline. Solana Explorer opens. Show `AmountExceedsPerTxMax` in the program logs.

**HOLD** — 2 seconds.

**DO** — Cut back to `/atlas`. Click **one settled row**. Real on-chain payment.

**HOLD** — 1 second.

---

## BEAT 3 · CATEGORY · 0:40–0:55

**DO** — Sign in to `/app`. Hero card loads. Atlas live tape drifts at top.

**SAY** *(lower register, slower than other beats)*

> The agent has economic agency. The chain decides every dollar.
>
> *(pause 1s)*
>
> This is what autonomous AI commerce looks like under policy.
>
> *(pause 1s)*
>
> Kyvern is the authorization layer that makes this safe.

**HOLD** — 3 seconds of silence. Camera holds on the worker card.

---

## BEAT 4 · SCENARIO REFUSAL · 0:55–1:25

**DO** — Move camera to the right column ("Watch the chain refuse" card).

**SAY**

> Here's a real test. We attempt a five-dollar payment. The per-tx cap is fifty cents.

**DO** — Click **"Try over-cap $5"**.

**HOLD** — 3 full seconds of silence. Trust the product.

The refused panel appears.

**SAY**

> Three seconds. Real Solana tx. Refused on-chain by the policy program with error code twelve thousand two. Anyone can click through to Explorer.

**DO** — Click the Explorer link in the result panel. Show the failed tx with the error code in program logs.

**HOLD** — 2 seconds.

---

## BEAT 5 ★ · BRING YOUR OWN AGENT · 1:25–2:25

**This is the killer beat. Sixty seconds. Hit four artifacts in order:
agent key → wrapper code → settled rows → Explorer page.**

**DO** — Cut back to `/app`. Scroll down to the SDK card.

**SAY**

> Kyvern isn't just for our agents. Any agent fits in four lines.

**DO** — Click the **`oracle.ts`** tab on the SDK card. The wrapped-fetch snippet shows.

**HOLD** — 4 seconds. Long enough for a fast reader to catch line 5 (`vault.pay`).

**SAY**

> I built ParallaxPay last quarter. An x402 agent marketplace.
>
> Its market oracle ran free. Now it runs under Kyvern.

**DO** — Scroll to the "Bring your own agent" card directly below. BTC is selected by default.

**SAY**

> Live. Right now.

**DO** — Click **"Run prediction agent"**.

**HOLD** — 2 seconds, no narration. Button shows "Polling chain…"

Result panel fills with price + prediction + two Explorer-linked payments.

**SAY**

> Two HTTP calls. Both routed through Kyvern's policy program. Both settled on-chain. Both visible right here.

**DO** — Camera traces the result panel slowly: prediction text → confidence → both payment rows.

**DO** — Click **"Explorer"** on the `api.coingecko.com` row. Real Solana tx opens with the agent's pubkey as signer.

**HOLD** — 2 seconds.

**DO** — Cut back. Point at the new row that just landed in Recent SDK Calls.

**SAY**

> This agent was written before Kyvern existed. One import. One wrapped fetch. Now every call it makes is gated by consensus.

---

## BEAT 6 · PAY.SH INTEROP · 2:25–2:45

**DO** — Scroll to the Pay.sh card on the right column.

**SAY**

> Kyvern is the authorization layer above the x402 rail.

**DO** — Click **"Try $0.001 settled call"**. Pulse traverses Your Code → Kyvern → Pay.sh API. Settled signature appears.

**HOLD** — 2 seconds.

---

## BEAT 7 · CLOSE · 2:45–3:00

**DO** — Cut to the landing page one last time. The manifesto frame.

**SAY**

> AI agents are going to spend trillions of dollars autonomously.
>
> *(pause 1s)*
>
> Kyvern is the authorization layer that makes that safe.
>
> *(pause 1s)*
>
> Today, Atlas runs on it. Today, the SDK ships.

**HOLD** — Fade on the tagline: *"Agents shouldn't have keys. They should have budgets."*

**END** — 3:00 exactly.

---

## Reading discipline

- ~140 words per minute, no faster. Pauses earn weight.
- "Real" appears 7 times across the script. Lean on it every time.
- Numbers always in this order: **paid → refused → days → lost.**
  Paid first frames Atlas as a worker, not a wall.
- Don't say "demo," "simulation," or "example." Say "real."
- Don't say "policy program" alone. Say "the chain decides" or "the
  policy program on Solana." The chain is the protagonist.

## If the take goes wrong

- **Beat 5 button hangs > 8s** — abort, top up SOL via faucet.solana.com, retry.
- **Refused on-chain · merchant_not_allowed** — auto-allowlist failed; add `api.coingecko.com` + `api.commonstack.ai` manually in /app, retry.
- **Empty prediction text** — Commonstack fallback engaged; the two settled txs still tell the policy story, just don't camera-pan to the prediction text.

## Take log (fill during shoot)

| Take | Time | Notes |
|------|------|-------|
| 1    |      |       |
| 2    |      |       |
| 3    |      |       |
