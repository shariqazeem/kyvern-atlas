# create-kyvern-agent

> **One command. Working AI agent with on-chain spending controls.**

```bash
npx create-kyvern-agent my-agent
cd my-agent
npm install
cp .env.example .env    # paste your vault details
npm run agent           # watches Solana Explorer fill up
```

## What you get

A self-contained TypeScript project wired to a [Kyvern vault](https://kyvernlabs.com):

- `@kyvernlabs/sdk`'s `OnChainVault` pre-configured against the deployed `kyvern_policy` program on Solana devnet
- Sample agent that demonstrates allowed, blocked (policy), and blocked (cap) behaviors — every call produces a real Solana tx you can click on Explorer
- `.env.example` with every slot you need
- LangChain / Claude Agent SDK integration recipe in the generated README

## Why

Shipping an agent that moves money on Solana is three days of yak-shaving:

- Squads multisig wiring
- Spending-limit delegation
- USDC ATA creation
- Fee-payer airdrops
- CPI account orderings
- Error-code parsing

`create-kyvern-agent` skips all of that. The deployed program does the work; the scaffold just shows you where to put your agent's logic.

## Source

[github.com/shariqazeem/kyvernlabs](https://github.com/shariqazeem/kyvernlabs)

## License

MIT
