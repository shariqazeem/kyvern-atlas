"use client";

/**
 * Top up Atlas — manual fail-safe footer on /atlas (Section 1 spec).
 *
 * Lives at the bottom of the dark observatory. Even after the auto-drip
 * ships in Sprint 2, this stays — it's the public path for anyone in the
 * world to keep Atlas running with devnet USDC.
 *
 * Three layers of redundancy on the one thing that cannot fail during
 * judging: auto-drip in the runner, a hidden admin endpoint on the
 * founder's phone, and this public button. Don't remove this.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Heart } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const ATLAS_VAULT_PDA = "925nkpVpSR32WhU8mKWMPC8hnMTJj2DRU9idFeRKHixf";
const ATLAS_USDC_ATA = "9RnS21ieUZ2b1UTxYhrvT16n5Vedq74Ppcymhmqq7hAW";
const ATLAS_SQUADS = "7fTtzef3pnzL4MKyLkYL37rdyTR6CsT66x62bThnWtsP";
const FAUCET_URL = "https://faucet.circle.com/";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function CopyRow({
  label,
  value,
  explorerHref,
}: {
  label: string;
  value: string;
  explorerHref?: string;
}) {
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
        <div
          className="font-mono text-[12px] truncate"
          style={{ color: "rgba(255,255,255,0.85)" }}
          title={value}
        >
          {shortAddr(value)}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onCopy}
          className="rounded-full p-1.5 transition"
          style={{
            background: copied ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" style={{ color: "#4ADE80" }} />
          ) : (
            <Copy
              className="w-3.5 h-3.5"
              style={{ color: "rgba(255,255,255,0.7)" }}
            />
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
            aria-label={`Open ${label} on Solana Explorer`}
          >
            <ExternalLink
              className="w-3.5 h-3.5"
              style={{ color: "rgba(255,255,255,0.7)" }}
            />
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
      transition={{ duration: 0.55, ease: EASE }}
      className="rounded-[18px] overflow-hidden relative"
      style={{
        background:
          "radial-gradient(120% 100% at 50% 0%, rgba(134,239,172,0.04) 0%, rgba(255,255,255,0.02) 60%)",
        border: "1px solid rgba(134,239,172,0.18)",
      }}
    >
      <div
        className="absolute top-0 left-6 right-6 pointer-events-none"
        style={{
          height: 1,
          background:
            "linear-gradient(to right, transparent, rgba(134,239,172,0.4), transparent)",
        }}
      />

      <div className="px-6 pt-5 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-3.5 h-3.5" style={{ color: "#FCA5A5" }} />
          <span
            className="font-mono uppercase"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "11px",
              letterSpacing: "0.12em",
            }}
          >
            Keep Atlas running
          </span>
        </div>
        <h3 className="text-[18px] font-semibold mb-1 text-white">
          Sponsor Atlas with devnet USDC
        </h3>
        <p
          className="text-[13px] mb-4 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Atlas spends real USDC every cycle — within his on-chain budget.
          When his vault runs low, drop devnet USDC from Circle&apos;s faucet
          to keep the timeline alive. $0.50 per tx, $20 daily cap, all
          enforced by the budget program.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          <CopyRow
            label="Vault address (paste in faucet)"
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
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition active:scale-[0.97]"
            style={{ background: "white", color: "#0A0A0A" }}
          >
            Open Circle USDC faucet
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={`https://explorer.solana.com/address/${ATLAS_SQUADS}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            Squads multisig on Explorer
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div
          className="mt-3 text-[11px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Steps: open the faucet → choose <strong>Solana Devnet</strong> +
          USDC → paste the vault address → send. Atlas&apos;s next cycle picks
          it up within ~3 min. Devnet only; mainnet USDC will not work.
        </div>
      </div>
    </motion.section>
  );
}
