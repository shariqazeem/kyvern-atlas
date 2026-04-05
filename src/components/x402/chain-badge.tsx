// Chain Badge — shows which blockchain network a transaction is on

import { getNetworkName } from "@/lib/utils";

interface ChainBadgeProps {
  network: string | null;
}

const CHAIN_COLORS: Record<string, { bg: string; text: string }> = {
  "Base": { bg: "bg-blue-50", text: "text-blue-600" },
  "Base Sepolia": { bg: "bg-blue-50/50", text: "text-blue-400" },
  "Ethereum": { bg: "bg-slate-50", text: "text-slate-600" },
  "Polygon": { bg: "bg-purple-50", text: "text-purple-600" },
  "Arbitrum": { bg: "bg-sky-50", text: "text-sky-600" },
  "Optimism": { bg: "bg-red-50", text: "text-red-500" },
  "Solana": { bg: "bg-gradient-to-r from-green-50 to-purple-50", text: "text-purple-600" },
};

export function ChainBadge({ network }: ChainBadgeProps) {
  if (!network) return <span className="text-[10px] text-slate-400">—</span>;

  const name = getNetworkName(network);
  const colors = CHAIN_COLORS[name] || { bg: "bg-slate-50", text: "text-slate-500" };

  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
      {name}
    </span>
  );
}
