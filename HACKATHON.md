# Stellar Hacks: Agents — Submission

## Pulse — Revenue Intelligence for the x402 Agent Economy on Stellar

### The Problem

The Stellar Hacks video says it perfectly: *"Agents can act, discover services, pay for them, complete tasks end to end without human assistance."*

But here's what nobody built: when agents earn and spend XLM/USDC on Stellar via x402, **service providers have zero visibility**. No revenue tracking. No customer analytics. No on-chain verification. No way to know which agents paid, how much they spent, or which endpoints are profitable.

Every x402 service on Stellar is flying blind.

### The Solution

Pulse is the revenue intelligence layer for x402 on Stellar. One line of middleware captures every payment — real-time, blockchain-verified, multi-chain.

```typescript
import { withPulse } from '@kyvernlabs/pulse'

export default withPulse(handler, { apiKey: 'kv_live_...' })
```

Agent pays → Stellar settles → Pulse captures → dashboard shows verified tx → StellarChain.io confirms.

### How It Uses Stellar (Deep Integration)

**Real Stellar SDK Integration (`@stellar/stellar-sdk` v15):**
- `src/lib/stellar.ts` — core library with 5 Horizon API functions
- `createTestnetKeypair()` — generates real keypairs, funds via Friendbot
- `submitPayment()` — builds, signs, and submits real `PaymentOperation` to Horizon testnet
- `getTransactionDetails()` — fetches full tx details from Horizon for verification
- `getAccountBalance()` — fetches real XLM + USDC balances from Horizon
- `getRecentTransactions()` — fetches account transaction history

**Real Stellar Testnet Transactions:**
- Every Stellar transaction in Pulse is submitted via `horizon-testnet.stellar.org`
- Real G-addresses (Stellar public keys)
- Real transaction hashes verifiable at `testnet.stellarchain.io/transactions/{hash}`
- x402 memo field for payment reconciliation (`x402:/api/endpoint`)
- Source labeled as `"horizon"` — honest, verifiable

**How to Verify:**
Click any Stellar transaction hash in the Pulse dashboard → opens StellarChain.io → shows real testnet transaction with real G-addresses, real amounts, real ledger numbers.

**Soroban-Aware Architecture:**
Chain-agnostic event schema designed to support Soroban contract invocations and authorization tracking when the x402 Stellar SDK adds Soroban support.

### How It Uses x402

- Native x402 middleware (`@kyvernlabs/pulse` on npm)
- Captures `PAYMENT-SIGNATURE` and `PAYMENT-RESPONSE` headers
- Per-payment tracking: amount, payer, endpoint, latency, tx hash, network
- On-chain verification via block explorer links
- Fire-and-forget analytics — zero impact on the x402 payment flow

### Why This Matches the Hackathon Vision

The video describes agents that *"discover, pay, and continue quickly and efficiently."* Pulse makes this observable:

- **Discovery**: Our x402 Service Registry lists every known endpoint
- **Payment**: Our middleware captures every x402 payment on Stellar
- **Continue**: Our AI Copilot helps agents and providers analyze revenue patterns

The video says *"MCP servers"* let agents make payments. Pulse ships **17 MCP tools** that let any Claude agent query its own x402 revenue on Stellar. The video says *"payment verified on chain."* Every Pulse transaction links to StellarChain.io with a green "Verified" badge.

We're not building another agent. We're building the financial infrastructure that every agent and every x402 provider on Stellar needs.

### AI / Agent Features

- **Pulse Copilot** — natural language revenue queries: "What's my Stellar revenue?" / "Compare Base vs Stellar"
- **17 MCP tools** — Claude Desktop / Cursor integration for AI agents to query analytics
- **Agent Persona Engine** — classifies agent wallets by behavior (Whale, Loyalist, Explorer, At Risk)
- **Revenue Forecast** — 7-day projection with confidence bands
- **Smart Alerts** — Slack/Discord notifications on revenue changes

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js API routes, 40+ endpoints |
| Database | SQLite (better-sqlite3, WAL mode) |
| Auth | Privy (email, Google, wallet) |
| Stellar | `@stellar/stellar-sdk` v15, Horizon testnet API |
| Chain Support | Base (EVM), Stellar (testnet + Horizon API) |
| AI | MCP server (17 tools), Copilot, heuristic insights |
| Packages | `@kyvernlabs/pulse` (middleware), `@kyvernlabs/mcp` (AI tools) |

### Demo

- **Live product**: https://kyvernlabs.com/pulse
- **Dashboard**: https://kyvernlabs.com/pulse/dashboard
- **API Docs**: https://kyvernlabs.com/docs/api
- **Service Registry**: https://kyvernlabs.com/registry
- **npm middleware**: https://www.npmjs.com/package/@kyvernlabs/pulse
- **npm MCP tools**: https://www.npmjs.com/package/@kyvernlabs/mcp
- **Video**: [Demo video link — to be added]

### Team

**Shariq Azeem** (@shariqshkt) — Solo founder, KyvernLabs
- 5 hackathon wins ($4,250 total)
- Built 3 x402 projects: ParallaxPay ($1,500 win), TrendSurfer, x402-Oracle
- Deep x402 protocol expertise across Base and Stellar

### The Positioning

*"Pulse is the Bloomberg Terminal for the x402 agent economy on Stellar. Every other team is building an agent that earns. We are building the tool that tracks what every agent earns. We do not compete with any project in this hackathon — we are the infrastructure layer they all need."*
