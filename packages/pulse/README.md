# @kyvernlabs/pulse

x402 analytics middleware — capture every payment on **Base, Stellar, and Solana** with one line of code. Blockchain-verified, chain-agnostic, fire-and-forget.

## Install

```bash
npm install @kyvernlabs/pulse
```

## Usage

```typescript
import { withPulse } from '@kyvernlabs/pulse'
import { withX402 } from '@x402/next'

const x402Handler = withX402(handler, {
  accepts: { scheme: 'exact', price: '$0.01', network: 'eip155:8453', payTo: '0x...' }
}, server)

// Every payment → your Pulse dashboard at kyvernlabs.com
export const GET = withPulse(x402Handler, {
  apiKey: 'kv_live_your_key_here'
})
```

## Multi-chain by default

Pulse auto-detects the network from your x402 payment headers. **No per-chain configuration needed** — set up your x402 endpoint on any supported network and Pulse captures the payment with the right block explorer link.

| Network | Chain ID (CAIP-2) | Explorer | Asset |
|---|---|---|---|
| Base | `eip155:8453` | basescan.org | USDC |
| Stellar Mainnet | `stellar:pubnet` | stellar.expert | USDC / XLM |
| Stellar Testnet | `stellar:testnet` | stellar.expert/testnet | USDC / XLM |
| Solana Mainnet | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | solscan.io | USDC / SOL |
| Solana Devnet | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` | solscan.io?cluster=devnet | USDC / SOL |

Adding a new chain is as simple as configuring your x402 endpoint to use it — Pulse will pick it up automatically.

## Get Your API Key

1. Go to [kyvernlabs.com/pulse/dashboard](https://kyvernlabs.com/pulse/dashboard)
2. Sign in with email, Google, or wallet (Privy)
3. Your `kv_live_` key is generated automatically — find it on the [API Keys page](https://kyvernlabs.com/pulse/dashboard/keys)

## What Gets Captured

| Field | Source |
|-------|--------|
| Endpoint path | Request URL |
| Payment amount (USD) | `payment-signature` header |
| Payer wallet address | `payment-response` header |
| Blockchain tx hash | `payment-response` header |
| Network (CAIP-2) | `payment-signature` / `payment-response` header |
| Asset (USDC, XLM, SOL, etc.) | `payment-signature` header |
| Response latency | Measured by middleware |
| Status (success / error) | Settlement result |

## How it works

```
Agent pays via x402 → Your endpoint → withPulse() reads headers
                                              ↓
                                    POST /api/pulse/ingest
                                    (fire-and-forget, ~5ms)
                                              ↓
                                    Your Pulse dashboard
                                    (real-time, on-chain verified)
```

The middleware adds **zero latency** to your endpoint — analytics are captured asynchronously after the response is sent.

## Frameworks supported

Works with any HTTP framework that exposes `Request` and `Response` objects:

- Next.js (App Router + Pages Router)
- Express
- Hono (Cloudflare Workers, Bun, Deno)
- Fastify
- Any framework wrapped via `@x402/core`

## Setup guide

For copy-paste examples for every framework and chain, see the [Setup Guide](https://kyvernlabs.com/pulse/dashboard/setup) on your dashboard.

## License

MIT — [KyvernLabs](https://kyvernlabs.com)
