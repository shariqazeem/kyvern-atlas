import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = getDb();
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0", 10);

    // Ensure audit_log table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        api_key_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      )
    `);

    const total = db.prepare(
      "SELECT COUNT(*) as count FROM audit_log WHERE api_key_id = ?"
    ).get(auth.apiKeyId) as { count: number };

    const logs = db.prepare(`
      SELECT id, action, details, ip_address, timestamp
      FROM audit_log
      WHERE api_key_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `).all(auth.apiKeyId, limit, offset);

    return NextResponse.json({ logs, total: total.count, limit, offset });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
