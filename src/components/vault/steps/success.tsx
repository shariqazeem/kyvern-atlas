"use client";

/* ════════════════════════════════════════════════════════════════════
   Step 5 — Success
   · Big green check with confetti-lite (no library, pure framer particles)
   · Agent key card (copyable, masked)
   · Copy-ready SDK snippet
   · Two next-step CTAs
   ════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Check, Copy, ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { VaultConfig } from "../types";
import { CrossConversionBanner } from "@/components/app/journey-checklist";

const ease = [0.25, 0.1, 0.25, 1] as const;

export interface SuccessStepProps {
  config: VaultConfig;
  agentKey: string;
  vaultId: string;
  squads?: {
    mode: "real" | "stub";
    smartAccountAddress: string;
    smartAccountExplorerUrl: string;
    vaultPdaExplorerUrl: string;
    spendingLimitExplorerUrl: string;
    createSignature: string;
  };
}

function shorten(addr: string): string {
  if (!addr) return "";
  if (addr.length < 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function SuccessStep({ config, agentKey, vaultId, squads }: SuccessStepProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const snippet = useMemo(
    () =>
      `import { Vault } from "@kyvernlabs/sdk"

const vault = new Vault({ agentKey: process.env.KYVERNLABS_AGENT_KEY })

await vault.pay({
  merchant: "${config.allowedMerchants[0] ?? "weather-api.example.com"}",
  amount: ${Math.min(config.perTxMax, 0.5)},
  memo: "fetch forecast"
})`,
    [config],
  );

  const masked = useMemo(() => {
    if (agentKey.length < 14) return agentKey;
    return `${agentKey.slice(0, 7)}…${agentKey.slice(-4)}`;
  }, [agentKey]);

  const copy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8">
      {/* Check hero */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-20 h-20 rounded-[22px] flex items-center justify-center mb-5"
          style={{
            background: "var(--success)",
            boxShadow:
              "0 4px 8px rgba(34,197,94,0.2), 0 20px 60px rgba(34,197,94,0.28)",
          }}
        >
          {/* Radiating rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-[22px]"
              style={{ border: "1px solid rgba(34,197,94,0.4)" }}
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.6 + i * 0.25, opacity: [0, 0.6, 0] }}
              transition={{
                duration: 1.6,
                delay: 0.3 + i * 0.2,
                repeat: Infinity,
                repeatDelay: 1.2,
                ease,
              }}
            />
          ))}
          <Check className="relative w-10 h-10 text-white" strokeWidth={2.5} />
        </motion.div>
      </div>

      {/* Vault ID */}
      <div
        className="p-5 rounded-[16px] flex items-center gap-4"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <div
          className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[22px] shrink-0"
          style={{ background: "var(--surface-2)" }}
        >
          {config.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[11px] uppercase tracking-[0.08em] font-medium mb-0.5"
            style={{ color: "var(--text-quaternary)" }}
          >
            Agent ID
          </div>
          <div
            className="text-[13.5px] font-mono-numbers truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {vaultId}
          </div>
        </div>
      </div>

      {/* On-chain proof — surfaces Squads addresses with Explorer links so
          the user can verify on-chain immediately, without leaving the flow. */}
      {squads && (
        <div
          className="p-5 rounded-[16px]"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: squads.mode === "real" ? "var(--success)" : "var(--surface-2)",
              }}
            >
              <ShieldCheck
                className="w-3 h-3"
                style={{ color: squads.mode === "real" ? "white" : "var(--text-tertiary)" }}
              />
            </div>
            <div>
              <div
                className="text-[11px] uppercase tracking-[0.08em] font-medium"
                style={{ color: "var(--text-quaternary)" }}
              >
                On-chain proof · {squads.mode === "real" ? "Live on Solana" : "Stub mode"}
              </div>
              <div className="text-[13.5px] font-medium" style={{ color: "var(--text-primary)" }}>
                {squads.mode === "real"
                  ? "Verified by Squads v4"
                  : "Set KYVERN_SQUADS_MODE=real to deploy on-chain"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <ExplorerRow
              label="Kyvern policy program"
              address="PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc"
              url={`https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=${config.network}`}
              highlight
            />
            <ExplorerRow
              label="Squads multisig"
              address={squads.smartAccountAddress}
              url={squads.smartAccountExplorerUrl}
            />
            <ExplorerRow
              label="Squads spending limit"
              address={squads.spendingLimitExplorerUrl
                .split("/address/")[1]
                ?.split("?")[0] ?? ""}
              url={squads.spendingLimitExplorerUrl}
            />
            <ExplorerRow
              label="Agent treasury PDA"
              address={squads.vaultPdaExplorerUrl
                .split("/address/")[1]
                ?.split("?")[0] ?? ""}
              url={squads.vaultPdaExplorerUrl}
            />
          </div>

          <p
            className="mt-4 text-[11.5px] leading-[1.6]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Two programs, one atomic transaction. Kyvern enforces merchant
            allowlist, velocity, memo, and pause. Squads enforces daily cap and
            settles USDC. If either rejects, the whole tx reverts on-chain.
          </p>
        </div>
      )}

      {/* Agent key */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Agent key
          </label>
          <span
            className="text-[12px]"
            style={{ color: "var(--warning)" }}
          >
            Copy now — shown only once
          </span>
        </div>
        <div
          className="flex items-center gap-3 p-4 rounded-[14px]"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <span
            className="flex-1 text-[14px] font-mono-numbers truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {masked}
          </span>
          <button
            onClick={() => copy(agentKey, setCopiedKey)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] font-semibold transition-all"
            style={{
              background: copiedKey ? "var(--success)" : "var(--text-primary)",
              color: "var(--background)",
            }}
          >
            {copiedKey ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <p
          className="mt-2 text-[12.5px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Store this in{" "}
          <code
            className="px-1.5 py-0.5 rounded-[6px] font-mono-numbers text-[11.5px]"
            style={{
              background: "var(--surface-2)",
              border: "0.5px solid var(--border-subtle)",
            }}
          >
            KYVERNLABS_AGENT_KEY
          </code>
          . It signs on behalf of the vault, but cannot exceed the limits you
          set.
        </p>
      </div>

      {/* Code snippet */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="text-[13px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Paste into your agent
          </label>
          <button
            onClick={() => copy(snippet, setCopiedCode)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy snippet
              </>
            )}
          </button>
        </div>
        <pre
          className="p-5 rounded-[14px] text-[12.5px] leading-[1.8] font-mono-numbers overflow-x-auto"
          style={{
            background: "#0B0B0C",
            color: "#E4E4E7",
            border: "0.5px solid #1F1F22",
          }}
        >
          {snippet}
        </pre>
      </div>

      {/* Cross-conversion — the "now the other side" moment.
           This is the thesis: every pay-side user tries the earn-side
           within 5 minutes of their first vault. */}
      <div className="pt-4">
        <CrossConversionBanner direction="to-earn" />
      </div>

      {/* Next steps — tighter, Pulse already has its own big banner above */}
      <div className="grid sm:grid-cols-2 gap-2.5 pt-2">
        <NextLink
          href={`/vault/${vaultId}`}
          title="Open your vault"
          description="Live dashboard, activity feed, kill switch."
          primary
        />
        <NextLink
          href="/docs/quickstart"
          title="Read the quickstart"
          description="Wire the SDK into your first agent."
        />
      </div>

      {/* The loop visualization — tiny, understated, but it's what completes
          the narrative: your agent pays merchants who use Pulse to see you. */}
      <div
        className="mt-2 flex items-center justify-center gap-2 text-[11.5px]"
        style={{ color: "var(--text-quaternary)" }}
      >
        <span>Agent (Vault)</span>
        <span>→</span>
        <span>Solana tx</span>
        <span>→</span>
        <span>Merchant (Pulse)</span>
        <span className="mx-1">·</span>
        <span style={{ color: "var(--text-tertiary)" }}>
          both sides see the same signature
        </span>
      </div>
    </div>
  );
}

