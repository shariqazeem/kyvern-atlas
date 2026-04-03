import { getDb } from "./db";

export const TIER_LIMITS = {
  free: {
    events_per_day: 1000,
    revenue_per_day_usd: 10,
    retention_days: 7,
    max_api_keys: 1,
    csv_export: false,
    alerts: false,
    pricing_benchmarks: false,
  },
  pro: {
    events_per_day: Infinity,
    revenue_per_day_usd: Infinity,
    retention_days: 90,
    max_api_keys: 10,
    csv_export: true,
    alerts: true,
    pricing_benchmarks: true,
  },
} as const;

export type Tier = "free" | "pro";

export function getTierForWallet(walletAddress: string): Tier {
  const db = getDb();
  const sub = db.prepare(
    "SELECT id FROM subscriptions WHERE wallet_address = ? AND status = 'active' AND expires_at > datetime('now') LIMIT 1"
  ).get(walletAddress.toLowerCase());
  return sub ? "pro" : "free";
}

export function getTierForApiKey(apiKeyId: string): Tier {
  const db = getDb();
  const key = db.prepare("SELECT wallet_address FROM api_keys WHERE id = ?").get(apiKeyId) as
    | { wallet_address: string | null }
    | undefined;
  if (!key?.wallet_address) return "free";
  return getTierForWallet(key.wallet_address);
}

export function checkUsageLimit(apiKeyId: string): {
  allowed: boolean;
  events_used: number;
  events_limit: number;
  revenue_used: number;
  revenue_limit: number;
  tier: Tier;
} {
  const db = getDb();
  const tier = getTierForApiKey(apiKeyId);
  const limits = TIER_LIMITS[tier];

  if (tier === "pro") {
    return {
      allowed: true,
      events_used: 0,
      events_limit: Infinity,
      revenue_used: 0,
      revenue_limit: Infinity,
      tier,
    };
  }

  const today = new Date().toISOString().split("T")[0];

  const usage = db.prepare(`
    SELECT COUNT(*) as event_count, COALESCE(SUM(amount_usd), 0) as revenue
    FROM events
    WHERE api_key_id = ? AND date(timestamp) = ?
  `).get(apiKeyId, today) as { event_count: number; revenue: number };

  const eventsExceeded = usage.event_count >= limits.events_per_day;
  const revenueExceeded = usage.revenue >= limits.revenue_per_day_usd;

  return {
    allowed: !eventsExceeded && !revenueExceeded,
    events_used: usage.event_count,
    events_limit: limits.events_per_day,
    revenue_used: Math.round(usage.revenue * 100) / 100,
    revenue_limit: limits.revenue_per_day_usd,
    tier,
  };
}

export function getRetentionDays(tier: Tier): number {
  return TIER_LIMITS[tier].retention_days;
}
