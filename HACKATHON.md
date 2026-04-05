# Stellar Hacks: Agents — Submission

## Project: Pulse by KyvernLabs
### Revenue Intelligence for x402 on Stellar

---

### What we built

Pulse is the business intelligence layer for the x402 protocol. It gives every x402 service provider — on Stellar, Base, and any supported chain — full visibility into their agent payment revenue.

One line of middleware. Every payment tracked. Blockchain-verified.

```typescript
import { withPulse } from '@kyvernlabs/pulse'

export default withPulse(handler, { apiKey: 'kv_live_...' })
```

### How it uses Stellar

- **Stellar testnet transaction ingestion** — Pulse captures x402 payments on Stellar with full transaction details
- **Stellar chain badges** — Every Stellar transaction displays the Stellar logo and brand in the dashboard
- **Stellar address support** — G... format addresses displayed with proper formatting
- **Stellar explorer links** — Transaction hashes link directly to StellarChain.io
- **Multi-chain dashboard** — Stellar transactions displayed alongside Base/EVM in the same unified view
- **Stellar-specific setup guide** — Framework tab showing Stellar x402 integration with Pulse

### How it uses x402

- Native x402 middleware (`@kyvernlabs/pulse` on npm)
- Captures PAYMENT-SIGNATURE and PAYMENT-RESPONSE headers
- Per-payment tracking: amount, payer, endpoint, latency, tx hash, network
- On-chain verification via block explorer links
- Fire-and-forget analytics — zero impact on payment flow

### AI / Agent features

- **Pulse Copilot** — AI chat interface that answers revenue questions in natural language ("What's my Stellar revenue this week?")
- **17 MCP tools** — Claude Desktop / Cursor integration for AI assistants to query analytics
- **Agent Persona Engine** — Classifies agent wallets (Whale, Loyalist, Explorer, At Risk)
- **Revenue Forecast** — 7-day projection with confidence bands
- **AI-Suggested Alerts** — Smart recommendations for alert rules

### Full feature list

- Real-time revenue dashboard with charts
- Transactions page with chain badges + on-chain verified badges
- Endpoint analytics with health scores (0-100)
- Customer intelligence with persona classification
- Money Moments social feed
- Pricing experiments (A/B analysis)
- Smart alerts with Slack/Discord notifications
- Webhooks (HMAC-SHA256 signed)
- CSV export
- Public x402 Service Registry
- Market Gap Finder
- State of x402 Economy report
- Market Data API (public, documented)
- Cmd+K command palette
- 3-tier pricing (Free / Growth $19 / Pro $49)
- Payment via USDC on Base + MoonPay credit card option

### Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js API routes, 40+ endpoints |
| Database | SQLite (better-sqlite3, WAL mode) |
| Auth | Privy (email, Google, wallet) |
| Payments | USDC on Base via x402 |
| AI | MCP server, Copilot (heuristic + Elsa LLM Gateway config) |
| Deployment | Ubuntu VM, PM2, Caddy |

### Demo

- **Live product**: https://kyvernlabs.com/pulse
- **Dashboard**: https://kyvernlabs.com/pulse/dashboard
- **API Docs**: https://kyvernlabs.com/docs/api
- **Registry**: https://kyvernlabs.com/registry
- **npm**: https://www.npmjs.com/package/@kyvernlabs/pulse
- **Video**: [Demo video link]

### Team

**Shariq Azeem** (@shariqshkt) — Solo founder
- 5 hackathon wins ($4,250 total)
- Built 3 x402 projects: ParallaxPay ($1,500 win), TrendSurfer, x402-Oracle
- Deep x402 protocol expertise

### Why this matters for Stellar

Stellar's fast settlement and low fees make it ideal for agent micropayments. But x402 service providers on Stellar have zero analytics. Pulse gives them the same revenue intelligence that web2 companies get from Stripe Dashboard — but for the agent economy, on Stellar.

Every x402 service on Stellar that installs Pulse contributes to a network effect: more providers = better market benchmarks = more value for everyone. Pulse is the pick-and-shovel play for the Stellar x402 gold rush.
