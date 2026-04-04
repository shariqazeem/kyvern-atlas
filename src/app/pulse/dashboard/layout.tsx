import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";

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
    <div className="min-h-screen bg-gray-50/80 dark:bg-gray-950 transition-colors duration-300">
      <DashboardHeader />
      <div className="flex">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 p-4 md:p-6 max-w-[1200px]">{children}</main>
      </div>
    </div>
  );
}
