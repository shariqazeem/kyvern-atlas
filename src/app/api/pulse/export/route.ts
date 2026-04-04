import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";
import { getTierForApiKey } from "@/lib/tier";
import { generateCSV, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

function proGate(apiKeyId: string) {
  if (getTierForApiKey(apiKeyId) !== "pro") {
    return NextResponse.json({ error: "pro_required", message: "CSV export requires Pulse Pro." }, { status: 403 });
  }
  return null;
}

function getStartDate(range: string): string {
  const now = Date.now();
  switch (range) {
    case "24h": return new Date(now - 24 * 3600000).toISOString();
    case "7d": return new Date(now - 7 * 86400000).toISOString();
    case "30d": return new Date(now - 30 * 86400000).toISOString();
    case "90d": return new Date(now - 90 * 86400000).toISOString();
    default: return new Date(now - 7 * 86400000).toISOString();
  }
}

export async function GET(req: NextRequest) {
  const auth = authenticateSession(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });
  const blocked = proGate(auth.apiKeyId);
  if (blocked) return blocked;

  const db = getDb();
  const type = req.nextUrl.searchParams.get("type") || "transactions";
  const range = req.nextUrl.searchParams.get("range") || "7d";
  const dateStr = new Date().toISOString().split("T")[0];

  switch (type) {
    case "transactions": {
      const start = getStartDate(range);
      const rows = db.prepare(`
        SELECT timestamp, endpoint, amount_usd, payer_address, latency_ms, status, network, tx_hash, source
        FROM events WHERE api_key_id = ? AND timestamp >= ? ORDER BY timestamp DESC
      `).all(auth.apiKeyId, start) as Record<string, unknown>[];

      const csv = generateCSV(
        ["timestamp", "endpoint", "amount_usd", "payer_address", "latency_ms", "status", "network", "tx_hash", "source"],
        rows
      );
      return csvResponse(csv, `pulse-transactions-${dateStr}.csv`);
    }

    case "endpoints": {
      const rows = db.prepare(`
        SELECT
          e.endpoint as path,
          COUNT(*) as calls,
          ROUND(SUM(e.amount_usd), 4) as revenue,
          ROUND(AVG(e.latency_ms), 0) as avg_latency,
          ROUND(SUM(CASE WHEN e.status = 'error' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 1) as error_rate,
          MAX(e.timestamp) as last_called
        FROM events e WHERE e.api_key_id = ? GROUP BY e.endpoint ORDER BY revenue DESC
      `).all(auth.apiKeyId) as Record<string, unknown>[];

      const csv = generateCSV(
        ["path", "calls", "revenue", "avg_latency", "error_rate", "last_called"],
        rows
      );
      return csvResponse(csv, `pulse-endpoints-${dateStr}.csv`);
    }

    case "customers": {
      const rows = db.prepare(`
        SELECT
          payer_address as address,
          ROUND(SUM(amount_usd), 4) as total_spent,
          COUNT(*) as call_count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen,
          (SELECT endpoint FROM events e2 WHERE e2.payer_address = e1.payer_address AND e2.api_key_id = e1.api_key_id
           GROUP BY endpoint ORDER BY COUNT(*) DESC LIMIT 1) as top_endpoint
        FROM events e1 WHERE api_key_id = ? GROUP BY payer_address ORDER BY total_spent DESC
      `).all(auth.apiKeyId) as Record<string, unknown>[];

      const csv = generateCSV(
        ["address", "total_spent", "call_count", "first_seen", "last_seen", "top_endpoint"],
        rows
      );
      return csvResponse(csv, `pulse-customers-${dateStr}.csv`);
    }

    default:
      return NextResponse.json({ error: "Invalid export type. Use: transactions, endpoints, customers" }, { status: 400 });
  }
}
