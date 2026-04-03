#!/usr/bin/env node

/**
 * @kyvernlabs/mcp — Model Context Protocol server for Pulse
 *
 * Lets AI agents (Claude, GPT, etc.) query x402 revenue analytics.
 *
 * Usage with Claude Desktop:
 *   Add to claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "kyvernlabs-pulse": {
 *         "command": "npx",
 *         "args": ["@kyvernlabs/mcp"],
 *         "env": {
 *           "KYVERNLABS_API_KEY": "kv_live_your_key_here"
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.KYVERNLABS_API_KEY || "";
const BASE_URL = process.env.KYVERNLABS_URL || "https://kyvernlabs.com";

async function pulseAPI(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/pulse${path}`, {
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pulse API error ${res.status}: ${text}`);
  }

  return res.json();
}

const server = new Server(
  { name: "kyvernlabs-pulse", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// --- Tools ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "pulse_get_stats",
      description:
        "Get revenue analytics for your x402 endpoints. Returns total revenue, API calls, unique agent customers, and average price per call with percentage changes vs previous period.",
      inputSchema: {
        type: "object" as const,
        properties: {
          range: {
            type: "string",
            enum: ["24h", "7d", "30d"],
            description: "Time range for stats. Default: 7d",
          },
        },
      },
    },
    {
      name: "pulse_get_endpoints",
      description:
        "List all your x402 endpoints with per-endpoint revenue, call count, average latency, and error rate.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "pulse_get_customers",
      description:
        "List top paying agent wallets with total spend, call count, first/last seen dates, and most used endpoint.",
      inputSchema: {
        type: "object" as const,
        properties: {
          limit: {
            type: "number",
            description: "Number of customers to return. Default: 20",
          },
        },
      },
    },
    {
      name: "pulse_get_transactions",
      description:
        "Get recent x402 payment transactions with blockchain tx hashes, payer addresses, amounts, and verification status.",
      inputSchema: {
        type: "object" as const,
        properties: {
          limit: {
            type: "number",
            description: "Number of transactions to return. Default: 20",
          },
        },
      },
    },
    {
      name: "pulse_get_timeseries",
      description:
        "Get revenue and call count over time for charting. Returns timestamped data points.",
      inputSchema: {
        type: "object" as const,
        properties: {
          range: {
            type: "string",
            enum: ["24h", "7d", "30d"],
            description: "Time range. Default: 7d",
          },
        },
      },
    },
    {
      name: "pulse_ingest_event",
      description:
        "Record an x402 payment event. Used by the withPulse() middleware or directly by your application.",
      inputSchema: {
        type: "object" as const,
        properties: {
          endpoint: { type: "string", description: "The API endpoint path (e.g., /api/search)" },
          amount_usd: { type: "number", description: "Payment amount in USD" },
          payer_address: { type: "string", description: "Wallet address of the payer" },
          latency_ms: { type: "number", description: "Response latency in milliseconds" },
          status: { type: "string", enum: ["success", "error", "timeout"], description: "Request status" },
          tx_hash: { type: "string", description: "Blockchain transaction hash (optional)" },
          network: { type: "string", description: "Blockchain network (e.g., eip155:84532)" },
        },
        required: ["endpoint", "amount_usd", "payer_address"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "pulse_get_stats": {
        const range = (args as { range?: string })?.range || "7d";
        const data = await pulseAPI(`/stats?range=${range}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "pulse_get_endpoints": {
        const data = await pulseAPI("/endpoints");
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "pulse_get_customers": {
        const limit = (args as { limit?: number })?.limit || 20;
        const data = await pulseAPI(`/customers?limit=${limit}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "pulse_get_transactions": {
        const limit = (args as { limit?: number })?.limit || 20;
        const data = await pulseAPI(`/recent?limit=${limit}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "pulse_get_timeseries": {
        const range = (args as { range?: string })?.range || "7d";
        const data = await pulseAPI(`/timeseries?range=${range}`);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      case "pulse_ingest_event": {
        const body = args as Record<string, unknown>;
        const res = await fetch(`${BASE_URL}/api/pulse/ingest`, {
          method: "POST",
          headers: {
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${String(error)}` }], isError: true };
  }
});

// --- Resources ---

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "pulse://stats",
      name: "Pulse Revenue Stats",
      description: "Current revenue analytics summary",
      mimeType: "application/json",
    },
    {
      uri: "pulse://endpoints",
      name: "Pulse Endpoints",
      description: "List of tracked x402 endpoints",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case "pulse://stats": {
      const data = await pulseAPI("/stats?range=7d");
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
    case "pulse://endpoints": {
      const data = await pulseAPI("/endpoints");
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KyvernLabs Pulse MCP server running");
}

main().catch(console.error);
