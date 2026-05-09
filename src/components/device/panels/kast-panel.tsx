"use client";

/**
 * KastPanel — "Send earnings to KAST" instrument drawer.
 *
 * The user pastes their KAST Solana USDC deposit address; we allowlist
 * it as MY_KAST in the vault config (Block E). After that, any agent
 * payout to that address is a real on-chain USDC transfer that funds
 * the user's KAST card. Spend at 150M+ merchants worldwide.
 *
 * Honesty: we don't verify the address belongs to a real KAST account.
 * The user owns the address either way. Kyvern is *compatible with
 * KAST deposit rails*, not affiliated.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, CreditCard, ExternalLink } from "lucide-react";
import { DevicePanel } from "./device-panel";

const KAST_AFFILIATE =
  process.env.NEXT_PUBLIC_KAST_AFFILIATE_URL ?? "https://go.kast.xyz/VqVO/STPAK";

interface Props {
  open: boolean;
  onClose: () => void;
  vaultId: string | null;
  ownerWallet: string | null;
}

export function KastPanel({ open, onClose, vaultId, ownerWallet }: Props) {
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate existing value when panel opens
  useEffect(() => {
    if (!open || !vaultId || !ownerWallet) return;
    void fetch(`/api/vault/${vaultId}/set-kast-destination`, {
      headers: { "x-owner-wallet": ownerWallet },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d?.address) {
          setAddress(d.address);
          setSaved(true);
        }
      })
      .catch(() => {});
  }, [open, vaultId, ownerWallet]);

  async function save() {
    if (!vaultId || !ownerWallet || !address || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/vault/${vaultId}/set-kast-destination`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-owner-wallet": ownerWallet,
        },
        body: JSON.stringify({ address, ownerWallet }),
      });
      const d = await r.json();
      if (d?.ok) {
        setSaved(true);
      } else {
        setError(d?.message ?? d?.error ?? "save failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DevicePanel
      open={open}
      onClose={onClose}
      title="Send earnings to KAST"
      subtitle="Real-world payoff loop"
    >
      <div className="px-5 pb-6 pt-3 flex flex-col gap-4">
        <p className="text-[12.5px] leading-[1.55]" style={{ color: "#6B7280" }}>
          Agent earnings can flow directly into a KAST-funded card via USDC.
          Paste your KAST Solana USDC deposit address; we&apos;ll allowlist it
          as <code className="font-mono">MY_KAST</code>. Every payout to that
          address is a real on-chain transfer that tops up your card.
        </p>

        {/* Three-step howto */}
        <div
          className="rounded-[12px] p-3.5"
          style={{
            background: "linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)",
            border: "1px solid rgba(249,115,22,0.18)",
          }}
        >
          <div
            className="flex items-center gap-2 mb-2"
          >
            <CreditCard
              className="w-4 h-4"
              strokeWidth={1.6}
              style={{ color: "#EA580C" }}
            />
            <span
              className="font-mono uppercase tracking-[0.16em]"
              style={{ fontSize: 9.5, color: "#7C3F19" }}
            >
              Setup · 30 seconds
            </span>
          </div>
          <ol className="space-y-1.5 text-[12.5px] leading-[1.5]" style={{ color: "#7C3F19" }}>
            <li>1. Open the KAST app → <em>Deposit</em> → <em>Solana USDC</em>.</li>
            <li>2. Copy the address shown.</li>
            <li>3. Paste it below + tap <em>Allowlist as MY_KAST</em>.</li>
          </ol>
        </div>

        {/* Address input */}
        <div className="flex flex-col gap-2">
          <label
            className="font-mono uppercase tracking-[0.14em]"
            style={{ fontSize: 9.5, color: "#9CA3AF" }}
          >
            KAST Solana USDC deposit address
          </label>
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setSaved(false);
            }}
            placeholder="Paste from KAST app · Deposit · Solana USDC"
            className="font-mono text-[12.5px] rounded-[10px] px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-200"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(15,23,42,0.10)",
            }}
          />
          {error && (
            <p className="text-[11px]" style={{ color: "#B45309" }}>
              {error}
            </p>
          )}
        </div>

        {/* Save button */}
        <motion.button
          type="button"
          disabled={!address || busy || saved}
          onClick={save}
          whileTap={{ scale: 0.99 }}
          className="rounded-[12px] py-2.5 px-3.5 font-semibold text-[13px] tracking-[-0.005em] disabled:opacity-50 transition flex items-center justify-center gap-1.5"
          style={{
            background: saved ? "#15803D" : "#0A0A0A",
            color: "#FFFFFF",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08), 0 6px 16px -6px rgba(0,0,0,0.20)",
          }}
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Allowlisted as MY_KAST
            </>
          ) : busy ? (
            "Saving on-chain…"
          ) : (
            <>
              Allowlist as MY_KAST
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </>
          )}
        </motion.button>

        {/* Affiliate link */}
        <a
          href={KAST_AFFILIATE}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-[12px] p-3.5 transition active:scale-[0.99] hover:shadow-md"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div>
            <div
              className="font-mono uppercase tracking-[0.14em] mb-0.5"
              style={{ fontSize: 9.5, color: "#9CA3AF" }}
            >
              Don&apos;t have a card?
            </div>
            <div
              className="text-[13px] font-semibold tracking-[-0.005em]"
              style={{ color: "#0A0A0A" }}
            >
              Get a KAST card
            </div>
          </div>
          <ExternalLink className="w-4 h-4" strokeWidth={2} style={{ color: "#0A0A0A" }} />
        </a>

        <p className="text-[10.5px]" style={{ color: "#9CA3AF" }}>
          Kyvern is <em>compatible with KAST deposit rails</em>. Not affiliated
          with KAST. We don&apos;t verify the address belongs to a KAST
          account — you own the address either way.
        </p>
      </div>
    </DevicePanel>
  );
}
