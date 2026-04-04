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
    const sp = request.nextUrl.searchParams;
    const limit = parseInt(sp.get("limit") || "20", 10);
    const offset = parseInt(sp.get("offset") || "0", 10);
    const source = sp.get("source");
    const status = sp.get("status");
    const search = sp.get("search");

    let where = "WHERE api_key_id = ?";
    const params: (string | number)[] = [auth.apiKeyId];

    if (source) {
      where += " AND source = ?";
      params.push(source);
    }
    if (status) {
      where += " AND status = ?";
      params.push(status);
    }
    if (search) {
      where += " AND (endpoint LIKE ? OR payer_address LIKE ? OR tx_hash LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    // Total count for pagination
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM events ${where}`).get(...params) as { total: number };

    const rows = db.prepare(`
      SELECT id, timestamp, endpoint, amount_usd, payer_address, latency_ms,
             status, network, asset, tx_hash, scheme, source
      FROM events ${where}
      ORDER BY timestamp DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return NextResponse.json({
      transactions: rows,
      total: countRow.total,
      limit,
      offset,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
