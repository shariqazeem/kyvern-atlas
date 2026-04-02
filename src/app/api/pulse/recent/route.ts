import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEMO_API_KEY_ID = "demo_key_001";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
    const source = request.nextUrl.searchParams.get("source");

    let query = `
      SELECT id, timestamp, endpoint, amount_usd, payer_address, latency_ms,
             status, network, asset, tx_hash, scheme, source
      FROM events
      WHERE api_key_id = ?
    `;
    const params: (string | number)[] = [DEMO_API_KEY_ID];

    if (source) {
      query += " AND source = ?";
      params.push(source);
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);

    const rows = db.prepare(query).all(...params);

    return NextResponse.json({ transactions: rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
