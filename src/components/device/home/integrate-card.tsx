"use client";

/**
 * IntegrateCard — Tab 3's third section. "Wrap your own agent."
 *
 * Two interactive code panes:
 *   1. SDK — wrap any agent's spending in OnChainVault.pay() so the
 *      policy program decides every dollar.
 *   2. Pay.sh — wrap a Pay.sh API call (Solana × Google Cloud, May
 *      2026) so the user's AI agent can pay Gemini / BigQuery /
 *      Vertex AI through the same enforcement.
 *
 * Each pane shows the user's actual agent key (or prefix) in the
 * snippet — pasteable, real. Copy button per pane. Tab switcher at
 * the top. Mint-key flow handled inline.
 *
 * No docs, no read-the-manual. The chassis IS the integration guide.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Copy,
  Eye,
  Sparkles,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Pane = "sdk" | "paysh";

interface Props {
  keyPrefix: string | null;
  revealedKey: string | null;
  onMint: () => void;
  revealing: boolean;
  isGuest?: boolean;
}

export function IntegrateCard({
  keyPrefix,
  revealedKey,
  onMint,
  revealing,
  isGuest,
}: Props) {
  const [pane, setPane] = useState<Pane>("sdk");
  const [copied, setCopied] = useState(false);

  const apiKey = revealedKey
    ? `"${revealedKey}"`
    : keyPrefix
      ? `"${keyPrefix}…" /* mint to reveal */`
      : `process.env.KYVERN_AGENT_KEY`;

  const snippet = pane === "sdk" ? sdkSnippet(apiKey) : payshSnippet(apiKey);

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="rounded-[18px] overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
      }}
    >
      {/* HEADER */}
      <div className="px-5 pt-5 pb-3 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div
            className="font-mono uppercase tracking-[0.18em] mb-1"
            style={{ color: "#9CA3AF", fontSize: 10 }}
          >
            Wrap your own agent
          </div>
          <h3
            className="text-[16px] font-semibold tracking-[-0.005em]"
            style={{ color: "#0A0A0A" }}
          >
            Five lines, your chain, your rules.
          </h3>
        </div>
        <Sparkles
          className="w-4 h-4"
          strokeWidth={1.6}
          style={{ color: "#15803D" }}
        />
      </div>

      {/* PANE TOGGLE */}
      <div className="px-5 pb-3">
        <div
          className="inline-flex items-center gap-1 rounded-[10px] p-1"
          style={{
            background: "rgba(15,23,42,0.04)",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          <PaneButton
            active={pane === "sdk"}
            onClick={() => setPane("sdk")}
            label="SDK"
            sub="Any agent"
          />
          <PaneButton
            active={pane === "paysh"}
            onClick={() => setPane("paysh")}
            label="Pay.sh"
            sub="Solana × GCP"
            badge
          />
        </div>
      </div>

      {/* CODE PANE */}
      <div
        className="mx-5 mb-4 rounded-[12px] overflow-hidden"
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
            {pane === "sdk"
              ? "@kyvernlabs/sdk · this device"
              : "@kyvernlabs/sdk + Pay.sh · this device"}
          </span>
          <button
            type="button"
            onClick={copy}
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
        <motion.pre
          key={pane}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="px-4 py-3 font-mono text-[11.5px] leading-[1.6] overflow-x-auto whitespace-pre"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
{snippet}
        </motion.pre>
      </div>

      {/* MINT KEY ROW */}
      <div
        className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ borderTop: "1px solid rgba(15,23,42,0.05)" }}
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
            {revealedKey ?? (keyPrefix ? `${keyPrefix}…` : "no key minted yet")}
          </span>
        </div>
        <button
          type="button"
          onClick={onMint}
          disabled={revealing}
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
              Mint a key
              <ArrowRight className="w-3 h-3" strokeWidth={2} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function PaneButton({
  active,
  onClick,
  label,
  sub,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-[8px] px-3 py-1.5 transition active:scale-[0.97]"
      style={{
        background: active ? "#FFFFFF" : "transparent",
        boxShadow: active
          ? "0 1px 2px rgba(15,23,42,0.06), 0 4px 10px -4px rgba(15,23,42,0.08)"
          : "none",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="text-[12px] font-semibold tracking-[-0.005em]"
          style={{
            color: active ? "#0A0A0A" : "rgba(15,23,42,0.55)",
          }}
        >
          {label}
        </span>
        {badge && (
          <span
            className="font-mono uppercase tracking-[0.14em] rounded-full px-1.5 py-0.5"
            style={{
              fontSize: 7.5,
              color: "#15803D",
              background: "rgba(34,197,94,0.10)",
              border: "1px solid rgba(34,197,94,0.20)",
            }}
          >
            New
          </span>
        )}
      </div>
      <div
        className="font-mono uppercase tracking-[0.12em]"
        style={{
          fontSize: 8.5,
          color: active ? "rgba(15,23,42,0.50)" : "rgba(15,23,42,0.40)",
        }}
      >
        {sub}
      </div>
    </button>
  );
}

// Snippets ship as-is into the user's clipboard — they MUST mirror
// the shipped @kyvernlabs/sdk shape (verified 2026-05-08 against the
// 0.4.0 release). Constructor takes `agentKey`, pay() takes `amount`
// (not amountUsd) + `recipientPubkey`, and returns a discriminated
// union with `decision: "allowed" | "blocked"`. Earlier copy used
// invented field names (apiKey, amountUsd, receipt.approved) that
// would not compile.

function sdkSnippet(apiKey: string): string {
  return `import { Vault } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: ${apiKey} });

// Your agent tries to spend. The chain decides.
const res = await vault.pay({
  merchant: "api.openai.com",
  recipientPubkey: "GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ",
  amount: 0.05,
  memo: "gpt-4 inference",
});

if (res.decision === "allowed") {
  // settled tx · res.tx.signature · res.tx.explorerUrl
  console.log("paid:", res.tx.explorerUrl);
} else {
  // chain blocked — res.code + res.reason explain why
  console.log("blocked:", res.code, res.reason);
}`;
}

function payshSnippet(apiKey: string): string {
  return `import { Vault } from "@kyvernlabs/sdk";

const vault = new Vault({ agentKey: ${apiKey} });

// Pay.sh-shaped merchant — Solana × Google Cloud rail (May 2026).
// The chain enforces YOUR caps before any USDC moves. The merchant
// label and memo are the on-chain fingerprint of the inference call.
const res = await vault.pay({
  merchant: "api.pay.sh/gemini",
  recipientPubkey: "GZCnHuFtswvsJftSDmtoHEve8amqNLzAAPvYy8NU3ZNZ",
  amount: 0.05,
  memo: "gemini-pro: weather lookup",
});

if (res.decision === "allowed") {
  // res.tx.signature is the on-chain receipt — forward it to the
  // Pay.sh endpoint when the API ships. Today the chain settlement
  // is the truth; the API is the next mile.
  console.log("paid:", res.tx.signature);
}
// → chain enforces your budget · receipt is on Solana Explorer`;
}
