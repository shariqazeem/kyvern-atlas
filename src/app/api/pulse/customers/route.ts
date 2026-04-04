import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

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
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = getDb();
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
    const addressFilter = request.nextUrl.searchParams.get("address");

    let query = `
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
      WHERE api_key_id = ?`;
    const params: (string | number)[] = [auth.apiKeyId];

    if (addressFilter) {
      query += " AND LOWER(payer_address) = ?";
      params.push(addressFilter.toLowerCase());
    }

    query += `
      GROUP BY payer_address
      ORDER BY total_spent DESC
      LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(query).all(...params) as CustomerRow[];

    return NextResponse.json({ customers: rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
