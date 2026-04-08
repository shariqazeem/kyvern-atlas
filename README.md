# Pulse by KyvernLabs

### Revenue intelligence for the x402 protocol

[![npm @kyvernlabs/pulse](https://img.shields.io/npm/v/@kyvernlabs/pulse?label=%40kyvernlabs%2Fpulse&color=blue)](https://www.npmjs.com/package/@kyvernlabs/pulse)
[![npm @kyvernlabs/mcp](https://img.shields.io/npm/v/@kyvernlabs/mcp?label=%40kyvernlabs%2Fmcp&color=blue)](https://www.npmjs.com/package/@kyvernlabs/mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![x402 Foundation](https://img.shields.io/badge/x402-Foundation-black)](https://x402.org)

Track every x402 micropayment, every AI agent customer, every endpoint — blockchain-verified, real-time, multi-tenant isolated. One line of middleware.

[Live Dashboard](https://kyvernlabs.com/pulse/dashboard) | [API Docs](https://kyvernlabs.com/docs/api) | [npm](https://www.npmjs.com/package/@kyvernlabs/pulse) | [Changelog](https://kyvernlabs.com/changelog)

---

## How it works

```
1. Connect wallet → get kv_live_ API key (12 seconds)
2. npm install @kyvernlabs/pulse
3. Wrap your x402 endpoint → see every payment in your dashboard
```

```typescript
import { withPulse } from '@kyvernlabs/pulse'
import { withX402 } from '@x402/next'

// One line. That's the entire integration.
export const GET = withPulse(
  withX402(handler, x402Config),
  { apiKey: 'kv_live_your_key' }
)
```

Every x402 payment captured: endpoint, amount (USDC), payer wallet, latency, tx hash, network, status. On-chain verified via BaseScan.

---

## Architecture

```
x402 Agent → HTTP 402 → Your Endpoint
                              │
                    withPulse() middleware
                         │          │
                 Captures payment   x402 settles
                    headers         on-chain
                         │
                 POST /api/pulse/ingest
                    (fire-and-forget)
                         │
            ┌────────────┼────────────┐
            │            │            │
        Dashboard    Webhooks     Alerts
        (real-time)  (HMAC-SHA256) (Slack/Discord)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js API routes, 40+ endpoints |
| Database | SQLite (better-sqlite3, WAL mode) |
| Auth | Privy (email, Google, wallet), session cookies |
| Payments | USDC on Base via x402 protocol |
| Stellar | `@stellar/stellar-sdk` v15 — mainnet (`horizon.stellar.org`) + testnet, USDC, Soroban-aware |
| Solana | `@solana/web3.js` v1.98 — mainnet-beta + devnet, USDC, native SOL transfers |
| AI | MCP server (17 tools), AI Copilot, heuristic insights |

### Multi-chain support

Pulse is chain-agnostic by design. Each network has its own adapter library and a single `network` field in the `events` table — every transaction in the dashboard links to the right block explorer for verification.

| Chain | Networks supported | Explorer | USDC |
|---|---|---|---|
| Base | mainnet | basescan.org | ✅ |
| Stellar | mainnet + testnet | stellar.expert | ✅ |
| Solana | mainnet-beta + devnet | solscan.io | ✅ |

Default network selection happens automatically — if `STELLAR_MAINNET_*` is set, Stellar mainnet is used; otherwise testnet. Same pattern for `SOLANA_MAINNET_*`.

---

## What Pulse tracks per transaction

- Endpoint path called
- Payment amount (USDC)
- Payer wallet address (AI agent)
- Response latency (ms)
- Transaction hash (on-chain proof, links to BaseScan)
- Network (Base, Stellar, Solana, Polygon, Ethereum, Arbitrum, Optimism)
- Success / error / timeout status

---

## Dashboard features

**Free tier:**
- Revenue dashboard with real-time stats and charts
- Transactions with on-chain verification badges
- Endpoint analytics (health score, calls, revenue, latency, error rate)
- Customer intelligence (agent personas, churn risk)
- Market intelligence (ecosystem-wide data)
- 5,000 events/day, 14-day retention

**Growth tier ($19/mo):**
- Pricing benchmarks vs market
- 50,000 events/day, 30-day retention
- CSV export, 3 API keys

**Pro tier ($49/mo USDC):**
- AI Copilot (natural language revenue queries)
- A/B pricing experiments
- Smart alerts with Slack/Discord
- Webhooks (HMAC-SHA256 signed)
- Revenue forecast with confidence bands
- Agent persona engine, cohort analysis
- Unlimited everything, 90-day retention

---

## npm packages

### @kyvernlabs/pulse — Middleware

Wraps any x402 endpoint. Captures every payment. Zero impact on your payment flow.

```bash
npm install @kyvernlabs/pulse
```

Works with: Next.js, Express, Hono, Cloudflare Workers, or any framework via direct API.

### @kyvernlabs/mcp — AI Agent Tools

17 MCP tools for Claude Desktop, Cursor, and any MCP-compatible AI assistant.

```bash
npm install -g @kyvernlabs/mcp
```

```json
{
  "mcpServers": {
    "kyvernlabs-pulse": {
      "command": "npx",
      "args": ["@kyvernlabs/mcp"],
      "env": { "KYVERNLABS_API_KEY": "kv_live_..." }
    }
  }
}
```

Your AI can ask: "What's my x402 revenue this week?" and get real answers from your Pulse data.

---

## Ecosystem positioning

```
x402 Protocol (Linux Foundation)
├── Payment rails (Coinbase, Stripe, Cloudflare)
├── x402 Services (195+ endpoints)
└── KyvernLabs Pulse ← you are here
    ├── Revenue analytics (real-time, per-endpoint)
    ├── Customer intelligence (agent wallets, personas, churn)
    ├── On-chain verification (BaseScan links)
    ├── Market intelligence (ecosystem benchmarks)
    ├── AI Copilot (natural language queries)
    ├── MCP tools (17 tools for AI assistants)
    └── One-line middleware (@kyvernlabs/pulse)
```

Compatible with all x402 ecosystem projects: HeyAnna, FateFi, ClawBet, ValidFi, and every x402 service provider.

---

## Public tools (no login required)

- [x402 Service Registry](https://kyvernlabs.com/registry) — directory of every x402 endpoint
- [Market Gap Finder](https://kyvernlabs.com/tools/gaps) — find high-demand, low-supply categories
- [State of x402 Report](https://kyvernlabs.com/reports) — monthly ecosystem analysis
- [Market Data API](https://kyvernlabs.com/docs/api) — programmatic access to ecosystem data
- [Public Leaderboard](https://kyvernlabs.com) — top endpoints by volume and revenue

---

## Self-hosting

```bash
git clone https://github.com/shariqazeem/kyvernlabs.git
cd kyvernlabs
cp .env.example .env.local
npm install --legacy-peer-deps
npm run dev
```

See `.env.example` for required environment variables.

---

## Links

- **Website**: [kyvernlabs.com](https://kyvernlabs.com)
- **Dashboard**: [kyvernlabs.com/pulse/dashboard](https://kyvernlabs.com/pulse/dashboard)
- **API Docs**: [kyvernlabs.com/docs/api](https://kyvernlabs.com/docs/api)
- **Changelog**: [kyvernlabs.com/changelog](https://kyvernlabs.com/changelog)
- **npm pulse**: [@kyvernlabs/pulse](https://www.npmjs.com/package/@kyvernlabs/pulse)
- **npm mcp**: [@kyvernlabs/mcp](https://www.npmjs.com/package/@kyvernlabs/mcp)
- **x402 Protocol**: [x402.org](https://x402.org)
- **Twitter**: [@KyvernLabs](https://x.com/KyvernLabs)

## License

MIT — see [LICENSE](LICENSE)
