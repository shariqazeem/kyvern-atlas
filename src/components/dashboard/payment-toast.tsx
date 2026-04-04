"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ExternalLink } from "lucide-react";
import { getExplorerTxUrl, truncateTxHash, getNetworkName } from "@/lib/utils";

interface PaymentToastProps {
  visible: boolean;
  txHash?: string;
  network?: string;
  amount?: number;
  onDismiss: () => void;
}

export function PaymentToast({ visible, txHash, network, amount, onDismiss }: PaymentToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-black/[0.08] dark:border-gray-700 shadow-premium-xl p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-primary">
                  Payment settled on-chain
                </p>
                <p className="text-[12px] text-tertiary mt-0.5">
                  {amount !== undefined ? `$${amount.toFixed(3)} USDC` : "Payment received"} on {getNetworkName(network)}
                </p>
                {txHash && (
                  <a
                    href={getExplorerTxUrl(txHash, network)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] font-mono text-pulse hover:underline"
                  >
                    {truncateTxHash(txHash)}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <button
                onClick={onDismiss}
                className="text-quaternary hover:text-primary transition-colors text-[18px] leading-none -mt-1"
              >
                &times;
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
