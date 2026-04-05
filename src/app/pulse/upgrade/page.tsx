"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { useSubscription } from "@/hooks/use-subscription";
import { useWallets, usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/hooks/use-auth";
import { encodeFunctionData, parseUnits } from "viem";
import {
  Check,
  Loader2,
  ExternalLink,
  Shield,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { getExplorerTxUrl, truncateTxHash, KYVERN_PAY_TO } from "@/lib/utils";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const PAYTO = KYVERN_PAY_TO as `0x${string}`;
const PRO_AMOUNT = process.env.NEXT_PUBLIC_PRO_PRICE || "49";
const NETWORK_NAME = "Base";

const USDC_ABI = [
  {
    name: "transfer",
    type: "function" as const,
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable" as const,
  },
] as const;

const PRO_FEATURES = [
  "Unlimited events + revenue",
  "90-day data retention",
  "Up to 10 API keys",
  "Pricing benchmarks",
  "Cohort analysis",
  "Competitive intelligence",
  "Smart alerts (5 types)",
  "Webhooks (HMAC signed)",
  "CSV export",
  "Priority support",
];

export default function UpgradePage() {
  const { isPro, expiresAt, isConnected } = useSubscription();
  const { wallets } = useWallets();
  useAuth(); // ensures session is synced
  const { sendTransaction } = usePrivy();
  const [status, setStatus] = useState<"idle" | "paying" | "confirming" | "verifying" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [subResult, setSubResult] = useState<{ expires_at?: string } | null>(null);

  const address = wallets?.[0]?.address;

  // Celebration confetti when Pro activates
  useEffect(() => {
    if (status === "done") {
      const duration = 3000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [status]);

  async function handleUpgrade() {
    setError(null);
    setStatus("paying");

    try {
      const wallet = wallets?.[0];
      if (!wallet) {
        setError("No wallet connected. Please sign in first.");
        setStatus("idle");
        return;
      }

      // Encode the USDC transfer call
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: "transfer",
        args: [PAYTO, parseUnits(PRO_AMOUNT, 6)],
      });

      setStatus("confirming");

      // Use Privy's sendTransaction — handles funding UI if insufficient balance
      const receipt = await sendTransaction(
        {
          to: USDC_ADDRESS,
          data,
        },
        {
          fundWalletConfig: {
            amount: "0.001",
          },
        }
      );

      const hash = receipt.hash;
      setTxHash(hash);

      // Verify on backend
      setStatus("verifying");
      const res = await fetch("/api/x402/verify-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_hash: hash }),
      });
      const d = await res.json();

      if (d.success) {
        setSubResult(d);
        setStatus("done");
      } else {
        setError(d.error || "Verification failed");
        setStatus("idle");
      }
    } catch (err) {
      const msg = String(err);
      if (msg.includes("user rejected") || msg.includes("denied") || msg.includes("User rejected")) {
        setError("Transaction cancelled");
      } else if (msg.includes("insufficient")) {
        setError("Insufficient USDC balance");
      } else {
        setError(msg.slice(0, 120));
      }
      setStatus("idle");
    }
  }

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
              One-click USDC payment
            </div>
            <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.08] tracking-[-0.04em]">
              Upgrade to{" "}
              <span className="bg-gradient-to-r from-pulse-500 to-indigo-500 bg-clip-text text-transparent">
                Pulse Pro
              </span>
            </h1>
            <p className="mt-4 text-[15px] text-secondary leading-relaxed">
              Pay directly from your connected wallet.
              <br />
              One click. No copy-pasting. No intermediaries.
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
              <a href="/pulse/dashboard"
                className="inline-flex items-center gap-2 mt-4 h-10 px-5 rounded-lg bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 transition-colors">
                Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </motion.div>
          )}

          {/* Pricing card */}
          {!isPro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="rounded-xl border border-foreground bg-foreground text-background p-7 lg:p-8 shadow-premium-xl"
            >
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[36px] font-semibold tracking-[-0.03em] font-mono-numbers">
                  ${PRO_AMOUNT}
                </span>
                <span className="text-white/40 text-[14px]">/month USDC</span>
              </div>
              <p className="text-[13px] text-white/50 mb-6">
                {NETWORK_NAME} • 30-day access • Cancel anytime
              </p>

              <ul className="space-y-2.5 mb-8">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] text-white/75">
                    <Check className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Payment states */}
              {status === "done" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="space-y-4"
                >
                  <div className="text-center py-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                      className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3"
                    >
                      <Check className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                    <h3 className="text-[18px] font-bold text-white">Welcome to Pulse Pro!</h3>
                    <p className="text-[13px] text-white/50 mt-1">Your business intelligence just leveled up.</p>
                  </div>
                  {subResult?.expires_at && (
                    <p className="text-[12px] text-white/50">
                      Active until {new Date(subResult.expires_at).toLocaleDateString()}
                    </p>
                  )}
                  {txHash && (
                    <a href={getExplorerTxUrl(txHash, "eip155:8453")} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-mono text-pulse-300 hover:underline">
                      {truncateTxHash(txHash)} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  <a href="/pulse/dashboard"
                    className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-white text-foreground text-[13px] font-medium hover:bg-white/90 transition-colors">
                    Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleUpgrade}
                    disabled={!isConnected || status !== "idle"}
                    className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-white text-foreground text-[14px] font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors duration-300"
                  >
                    {status === "idle" && (
                      <>
                        <Zap className="w-4 h-4" />
                        Pay ${PRO_AMOUNT} USDC — Upgrade Now
                      </>
                    )}
                    {status === "paying" && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Confirm in wallet...
                      </>
                    )}
                    {status === "confirming" && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Settling on-chain...
                      </>
                    )}
                    {status === "verifying" && (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying payment...
                      </>
                    )}
                  </button>

                  {!isConnected && (
                    <p className="text-[12px] text-white/40 text-center">
                      Connect your wallet first from the dashboard
                    </p>
                  )}

                  {txHash && (status as string) !== "idle" && (status as string) !== "done" && (
                    <div className="text-center">
                      <a href={getExplorerTxUrl(txHash, "eip155:8453")} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-white/40 hover:text-white/60">
                        {truncateTxHash(txHash)} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}

                  {error && (
                    <div className="space-y-2">
                      <p className="text-[12px] text-red-300 bg-red-900/20 rounded-lg p-2.5">{error}</p>
                      <button onClick={() => { setError(null); setStatus("idle"); }}
                        className="text-[12px] text-white/40 hover:text-white/60">
                        Try again
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/[0.06]">
                    <p className="text-[11px] text-white/30 text-center">
                      USDC will be sent from your connected wallet ({address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "not connected"}) to {PAYTO.slice(0, 6)}...{PAYTO.slice(-4)} on {NETWORK_NAME}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-[12px] text-quaternary"
          >
            Payment is a direct USDC transfer on {NETWORK_NAME}. Verified on-chain.
          </motion.p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
