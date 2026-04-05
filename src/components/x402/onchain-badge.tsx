// On-Chain Verified Badge — green checkmark with tooltip
// Clicking opens the tx on BaseScan

import { Check } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/utils";

interface OnChainBadgeProps {
  txHash: string | null;
  network?: string | null;
}

export function OnChainBadge({ txHash, network }: OnChainBadgeProps) {
  if (!txHash) {
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
        Unverified
      </span>
    );
  }

  const url = getExplorerTxUrl(txHash, network || undefined);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
      title={`Verified on-chain: ${txHash.slice(0, 16)}...`}
    >
      <Check className="w-2.5 h-2.5" />
      Verified
    </a>
  );
}
