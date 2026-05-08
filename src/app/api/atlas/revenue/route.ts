import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/atlas/revenue — public observability for the Revenue
 * Terminal card on /app.
 *
 * Returns rolled-up stats from the feed_purchases table:
 *   · totalRevenueUsd · totalPurchases · today + last 5 buyer pulses
 *
 * No auth — everything is already public on Explorer.
 *
 * Forced dynamic — without this, Next.js caches the empty first
 * response forever (the route has no request input, so it's treated
 * as static). The buyer-bot lands purchases every 30s; we need
 * fresh DB reads on every poll.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PurchaseRow {
  id: string;
  signature: string;
  buyer_pubkey: string;
  amount_usd: number;
  signal_kind: string | null;
  signal_subject: string | null;
  created_at: number;
}

const NETWORK: "devnet" | "mainnet" = "devnet";

export async function GET() {
  const db = getDb();
  const now = Date.now();
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const todayMs = todayMidnight.getTime();

  let totalRevenueUsd = 0;
  let totalPurchases = 0;
  let revenueTodayUsd = 0;
  let purchasesToday = 0;
  let lastPurchaseAt: number | null = null;
  let recent: PurchaseRow[] = [];

  try {
    const totals = db
      .prepare(
        `SELECT COUNT(*) AS c, COALESCE(SUM(amount_usd), 0) AS s, MAX(created_at) AS last
           FROM feed_purchases`,
      )
      .get() as { c: number; s: number; last: number | null };
    totalPurchases = totals.c;
    totalRevenueUsd = Number(totals.s) || 0;
    lastPurchaseAt = totals.last ?? null;

    const today = db
      .prepare(
        `SELECT COUNT(*) AS c, COALESCE(SUM(amount_usd), 0) AS s
           FROM feed_purchases WHERE created_at >= ?`,
      )
      .get(todayMs) as { c: number; s: number };
    purchasesToday = today.c;
    revenueTodayUsd = Number(today.s) || 0;

    recent = db
      .prepare(
        `SELECT id, signature, buyer_pubkey, amount_usd, signal_kind, signal_subject, created_at
           FROM feed_purchases
          ORDER BY created_at DESC LIMIT 8`,
      )
      .all() as PurchaseRow[];
  } catch {
    /* table not yet present in this environment — return empty rollup */
  }

  return NextResponse.json({
    network: NETWORK,
    totalRevenueUsd,
    totalPurchases,
    revenueTodayUsd,
    purchasesToday,
    lastPurchaseAt,
    secondsSinceLastPurchase:
      lastPurchaseAt != null ? Math.floor((now - lastPurchaseAt) / 1000) : null,
    feedUrl: "https://kyvernlabs.com/api/atlas/feed",
    pricePerRequestUsd: 0.01,
    recent: recent.map((r) => ({
      id: r.id,
      signature: r.signature,
      buyer: r.buyer_pubkey,
      amountUsd: r.amount_usd,
      signalKind: r.signal_kind,
      signalSubject: r.signal_subject,
      createdAt: r.created_at,
      explorerUrl: `https://explorer.solana.com/tx/${r.signature}?cluster=${NETWORK}`,
    })),
  });
}
