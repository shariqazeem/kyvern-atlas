"use client";

/**
 * DeployTab — Tab 2 of the device chassis.
 *
 * Three paths to put a worker into the device:
 *   1. PRESETS — one-click deploy of Sentinel/Wren/Pulse copies. The
 *      judge can spawn in 5 seconds without thinking. The new worker
 *      appears next to the demos in Tab 1's chassis.
 *   2. CUSTOM — full template picker + customize drawer (existing
 *      /app/agents/spawn flow), reframed copy.
 *   3. SDK — copy-pasteable 5-line snippet for builders who want to
 *      wrap their existing agent without using a template.
 *
 * The point of the tab is transferability. The judge sees: "I can put
 * MY agent in this device too." They don't have to actually do it —
 * the option being visible is the conversion moment.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Copy, Eye, Sparkles } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PRESETS: Array<{
  id: string;
  emoji: string;
  name: string;
  role: string;
  template: string;
  oneLine: string;
}> = [
  {
    id: "sentinel-copy",
    emoji: "🎯",
    name: "Sentinel",
    role: "Opportunity Scout",
    template: "bounty_hunter",
    oneLine: "Scans 7 Solana sources, posts paid jobs on every find ≥$300.",
  },
  {
    id: "wren-copy",
    emoji: "🐋",
    name: "Wren",
    role: "Market Intel",
    template: "whale_tracker",
    oneLine: "Tracks whale wallets, claims tasks, posts intel on $5k+ swaps.",
  },
  {
    id: "pulse-copy",
    emoji: "📈",
    name: "Pulse",
    role: "Validation · Staking",
    template: "token_pulse",
    oneLine: "Validates with live DEX prices, stakes on band breaches.",
  },
];

interface Props {
  deviceId: string | null;
  onDeployed?: () => void;
}

export function DeployTab({ deviceId, onDeployed }: Props) {
  const [deploying, setDeploying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  // Fetch the device's existing agent key prefix on mount so the SDK
  // snippet feels real, not a placeholder.
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

  async function deployPreset(preset: (typeof PRESETS)[number]) {
    if (!deviceId || deploying) return;
    setDeploying(preset.id);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}/deploy-preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: preset.template }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message || data?.error || "Deploy failed",
        );
      }
      onDeployed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(null);
    }
  }

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
          Put your own agent inside
        </div>
        <h3
          className="text-[16px] font-semibold tracking-[-0.01em] mb-1"
          style={{ color: "#0A0A0A" }}
        >
          Deploy a worker into this device
        </h3>
        <p
          className="text-[12.5px] leading-[1.55]"
          style={{ color: "#475569" }}
        >
          Every worker you put here runs under the same Anchor policy
          program. Pick a preset to deploy in 5 seconds, customize a
          template, or wrap your own agent via the SDK.
        </p>
      </div>

      {/* PRESETS — 1-click deploy */}
      <div>
        <div
          className="font-mono uppercase tracking-[0.14em] mb-2 px-1"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          1-click presets
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PRESETS.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => deployPreset(p)}
              whileTap={{ scale: 0.99 }}
              disabled={!deviceId || !!deploying}
              className="flex items-center justify-between rounded-[12px] px-3.5 py-3 text-left transition disabled:opacity-60"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
                    border: "1px solid rgba(15,23,42,0.06)",
                  }}
                >
                  {p.emoji}
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[13px] font-semibold tracking-[-0.005em]"
                    style={{ color: "#0A0A0A" }}
                  >
                    Deploy a {p.name}
                  </div>
                  <div
                    className="text-[11.5px] leading-[1.45] truncate"
                    style={{ color: "#6B7280" }}
                  >
                    {p.oneLine}
                  </div>
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] flex-shrink-0 ml-3"
                style={{
                  fontSize: 9.5,
                  color: deploying === p.id ? "#22C55E" : "rgba(15,23,42,0.55)",
                }}
              >
                {deploying === p.id ? (
                  <>
                    <Sparkles className="w-3 h-3" strokeWidth={2} />
                    Deploying
                  </>
                ) : (
                  <>
                    Deploy
                    <ArrowRight className="w-3 h-3" strokeWidth={2} />
                  </>
                )}
              </span>
            </motion.button>
          ))}
        </div>
        {error && (
          <p
            className="mt-2 px-1 font-mono"
            style={{ color: "#B45309", fontSize: 11 }}
          >
            {error}
          </p>
        )}
      </div>

      {/* CUSTOM */}
      <div>
        <div
          className="font-mono uppercase tracking-[0.14em] mb-2 px-1"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          Or customize
        </div>
        <Link
          href="/app/agents/spawn"
          className="flex items-center justify-between rounded-[12px] px-3.5 py-3 transition active:scale-[0.99]"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
          }}
        >
          <div className="min-w-0">
            <div
              className="text-[13px] font-semibold tracking-[-0.005em]"
              style={{ color: "#0A0A0A" }}
            >
              Pick a template + customize
            </div>
            <div
              className="text-[11.5px]"
              style={{ color: "#6B7280" }}
            >
              Choose from 5 worker templates · tweak prompt + tools + budget.
            </div>
          </div>
          <ArrowRight
            className="w-4 h-4 ml-3 flex-shrink-0"
            style={{ color: "rgba(15,23,42,0.55)" }}
            strokeWidth={2}
          />
        </Link>
      </div>

      {/* SDK + LIVE AGENT KEY */}
      <div>
        <div
          className="font-mono uppercase tracking-[0.14em] mb-2 px-1"
          style={{ color: "#9CA3AF", fontSize: 10 }}
        >
          Or wrap your existing agent
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
              @kyvernlabs/sdk · this device
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  buildSnippet(revealedKey, keyPrefix),
                );
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
{buildSnippet(revealedKey, keyPrefix)}
          </pre>
        </div>

        {/* Reveal flow — surfacing the device's actual agent key. */}
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
              {revealing ? "Minting…" : "Mint a fresh key (one-time reveal)"}
              <ArrowRight className="w-3 h-3" strokeWidth={2} />
            </button>
          )}
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] hover:opacity-80 transition"
            style={{
              fontSize: 10,
              color: "rgba(15,23,42,0.55)",
            }}
          >
            Read the docs
            <ArrowRight className="w-3 h-3" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Build the SDK snippet with the real agent key when revealed,
 *  the key prefix as a placeholder when not, or the env-var fallback
 *  when nothing is known yet. The first form lets a builder paste-
 *  and-go from the chassis itself. */
function buildSnippet(
  rawKey: string | null,
  keyPrefix: string | null,
): string {
  const apiKey = rawKey
    ? `"${rawKey}"`
    : keyPrefix
      ? `"${keyPrefix}…" /* mint to reveal full key */`
      : `process.env.KYVERN_AGENT_KEY`;
  return `import { OnChainVault } from "@kyvernlabs/sdk";

const vault = new OnChainVault({ apiKey: ${apiKey} });

await vault.pay({
  merchant: "api.openai.com",
  amountUsd: 0.05,
  memo: "gpt-4 inference",
});
// → real Solana tx · enforced on-chain by PpmZ…MSqc`;
}

void EASE;
