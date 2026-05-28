# Kyvern · Demo Day Rehearsal Script

**Pitch:** 3 minutes strict, followed by Q&A
**Date:** Tuesday 2 June 2026 · NICAT, Old Airport, Rawalpindi, Islamabad

> Memorize this. The cue card on stage is for glancing — this is for repeating in your head until it says itself.
>
> Speak it the way you'd say it to a friend who doesn't know the space yet. **Short sentences. Calm voice. Pauses where you see `<pause>`. Breath where you see `<breath>`.** The silences are not optional — they give judges time to absorb. Most founders rush. The ones who win let the room catch up.

---

## SLIDE 1 · COVER  ·  0:00 → 0:08  ·  8 seconds

> "Hi everyone. I'm Shariq. I built Kyvern. <pause> We give AI agents a wallet that can't go rogue."

**How to land it:** Stand still. Look at the judges, not at the screen. Pause one full beat after "Kyvern" so the name registers in the room.

---

## SLIDE 2 · THE PROBLEM  ·  0:08 → 0:23  ·  15 seconds

> "Here's the problem. <pause>
>
> Every AI agent today that touches money has to use somebody's keys. <breath> Yours. Your company's. A developer's. <pause>
>
> One bad inference. One prompt injection. One runaway loop. <pause> Your wallet is empty. <breath>
>
> Every AI builder I've talked to has had this scare at least once."

**How to land it:** Slow down on the three keys lines — *"Yours. Your company's. A developer's."* — let each one land as its own beat. Then build into the runaway-loop trio. That trio is the emotional hook of your whole pitch.

---

## SLIDE 3 · THE SOLUTION  ·  0:23 → 0:38  ·  15 seconds

> "So I built Kyvern. <breath>
>
> Think of it like a Visa with a daily cap — but for AI agents. <pause>
>
> You set a budget. You pick which merchants the agent is allowed to pay. You get a kill switch. <breath>
>
> And Solana enforces all of it on-chain — before a single dollar moves. <pause> The chain is the arbiter. Not me. Not my server."

**How to land it:** *"A Visa with a daily cap"* is your headline analogy. Say it confidently — don't rush past it. *"Not me. Not my server."* should land like a closing argument — a small downward inflection on each.

---

## SLIDE 4 · LIVE DEMO  ·  0:38 → 1:53  ·  75 seconds

*Switch browser to `kyvernlabs.com/app`. Announce the move so the room follows:*

> "Let me show you instead of telling you. <breath>
>
> This is my Kyvern device. It's a real Solana smart account — a Squads multisig — and Squads already secures over ten billion dollars on Solana. Right here at the top: serial number, uptime, USDC balance. <pause>
>
> Now — *(scroll down to the ParallaxPay card)* — this card is a third-party AI agent called ParallaxPay. I ported it from my prior project in two hours. <pause>
>
> Watch what happens when I press one button. *(click `Run prediction agent`)* <pause>
>
> Behind the scenes, this agent is making two API calls — one to CoinGecko for a real Bitcoin price, one to DeepSeek for a one-hour prediction. But notice the bottom — *(point at the two settled signatures)* — two real Solana transactions just landed. <pause>
>
> Click. *(open Explorer)* Real signature. Real on-chain. <breath>
>
> Now let me try to break it. *(scroll to Pay.sh Interception card)*
>
> My per-transaction cap is fifty cents. I'm going to tell the agent to spend five dollars. *(click `Try $5 over-cap`)* <pause>
>
> Three seconds. <pause> Refused. <breath>
>
> Not by my server. By the Solana program. *(point at the failed signature)*
>
> This is a real failed transaction on Solana. Error code 12002. AmountExceedsPerTxMax. The chain literally said no. <pause>
>
> And this — *(switch to /app/developer tab)* — is what builders see. Every `vault.pay()` from any agent lands here in real time. <pause>
>
> Four lines of SDK code. Any AI agent — LangChain, Eliza, Claude Agent SDK — gets a wallet with rules baked in, without changing anything else they wrote."

**How to land it:** This is your make-or-break section. Practice the **clicks before the words**. Let the screen lead — wait for the visual to settle, then narrate what just happened. Don't fight the screen. If a button takes 5 seconds to respond, narrate the wait: *"Three seconds. The chain is checking."*

---

## SLIDE 5 · HOW IT WORKS  ·  1:53 → 2:05  ·  12 seconds

*Switch back to the deck.*

> "So architecturally — three pieces. <pause>
>
> Your agent calls `vault.pay()`. <breath> Our policy program on Solana checks the rules — budget, allowlist, velocity, memo. <breath> Then Squads moves the USDC if it passes, or refuses if it doesn't. <pause>
>
> Both Solana programs chained atomically. Either one rejects — the whole thing reverts. There's no middle state. There's no off-chain trust. <pause> That's the whole product."

**How to land it:** Calm and controlled. This is your *"I'm an engineer who knows exactly what I built"* moment. Don't speed up just because the energy of the demo is still in your body.

---

## SLIDE 6 · LIVE + ROADMAP  ·  2:05 → 2:30  ·  25 seconds

> "What's already live: <breath>
>
> Our reference agent, Atlas, has been autonomous on Solana for thirty-nine days. <pause> Seventeen thousand attempts to spend. Six thousand nine hundred blocked on-chain. Zero dollars lost. <pause>
>
> The SDK is published on npm. The third-party agent you just saw — ParallaxPay — is running under our policy program in production. <breath>
>
> What's next: <breath>
>
> Mainnet. <pause> Then **Kyvern Shield** — machine-learning threat detection plus an on-chain circuit breaker that pauses an agent the second something looks wrong. <pause>
>
> Later: the **Kyvern Device** — physical hardware your agent lives in, like a Ledger but for autonomous workers. And an agent playground where every agent pays every other agent through x402. A closed-loop AI economy on Solana. <breath>
>
> That's why this isn't a hackathon project. It's an infrastructure company."

