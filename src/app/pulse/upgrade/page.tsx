"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Wallet,
  Copy,
  CheckCircle2,
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

type Mode = "wallet" | "manual";
type Status = "idle" | "paying" | "confirming" | "verifying" | "done";

export default function UpgradePage() {
  const { isPro, expiresAt, isConnected } = useSubscription();
  const { wallets } = useWallets();
  const { refreshSession } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"growth" | "pro">("pro");
  const [mode, setMode] = useState<Mode>("wallet");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [manualTxInput, setManualTxInput] = useState("");
  const [subResult, setSubResult] = useState<{ expires_at?: string } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

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
      // Refresh user session so the rest of the app sees Pro tier
      refreshSession();
    }
  }, [status, refreshSession]);

  function copyPayAddress() {
    navigator.clipboard.writeText(PAYTO);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  }

  // --- Mode 1: One-click payment via connected (Privy) wallet ---
  async function handleWalletUpgrade() {
    setError(null);
    setStatus("paying");

    try {
      const wallet = wallets?.[0];
      if (!wallet) {
        setError("No wallet connected. Please sign in first.");
        setStatus("idle");
        return;
      }

      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: "transfer",
        args: [PAYTO, parseUnits(PLANS[selectedPlan].amount, 6)],
      });

      setStatus("confirming");

      // Switch wallet to Base mainnet if needed
      try {
        await wallet.switchChain(8453);
      } catch {
        // May already be on Base or wallet doesn't support switching
      }

      const provider = await wallet.getEthereumProvider();
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: wallet.address,
            to: USDC_ADDRESS,
            data,
            chainId: "0x2105", // Base mainnet
          },
        ],
      })) as string;
      setTxHash(hash);

      // Verify on backend
      setStatus("verifying");
      const res = await fetch("/api/x402/verify-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      } else if (
        msg.includes("insufficient") ||
        msg.includes("exceeds balance") ||
        msg.includes("transfer amount exceeds")
      ) {
        setError(
          "Insufficient USDC balance. You need " +
            PLANS[selectedPlan].amount +
            " USDC on Base. Switch to manual mode below to pay from another wallet."
        );
      } else if (msg.includes("TransactionReceiptNotFound") || msg.includes("could not be found")) {
        setError("Transaction is still processing. Wait a moment and refresh.");
      } else if (msg.includes("network") || msg.includes("chain")) {
        setError("Please switch your wallet to Base network and try again.");
      } else {
        setError("Transaction failed. Try paying from another wallet using manual mode below.");
      }
      setStatus("idle");
    }
  }

  // --- Mode 2: Manual paste — user paid from any wallet, pastes the tx hash ---
  async function handleManualVerify() {
    setError(null);

    const trimmed = manualTxInput.trim();
    if (!trimmed.startsWith("0x") || trimmed.length !== 66) {
      setError("Invalid transaction hash. It should start with 0x and be 66 characters long.");
      return;
    }

    setStatus("verifying");
    setTxHash(trimmed);

    try {
      const res = await fetch("/api/x402/verify-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tx_hash: trimmed }),
      });
      const d = await res.json();

      if (d.success) {
        setSubResult(d);
        setStatus("done");
      } else {
        setError(d.error || "Verification failed");
        setStatus("idle");
      }
    } catch {
      setError("Network error. Try again in a moment.");
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
              x402-native USDC payment
            </div>
            <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold leading-[1.08] tracking-[-0.04em]">
              Upgrade to{" "}
              <span className="bg-gradient-to-r from-pulse-500 to-indigo-500 bg-clip-text text-transparent">
                Pulse Pro
              </span>
            </h1>
            <p className="mt-4 text-[15px] text-secondary leading-relaxed">
              Pay with USDC on Base — the same protocol your agents use.
              <br />
              From your connected wallet, or any external wallet.
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
                      : "bg-white border border-black/[0.08] text-secondary hover:bg-[var(--surface-2)]"
                  }`}
                >
                  Growth — $19/mo
                </button>
                <button
                  onClick={() => setSelectedPlan("pro")}
                  className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    selectedPlan === "pro"
                      ? "bg-foreground text-white"
                      : "bg-white border border-black/[0.08] text-secondary hover:bg-[var(--surface-2)]"
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

                {/* SUCCESS STATE */}
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
                      <p className="text-[13px] text-white/50 mt-1">
                        Your business intelligence just leveled up.
                      </p>
                    </div>
                    {subResult?.expires_at && (
                      <p className="text-[12px] text-white/50 text-center">
                        Active until {new Date(subResult.expires_at).toLocaleDateString()}
                      </p>
                    )}
                    {txHash && (
                      <div className="text-center">
                        <a
                          href={getExplorerTxUrl(txHash, "eip155:8453")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] font-mono text-pulse-300 hover:underline"
                        >
                          {truncateTxHash(txHash)} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                    <a
                      href="/pulse/dashboard"
                      className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-white text-foreground text-[13px] font-medium hover:bg-white/90 transition-colors"
                    >
                      Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {/* Mode tabs — connected wallet vs manual */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04]">
                      <button
                        onClick={() => setMode("wallet")}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[11px] font-medium transition-colors ${
                          mode === "wallet"
                            ? "bg-white text-foreground"
                            : "text-white/50 hover:text-white/80"
                        }`}
                      >
                        <Wallet className="w-3 h-3" />
                        Connected wallet
                      </button>
                      <button
                        onClick={() => setMode("manual")}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[11px] font-medium transition-colors ${
                          mode === "manual"
                            ? "bg-white text-foreground"
                            : "text-white/50 hover:text-white/80"
                        }`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        External wallet
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {mode === "wallet" ? (
                        <motion.div
                          key="wallet-mode"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3"
                        >
                          <button
                            onClick={handleWalletUpgrade}
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
                          {!isConnected && (
                            <p className="text-[11px] text-white/40 text-center">
                              Connect your wallet first from the dashboard
                            </p>
                          )}
                          {address && (
                            <p className="text-[10px] text-white/30 text-center">
                              From {address.slice(0, 6)}...{address.slice(-4)} → {PAYTO.slice(0, 6)}
                              ...{PAYTO.slice(-4)}
                            </p>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="manual-mode"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3"
                        >
                          {/* Step 1: payment instructions */}
                          <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wider text-white/40">
                                Step 1 — Send payment
                              </span>
                              <span className="text-[11px] font-semibold text-white">
                                ${PLANS[selectedPlan].amount} USDC on Base
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-[10px] font-mono text-white/70 bg-black/20 px-2 py-1.5 rounded truncate">
                                {PAYTO}
                              </code>
                              <button
                                onClick={copyPayAddress}
                                className="shrink-0 p-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
                                title="Copy address"
                              >
                                {copiedAddress ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3 text-white/60" />
                                )}
                              </button>
                            </div>
                            <p className="text-[10px] text-white/40 leading-relaxed">
                              Send exactly ${PLANS[selectedPlan].amount} USDC (or more) on Base mainnet
                              from any wallet — MetaMask, Coinbase Wallet, Phantom, hardware wallet,
                              or directly via x402 from an agent.
                            </p>
                          </div>

                          {/* Step 2: paste tx hash */}
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-wider text-white/40 block">
                              Step 2 — Paste your transaction hash
                            </label>
                            <input
                              type="text"
                              value={manualTxInput}
                              onChange={(e) => setManualTxInput(e.target.value)}
                              placeholder="0x..."
                              disabled={status === "verifying"}
                              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[12px] font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 disabled:opacity-50"
                            />
                          </div>

                          <button
                            onClick={handleManualVerify}
                            disabled={!manualTxInput || status === "verifying" || !isConnected}
                            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-white text-foreground text-[13px] font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors"
                          >
                            {status === "verifying" ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verifying on-chain...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                Verify & Activate Pro
                              </>
                            )}
                          </button>
                          {!isConnected && (
                            <p className="text-[11px] text-white/40 text-center">
                              Sign in first — your authenticated account is the one that gets
                              upgraded.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {txHash && status !== "idle" && (status as Status) !== "done" && (
                      <div className="text-center">
                        <a
                          href={getExplorerTxUrl(txHash, "eip155:8453")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-white/40 hover:text-white/60"
                        >
                          {truncateTxHash(txHash)} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}

                    {error && (
                      <div className="space-y-2">
                        <p className="text-[12px] text-red-300 bg-red-900/20 rounded-lg p-2.5">
                          {error}
                        </p>
                        <button
                          onClick={() => {
                            setError(null);
                            setStatus("idle");
                          }}
                          className="text-[12px] text-white/40 hover:text-white/60"
                        >
                          Try again
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/[0.06]">
                      <p className="text-[11px] text-white/30 text-center leading-relaxed">
                        Payment is a real USDC transfer on Base mainnet, verified directly on-chain
                        — no intermediaries, no escrow. Your authenticated account gets activated
                        regardless of which wallet pays.
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
            Pulse Pro is paid with x402 USDC — the same protocol your agents use to pay for APIs.
          </motion.p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
