# my-kyvern-agent

A working Solana AI-agent wired to a [Kyvern vault](https://kyvernlabs.com), created by `npx create-kyvern-agent`.

## What this is

A minimal TypeScript agent that demonstrates the three behaviors every agent developer needs to see:

1. **Allowed** — pays an allowlisted merchant; USDC moves on-chain; Explorer link printed
2. **Blocked by policy** — tries an off-allowlist merchant; Kyvern program rejects; *failed* Explorer tx link printed
3. **Blocked by cap** — tries to overspend; per-tx cap rejects; *failed* Explorer tx link printed

Every "blocked" outcome is a real failed Solana transaction with the program's error code in the logs. Click the link. Read the logs. That's the guarantee — not our server, not our API, **Solana consensus**.

## Run it

```bash
npm install
cp .env.example .env
# paste your vault's multisig, spending-limit, and agent key
npm run agent
```

## Wire it up

You need a Kyvern vault before running. Two ways to get one:

- **UI (60 seconds):** visit [kyvernlabs.com/vault/new](https://kyvernlabs.com/vault/new), fill in daily cap + merchant allowlist, copy the agent key from the success page
- **CLI (for the impatient):** clone the [kyvernlabs monorepo](https://github.com/shariqazeem/kyvernlabs) and run `cd anchor && npx tsx scripts/demo-e2e.ts` — it prints a paste-ready `.env` block

Paste the values into `.env`:

```bash
KYVERN_MULTISIG=...
KYVERN_SPENDING_LIMIT=...
KYVERN_AGENT_KEY=...
RECIPIENT_WALLET=...
ALLOWED_MERCHANT=merchant.example.com
```

Run `npm run agent`.

## How it works

The agent is a plain Node script that uses `@kyvernlabs/sdk`'s `OnChainVault`:

```ts
import { OnChainVault } from "@kyvernlabs/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const vault = new OnChainVault({
  cluster: "devnet",
  connection: new Connection(process.env.SOLANA_RPC_URL),
  multisig: new PublicKey(process.env.KYVERN_MULTISIG),
  spendingLimit: new PublicKey(process.env.KYVERN_SPENDING_LIMIT),
});

const res = await vault.pay({
  agent: Keypair.fromSecretKey(bs58.decode(process.env.KYVERN_AGENT_KEY)),
  recipient: new PublicKey(process.env.RECIPIENT_WALLET),
  amount: 0.1,
  merchant: "api.openai.com",
  memo: "chat completion",
});

if (res.decision === "allowed") console.log("paid:", res.explorerUrl);
else console.log("blocked:", res.code, "→", res.explorerUrl);
```

The SDK submits a single `execute_payment` Solana transaction that:

1. Hits the **Kyvern policy program** (`PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc` on devnet) — enforces merchant allowlist, velocity cap, memo, pause, per-tx cap
2. CPIs into the **Squads v4 program** — enforces daily USDC cap and settles the transfer
3. Returns a signed signature — whether it succeeded or failed, you get a real tx sig to inspect

## LangChain / Claude Agent SDK integration

`OnChainVault.pay()` is a plain async function. Wrap it in a LangChain tool:

```ts
import { DynamicTool } from "@langchain/core/tools";

const payTool = new DynamicTool({
  name: "pay_merchant",
  description:
    "Pay a merchant via the Kyvern vault. Returns tx signature if allowed, " +
    "or a blocked-reason + failed-tx link if refused by policy.",
  func: async (input) => {
    const parsed = JSON.parse(input);
    const res = await vault.pay({ agent, ...parsed });
    return JSON.stringify(res);
  },
});
```

Same shape works with Claude Agent SDK, Eliza, CrewAI — anything that speaks tool-call JSON.

## Why Kyvern

Agents with hot wallets get drained. Agents with custodial credit primitives are slow and KYC-heavy. Kyvern gives your agent a Solana wallet that **can't exceed its budget** — enforced by two on-chain programs (Kyvern + Squads v4) composing atomically.

The worst an agent can do in a day is spend its daily allowance. Everything else fails on-chain.

Read the full story at [kyvernlabs.com](https://kyvernlabs.com).

## License

MIT
