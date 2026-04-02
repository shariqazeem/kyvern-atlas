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
const NETWORKS: Record<string, { name: string; explorer: string }> = {
  "eip155:84532": { name: "Base Sepolia", explorer: "https://sepolia.basescan.org" },
  "eip155:8453": { name: "Base", explorer: "https://basescan.org" },
  "eip155:1": { name: "Ethereum", explorer: "https://etherscan.io" },
  "eip155:137": { name: "Polygon", explorer: "https://polygonscan.com" },
};

export function getNetworkName(network?: string): string {
  if (!network) return "Unknown";
  return NETWORKS[network]?.name || network;
}

export function getExplorerTxUrl(txHash: string, network?: string): string {
  const base = network ? NETWORKS[network]?.explorer : "https://sepolia.basescan.org";
  return `${base || "https://sepolia.basescan.org"}/tx/${txHash}`;
}

export function truncateTxHash(hash: string, chars = 8): string {
  return `${hash.slice(0, chars)}...${hash.slice(-6)}`;
}
