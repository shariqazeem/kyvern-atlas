// On-Chain Verified Badge
// Green "Verified" with explorer link for real transactions
// Gray "Simulated" for demo/seed data (no broken explorer links)

import { Check } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/utils";

interface OnChainBadgeProps {
  txHash: string | null;
  network?: string | null;
  source?: string | null;
}

export function OnChainBadge({ txHash, network, source }: OnChainBadgeProps) {
  if (!txHash) {
    return (
      <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
        Unverified
      </span>
    );
  }

  // Simulated/seed/demo transactions get a gray badge with no explorer link
  const isSimulated = source === "simulated" || source === "seed" || source === "demo";

  if (isSimulated) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
        Simulated
      </span>
    );
  }

  // Real transactions: green badge linking to block explorer
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
