# @kyvernlabs/mcp

MCP (Model Context Protocol) server for KyvernLabs Pulse. Let AI agents query your x402 revenue analytics.

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

## Available Tools

| Tool | Description |
|------|-------------|
| `pulse_get_stats` | Revenue, calls, customers, avg price with deltas (24h/7d/30d) |
| `pulse_get_endpoints` | Per-endpoint revenue, calls, latency, error rate |
| `pulse_get_customers` | Top paying agent wallets with spend breakdown |
| `pulse_get_transactions` | Recent payments with blockchain tx hashes |
| `pulse_get_timeseries` | Revenue over time for charting |
| `pulse_ingest_event` | Record an x402 payment event |

## Example Prompts

Once connected, ask Claude:

- "What's my x402 revenue this week?"
- "Which endpoints are making the most money?"
- "Show me my top 5 paying agents"
- "How many verified payments did I get today?"

## License

MIT — [KyvernLabs](https://kyvernlabs.com)
