import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { authenticateIngestRequest } from "@/lib/auth";
import { checkUsageLimit } from "@/lib/tier";
import { fireWebhooks } from "@/lib/webhooks";

const IngestSchema = z.object({
  endpoint: z.string().min(1),
  amount_usd: z.number().nonnegative(),
  payer_address: z.string().min(1),
  latency_ms: z.number().int().nonnegative().optional(),
  status: z.enum(["success", "error", "timeout"]).default("success"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().optional(),
  // x402 blockchain fields
  network: z.string().optional(),
  asset: z.string().optional(),
  tx_hash: z.string().optional(),
  scheme: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateIngestRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const keyRow = { id: auth.apiKeyId };

    // Tier enforcement — check usage limits
    const usage = checkUsageLimit(keyRow.id);
    if (!usage.allowed) {
      return NextResponse.json({
        error: "Daily limit reached. Upgrade to Pro for unlimited.",
        events_used: usage.events_used,
        events_limit: usage.events_limit,
        revenue_used: usage.revenue_used,
        revenue_limit: usage.revenue_limit,
        tier: usage.tier,
      }, { status: 429 });
    }

    const db = getDb();
    const body = await request.json();
    const parsed = IngestSchema.parse(body);

    // Dedup by tx_hash — if this blockchain tx was already recorded, skip
    if (parsed.tx_hash) {
      const existing = db.prepare("SELECT id FROM events WHERE tx_hash = ?").get(parsed.tx_hash) as { id: string } | undefined;
      if (existing) {
        return NextResponse.json({ success: true, event_id: existing.id, deduplicated: true });
      }
    }

    const eventId = nanoid();
    const timestamp = parsed.timestamp || new Date().toISOString();
    const source = parsed.tx_hash ? "middleware" : "seed";

    db.prepare(
      `INSERT INTO events (id, api_key_id, timestamp, endpoint, amount_usd, payer_address, latency_ms, status, metadata, network, asset, tx_hash, scheme, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      eventId,
      keyRow.id,
      timestamp,
      parsed.endpoint,
      parsed.amount_usd,
      parsed.payer_address,
      parsed.latency_ms || null,
      parsed.status,
      parsed.metadata ? JSON.stringify(parsed.metadata) : null,
      parsed.network || null,
      parsed.asset || null,
      parsed.tx_hash || null,
      parsed.scheme || null,
      source
    );

    // Upsert daily_stats
    const dateStr = timestamp.split("T")[0];
    db.prepare(`
      INSERT INTO daily_stats (id, api_key_id, date, endpoint, total_calls, total_revenue_usd, unique_payers, avg_latency_ms, error_count)
      VALUES (?, ?, ?, ?, 1, ?, 1, ?, ?)
      ON CONFLICT(api_key_id, date, endpoint) DO UPDATE SET
        total_calls = total_calls + 1,
        total_revenue_usd = total_revenue_usd + excluded.total_revenue_usd,
        avg_latency_ms = (avg_latency_ms * total_calls + excluded.avg_latency_ms) / (total_calls + 1),
        error_count = error_count + excluded.error_count
    `).run(
      `${keyRow.id}_${dateStr}_${parsed.endpoint}`,
      keyRow.id,
      dateStr,
      parsed.endpoint,
      parsed.amount_usd,
      parsed.latency_ms || null,
      parsed.status === "error" ? 1 : 0
    );

    // Auto-create endpoint if new
    db.prepare(`
      INSERT OR IGNORE INTO endpoints (id, api_key_id, path, price_usd)
      VALUES (?, ?, ?, ?)
    `).run(nanoid(), keyRow.id, parsed.endpoint, parsed.amount_usd);

    // Update last_used_at
    db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(timestamp, keyRow.id);

    // Fire webhooks asynchronously (non-blocking)
    fireWebhooks(keyRow.id, parsed.status === "error" ? "payment.failed" : "payment.received", {
      endpoint: parsed.endpoint,
      amount_usd: parsed.amount_usd,
      payer_address: parsed.payer_address,
      tx_hash: parsed.tx_hash,
      network: parsed.network,
      latency_ms: parsed.latency_ms,
      status: parsed.status,
    });

    return NextResponse.json({ success: true, event_id: eventId, source });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
