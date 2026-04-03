import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateSession(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = getDb();
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
    const source = request.nextUrl.searchParams.get("source");

    let query = `
      SELECT id, timestamp, endpoint, amount_usd, payer_address, latency_ms,
             status, network, asset, tx_hash, scheme, source
      FROM events
      WHERE api_key_id = ?
    `;
    const params: (string | number)[] = [auth.apiKeyId];

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
