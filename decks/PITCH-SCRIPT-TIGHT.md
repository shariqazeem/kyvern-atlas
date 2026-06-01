# Kyvern · Pitch Script (Tight Version)

> **Use this one for the hotel rehearsal — it matches the deck slide-by-slide.**
>
> Total target: **2:55**. Stand. Pause where you see `(…)`. Breathe where you see `[breath]`. **Bold** = anchor line (don't skip).

---

## SLIDE 1 · COVER · 0:00 → 0:08 (8s)

**On screen:** Kyvern wordmark · "Solana's policy layer for AI agents." · 39d · 17,339 · 6,905 · $0.00

> Hi everyone. I'm Shariq. I built Kyvern.
>
> (one beat)
>
> **We give AI agents a wallet that can't go rogue.**

---

## SLIDE 2 · THE PROBLEM · 0:08 → 0:23 (15s)

**On screen:** "Every AI agent that touches money today uses somebody's keys."

> Here's the problem.
>
> (one beat)
>
> **Every AI agent today that touches money uses somebody's keys.**
>
> Yours. Your company's. A developer's.
>
> [breath]
>
> One bad inference. One runaway loop.
>
> **Your wallet is empty.**

---

## SLIDE 3 · THE SOLUTION · 0:23 → 0:38 (15s)

**On screen:** "Kyvern gives your agent a Visa with a daily cap." · Budgets · Allowlists · Kill switch

> So I built Kyvern.
>
> **Think of it like a Visa with a daily cap — for AI agents.**
>
> [breath]
>
> You set a budget. You pick which merchants it can pay. You get a kill switch.
>
> And Solana enforces all of it on-chain — before a single dollar moves.

---

## SLIDE 4 · LIVE DEMO · 0:38 → 1:53 (75s)

**Switch to browser → `kyvernlabs.com/app`**

> **Let me show you instead of telling you.**
>
> *(on `/app`, top of page)*
>
> This is my Kyvern device. Real Solana smart account. Built on Squads — **ten billion dollars** secured on Solana.
>
> (pause — let them look at the device strip)
>
> *(scroll to ParallaxPay card)*
>
> This is a third-party AI agent — ParallaxPay. I ported it in two hours. Watch.
>
> *(click `Run prediction agent` — wait 10s for two settled signatures)*
>
> **Two real Solana transactions just settled.**
>
> Click.
>
> *(click first Explorer pill — Explorer opens)*
>
> Real signature. Real on-chain.
>
> [breath]
>
> *(switch back to /app · scroll to Pay.sh Interception card)*
>
> Now I tell it to spend five dollars. My per-transaction cap is fifty cents.
>
> *(click `Try $5 over-cap` — wait 3s)*
>
> Three seconds.
>
> (pause)
>
> **Refused.**
>
> Not by my server. By the Solana program.
>
> *(click failed-sig Explorer pill)*
>
> Real failed transaction. Error code 12002.
>
> [breath]
>
> *(click "Developer mode" tab)*
>
> And this is what builders see. Every `vault.pay()` from any agent lands here in real time.
>
> **Four lines of SDK code.**

---

## SLIDE 5 · HOW IT WORKS · 1:53 → 2:05 (12s)

**Switch back to deck**

**On screen:** Three cards — Your agent / Kyvern on-chain / Squads settles

> Three pieces.
>
> Your agent calls `vault.pay()`. Kyvern checks the rules on Solana. Squads moves the USDC — or refuses.
>
> [breath]
>
> Both programs chained atomically. Either rejects, the whole thing reverts.
>
> **The chain is the arbiter. Not me. Not my server.**

---

## SLIDE 6 · LIVE + ROADMAP · 2:05 → 2:30 (25s)

**On screen:** Numbers grid + roadmap rail (Now · Next · Later)

> What's live:
>
> Atlas, our reference agent, has been autonomous on Solana for **thirty-nine days.**
>
> (pause — let the number breathe)
>
> Seventeen thousand attempts. Six thousand nine hundred blocked on-chain. **Zero dollars lost.**
>
> SDK live on npm. The third-party agent you just saw is real.
>
> [breath]
>
> What's next:
>
> Mainnet. Then **Kyvern Shield** — ML threat detection and an on-chain circuit breaker.
>
> Later: the **Kyvern Device** — physical hardware your agent lives in. And an agent playground where every agent pays every other agent through x402.
>
> (pause)
>
> **This isn't a hackathon project. It's an infrastructure company.**

---

## SLIDE 7 · THE ASK · 2:30 → 3:00 (30s)

**On screen:** "Build with us." · Builders · Partners · Feedback

> One last thing.
>
> (pause)
>
> I'm raising a pre-seed privately — happy to talk about that after dinner.
>
> [breath]
>
> But here in this room — three asks.
>
> **Builders** — integrate the SDK. Ship an agent under Kyvern policy.
>
> **Partners** — KAST, pay.sh, Solana ecosystem teams — let's talk.
>
> **Feedback** — I built this for you. Tell me what's missing.
>
> [breath]
>
> Live at kyvernlabs dot com.
>
> (pause — drop voice slightly)
>
> Thank you.
>
> *(hold the room for one beat. Then smile. Then walk off.)*

---

## THE 7 LIFELINE SENTENCES — your safety net

If you blank, find the next one in order and resume:

1. We give AI agents a wallet that can't go rogue.
2. Every AI agent today uses somebody's keys.
3. Think of it like a Visa with a daily cap.
4. Let me show you instead of telling you.
5. Refused. Not by my server. By the Solana program.
6. Thirty-nine days. Seventeen thousand attempts. Zero dollars lost.
7. This isn't a hackathon project. It's an infrastructure company.

---

## DEMO CLICK SEQUENCE — muscle memory required

Practice these 10× tonight. Mouth catches up to the hands, not the other way around.

1. Cmd+Tab → Chrome → `/app` tab
2. Scroll down → **ParallaxPay** card → click **Run prediction agent**
3. Wait for "2 calls settled" → click first **Explorer ↗** pill
4. Cmd+Tab back to `/app` → scroll up → **Pay.sh Interception** card
5. Click **Try $5 over-cap** → wait 3 seconds → click **failed Sig** Explorer pill
6. Cmd+Tab back to `/app` → click **Developer mode** link (bottom of page)
7. Point at the live SDK events stream
8. Cmd+Tab back to deck → Right Arrow → land on Slide 5

---

## IF THINGS BREAK ON STAGE

- **Wifi flakes / clicks don't respond:** "Let me show you the same thing pre-recorded." Switch to backup video tab. No apology. Confidence.
- **Blank mid-sentence:** Stop. Breathe. Look at the cue card on your phone or the lectern. Read the lifeline sentence for the slide you're on. Continue.
- **Demo loads slow:** Narrate the wait. *"The chain is checking. Three seconds is the typical confirmation."* Silence is your friend.
- **Question you don't know in Q&A:** "Great question. I haven't tested that, but my instinct is X — I'd love to dig into it after." Honesty > bullshit.

---

You've got this. The product is real. Just point at it.

— K
