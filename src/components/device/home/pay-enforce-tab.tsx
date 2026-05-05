"use client";

/**
 * PayEnforceTab — Tab 3 of the device chassis. The "use the device
 * right now" surface, restructured into two beautifully-spaced
 * sections (no nested tabs):
 *
 *   1. POLICY IN ACTION
 *      Buy signal from Atlas (real x402, ~$0.01) + Try to drain
 *      ($50 → blocked). Side-by-side on desktop, stacked on mobile.
 *      Real on-chain, both outcomes.
 *
 *   2. POLICY PLAYGROUND
 *      Interactive form — merchant + amount + memo + Run. Real
 *      decision returned. Replaces the static SDK code that used
 *      to live here. The judge can punch in their own values and
 *      watch the chain decide.
 *
 * Mint-key flow lives in a quiet utility row below — visible but
 * not dominant.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  Loader2,
  ShieldX,
  X,
} from "lucide-react";
import { PolicyPlayground } from "./policy-playground";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface BuyResult {
  ok: boolean;
  signature: string | null;
  signal?: { kind: string; subject: string; sourceUrl: string | null } | null;
  reason?: string | null;
}

interface DrainResult {
  ok: boolean;
  signature: string | null;
  reason: string | null;
  chainProof?: { signature: string; reason: string | null } | null;
}

interface PolicySummary {
  dailyLimitUsd: number;
  dailySpentUsd: number;
  callsToday: number;
  blockedToday: number;
  lastSettledTxSignature: string | null;
}

interface Props {
  deviceId: string | null;
  network: "devnet" | "mainnet";
  vaultEmpty: boolean;
  onTopUp: () => void;
  isGuest?: boolean;
  onSignIn?: () => void;
  /** When provided, lets the playground show "this device's rules"
   *  with the real per-tx + daily limits. */
  policySummary?: PolicySummary | null;
  perTxMaxUsd?: number;
}

