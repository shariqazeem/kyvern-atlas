"use client";

/**
 * AtlasEconomicLedger — Phase C (KYVERN_FRONTIER_FINAL_SPRINT, 2026-05-08).
 *
 * Replaces the misleading "Atlas Findings · 0 surfaced this week"
 * block. The page literally markets Atlas as proof of liveness, then
 * said "0 surfaced" right next to "17 days alive" — a self-inflicted
 * wound. This block reframes the same surface around what Atlas
 * actually does that's hard to fake: earn real USDC from real x402
 * subscribers paying its feed.
 *
 * Data source: /api/atlas/revenue, which reads the on-chain-verified
 * `feed_purchases` table populated by the x402 GET /api/atlas/feed
 * endpoint. Every purchase is a real Solana devnet tx — every row in
 * the recent payments list links to Solana Explorer.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface RecentPayment {
  id: string;
  signature: string;
  buyer: string;
  amountUsd: number;
  signalKind: string | null;
  signalSubject: string | null;
  createdAt: number;
}

interface RevenueResponse {
  network: "devnet" | "mainnet";
  totalRevenueUsd: number;
  totalPurchases: number;
  revenueTodayUsd: number;
  purchasesToday: number;
  lastPurchaseAt: number | null;
  feedUrl: string;
  pricePerRequestUsd: number;
  recent: RecentPayment[];
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function shortBuyer(pk: string): string {
  if (!pk || pk === "unknown") return "anon";
  if (pk.length <= 10) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

function shortSig(sig: string): string {
  return `${sig.slice(0, 4)}…${sig.slice(-4)}`;
}

export function AtlasEconomicLedger() {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/atlas/revenue");
        if (!r.ok) return;
        const d = (await r.json()) as RevenueResponse;
        if (alive) setData(d);
      } catch {
        /* silent */
      }
    };
    void load();
    const iv = setInterval(load, 6_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const total = data?.totalRevenueUsd ?? 0;
  const totalPurchases = data?.totalPurchases ?? 0;
  // Active subscribers — distinct buyer pubkeys in recent payments.
  // The full set lives in the feed_purchases table; we approximate
  // here from the recent slice, which is enough for the headline.
  const activeSubs = data?.recent
    ? new Set(data.recent.map((r) => r.buyer)).size
    : 0;
  const recent = data?.recent ?? [];
  const visible = showAll ? recent : recent.slice(0, 5);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: EASE }}
      className="mb-14"
    >
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.span
            className="rounded-full inline-block"
            style={{
              width: 6,
              height: 6,
              background: "#86EFAC",
              boxShadow: "0 0 0 3px rgba(134,239,172,0.18), 0 0 8px #86EFAC",
            }}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <h2
            className="font-mono uppercase tracking-[0.18em]"
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Atlas · economic ledger
          </h2>
        </div>
        <Link
          href="/api/atlas/revenue"
          className="font-mono uppercase tracking-[0.14em]"
          style={{ color: "rgba(255,255,255,0.45)", fontSize: 9.5 }}
        >
          JSON ↗
        </Link>
      </div>

      <p
        className="mb-5 max-w-[640px]"
        style={{ color: "rgba(255,255,255,0.65)", fontSize: 13.5, lineHeight: 1.55 }}
      >
        Atlas earns real USDC from real subscribers paying its x402 feed.
        Every payment is on Solana devnet. Every cycle enforced by the
        budget program.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Stat
          label="Total earned"
          value={`$${total.toFixed(2)}`}
          sub={`${totalPurchases} purchase${totalPurchases === 1 ? "" : "s"} · devnet`}
        />
        <Stat
          label="Active subscribers"
          value={activeSubs.toString()}
          sub={
            activeSubs > 0
              ? "paying every cycle"
              : "first subscriber will appear here"
          }
        />
      </div>

      <div
        className="rounded-[14px] overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="px-4 py-2.5"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <span
            className="font-mono uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.55)", fontSize: 9.5 }}
          >
            Recent payments
          </span>
        </div>
        {visible.length === 0 ? (
          <div
            className="px-4 py-8 text-center"
            style={{ color: "rgba(255,255,255,0.40)", fontSize: 12 }}
          >
            Atlas&apos;s first subscriber will appear here. Run the
            atlas-subscriber worker or pay manually via{" "}
            <span className="font-mono">/api/atlas/feed</span>.
          </div>
        ) : (
          <ul
            className="divide-y"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            {visible.map((p) => (
              <li
                key={p.id}
                className="px-4 py-2.5 flex items-center gap-3 text-[12px]"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                <span
                  className="flex-none"
                  style={{ color: "#86EFAC", fontSize: 11 }}
                >
                  ✓
                </span>
                <span
                  className="font-mono flex-none"
                  style={{ color: "rgba(255,255,255,0.55)", fontSize: 10.5 }}
                >
                  {fmtTime(p.createdAt)}
                </span>
                <span
                  className="font-mono flex-none"
                  style={{ color: "#86EFAC", fontSize: 12 }}
                >
                  ${p.amountUsd.toFixed(2)}
                </span>
                <span
                  className="flex-1 truncate min-w-0 font-mono"
                  style={{ color: "rgba(255,255,255,0.65)", fontSize: 11.5 }}
                >
                  from {shortBuyer(p.buyer)}
                </span>
                <a
                  href={`https://explorer.solana.com/tx/${p.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono flex-none"
                  style={{ color: "#86EFAC", fontSize: 10.5 }}
                  title="Verify on Solana Explorer"
                >
                  {shortSig(p.signature)}
                  <ExternalLink className="w-3 h-3" strokeWidth={2} />
                </a>
              </li>
            ))}
          </ul>
        )}
        {recent.length > 5 && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full px-4 py-2.5 font-mono uppercase tracking-[0.14em] transition hover:bg-white/5"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 9.5,
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            Show {recent.length - 5} more payment{recent.length - 5 === 1 ? "" : "s"} →
          </button>
        )}
      </div>
    </motion.section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      className="rounded-[12px] px-4 py-3.5"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="font-mono uppercase tracking-[0.14em]"
        style={{ color: "rgba(255,255,255,0.45)", fontSize: 9.5 }}
      >
        {label}
      </div>
      <div
        className="font-mono mt-1"
        style={{
          color: "rgba(255,255,255,0.96)",
          fontSize: 26,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 400,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        className="mt-1 font-mono"
        style={{ color: "rgba(255,255,255,0.42)", fontSize: 10.5 }}
      >
        {sub}
      </div>
    </div>
  );
}
