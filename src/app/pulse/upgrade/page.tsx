"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import {
  Zap,
  Check,
  Loader2,
  ExternalLink,
  Shield,
  ArrowRight,
} from "lucide-react";
import { getExplorerTxUrl, truncateTxHash } from "@/lib/utils";
import { PaymentToast } from "@/components/dashboard/payment-toast";

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    tx_hash?: string;
    network?: string;
    expires_at?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use the demo-call pattern — call the upgrade endpoint via x402
      const res = await fetch("/api/x402/demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _upgrade: true }),
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          success: true,
          tx_hash: data.settlement?.tx_hash,
          network: data.settlement?.network,
          expires_at: data.data?.expires_at,
        });
        setShowToast(true);
        setTimeout(() => setShowToast(false), 10000);
      } else {
        setError(data.error || "Payment failed. Please try again.");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const PRO_FEATURES = [
    "Unlimited endpoints",
    "90-day analytics history",
    "Full revenue dashboard",
    "Unlimited events/day",
    "Pricing benchmarks",
    "Webhooks + email alerts",
    "CSV export + tax reports",
    "Priority support",
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="relative pt-36 pb-24 lg:pt-44 lg:pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-fine-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-radial from-pulse-100/40 via-transparent to-transparent rounded-full blur-[80px]" />

        <div className="relative max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-pulse/20 bg-pulse-50 text-[11px] tracking-wide font-medium text-pulse-600 mb-6">
              <Shield className="w-3 h-3" />
              Paid with x402 — USDC on Base
            </div>
            <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.08] tracking-[-0.04em]">
              Upgrade to{" "}
              <span className="bg-gradient-to-r from-pulse-500 to-indigo-500 bg-clip-text text-transparent">
                Pulse Pro
              </span>
            </h1>
            <p className="mt-4 text-[15px] text-secondary leading-relaxed">
              Full analytics, unlimited endpoints, smart alerts.
              <br />
              Pay with USDC — the same way your agents pay you.
            </p>
          </motion.div>

          {/* Pricing card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-xl border border-foreground bg-foreground text-background p-7 lg:p-8 shadow-premium-xl"
          >
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-semibold tracking-[-0.03em] font-mono-numbers">
                $49
              </span>
              <span className="text-white/40 text-[14px]">/month</span>
            </div>
            <p className="text-[13px] text-white/50 mb-6">
              USDC on Base • 30-day access • Cancel anytime
            </p>

            <ul className="space-y-2.5 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/75">
                  <Check className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {result?.success ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-5 h-5" />
                  <span className="text-[14px] font-semibold">Pro activated</span>
                </div>
                {result.expires_at && (
                  <p className="text-[12px] text-white/50">
                    Active until {new Date(result.expires_at).toLocaleDateString()}
                  </p>
                )}
                {result.tx_hash && (
                  <a
                    href={getExplorerTxUrl(result.tx_hash, result.network)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-mono text-pulse-300 hover:underline"
                  >
                    {truncateTxHash(result.tx_hash)}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                <a
                  href="/pulse/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-white text-foreground text-[13px] font-medium hover:bg-white/90 transition-colors duration-300"
                >
                  Open Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-white text-foreground text-[13px] font-medium hover:bg-white/90 disabled:opacity-50 transition-colors duration-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing payment...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Pay $49 USDC — Upgrade Now
                  </>
                )}
              </button>
            )}

            {error && (
              <p className="mt-3 text-[12px] text-red-300 bg-red-900/20 rounded-lg p-2.5">
                {error}
              </p>
            )}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-[12px] text-quaternary"
          >
            Payment settles on Base Sepolia via x402 protocol.
            <br />
            First 50 waitlist members get 3 months free.
          </motion.p>
        </div>
      </section>

      <Footer />

      <PaymentToast
        visible={showToast}
        txHash={result?.tx_hash}
        network={result?.network}
        amount={49}
        onDismiss={() => setShowToast(false)}
      />
    </div>
  );
}
