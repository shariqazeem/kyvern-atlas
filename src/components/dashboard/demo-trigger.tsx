"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, ExternalLink, Loader2, CheckCircle } from "lucide-react";
import { getExplorerTxUrl, truncateTxHash, getNetworkName } from "@/lib/utils";
import { PaymentToast } from "./payment-toast";

export function DemoTrigger() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    tx_hash?: string;
    network?: string;
    price?: number;
    amount?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  async function triggerDemo() {
    setLoading(true);
    setError(null);
    setResult(null);
    setShowToast(false);

    try {
      const res = await fetch("/api/x402/demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: "ETH" }),
      });
      const data = await res.json();
      if (data.success) {
        const newResult = {
          tx_hash: data.settlement?.tx_hash,
          network: data.settlement?.network,
          price: data.data?.price_usd,
          amount: 0.001,
        };
        setResult(newResult);
        setShowToast(true);
        // Auto-dismiss toast after 8 seconds
        setTimeout(() => setShowToast(false), 8000);
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        className="rounded-xl border border-black/[0.06] dark:border-gray-800 bg-white p-5 shadow-premium hover:shadow-premium-lg transition-shadow duration-300"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-pulse/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-pulse" />
              </div>
              <h3 className="text-[14px] font-semibold tracking-tight">Try a Real x402 Transaction</h3>
            </div>
            <p className="text-[12px] text-tertiary ml-9">
              Agent pays $0.001 USDC on Base Sepolia → Pulse captures it → appears below with blockchain proof.
            </p>
          </div>
          <button
            onClick={triggerDemo}
            disabled={loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-foreground text-background text-[12px] font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors duration-300 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Settling...
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
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-black/[0.04] dark:border-gray-800"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-[13px] font-medium">Payment settled on-chain</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
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
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
              {result.price && (
                <span className="text-tertiary">ETH: ${result.price.toLocaleString()}</span>
              )}
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5"
          >
            {error}
          </motion.div>
        )}
      </motion.div>

      <PaymentToast
        visible={showToast}
        txHash={result?.tx_hash}
        network={result?.network}
        amount={result?.amount}
        onDismiss={() => setShowToast(false)}
      />
    </>
  );
}
