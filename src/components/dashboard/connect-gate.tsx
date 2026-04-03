"use client";

import { motion } from "framer-motion";
import { Shield, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAccount, useConnect } from "wagmi";

export function ConnectGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-sm w-full text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#FAFAFA] flex items-center justify-center mx-auto mb-6">
            <Shield className="w-6 h-6 text-tertiary" />
          </div>
          <h2 className="text-[18px] font-semibold tracking-tight mb-2">
            Connect your wallet
          </h2>
          <p className="text-[13px] text-tertiary leading-relaxed mb-8">
            Sign in with your wallet to view your x402 analytics.
            Your wallet address is your identity — no email needed.
          </p>

          {!isConnected ? (
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="w-full flex items-center justify-center gap-2.5 h-11 rounded-lg border border-black/[0.08] text-[13px] font-medium hover:border-black/[0.15] hover:bg-[#FAFAFA] transition-all duration-300"
                >
                  {connector.name}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={signIn}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors duration-300"
            >
              Sign in with wallet
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <p className="mt-6 text-[11px] text-quaternary">
            We use Sign-In With Ethereum (SIWE) for cryptographic verification.
            <br />
            No passwords. No emails. Just your wallet.
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
