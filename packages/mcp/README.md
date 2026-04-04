# @kyvernlabs/mcp

MCP (Model Context Protocol) server for KyvernLabs Pulse. **17 tools** for AI agents to query x402 revenue analytics.

## Setup with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kyvernlabs-pulse": {
      "command": "npx",
      "args": ["@kyvernlabs/mcp"],
      "env": {
        "KYVERNLABS_API_KEY": "kv_live_your_key_here"
      }
    }
  }
}
```

## Get Your API Key

1. Go to [kyvernlabs.com/pulse/dashboard](https://kyvernlabs.com/pulse/dashboard)
2. Connect your wallet (SIWE)
3. Copy your `kv_live_` key from the API Keys page

## All 17 Tools

### Analytics (Free)

| Tool | Description | Params |
|------|-------------|--------|
| `pulse_get_stats` | Revenue, calls, customers, avg price with deltas | `range?: "24h"\|"7d"\|"30d"` |
| `pulse_get_endpoints` | Per-endpoint revenue, calls, latency, error rate | — |
| `pulse_get_customers` | Top paying agent wallets with spend breakdown | `limit?: number` |
| `pulse_get_transactions` | Recent payments with blockchain tx hashes | `limit?: number` |
| `pulse_get_timeseries` | Revenue over time for charting trends | `range?: "24h"\|"7d"\|"30d"` |
| `pulse_ingest_event` | Record an x402 payment event manually | `endpoint, amount_usd, payer_address, ...` |

### Search & Detail (Free)

| Tool | Description | Params |
|------|-------------|--------|
| `pulse_search_transactions` | Search by endpoint, address, tx hash with filters | `query?, source?, status?, limit?, offset?` |
| `pulse_get_endpoint_detail` | Detailed stats for a specific endpoint | `endpoint` (required) |
| `pulse_get_customer_detail` | Full profile for a specific agent wallet | `address` (required) |

### Pro Features

| Tool | Description | Params |
|------|-------------|--------|
| `pulse_get_benchmarks` | Pricing benchmarks vs the x402 market | — |
| `pulse_get_cohorts` | Agent retention cohort analysis | `periods?: number` |
| `pulse_get_alerts` | List configured alerts | — |
| `pulse_create_alert` | Create a revenue/latency/agent alert | `name, type, config` |
| `pulse_get_webhooks` | List configured webhooks | — |
| `pulse_get_market_intelligence` | Market-wide competitive intelligence | — |

### System

| Tool | Description | Params |
|------|-------------|--------|
| `pulse_get_usage` | Current tier usage (events, revenue, limits) | — |
| `pulse_health_check` | Verify API connection | — |

## Example Prompts

Once connected, ask Claude:

- "What's my x402 revenue this week?"
- "Which endpoint makes the most money?"
- "Show me my top 5 paying agents"
- "Search for payments from 0x914b..."
- "How does my pricing compare to the market?"
- "What's my agent retention rate?"
- "Create an alert for revenue drops over 50%"
- "Am I close to my daily event limit?"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KYVERNLABS_API_KEY` | Yes | Your `kv_live_` API key |
| `KYVERNLABS_URL` | No | API base URL (default: `https://kyvernlabs.com`) |

## License

MIT — [KyvernLabs](https://kyvernlabs.com)
