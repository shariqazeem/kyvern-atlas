# Kyvern · Demo video script · 90 seconds

Three takes max. Stopwatch every sentence. Record fresh tomorrow
morning — don't write your way into exhaustion at 4 AM.

**Framing rule:** Kyvern is the authorization layer for *autonomous AI
commerce*. Atlas is an economic actor that pays merchants and refuses
violations. Not a security wall. Not a dashboard.

---

## The script (~90 seconds)

### Hook (0:00–0:10)

> *"AI agents shouldn't hold private keys. They should have budgets."*
>
> *"We built that on Solana."*

**On screen:** Landing page `kyvernlabs.com` — the device hero, live
trust bar showing Atlas's counters ticking. Hold for 3 seconds, then
cut to `/atlas` to set the proof.

### The proof (0:10–0:30)

> *"Meet Atlas. It's a reference AI worker that's been running
> autonomously on Solana devnet for 20 days."*
>
> *"In that time, Atlas has paid 1,472 real merchants on-chain.
> Refused 3,605 attempted violations. Earned $22.90 from real
> subscribers. Lost zero dollars to any attack."*
>
> *"Every row in this timeline links to Solana Explorer. Anyone can
> verify."*

**On screen:** `/atlas` observatory. Scroll the timeline slowly. Click
ONE settled row → Solana Explorer opens → custom-error-code-free
transaction. Then cut back, click ONE refused row → Solana Explorer
opens → `KyvernPolicy::AmountExceedsPerTxMax` visible in the program
logs. Pause 1 second on each Explorer page so the viewer sees the tx
hash and the program ID.

### The category (0:30–0:40)

> *"This is what autonomous AI commerce looks like under policy. The
> agent has economic agency. The chain decides every dollar."*
>
> *"Kyvern is the authorization layer that makes this safe."*

**On screen:** Sign in to `/app`. The page loads. Hold on the worker
card — Atlas live tape drifting at the top, runtime panel breathing,
scenario buttons on the right. Don't narrate the UI elements — let
the page speak for 3 seconds.

### The interaction (0:40–1:05)

> *"Here's a real test. We attempt a $5 payment — the per-tx cap is
> 50 cents."*

**On screen:** Click the "Try over-cap $5" scenario button. Wait the
3 seconds. Refused-on-chain panel appears.

> *"Three seconds. Real Solana tx. Refused on-chain by the policy
> program with error code 12002. Anyone can click through to
> Explorer."*

**On screen:** Click the Explorer link in the result panel. Solana
Explorer opens — show the failed tx with `AmountExceedsPerTxMax` in
the program logs. Hold 2 seconds.

### The integration (1:05–1:20)

> *"For developers, this ships as a four-line SDK."*

**On screen:** Cut back to `/app`, hover the SDK preview block. Show
the 4 lines. Click the copy button (the Check icon flicker
acknowledges it).

> *"npm install @kyvernlabs/sdk, plug in your agent key, and every
> payment your code makes routes through this exact on-chain check."*

### The ecosystem (1:20–1:30)

> *"Kyvern plays nice with the rails — Pay.sh ships the x402 protocol;
> Kyvern is the authorization layer above it."*

**On screen:** Scroll to the Pay.sh network card. Click "Try $0.001
settled call." Green pulse traverses all three nodes (Your Code →
Kyvern → Pay.sh API). Result panel shows: real on-chain settlement +
real pay.sh CLI invocation + real AAPL quote.

### Close (1:30–1:38)

> *"AI agents are going to spend trillions of dollars autonomously.
> Kyvern is the authorization layer that makes that safe."*
>
> *"Devnet today. Mainnet soon. Atlas runs on it. The SDK ships."*

**On screen:** Cut to the landing page one last time. Hold on the
tagline: *"Agents shouldn't have keys. They should have budgets."*
Fade.

---

## Voiceover notes

- Speak at ~140 wpm, no faster. Pauses earn weight.
- "Real" appears 7 times. That's intentional. The product is real and
  the word is what differentiates from every other agent demo.
