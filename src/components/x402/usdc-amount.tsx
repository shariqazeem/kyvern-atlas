// USDC badge — appears next to every dollar amount
// Makes it immediately clear this is crypto-native revenue

import { formatCurrency } from "@/lib/utils";

interface USDCAmountProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}

export function USDCAmount({ amount, size = "md", showBadge = true }: USDCAmountProps) {
  const sizeClasses = {
    sm: "text-[11px]",
    md: "text-[13px]",
    lg: "text-[16px]",
  };

  return (
    <span className={`inline-flex items-center gap-1 font-mono-numbers font-medium ${sizeClasses[size]}`}>
      {formatCurrency(amount)}
      {showBadge && (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-semibold uppercase tracking-wider leading-none">
          USDC
        </span>
      )}
    </span>
  );
}
