import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CommandPalette } from "@/components/dashboard/command-palette";

export const metadata: Metadata = {
  title: "Pulse Dashboard — x402 Revenue Analytics",
  description: "Real-time x402 revenue dashboard. Track payments, endpoints, customers with on-chain verification. Connect wallet to get started.",
  robots: { index: false, follow: false }, // Dashboard is private
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-[#0a0a0a] transition-colors duration-300">
      <CommandPalette />
      <DashboardHeader />
      <div className="flex">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 p-4 md:p-6 max-w-[1200px]">
          <DashboardShell>{children}</DashboardShell>
        </main>
      </div>
    </div>
  );
}
