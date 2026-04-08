# Stellar Hacks: Agents — Submission

## Pulse — Revenue Intelligence for the x402 Agent Economy on Stellar

### The Problem

The Stellar Hacks video says it perfectly: *"Agents can act, discover services, pay for them, complete tasks end to end without human assistance."*

But here's what nobody built: when agents earn and spend XLM/USDC on Stellar via x402, **service providers have zero visibility**. No revenue tracking. No customer analytics. No on-chain verification. No way to know which agents paid, how much they spent, or which endpoints are profitable.

Every x402 service on Stellar is flying blind.

### The Solution

Pulse is the revenue intelligence layer for x402 on Stellar. One line of middleware captures every payment — real-time, blockchain-verified, multi-network.

```typescript
import { withPulse } from '@kyvernlabs/pulse'

export default withPulse(handler, { apiKey: 'kv_live_...' })
```

Agent pays → Stellar settles → Pulse captures → dashboard shows verified tx → stellar.expert confirms.

### How It Uses Stellar (Deep Integration)

**Real Stellar SDK Integration (`@stellar/stellar-sdk` v15) — Mainnet AND Testnet:**

`src/lib/stellar.ts` is a chain-agnostic library that works across both Stellar networks with a single network parameter. Every function accepts a `StellarNetwork` argument (`"mainnet"` or `"testnet"`) and routes to the correct Horizon endpoint, USDC issuer, and explorer.

**Core Functions:**
- `createKeypair(network)` — generates real keypairs. Auto-funds via Friendbot on testnet; mainnet returns the keypair for manual funding with real XLM.
- `submitPayment(secret, to, amount, asset, memo, network)` — builds, signs, and submits real `PaymentOperation` to the right Horizon endpoint (mainnet or testnet).
- `getTransactionDetails(txHash, network)` — fetches full tx details from Horizon for verification on either network.
- `getAccountBalance(publicKey, network)` — fetches real XLM + USDC balances from the correct Horizon.
- `getRecentTransactions(publicKey, limit, network)` — fetches account transaction history.
- `resolveDefaultNetwork()` — picks mainnet automatically if `STELLAR_MAINNET_*` env is set, otherwise testnet.

**Network Configuration:**
| | Mainnet | Testnet |
|---|---|---|
| Horizon | `horizon.stellar.org` | `horizon-testnet.stellar.org` |
| Network Passphrase | `Networks.PUBLIC` | `Networks.TESTNET` |
| USDC Issuer | Circle's official `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` | Demo issuer |
| Explorer | `stellar.expert/explorer/public` | `stellar.expert/explorer/testnet` |
| Account Funding | Real XLM from any wallet | Friendbot auto-funded with 10K XLM |
| Chain ID (CAIP-2) | `stellar:pubnet` | `stellar:testnet` |

**Real Stellar Transactions on Both Networks:**
- Every Stellar transaction in Pulse is a real on-chain payment, verifiable on stellar.expert
- Real G-addresses (Stellar public keys)
- Real transaction hashes — click any one in the dashboard to verify
- x402 memo field for payment reconciliation (`x402:/api/endpoint`)
- Source labeled as `"horizon"` — honest, verifiable, never simulated
- Mainnet support is the default for production accounts; testnet for demos and Hacks

**How to Verify Right Now:**
1. Open the Pulse dashboard at https://kyvernlabs.com/pulse/dashboard
2. Filter the transactions table by network: Stellar (mainnet) or Stellar Testnet
3. Click any transaction hash → opens stellar.expert → shows the real on-chain payment with real G-addresses, real amounts, real ledger numbers
4. Same flow works on both networks

**Soroban-Aware Architecture:**
The events table schema (`network`, `asset`, `tx_hash`, `scheme`, `source`) is designed to support Soroban contract invocations and authorization tracking when the x402 Stellar SDK adds Soroban support. Adding Soroban will be a chain-adapter addition, not a rewrite.

### How It Uses x402

- Native x402 middleware (`@kyvernlabs/pulse` on npm)
- Captures `PAYMENT-SIGNATURE` and `PAYMENT-RESPONSE` headers
- Per-payment tracking: amount, payer, endpoint, latency, tx hash, network, asset
- On-chain verification via block explorer links for every supported network
- Fire-and-forget analytics — zero impact on the x402 payment flow
- KyvernLabs Pro subscriptions are paid via x402 USDC — we eat our own dog food

