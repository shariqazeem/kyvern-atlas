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
  "Solana": { bg: "bg-violet-50", text: "text-violet-600" },
  "Solana Devnet": { bg: "bg-violet-50/50", text: "text-violet-400" },
  "Stellar": { bg: "bg-slate-900", text: "text-white" },
  "Stellar Testnet": { bg: "bg-slate-700", text: "text-slate-100" },
  "Avalanche": { bg: "bg-red-50", text: "text-red-600" },
};

export function ChainBadge({ network }: ChainBadgeProps) {
  if (!network) return <span className="text-[10px] text-slate-400">—</span>;

  const name = getNetworkName(network);
  const colors = CHAIN_COLORS[name] || { bg: "bg-slate-50", text: "text-slate-500" };

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
      {(name === "Stellar" || name === "Stellar Testnet") && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
          <path d="M12.3 1.9c-5.5.3-9.9 4.8-10.2 10.3-.1 1.5.1 3 .6 4.4l1.7-.8c-.4-1.1-.5-2.3-.5-3.5C4 7.2 8 3.1 13.1 3c3.4 0 6.5 1.9 8.1 4.9l1.6-.8C20.9 3.8 16.8 1.6 12.3 1.9z"/>
          <path d="M21.9 7.5L4.6 15.4l-.8-1.6L21.1 5.9zM22.7 10.3L5.4 18.2l-.8-1.7 17.3-7.9zM21.5 14.5c-.3 5.1-4.6 9.1-9.8 9.2-1.7 0-3.3-.4-4.8-1.2l-.8 1.7c1.7.9 3.6 1.4 5.6 1.3 6.1-.2 10.9-5.2 10.9-11.3 0-.6 0-1.2-.1-1.7l-1.7.8c.1.4.1.8.1 1.2h.6z"/>
        </svg>
      )}
      {name}
    </span>
  );
}