export function PayEnforceTab({
  deviceId,
  network,
  vaultEmpty,
  onTopUp,
  isGuest,
  onSignIn,
  policySummary,
  perTxMaxUsd,
}: Props) {
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<BuyResult | null>(null);

  const [draining, setDraining] = useState(false);
  const [drainResult, setDrainResult] = useState<DrainResult | null>(null);

  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    fetch(`/api/devices/${deviceId}/agent-key`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.keyPrefix) setKeyPrefix(d.keyPrefix);
      })
      .catch(() => {});
  }, [deviceId]);

  async function buySignal() {
    if (buying || !deviceId) return;
    setBuying(true);
    setBuyResult(null);
    try {
      const url = isGuest
        ? `/api/devices/${deviceId}/buy-atlas-signal?guest=1`
        : `/api/devices/${deviceId}/buy-atlas-signal`;
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      setBuyResult({
        ok: !!data?.ok,
        signature: data?.signature ?? null,
        signal: data?.signal ?? null,
        reason: data?.reason ?? null,
      });
    } catch (e) {
      setBuyResult({
        ok: false,
        signature: null,
        reason: e instanceof Error ? e.message : "request failed",
      });
    } finally {
      setBuying(false);
    }
  }

  async function tryDrain() {
    if (draining || !deviceId) return;
    setDraining(true);
    setDrainResult(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}/drain-attempt`, {
        method: "POST",
      });
      const data = await res.json();
      setDrainResult({
        ok: !!data?.ok,
        signature: data?.signature ?? null,
        reason: data?.reason ?? null,
        chainProof: data?.chainProof ?? null,
      });
    } catch (e) {
      setDrainResult({
        ok: false,
        signature: null,
        reason: e instanceof Error ? e.message : "request failed",
      });
    } finally {
      setDraining(false);
    }
  }

  async function mintKey() {
    if (isGuest) {
      onSignIn?.();
      return;
    }
    if (!deviceId || revealing) return;
    setRevealing(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/agent-key`, {
        method: "POST",
      });
      const d = await res.json();
      if (d?.rawKey) {
        setRevealedKey(d.rawKey);
        if (d.keyPrefix) setKeyPrefix(d.keyPrefix);
      }
    } catch {
      /* ignore */
    } finally {
      setRevealing(false);
    }
  }

  const explorer = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=${network}`;
  const displayKey = revealedKey ?? (keyPrefix ? `${keyPrefix}…` : null);

  return (
    <div className="flex flex-col gap-5">
      {/* ─── EMPTY VAULT NUDGE ──────────────────────────────────── */}
      {vaultEmpty && !isGuest && (
        <div
          className="rounded-[12px] px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.20)",
          }}
        >
          <span
            className="text-[12.5px] leading-[1.5]"
            style={{ color: "#92400E" }}
          >
            Your vault is empty. Top up devnet USDC to fire approved spends.
          </span>
          <button
            type="button"
            onClick={onTopUp}
            className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] rounded-full px-3 py-1 transition active:scale-[0.97]"
            style={{
              fontSize: 9.5,
              color: "#FFFFFF",
              background: "#0A0A0A",
              border: "1px solid rgba(0,0,0,0.8)",
            }}
          >
            Top up
            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ─── SECTION 1: POLICY IN ACTION ─────────────────────────── */}
      <section>
        <SectionHeader
          eyebrow="Policy in action"
          title="See the chain decide."
          subtitle="Two real on-chain actions. One settles. One gets blocked."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ActionCard
            tone="green"
            title="Buy a signal from Atlas"
            price="$0.01 USDC"
            description="Hits Atlas's public x402 feed. Routes through the policy program. Approved spends settle on Solana; Atlas returns its latest discovery."
            buttonLabel="Buy signal"
            buttonIcon={<ArrowUpRight className="w-4 h-4" strokeWidth={2} />}
            onClick={buySignal}
            running={buying}
            runningLabel="Routing through chain…"
            disabled={!deviceId}
          />
          <ActionCard
            tone="amber"
            title="Try to drain"
            price="$50 to disallowed merchant"
            description="The chain rejects this before any USDC moves — over per-tx cap and merchant not in allowlist. Real failed Solana transaction."
            buttonLabel="Try to drain"
            buttonIcon={<ShieldX className="w-4 h-4" strokeWidth={2} />}
            onClick={tryDrain}
            running={draining}
            runningLabel="Asking the chain…"
            disabled={!deviceId}
          />
        </div>

        {/* Result blocks render below the grid so they don't squeeze
            the two cards out of the side-by-side layout. */}
        <div className="mt-3 flex flex-col gap-2">
          <AnimatePresence>
            {buyResult && (
              <motion.div
                key={`buy-${buyResult.signature ?? buyResult.reason}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <BuyResultBlock result={buyResult} explorer={explorer} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {drainResult && (
              <motion.div
                key={`drain-${drainResult.signature ?? drainResult.reason}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <DrainResultBlock
                  result={drainResult}
                  explorer={explorer}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── SECTION 2: POLICY PLAYGROUND ────────────────────────── */}
      <section>
        <SectionHeader
          eyebrow="Build with the policy program"
          title="Punch in any payment. Watch the chain decide."
          subtitle="No code, no terminal, no docs. Real on-chain enforcement of the rules below."
        />
        <PolicyPlayground
          deviceId={deviceId}
          network={network}
          policySummary={policySummary ?? null}
          perTxMaxUsd={perTxMaxUsd}
        />
      </section>

      {/* ─── KEY UTILITY ROW (quiet, not dominant) ───────────────── */}
      <section
        className="flex items-center justify-between gap-3 flex-wrap rounded-[10px] px-3.5 py-2.5"
        style={{
          background: "rgba(15,23,42,0.025)",
          border: "1px solid rgba(15,23,42,0.05)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ color: "#9CA3AF", fontSize: 9.5 }}
          >
            Agent key
          </span>
          <span
            className="font-mono truncate"
            style={{
              fontSize: 11,
              color: revealedKey ? "#0A0A0A" : "rgba(15,23,42,0.55)",
            }}
          >
            {displayKey ?? "no key minted yet"}
          </span>
          {revealedKey && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(revealedKey);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] hover:opacity-80 transition"
              style={{
                fontSize: 9.5,
                color: copied ? "#15803D" : "rgba(15,23,42,0.55)",
              }}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                  Copied
                </>
              ) : (
                "Copy"
              )}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={mintKey}
          disabled={!deviceId || revealing}
          className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] rounded-full px-2.5 py-1 hover:opacity-90 transition disabled:opacity-50 flex-shrink-0"
          style={{
            fontSize: 9.5,
            color: "#FFFFFF",
            background: "#0A0A0A",
            border: "1px solid rgba(0,0,0,0.8)",
          }}
        >
          {revealing ? (
            "Minting…"
          ) : isGuest ? (
            "Sign in to mint"
          ) : revealedKey ? (
            <>
              <Eye className="w-3 h-3" strokeWidth={2} />
              Shown once
            </>
          ) : (
            <>
              Mint a fresh key
              <ArrowRight className="w-3 h-3" strokeWidth={2} />
            </>
          )}
        </button>
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Sub-components — kept inline for cohesion with the tab layout
   ──────────────────────────────────────────────────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3">
      <div
        className="font-mono uppercase tracking-[0.18em] mb-1"
        style={{ color: "#9CA3AF", fontSize: 10 }}
      >
        {eyebrow}
      </div>
      <h3
        className="text-[16px] font-semibold tracking-[-0.005em] mb-0.5"
        style={{ color: "#0A0A0A" }}
      >
        {title}
      </h3>
      <p
        className="text-[12px] leading-[1.5]"
        style={{ color: "#6B7280" }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function ActionCard({
  tone,
  title,
  price,
  description,
  buttonLabel,
  buttonIcon,
  onClick,
  running,
  runningLabel,
  disabled,
}: {
  tone: "green" | "amber";
  title: string;
  price: string;
  description: string;
  buttonLabel: string;
  buttonIcon: React.ReactNode;
  onClick: () => void;
  running: boolean;
  runningLabel: string;
  disabled?: boolean;
}) {
  const accent =
    tone === "green"
      ? { fg: "#15803D", border: "rgba(34,197,94,0.18)", glow: "rgba(34,197,94,0.18)" }
      : { fg: "#B45309", border: "rgba(245,158,11,0.20)", glow: "rgba(245,158,11,0.18)" };
  return (
    <div
      className="rounded-[16px] p-4 flex flex-col"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${accent.border}`,
        boxShadow: `0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px ${accent.glow}`,
      }}
    >
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <h4
          className="text-[14.5px] font-semibold tracking-[-0.005em] truncate"
          style={{ color: "#0A0A0A" }}
        >
          {title}
        </h4>
        <span
          className="font-mono whitespace-nowrap"
          style={{ color: accent.fg, fontSize: 11.5 }}
        >
          {price}
        </span>
      </div>
      <p
        className="text-[12px] leading-[1.5] mb-3 flex-1"
        style={{ color: "#6B7280" }}
      >
        {description}
      </p>
      <motion.button
        type="button"
        onClick={onClick}
        disabled={running || disabled}
        whileTap={{ scale: 0.98 }}
        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-[10px] text-[12.5px] font-semibold tracking-[-0.005em] transition disabled:opacity-60"
        style={
          tone === "green"
            ? {
                background: "#0A0A0A",
                color: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.8)",
              }
            : {
                background: "rgba(245,158,11,0.06)",
                color: "#B45309",
                border: "1px solid rgba(245,158,11,0.40)",
              }
        }
      >
        {running ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            {runningLabel}
          </>
        ) : (
          <>
            {buttonIcon}
            {buttonLabel}
          </>
        )}
      </motion.button>
    </div>
  );
}