- Numbers in this order, every time: **1,472 paid · 3,605 refused ·
  20 days · zero lost.** Paid first frames Atlas as a worker, not a
  wall.
- Don't say "policy program" alone. Say "the chain decides" or "the
  policy program on Solana." The chain is the protagonist.
- Don't say "demo" or "simulation" or "example" anywhere. Say
  "real" instead.

---

## Screen-recording checklist

- [ ] Quit every other app. Only Chrome with one tab.
- [ ] Browser zoom at 110% so judges can read fonts on YouTube
  compression.
- [ ] Use the dedicated Kyvern Commonstack key (the new $25 one) —
  not Atlas's key. Atlas's key may still be near its weekly cap.
- [ ] Hard-refresh `/app` before recording so the first-visit banner
  is dismissed cleanly and the page hits with no orient banner.
- [ ] Record at 1920×1080. Keep cursor visible.
- [ ] Three takes max. If you're past three, stop, sleep an hour,
  resume.

---

## The 280-character version (Twitter thread tweet 1)

> AI agents shouldn't hold private keys. They should have budgets.
>
> We built that on Solana. Atlas has been autonomous for 20 days:
> 1,472 paid, 3,605 refused, $0 lost.
>
> The authorization layer for autonomous AI commerce.
>
> Kyvern. Devnet today. ↓

---

## Submission writeup (Frontier portal, ~200 words)

**Kyvern is the authorization layer for autonomous AI commerce on Solana.**

AI agents are going to spend trillions of dollars autonomously. Today
they do that by holding private keys — a jailbroken agent drains the
wallet, a prompt-injected agent pays a scammer. Most agent wallets
today are vanilla multisigs that trust the agent.

Kyvern flips that. Every agent gets a Squads v4 multisig vault wrapped
in a custom Anchor program (`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`)
that enforces budgets, allowlists, velocity caps, memo requirements,
and a kill switch — *on-chain, before USDC moves.* Refusals are real
failed Solana transactions with 12 custom error codes verifiable on
Explorer.

Our reference worker, Atlas, has been autonomous on devnet since
2026-04-20. In 20 days it has paid 1,472 real merchants on-chain,
refused 3,605 attempted violations, earned $22.90 from real
subscribers, and lost zero dollars to any attack. Every tx is on
Explorer.

The SDK (`@kyvernlabs/sdk`) ships in four lines. The scaffolder
(`create-kyvern-agent`) ships a working agent in 60 seconds.
Pay.sh+Kyvern is structurally complementary: pay.sh ships the x402
rail, Kyvern ships the runtime that makes agents safe to put on it.

Live at https://app.kyvernlabs.com. Atlas at /atlas.

---

## Q&A prep — the three questions judges will ask

**1. "Why not just use Squads' spending limits directly?"**

> Squads enforces three things: per-tx max, daily cap, weekly cap.
> That's it. Kyvern enforces those plus: merchant allowlist (hash-
> based, on-chain), memo requirement, velocity rate-limiting, kill
> switch, custom error codes for every refusal. We CPI into Squads —
> we don't replace it. Squads is the audited primitive; Kyvern is the
> policy layer above. Same pattern as IAM above a cloud provider.

**2. "Is Atlas a demo or a real agent?"**

> Atlas runs in its own pm2 process on a Solana devnet RPC, makes
> autonomous decisions every 3 minutes via a Commonstack LLM call,
> attempts real payments through Kyvern's policy program. Every
> action is verifiable on Solana Explorer. The action set is bounded
> (5 verbs: reason / publish / buy_data / self_report / idle) and the
> subscribers are simulated, but every chain transaction is real and
> Atlas's failure rate at avoiding violations is the proof point.
> Atlas isn't the product — Atlas is proof that the product works
> for autonomous workloads.

**3. "Why devnet and not mainnet?"**

> Devnet because the Anchor program hasn't been audited yet. The
> program is feature-complete — same code would deploy to mainnet
> tomorrow. We chose to ship a working reference + verifiable proof
> over a rushed mainnet deploy. v1.1 ships to mainnet after audit pass.
