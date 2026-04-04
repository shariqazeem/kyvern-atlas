import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/header";

export const metadata: Metadata = {
  title: "Vault — x402 Wallet Management",
  description: "Monitor x402 wallets, track balances, and manage budgets.",
  robots: { index: false, follow: false },
};

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-[#0a0a0a] transition-colors duration-300">
      <DashboardHeader />
      <main className="max-w-[1100px] mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
