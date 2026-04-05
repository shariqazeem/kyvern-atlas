import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// --- Types ---

interface Insight {
  id: string;
  type: "growth" | "warning" | "celebration" | "info";
  title: string;
  message: string;
  icon: string;
}

interface WeeklyStats {
  revenue: number;
  calls: number;
  customers: number;
}

interface EndpointWeekly {
  endpoint: string;
  this_week_revenue: number;
  last_week_revenue: number;
  this_week_calls: number;
  last_week_calls: number;
  avg_latency: number;
}

interface NewAgent {
  address: string;
  revenue: number;
}

interface TopCustomer {
  address: string;
  revenue: number;
}

// --- In-memory cache: apiKeyId -> { insights, timestamp } ---

const insightsCache = new Map<
  string,
  { insights: Insight[]; timestamp: number }
>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// --- Heuristic Insight Generators ---

function revenueTrendInsight(
  thisWeek: WeeklyStats,
  lastWeek: WeeklyStats,
  topEndpoint: string | null
): Insight | null {
  if (lastWeek.revenue === 0 && thisWeek.revenue === 0) return null;

  if (lastWeek.revenue === 0 && thisWeek.revenue > 0) {
    return {
      id: "revenue-trend",
      type: "celebration",
      title: "First Revenue Week",
      message: `You earned $${thisWeek.revenue.toFixed(2)} this week across ${thisWeek.calls} calls. Great start!`,
      icon: "",
    };
  }

  const pctChange =
    ((thisWeek.revenue - lastWeek.revenue) / lastWeek.revenue) * 100;

  if (pctChange > 10) {
    const endpointNote = topEndpoint
      ? `, driven primarily by ${topEndpoint}`
      : "";
    return {
      id: "revenue-trend",
      type: "growth",
      title: "Revenue Growing",
      message: `Revenue is up ${Math.round(pctChange)}% this week${endpointNote}. You earned $${thisWeek.revenue.toFixed(2)} from ${thisWeek.calls} calls.`,
      icon: "",
    };
  }

  if (pctChange < -10) {
    const endpointNote = topEndpoint ? ` \u2014 ${topEndpoint} saw fewer calls` : "";
    return {
      id: "revenue-trend",
      type: "warning",
      title: "Revenue Declined",
      message: `Revenue dropped ${Math.abs(Math.round(pctChange))}% compared to last week${endpointNote}. Consider reviewing your pricing or uptime.`,
      icon: "",
    };
  }

  return null;
}

function newAgentInsight(newAgents: NewAgent[]): Insight | null {
  if (newAgents.length === 0) return null;

  const totalRevenue = newAgents.reduce((sum, a) => sum + a.revenue, 0);

  return {
    id: "new-agents",
    type: "info",
    title: "New Agents Detected",
    message: `${newAgents.length} new agent${newAgents.length === 1 ? "" : "s"} discovered your endpoints this week, contributing $${totalRevenue.toFixed(2)} in revenue.`,
    icon: "",
  };
}

function topCustomerConcentrationInsight(
  topCustomers: TopCustomer[],
  totalRevenue: number
): Insight | null {
  if (totalRevenue === 0 || topCustomers.length === 0) return null;

  const top = topCustomers[0];
  const pct = (top.revenue / totalRevenue) * 100;

  if (pct > 30) {
    const shortAddr = `${top.address.slice(0, 6)}...${top.address.slice(-4)}`;
    return {
      id: "customer-concentration",
      type: "warning",
      title: "Revenue Concentration",
      message: `Agent ${shortAddr} accounts for ${Math.round(pct)}% of your revenue ($${top.revenue.toFixed(2)}). Consider diversifying your customer base.`,
      icon: "",
    };
  }

  return null;
}

function endpointPerformanceInsight(
  endpoints: EndpointWeekly[]
): Insight | null {
  if (endpoints.length === 0) return null;

  // Find fastest growing endpoint by revenue change
  let bestGrowth = -Infinity;
  let bestEndpoint: EndpointWeekly | null = null;

  for (const ep of endpoints) {
    if (ep.last_week_revenue === 0) continue;
    const growth =
      ((ep.this_week_revenue - ep.last_week_revenue) / ep.last_week_revenue) *
      100;
    if (growth > bestGrowth) {
      bestGrowth = growth;
      bestEndpoint = ep;
    }
  }

  if (bestEndpoint && bestGrowth > 15) {
    return {
      id: "endpoint-growth",
      type: "growth",
      title: "Endpoint Trending Up",
      message: `Your ${bestEndpoint.endpoint} endpoint is growing ${Math.round(bestGrowth)}% week-over-week \u2014 your fastest growing service.`,
      icon: "",
    };
  }

  return null;
}

function latencyWarningInsight(endpoints: EndpointWeekly[]): Insight | null {
  const slow = endpoints.filter((ep) => ep.avg_latency > 1000);
  if (slow.length === 0) return null;

  // Pick the slowest
  slow.sort((a, b) => b.avg_latency - a.avg_latency);
  const worst = slow[0];

  return {
    id: "latency-warning",
    type: "warning",
    title: "High Latency Detected",
    message: `${worst.endpoint} has high average latency (${Math.round(worst.avg_latency)}ms). This may affect agent satisfaction and call volume.`,
    icon: "",
  };
}

function revenueMilestoneInsight(
  totalAllTime: number,
  lastWeekTotal: number
): Insight | null {
  const milestones = [1000, 500, 100, 50, 10];
  for (const m of milestones) {
    // Crossed the milestone this week
    if (totalAllTime >= m && totalAllTime - lastWeekTotal < m) {
      return {
        id: "milestone",
        type: "celebration",
        title: `$${m} Milestone Reached`,
        message: `Congratulations! Your total revenue just crossed $${m}. You\u2019ve earned $${totalAllTime.toFixed(2)} all-time.`,
        icon: "",
      };
    }
  }

  return null;
}

