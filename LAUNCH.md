# Launch playbook — Kyvern Vault (Solana Frontier)

Everything you need the moment the submission is live. Each item is pre-drafted; copy-paste + go.

---

## 1. Submission tweet (lead thread)

Drop 30-60 minutes after the submission is live so the Explorer links are warm in the cache. Tag @SquadsProtocol + @solana + @helius_labs.

```
Agents shouldn't have keys.
They should have budgets.

I built a Solana program that gives your AI agent a Visa with a daily cap — enforced on-chain by @SquadsProtocol v4 + my own Anchor program composing atomically via CPI.

One import. Zero infra to host.

1/7
```

```
The problem: every "AI agent that spends money" demo today either

 (a) hands the agent a hot wallet (drained in 24h)
 (b) routes through a custodial credit primitive (slow, KYC-heavy)
 (c) builds a bespoke off-chain policy engine (you become the weak link)

All three fail the same audit question: "what if your server lies?"

2/7
```

```
Kyvern's answer: two Solana programs, one atomic transaction.

My Anchor program enforces merchant allowlist, velocity cap, memo policy, pause, per-tx cap.

It then CPIs into @SquadsProtocol spending_limit_use for the daily cap + settlement.

If ANY rule fails, the whole tx reverts. On-chain.

3/7
```

```
The moat:

Every blocked payment is a real FAILED Solana transaction. Click the link. Read the program logs.

    Error Code: MerchantNotAllowlisted. Error Number: 12003.

That's Solana consensus saying no. Not my server. Not my API. Not my promise.

→ explorer.solana.com/tx/5Vm9ft6AMMXyRjdZoQEhM9Mrvrhq3PCikQTAjgDhMUK6HPRk1xL1xLrAzBUyzsg6s3B3SXoohb6vw8RyKrGLDE7o?cluster=devnet

4/7
```

```
The SDK:

  npm i @kyvernlabs/sdk

  const vault = new OnChainVault({ cluster, connection, multisig, spendingLimit })
  const res = await vault.pay({ agent, recipient, amount, merchant, memo })

  if (res.decision === "allowed") console.log(res.explorerUrl)
  else console.log(res.code, "→", res.explorerUrl)

One import. No infra.

5/7
```

```
The scaffold:

  npx create-kyvern-agent my-agent

Writes a working TypeScript agent wired to the deployed devnet program. Three payments demonstrated — allowed, blocked-by-policy, blocked-by-cap. Every outcome a real Solana tx.

6/7
```

```
Solana Frontier Hackathon submission. Pre-alpha, devnet-only. Kyvern program unaudited; Squads v4 (which it composes with) is audited 3x.

Repo: github.com/shariqazeem/kyvernlabs
Submission: (paste hackathon URL here)
Video: (paste video URL here)

Thanks to @SquadsProtocol for the primitive worth building on top of.

7/7
```

---

## 2. Reply-guy bait (single-tweet variations)

If you want a shorter hook instead of the thread, use one of these as the top post and drop the thread in a quote-tweet-reply:

**Variant A — the failed-tx shot:**
```
This is what "on-chain spending enforcement" looks like:

     Error Code: MerchantNotAllowlisted
     Error Number: 12003

Not an HTTP 402. Not a middleware rejection. A real failed Solana transaction.

Kyvern Vault — my Solana Frontier submission.
[Explorer link as preview card]
```

**Variant B — the architecture shot:**
```
Two Solana programs. One atomic transaction.

  [Your Kyvern program]
     enforces: allowlist, velocity, memo, pause, per-tx cap
     ↓ CPI ↓
  @SquadsProtocol v4
     enforces: daily cap, settlement

Either rejects → whole tx reverts. Agents get a Visa with a cap.

npm i @kyvernlabs/sdk
```

