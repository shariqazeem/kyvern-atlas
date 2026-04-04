# KyvernLabs

**The business infrastructure layer for the x402 economy.**

[![npm @kyvernlabs/pulse](https://img.shields.io/npm/v/@kyvernlabs/pulse?label=%40kyvernlabs%2Fpulse&color=blue)](https://www.npmjs.com/package/@kyvernlabs/pulse)
[![npm @kyvernlabs/mcp](https://img.shields.io/npm/v/@kyvernlabs/mcp?label=%40kyvernlabs%2Fmcp&color=blue)](https://www.npmjs.com/package/@kyvernlabs/mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![x402](https://img.shields.io/badge/x402-Foundation-black)](https://x402.org)

Revenue analytics, wallet-native auth, and on-chain verification for x402 service providers. Built for the x402 Foundation ecosystem (Coinbase, Cloudflare, Stripe, Google, Visa, Solana, Amazon, Microsoft).

**Live at [kyvernlabs.com](https://kyvernlabs.com)**

## Architecture

```
Agent/Client → HTTP Request → Your x402 Endpoint
                                    ↓
                        withPulse() wraps withX402()
                              ↓                ↓
                     Captures payment     x402 verify + settle
                        headers
                              ↓
                     POST /api/pulse/ingest (fire-and-forget)
                              ↓
                     SQLite → Dashboard (kyvernlabs.com/pulse/dashboard)
```

## Quick Start

```bash
git clone https://github.com/shariqazeem/kyvernlabs.git
cd kyvernlabs
cp .env.example .env.local   # Edit with your values
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `X402_PAYTO_ADDRESS` | Yes | Wallet that receives x402 payments |
| `X402_CLIENT_PRIVATE_KEY` | For demo | Test wallet for "Make Live Payment" demo |
| `X402_FACILITATOR_URL` | No | x402 facilitator (default: `https://x402.org/facilitator`) |
| `X402_NETWORK` | No | Network (default: `eip155:84532` Base Sepolia) |
| `PULSE_API_KEY` | No | Default API key for demo endpoint (default: `demo_key_001`) |
| `NEXT_PUBLIC_BASE_URL` | For production | Your deployment URL (e.g., `https://kyvernlabs.com`) |
| `NEXT_PUBLIC_PAY_TO_ADDRESS` | No | Pay-to address shown in UI (defaults to X402_PAYTO_ADDRESS) |
| `PULSE_DB_PATH` | No | SQLite database path (default: `./pulse.db`) |

## npm Packages

### @kyvernlabs/pulse — Middleware

```typescript
import { withPulse } from '@kyvernlabs/pulse'
import { withX402 } from '@x402/next'

export const GET = withPulse(
  withX402(handler, config, server),
  { apiKey: 'kv_live_your_key' }
)
```

### @kyvernlabs/mcp — MCP Server

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

## Product Roadmap

1. **Pulse** (shipped) — Revenue analytics for x402 sellers
2. **Vault** (6mo) — Smart contract wallets with per-agent budgets
3. **Router** (12mo) — Smart routing to cheapest/fastest x402 service
4. **Marketplace** (18mo) — Launch x402 APIs in minutes

## Links

- **Website**: [kyvernlabs.com](https://kyvernlabs.com)
- **Pulse**: [kyvernlabs.com/pulse](https://kyvernlabs.com/pulse)
- **Services**: [kyvernlabs.com/services](https://kyvernlabs.com/services)
- **npm pulse**: [@kyvernlabs/pulse](https://www.npmjs.com/package/@kyvernlabs/pulse)
- **npm mcp**: [@kyvernlabs/mcp](https://www.npmjs.com/package/@kyvernlabs/mcp)
- **x402 Protocol**: [x402.org](https://x402.org)

## License

MIT
