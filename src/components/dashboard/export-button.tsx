"use client";

import { useState } from "react";
import { Download, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ExportButtonProps {
  type: "transactions" | "endpoints" | "customers";
  range?: string;
  compact?: boolean;
}

export function ExportButton({ type, range = "7d", compact = false }: ExportButtonProps) {
  const { plan } = useAuth();
  const [error, setError] = useState(false);

  function handleExport() {
    if (plan !== "pro") {
      setError(true);
      setTimeout(() => setError(false), 3000);
      return;
    }
    window.open(`/api/pulse/export?type=${type}&range=${range}`, "_blank");
  }

  if (compact) {
    return (
      <button
        onClick={handleExport}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-tertiary hover:text-primary transition-colors"
        title={plan !== "pro" ? "Pro feature" : `Export ${type} as CSV`}
      >
        {plan !== "pro" ? <Lock className="w-3 h-3" /> : <Download className="w-3 h-3" />}
        CSV
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-black/[0.08] dark:border-gray-700 text-[12px] font-medium text-secondary hover:text-primary hover:border-black/[0.14] transition-all duration-200"
      >
        {plan !== "pro" ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
        Export CSV
      </button>
      {error && (
        <div className="absolute right-0 top-10 z-50 bg-white border border-black/[0.08] dark:border-gray-700 rounded-lg shadow-premium-lg p-3 w-52 text-[12px]">
          <p className="font-medium text-primary mb-1">Pro Feature</p>
          <p className="text-tertiary">CSV export requires Pulse Pro.</p>
          <a href="/pulse/upgrade" className="text-pulse font-medium hover:underline mt-1 inline-block">Upgrade →</a>
        </div>
      )}
    </div>
  );
}