// --- Main Logic ---

function generateInsights(apiKeyId: string): Insight[] {
  const db = getDb();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeekStart = oneWeekAgo.toISOString();
  const lastWeekStart = twoWeeksAgo.toISOString();
  const nowISO = now.toISOString();

  // 1. Weekly aggregates
  const thisWeek = db
    .prepare(
      `SELECT COALESCE(SUM(amount_usd), 0) as revenue, COUNT(*) as calls,
              COUNT(DISTINCT payer_address) as customers
       FROM events WHERE api_key_id = ? AND timestamp >= ? AND timestamp <= ?`
    )
    .get(apiKeyId, thisWeekStart, nowISO) as WeeklyStats;

  const lastWeek = db
    .prepare(
      `SELECT COALESCE(SUM(amount_usd), 0) as revenue, COUNT(*) as calls,
              COUNT(DISTINCT payer_address) as customers
       FROM events WHERE api_key_id = ? AND timestamp >= ? AND timestamp < ?`
    )
    .get(apiKeyId, lastWeekStart, thisWeekStart) as WeeklyStats;

  // 2. Top endpoint this week by revenue
  const topEndpointRow = db
    .prepare(
      `SELECT endpoint, SUM(amount_usd) as rev
       FROM events WHERE api_key_id = ? AND timestamp >= ?
       GROUP BY endpoint ORDER BY rev DESC LIMIT 1`
    )
    .get(apiKeyId, thisWeekStart) as
    | { endpoint: string; rev: number }
    | undefined;

  // 3. New agents (first seen in last 7 days)
  const newAgents = db
    .prepare(
      `SELECT payer_address as address, SUM(amount_usd) as revenue
       FROM events WHERE api_key_id = ? AND payer_address IN (
         SELECT payer_address FROM events WHERE api_key_id = ?
         GROUP BY payer_address HAVING MIN(timestamp) >= ?
       ) AND timestamp >= ?
       GROUP BY payer_address`
    )
    .all(apiKeyId, apiKeyId, thisWeekStart, thisWeekStart) as NewAgent[];

  // 4. Top customers (all-time) for concentration check
  const topCustomers = db
    .prepare(
      `SELECT payer_address as address, SUM(amount_usd) as revenue
       FROM events WHERE api_key_id = ?
       GROUP BY payer_address ORDER BY revenue DESC LIMIT 5`
    )
    .all(apiKeyId) as TopCustomer[];

  const totalAllTime = db
    .prepare(
      `SELECT COALESCE(SUM(amount_usd), 0) as total
       FROM events WHERE api_key_id = ?`
    )
    .get(apiKeyId) as { total: number };

  // 5. Endpoint-level weekly comparison
  const endpointRows = db
    .prepare(
      `SELECT
         endpoint,
         SUM(CASE WHEN timestamp >= ? THEN amount_usd ELSE 0 END) as this_week_revenue,
         SUM(CASE WHEN timestamp >= ? AND timestamp < ? THEN amount_usd ELSE 0 END) as last_week_revenue,
         SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) as this_week_calls,
         SUM(CASE WHEN timestamp >= ? AND timestamp < ? THEN 1 ELSE 0 END) as last_week_calls,
         AVG(CASE WHEN timestamp >= ? THEN latency_ms END) as avg_latency
       FROM events WHERE api_key_id = ? AND timestamp >= ?
       GROUP BY endpoint`
    )
    .all(
      thisWeekStart,
      lastWeekStart,
      thisWeekStart,
      thisWeekStart,
      lastWeekStart,
      thisWeekStart,
      thisWeekStart,
      apiKeyId,
      lastWeekStart
    ) as EndpointWeekly[];

  // 6. Collect all candidate insights
  const candidates: Insight[] = [];

  const trend = revenueTrendInsight(
    thisWeek,
    lastWeek,
    topEndpointRow?.endpoint || null
  );
  if (trend) candidates.push(trend);

  const agents = newAgentInsight(newAgents);
  if (agents) candidates.push(agents);

  const concentration = topCustomerConcentrationInsight(
    topCustomers,
    totalAllTime.total
  );
  if (concentration) candidates.push(concentration);

  const epGrowth = endpointPerformanceInsight(endpointRows);
  if (epGrowth) candidates.push(epGrowth);

  const latency = latencyWarningInsight(endpointRows);
  if (latency) candidates.push(latency);

  const milestone = revenueMilestoneInsight(
    totalAllTime.total,
    thisWeek.revenue
  );
  if (milestone) candidates.push(milestone);

  // 7. Priority: celebrations > warnings > growth > info. Pick top 3.
  const priorityOrder: Record<Insight["type"], number> = {
    celebration: 0,
    warning: 1,
    growth: 2,
    info: 3,
  };

  candidates.sort(
    (a, b) => priorityOrder[a.type] - priorityOrder[b.type]
  );

  return candidates.slice(0, 3);
}

// --- Route Handler ---

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const apiKeyId = auth.apiKeyId;

    // Check cache
    const cached = insightsCache.get(apiKeyId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ insights: cached.insights });
    }

    // Generate fresh insights
    const insights = generateInsights(apiKeyId);

    // Store in cache
    insightsCache.set(apiKeyId, { insights, timestamp: Date.now() });

    return NextResponse.json({ insights });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST to force-refresh (invalidate cache)
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Invalidate cache for this user
    insightsCache.delete(auth.apiKeyId);

    // Generate fresh
    const insights = generateInsights(auth.apiKeyId);
    insightsCache.set(auth.apiKeyId, { insights, timestamp: Date.now() });

    return NextResponse.json({ insights });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
