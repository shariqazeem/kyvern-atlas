# Workers — Live Diagnostic

**Generated:** 2026-04-29 (post-`d4493c6` deploy)
**Scope:** Cane's two questions. Answered from production data, not from memory.

I exercised the system on prod (`kyvernlabs.com` + `app.kyvernlabs.com`), pulled real `agent_thoughts`, real `signals`, and real `live-status` payloads from the last 24 hours. What follows is what I actually saw, not what I expected to see.

---

## What I pulled

### Signals per worker, last 24h (production):
```
  Verify9     | token_pulse        | 108 signals · 66 unique
  Verify8     | token_pulse        |  72 signals · 17 unique   ← 55 duplicates
  TestScout   | scout              |  69 signals · 67 unique
  Verify7     | token_pulse        |  59 signals · 40 unique
  Verify6     | whale_tracker      |  36 signals · 23 unique
  Verify4     | ecosystem_watcher  |   3 signals ·  2 unique
  Verify0     | bounty_hunter      |   2 signals ·  2 unique
```

### Inbox preview for the Atlas vault (what `/app` shows):
- **Unread count: 235**
- Three top signals, all from TestScout, all `kind=wallet_move`:
  - `"Jupiter swaps detected for wallet 5Q544f…"` — $1.27 + $2.46 swaps
  - `"Jupiter swap $0.00 (≈$0.00) SOL → PUMP"` — actual amount: **$0.0008**
  - `"Wallet swapped $156.05 SOL → 7YAs token"`

### Sample of recent LLM reasoning (post-`cleanReasoning` deploy):
```
[Verify8 | read_dex | llm]
  We need to act per rules. Recent thoughts show we previously already
  sent a price_trigger finding? The last thought: "- 4m ago [used: you]:
  We got BON... need to surface". It seems we already sent a finding…

[Verify8 | message_user | llm]
  We need to decide: we have prior attempts failing, but we have a price
  from CoinGecko manually? The recent thoughts indicate we have the price
  from CoinGecko: $0.00000627, which is below lower band of $0.0000180.
  So we must surface a price_trigger finding…

[Verify6 | watch_wallet | llm]
  We need to interpret recent thoughts. The user provided a summary of
  recent thoughts: they indicate that previously we (the assistant)
  already called the wallet, got entries, and need to surface the most
  recent as a wallet_move finding. We…

[TestScout | watch_wallet_swaps | llm]
  We need to continue watching the wallet 5Q544f… We must call the
  wallet's swaps with possibly minUsdThreshold? The job says message
  the owner with signature, dollar amount, and token pair…
```

---

## What this tells me

Three things, in order of severity:

### 1. The duplicate-emission problem is real and big

Verify8 emitted **72 token_pulse signals over 17 unique subjects** in 24 hours — meaning **~55 of those 72 messages were restatements of the same 17 findings.** The system prompt explicitly tells the worker not to re-surface findings the owner hasn't acted on. The LLM *knows* it already surfaced the BONK price-trigger ("we already sent a finding") and surfaces it again anyway. This is the loop-breaking rule failing at the model layer. It's the single biggest reason the inbox feels noisy.

**Root cause:** the rule lives in the system prompt and depends on the LLM correctly interpreting its own "recent thoughts" log. The LLM sometimes does, often doesn't. There's no server-side gate between the worker emitting a finding and the signal being persisted.

### 2. The findings include sub-dollar dust

A signal titled *"Jupiter swap $0.00 (≈$0.00) SOL → PUMP"* sat in the inbox with the actual amount being **$0.0008**. The TestScout job *intends* to filter by `minUsdThreshold` but the threshold is enforced (when at all) at the LLM layer, not the tool layer. The whale-tracker template's chip job also doesn't pass a numeric threshold cleanly — it relies on prose ("flag a sizeable transfer") which the model interprets inconsistently.

**Root cause:** filtering responsibilities are split between the LLM (which is fuzzy) and the tool (which is deterministic). The fuzzy half wins by default — the tool returns everything, the LLM is supposed to drop noise, the LLM doesn't.

### 3. The reasoning still leaks meta-prompt language post-cleanup

`cleanReasoning` strips obvious preambles ("Let me think", "I need to") and tool IDs. It does **not** catch:

- *"We need to decide"* / *"We must surface"* (third-person plural)
- *"The user gave us a summary"* (talking about the prompt)
- *"The recent thoughts indicate"* (talking about its own context window)
- *"Per rules"* / *"per the instruction"* (referencing the system prompt)

