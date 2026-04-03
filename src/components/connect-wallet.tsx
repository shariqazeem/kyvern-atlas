"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ChevronDown, LogOut, Copy, Check, Sparkles } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isPro, expiresAt } = useSubscription();
  const [showMenu, setShowMenu] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowConnectors(!showConnectors)}
          className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg border border-black/[0.08] text-[12px] font-medium text-secondary hover:text-primary hover:border-black/[0.15] transition-all duration-300"
        >
          <Wallet className="w-3.5 h-3.5" />
          Connect Wallet
        </button>

        <AnimatePresence>
          {showConnectors && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 w-56 bg-white rounded-xl border border-black/[0.06] shadow-premium-xl p-2 z-50"
            >
              <p className="text-[11px] text-quaternary font-medium px-2 py-1.5 uppercase tracking-wider">
                Connect with
              </p>
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector });
                    setShowConnectors(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-secondary hover:bg-[#FAFAFA] hover:text-primary transition-colors"
                >
                  <Wallet className="w-4 h-4 text-quaternary" />
                  {connector.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-black/[0.06] text-[12px] font-medium hover:border-black/[0.12] transition-all duration-300"
      >
        {isPro && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-pulse-50 text-pulse-600">
            <Sparkles className="w-2.5 h-2.5" />
            PRO
          </span>
        )}
        <span className="font-mono text-[11px] text-secondary">
          {truncateAddress(address || "")}
        </span>
        <ChevronDown className="w-3 h-3 text-quaternary" />
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-10 w-56 bg-white rounded-xl border border-black/[0.06] shadow-premium-xl p-2 z-50"
          >
            <div className="px-2.5 py-2 border-b border-black/[0.04] mb-1">
              <p className="text-[11px] text-quaternary">Connected wallet</p>
              <p className="text-[12px] font-mono text-primary mt-0.5">
                {truncateAddress(address || "", 8)}
              </p>
              {isPro && expiresAt && (
                <p className="text-[10px] text-pulse-600 mt-1">
                  Pro until {new Date(expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <button
              onClick={() => { copyAddress(); setShowMenu(false); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-secondary hover:bg-[#FAFAFA] hover:text-primary transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-quaternary" />}
              {copied ? "Copied" : "Copy address"}
            </button>

            {!isPro && (
              <a
                href="/pulse/upgrade"
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-pulse-600 hover:bg-pulse-50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade to Pro
              </a>
            )}

            <button
              onClick={() => { disconnect(); setShowMenu(false); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
