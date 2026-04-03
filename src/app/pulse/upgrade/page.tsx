"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ConnectWallet } from "@/components/connect-wallet";
import { useSubscription } from "@/hooks/use-subscription";
import {
  Zap,
  Check,
  Loader2,
  ExternalLink,
  Shield,
  ArrowRight,
  Copy,
  Wallet,
  Sparkles,
} from "lucide-react";
import { getExplorerTxUrl, truncateTxHash } from "@/lib/utils";

const PAYTO = "0x55c3aBb091D1a43C3872718b3b8B3AE8c20B592E";
const AMOUNT = "49";
const NETWORK_NAME = "Base Sepolia";
const USDC_CONTRACT = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export default function UpgradePage() {
  const { isPro, expiresAt, isConnected } = useSubscription();
  const [step, setStep] = useState<"pay" | "verify" | "done">("pay");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [result, setResult] = useState<{
    subscription_id?: string;
    expires_at?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function verifyPayment() {
    if (!txHash.startsWith("0x") || txHash.length < 10) {
      setError("Enter a valid transaction hash");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/x402/verify-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_hash: txHash }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setStep("done");
      } else {
        setError(data.error || "Verification failed");
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
              Pay with USDC on {NETWORK_NAME}
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
              Pay with your own wallet — no intermediaries.
            </p>
          </motion.div>

          {/* Already Pro */}
          {isPro && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center mb-6"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span className="text-[15px] font-semibold text-emerald-800">You&apos;re on Pulse Pro</span>
              </div>
              {expiresAt && (
                <p className="text-[13px] text-emerald-600">
                  Active until {new Date(expiresAt).toLocaleDateString()}
                </p>
              )}
              <a
                href="/pulse/dashboard"
                className="inline-flex items-center gap-2 mt-4 h-10 px-5 rounded-lg bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 transition-colors"
              >
                Open Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </motion.div>
          )}

          {/* Connect wallet prompt */}
          {!isConnected && !isPro && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-5 text-center mb-6"
            >
              <p className="text-[13px] text-secondary mb-3">
                Connect your wallet to check Pro status and pay
              </p>
              <ConnectWallet />
            </motion.div>
          )}

          {/* Pricing card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-xl border border-foreground bg-foreground text-background p-7 lg:p-8 shadow-premium-xl"
          >
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-semibold tracking-[-0.03em] font-mono-numbers">
                ${AMOUNT}
              </span>
              <span className="text-white/40 text-[14px]">/month</span>
            </div>
            <p className="text-[13px] text-white/50 mb-6">
              USDC on {NETWORK_NAME} • 30-day access • Cancel anytime
            </p>

            <ul className="space-y-2.5 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/75">
                  <Check className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {/* Step 1: Payment instructions */}
            {step === "pay" && (
              <div className="space-y-4">
                <div className="bg-white/[0.06] rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-white/60" />
                    <span className="text-[13px] font-medium text-white/80">
                      Send from your wallet
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/50">Amount</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-mono font-medium">{AMOUNT} USDC</span>
                      <button
                        onClick={() => copyToClipboard(AMOUNT, "amount")}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        {copied === "amount" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-white/40" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* To address */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/50">To</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-mono text-white/80">{PAYTO.slice(0, 10)}...{PAYTO.slice(-6)}</span>
                      <button
                        onClick={() => copyToClipboard(PAYTO, "address")}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        {copied === "address" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-white/40" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Network */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/50">Network</span>
                    <span className="text-[12px] font-medium text-blue-300">{NETWORK_NAME}</span>
                  </div>

                  {/* Token */}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/50">Token (USDC)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-white/60">{USDC_CONTRACT.slice(0, 8)}...{USDC_CONTRACT.slice(-6)}</span>
                      <button
                        onClick={() => copyToClipboard(USDC_CONTRACT, "token")}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        {copied === "token" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-white/40" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep("verify")}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-white text-foreground text-[13px] font-medium hover:bg-white/90 transition-colors duration-300"
                >
                  <Zap className="w-4 h-4" />
                  I&apos;ve sent the payment
                </button>
              </div>
            )}

            {/* Step 2: Paste tx hash */}
            {step === "verify" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] text-white/50 mb-2">
                    Paste your transaction hash
                  </label>
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x..."
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.08] border border-white/[0.1] text-[13px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  />
                </div>

                <button
                  onClick={verifyPayment}
                  disabled={loading || !txHash}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-white text-foreground text-[13px] font-medium hover:bg-white/90 disabled:opacity-50 transition-colors duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Verify &amp; Activate Pro
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep("pay")}
                  className="w-full text-[12px] text-white/40 hover:text-white/60 transition-colors"
                >
                  ← Back to payment details
                </button>

                {error && (
                  <p className="text-[12px] text-red-300 bg-red-900/20 rounded-lg p-2.5">
                    {error}
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Done */}
            {step === "done" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="w-5 h-5" />
                  <span className="text-[14px] font-semibold">Pro activated</span>
                </div>
                {result?.expires_at && (
                  <p className="text-[12px] text-white/50">
                    Active until {new Date(result.expires_at).toLocaleDateString()}
                  </p>
                )}
                {txHash && (
                  <a
                    href={getExplorerTxUrl(txHash, "eip155:84532")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-mono text-pulse-300 hover:underline"
                  >
                    {truncateTxHash(txHash)}
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
            )}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-[12px] text-quaternary"
          >
            Send USDC on {NETWORK_NAME} from MetaMask, Coinbase Wallet, or any wallet.
            <br />
            First 50 waitlist members get 3 months free.
          </motion.p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
