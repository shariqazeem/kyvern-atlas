import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { getTierForApiKey } from "@/lib/tier";

export const dynamic = "force-dynamic";

// Import historical events via JSON array or CSV-style entries
// Pro feature — import up to 10,000 events per request
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (getTierForApiKey(auth.apiKeyId) !== "pro") {
      return NextResponse.json(
        { error: "pro_required", message: "Historical import requires Pulse Pro." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const events = body.events;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "Missing or empty events array" }, { status: 400 });
    }

    if (events.length > 10000) {
      return NextResponse.json({ error: "Max 10,000 events per import" }, { status: 400 });
    }

    const db = getDb();
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    const insertEvent = db.prepare(`
      INSERT INTO events (id, api_key_id, timestamp, endpoint, amount_usd, payer_address, latency_ms, status, metadata, network, asset, tx_hash, scheme, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'import')
    `);

    const upsertDailyStats = db.prepare(`
      INSERT INTO daily_stats (id, api_key_id, date, endpoint, total_calls, total_revenue_usd, unique_payers, avg_latency_ms, error_count)
      VALUES (?, ?, ?, ?, 1, ?, 1, ?, ?)
      ON CONFLICT(api_key_id, date, endpoint) DO UPDATE SET
        total_calls = total_calls + 1,
        total_revenue_usd = total_revenue_usd + excluded.total_revenue_usd,
        avg_latency_ms = (avg_latency_ms * total_calls + excluded.avg_latency_ms) / (total_calls + 1),
        error_count = error_count + excluded.error_count
    `);

    const checkDup = db.prepare("SELECT id FROM events WHERE tx_hash = ?");
    const upsertEndpoint = db.prepare(
      "INSERT OR IGNORE INTO endpoints (id, api_key_id, path, price_usd) VALUES (?, ?, ?, ?)"
    );

    const importTx = db.transaction(() => {
      for (const event of events) {
        try {
          // Validate required fields
          if (!event.endpoint || event.amount_usd == null || !event.payer_address) {
            errors++;
            continue;
          }

          // Dedup by tx_hash
          if (event.tx_hash) {
            const existing = checkDup.get(event.tx_hash);
            if (existing) {
              skipped++;
              continue;
            }
          }

          const eventId = nanoid();
          const timestamp = event.timestamp || new Date().toISOString();
          const amount = Number(event.amount_usd) || 0;
          const latency = event.latency_ms ? Number(event.latency_ms) : null;
          const status = event.status || "success";

          insertEvent.run(
            eventId,
            auth.apiKeyId,
            timestamp,
            event.endpoint,
            amount,
            event.payer_address,
            latency,
            status,
            event.metadata ? JSON.stringify(event.metadata) : null,
            event.network || null,
            event.asset || null,
            event.tx_hash || null,
            event.scheme || null
          );

          // Update daily stats
          const dateStr = timestamp.split("T")[0];
          upsertDailyStats.run(
            `${auth.apiKeyId}_${dateStr}_${event.endpoint}`,
            auth.apiKeyId,
            dateStr,
            event.endpoint,
            amount,
            latency,
            status === "error" ? 1 : 0
          );

          // Auto-create endpoint
          upsertEndpoint.run(nanoid(), auth.apiKeyId, event.endpoint, amount);

          imported++;
        } catch {
          errors++;
        }
      }
    });

    importTx();

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors,
      total: events.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
