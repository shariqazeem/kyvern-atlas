"use client";

/**
 * Top up Atlas — surfaces Atlas's on-chain vault address so anyone can
 * keep him running with devnet USDC. Atlas's per-tx cap is $0.50 and
 * his daily ceiling is $20, so a $10 top-up sustains ~20 settlements.
 *
 * Addresses are stable (vault PDA derived from the Squads multisig
 * created at Atlas's birth on 2026-04-20). Hard-coded here to avoid
 * an extra round-trip from the public page.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Heart } from "lucide-react";
import { EASE_PREMIUM as EASE } from "@/lib/motion";

const ATLAS_VAULT_PDA = "925nkpVpSR32WhU8mKWMPC8hnMTJj2DRU9idFeRKHixf";
const ATLAS_USDC_ATA = "9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW";
const ATLAS_SQUADS = "7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP";
const FAUCET_URL = "https://faucet.circle.com/";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

interface RowProps {
  label: string;
  value: string;
  explorerHref?: string;
}

function CopyRow({ label, value, explorerHref }: RowProps) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
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
        background: "var(--surface-2, rgba(0,0,0,0.025))",
        border: "0.5px solid var(--border-subtle)",
      }}
    >
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">
          {label}
        </div>
        <div className="font-mono text-[12px] truncate" title={value}>
          {shortAddr(value)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onCopy}
          className="rounded-full p-1.5 transition"
          style={{
            background: copied ? "var(--accent-soft, #e6f4ea)" : "transparent",
            border: "0.5px solid var(--border-subtle)",
          }}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" style={{ color: "var(--success, #16a34a)" }} />
          ) : (
            <Copy className="w-3.5 h-3.5 opacity-70" />
          )}
        </button>
        {explorerHref && (
          <a
            href={explorerHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full p-1.5 transition opacity-70 hover:opacity-100"
            style={{ border: "0.5px solid var(--border-subtle)" }}
            aria-label={`Open ${label} on Solana Explorer`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function TopUpAtlas() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.18, ease: EASE }}
      className="mb-10 rounded-[18px] overflow-hidden"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border-subtle)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      <div className="px-6 pt-5 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-3.5 h-3.5" style={{ color: "var(--accent, #ef4444)" }} />
          <span className="text-[10px] uppercase tracking-wide opacity-60">
            Keep Atlas running
          </span>
        </div>
        <h3 className="text-[18px] font-semibold mb-1">
          Top up Atlas with devnet USDC
        </h3>
        <p className="text-[13px] opacity-70 mb-4 leading-relaxed">
          Atlas spends real USDC on Solana devnet every cycle — within his
          policy. When his vault runs dry, drop devnet USDC from Circle&apos;s
          faucet to keep the timeline alive. $0.50 per tx, $20 daily cap, all
          enforced on-chain.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <CopyRow
            label="Vault PDA (paste in faucet)"
            value={ATLAS_VAULT_PDA}
            explorerHref={`https://explorer.solana.com/address/${ATLAS_VAULT_PDA}?cluster=devnet`}
          />
          <CopyRow
            label="USDC token account"
            value={ATLAS_USDC_ATA}
            explorerHref={`https://explorer.solana.com/address/${ATLAS_USDC_ATA}?cluster=devnet`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={FAUCET_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition"
            style={{
              background: "var(--text)",
              color: "var(--surface)",
            }}
          >
            Open Circle USDC faucet
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={`https://explorer.solana.com/address/${ATLAS_SQUADS}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition opacity-80 hover:opacity-100"
            style={{
              border: "0.5px solid var(--border-subtle)",
            }}
          >
            Squads multisig on Explorer
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="mt-3 text-[11px] opacity-50 leading-relaxed">
          Steps: open the faucet → choose <strong>Solana Devnet</strong> + USDC →
          paste the Vault PDA → send. Atlas&apos;s next cycle picks it up within ~3
          min. Funds are devnet-only; mainnet USDC will not work.
        </div>
      </div>
    </motion.section>
  );
}
