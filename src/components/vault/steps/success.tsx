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
// CrossConversionBanner removed for the Frontier build — single-brand
// narrative. Re-introduce if a distinct merchant-side product returns.
import { SignatureReveal } from "@/components/atlas/signature-reveal";
import { EASE_PREMIUM as ease } from "@/lib/motion";

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
      {/* Check hero + confetti burst.
          This is the "it really happened" moment. The check lands; 16
          colored particles fire outward in a burst (staggered 0-300ms);
          radiating rings continue for ambient aliveness. */}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {/* Confetti particles — CSS-only, no library. Angles are
              quasi-random but deterministic so every deploy feels the
              same. Kyvern palette: indigo, sky, success-green. */}
          <ConfettiBurst />

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

        {/* Signature reveal — real on-chain tx sig typed out character
            by character. This replaces the placeholder from the
            DeployingView with the actual settled signature. Judges
            who scroll down can click through to Explorer directly. */}
        {squads?.createSignature && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease }}
            className="w-full max-w-[440px] rounded-[14px] overflow-hidden mt-1 mb-2"
            style={{
              background: "#0B0B0F",
              border: "0.5px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="flex items-center justify-between px-3.5 py-2"
              style={{
                borderBottom: "0.5px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                className="text-[10.5px] font-mono-numbers"
                style={{ color: "rgba(255,255,255,0.42)" }}
              >
                solana · devnet · create signature
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "#4ADE80" }}
              >
                <motion.span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#4ADE80" }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                settled
              </span>
            </div>
            <div className="px-4 py-3 text-left">
              <SignatureReveal
                signature={squads.createSignature}
                network={config.network}
                truncate={44}
                className="inline-flex items-center gap-1 font-mono-numbers text-[12.5px] hover:underline"
                textClassName="text-[12.5px]"
              />
            </div>
          </motion.div>
        )}
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

      {/* Fund your device */}
      {squads && (
        <div
          className="p-5 rounded-[16px]"
          style={{
            background: "linear-gradient(135deg, #F0FDF4, #FAFAFA)",
            border: "1px solid rgba(34,197,94,0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">💰</span>
            <div>
              <div className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Fund your device
              </div>
              <div className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                Send devnet USDC to this address to activate abilities
              </div>
            </div>
          </div>

          <FundingAddress
            label="Vault treasury (send USDC here)"
            address={squads.vaultPdaExplorerUrl.split("/address/")[1]?.split("?")[0] ?? squads.smartAccountAddress}
            network={config.network}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="https://faucet.solana.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-8 px-3 rounded-[8px] text-[11px] font-medium transition-colors"
              style={{ background: "rgba(0,0,0,0.04)", color: "var(--text-secondary)" }}
            >
              <ExternalLink className="w-3 h-3" />
              SOL Faucet
            </a>
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 h-8 px-3 rounded-[8px] text-[11px] font-medium transition-colors"
              style={{ background: "rgba(0,0,0,0.04)", color: "var(--text-secondary)" }}
            >
              <ExternalLink className="w-3 h-3" />
              USDC Faucet (Circle)
            </a>
          </div>

          <p className="mt-3 text-[11px] leading-[1.5]" style={{ color: "var(--text-tertiary)" }}>
            Your device needs devnet USDC to make payments through abilities.
            Use the faucets above, or transfer from any Solana devnet wallet.
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

      {/* Next steps — land the judge on the Playground tab so they
          immediately fire a real on-chain test payment instead of
          staring at an empty Live feed. */}
      <div className="grid sm:grid-cols-2 gap-2.5 pt-2">
        <NextLink
          href={`/vault/${vaultId}?tab=integrate`}
          title="Fire your first payment"
          description="Trigger a real on-chain USDC transfer in one click."
          primary
        />
        <NextLink
          href={`/vault/${vaultId}`}
          title="Open the live dashboard"
          description="Activity feed, kill switch, policy edits."
        />
      </div>

      {/* The loop visualization — tiny, understated. The signature your
          agent just signed is the same row anyone can verify on Explorer. */}
      <div
        className="mt-2 flex items-center justify-center gap-2 text-[11.5px]"
        style={{ color: "var(--text-quaternary)" }}
      >
        <span>Your agent</span>
        <span>→</span>
        <span>Kyvern policy PDA</span>
        <span>→</span>
        <span>Solana tx</span>
        <span className="mx-1">·</span>
        <span style={{ color: "var(--text-tertiary)" }}>
          every row verifiable on Explorer
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

/**
 * Confetti burst for the success hero.
 *
 * Zero-dependency — pure Framer-animated divs. 20 particles, each
 * with a deterministic angle (so subsequent renders look the same)
 * and a randomized distance + size + color pulled from the Kyvern
 * palette. Particles fire out from dead center, drift with gravity,
 * then fade. Plays ONCE on mount — this is a celebration, not an
 * ambient loop.
 *
 * Respects `prefers-reduced-motion` via the parent screen's motion
 * context (motion.div animations will be skipped if the OS says so).
 */
function FundingAddress({
  label,
  address,
  network,
}: {
  label: string;
  address: string;
  network: string;
}) {
  const [copied, setCopied] = useState(false);
  const explorerUrl = `https://explorer.solana.com/address/${address}?cluster=${network}`;
  return (
    <div
      className="flex items-center gap-2 p-3 rounded-[10px]"
      style={{ background: "rgba(255,255,255,0.8)", border: "0.5px solid rgba(0,0,0,0.06)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.06em] mb-0.5" style={{ color: "var(--text-quaternary)" }}>
          {label}
        </div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-mono-numbers text-[#0052FF] hover:underline truncate block"
        >
          {address}
        </a>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[8px] text-[11px] font-medium shrink-0"
        style={{
          background: copied ? "var(--success)" : "var(--surface-2)",
          color: copied ? "white" : "var(--text-secondary)",
        }}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function ConfettiBurst() {
  const particles = Array.from({ length: 20 }, (_, i) => {
    // Even angular spread around the circle.
    const angle = (i / 20) * Math.PI * 2 + (i % 2 === 0 ? 0.12 : -0.08);
    // Varied distances make it feel organic, not mechanical.
    const dist = 80 + ((i * 37) % 60);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 20; // bias up slightly (celebration)
    const size = 5 + ((i * 13) % 5);
    const palette = [
      "#4F46E5", // agent indigo
      "#0EA5E9", // revenue sky
      "#22C55E", // success green
      "#FBBF24", // chrome yellow
      "#F87171", // chrome red
    ];
    const color = palette[i % palette.length];
    return { i, dx, dy, size, color };
  });
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
      style={{ zIndex: 0 }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
          animate={{
            x: p.dx,
            y: p.dy,
            opacity: [0, 1, 1, 0],
            scale: [0.3, 1, 1, 0.85],
          }}
          transition={{
            duration: 1.2,
            delay: 0.15 + (p.i % 5) * 0.04,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: p.size,
            height: p.size,
            borderRadius: p.i % 3 === 0 ? 2 : 9999,
            background: p.color,
            marginTop: -p.size / 2,
            marginLeft: -p.size / 2,
          }}
        />
      ))}
    </div>
  );
}
