"use client";

/**
 * Top-up drawer — slides up from the bottom of the device home.
 *
 * Shows the device's on-chain Vault PDA + USDC token account with copy
 * buttons, deep-links into the Circle USDC faucet (devnet) and the
 * Solana SOL faucet, plus an Explorer link. The user funds without
 * leaving /app.
 *
 * Self-contained: render <TopUpDrawer open={...} ... onClose={...} />.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, X } from "lucide-react";

interface TopUpDrawerProps {
  open: boolean;
  onClose: () => void;
  vaultPda: string | null;
  usdcAta: string | null;
  network: "devnet" | "mainnet";
  solBalance: number;
  usdcBalance: number;
}

const USDC_FAUCET_URL = "https://faucet.circle.com/";
const SOL_FAUCET_URL = "https://faucet.solana.com/";

function shortAddr(addr: string | null): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function CopyAddressRow({
  label,
  value,
  explorerHref,
}: {
  label: string;
  value: string | null;
  explorerHref?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="min-w-0 flex-1">
        <div
          className="text-[10px] uppercase mb-0.5"
          style={{ color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}
        >
          {label}
        </div>
        <div className="font-mono text-[12px]" style={{ color: "rgba(255,255,255,0.85)" }}>
          {shortAddr(value)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onCopy}
          disabled={!value}
          className="rounded-full p-1.5 transition disabled:opacity-30"
          style={{
            background: copied ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" style={{ color: "#4ADE80" }} />
          ) : (
            <Copy className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.7)" }} />
          )}
        </button>
        {explorerHref && (
          <a
            href={explorerHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full p-1.5 transition"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            aria-label="Solana Explorer"
          >
            <ExternalLink className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.7)" }} />
          </a>
        )}
      </div>
    </div>
  );
}

export function TopUpDrawer({
  open,
  onClose,
  vaultPda,
  usdcAta,
  network,
  solBalance,
  usdcBalance,
}: TopUpDrawerProps) {
  // Close on ESC + lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const cluster = network === "mainnet" ? "" : "?cluster=devnet";
  const lowSol = solBalance < 0.05;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(8,11,20,0.55)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Drawer (slides up on mobile, centered modal on desktop) */}
          <motion.div
            key="drawer"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:px-4"
          >
            <div
              className="mx-auto w-full max-w-[480px] rounded-t-[20px] sm:rounded-[20px] overflow-hidden relative"
              style={{
                background:
                  "radial-gradient(120% 100% at 30% 0%, #1B2230 0%, #0E1320 55%, #080B14 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 48px -12px rgba(0,0,0,0.55)",
              }}
            >
              {/* top edge highlight */}
              <div
                className="absolute top-0 left-6 right-6 pointer-events-none"
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)",
                }}
              />
              {/* Mobile pull handle */}
              <div className="pt-2 pb-0 flex justify-center sm:hidden">
                <span
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                />
              </div>

              <div className="px-5 pt-4 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div
                      className="text-[10px] uppercase mb-1"
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        letterSpacing: "0.12em",
                      }}
                    >
                      Top up your device
                    </div>
                    <h3 className="text-[18px] font-semibold text-white">
                      Fund with Solana {network} USDC
                    </h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1.5 transition"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
                  </button>
                </div>

                {/* Balance summary */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div
                    className="rounded-[10px] px-3 py-2.5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className="text-[10px] uppercase mb-0.5"
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      USDC
                    </div>
                    <div
                      className="font-mono text-[16px]"
                      style={{ color: "white", fontVariantNumeric: "tabular-nums" }}
                    >
                      ${usdcBalance.toFixed(3)}
                    </div>
                  </div>
                  <div
                    className="rounded-[10px] px-3 py-2.5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className="text-[10px] uppercase mb-0.5"
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        letterSpacing: "0.08em",
                      }}
                    >
                      SOL (for fees)
                    </div>
                    <div
                      className="font-mono text-[16px]"
                      style={{
                        color: lowSol ? "#F59E0B" : "white",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {solBalance.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Addresses */}
                <div className="space-y-2 mb-4">
                  <CopyAddressRow
                    label="Vault address (paste in faucet)"
                    value={vaultPda}
                    explorerHref={
                      vaultPda
                        ? `https://explorer.solana.com/address/${vaultPda}${cluster}`
                        : undefined
                    }
                  />
                  <CopyAddressRow
                    label="USDC token account"
                    value={usdcAta}
                    explorerHref={
                      usdcAta
                        ? `https://explorer.solana.com/address/${usdcAta}${cluster}`
                        : undefined
                    }
                  />
                </div>

                {/* Faucet buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={USDC_FAUCET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-medium transition active:scale-[0.97]"
                    style={{
                      background: "white",
                      color: "#0A0A0A",
                    }}
                  >
                    USDC faucet
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={SOL_FAUCET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-medium transition active:scale-[0.97]"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "white",
                    }}
                  >
                    SOL faucet
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Helper text */}
                <p
                  className="mt-3 text-[11px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  On the Circle faucet, choose <strong>Solana Devnet</strong> +{" "}
                  <strong>USDC</strong>, paste the vault address above, and send. Your
                  balance updates within ~30 seconds. Devnet only — mainnet USDC will
                  not work.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