The cleanup helped, but the model is still narrating itself rather than narrating the world. The thought feed reads like a chess engine's commentary, not a worker's notes.

**Root cause:** the system prompt sets up the LLM as "you are a worker, here is your job" but the structural framing of "Recent thoughts: ... Make your next decision" pushes the model into puzzle-solving mode. It writes its solution out loud.

### 4. (Aside) Bounty Hunter and Ecosystem Watcher are barely producing

Verify0 (bounty_hunter): **2 signals in 24h.** Verify4 (ecosystem_watcher): **3 in 24h.** Compare to Verify9's 108. The asymmetry isn't because Token Pulse is "better" — it's because Token Pulse re-emits the same finding many times, while Bounty Hunter only fires when a bounty actually qualifies. The "good" workers (low duplicate rate) look like they're doing nothing.

This is the inverse of how the inbox should feel. The workers that produce **rare, high-value findings** look idle next to the workers that **flood with noise**.

---

## Cane's two questions, answered in one sentence each

> **Q1.** *"When you open /app after unboxing on a fresh device with the pre-spawn trio now running, what specifically feels off?"*

**The thing that feels off is that the inbox fills with technically-valid findings the owner can't act on — sub-dollar swaps, repeated price-band breaks, "still below threshold" restatements — so the unread count climbs while the value-per-signal collapses.**

> **Q2.** *"What's unsatisfying about the workers?"*

**The workers are stateless poll-loops with re-emission problems, not entities that "know" their domain — they don't dedupe their own findings, don't enforce numerical thresholds at the tool layer, and don't accumulate intelligence so Verify8's hundredth BONK price check is identical in confidence to its first.**

---

## What I'd consider doing about it (NOT a list of features to add)

These are not "nice to have" gaps. They are the architectural fixes that would make the workers feel like the entities the device-owner framing implies. None of these add new templates or tools — they tighten what's already there.

### Fix A — Server-side dedup at signal write time (~2 hr)

Before `INSERT INTO signals`, check `(agent_id, kind, subject_hash)` against the last 60 minutes. If a near-duplicate exists, drop. This kills 55-of-72 duplicate spam at the storage layer without touching the LLM. Single biggest leverage move on signal quality.

### Fix B — Tool-layer threshold enforcement (~1.5 hr)

`watch_wallet_swaps` and `read_dex` should accept the same threshold/band parameters the chip jobs already mention in prose, and **filter at the tool boundary** before returning. The LLM gets pre-filtered input; "noise" never reaches the model. Kills the $0.0008 swap problem entirely.

### Fix C — Reasoning-prompt restructure (~1 hr)

Change the system prompt's framing from *"Make your next decision"* to *"Write a one-line worker note about what you observed this cycle"*. Same tool calls, same outputs, but the model writes "Found 2 new swaps on Kraken; both under $1k, idle this cycle" instead of "We need to decide based on recent thoughts…". Combined with `cleanReasoning`, the thought feed reads as field notes, not chess analysis.

### Fix D — Worker-knows-its-baseline (~3 hr, biggest payoff)

Persist a tiny `worker_baseline` row per agent: `last_finding_id`, `last_finding_at`, `cumulative_findings`, `template_specific_state` (e.g. last_dex_price for token_pulse). On every tick, the system prompt gets the *baseline*, not the recent-thought log. The model surfaces a finding only when the **delta from baseline** is meaningful. Verify8's hundredth check stops feeling like its first because it has its 99 prior baseline values to compare against.

This is the closest thing to "workers that accumulate intelligence" without rebuilding the runner.

---

## My honest answer

The post-unboxing screen, the cinematic, the chassis, the orbital ring, the auto-vault, the trio seeding — those are all working. The shell is premium.

**What's missing isn't UI polish. It's that the workers don't yet behave like workers.** They behave like cron jobs that talk to themselves. The owner opens `/app`, sees three orbital satellites with their LEDs pulsing, taps the inbox, and reads sub-dollar swaps narrated as findings. The inbox count goes up; the *value* of each entry goes down.

The fix is in fixes A–D, in that order. They're 7-8 hours of focused work, all post-Frontier candidates *technically*, but **fix A alone (server-side dedup) is a single afternoon and would noticeably change how the demo video feels** when a judge clicks through the inbox.

I'm not proposing we add anything. I'm saying the existing system has a quality leak in a specific place — between the worker thinking and the signal being persisted — and closing that leak makes everything we've already built stronger. Decide what you want to do about it. I'm not starting any of these without an explicit "go".
