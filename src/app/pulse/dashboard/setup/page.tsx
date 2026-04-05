"use client";

import { motion } from "framer-motion";
import { Copy, Check, Terminal, Package, Code2, Bot, Cpu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const ease = [0.25, 0.1, 0.25, 1] as const;

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <pre className="bg-[#09090B] text-gray-100 rounded-xl p-4 text-[13px] font-mono overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-[10px] font-medium text-white/40 hover:text-white/70 transition-all duration-200 opacity-0 group-hover:opacity-100"
      >
        {copied ? (
          <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
        ) : (
          <><Copy className="w-3 h-3" /> Copy</>
        )}
      </button>
    </div>
  );
}

const FRAMEWORKS = [
  {
    name: "Next.js",
    label: "Next.js",
    code: (key: string) => `// app/api/my-service/route.ts
import { withX402 } from '@x402/next'
import { withPulse } from '@kyvernlabs/pulse'

const handler = async (req) => {
  return Response.json({ data: "premium content" })
}

export const GET = withPulse(
  withX402(handler, x402Config),
  { apiKey: '${key}' }
)`,
  },
  {
    name: "Express",
    label: "Express",
    code: (key: string) => `// server.js
import express from 'express'
import { withPulse } from '@kyvernlabs/pulse'

const app = express()

const handler = (req, res) => {
  res.json({ data: "premium content" })
}

app.get('/api/my-service',
  withPulse(handler, { apiKey: '${key}' })
)`,
  },
  {
    name: "Hono",
    label: "Hono",
    code: (key: string) => `// src/index.ts (Cloudflare Workers / Bun)
import { Hono } from 'hono'
import { withPulse } from '@kyvernlabs/pulse'

const app = new Hono()

app.get('/api/my-service', async (c) => {
  // Pulse middleware wraps your handler
  return withPulse(
    async () => c.json({ data: "premium content" }),
    { apiKey: '${key}' }
  )(c.req.raw)
})

export default app`,
  },
  {
    name: "Direct",
    label: "Any Language",
    code: (key: string) => `# Works with any language — just POST to the ingest API
# Python example:

import requests

requests.post("https://kyvernlabs.com/api/pulse/ingest",
  headers={
    "X-API-Key": "${key}",
    "Content-Type": "application/json"
  },
  json={
    "endpoint": "/api/my-service",
    "amount_usd": 0.01,
    "payer_address": "0xagent...",
    "tx_hash": "0xtx...",
    "network": "eip155:8453",
    "status": "success"
  }
)`,
  },
];

function FrameworkTabs({ displayKey }: { displayKey: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="rounded-xl border border-black/[0.06] overflow-hidden">
      <div className="flex border-b border-black/[0.04] bg-[#FAFAFA]">
        {FRAMEWORKS.map((fw, i) => (
          <button
            key={fw.name}
            onClick={() => setActive(i)}
            className={`px-4 py-2.5 text-[12px] font-medium transition-colors ${
              active === i
                ? "text-pulse border-b-2 border-pulse bg-white"
                : "text-quaternary hover:text-secondary"
            }`}
          >
            {fw.label}
          </button>
        ))}
      </div>
      <div className="p-0">
        <CopyBlock code={FRAMEWORKS[active].code(displayKey)} />
      </div>
    </div>
  );
}