### Why This Matches the Hackathon Vision

The video describes agents that *"discover, pay, and continue quickly and efficiently."* Pulse makes this observable:

- **Discovery**: Our public x402 Service Registry lists every known endpoint with on-chain verification
- **Payment**: Our middleware captures every x402 payment on Stellar (mainnet or testnet)
- **Continue**: Our AI Copilot helps agents and providers analyze revenue patterns across chains

The video says *"MCP servers"* let agents make payments. Pulse ships **17 MCP tools** that let any Claude or Cursor agent query its own x402 revenue on Stellar. The video says *"payment verified on chain."* Every Pulse transaction links directly to stellar.expert with a green "Verified" badge.

We're not building another agent. We're building the financial infrastructure that every agent and every x402 provider on Stellar needs.

### AI / Agent Features

- **Pulse Copilot** — natural language revenue queries: "What's my Stellar revenue?" / "Compare Base vs Stellar" / "Which agents chain multiple services?"
- **17 MCP tools** — Claude Desktop / Cursor integration for AI agents to query their own analytics programmatically
- **Agent Persona Engine** — classifies agent wallets by behavior (Whale, Loyalist, Explorer, At Risk)
- **Revenue Forecast** — 7-day projection with confidence bands
- **Smart Alerts** — Slack/Discord notifications on revenue changes
- **A/B Pricing Experiments** — test different prices and measure agent response

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js API routes, 40+ endpoints |
| Database | SQLite (better-sqlite3, WAL mode) |
| Auth | Privy (email, Google, wallet) |
| Stellar | `@stellar/stellar-sdk` v15, Horizon API (mainnet + testnet) |
| Solana | `@solana/web3.js` v1.98, RPC (mainnet + devnet) |
| Chain Support | Base (EVM), Stellar (mainnet + testnet), Solana (mainnet + devnet) |
| AI | MCP server (17 tools), Copilot, heuristic insights |
| Packages | `@kyvernlabs/pulse` (middleware), `@kyvernlabs/mcp` (AI tools) |
| Billing | x402-native USDC subscriptions on Base mainnet |

### Demo

- **Live product**: https://kyvernlabs.com/pulse
- **Dashboard**: https://kyvernlabs.com/pulse/dashboard
- **Setup guide (3 chains)**: https://kyvernlabs.com/pulse/dashboard/setup
- **Service Registry**: https://kyvernlabs.com/registry
- **API Docs**: https://kyvernlabs.com/docs/api
- **npm middleware**: https://www.npmjs.com/package/@kyvernlabs/pulse
- **npm MCP tools**: https://www.npmjs.com/package/@kyvernlabs/mcp
- **Video**: see DoraHacks submission

### What's New Since Initial Submission

- ✅ **Stellar Mainnet support** — chain-agnostic library refactor, mainnet is now the default for production accounts
- ✅ **Solana integration** — `@solana/web3.js` integration with same depth as Stellar (mainnet + devnet)
- ✅ **x402-native subscription billing** — replaced credit-card flow with USDC-only Pulse Pro that supports both connected wallets and external wallets via tx-hash verification
- ✅ **Multi-tenant production hardening** — session-authenticated subscription endpoint, session-wallet attribution on upgrade verify, refresh-on-success in upgrade flow
- ✅ **Updated explorer URLs** to stellar.expert (covers both networks under one domain)

### Team

**Shariq Azeem** (@shariqshkt) — Solo founder, KyvernLabs

Before KyvernLabs, shipped multiple production x402 projects: ParallaxPay, TrendSurfer, x402-Oracle, and several others. Among the very few builders with deep, hands-on x402 experience across Base, Stellar, and Solana. Building KyvernLabs full-time as the sole engineer.

### The Positioning

*"Pulse is the Bloomberg Terminal for the x402 agent economy on Stellar. Every other team is building an agent that earns. We are building the tool that tracks what every agent earns. We do not compete with any project in this hackathon — we are the infrastructure layer they all need."*