function BuyResultBlock({
  result,
  explorer,
}: {
  result: BuyResult;
  explorer: (sig: string) => string;
}) {
  if (result.ok && result.signal && result.signature) {
    return (
      <div
        className="rounded-[10px] p-3"
        style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.22)",
        }}
      >
        <div
          className="flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] mb-1.5"
          style={{ color: "#15803D", fontSize: 9.5 }}
        >
          <Check className="w-3 h-3" strokeWidth={2.5} />
          Approved · settled
        </div>
        <div
          className="text-[12.5px] leading-[1.5] mb-2"
          style={{ color: "#0A0A0A" }}
        >
          Atlas surfaced: <strong>{result.signal.subject}</strong>
        </div>
        <a
          href={explorer(result.signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono"
          style={{ color: "#15803D", fontSize: 10.5 }}
        >
          {result.signature.slice(0, 8)}…{result.signature.slice(-6)}
          <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
        </a>
      </div>
    );
  }
  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.30)",
      }}
    >
      <div
        className="flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] mb-1"
        style={{ color: "#B45309", fontSize: 9.5 }}
      >
        <X className="w-3 h-3" strokeWidth={2.5} />
        Buy not approved
      </div>
      <div className="text-[12.5px]" style={{ color: "#92400E" }}>
        {result.reason ?? "policy program rejected the spend"}
      </div>
    </div>
  );
}

function DrainResultBlock({
  result,
  explorer,
}: {
  result: DrainResult;
  explorer: (sig: string) => string;
}) {
  return (
    <div
      className="rounded-[10px] p-3"
      style={{
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.30)",
      }}
    >
      <div
        className="flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] mb-1.5"
        style={{ color: "#B45309", fontSize: 9.5 }}
      >
        <X className="w-3 h-3" strokeWidth={2.5} />
        Blocked by chain
      </div>
      <div
        className="text-[12.5px] leading-[1.5] mb-2"
        style={{ color: "#92400E" }}
      >
        {result.reason ?? "policy program rejected the spend"}
      </div>
      {result.signature ? (
        <a
          href={explorer(result.signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono"
          style={{ color: "#B45309", fontSize: 10.5 }}
        >
          {result.signature.slice(0, 8)}…{result.signature.slice(-6)}
          <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
        </a>
      ) : result.chainProof ? (
        <a
          href={explorer(result.chainProof.signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-mono rounded-[8px] px-2.5 py-1.5 w-fit"
          style={{
            fontSize: 10.5,
            color: "#B45309",
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.30)",
          }}
        >
          <span style={{ color: "rgba(180,83,9,0.7)" }}>real failed tx</span>
          <span>
            {result.chainProof.signature.slice(0, 8)}…
            {result.chainProof.signature.slice(-6)}
          </span>
          <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
        </a>
      ) : (
        <a
          href="https://explorer.solana.com/address/PpmZErWfT5zpeo1fJtTbpqezFGbRUamaNNRWViaMSqc?cluster=devnet"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono"
          style={{ color: "#B45309", fontSize: 10.5 }}
        >
          Verify program · PpmZ…MSqc
          <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
        </a>
      )}
    </div>
  );
}
