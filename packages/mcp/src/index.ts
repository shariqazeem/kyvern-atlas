#!/usr/bin/env node

/**
 * @kyvernlabs/mcp v0.2.0 — Model Context Protocol server for Pulse
 * 17 tools for AI agents to query x402 revenue analytics.
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

async function pulseAPI(path: string, method = "GET", body?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/pulse${path}`, {
    method,
    headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 403) {
    const d = await res.json().catch(() => ({}));
    throw new Error(`Pro feature required: ${(d as Record<string, string>).message || "Upgrade to Pulse Pro for this feature."}`);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pulse API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function healthAPI(): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/api/health`);
  return res.json();
}

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const err = (msg: string) => ({ content: [{ type: "text" as const, text: msg }], isError: true as const });

// --- Tool definitions ---

const TOOLS = [
  {
    name: "pulse_get_stats",
    description: "Get revenue analytics: total revenue, API calls, unique agent customers, average price per call, with % changes vs previous period.",
    inputSchema: { type: "object" as const, properties: { range: { type: "string", enum: ["24h", "7d", "30d"], description: "Time range. Default: 7d" } } },
  },
  {
    name: "pulse_get_endpoints",
    description: "List all x402 endpoints with per-endpoint revenue, call count, average latency, and error rate.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "pulse_get_customers",
    description: "List top paying agent wallets with total spend, call count, first/last seen, and most used endpoint.",
    inputSchema: { type: "object" as const, properties: { limit: { type: "number", description: "Max results. Default: 20" } } },
  },
  {
    name: "pulse_get_transactions",
    description: "Get recent x402 payment transactions with blockchain tx hashes, amounts, payer addresses, and verification status.",
    inputSchema: { type: "object" as const, properties: { limit: { type: "number", description: "Max results. Default: 20" } } },
  },
  {
    name: "pulse_get_timeseries",
    description: "Get revenue and call count over time. Returns timestamped data points for charting trends.",
    inputSchema: { type: "object" as const, properties: { range: { type: "string", enum: ["24h", "7d", "30d"], description: "Time range. Default: 7d" } } },
  },
  {
    name: "pulse_ingest_event",
    description: "Record an x402 payment event manually. Normally the withPulse() middleware does this automatically.",
    inputSchema: {
      type: "object" as const,
      properties: {
        endpoint: { type: "string", description: "API endpoint path (e.g., /api/search)" },
        amount_usd: { type: "number", description: "Payment amount in USD" },
        payer_address: { type: "string", description: "Payer wallet address" },
        latency_ms: { type: "number", description: "Response latency in ms" },
        status: { type: "string", enum: ["success", "error", "timeout"], description: "Status" },
        tx_hash: { type: "string", description: "Blockchain tx hash" },
        network: { type: "string", description: "Network (e.g., eip155:84532)" },
      },
      required: ["endpoint", "amount_usd", "payer_address"],
    },
  },
  // --- New tools (7-17) ---
  {
    name: "pulse_get_benchmarks",
    description: "Get pricing benchmarks: market average/median price, your percentile rank vs the x402 ecosystem. Pro feature.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "pulse_get_cohorts",
    description: "Get agent retention cohort analysis: groups agents by first-seen week, tracks what % return in subsequent weeks. Pro feature.",
    inputSchema: { type: "object" as const, properties: { periods: { type: "number", description: "Weeks to track. Default: 8" } } },
  },
  {
    name: "pulse_search_transactions",
    description: "Search transactions with filters. Find payments by endpoint, payer address, tx hash, source type, or status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search by endpoint path, payer address, or tx hash" },
        source: { type: "string", enum: ["middleware", "seed"], description: "Filter by source" },
        status: { type: "string", enum: ["success", "error"], description: "Filter by status" },
        limit: { type: "number", description: "Max results. Default: 20" },
        offset: { type: "number", description: "Pagination offset. Default: 0" },
      },
    },
  },
  {
    name: "pulse_get_endpoint_detail",
    description: "Get detailed stats for a specific endpoint: calls, revenue, latency, error rate, unique payers, top payers.",
    inputSchema: {
      type: "object" as const,
      properties: {
        endpoint: { type: "string", description: "Endpoint path (e.g., /api/search)" },
        range: { type: "string", enum: ["24h", "7d", "30d"], description: "Time range. Default: 30d" },
      },
      required: ["endpoint"],
    },
  },
  {
    name: "pulse_get_customer_detail",
    description: "Get full profile for a specific agent wallet: total spend, call count, all endpoints used, spend breakdown.",
    inputSchema: {
      type: "object" as const,
      properties: { address: { type: "string", description: "Wallet address (0x...)" } },
      required: ["address"],
    },
  },
  {
    name: "pulse_get_alerts",
    description: "List all configured alerts with status, type, last triggered time, and trigger count. Pro feature.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "pulse_create_alert",
    description: "Create a new alert. Types: revenue_drop, revenue_spike, new_agent, latency_spike, daily_target. Pro feature.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Alert name" },
        type: { type: "string", enum: ["revenue_drop", "revenue_spike", "new_agent", "latency_spike", "daily_target"], description: "Alert type" },
        config: { type: "object", description: "Alert config: { threshold?: number, period?: '1h'|'6h'|'24h', endpoint?: string }" },
      },
      required: ["name", "type", "config"],
    },
  },
  {
    name: "pulse_get_webhooks",
    description: "List all configured webhooks with URL, subscribed events, status, and failure count. Pro feature.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "pulse_get_market_intelligence",
    description: "Get market-wide competitive intelligence: top endpoints by volume/revenue, category breakdown, growth trends. Pro feature.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "pulse_get_usage",
    description: "Get current tier usage: events used/limit, revenue used/limit, tier name, whether you can ingest more events.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "pulse_health_check",
    description: "Verify the Pulse API connection is working. Returns API status, version, and timestamp.",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

// --- Server setup ---

const server = new Server(
  { name: "kyvernlabs-pulse", version: "0.2.0" },
  { capabilities: { tools: {}, resources: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args || {}) as Record<string, unknown>;

  try {
    switch (name) {
      case "pulse_get_stats":
        return ok(await pulseAPI(`/stats?range=${a.range || "7d"}`));

      case "pulse_get_endpoints":
        return ok(await pulseAPI("/endpoints"));

      case "pulse_get_customers":
        return ok(await pulseAPI(`/customers?limit=${a.limit || 20}`));

      case "pulse_get_transactions":
        return ok(await pulseAPI(`/recent?limit=${a.limit || 20}`));

      case "pulse_get_timeseries":
        return ok(await pulseAPI(`/timeseries?range=${a.range || "7d"}`));

      case "pulse_ingest_event":
        return ok(await pulseAPI("/ingest", "POST", a));

      case "pulse_get_benchmarks":
        return ok(await pulseAPI("/benchmarks"));

      case "pulse_get_cohorts":
        return ok(await pulseAPI(`/cohorts?periods=${a.periods || 8}`));

      case "pulse_search_transactions": {
        const params = new URLSearchParams();
        if (a.query) params.set("search", String(a.query));
        if (a.source) params.set("source", String(a.source));
        if (a.status) params.set("status", String(a.status));
        params.set("limit", String(a.limit || 20));
        params.set("offset", String(a.offset || 0));
        return ok(await pulseAPI(`/recent?${params}`));
      }

      case "pulse_get_endpoint_detail": {
        // Get all endpoints then filter to the requested one
        const data = await pulseAPI("/endpoints") as { endpoints: Array<Record<string, unknown>> };
        const match = data.endpoints?.find((e) => e.path === a.endpoint);
        if (!match) return err(`Endpoint "${a.endpoint}" not found. Use pulse_get_endpoints to see available endpoints.`);
        return ok(match);
      }

      case "pulse_get_customer_detail": {
        const data = await pulseAPI(`/customers?limit=200`) as { customers: Array<Record<string, unknown>> };
        const match = data.customers?.find((c) => String(c.address).toLowerCase() === String(a.address).toLowerCase());
        if (!match) return err(`Agent "${a.address}" not found. Use pulse_get_customers to see known agents.`);
        return ok(match);
      }

      case "pulse_get_alerts":
        return ok(await pulseAPI("/alerts"));

      case "pulse_create_alert":
        return ok(await pulseAPI("/alerts", "POST", { name: a.name, type: a.type, config: a.config }));

      case "pulse_get_webhooks":
        return ok(await pulseAPI("/webhooks"));

      case "pulse_get_market_intelligence":
        return ok(await pulseAPI("/intelligence"));

      case "pulse_get_usage":
        return ok(await pulseAPI("/usage"));

      case "pulse_health_check":
        return ok(await healthAPI());

      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return err(`Error: ${String(error)}`);
  }
});

// --- Resources ---

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: "pulse://stats", name: "Revenue Stats", description: "Current revenue analytics", mimeType: "application/json" },
    { uri: "pulse://endpoints", name: "Endpoints", description: "Tracked x402 endpoints", mimeType: "application/json" },
    { uri: "pulse://usage", name: "Tier Usage", description: "Current plan and limits", mimeType: "application/json" },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const pathMap: Record<string, string> = {
    "pulse://stats": "/stats?range=7d",
    "pulse://endpoints": "/endpoints",
    "pulse://usage": "/usage",
  };
  const path = pathMap[uri];
  if (!path) throw new Error(`Unknown resource: ${uri}`);
  const data = await pulseAPI(path);
  return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] };
});

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KyvernLabs Pulse MCP server v0.2.0 running (17 tools)");
}

main().catch(console.error);
