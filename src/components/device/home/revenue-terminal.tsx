"use client";

/**
 * RevenueTerminal — the Phase 8 "external customer" card.
 *
 * Sits on /app between DiscoveryHero and LatestOpportunities. Shows
 * inbound USDC revenue from external buyers paying Atlas's x402 feed.
 * The first thing on /app that proves money is flowing IN, not just
 * shuffling between trio workers.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  REVENUE TERMINAL · LIVE                                     │
 *   │  $0.83 earned today                              ↑           │
 *   │  ──────────────────────────────────────                      │
 *   │  83 purchases · last buyer paid 12s ago                      │
 *   │  Public feed: kyvernlabs.com/api/atlas/feed  [Copy]      │
 *   │  ──────────────────────────────────────                      │
 *   │  · 8DhjK… paid $0.010 · 12s ago     ↗                        │
 *   │  · 8DhjK… paid $0.010 · 42s ago     ↗                        │
 *   │  · 8DhjK… paid $0.010 · 1m ago      ↗                        │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Polls /api/atlas/revenue every 5s. Empty state guides the user to
 * fund the buyer-bot wallet so revenue starts flowing.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Copy,
  Check,
  ExternalLink,
  Link2,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface RecentPurchase {
  id: string;
  signature: string;
  buyer: string;
  amountUsd: number;
  createdAt: number;
  explorerUrl: string;
}

interface RevenueData {
  totalRevenueUsd: number;
  totalPurchases: number;
  revenueTodayUsd: number;
  purchasesToday: number;
  lastPurchaseAt: number | null;
  secondsSinceLastPurchase: number | null;
  feedUrl: string;
  pricePerRequestUsd: number;
  recent: RecentPurchase[];
}

function fmtAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortPub(s: string): string {
  if (!s || s.length < 12) return s;
  return `${s.slice(0, 5)}…${s.slice(-4)}`;
}

function ScrambleAmount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(`$${value.toFixed(2)}`);
  const targetRef = useRef(display);
  useEffect(() => {
    const next = `$${value.toFixed(2)}`;
    if (next === targetRef.current) return;
    targetRef.current = next;
    const start = performance.now();
    const duration = 540;
    const charset = "0123456789";
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - start) / duration;
      if (t >= 1) {
        setDisplay(next);
        return;
      }
      const revealCount = Math.floor(next.length * t);
      let out = "";
      for (let i = 0; i < next.length; i++) {
        const c = next[i];
        if (i < revealCount || !/[0-9]/.test(c)) out += c;
        else out += charset[Math.floor(Math.random() * charset.length)];
      }
      setDisplay(out);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
}

export function RevenueTerminal() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [copied, setCopied] = useState(false);
  const prevPurchaseCountRef = useRef(0);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/atlas/revenue")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: RevenueData | null) => {
          if (!alive || !d) return;
          // Pulse on increment — fires every time totalPurchases ticks up.
          if (d.totalPurchases > prevPurchaseCountRef.current) {
            setPulseKey((k) => k + 1);
          }
          prevPurchaseCountRef.current = d.totalPurchases;
          setData(d);
        })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 5_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const onCopyFeed = async () => {
    if (!data?.feedUrl) return;
    try {
      await navigator.clipboard.writeText(data.feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  if (!data) return null;

  const hasRevenue = data.totalRevenueUsd > 0;
  const todayDisplay = data.revenueTodayUsd;

  // Empty state — no purchases yet
  if (!hasRevenue) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative w-full rounded-[16px] overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px dashed rgba(15,23,42,0.12)",
          boxShadow: "0 1px 2px rgba(15,23,42,0.03)",
        }}
      >
        <div className="px-4 pt-3 pb-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Activity
              className="w-3 h-3"
              strokeWidth={2.2}
              style={{ color: "#9CA3AF" }}
            />
            <span
              className="font-mono uppercase tracking-[0.14em]"
              style={{ color: "#9CA3AF", fontSize: 9.5, fontWeight: 600 }}
            >
              Revenue terminal
            </span>
          </div>
          <p className="text-[13px] text-[#374151] leading-[1.55] mb-2">
            Atlas&apos;s public x402 feed is online — waiting for the first
            paying customer.
          </p>
          <p
            className="font-mono text-[11px] leading-[1.55]"
            style={{ color: "#6B7280" }}
          >
            Public URL:{" "}
            <span style={{ color: "#0A0A0A" }}>{data.feedUrl}</span>
          </p>
          <p
            className="text-[11px] mt-1"
            style={{ color: "#9CA3AF", lineHeight: 1.5 }}
          >
            ${data.pricePerRequestUsd.toFixed(3)} USDC per request · external
            buyers settle on Solana devnet, send the signature back to claim a
            signal.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative w-full rounded-[18px] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 65%)",
        border: "1px solid rgba(34,197,94,0.20)",
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,1)",
          "0 1px 2px rgba(15,23,42,0.04)",
          "0 8px 22px -10px rgba(34,197,94,0.18)",
          "0 0 0 4px rgba(34,197,94,0.05)",
        ].join(", "),
      }}
    >
      {/* Pulse-on-purchase glow ring */}
      <AnimatePresence>
        {pulseKey > 0 && (
          <motion.span
            key={pulseKey}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[18px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{
              boxShadow:
                "inset 0 0 0 2px rgba(34,197,94,0.45), inset 0 0 32px rgba(34,197,94,0.18), 0 0 0 6px rgba(34,197,94,0.10)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Eyebrow */}
      <div className="relative px-5 pt-4 pb-1.5 flex items-center justify-between">
        <span
          className="font-mono uppercase tracking-[0.14em] inline-flex items-center gap-1.5"
          style={{ color: "#15803D", fontSize: 9.5, fontWeight: 600 }}
        >
          <Activity className="w-3 h-3" strokeWidth={2.2} />
          Revenue terminal
          <motion.span
            aria-hidden
            className="rounded-full ml-0.5"
            style={{
              width: 5,
              height: 5,
              background: "#22C55E",
              boxShadow: "0 0 0 2.5px rgba(34,197,94,0.14)",
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
        <span
          className="font-mono uppercase tracking-[0.10em]"
          style={{ color: "#9CA3AF", fontSize: 9.5 }}
        >
          {data.purchasesToday} today
        </span>
      </div>

      {/* Hero amount */}
      <div className="relative px-5 pb-3 flex items-baseline gap-2">
        <ScrambleAmount
          value={todayDisplay}
          className="font-mono text-[36px] sm:text-[48px] tracking-[-0.02em] font-light text-[#0A0A0A] leading-none"
        />
        <span
          className="text-[12.5px] font-medium"
          style={{ color: "#0A0A0A" }}
        >
          earned today
        </span>
      </div>

      {/* Sub-row pulse + total all-time */}
      <div
        className="relative px-5 py-2 flex items-center gap-2.5 flex-wrap"
        style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
      >
        <span
          className="font-mono"
          style={{
            color: "#374151",
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.10em", fontSize: 9.5 }}>
            All-time
          </span>{" "}
          <span style={{ color: "#0A0A0A", fontWeight: 600 }}>
            ${data.totalRevenueUsd.toFixed(2)}
          </span>{" "}
          across{" "}
          <span style={{ color: "#0A0A0A", fontWeight: 600 }}>
            {data.totalPurchases}
          </span>{" "}
          purchases
        </span>
        {data.secondsSinceLastPurchase != null && (
          <span
            className="ml-auto font-mono"
            style={{ color: "#15803D", fontSize: 11 }}
          >
            last buyer · {fmtAgo(data.lastPurchaseAt!)}
          </span>
        )}
      </div>

      {/* Feed URL with copy */}
      <div
        className="relative px-5 py-2.5 flex items-center gap-2 flex-nowrap"
        style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}
      >
        <span
          className="font-mono uppercase tracking-[0.10em] flex-none"
          style={{ color: "#9CA3AF", fontSize: 9.5 }}
        >
          Public feed
        </span>
        <span
          className="font-mono text-[11px] min-w-0 flex-1 truncate"
          style={{ color: "#0A0A0A" }}
          title={data.feedUrl}
        >
          {data.feedUrl}
        </span>
        <button
          type="button"
          onClick={onCopyFeed}
          className="rounded-full p-1.5 transition flex-none"
          style={{
            background: copied ? "rgba(34,197,94,0.12)" : "rgba(15,23,42,0.04)",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
          aria-label="Copy feed URL"
        >
          {copied ? (
            <Check className="w-3 h-3" strokeWidth={2.4} style={{ color: "#15803D" }} />
          ) : (
            <Copy className="w-3 h-3" strokeWidth={2} style={{ color: "#6B7280" }} />
          )}
        </button>
      </div>

      {/* Recent purchases */}
      {data.recent.length > 0 && (
        <ul
          className="divide-y"
          style={{
            borderTop: "1px solid rgba(15,23,42,0.06)",
            borderColor: "rgba(15,23,42,0.04)",
          }}
        >
          <AnimatePresence initial={false}>
            {data.recent.slice(0, 4).map((p) => (
              <RevenueRow key={p.id} purchase={p} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.div>
  );
}

function RevenueRow({ purchase }: { purchase: RecentPurchase }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: EASE }}
      className="px-5 py-2 flex items-center gap-2 flex-nowrap min-w-0"
    >
      <span
        className="font-mono flex-none"
        style={{ color: "#15803D", fontSize: 11, fontWeight: 600 }}
      >
        +${purchase.amountUsd.toFixed(3)}
      </span>
      <span
        className="font-mono text-[11px] min-w-0 truncate"
        style={{ color: "#374151" }}
      >
        from <span style={{ color: "#0A0A0A" }}>{shortPub(purchase.buyer)}</span>
      </span>
      <span
        className="font-mono flex-none ml-auto"
        style={{ color: "#9CA3AF", fontSize: 10.5 }}
      >
        {fmtAgo(purchase.createdAt)}
      </span>
      <a
        href={purchase.explorerUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono flex-none"
        style={{
          background: "rgba(34,197,94,0.10)",
          color: "#15803D",
          fontSize: 10.5,
        }}
        title="Open on Solana Explorer"
      >
        <Link2 className="w-2.5 h-2.5" strokeWidth={2.4} />
        <span className="hidden sm:inline">
          {purchase.signature.slice(0, 4)}…{purchase.signature.slice(-4)}
        </span>
        <ExternalLink className="w-2.5 h-2.5" />
      </a>
    </motion.li>
  );
}
