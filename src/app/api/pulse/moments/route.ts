import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { nanoid } from "nanoid";

interface Moment {
  id: string;
  type: "new_agent" | "milestone" | "record_payment" | "hot_endpoint" | "whale_alert" | "comeback";
  emoji: string;
  title: string;
  description: string;
  amount_usd: number | null;
  endpoint: string | null;
  agent_address: string | null;
  tx_hash: string | null;
  timestamp: string;
}

interface EventRow {
  id: string;
  timestamp: string;
  endpoint: string;
  amount_usd: number;
  payer_address: string;
  tx_hash: string | null;
}

interface CumulativeRow {
  cumulative_revenue: number;
}

interface MaxRow {
  max_amount: number;
}

interface GrowthRow {
  endpoint: string;
  this_week: number;
  last_week: number;
}

interface ComebackRow {
  payer_address: string;
  latest_ts: string;
  previous_ts: string;
  tx_hash: string | null;
  amount_usd: number;
  endpoint: string;
}

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const apiKeyId = auth.apiKeyId;

    const db = getDb();
    const moments: Moment[] = [];

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // --- New Agent: first payment from a new wallet address ---
    const newAgentEvents = db.prepare(`
      SELECT e.id, e.timestamp, e.endpoint, e.amount_usd, e.payer_address, e.tx_hash
      FROM events e
      WHERE e.api_key_id = ?
        AND e.timestamp >= ?
        AND NOT EXISTS (
          SELECT 1 FROM events e2
          WHERE e2.api_key_id = e.api_key_id
            AND e2.payer_address = e.payer_address
            AND e2.timestamp < e.timestamp
        )
      ORDER BY e.timestamp DESC
      LIMIT 10
    `).all(apiKeyId, sevenDaysAgo) as EventRow[];

    for (const evt of newAgentEvents) {
      moments.push({
        id: `new_agent_${evt.id}`,
        type: "new_agent",
        emoji: "\uD83C\uDD95",
        title: "New Agent Detected",
        description: `First payment from ${evt.payer_address.slice(0, 6)}...${evt.payer_address.slice(-4)} on ${evt.endpoint}`,
        amount_usd: evt.amount_usd,
        endpoint: evt.endpoint,
        agent_address: evt.payer_address,
        tx_hash: evt.tx_hash,
        timestamp: evt.timestamp,
      });
    }

    // --- Milestone: cumulative revenue crossed thresholds ---
    const milestones = [1000, 500, 100, 50, 10];
    const cumRow = db.prepare(`
      SELECT COALESCE(SUM(amount_usd), 0) as cumulative_revenue
      FROM events WHERE api_key_id = ?
    `).get(apiKeyId) as CumulativeRow;

    const totalRevenue = cumRow.cumulative_revenue;
    for (const threshold of milestones) {
      if (totalRevenue >= threshold) {
        // Find when we crossed this threshold
        const crossEvent = db.prepare(`
          SELECT timestamp, tx_hash, endpoint FROM (
            SELECT timestamp, tx_hash, endpoint,
              SUM(amount_usd) OVER (ORDER BY timestamp) as running_total
            FROM events WHERE api_key_id = ?
          ) WHERE running_total >= ?
          ORDER BY timestamp ASC
          LIMIT 1
        `).get(apiKeyId, threshold) as { timestamp: string; tx_hash: string | null; endpoint: string } | undefined;

        if (crossEvent) {
          moments.push({
            id: `milestone_${threshold}`,
            type: "milestone",
            emoji: "\uD83C\uDFC6",
            title: `$${threshold} Revenue Milestone`,
            description: `Cumulative revenue crossed $${threshold}! Current total: $${totalRevenue.toFixed(2)}`,
            amount_usd: threshold,
            endpoint: crossEvent.endpoint,
            agent_address: null,
            tx_hash: crossEvent.tx_hash,
            timestamp: crossEvent.timestamp,
          });
        }
        break; // Only show the highest milestone
      }
    }

    // --- Record Payment: highest single payment in last 24h ---
    const maxPaymentRow = db.prepare(`
      SELECT MAX(amount_usd) as max_amount FROM events
      WHERE api_key_id = ? AND timestamp >= ?
    `).get(apiKeyId, twentyFourHoursAgo) as MaxRow;

    if (maxPaymentRow.max_amount > 0) {
      const recordEvent = db.prepare(`
        SELECT id, timestamp, endpoint, amount_usd, payer_address, tx_hash
        FROM events
        WHERE api_key_id = ? AND timestamp >= ? AND amount_usd = ?
        ORDER BY timestamp DESC LIMIT 1
      `).get(apiKeyId, twentyFourHoursAgo, maxPaymentRow.max_amount) as EventRow | undefined;

      if (recordEvent) {
        // Check if it's actually the all-time record
        const allTimeMax = db.prepare(`
          SELECT MAX(amount_usd) as max_amount FROM events
          WHERE api_key_id = ? AND timestamp < ?
        `).get(apiKeyId, twentyFourHoursAgo) as MaxRow;

        if (!allTimeMax.max_amount || recordEvent.amount_usd >= allTimeMax.max_amount) {
          moments.push({
            id: `record_${recordEvent.id}`,
            type: "record_payment",
            emoji: "\u26A1",
            title: "Record Payment",
            description: `Highest single payment: $${recordEvent.amount_usd.toFixed(4)} from ${recordEvent.payer_address.slice(0, 6)}...${recordEvent.payer_address.slice(-4)}`,
            amount_usd: recordEvent.amount_usd,
            endpoint: recordEvent.endpoint,
            agent_address: recordEvent.payer_address,
            tx_hash: recordEvent.tx_hash,
            timestamp: recordEvent.timestamp,
          });
        }
      }
    }

    // --- Hot Endpoint: 50%+ growth this week vs last week ---
    const hotEndpoints = db.prepare(`
      SELECT
        this_week.endpoint,
        this_week.cnt as this_week,
        COALESCE(last_week.cnt, 0) as last_week
      FROM (
        SELECT endpoint, COUNT(*) as cnt
        FROM events WHERE api_key_id = ? AND timestamp >= ?
        GROUP BY endpoint
      ) this_week
      LEFT JOIN (
        SELECT endpoint, COUNT(*) as cnt
        FROM events WHERE api_key_id = ? AND timestamp >= ? AND timestamp < ?
        GROUP BY endpoint
      ) last_week ON this_week.endpoint = last_week.endpoint
      WHERE COALESCE(last_week.cnt, 0) > 0
        AND (this_week.cnt - COALESCE(last_week.cnt, 0)) * 1.0 / COALESCE(last_week.cnt, 1) >= 0.5
      ORDER BY this_week.cnt DESC
      LIMIT 3
    `).all(apiKeyId, sevenDaysAgo, apiKeyId, fourteenDaysAgo, sevenDaysAgo) as GrowthRow[];

    for (const ep of hotEndpoints) {
      const growthPct = Math.round(((ep.this_week - ep.last_week) / Math.max(ep.last_week, 1)) * 100);
      moments.push({
        id: `hot_${nanoid(8)}`,
        type: "hot_endpoint",
        emoji: "\uD83D\uDD25",
        title: "Hot Endpoint",
        description: `${ep.endpoint} is up ${growthPct}% this week (${ep.this_week} calls vs ${ep.last_week} last week)`,
        amount_usd: null,
        endpoint: ep.endpoint,
        agent_address: null,
        tx_hash: null,
        timestamp: now.toISOString(),
      });
    }

    // --- Whale Alert: single payment > $1 ---
    const whaleEvents = db.prepare(`
      SELECT id, timestamp, endpoint, amount_usd, payer_address, tx_hash
      FROM events
      WHERE api_key_id = ? AND timestamp >= ? AND amount_usd > 1.0
      ORDER BY amount_usd DESC
      LIMIT 5
    `).all(apiKeyId, sevenDaysAgo) as EventRow[];

    for (const evt of whaleEvents) {
      moments.push({
        id: `whale_${evt.id}`,
        type: "whale_alert",
        emoji: "\uD83D\uDC0B",
        title: "Whale Alert",
        description: `$${evt.amount_usd.toFixed(2)} payment from ${evt.payer_address.slice(0, 6)}...${evt.payer_address.slice(-4)}`,
        amount_usd: evt.amount_usd,
        endpoint: evt.endpoint,
        agent_address: evt.payer_address,
        tx_hash: evt.tx_hash,
        timestamp: evt.timestamp,
      });
    }

    // --- Comeback: agent returned after 7+ days absence ---
    const comebackAgents = db.prepare(`
      SELECT
        e1.payer_address,
        e1.timestamp as latest_ts,
        e1.tx_hash,
        e1.amount_usd,
        e1.endpoint,
        (
          SELECT MAX(e2.timestamp) FROM events e2
          WHERE e2.api_key_id = ? AND e2.payer_address = e1.payer_address AND e2.timestamp < e1.timestamp
        ) as previous_ts
      FROM events e1
      WHERE e1.api_key_id = ?
        AND e1.timestamp >= ?
        AND e1.id = (
          SELECT id FROM events
          WHERE api_key_id = ? AND payer_address = e1.payer_address
          ORDER BY timestamp DESC LIMIT 1
        )
      GROUP BY e1.payer_address
      HAVING previous_ts IS NOT NULL
        AND julianday(e1.timestamp) - julianday(previous_ts) >= 7
      ORDER BY e1.timestamp DESC
      LIMIT 5
    `).all(apiKeyId, apiKeyId, sevenDaysAgo, apiKeyId) as ComebackRow[];

    for (const agent of comebackAgents) {
      const daysSince = Math.floor(
        (new Date(agent.latest_ts).getTime() - new Date(agent.previous_ts).getTime()) / (1000 * 60 * 60 * 24)
      );
      moments.push({
        id: `comeback_${nanoid(8)}`,
        type: "comeback",
        emoji: "\uD83D\uDD04",
        title: "Agent Comeback",
        description: `${agent.payer_address.slice(0, 6)}...${agent.payer_address.slice(-4)} returned after ${daysSince} days`,
        amount_usd: agent.amount_usd,
        endpoint: agent.endpoint,
        agent_address: agent.payer_address,
        tx_hash: agent.tx_hash,
        timestamp: agent.latest_ts,
      });
    }

    // Sort all moments by timestamp descending, take last 20
    moments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const result = moments.slice(0, 20);

    return NextResponse.json({ moments: result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
