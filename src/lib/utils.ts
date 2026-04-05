import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  // Show more decimals for micropayments (< $0.01)
  const decimals = amount > 0 && amount < 0.01 ? 4 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

export function truncateAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

// x402 network helpers
const NETWORKS: Record<string, { name: string; explorer: string; txPath?: string }> = {
  // EVM chains
  "eip155:8453": { name: "Base", explorer: "https://basescan.org" },
  "eip155:1": { name: "Ethereum", explorer: "https://etherscan.io" },
  "eip155:137": { name: "Polygon", explorer: "https://polygonscan.com" },
  "eip155:42161": { name: "Arbitrum", explorer: "https://arbiscan.io" },
  "eip155:10": { name: "Optimism", explorer: "https://optimistic.etherscan.io" },
  "eip155:43114": { name: "Avalanche", explorer: "https://snowtrace.io" },
  // Solana
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": { name: "Solana", explorer: "https://solscan.io", txPath: "/tx/" },
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1": { name: "Solana Devnet", explorer: "https://solscan.io", txPath: "/tx/?cluster=devnet" },
  // Stellar
  "stellar:pubnet": { name: "Stellar", explorer: "https://stellarchain.io", txPath: "/transactions/" },
};

export function getNetworkName(network?: string): string {
  if (!network) return "Unknown";
  return NETWORKS[network]?.name || network;
}

// Shared pay-to address constant
export const KYVERN_PAY_TO = process.env.NEXT_PUBLIC_PAY_TO_ADDRESS || "0x55c3aBb091D1a43C3872718b3b8B3AE8c20B592E";

export function getExplorerTxUrl(txHash: string, network?: string): string {
  const net = network ? NETWORKS[network] : null;
  const explorer = net?.explorer || "https://basescan.org";
  const txPath = net?.txPath || "/tx/";
  return `${explorer}${txPath}${txHash}`;
}

export function truncateTxHash(hash: string, chars = 8): string {
  return `${hash.slice(0, chars)}...${hash.slice(-6)}`;
}
