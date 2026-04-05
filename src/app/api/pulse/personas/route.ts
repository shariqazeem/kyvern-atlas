import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

// --- Persona Definitions ---

interface Persona {
  name: string;
  emoji: string;
  color: string;
  description: string;
}

const PERSONAS: Record<string, Persona> = {
  whale: {
    name: "The Whale",
    emoji: "\uD83D\uDC0B",
    color: "#3b82f6",
    description: "Top spender, high-value customer",
  },
  loyalist: {
    name: "The Loyalist",
    emoji: "\uD83D\uDC8E",
    color: "#8b5cf6",
    description: "Consistent daily usage, deeply engaged",
  },
  explorer: {
    name: "The Explorer",
    emoji: "\uD83E\uDDED",
    color: "#f59e0b",
    description: "Uses many different endpoints, broad interest",
  },
  researcher: {
    name: "The Researcher",
    emoji: "\uD83D\uDD2C",
    color: "#06b6d4",
    description: "Focused on data, search, and analytics endpoints",
  },
  trader: {
    name: "The Trader",
    emoji: "\uD83D\uDCCA",
    color: "#10b981",
    description: "Focused on price, oracle, and DeFi endpoints",
  },
  newcomer: {
    name: "The Newcomer",
    emoji: "\uD83C\uDF31",
    color: "#84cc16",
    description: "Recently joined, still getting started",
  },
  ghost: {
    name: "The Ghost",
    emoji: "\uD83D\uDC7B",
    color: "#94a3b8",
    description: "Was active but hasn't been seen recently",
  },
  regular: {
    name: "The Regular",
    emoji: "\u2615",
    color: "#78716c",
    description: "Steady, reliable usage pattern",
  },
};

// Endpoint keywords for classifying researcher vs trader
const RESEARCH_KEYWORDS = ["data", "search", "analytics", "query", "lookup", "info", "knowledge", "summarize", "translate", "nlp"];
const TRADER_KEYWORDS = ["price", "oracle", "defi", "swap", "trade", "token", "market", "finance", "yield", "lending"];

function classifyByEndpoint(favoriteEndpoint: string): "researcher" | "trader" | null {
  const lower = favoriteEndpoint.toLowerCase();
  const researchScore = RESEARCH_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const traderScore = TRADER_KEYWORDS.filter((kw) => lower.includes(kw)).length;

  if (researchScore > 0 && researchScore >= traderScore) return "researcher";
  if (traderScore > 0 && traderScore > researchScore) return "trader";
  return null;
}

// --- Behavioral Signal Computation ---

interface RawCustomerRow {
  address: string;
  total_spent: number;
  call_count: number;
  first_seen: string;
  last_seen: string;
  top_endpoint: string;
  days_active: number;
  endpoint_diversity: number;
}

interface CustomerWithPersona {
  address: string;
  persona: Persona;
  total_spent: number;
  call_count: number;
  first_seen: string;
  last_seen: string;
  favorite_endpoint: string;
  days_active: number;
  endpoint_diversity: number;
  avg_daily_spend: number;
  recency: number;
  tenure: number;
}

function assignPersona(
  customer: RawCustomerRow,
  spendThreshold: number,
  nowMs: number
): Persona {
  const recencyDays = Math.max(0, (nowMs - new Date(customer.last_seen).getTime()) / (1000 * 60 * 60 * 24));
  const tenureDays = Math.max(1, (nowMs - new Date(customer.first_seen).getTime()) / (1000 * 60 * 60 * 24));

  // Priority-ordered rules (first match wins)

  // 1. The Whale -- top 5% by spend
  if (customer.total_spent >= spendThreshold) {
    return PERSONAS.whale;
  }

  // 2. The Ghost -- was active but gone 7+ days
  if (recencyDays >= 7 && customer.call_count >= 3) {
    return PERSONAS.ghost;
  }

  // 3. The Newcomer -- first seen within last 7 days
  if (tenureDays <= 7) {
    return PERSONAS.newcomer;
  }

  // 4. The Loyalist -- active 14+ days and high activity ratio
  if (customer.days_active >= 14 && customer.days_active / tenureDays >= 0.5) {
    return PERSONAS.loyalist;
  }

  // 5. The Explorer -- uses 3+ endpoints
  if (customer.endpoint_diversity >= 3) {
    return PERSONAS.explorer;
  }

  // 6. Researcher or Trader -- classify by endpoint keywords
  const endpointPersona = classifyByEndpoint(customer.top_endpoint);
  if (endpointPersona) {
    return PERSONAS[endpointPersona];
  }

  // 7. Default
  return PERSONAS.regular;
}

// --- API Handler ---

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = getDb();
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "200", 10);

    // Fetch enriched customer data with behavioral signals
    const rows = db.prepare(`
      SELECT
        payer_address AS address,
        ROUND(SUM(amount_usd), 2) AS total_spent,
        COUNT(*) AS call_count,
        MIN(timestamp) AS first_seen,
        MAX(timestamp) AS last_seen,
        (
          SELECT endpoint FROM events e2
          WHERE e2.payer_address = e1.payer_address AND e2.api_key_id = e1.api_key_id
          GROUP BY endpoint ORDER BY COUNT(*) DESC LIMIT 1
        ) AS top_endpoint,
        COUNT(DISTINCT DATE(timestamp)) AS days_active,
        COUNT(DISTINCT endpoint) AS endpoint_diversity
      FROM events e1
      WHERE api_key_id = ?
      GROUP BY payer_address
      ORDER BY total_spent DESC
      LIMIT ?
    `).all(auth.apiKeyId, limit) as RawCustomerRow[];

    // Calculate the top-5% spend threshold for whale classification
    const nowMs = Date.now();
    let spendThreshold = Infinity;
    if (rows.length > 0) {
      const sorted = [...rows].sort((a, b) => b.total_spent - a.total_spent);
      const top5Index = Math.max(0, Math.ceil(sorted.length * 0.05) - 1);
      spendThreshold = sorted[top5Index].total_spent;
    }

    // Enrich each customer with persona
    const customers: CustomerWithPersona[] = rows.map((row) => {
      const recency = Math.max(0, (nowMs - new Date(row.last_seen).getTime()) / (1000 * 60 * 60 * 24));
      const tenure = Math.max(1, (nowMs - new Date(row.first_seen).getTime()) / (1000 * 60 * 60 * 24));
      const avgDailySpend = row.days_active > 0 ? row.total_spent / row.days_active : row.total_spent;

      return {
        address: row.address,
        persona: assignPersona(row, spendThreshold, nowMs),
        total_spent: row.total_spent,
        call_count: row.call_count,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
        favorite_endpoint: row.top_endpoint,
        days_active: row.days_active,
        endpoint_diversity: row.endpoint_diversity,
        avg_daily_spend: Math.round(avgDailySpend * 100) / 100,
        recency: Math.round(recency * 10) / 10,
        tenure: Math.round(tenure * 10) / 10,
      };
    });

    // Persona distribution summary
    const distribution: Record<string, number> = {};
    for (const c of customers) {
      distribution[c.persona.name] = (distribution[c.persona.name] || 0) + 1;
    }

    return NextResponse.json({ customers, distribution });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
