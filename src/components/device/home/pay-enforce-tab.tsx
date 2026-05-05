"use client";

/**
 * PayEnforceTab — Tab 3 of the device chassis. The "use the device
 * right now" surface. NOT a demo — every action here is a real
 * Solana transaction enforced by the policy program.
 *
 *   1. PRIMARY    — Buy a real signal from Atlas ($0.01 USDC via x402)
 *   2. SECONDARY  — Try to drain the device ($50 to a disallowed
 *                    merchant) — instant block, real failed tx,
 *                    policy error code visible
 *   3. TERTIARY   — Copy a working cURL with the device's agent key
 *                    so the judge can call from their own terminal
 *
 * The point: the judge doesn't watch a demo. They spend USDC, the
 * chain decides, they keep a real transaction history.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Copy, Eye, Loader2, ShieldX, X } from "lucide-react";

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

interface Props {
  deviceId: string | null;
  network: "devnet" | "mainnet";
  vaultEmpty: boolean;
  onTopUp: () => void;
  /** Guest mode — Buy signal + Try drain stay interactive (those are
   *  the moat demo). Mint key is gated behind a Sign-in CTA. */
  isGuest?: boolean;
  onSignIn?: () => void;
}

export function PayEnforceTab({
  deviceId,
  network,
  vaultEmpty,
  onTopUp,
  isGuest,
  onSignIn,
}: Props) {
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<BuyResult | null>(null);

  const [draining, setDraining] = useState(false);
  const [drainResult, setDrainResult] = useState<DrainResult | null>(null);

  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch the device's existing agent key prefix on mount.
  useEffect(() => {
    if (!deviceId) return;
    fetch(`/api/devices/${deviceId}/agent-key`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.keyPrefix) setKeyPrefix(d.keyPrefix);
      })
      .catch(() => {});
  }, [deviceId]);

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

  const displayKey = revealedKey ?? (keyPrefix ? `${keyPrefix}…` : null);

  async function buySignal() {
    if (buying || !deviceId) return;
    setBuying(true);
    setBuyResult(null);
    try {
      // Guest mode → server routes the spend through Atlas's vault
      // (sandbox treasury) so the buy actually settles even though
      // the user's vault is empty. Real signature, real signal returned.
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

  const explorer = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=${network}`;

  return (
    <div className="flex flex-col gap-4">
      {/* INTENT BANNER */}
      <div
        className="rounded-[14px] px-4 py-3.5"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(15,23,42,0.06)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <div
          className="font-mono uppercase tracking-[0.16em] mb-1.5"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          Use the device right now
        </div>
        <h3
          className="text-[16px] font-semibold tracking-[-0.01em] mb-1"
          style={{ color: "#0A0A0A" }}
        >
          Spend on a real x402 service. Watch the chain decide.
        </h3>
        <p
          className="text-[12.5px] leading-[1.55]"
          style={{ color: "#475569" }}
        >
          Atlas — our reference device — sells its discoveries on x402 at
          $0.01 per call. Buy one. The chain enforces every USDC before
          it moves.
        </p>
      </div>

      {/* EMPTY VAULT NUDGE */}
      {vaultEmpty && (
        <div
          className="rounded-[12px] px-3.5 py-3 flex items-center justify-between gap-3 flex-wrap"
          style={{
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.20)",
          }}
        >
          <span
            className="text-[12.5px] leading-[1.5]"
            style={{ color: "#92400E" }}
          >
            Your vault has $0 USDC. Top up to fire a real spend — or
            click below to watch the chain block on a low-balance error.
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
            Top up vault
            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* PRIMARY — Buy a signal from Atlas */}
      <div
        className="rounded-[14px] p-4"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(34,197,94,0.18)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -10px rgba(34,197,94,0.18)",
        }}
      >
        <div className="flex items-baseline justify-between mb-1">
          <h4
            className="text-[15px] font-semibold tracking-[-0.005em]"
            style={{ color: "#0A0A0A" }}
          >
            Buy a signal from Atlas
          </h4>
          <span
            className="font-mono"
            style={{ color: "#15803D", fontSize: 12 }}
          >
            $0.01 USDC
          </span>
        </div>
        <p
          className="text-[12px] leading-[1.5] mb-3"
          style={{ color: "#475569" }}
        >
          Hits Atlas&apos;s public x402 feed. Vault.pay() routes through the
          policy program first. If approved, the chain settles, and Atlas
          returns its latest discovery.
        </p>
        <motion.button
          type="button"
          onClick={buySignal}
          disabled={buying || !deviceId}
          whileTap={{ scale: 0.98 }}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-[10px] text-[13px] font-semibold tracking-[-0.005em] transition disabled:opacity-60"
          style={{
            background: "#0A0A0A",
            color: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.8)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.10)",
          }}
        >
          {buying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              Routing through chain…
            </>
          ) : (
            <>
              Buy signal · $0.01
              <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
            </>
          )}
        </motion.button>

        <AnimatePresence>
          {buyResult && (
            <motion.div
              key={buyResult.signature ?? buyResult.reason ?? "result"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="mt-3"
            >
              <ResultBlock
                ok={buyResult.ok}
                signature={buyResult.signature}
                signal={buyResult.signal ?? null}
                reason={buyResult.reason ?? null}
                explorer={explorer}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECONDARY — Try to drain */}
      <div
        className="rounded-[14px] p-4"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(245,158,11,0.20)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        <div className="flex items-baseline justify-between mb-1">
          <h4
            className="text-[15px] font-semibold tracking-[-0.005em]"
            style={{ color: "#0A0A0A" }}
          >
            Try to drain your device
          </h4>
          <span
            className="font-mono"
            style={{ color: "#B45309", fontSize: 12 }}
          >
            $50 to disallowed merchant
          </span>
        </div>
        <p
          className="text-[12px] leading-[1.5] mb-3"
          style={{ color: "#475569" }}
        >
          The chain rejects this before any USDC moves — over per-tx cap
          AND merchant not in allowlist. Real failed Solana transaction,
          policy error code visible on Explorer.
        </p>
        <motion.button
          type="button"
          onClick={tryDrain}
          disabled={draining || !deviceId}
          whileTap={{ scale: 0.98 }}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-[10px] text-[13px] font-semibold tracking-[-0.005em] transition disabled:opacity-60"
          style={{
            background: "rgba(245,158,11,0.08)",
            color: "#B45309",
            border: "1px solid rgba(245,158,11,0.40)",
          }}
        >
          {draining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              Asking the chain…
            </>
          ) : (
            <>
              <ShieldX className="w-4 h-4" strokeWidth={2} />
              Try to drain · $50
            </>
          )}
        </motion.button>

        <AnimatePresence>
          {drainResult && (
            <motion.div
              key={drainResult.signature ?? drainResult.reason ?? "drain"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="mt-3"
            >
              <ResultBlock
                ok={drainResult.ok}
                signature={drainResult.signature}
                signal={null}
                reason={drainResult.reason}
                chainProof={drainResult.chainProof ?? null}
                explorer={explorer}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* TERTIARY — cURL with the device's actual agent key */}
      <div>
        <div
          className="font-mono uppercase tracking-[0.14em] mb-2 px-1"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          Or call from your terminal
        </div>
        <div
          className="rounded-[12px] overflow-hidden"
          style={{
            background: "#0A0A0A",
            border: "1px solid rgba(15,23,42,0.10)",
          }}
        >
          <div
            className="flex items-center justify-between px-3.5 py-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.55)", fontSize: 9.5 }}
            >
              cURL · this device · {network}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(curlSnippet(displayKey));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] hover:opacity-80 transition"
              style={{
                fontSize: 9.5,
                color: copied ? "#86EFAC" : "rgba(255,255,255,0.55)",
              }}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" strokeWidth={2} />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre
            className="px-4 py-3 font-mono text-[11.5px] leading-[1.55] overflow-x-auto whitespace-pre"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
{curlSnippet(displayKey)}
          </pre>
        </div>

        {/* Reveal flow — surfaces the user's actual agent key once. */}
        <div className="mt-2 flex items-center gap-2 flex-wrap px-1">
          {revealedKey ? (
            <span
              className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] rounded-full px-2.5 py-1"
              style={{
                fontSize: 9.5,
                color: "#B45309",
                background: "rgba(245,158,11,0.10)",
                border: "1px solid rgba(245,158,11,0.30)",
              }}
            >
              <Eye className="w-3 h-3" strokeWidth={2} />
              Shown once · save it now
            </span>
          ) : (
            <button
              type="button"
              onClick={mintKey}
              disabled={!deviceId || revealing}
              className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] rounded-full px-2.5 py-1 hover:opacity-90 transition disabled:opacity-50"
              style={{
                fontSize: 9.5,
                color: "#FFFFFF",
                background: "#0A0A0A",
                border: "1px solid rgba(0,0,0,0.8)",
              }}
            >
              {revealing
                ? "Minting…"
                : isGuest
                  ? "Sign in to mint a real key"
                  : "Mint a fresh key (one-time reveal)"}
              <ArrowRight className="w-3 h-3" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultBlock({
  ok,
  signature,
  signal,
  reason,
  chainProof,
  explorer,
}: {
  ok: boolean;
  signature: string | null;
  signal: { kind: string; subject: string; sourceUrl: string | null } | null;
  reason: string | null;
  chainProof?: { signature: string; reason: string | null } | null;
  explorer: (sig: string) => string;
}) {
  if (ok && signal) {
    return (
      <div
        className="rounded-[10px] p-3"
        style={{
          background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.22)",
        }}
      >
        <div
          className="flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] mb-2"
          style={{ color: "#15803D", fontSize: 9.5 }}
        >
          <Check className="w-3 h-3" strokeWidth={2.5} />
          Approved · settled
        </div>
        <div
          className="text-[12.5px] leading-[1.5] mb-2"
          style={{ color: "#0A0A0A" }}
        >
          Atlas surfaced: <strong>{signal.subject}</strong>
        </div>
        {signature && (
          <a
            href={explorer(signature)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono"
            style={{ color: "#15803D", fontSize: 10.5 }}
          >
            {signature.slice(0, 8)}…{signature.slice(-6)}
            <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
          </a>
        )}
      </div>
    );
  }
  if (ok && signature) {
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
          Approved
        </div>
        <a
          href={explorer(signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono"
          style={{ color: "#15803D", fontSize: 10.5 }}
        >
          {signature.slice(0, 8)}…{signature.slice(-6)}
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
        {reason ?? "policy program rejected the spend"}
      </div>
      {signature ? (
        <a
          href={explorer(signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono"
          style={{ color: "#B45309", fontSize: 10.5 }}
        >
          {signature.slice(0, 8)}…{signature.slice(-6)}
          <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
        </a>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            className="text-[11px] leading-[1.45]"
            style={{ color: "rgba(146,64,14,0.85)" }}
          >
            Caught by your device&apos;s local mirror in sub-ms — saves
            SOL + RPC. The same rules run on-chain. Here&apos;s a real
            on-chain rejection from Atlas&apos;s public attack history
            (one of 6,557):
          </div>
          {chainProof ? (
            <a
              href={explorer(chainProof.signature)}
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
              <span style={{ color: "rgba(180,83,9,0.7)" }}>
                real failed tx
              </span>
              <span>
                {chainProof.signature.slice(0, 8)}…
                {chainProof.signature.slice(-6)}
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
      )}
    </div>
  );
}

function curlSnippet(agentKey: string | null): string {
  const key = agentKey ?? "kv_live_…  # mint a fresh key below";
  return `curl -X POST https://app.kyvernlabs.com/api/vault/pay \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{
    "merchant": "api.openai.com",
    "amountUsd": 0.05,
    "memo": "test from terminal"
  }'`;
}