function ExplorerRow({
  label,
  address,
  url,
  highlight,
}: {
  label: string;
  address: string;
  url: string;
  /** Accent style — used for the row the reader should click first. */
  highlight?: boolean;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-3 rounded-[10px] transition-colors"
      style={
        highlight
          ? {
              background: "#F8F9FF",
              border: "0.5px solid rgba(79,70,229,0.25)",
              boxShadow: "0 1px 2px rgba(79,70,229,0.04)",
            }
          : { background: "var(--surface-2)" }
      }
    >
      <div
        className="text-[10.5px] uppercase tracking-[0.08em] font-medium w-[140px] shrink-0"
        style={{
          color: highlight ? "#4F46E5" : "var(--text-quaternary)",
        }}
      >
        {label}
      </div>
      <div
        className="flex-1 text-[12.5px] font-mono-numbers truncate"
        style={{ color: "var(--text-primary)" }}
      >
        {shorten(address)}
      </div>
      <div
        className="inline-flex items-center gap-1 text-[11px] font-medium transition-transform group-hover:translate-x-0.5"
        style={{
          color: highlight ? "#4F46E5" : "var(--text-secondary)",
        }}
      >
        Explorer
        <ExternalLink className="w-3 h-3" />
      </div>
    </a>
  );
}

function NextLink({
  href,
  title,
  description,
  primary,
}: {
  href: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className="group block p-5 rounded-[14px] relative"
      style={{
        background: primary ? "var(--text-primary)" : "var(--surface)",
        color: primary ? "var(--background)" : "var(--text-primary)",
        border: primary
          ? "0.5px solid var(--text-primary)"
          : "0.5px solid var(--border)",
        boxShadow: primary
          ? "0 1px 2px rgba(0,0,0,0.06), 0 12px 30px rgba(0,0,0,0.1)"
          : "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold mb-1">{title}</div>
          <div
            className="text-[12.5px] leading-[1.45]"
            style={{
              color: primary
                ? "rgba(255,255,255,0.6)"
                : "var(--text-tertiary)",
            }}
          >
            {description}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 shrink-0 mt-0.5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </div>
    </a>
  );
}
