"use client";

import { motion } from "framer-motion";
import { Copy, Check, Terminal, Package, Code2 } from "lucide-react";
import { useState } from "react";

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-sm font-mono overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>
    </div>
  );
}

export default function SetupPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Setup</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Integrate Pulse into your x402 endpoint in under 2 minutes
        </p>
      </motion.div>

      {/* Step 1 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        className="space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-pulse text-white flex items-center justify-center text-xs font-bold">
            1
          </div>
          <h2 className="text-sm font-semibold">Install the middleware</h2>
        </div>
        <CopyBlock code="npm install @kyvernlabs/pulse @x402/core @x402/next @x402/evm" />
      </motion.div>

      {/* Step 2 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-pulse text-white flex items-center justify-center text-xs font-bold">
            2
          </div>
          <h2 className="text-sm font-semibold">Wrap your x402 handler</h2>
        </div>
        <CopyBlock
          code={`import { withX402 } from '@x402/next'
import { withPulse } from '@kyvernlabs/pulse'
import { getResourceServer, getPayToAddress, getNetwork } from './x402-server'

async function handler(req) {
  // Your business logic — runs AFTER payment settles
  return NextResponse.json({ data: 'premium content' })
}

// Layer 1: x402 payment gate
const x402Handler = withX402(handler, {
  accepts: { scheme: 'exact', price: '$0.01',
             network: getNetwork(), payTo: getPayToAddress() }
}, getResourceServer())

// Layer 2: Pulse analytics — captures every payment
export const GET = withPulse(x402Handler, {
  apiKey: 'kv_your_api_key_here'
})`}
        />
      </motion.div>

      {/* Step 3 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-pulse text-white flex items-center justify-center text-xs font-bold">
            3
          </div>
          <h2 className="text-sm font-semibold">View your analytics</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Every x402 payment that flows through your endpoint is now tracked. Head to
          the{" "}
          <a href="/pulse/dashboard" className="text-pulse hover:underline font-medium">
            dashboard
          </a>{" "}
          to see revenue, customers, and performance in real time.
        </p>
      </motion.div>

      {/* What gets tracked */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-white rounded-lg border border-border p-5 shadow-premium space-y-4"
      >
        <h3 className="text-sm font-semibold">What Pulse tracks per transaction</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Terminal, label: "Endpoint path", desc: "Which API was called" },
            { icon: Package, label: "Payment amount", desc: "USD value of x402 payment" },
            { icon: Code2, label: "Payer address", desc: "Agent wallet that paid" },
            { icon: Terminal, label: "Response latency", desc: "Time to process the request" },
            { icon: Package, label: "Tx hash", desc: "Blockchain transaction proof" },
            { icon: Code2, label: "Network", desc: "Which chain (Base, Ethereum, etc.)" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <item.icon className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* API Key */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="bg-pulse-50 border border-pulse-200 rounded-lg p-5 space-y-2"
      >
        <h3 className="text-sm font-semibold text-pulse-700">Your API Key</h3>
        <p className="text-xs text-pulse-600">
          Use this key in your middleware configuration. Keep it secret.
        </p>
        <CopyBlock code="kv_demo_test_key" />
      </motion.div>
    </div>
  );
}
