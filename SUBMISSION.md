# Kyvern Vault — Solana Frontier Hackathon Submission

> **Agents shouldn't have keys. They should have budgets.**
>
> A Solana **Anchor program** that extends Squads v4's native spending-limit primitive with on-chain merchant allowlists, velocity caps, memo enforcement, and pause — then CPIs into Squads to settle USDC atomically. If any rule fails, the whole transaction reverts. **The chain is the policy engine.**

- **Track:** AI × Consumer — production infrastructure for agent commerce
- **Chain:** Solana (devnet verified, mainnet-ready)
- **Primitive:** A new Anchor program composing with Squads v4 via CPI
- **SDK:** `npm i @kyvernlabs/sdk`
- **Repo:** [github.com/shariqazeem/kyvernlabs](https://github.com/shariqazeem/kyvernlabs)
- **Built by:** [@shariqshkt](https://x.com/shariqshkt) — 5 prior hackathon wins, 3 prior x402 projects shipped

---

## 🔗 On-chain proof — click these first

These are **real, live devnet transactions** produced end-to-end by the full stack: Kyvern policy program → CPI → Squads v4 `spending_limit_use`. One pair click gives you the moat — an allowed payment that moves USDC, and a blocked payment that fails on-chain with a specific program-error code.

### The two programs

| Program | Program ID | Role |
|---|---|---|
| **Kyvern Policy** (ours) | [`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc`](https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet) | Enforces merchant allowlist, velocity cap, memo, pause, per-tx cap |
| **Squads v4** (theirs) | [`SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`](https://explorer.solana.com/address/SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf?cluster=devnet) | Enforces daily/weekly USDC cap, holds the vault, settles the transfer |

### The live demo run

A fresh Squads multisig + spending limit + Kyvern policy, then four `execute_payment` calls — one allowed, three blocked. Reproducible with `cd anchor && npm run demo:e2e`.

| Artifact | Explorer | Role |
|---|---|---|
| Squads multisig PDA | [`G9KPUawc…EGMu`](https://explorer.solana.com/address/G9KPUawcULia62Jd7tgS9qdqpx6Hw3y5bmY7chXTEGMu?cluster=devnet) | owned by Squads v4 program |
| Squads vault PDA | [`CyHRAQV1…CBQ7`](https://explorer.solana.com/address/CyHRAQV1mmWHMRSDST47xrTs3PyCPW6BrxCt38fZCBQ7?cluster=devnet) | the treasury that holds USDC |
| Squads spending limit PDA | [`E9jvcmdF…W1V9`](https://explorer.solana.com/address/E9jvcmdFQH8p62DErNK7oLaNMRf4szsFm324GmG9W1V9?cluster=devnet) | daily cap, period, member list |
| Kyvern policy PDA | [`9rM3cv62…R8df`](https://explorer.solana.com/address/9rM3cv62v2yz8HyE7XvtpkgjUj4HmHJ3qFpwrzayR8df?cluster=devnet) | our policy state, owned by our program |

**The four payment attempts:**

| # | Outcome | Explorer tx | Program log (verbatim from Explorer) |
|---|---|---|---|
| **6a** | ✅ **ALLOWED** — 0.5 USDC moved | [`3uQqZmH5…kkS1`](https://explorer.solana.com/tx/3uQqZmH5xdEdNcBWhsJzMsL1N97d7W2QwENDPXtvbQuRgbrnEi2CVGZypK1T4sDCrvfwM856PBjmueEePjhbkkS1?cluster=devnet) | Program execute_payment success · CPI spending_limit_use success · token transfer settled |
| **6b** | ❌ **BLOCKED** | [`5Vm9ft6A…DE7o`](https://explorer.solana.com/tx/5Vm9ft6AMMXyRjdZoQEhM9Mrvrhq3PCikQTAjgDhMUK6HPRk1xL1xLrAzBUyzsg6s3B3SXoohb6vw8RyKrGLDE7o?cluster=devnet) | `Error Code: MerchantNotAllowlisted. Error Number: 12003.` |
| **6c** | ❌ **BLOCKED** | [`5wUPXoVv…9wr44`](https://explorer.solana.com/tx/5wUPXoVvSYkW2UaUC58iqJc4MeD4UBmXDkyYj1D7j9xyG8ee1b3rfhsFg5ayKpQq4VLgrvRSH3ZeMevLPxw9wr44?cluster=devnet) | `Error Code: AmountExceedsPerTxMax. Error Number: 12002.` |
| **6d** | ❌ **BLOCKED** | [`5CZ6DwUr…1ZfV`](https://explorer.solana.com/tx/5CZ6DwUrhQpXawZYxZmCH6BXjFX73eXHth4A2r17815XA5KJqpN3C3RMTzfdJcqDP4d1Gt8Dc7pbzAvEizag1ZfV?cluster=devnet) | `Error Code: MissingMemo. Error Number: 12004.` |

Each blocked tx is a real failed Solana transaction, 10-13K compute units consumed, with our program's `#[error_code]` enum surfaced as on-chain logs. Every claim in this submission is backed by one of these Explorer links — no mocks, no simulations, no `skipPreflight: true` tricks hiding unhandled errors.

### Reproduce it yourself — two paths

**Path A — the scaffolder (60 seconds):**

```bash
npx create-kyvern-agent my-agent
cd my-agent
npm install
cp .env.example .env        # paste a vault's multisig + spending-limit + agent key
npm run agent               # prints allowed + blocked Explorer links
```

The scaffolder ships a working TypeScript agent pre-wired to `@kyvernlabs/sdk`'s `OnChainVault` and the deployed devnet program. Zero Solana boilerplate.

**Path B — the full stack (~5 minutes):**

```bash
git clone https://github.com/shariqazeem/kyvernlabs.git && cd kyvernlabs
npm install --legacy-peer-deps
cd anchor && npm install && anchor build

# (one-time) fund a devnet signer — needs ~0.5 SOL
solana-keygen new --outfile ./keypair.json
solana config set --keypair ./keypair.json --url https://api.devnet.solana.com
# fund at https://faucet.solana.com using the printed pubkey

export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=./keypair.json
npx tsx scripts/demo-e2e.ts   # prints a fresh proof table like the one above
npx tsx scripts/sdk-smoke.ts …   # verifies the shipped @kyvernlabs/sdk OnChainVault class
```

Our deployed program is open for anyone to initialize a policy against — you don't need to redeploy. Skip `anchor build` if you just want to hit it.

---

## Why this matters

Every AI agent today runs on the same bad pattern: a human hands the agent a private key, prays the agent doesn't do something dumb, and watches the wallet balance. One prompt injection, one misconfigured tool call, one bad loop — and the whole wallet is gone.

We've had programmable money for a decade. Agents deserve programmable *budgets*.

## The wedge — why Kyvern over everything else in the agent-wallet category

Every agent-wallet demo at this hackathon falls into one of three buckets:

1. **Hot wallet:** give the agent a fresh Solana keypair and fund it. Drains in 24h.
2. **Off-chain policy engine + custodial signing:** build a Next.js middleware that inspects calls before signing. Our v0.2 was this. Works until the API lies — no on-chain enforcement, so "over-budget was blocked" really just means "our server returned HTTP 402."
3. **Custom Anchor program:** deploy real on-chain enforcement. Technically defensible, composable with the rest of the agent stack. **This is what we built.**

Kyvern's on-chain program is the **developer surface for Squads v4 spending limits** — one npm install, one `vault.pay(...)`, zero infra to host. When a Squads judge clicks our Explorer link, they see *their own program* as the CPI target and a real failed transaction showing our program's error code. That's the moat.

---

## Architecture

```
                ┌────────────────────────────────┐
                │  kyvern_policy program (ours)  │
                │  PpmZErWf…MSqc                 │
                │                                │
                │  PDA: PolicyAccount            │
                │    authority (owner)           │
                │    multisig (Squads PDA)       │
                │    per_tx_max_base_units       │
                │    paused, require_memo        │
                │    velocity_window_seconds     │
                │    velocity_max_calls          │
                │    velocity_window_start       │
                │    velocity_calls_in_window    │
                │    merchant_allowlist:         │
                │      Vec<[u8; 32]> (SHA256)    │
                │                                │
                │  ix:                           │
                │    initialize_policy           │
                │    update_allowlist            │
                │    pause / resume              │
                │    execute_payment ──┐         │
                └──────────────────────┼─────────┘
                                       │ CPI (atomic)
                                       ▼
                ┌──────────────────────────────────────┐
                │  Squads v4 program (theirs)          │
                │  SQDS4ep…52pCf                       │
                │                                      │
                │  ix: spending_limit_use              │
                │    enforces daily USDC cap           │
                │    debits vault_token_account,       │
                │    credits destination_token_account │
                └──────────────────────────────────────┘
```

Two programs, **one atomic Solana transaction**. If `execute_payment` rejects (paused, invalid amount, per-tx exceeded, merchant, memo, velocity), we never reach the CPI. If the CPI rejects (Squads daily cap exceeded, member mismatch, insufficient vault USDC), `execute_payment`'s rule-state mutations roll back. There is no middle state. There is no off-chain trust.

---

## What's in the program (`programs/kyvern-policy/src/lib.rs`)

**4 instructions:**

- `initialize_policy(args)` — creates a `PolicyAccount` PDA keyed on the Squads multisig, stores the ruleset + ownership
- `update_allowlist(new_allowlist)` — replaces the merchant allowlist (authority only; reallocs account if the list grows)
- `pause()` / `resume()` — flips the kill switch (authority only)
- `execute_payment(args)` — the main event. Runs all off-chain rules against state, then CPIs to Squads `spending_limit_use`

**12 on-chain error codes**, each mapping 1:1 to the SDK's `PolicyBlockCode` enum:

```rust
VaultPaused = 12000           AmountExceedsPerTxMax = 12002
MerchantNotAllowlisted = 12003  MissingMemo = 12004
VelocityCapExceeded = 12005     MemoTooLong = 12006
AllowlistTooLarge = 12007       Unauthorized = 12008
InvalidPolicy = 12009           NotASquadsMultisig = 12010
SquadsCpiRejected = 12011       InvalidAmount = 12001
```

**State layout (`PolicyAccount`):**

- Authority + Squads multisig pubkey
- `per_tx_max_base_units` (u64, USDC with 6 decimals)
- `paused`, `require_memo` (bools)
- Sliding-window velocity counter: `velocity_window_seconds`, `velocity_max_calls`, `velocity_window_start`, `velocity_calls_in_window`
- `merchant_allowlist: Vec<[u8; 32]>` — SHA-256 hashes, max 32 entries, account grows via Anchor realloc

**The CPI (hand-built for audit clarity):**

We don't depend on a Squads Rust crate. The instruction is built manually via `Instruction { program_id, accounts: Vec<AccountMeta>, data }` — the discriminator is computed at runtime as `sha256("global:spending_limit_use")[..8]`, the args are borsh-serialized inline, account metas mirror `@sqds/multisig` `createSpendingLimitUseInstruction`. That keeps the program self-contained and the audit surface tiny.

---

## Test coverage

### Live-devnet admin tests — **6/6 passing**

```bash
cd anchor && npx ts-mocha -p ./tsconfig.json -t 1000000 tests/kyvern-policy.ts
```

- ✅ initialize_policy — creates PDA with correct defaults
- ✅ initialize_policy — rejects oversize allowlist
- ✅ initialize_policy — rejects sub-5s velocity window
- ✅ pause/resume round-trip
- ✅ pause — rejects non-authority wallet
- ✅ update_allowlist — reallocates account

### Live-devnet E2E demo — **1 allowed + 3 blocked on-chain**

See proof table above. `scripts/demo-e2e.ts`.

### Off-chain parity tests (from prior build, still green)

```bash
npm run test   # 41 tests, vitest
```

41 tests covering the SDK-side policy-engine parity, merchant-hostname normalization, SDK adapter contracts (LangChain, Eliza).

---

## The 60-second developer experience

```bash
npm i @kyvernlabs/sdk
```

```ts
import { Vault } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: process.env.KYVERN_AGENT_KEY });

const res = await vault.pay({
  merchant: "api.openai.com",
  recipientPubkey: "…",
  amount: 0.05,
  memo: "chat completion",
});

if (res.decision === "allowed") {
  console.log("paid:", res.tx.signature);      // → Solana Explorer link, on-chain
} else {
  console.log("blocked:", res.code, res.reason); // → matches program error codes
}
```

The SDK wraps tx construction + submission to `execute_payment`. No `/api/pay` middle-layer; the agent signs and submits directly.

---

## Video script (90 seconds)

> **0:00–0:05** — *Open on a **failed** Solana Explorer transaction.* Program logs zoomed in: `AnchorError thrown in programs/kyvern-policy/src/lib.rs:180. Error Code: MerchantNotAllowlisted.` Caption: *"This is a real on-chain block."*
>
> **0:05–0:18** — Cut to landing. *"Agents shouldn't have keys. They should have budgets. And everything else."* Code snippet: one import, one `vault.pay(...)`.
>
> **0:18–0:40** — Live vault creation. `/vault/new` → 5-step wizard → success page with three Explorer chips (multisig, vault PDA, spending limit). *"60 seconds to deploy a Squads-backed vault with an on-chain policy program protecting it."*
>
> **0:40–1:05** — Terminal split. SDK call 1: `merchant: "api.openai.com"` → green `tx: …` → Explorer shows allowed tx, 0.05 USDC moved. SDK call 2: `merchant: "evil.example.com"` → HTTP 402, `code: MerchantNotAllowlisted` → Explorer shows *failed* tx with program log. SDK call 3: overbudget → *failed* tx, `AmountExceedsPerTxMax`.
>
> **1:05–1:20** — Kill switch. Click → Squads and Kyvern state both flip → every subsequent `pay()` fails with `VaultPaused` at the program layer. *"Our API doesn't decide. Solana consensus decides. Even if our server was compromised, the chain still refuses."*
>
> **1:20–1:30** — *"`npm install @kyvernlabs/sdk`. Try it tonight on devnet."* Logo + repo URL.

---

## Where it goes next

- **Multi-member spending limits** — one vault, N agents, each with its own sub-policy and kill switch
- **Token-2022 transfer hooks** — enforce policy at the token-mint layer for vaults already managed elsewhere
- **Anomaly detection** — "agent spending 3× its usual rate" alerts before budget cap hits
- **Mainnet deploy + Squads audit partnership** — pre-alpha right now, devnet-only; mainnet gated on external audit

---

## Founder

**Shariq Azeem** ([@shariqshkt](https://x.com/shariqshkt)) — 5 prior hackathon wins ($4,250 total), 3 prior agent-payment projects shipped (ParallaxPay won $1,500), deep Squads / Solana / x402 background.

---

## License

MIT — see [LICENSE](LICENSE).
