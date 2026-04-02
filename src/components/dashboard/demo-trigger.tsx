"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, ExternalLink, Loader2, CheckCircle } from "lucide-react";
import { getExplorerTxUrl, truncateTxHash, getNetworkName } from "@/lib/utils";

export function DemoTrigger() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tx_hash?: string;
    network?: string;
    price?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function triggerDemo() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/x402/demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: "ETH" }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          tx_hash: data.settlement?.tx_hash,
          network: data.settlement?.network,
          price: data.data?.price_usd,
        });
      } else {
        setError(data.error || "Payment failed");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-gradient-to-r from-pulse-50 to-white rounded-lg border border-pulse-200 p-5 shadow-premium"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Try a Real x402 Transaction</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            An agent pays $0.001 USDC on Base Sepolia to call our /api/x402/price endpoint. Pulse captures it.
          </p>
        </div>
        <button
          onClick={triggerDemo}
          disabled={loading}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-pulse text-white text-sm font-medium hover:bg-pulse-600 disabled:opacity-50 ease-premium transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Paying...
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              Make Live Payment
            </>
          )}
        </button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 pt-4 border-t border-pulse-200"
        >
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="font-medium">Payment settled on-chain</span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            {result.network && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                {getNetworkName(result.network)}
              </span>
            )}
            {result.tx_hash && (
              <a
                href={getExplorerTxUrl(result.tx_hash, result.network)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-pulse hover:underline"
              >
                {truncateTxHash(result.tx_hash)}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {result.price && (
              <span>ETH: ${result.price.toLocaleString()}</span>
            )}
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-xs text-red-600 bg-red-50 rounded-md p-2"
        >
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
