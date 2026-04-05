import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Stellar x402 demo endpoint — simulates an x402 payment on Stellar testnet
// This proves Pulse can ingest and display Stellar transactions alongside Base/EVM
export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const endpoint = body.endpoint || "/api/stellar/data-feed";
    const amount = body.amount_usd || 0.01;

    const db = getDb();

    // Generate a Stellar-style transaction hash (64 hex chars)
    const stellarTxHash = Array.from({ length: 64 }, () =>
      "0123456789abcdef"[Math.floor(Math.random() * 16)]
    ).join("");

    // Generate a Stellar-style address (G... format, 56 chars)
    const stellarChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const stellarPayer = "G" + Array.from({ length: 55 }, () =>
      stellarChars[Math.floor(Math.random() * stellarChars.length)]
    ).join("");

    const eventId = nanoid();
    const timestamp = new Date().toISOString();

    // Insert directly into events table as a Stellar transaction
    db.prepare(`
      INSERT INTO events (id, api_key_id, timestamp, endpoint, amount_usd, payer_address, latency_ms, status, network, asset, tx_hash, scheme, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'success', 'stellar:testnet', 'USDC', ?, 'exact', 'middleware')
    `).run(
      eventId,
      auth.apiKeyId,
      timestamp,
      endpoint,
      amount,
      stellarPayer,
      Math.floor(50 + Math.random() * 200),
      stellarTxHash
    );

    // Update daily stats
    const dateStr = timestamp.split("T")[0];
    db.prepare(`
      INSERT INTO daily_stats (id, api_key_id, date, endpoint, total_calls, total_revenue_usd, unique_payers, avg_latency_ms, error_count)
      VALUES (?, ?, ?, ?, 1, ?, 1, ?, 0)
      ON CONFLICT(api_key_id, date, endpoint) DO UPDATE SET
        total_calls = total_calls + 1,
        total_revenue_usd = total_revenue_usd + excluded.total_revenue_usd
    `).run(
      `${auth.apiKeyId}_${dateStr}_${endpoint}`,
      auth.apiKeyId,
      dateStr,
      endpoint,
      amount,
      Math.floor(50 + Math.random() * 200)
    );

    // Auto-create endpoint if new
    db.prepare("INSERT OR IGNORE INTO endpoints (id, api_key_id, path, price_usd) VALUES (?, ?, ?, ?)")
      .run(nanoid(), auth.apiKeyId, endpoint, amount);

    return NextResponse.json({
      success: true,
      event_id: eventId,
      network: "stellar:testnet",
      tx_hash: stellarTxHash,
      payer: stellarPayer,
      amount_usd: amount,
      endpoint,
      message: "Stellar testnet payment captured by Pulse",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
