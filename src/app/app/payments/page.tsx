"use client";

/* ════════════════════════════════════════════════════════════════════
   /app/payments — unified payment feed (both sides).

   Merges the Pulse recent-transactions feed (inbound, services receiving)
   with each vault's last payment (outbound, agents paying). Sorted by
   recency. Every row is clickable through to Solana Explorer.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const EASE = [0.25, 0.1, 0.25, 1] as const;

type Side = "pay" | "earn";

interface FeedRow {
  key: string;
  side: Side;
  merchantOrAgent: string;
  amountUsd: number;
  status: "allowed" | "blocked" | "settled" | "failed" | "received";
  at: string;
  tx: string | null;
  network: "devnet" | "mainnet" | "base" | "stellar" | string;
}

function devFallbackWallet(): string {
  if (typeof window === "undefined")
    return "DevPlaceholderWallet11111111111111111111111";
  const KEY = "kyvern:dev-wallet";
  const existing = window.localStorage.getItem(KEY);
  if (existing) return existing;
  const alphabet =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  window.localStorage.setItem(KEY, s);
  return s;
}

function fmtUsd(n: number): string {
  if (!n) return "$0";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(n < 10 ? 2 : 0)}`;
}

function relTime(iso: string): string {
  try {
    const d =
      iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso)
        ? new Date(iso)
        : new Date(iso.replace(" ", "T") + "Z");
    const diff = Date.now() - d.getTime();
    const s = Math.floor(diff / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

function explorerUrl(
  tx: string | null,
  network: string,
): string | null {
  if (!tx) return null;
  if (network === "base") return `https://basescan.org/tx/${tx}`;
  if (network === "stellar")
    return `https://stellar.expert/explorer/public/tx/${tx}`;
  const base = `https://explorer.solana.com/tx/${tx}`;
  return network === "devnet" ? `${base}?cluster=devnet` : base;
}

export default function AppPaymentsPage() {
  const { wallet, isLoading: authLoading } = useAuth();
  const [owner, setOwner] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | "pay" | "earn">("all");

  useEffect(() => {
    if (authLoading) return;
    setOwner(wallet ?? devFallbackWallet());
  }, [wallet, authLoading]);

  useEffect(() => {
    if (!owner) return;
    let cancelled = false;
    Promise.allSettled([
      fetch(`/api/vault/list?ownerWallet=${encodeURIComponent(owner)}`)
        .then((r) => (r.ok ? r.json() : { vaults: [] })),
      fetch(`/api/pulse/recent?limit=30`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { events: [] })),
    ]).then(([paySettled, earnSettled]) => {
      if (cancelled) return;
      const rows: FeedRow[] = [];

      if (paySettled.status === "fulfilled") {
        const { vaults = [] } = (paySettled.value as {
          vaults?: Array<{
            vault: { id: string; name: string; network: string };
            lastPayment: {
              merchant: string;
              amountUsd: number;
              status: FeedRow["status"];
              createdAt: string;
            } | null;
          }>;
        }) ?? {};
        for (const v of vaults) {
          const p = v.lastPayment;
          if (!p) continue;
          rows.push({
            key: `pay-${v.vault.id}`,
            side: "pay",
            merchantOrAgent: `${v.vault.name} → ${p.merchant}`,
            amountUsd: p.amountUsd,
            status: p.status,
            at: p.createdAt,
            tx: null,
            network: v.vault.network,
          });
        }
      }

      if (earnSettled.status === "fulfilled") {
        const { events = [] } = (earnSettled.value as {
          events?: Array<{
            id: string;
            endpoint: string;
            payer_address: string;
            amount_usd: number;
            tx_hash?: string | null;
            network?: string;
            created_at: string;
          }>;
        }) ?? {};
        for (const e of events) {
          rows.push({
            key: `earn-${e.id}`,
            side: "earn",
            merchantOrAgent: `${e.payer_address.slice(0, 6)}… → ${e.endpoint}`,
            amountUsd: e.amount_usd,
            status: "received",
            at: e.created_at,
            tx: e.tx_hash ?? null,
            network: e.network ?? "devnet",
          });
        }
      }

      rows.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
      setFeed(rows.slice(0, 50));
    });
    return () => {
      cancelled = true;
    };
  }, [owner]);

  const filtered = useMemo(() => {
    if (!feed) return null;
    if (filter === "all") return feed;
    return feed.filter((r) => r.side === filter);
  }, [feed, filter]);

  return (
    <div className="space-y-7 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="pt-2"
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5"
          style={{ color: "var(--text-quaternary)" }}
        >
          On-chain truth
        </p>
        <h1
          className="tracking-[-0.035em] text-balance"
          style={{
            fontSize: "clamp(30px, 4.2vw, 42px)",
            lineHeight: 1.02,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Activity.
        </h1>
        <p
          className="mt-2 text-[14.5px] leading-[1.55] max-w-[580px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Every decision your agents made and every payment your services
          captured, in one stream. Blocked calls are real failed Solana
          transactions — not soft refusals from our backend. Click any row to
          verify on Explorer.
        </p>
      </motion.div>

      {/* Filters */}
      <div
        className="inline-flex items-center gap-1 p-1 rounded-[10px]"
        style={{
          background: "var(--surface-2)",
          border: "0.5px solid var(--border-subtle)",
        }}
      >
        {(["all", "pay", "earn"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className="h-7 px-3 rounded-[7px] text-[12px] font-medium transition-all"
            style={{
              background: filter === v ? "var(--surface)" : "transparent",
              color:
                filter === v ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow:
                filter === v ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
            }}
          >
            {v === "all"
              ? "All"
              : v === "pay"
                ? "Outgoing"
                : "Inbound"}
          </button>
        ))}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
        className="rounded-[18px] overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border-subtle)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        {filtered === null ? (
          <div className="p-8 space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 rounded-md animate-pulse"
                style={{ background: "var(--surface-2)" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Activity
              className="w-5 h-5 mx-auto mb-2"
              style={{ color: "var(--text-quaternary)" }}
            />
            <p
              className="text-[14px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              No payments yet.
            </p>
            <p
              className="text-[12.5px] mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Deploy an agent or wrap an endpoint — every on-chain decision will stream in here.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Link
                href="/vault/new"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[12.5px] font-semibold"
                style={{ background: "#4F46E5", color: "white" }}
              >
                Deploy agent <ArrowRight className="w-3 h-3" />
              </Link>
              <Link
                href="/app/services"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[12.5px] font-semibold"
                style={{
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  border: "0.5px solid var(--border)",
                }}
              >
                Wrap endpoint <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((row) => (
              <FeedRowView key={row.key} row={row} />
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}

function FeedRowView({ row }: { row: FeedRow }) {
  const isBlocked = row.status === "blocked" || row.status === "failed";
  const isPay = row.side === "pay";
  const url = explorerUrl(row.tx, row.network);

  return (
    <li className="px-5 py-3.5 hover:bg-[var(--surface-2)] transition-colors">
      <div className="flex items-center gap-4">
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
          style={{
            background: isBlocked
              ? "#FEF2F2"
              : isPay
                ? "#EEF0FF"
                : "#E8F4FE",
            color: isBlocked ? "#DC2626" : isPay ? "#4F46E5" : "#0EA5E9",
          }}
        >
          {isBlocked ? (
            <span className="text-[14px] leading-none font-bold">✕</span>
          ) : isPay ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowUpRight className="w-4 h-4 rotate-180" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className="text-[13.5px] font-medium truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {row.merchantOrAgent}
            </p>
            {isBlocked && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "#FEF2F2", color: "#B91C1C" }}
              >
                {row.status === "failed" ? "failed" : "blocked"}
              </span>
            )}
          </div>
          <p
            className="mt-0.5 text-[11.5px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {relTime(row.at)} · {row.network}
            {url && (
              <>
                {" · "}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 hover:underline"
                  style={{ color: "var(--text-secondary)" }}
                >
                  view tx <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className={`text-[14px] font-mono-numbers font-semibold ${
              isBlocked ? "line-through" : ""
            }`}
            style={{
              color: isBlocked
                ? "var(--text-tertiary)"
                : "var(--text-primary)",
            }}
          >
            {isPay ? "−" : "+"}
            {fmtUsd(row.amountUsd)}
          </p>
        </div>
      </div>
    </li>
  );
}
