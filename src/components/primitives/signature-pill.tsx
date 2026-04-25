"use client";

/**
 * SignaturePill — the most-used component on the site.
 * Mono, truncated, click → Explorer. Hover shows tooltip.
 */

import { useState } from "react";

interface SignaturePillProps {
  signature: string;
  network?: "devnet" | "mainnet";
}

export function SignaturePill({
  signature,
  network = "devnet",
}: SignaturePillProps) {
  const [clicked, setClicked] = useState(false);

  const truncated = signature.length > 12
    ? `${signature.slice(0, 5)}...${signature.slice(-4)}`
    : signature;

  const explorerUrl = signature.startsWith("stub_") || signature.startsWith("greet_") || signature.startsWith("bounty_") || signature.startsWith("intel_")
    ? null
    : `https://explorer.solana.com/tx/${signature}?cluster=${network}`;

  const handleClick = () => {
    if (explorerUrl) {
      setClicked(true);
      window.open(explorerUrl, "_blank");
      setTimeout(() => setClicked(false), 1000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!explorerUrl}
      className="inline-flex items-center h-[22px] px-[8px] rounded-[6px] font-mono text-[11px] transition-all"
      style={{
        background: clicked ? "#E5E7EB" : "#F5F5F5",
        color: explorerUrl ? "#6B6B6B" : "#9B9B9B",
        cursor: explorerUrl ? "pointer" : "default",
      }}
      title={signature}
    >
      {truncated}
      {explorerUrl && (
        <svg className="w-[10px] h-[10px] ml-1 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      )}
    </button>
  );
}
