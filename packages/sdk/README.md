# @kyvernlabs/sdk

> **Give your AI agent a Visa with a daily cap.** One import. Enforced on-chain by two Solana programs — **Kyvern policy** (ours) + **Squads v4** (theirs) — composing atomically via CPI.

```bash
npm install @kyvernlabs/sdk
```

## The 30-second version

```ts
import { OnChainVault } from "@kyvernlabs/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

const vault = new OnChainVault({
  cluster: "devnet",
  connection: new Connection("https://api.devnet.solana.com"),
  multisig: new PublicKey("…"),           // from /vault/new success page
  spendingLimit: new PublicKey("…"),
});

const res = await vault.pay({
  agent: Keypair.fromSecretKey(bs58.decode(process.env.KYVERN_AGENT_KEY!)),
  recipient: new PublicKey("…"),
  amount: 0.1,
  merchant: "api.openai.com",
  memo: "chat completion",
});

if (res.decision === "allowed") {
  console.log("paid:", res.explorerUrl);      // real Solana tx
} else {
  console.log("blocked:", res.code);           // "MerchantNotAllowlisted", etc.
  console.log("on-chain:", res.explorerUrl);  // *failed* Solana tx with logs
}
```

## What `pay()` actually does

It submits a single `execute_payment` Solana transaction to the [deployed Kyvern policy program](https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet). That program:

1. Runs **off-chain policy rules** in on-chain code: merchant allowlist, velocity cap, memo requirement, pause, per-tx cap
2. If any fail → the ix returns an `AnchorError` with a specific code (`MerchantNotAllowlisted`, `VelocityCapExceeded`, etc.) and the transaction fails on-chain
3. If all pass → CPIs into [Squads v4's `spending_limit_use`](https://explorer.solana.com/address/SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf?cluster=devnet), which enforces the daily USDC cap and settles the transfer

Both layers are atomic. Either rejects → the whole tx reverts. No middle state, no off-chain trust. Every `decision: "blocked"` result carries a real Solana signature you can click on Explorer.

## Two classes

- **`OnChainVault`** (recommended) — submits txs directly to the Solana program. Requires peer deps `@solana/web3.js`, `@coral-xyz/anchor`, `@solana/spl-token`, `@sqds/multisig`.
- **`Vault`** (legacy HTTP) — talks to `kyvernlabs.com/api/vault/pay`. Useful for environments that can't bundle Solana libs. Enforcement is weaker (server-side), kept for backward compatibility.

Most users want `OnChainVault`.

## Error codes

| Code | Meaning |
|---|---|
| `VaultPaused` | Owner hit the kill switch |
| `InvalidAmount` | Amount is zero/negative/NaN |
| `AmountExceedsPerTxMax` | Exceeds the per-tx cap |
| `MerchantNotAllowlisted` | Merchant hash not on the allowlist |
| `MissingMemo` | Memo required but empty |
| `VelocityCapExceeded` | Too many calls in the window |
| `MemoTooLong` | Memo exceeds 200 bytes |
| `AllowlistTooLarge` | Allowlist exceeds 32 entries |
| `Unauthorized` | Caller isn't the policy authority |
| `InvalidPolicy` | Bad init params (window/cap bounds) |
| `SquadsCpiRejected` | Squads' inner validation failed (daily cap, member, etc.) |

## LangChain / Claude Agent SDK

`OnChainVault.pay()` is a plain async function. Drop it in a tool:

```ts
import { DynamicTool } from "@langchain/core/tools";

const payTool = new DynamicTool({
  name: "pay_merchant",
  description:
    "Pay a merchant via the Kyvern vault. Returns tx signature if allowed, " +
    "or blocked-reason + failed-tx link if refused by policy.",
  func: async (input) => {
    const { merchant, amount, memo } = JSON.parse(input);
    const res = await vault.pay({ agent, recipient, merchant, amount, memo });
    return JSON.stringify(res);
  },
});
```

Same shape works with Claude Agent SDK, Eliza, CrewAI, etc.

## Scaffolder

```bash
npx create-kyvern-agent my-agent
```

Ships a working TypeScript agent wired to the deployed devnet program. Zero boilerplate.

## License

MIT
