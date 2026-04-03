# @kyvernlabs/pulse

x402 analytics middleware. Capture every payment, see every customer, blockchain-verified.

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

## Get Your API Key

1. Go to [kyvernlabs.com/pulse/dashboard](https://kyvernlabs.com/pulse/dashboard)
2. Connect your wallet (SIWE)
3. Your `kv_live_` key is generated automatically

## What Gets Captured

| Field | Source |
|-------|--------|
| Endpoint path | Request URL |
| Payment amount (USD) | PAYMENT-SIGNATURE header |
| Payer wallet address | PAYMENT-RESPONSE header |
| Blockchain tx hash | PAYMENT-RESPONSE header |
| Network (Base, Ethereum, etc.) | PAYMENT-SIGNATURE header |
| Response latency | Measured by middleware |

## License

MIT — [KyvernLabs](https://kyvernlabs.com)
