import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const DEMO_API_KEY_ID = "demo_key_001";

interface CustomerRow {
  address: string;
  total_spent: number;
  call_count: number;
  first_seen: string;
  last_seen: string;
  top_endpoint: string;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);

    const rows = db.prepare(`
      SELECT
        payer_address as address,
        ROUND(SUM(amount_usd), 2) as total_spent,
        COUNT(*) as call_count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        (
          SELECT endpoint FROM events e2
          WHERE e2.payer_address = e1.payer_address AND e2.api_key_id = e1.api_key_id
          GROUP BY endpoint ORDER BY COUNT(*) DESC LIMIT 1
        ) as top_endpoint
      FROM events e1
      WHERE api_key_id = ?
      GROUP BY payer_address
      ORDER BY total_spent DESC
      LIMIT ?
    `).all(DEMO_API_KEY_ID, limit) as CustomerRow[];

    return NextResponse.json({ customers: rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