**Variant C — the wedge:**
```
Every agent-wallet demo at the Solana Frontier Hackathon is one of:

  - Hot wallet (drains in 24h)
  - Custodial credit (KYC-heavy)
  - Off-chain policy engine (your server becomes the weak link)

I built option 4: a deployed Anchor program. Real failed-tx Explorer links when rules fire.
```

---

## 3. Submission form answers (paste-ready)

**Title:** Kyvern Vault

**One-line:** Give your AI agent a Visa with a daily cap. Enforced on-chain by our Anchor program composing atomically with Squads v4 via CPI.

**Track:** AI × Consumer / Agent commerce / Squads Protocol composability

**What it does:** A Solana Anchor program (`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`, devnet) that extends Squads v4's native spending-limit primitive with on-chain merchant allowlist, velocity cap, memo enforcement, and pause. Every `execute_payment` call composes atomically with `spending_limit_use`. Blocked calls fail as real on-chain transactions with program error codes in the logs — not HTTP 402s. Ships with `@kyvernlabs/sdk` (npm) and `npx create-kyvern-agent` for 60-second onboarding.

**How it uses Solana:** Two Solana programs composing via CPI in a single atomic transaction. PDA-based policy state (`seeds = ["kyvern-policy-v1", multisig]`). Deterministic error codes surfaced via Anchor's `#[error_code]` enum. Account-order-checked CPI into Squads v4 `spending_limit_use`. Uses Solana's signing model in a novel way — the agent's Squads-delegated keypair is the signer, but our program's `execute_payment` runs first, so the agent's signature authority is gated by our on-chain rules *before* it ever reaches Squads.

**Demo URLs:**
- Live kyvernlabs.com/vault (TODO once deployed)
- Live demo video: (TODO paste MP4 URL)
- Repo: github.com/shariqazeem/kyvernlabs

**On-chain proof:** See the "On-chain proof" section of SUBMISSION.md — a live allowed tx + 3 blocked txs on devnet with Explorer links.

---

## 4. Squads Protocol DM (after the submission tweet lands)

Send to @SquadsProtocol official within 2 hours of posting. Keep it short — they're swamped during hackathon windows.

```
Hey — shipped Kyvern Vault for the Solana Frontier hackathon.

It's an Anchor program that extends your native spending-limit primitive with on-chain merchant allowlist, velocity cap, memo, and pause — then CPIs into spending_limit_use atomically. Every blocked agent payment is a real failed Solana tx with a program error code. No off-chain policy middleware pretending to be enforcement.

Think of it as the developer surface for v4 spending limits for AI agents.

Repo: github.com/shariqazeem/kyvernlabs
Kyvern program: PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc (devnet)

Would love a retweet of the thread if it resonates. Happy to chat about mainnet deploy + audit path.
```

---

## 5. Helius DM

Same timing, same brevity:

```
Solana Frontier submission — Kyvern Vault, an Anchor program for AI-agent payments that CPIs into Squads v4. Ships with @kyvernlabs/sdk + npx create-kyvern-agent.

Used your RPC throughout development. The dashboard's live-activity feed is architected around your webhook API for real-time payment notifications (wiring that up post-submission).

Repo: github.com/shariqazeem/kyvernlabs

Would love a retweet if it lands.
```

---

## 6. Hacker News (self-post, tactical — only if traction stalls)

Title: `Show HN: Kyvern Vault — give your AI agent a Visa with a daily cap (Solana Anchor program)`

Body: paste the hero paragraph + 2-tweet thread content as flat prose. End with the Explorer link to a live failed tx and the `npx create-kyvern-agent` one-liner.

Post at 6:30am PT on a weekday for best HN visibility.

---

## 7. What NOT to do

- Don't send this to Squads' private Telegram or Discord — their public @ is already how they get tagged in submissions
- Don't promise mainnet by a specific date; say "pending audit" and leave it
- Don't answer "how does this make money?" with a business plan. Answer with "right now: zero. Infrastructure. Go read the program source."
- Don't overclaim audits. Squads is audited 3×. Kyvern is not. Say so.
