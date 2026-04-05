import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Heuristic query matcher — maps natural language to data queries
// No LLM needed. Pattern-matched against common questions.
function classifyQuery(query: string): string {
  const q = query.toLowerCase();
  if (q.match(/revenue.*(week|7d|7 day|this week)/)) return "revenue_week";
  if (q.match(/revenue.*(month|30d|30 day|this month)/)) return "revenue_month";
  if (q.match(/revenue.*(today|24h|today)/)) return "revenue_today";
  if (q.match(/revenue|earn|income|money|mak/)) return "revenue_overview";
  if (q.match(/top.*(customer|agent|payer|wallet)|who.*pay|biggest.*spend/)) return "top_customers";
  if (q.match(/churn|risk|leaving|ghost|lost|inactive/)) return "churn_risk";
  if (q.match(/endpoint.*(profit|best|top|most)|most.*profit|which.*endpoint/)) return "top_endpoints";
  if (q.match(/trend|grow|forecast|predict|future|project/)) return "trend";
  if (q.match(/price|pricing|compet|benchmark|market|compar/)) return "pricing";
  if (q.match(/new.*(agent|customer)|first.*(time|seen)/)) return "new_agents";
  if (q.match(/error|fail|latency|slow|performance/)) return "performance";
  if (q.match(/summary|overview|how.*doing|status|health/)) return "summary";
  return "general";
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { query } = await request.json();
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const db = getDb();
    const apiKeyId = auth.apiKeyId;
    const intent = classifyQuery(query);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const today = new Date().toISOString().split("T")[0];

    let response = "";
    let data: Record<string, unknown> = {};

    switch (intent) {
      case "revenue_week":
      case "revenue_month":
      case "revenue_today":
      case "revenue_overview": {
        const since = intent === "revenue_today" ? `${today}T00:00:00Z`
          : intent === "revenue_week" ? sevenDaysAgo : thirtyDaysAgo;
        const period = intent === "revenue_today" ? "today"
          : intent === "revenue_week" ? "this week" : "this month";

        const stats = db.prepare(`
          SELECT COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
                 COUNT(DISTINCT payer_address) as customers,
                 COUNT(DISTINCT endpoint) as endpoints
          FROM events WHERE api_key_id = ? AND timestamp >= ?
        `).get(apiKeyId, since) as { calls: number; revenue: number; customers: number; endpoints: number };

        const topEp = db.prepare(`
          SELECT endpoint, ROUND(SUM(amount_usd), 4) as revenue
          FROM events WHERE api_key_id = ? AND timestamp >= ?
          GROUP BY endpoint ORDER BY revenue DESC LIMIT 1
        `).get(apiKeyId, since) as { endpoint: string; revenue: number } | undefined;

        response = `Your revenue ${period}: ${formatCurrency(stats.revenue || 0)} from ${stats.calls} transactions across ${stats.endpoints} endpoints, served ${stats.customers} unique agents.`;
        if (topEp) response += ` Top earner: ${topEp.endpoint} (${formatCurrency(topEp.revenue)}).`;

        data = { stats: { revenue: stats.revenue, calls: stats.calls, customers: stats.customers, endpoints: stats.endpoints } };
        break;
      }

      case "top_customers": {
        const customers = db.prepare(`
          SELECT payer_address as address, ROUND(SUM(amount_usd), 4) as total_spent,
                 COUNT(*) as call_count
          FROM events WHERE api_key_id = ? AND timestamp >= ?
          GROUP BY payer_address ORDER BY total_spent DESC LIMIT 5
        `).all(apiKeyId, thirtyDaysAgo);

        response = `Your top 5 customers this month:`;
        (customers as Array<{ address: string; total_spent: number; call_count: number }>).forEach((c, i) => {
          response += `\n${i + 1}. ${c.address.slice(0, 10)}... — ${formatCurrency(c.total_spent)} (${c.call_count} calls)`;
        });
        data = { customers };
        break;
      }

      case "churn_risk": {
        const ghosts = db.prepare(`
          SELECT payer_address as address, ROUND(SUM(amount_usd), 4) as total_spent,
                 MAX(timestamp) as last_seen
          FROM events WHERE api_key_id = ?
          GROUP BY payer_address
          HAVING julianday('now') - julianday(MAX(timestamp)) > 7
          ORDER BY total_spent DESC LIMIT 5
        `).all(apiKeyId) as Array<{ address: string; total_spent: number; last_seen: string }>;

        if (ghosts.length === 0) {
          response = "No agents are currently at risk of churning. All your customers have been active in the last 7 days.";
        } else {
          const totalAtRisk = ghosts.reduce((s, g) => s + g.total_spent, 0);
          response = `${ghosts.length} agent(s) at risk of churning. Total revenue at risk: ${formatCurrency(totalAtRisk)}.`;
          ghosts.forEach((g) => {
            const daysAgo = Math.floor((Date.now() - new Date(g.last_seen).getTime()) / 86400000);
            response += `\n• ${g.address.slice(0, 10)}... — ${formatCurrency(g.total_spent)} spent, last seen ${daysAgo} days ago`;
          });
        }
        data = { customers: ghosts };
        break;
      }

      case "top_endpoints": {
        const endpoints = db.prepare(`
          SELECT endpoint as path, COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
                 ROUND(AVG(amount_usd), 6) as avg_price
          FROM events WHERE api_key_id = ? AND timestamp >= ?
          GROUP BY endpoint ORDER BY revenue DESC LIMIT 5
        `).all(apiKeyId, thirtyDaysAgo);

        response = "Your top endpoints by revenue (last 30 days):";
        (endpoints as Array<{ path: string; calls: number; revenue: number; avg_price: number }>).forEach((ep, i) => {
          response += `\n${i + 1}. ${ep.path} — ${formatCurrency(ep.revenue)} from ${ep.calls} calls (avg ${formatCurrency(ep.avg_price)}/call)`;
        });
        data = { endpoints };
        break;
      }

      case "trend": {
        const daily = db.prepare(`
          SELECT date(timestamp) as date, ROUND(SUM(amount_usd), 4) as revenue, COUNT(*) as calls
          FROM events WHERE api_key_id = ? AND timestamp >= ?
          GROUP BY date(timestamp) ORDER BY date ASC
        `).all(apiKeyId, new Date(Date.now() - 14 * 86400000).toISOString()) as Array<{ date: string; revenue: number; calls: number }>;

        if (daily.length < 2) {
          response = "Not enough data for trend analysis yet. Keep receiving payments and check back in a few days.";
        } else {
          const recent7 = daily.slice(-7);
          const prev7 = daily.slice(-14, -7);
          const recentRev = recent7.reduce((s, d) => s + d.revenue, 0);
          const prevRev = prev7.reduce((s, d) => s + d.revenue, 0);
          const change = prevRev > 0 ? ((recentRev - prevRev) / prevRev * 100).toFixed(1) : "N/A";

          response = `Revenue trend (14-day view):\n• Last 7 days: ${formatCurrency(recentRev)}\n• Previous 7 days: ${formatCurrency(prevRev)}\n• Change: ${change}%`;
          if (Number(change) > 0) response += "\n\n📈 Revenue is growing. Keep it up!";
          else if (Number(change) < -10) response += "\n\n📉 Revenue declined. Check if any top agents reduced usage.";
        }
        break;
      }

      case "new_agents": {
        const newAgents = db.prepare(`
          SELECT payer_address as address, MIN(timestamp) as first_seen,
                 ROUND(SUM(amount_usd), 4) as total_spent, COUNT(*) as calls
          FROM events WHERE api_key_id = ?
          GROUP BY payer_address
          HAVING MIN(timestamp) >= ?
          ORDER BY total_spent DESC LIMIT 5
        `).all(apiKeyId, sevenDaysAgo) as Array<{ address: string; first_seen: string; total_spent: number; calls: number }>;

        response = `${newAgents.length} new agent(s) discovered your endpoints this week:`;
        newAgents.forEach((a) => {
          response += `\n• ${a.address.slice(0, 10)}... — ${formatCurrency(a.total_spent)} spent in ${a.calls} calls`;
        });
        if (newAgents.length === 0) response = "No new agents discovered your endpoints this week.";
        data = { customers: newAgents };
        break;
      }

      case "performance": {
        const perf = db.prepare(`
          SELECT endpoint, ROUND(AVG(latency_ms), 0) as avg_latency,
                 ROUND(SUM(CASE WHEN status = 'error' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 1) as error_rate,
                 COUNT(*) as calls
          FROM events WHERE api_key_id = ? AND timestamp >= ?
          GROUP BY endpoint ORDER BY avg_latency DESC LIMIT 5
        `).all(apiKeyId, sevenDaysAgo) as Array<{ endpoint: string; avg_latency: number; error_rate: number; calls: number }>;

        response = "Endpoint performance (last 7 days):";
        perf.forEach((ep) => {
          const status = ep.error_rate > 5 ? "⚠️" : ep.avg_latency > 1000 ? "🟡" : "✅";
          response += `\n${status} ${ep.endpoint} — ${ep.avg_latency}ms avg, ${ep.error_rate}% errors (${ep.calls} calls)`;
        });
        data = { endpoints: perf };
        break;
      }

      case "pricing": {
        const pricing = db.prepare(`
          SELECT endpoint, ROUND(AVG(amount_usd), 6) as your_price, COUNT(*) as your_calls
          FROM events WHERE api_key_id = ? AND timestamp >= ?
          GROUP BY endpoint ORDER BY your_calls DESC LIMIT 5
        `).all(apiKeyId, thirtyDaysAgo) as Array<{ endpoint: string; your_price: number; your_calls: number }>;

        // Get market averages
        const market = db.prepare(`
          SELECT endpoint, ROUND(AVG(amount_usd), 6) as market_avg
          FROM events WHERE timestamp >= ?
          GROUP BY endpoint
        `).all(thirtyDaysAgo) as Array<{ endpoint: string; market_avg: number }>;

        const marketMap = new Map(market.map((m) => [m.endpoint, m.market_avg]));

        response = "Your pricing vs market (last 30 days):";
        pricing.forEach((ep) => {
          const mkt = marketMap.get(ep.endpoint);
          const comparison = mkt ? (ep.your_price > mkt * 1.1 ? "above" : ep.your_price < mkt * 0.9 ? "below" : "at") : "unknown vs";
          response += `\n• ${ep.endpoint}: ${formatCurrency(ep.your_price)}/call — ${comparison} market avg${mkt ? ` (${formatCurrency(mkt)})` : ""}`;
        });
        break;
      }

      case "summary":
      default: {
        const stats = db.prepare(`
          SELECT COUNT(*) as calls, ROUND(SUM(amount_usd), 4) as revenue,
                 COUNT(DISTINCT payer_address) as customers,
                 COUNT(DISTINCT endpoint) as endpoints
          FROM events WHERE api_key_id = ? AND timestamp >= ?
        `).get(apiKeyId, sevenDaysAgo) as { calls: number; revenue: number; customers: number; endpoints: number };

        const totalAll = db.prepare(`
          SELECT ROUND(SUM(amount_usd), 4) as total FROM events WHERE api_key_id = ?
        `).get(apiKeyId) as { total: number };

        response = `Here's your x402 business overview:\n\n📊 This week: ${formatCurrency(stats.revenue || 0)} revenue, ${stats.calls} transactions, ${stats.customers} agents, ${stats.endpoints} endpoints\n💰 All-time revenue: ${formatCurrency(totalAll.total || 0)}\n\nTry asking me about specific topics like "top customers", "endpoint performance", "pricing comparison", or "churn risk".`;

        data = { stats: { revenue_7d: stats.revenue, calls_7d: stats.calls, customers: stats.customers, all_time: totalAll.total } };
        break;
      }
    }

    return NextResponse.json({ response, data, intent });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
