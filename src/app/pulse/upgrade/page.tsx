"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { useSubscription } from "@/hooks/use-subscription";
import { useWallets } from "@privy-io/react-auth";
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
  CreditCard,
} from "lucide-react";
import { getExplorerTxUrl, truncateTxHash, KYVERN_PAY_TO } from "@/lib/utils";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const PAYTO = KYVERN_PAY_TO as `0x${string}`;
const NETWORK_NAME = "Base";

const PLANS = {
  growth: { amount: "19", label: "Growth", period: "30-day access" },
  pro: { amount: "49", label: "Pro", period: "30-day access" },
} as const;

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

const GROWTH_FEATURES = [
  "50,000 events/day",
  "$5,000/month revenue tracked",
  "30-day data retention",
  "3 API keys",
  "10 alerts (all types)",
  "Pricing benchmarks",
  "CSV export",
];

const PRO_FEATURES = [
  "Unlimited events + revenue",
  "90-day data retention",
  "Up to 10 API keys",
  "Cohort analysis + intelligence",
  "Slack/Discord alerts",
  "Webhooks (HMAC signed)",
  "A/B pricing experiments",
  "Historical data import",
  "Priority support",
];

export default function UpgradePage() {
  const { isPro, expiresAt, isConnected } = useSubscription();
  const { wallets } = useWallets();
  useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"growth" | "pro">("pro");
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
        args: [PAYTO, parseUnits(PLANS[selectedPlan].amount, 6)],
      });

      setStatus("confirming");

      // Switch wallet to Base mainnet if needed
      try {
        await wallet.switchChain(8453); // Base mainnet chain ID
      } catch {
        // May already be on Base or wallet doesn't support switching
      }

      // Use wallet provider directly
      const provider = await wallet.getEthereumProvider();
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: wallet.address,
          to: USDC_ADDRESS,
          data,
          chainId: "0x2105", // Base mainnet (8453 in hex)
        }],
      }) as string;
      setTxHash(hash);

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
        setError("Transaction cancelled.");
      } else if (msg.includes("insufficient") || msg.includes("exceeds balance") || msg.includes("transfer amount exceeds")) {
        setError("Insufficient USDC balance. You need " + PLANS[selectedPlan].amount + " USDC on Base to upgrade.");
      } else if (msg.includes("TransactionReceiptNotFound") || msg.includes("could not be found")) {
        setError("Transaction is still processing. Please wait a moment and check your dashboard — it may have gone through.");
      } else if (msg.includes("network") || msg.includes("chain")) {
        setError("Please switch your wallet to Base network and try again.");
      } else {
        setError("Transaction failed. Please ensure you have " + PLANS[selectedPlan].amount + " USDC on Base mainnet.");
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

          {/* Plan selector + pricing card */}
          {!isPro && (
            <>
            {/* Plan tabs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              <button
                onClick={() => setSelectedPlan("growth")}
                className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  selectedPlan === "growth"
                    ? "bg-foreground text-white"
                    : "bg-white border border-black/[0.08] text-secondary hover:bg-slate-50"
                }`}
              >
                Growth — $19/mo
              </button>
              <button
                onClick={() => setSelectedPlan("pro")}
                className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  selectedPlan === "pro"
                    ? "bg-foreground text-white"
                    : "bg-white border border-black/[0.08] text-secondary hover:bg-slate-50"
                }`}
              >
                Pro — $49/mo
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="rounded-xl border border-foreground bg-foreground text-background p-7 lg:p-8 shadow-premium-xl"
            >
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-[36px] font-semibold tracking-[-0.03em] font-mono-numbers">
                  ${PLANS[selectedPlan].amount}
                </span>
                <span className="text-white/40 text-[14px]">/month USDC</span>
              </div>
              <p className="text-[13px] text-white/50 mb-6">
                {NETWORK_NAME} • {PLANS[selectedPlan].period} • Cancel anytime
              </p>

              <ul className="space-y-2.5 mb-8">
                {(selectedPlan === "pro" ? PRO_FEATURES : GROWTH_FEATURES).map((f) => (
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
                        Pay ${PLANS[selectedPlan].amount} USDC — Upgrade Now
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

                  {/* Buy USDC with credit card option */}
                  {isConnected && status === "idle" && address && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-[11px] text-white/30 uppercase tracking-wider">or need USDC?</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>
                      <a
                        href={`https://buy.moonpay.com?currencyCode=usdc_base&walletAddress=${address}&baseCurrencyAmount=${PLANS[selectedPlan].amount}&baseCurrencyCode=usd`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-white/20 text-white/70 text-[13px] font-medium hover:bg-white/5 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Buy ${PLANS[selectedPlan].amount} USDC with Card
                      </a>
                      <p className="text-[10px] text-white/30 text-center">
                        Opens MoonPay. Buy USDC on Base with Visa, Mastercard, or Apple Pay. Then come back and pay above.
                      </p>
                    </>
                  )}

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
          </>
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
