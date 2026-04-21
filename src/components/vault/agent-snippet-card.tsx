"use client";

/* ════════════════════════════════════════════════════════════════════
   agent-snippet-card — the primary CTA on the vault dashboard.

   Two jobs:
     1. Show the "paste this into your agent" code snippet, prefilled
        with the vault's first allowed merchant + sensible amount.
     2. A live playground — user pastes their agent key, picks a merchant,
        enters an amount, hits "Send" → we POST /api/vault/pay and render
        the result (settled sig + Explorer link, or blocked with reason).

   Explorer links for the smart account / vault PDA / spending limit PDA
   are rendered inline so the user can verify on-chain state in one click.

   Security:
     · Agent key is cached in sessionStorage (wiped on tab close).
     · It is never sent anywhere except directly to /api/vault/pay as a
       Bearer header on the user's own browser.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Play,
  ShieldCheck,
  XOctagon,
} from "lucide-react";

const EASE = [0.25, 0.1, 0.25, 1] as const;

interface VaultLike {
  id: string;
  squadsAddress: string;
  network: "devnet" | "mainnet";
  allowedMerchants: string[];
  perTxMaxUsd: number;
  requireMemo: boolean;
  vaultPda: string | null;
  spendingLimitPda: string | null;
}

interface AllowedResult {
  decision: "allowed";
  payment: { id: string; status: string };
  tx: { signature: string; explorerUrl: string };
}
interface BlockedResult {
  decision: "blocked";
  code: string;
  reason: string;
  payment: { id: string };
}
interface FailedResult {
  decision: "failed";
  error: string;
  message: string;
}
type PlaygroundResult = AllowedResult | BlockedResult | FailedResult;

function explorerAddress(
  address: string,
  network: "devnet" | "mainnet",
): string {
  const cluster = network === "mainnet" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/address/${address}${cluster}`;
}

function shortenAddress(a: string): string {
  if (!a) return "—";
  if (a.length < 14) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function AgentSnippetCard({ vault }: { vault: VaultLike }) {
  const defaultMerchant =
    vault.allowedMerchants[0] ?? "api.openai.com";
  const defaultAmount = Math.min(0.12, vault.perTxMaxUsd);

  /* ─── Snippet ─── */
  const snippet = useMemo(
    () =>
      `import { Vault } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: process.env.KYVERNLABS_AGENT_KEY! });

const result = await vault.pay({
  merchant: "${defaultMerchant}",
  recipientPubkey: "<merchant-solana-pubkey>",
  amount: ${defaultAmount},${vault.requireMemo ? '\n  memo: "forecast lookup",' : ""}
});

if (result.decision === "blocked") {
  console.log("refused:", result.reason);   // e.g. over daily cap
} else {
  console.log("settled:", result.tx.signature);
}`,
    [defaultMerchant, defaultAmount, vault.requireMemo],
  );

  const [copied, setCopied] = useState(false);
  const copySnippet = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }, [snippet]);

  /* ─── Playground state ─── */
  const [open, setOpen] = useState(false);
  const [agentKey, setAgentKey] = useState("");
  const [merchant, setMerchant] = useState(defaultMerchant);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(String(defaultAmount));
  const [memo, setMemo] = useState(vault.requireMemo ? "test call" : "");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<PlaygroundResult | null>(null);

  // sessionStorage cache keyed by vault id
  const SS_KEY = `kyvern:agent-key:${vault.id}`;

  useEffect(() => {
    try {
      const cached = window.sessionStorage.getItem(SS_KEY);
      if (cached) setAgentKey(cached);
    } catch {
      /* noop */
    }
  }, [SS_KEY]);

  useEffect(() => {
    try {
      if (agentKey) window.sessionStorage.setItem(SS_KEY, agentKey);
    } catch {
      /* noop */
    }
  }, [agentKey, SS_KEY]);

  const amountNum = Number.parseFloat(amount);
  const canSend =
    !sending &&
    agentKey.trim().startsWith("kv_") &&
    merchant.trim().length > 2 &&
    recipient.trim().length > 30 &&
    Number.isFinite(amountNum) &&
    amountNum > 0;

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/vault/pay", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${agentKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant: merchant.trim(),
          recipientPubkey: recipient.trim(),
          amountUsd: amountNum,
          memo: memo.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.decision === "allowed") {
        setResult(body as AllowedResult);
      } else if (res.status === 402 && body?.decision === "blocked") {
        setResult(body as BlockedResult);
      } else {
        setResult({
          decision: "failed",
          error: body?.error ?? `http_${res.status}`,
          message: body?.message ?? `HTTP ${res.status}`,
        });
      }
    } catch (e) {
      setResult({
        decision: "failed",
        error: "network",
        message: e instanceof Error ? e.message : "request failed",
      });
    } finally {
      setSending(false);
    }
  }, [canSend, agentKey, merchant, recipient, amountNum, memo]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mt-10 rounded-[22px] border border-[#EDEDED] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      {/* ─── Header with smart-account explorer strip ─── */}
      <div className="flex flex-col gap-3 border-b border-[#F2F2F2] px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8E8E93]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Your agent&apos;s Visa
          </div>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[#1c1c1e]">
            Drop this into your agent. Done.
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={explorerAddress(vault.squadsAddress, vault.network)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E7] bg-[#FAFAFA] px-3 py-1.5 text-[11.5px] font-medium text-[#1c1c1e] transition-colors hover:bg-[#F2F2F2]"
          >
            <ExternalLink className="h-3 w-3" />
            Smart account · {shortenAddress(vault.squadsAddress)}
          </a>
          {vault.spendingLimitPda && (
            <a
              href={explorerAddress(vault.spendingLimitPda, vault.network)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E7] bg-[#FAFAFA] px-3 py-1.5 text-[11.5px] font-medium text-[#1c1c1e] transition-colors hover:bg-[#F2F2F2]"
            >
              <ExternalLink className="h-3 w-3" />
              Spending limit
            </a>
          )}
        </div>
      </div>

      {/* ─── Body: snippet + playground ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-0 lg:divide-x lg:divide-[#F2F2F2]">
        {/* Snippet */}
        <div className="relative p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8E8E93]">
              Copy this into your agent
            </div>
            <button
              type="button"
              onClick={copySnippet}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E7] bg-white px-3 py-1.5 text-[11.5px] font-medium text-[#1c1c1e] transition-colors hover:bg-[#F5F5F7]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#22C55E]" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-[14px] border border-[#EDEDED] bg-[#0B0B0F] p-5 text-[12.5px] leading-[1.7] text-[#E4E4E7]">
            <code className="font-mono">{snippet}</code>
          </pre>
          <p className="mt-3 text-[12px] leading-relaxed text-[#6E6E73]">
            Every <code className="font-mono text-[#1c1c1e]">vault.pay()</code>{" "}
            runs through policy server-side and, if allowed, is co-signed by
            Squads on Solana {vault.network}. Over-budget calls return a 402
            with the exact block reason — no charge, no tx.
          </p>
        </div>

        {/* Playground */}
        <div className="bg-[#FAFAFA] p-6">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8E8E93]">
              Try it now
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[11.5px] font-medium text-white transition-colors hover:bg-[#1c1c1e]"
            >
              {open ? "Hide" : "Open playground"}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-3">
                  <LabeledInput
                    label="Agent key"
                    icon={<KeyRound className="h-3.5 w-3.5" />}
                    value={agentKey}
                    onChange={setAgentKey}
                    placeholder="kv_live_…"
                    mono
                  />
                  <LabeledSelect
                    label="Merchant"
                    value={merchant}
                    onChange={setMerchant}
                    options={
                      vault.allowedMerchants.length > 0
                        ? vault.allowedMerchants
                        : [defaultMerchant]
                    }
                  />
                  <LabeledInput
                    label="Recipient pubkey"
                    value={recipient}
                    onChange={setRecipient}
                    placeholder="merchant's Solana pubkey (base58)"
                    mono
                  />
                  <LabeledInput
                    label={`Amount (USDC, max $${vault.perTxMaxUsd.toFixed(2)})`}
                    value={amount}
                    onChange={setAmount}
                    placeholder="0.12"
                    mono
                  />
                  {vault.requireMemo && (
                    <LabeledInput
                      label="Memo (required)"
                      value={memo}
                      onChange={setMemo}
                      placeholder="what is this for?"
                    />
                  )}

                  <button
                    type="button"
                    onClick={send}
                    disabled={!canSend}
                    className="mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-[13px] font-medium text-white transition-colors enabled:hover:bg-[#1c1c1e] disabled:opacity-40"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing…
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Send payment
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {result && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: EASE }}
                      >
                        <PlaygroundResultCard
                          result={result}
                          network={vault.network}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!open && (
            <p className="mt-4 text-[12px] leading-relaxed text-[#6E6E73]">
              Hit send a real USDC payment on devnet, confirmed by Squads v4,
              without leaving this page. Your key stays in this browser tab.
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

/* ─── Subcomponents ─── */

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  icon,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[#8E8E93]">
        {icon}
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-9 w-full rounded-[10px] border border-[#E5E5E7] bg-white px-3 text-[13px] text-[#1c1c1e] placeholder:text-[#C7C7CC] focus:border-[#1c1c1e] focus:outline-none ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-[#8E8E93]">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-[10px] border border-[#E5E5E7] bg-white px-3 text-[13px] text-[#1c1c1e] focus:border-[#1c1c1e] focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlaygroundResultCard({
  result,
  network,
}: {
  result: PlaygroundResult;
  network: "devnet" | "mainnet";
}) {
  if (result.decision === "allowed") {
    return (
      <div className="mt-3 rounded-[12px] border border-[#BBF7D0] bg-[#F0FDF4] p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#16A34A]">
          <Check className="h-3.5 w-3.5" />
          Settled
        </div>
        <a
          href={result.tx.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1.5 break-all font-mono text-[11.5px] text-[#1c1c1e] hover:underline"
        >
          {result.tx.signature}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </div>
    );
  }
  if (result.decision === "blocked") {
    return (
      <div className="mt-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#DC2626]">
          <XOctagon className="h-3.5 w-3.5" />
          Blocked · {result.code}
        </div>
        <p className="mt-1.5 text-[12px] text-[#1c1c1e]">{result.reason}</p>
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-[12px] border border-[#FED7AA] bg-[#FFF7ED] p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#EA580C]">
        <XOctagon className="h-3.5 w-3.5" />
        {result.error}
      </div>
      <p className="mt-1.5 text-[12px] text-[#1c1c1e]">{result.message}</p>
      <p className="mt-1 text-[11px] text-[#8E8E93]">Network: {network}</p>
    </div>
  );
}