**How to land it:** *"Shipped. Not promised."* is the vibe. Read the numbers slowly so they sink in — judges should hear "39 days" and "zero dollars" as two separate facts, not one rushed phrase. The *"infrastructure company"* line at the end is your founder-credibility moment. Say it like you mean it. You do.

---

## SLIDE 7 · THE ASK  ·  2:30 → 3:00  ·  30 seconds

> "One last thing. <breath>
>
> I'm raising a pre-seed privately — happy to talk about that after dinner. <pause>
>
> But here in this room, three asks. <breath>
>
> **Builders** — integrate the SDK. Ship your agent under Kyvern policy. <pause>
> **Partners** — anyone working on KAST, pay.sh, or the Solana agent stack — let's talk integrations. <pause>
> **Feedback** — I built this for you. Tell me what's missing. <breath>
>
> Live at kyvernlabs dot com. <pause>
>
> Thank you."

**How to land it:** Drop your voice slightly on *"Thank you."* Don't smile yet — hold the room for one full beat. Then smile, nod once, walk off. Confident silence at the end is worth more than a final flourish.

---

## The 7 anchor sentences (your safety net)

If you blank on stage, **these are the seven sentences you need to remember**. Everything else can be improvised around them because you know your product.

1. *"We give AI agents a wallet that can't go rogue."*
2. *"Every AI agent today that touches money has to use somebody's keys."*
3. *"Think of it like a Visa with a daily cap."*
4. *"Let me show you instead of telling you."*
5. *"The chain is the arbiter. Not me. Not my server."*
6. *"Thirty-nine days. Seventeen thousand attempts. Zero dollars lost."*
7. *"This isn't a hackathon project. It's an infrastructure company."*

Memorize these seven word-for-word. The connective tissue between them will come.

---

## Q&A — anticipated questions and your one-line answers

Judges typically get 1–3 questions. Answer in ≤ 25 seconds each. **One sentence. One breath. One pause. Then stop.** Don't keep talking past the answer.

### Q: *"What stops someone from copying you?"*

> "The Solana program. <pause> Anyone can write an SDK. The hard part is the policy program that's been running my reference agent for thirty-nine days against seventeen thousand attempts. Audited code wrapping Squads, with real production telemetry. That's the moat."

### Q: *"Why Solana and not Ethereum?"*

> "Four-hundred-millisecond finality and one-cent fees. <pause> An agent making a hundred metering calls a day on Ethereum costs more than the calls themselves. On Solana it costs less than the latency. It's the only chain where this is structurally clean."

### Q: *"How do you make money?"*

> "Three layers. <pause> SaaS for the dashboard. SDK take-rate on mainnet metering. Kyvern Shield as a premium upsell. SDK is free forever to feed the developer flywheel."

### Q: *"Who's your first customer?"*

> "Every Solana agent builder. <pause> Today: builders on x402, KAST, pay.sh. We already have one third-party agent integrated — ParallaxPay — and the Atlas reference shows the rest what good looks like."

### Q: *"How big is the market?"*

> "Every AI agent that touches money. <pause> That's not 'large.' That's 'every agent, eventually.' The infrastructure was missing. We built it first."

### Q: *"Why should you win this?"*

> "Because this isn't vibe-coded. <pause> Six months of architecture before I wrote a single line. Two on-chain programs composed atomically. SDK with three framework adapters. A reference agent running for over a month with zero losses. I shipped infrastructure — not a hackathon project."

### Q: *"What if Squads disappears or changes?"*

> "Squads secures ten billion dollars on Solana. It's audited by Trail of Bits, OtterSec, and Neodyme. <pause> If Squads goes, so does most of Solana DeFi. We bet on the same infrastructure they do."

### Q: *"What about US/EU regulatory exposure on AI agents holding money?"*

> "The owner is always the human — Kyvern just enforces the limits the human set. The agent never holds keys; it holds a spending-limit delegation. <pause> Legally we look identical to a corporate card with a daily cap."

---

## Three rehearsal rules

1. **Rehearse the demo clicks, not just the words.** The hardest part is your hands, not your mouth. Click the buttons 20 times until you don't have to think about where they are.
2. **Rehearse with a timer set to 3:00 sharp.** If you land at 2:55, perfect. If you land at 3:05, cut one sentence. The most common over-run is slide 4 — practice it tight, watch yourself in a mirror, watch a recording.
3. **Rehearse the silences.** The pauses I marked are part of the performance, not gaps. Most founders rush; the ones who win let the room catch up. Practice the silence the way you practice the words.

---

## The 4-day rehearsal plan

| Day | Where | What |
|---|---|---|
| **Friday 30 May** | At home | Read the script out loud 5 times. Run the demo flow 10 times. |
| **Saturday 31 May** | At home | **Submit the deck** via the form. Then 5 full run-throughs with a timer. |
| **Sunday 1 June** | At home → travel | 10 full run-throughs. Pack laptop, charger, HDMI adapter, this printed cue card. |
| **Monday 2 June** | Islamabad hotel | 10 more run-throughs. The night before. By bedtime the script says itself. |
| **Tuesday 2 June** | Venue | One final clean run-through in the morning. Then trust the work. |

---

## On the morning of the demo — the right mindset

You're not pitching to people who already get it. You're showing the most beautiful demo most of them will see all year. The product is unique, the engineering is honest, the story is short.

You spent six months thinking and three months building. You're allowed to be calm. The work is already done. The presentation is just the trailer.

**You've got this. Inshallah, first place.**

— K