export default function SetupPage() {
  const { apiKey, apiKeyPrefix, isAuthenticated } = useAuth();
  const displayKey = isAuthenticated ? (apiKey || apiKeyPrefix + "...") : "kv_live_your_key_here";

  return (
    <div className="max-w-2xl space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <h1 className="text-[18px] font-bold tracking-tight">Setup Guide</h1>
        <p className="text-[13px] text-tertiary mt-1">
          Integrate Pulse into your x402 endpoint in under 2 minutes.
          Three ways: middleware, MCP server, or direct API.
        </p>
      </motion.div>

      {/* Section: Middleware Integration */}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease }}
          className="flex items-center gap-2"
        >
          <Code2 className="w-4 h-4 text-pulse" />
          <h2 className="text-[15px] font-semibold tracking-tight">Middleware Integration</h2>
          <span className="text-[10px] font-medium text-quaternary bg-[#F0F0F0] px-2 py-0.5 rounded uppercase tracking-wider">Recommended</span>
        </motion.div>

        {/* Step 1 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold">1</div>
            <h3 className="text-[13px] font-semibold">Install</h3>
          </div>
          <CopyBlock code="npm install @kyvernlabs/pulse @x402/core @x402/next @x402/evm" />
        </motion.div>

        {/* Step 2 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold">2</div>
            <h3 className="text-[13px] font-semibold">Wrap your handler</h3>
          </div>
          <CopyBlock
            code={`import { withX402 } from '@x402/next'
import { withPulse } from '@kyvernlabs/pulse'

// Your x402 handler — Pulse captures every payment
const x402Handler = withX402(handler, {
  accepts: { scheme: 'exact', price: '$0.01',
             network: 'eip155:8453', payTo: '0x...' }
}, server)

// One line — that's the entire integration
export const GET = withPulse(x402Handler, {
  apiKey: '${displayKey}'
})`}
          />
        </motion.div>

        {/* Step 3 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold">3</div>
            <h3 className="text-[13px] font-semibold">See your revenue</h3>
          </div>
          <p className="text-[13px] text-secondary leading-relaxed">
            Every x402 payment is now captured with blockchain tx hash. Head to the{" "}
            <a href="/pulse/dashboard" className="text-pulse hover:underline font-medium">dashboard</a>{" "}
            to see revenue, customers, and performance in real time.
          </p>
        </motion.div>
      </div>

      {/* Framework Templates */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.25, ease }}
        className="space-y-4"
      >
        <h3 className="text-[13px] font-semibold">Framework-specific examples</h3>
        <FrameworkTabs displayKey={displayKey} />
      </motion.div>

      {/* Divider */}
      <div className="border-t border-black/[0.04]" />

      {/* Section: MCP Server */}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="flex items-center gap-2"
        >
          <Bot className="w-4 h-4 text-pulse" />
          <h2 className="text-[15px] font-semibold tracking-tight">MCP Server — for AI Agents</h2>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-pulse-50 text-pulse-600 uppercase tracking-wider">New</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05, ease }}
          className="text-[13px] text-secondary leading-relaxed"
        >
          Let AI agents (Claude, GPT, Cursor) query your x402 analytics directly.
          The MCP server exposes your Pulse data as tools any LLM can call.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="space-y-3"
        >
          <h3 className="text-[13px] font-semibold">Install globally</h3>
          <CopyBlock code="npm install -g @kyvernlabs/mcp" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15, ease }}
          className="space-y-3"
        >
          <h3 className="text-[13px] font-semibold">Add to Claude Desktop</h3>
          <p className="text-[12px] text-tertiary mb-2">
            Add this to your <code className="text-[11px] font-mono bg-[#F0F0F0] px-1.5 py-0.5 rounded">claude_desktop_config.json</code>:
          </p>
          <CopyBlock
            code={`{
  "mcpServers": {
    "kyvernlabs-pulse": {
      "command": "npx",
      "args": ["@kyvernlabs/mcp"],
      "env": {
        "KYVERNLABS_API_KEY": "${displayKey}"
      }
    }
  }
}`}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="space-y-3"
        >
          <h3 className="text-[13px] font-semibold">Available tools</h3>
          <div className="rounded-xl border border-black/[0.06] overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-black/[0.04] bg-[#FAFAFA]">
                  <th className="text-left px-4 py-2.5 font-medium text-quaternary uppercase tracking-wider text-[10px]">Tool</th>
                  <th className="text-left px-4 py-2.5 font-medium text-quaternary uppercase tracking-wider text-[10px]">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tool: "pulse_get_stats", desc: "Revenue, calls, customers with deltas" },
                  { tool: "pulse_get_endpoints", desc: "Per-endpoint revenue and latency" },
                  { tool: "pulse_get_customers", desc: "Top paying agent wallets" },
                  { tool: "pulse_get_transactions", desc: "Recent payments with tx hashes" },
                  { tool: "pulse_get_timeseries", desc: "Revenue over time for charting" },
                  { tool: "pulse_ingest_event", desc: "Record an x402 payment event" },
                ].map((t) => (
                  <tr key={t.tool} className="border-b border-black/[0.03]/50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-pulse font-medium">{t.tool}</td>
                    <td className="px-4 py-2.5 text-secondary">{t.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25, ease }}
          className="rounded-xl bg-[#FAFAFA] border border-black/[0.04] p-4"
        >
          <h3 className="text-[13px] font-semibold mb-2">Example prompts</h3>
          <div className="space-y-1.5">
            {[
              "What's my x402 revenue this week?",
              "Which endpoints are making the most money?",
              "Show me my top 5 paying agents",
              "How many verified payments did I get today?",
            ].map((p) => (
              <p key={p} className="text-[12px] text-tertiary font-mono">&ldquo;{p}&rdquo;</p>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="border-t border-black/[0.04]" />

      {/* Section: Direct API */}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
          className="flex items-center gap-2"
        >
          <Cpu className="w-4 h-4 text-pulse" />
          <h2 className="text-[15px] font-semibold tracking-tight">Direct API</h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.05, ease }}
          className="text-[13px] text-secondary leading-relaxed"
        >
          Send events directly to the Pulse ingest API from any language or framework.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
        >
          <CopyBlock
            code={`curl -X POST https://kyvernlabs.com/api/pulse/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${displayKey}" \\
  -d '{
    "endpoint": "/api/your-service",
    "amount_usd": 0.01,
    "payer_address": "0x...",
    "tx_hash": "0x...",
    "network": "eip155:8453",
    "status": "success"
  }'`}
          />
        </motion.div>
      </div>

      {/* Divider */}
      <div className="border-t border-black/[0.04]" />

      {/* What gets tracked */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
        className="rounded-xl border border-black/[0.06] bg-white p-6 space-y-4"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}
      >
        <h3 className="text-[14px] font-semibold">What Pulse tracks per transaction</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Terminal, label: "Endpoint path", desc: "Which API was called" },
            { icon: Package, label: "Payment amount", desc: "USD value of x402 payment" },
            { icon: Code2, label: "Payer address", desc: "Agent wallet that paid" },
            { icon: Terminal, label: "Response latency", desc: "Time to process the request" },
            { icon: Package, label: "Tx hash", desc: "Blockchain transaction proof" },
            { icon: Code2, label: "Network", desc: "Which chain (Base, Ethereum, etc.)" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#FAFAFA]">
              <item.icon className="w-4 h-4 text-quaternary mt-0.5" />
              <div>
                <p className="text-[13px] font-medium">{item.label}</p>
                <p className="text-[11px] text-quaternary">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Your API Key */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
        className="rounded-xl bg-pulse-50 border border-pulse-200 p-5 space-y-2"
      >
        <h3 className="text-[14px] font-semibold text-pulse-700">Your API Key</h3>
        <p className="text-[12px] text-pulse-600">
          {isAuthenticated
            ? "This is your key. Use it in the middleware, MCP config, or API calls."
            : "Connect your wallet to get your kv_live_ API key."}
        </p>
        <CopyBlock code={displayKey} />
        {isAuthenticated && (
          <p className="text-[11px] text-pulse-500">
            Full key available on your{" "}
            <a href="/pulse/dashboard/keys" className="underline">API Keys page</a>.
          </p>
        )}
      </motion.div>

      {/* npm links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-wrap items-center gap-3 pb-4"
      >
        {[
          { label: "@kyvernlabs/pulse", href: "https://www.npmjs.com/package/@kyvernlabs/pulse" },
          { label: "@kyvernlabs/mcp", href: "https://www.npmjs.com/package/@kyvernlabs/mcp" },
          { label: "GitHub", href: "https://github.com/shariqazeem/kyvernlabs" },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-tertiary hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-black/[0.06] hover:border-black/[0.12]"
          >
            <Package className="w-3 h-3" />
            {link.label}
          </a>
        ))}
      </motion.div>
    </div>
  );
}
